"use client";

/**
 * MediaRecorder wrapper for video clips and voice wishes.
 *
 * Format strategy (verified against iOS Safari 14.5+ and Android
 * Chrome 126+): prefer MP4/H.264/AAC everywhere — Safari only records mp4,
 * and modern Android Chrome records it natively — falling back to WebM for
 * Firefox/Linux. Whatever was produced is stored with its real MIME type;
 * mp4 plays everywhere and webm plays on iOS ≥ 17.4, so no transcoding.
 *
 * Bitrates are set explicitly: Safari's default is a flat 10 Mbps, which
 * would quadruple our storage bill for zero visible gain at 720p.
 */

const VIDEO_MIME_CANDIDATES = [
  'video/mp4;codecs="avc1.42E01E,mp4a.40.2"',
  "video/mp4",
  'video/webm;codecs="vp9,opus"',
  'video/webm;codecs="vp8,opus"',
  "video/webm",
];

const AUDIO_MIME_CANDIDATES = [
  'audio/mp4;codecs="mp4a.40.2"',
  "audio/mp4",
  'audio/webm;codecs="opus"',
  "audio/webm",
];

export const VIDEO_BPS = 2_500_000;
export const VIDEO_AUDIO_BPS = 64_000;
export const VOICE_BPS = 48_000;

function pickMime(candidates: string[]): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  for (const c of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(c)) return c;
    } catch {
      /* some browsers throw on exotic strings */
    }
  }
  return null;
}

export const canRecordVideo = () => pickMime(VIDEO_MIME_CANDIDATES) !== null;
export const canRecordAudio = () => pickMime(AUDIO_MIME_CANDIDATES) !== null;

export interface Recording {
  blob: Blob;
  /** Canonical container type (parameters stripped, e.g. "video/mp4"). */
  mime: string;
  durationS: number;
}

export interface RecorderHandle {
  /** Stop early; the promise resolves with what was captured so far. */
  stop: () => void;
  cancel: () => void;
  done: Promise<Recording>;
}

function startRecorder(
  stream: MediaStream,
  options: MediaRecorderOptions,
  fallbackMime: string,
  maxMs: number
): RecorderHandle {
  const recorder = new MediaRecorder(stream, options);
  const chunks: Blob[] = [];
  const startedAt = Date.now();
  let cancelled = false;

  const done = new Promise<Recording>((resolve, reject) => {
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorder.onerror = () => reject(new Error("recorder error"));
    recorder.onstop = () => {
      if (cancelled) {
        reject(new Error("cancelled"));
        return;
      }
      const raw = recorder.mimeType || options.mimeType || fallbackMime;
      const mime = raw.split(";")[0].trim();
      resolve({
        blob: new Blob(chunks, { type: mime }),
        mime,
        durationS: Math.min(maxMs, Date.now() - startedAt) / 1000,
      });
    };
  });

  // Hard cap — the recorder stops itself even if the UI hangs.
  const capTimer = setTimeout(() => {
    if (recorder.state !== "inactive") recorder.stop();
  }, maxMs);

  // Timeslice keeps chunks flowing so a crashed tab loses at most 1s.
  recorder.start(1000);

  return {
    stop: () => {
      clearTimeout(capTimer);
      if (recorder.state !== "inactive") recorder.stop();
    },
    cancel: () => {
      cancelled = true;
      clearTimeout(capTimer);
      if (recorder.state !== "inactive") recorder.stop();
    },
    done,
  };
}

/** Record a video clip from the live camera stream (mic track included). */
export function recordVideo(stream: MediaStream, maxMs: number): RecorderHandle {
  const mime = pickMime(VIDEO_MIME_CANDIDATES);
  return startRecorder(
    stream,
    {
      ...(mime ? { mimeType: mime } : {}),
      videoBitsPerSecond: VIDEO_BPS,
      audioBitsPerSecond: VIDEO_AUDIO_BPS,
    },
    "video/webm",
    maxMs
  );
}

/** Record an audio-only voice wish. */
export function recordVoice(stream: MediaStream, maxMs: number): RecorderHandle {
  const mime = pickMime(AUDIO_MIME_CANDIDATES);
  return startRecorder(
    stream,
    {
      ...(mime ? { mimeType: mime } : {}),
      audioBitsPerSecond: VOICE_BPS,
    },
    "audio/webm",
    maxMs
  );
}
