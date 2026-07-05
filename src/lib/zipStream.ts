import "server-only";

/**
 * Minimal streaming ZIP writer, STORE method (no compression — JPEG, MP4
 * and AAC are already compressed). Files are streamed through one at a
 * time with data descriptors, so memory stays constant regardless of
 * archive size: nothing is buffered except the current network chunk and
 * the central directory records (~80 bytes per file).
 *
 * Format notes: local headers set general-purpose bit 3 (sizes unknown up
 * front) and are followed by a data descriptor once the entry's bytes have
 * flowed. Classic ZIP only — fine below 4 GB and 65k entries, far beyond
 * any single event.
 */

export interface ZipEntry {
  name: string;
  /** Modification time stamped into the archive. */
  mtime: Date;
  /** Called lazily when the entry is reached, so downloads stay sequential. */
  open: () => Promise<ReadableStream<Uint8Array> | null>;
}

// ── CRC-32 ────────────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32Update(crc: number, chunk: Uint8Array): number {
  let c = crc;
  for (let i = 0; i < chunk.length; i++) {
    c = CRC_TABLE[(c ^ chunk[i]) & 0xff] ^ (c >>> 8);
  }
  return c >>> 0;
}

// ── little-endian scribbling ──────────────────────────────────────────

class ByteWriter {
  private buf: number[] = [];
  u16(v: number) {
    this.buf.push(v & 0xff, (v >>> 8) & 0xff);
    return this;
  }
  u32(v: number) {
    this.buf.push(v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff);
    return this;
  }
  bytes(b: Uint8Array) {
    for (let i = 0; i < b.length; i++) this.buf.push(b[i]);
    return this;
  }
  out(): Uint8Array {
    return Uint8Array.from(this.buf);
  }
}

function dosDateTime(d: Date): { date: number; time: number } {
  const year = Math.max(1980, d.getUTCFullYear());
  return {
    date: ((year - 1980) << 9) | ((d.getUTCMonth() + 1) << 5) | d.getUTCDate(),
    time: (d.getUTCHours() << 11) | (d.getUTCMinutes() << 5) | (d.getUTCSeconds() >> 1),
  };
}

interface CentralRecord {
  nameBytes: Uint8Array;
  crc: number;
  size: number;
  offset: number;
  date: number;
  time: number;
}

/**
 * Build the archive as a ReadableStream. Entries are opened one by one;
 * backpressure from the HTTP response propagates through the writer so a
 * slow client never balloons memory.
 */
export function zipStream(entries: ZipEntry[]): ReadableStream<Uint8Array> {
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();

  void (async () => {
    const writer = writable.getWriter();
    const central: CentralRecord[] = [];
    let offset = 0;

    const emit = async (bytes: Uint8Array) => {
      await writer.write(bytes);
      offset += bytes.length;
    };

    try {
      for (const entry of entries) {
        const stream = await entry.open();
        if (!stream) continue; // missing object: skip rather than corrupt the zip

        const nameBytes = new TextEncoder().encode(entry.name);
        const { date, time } = dosDateTime(entry.mtime);
        const headerOffset = offset;

        // Local file header: bit 3 set, STORE, sizes deferred to descriptor.
        await emit(
          new ByteWriter()
            .u32(0x04034b50)
            .u16(20) // version needed
            .u16(0x0008) // gp flags: data descriptor
            .u16(0) // method: store
            .u16(time)
            .u16(date)
            .u32(0) // crc (deferred)
            .u32(0) // compressed size (deferred)
            .u32(0) // uncompressed size (deferred)
            .u16(nameBytes.length)
            .u16(0) // extra length
            .bytes(nameBytes)
            .out()
        );

        let crc = 0xffffffff;
        let size = 0;
        const reader = stream.getReader();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          if (!value || value.length === 0) continue;
          // running state: init 0xffffffff, final xor applied after the loop
          crc = crc32Update(crc, value);
          size += value.length;
          await writer.write(value);
          offset += value.length;
        }
        const finalCrc = (crc ^ 0xffffffff) >>> 0;

        // Data descriptor (with signature).
        await emit(
          new ByteWriter().u32(0x08074b50).u32(finalCrc).u32(size).u32(size).out()
        );

        central.push({ nameBytes, crc: finalCrc, size, offset: headerOffset, date, time });
      }

      // Central directory.
      const cdStart = offset;
      for (const rec of central) {
        await emit(
          new ByteWriter()
            .u32(0x02014b50)
            .u16(20) // version made by
            .u16(20) // version needed
            .u16(0x0008)
            .u16(0) // store
            .u16(rec.time)
            .u16(rec.date)
            .u32(rec.crc)
            .u32(rec.size)
            .u32(rec.size)
            .u16(rec.nameBytes.length)
            .u16(0) // extra
            .u16(0) // comment
            .u16(0) // disk
            .u16(0) // internal attrs
            .u32(0) // external attrs
            .u32(rec.offset)
            .bytes(rec.nameBytes)
            .out()
        );
      }
      const cdSize = offset - cdStart;

      // End of central directory.
      await emit(
        new ByteWriter()
          .u32(0x06054b50)
          .u16(0)
          .u16(0)
          .u16(central.length)
          .u16(central.length)
          .u32(cdSize)
          .u32(cdStart)
          .u16(0)
          .out()
      );

      await writer.close();
    } catch (err) {
      await writer.abort(err).catch(() => {});
    }
  })();

  return readable;
}
