import type { MediaType } from "@/lib/types";

/**
 * Server-side media acceptance rules. Sizes are hard caps chosen against the
 * Supabase free tier (1 GB storage / 5 GB egress) — see the init migration
 * for the per-item math. The client compresses well below these; the caps
 * only exist so a hostile client can't bypass compression.
 *
 * All caps must stay under Vercel's ~4.5 MB serverless request-body limit,
 * or the platform rejects the upload before this route ever runs. A 10s
 * 720p clip at 2.5 Mbps is ~3.4 MB, so 4 MB leaves honest headroom.
 */
export const MEDIA_RULES: Record<
  MediaType,
  { maxBytes: number; mimes: readonly string[] }
> = {
  photo: { maxBytes: 3 * 1024 * 1024, mimes: ["image/jpeg"] },
  video: { maxBytes: 4 * 1024 * 1024, mimes: ["video/mp4", "video/webm"] },
  audio: { maxBytes: 1.5 * 1024 * 1024, mimes: ["audio/mp4", "audio/webm"] },
};

export const THUMB_MAX_BYTES = 1 * 1024 * 1024;

/** Max uploads accepted from one guest session per minute (all types). */
export const UPLOADS_PER_MINUTE = 8;

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "audio/mp4": "m4a",
  "audio/webm": "webm",
};

export function extensionFor(mime: string): string {
  return EXT_BY_MIME[mime] ?? "bin";
}

export function isMediaType(value: unknown): value is MediaType {
  return value === "photo" || value === "video" || value === "audio";
}

/**
 * Sniff the container from magic bytes and return the canonical MIME type,
 * or null if the bytes match nothing we accept. The client's declared
 * Content-Type is never trusted.
 */
export function sniffMime(bytes: Uint8Array, mediaType: MediaType): string | null {
  const jpeg = bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const ebml =
    bytes.length > 4 &&
    bytes[0] === 0x1a &&
    bytes[1] === 0x45 &&
    bytes[2] === 0xdf &&
    bytes[3] === 0xa3;
  const ftyp =
    bytes.length > 8 &&
    bytes[4] === 0x66 && // f
    bytes[5] === 0x74 && // t
    bytes[6] === 0x79 && // y
    bytes[7] === 0x70; // p

  switch (mediaType) {
    case "photo":
      return jpeg ? "image/jpeg" : null;
    case "video":
      if (ftyp) return "video/mp4";
      if (ebml) return "video/webm";
      return null;
    case "audio":
      if (ftyp) return "audio/mp4";
      if (ebml) return "audio/webm";
      return null;
  }
}
