"use client";

/**
 * Frame capture for the guest camera. Photos are compressed client-side
 * (long edge ≤ PHOTO_MAX_DIM, JPEG q0.8) before upload — on the free
 * storage tier every megabyte matters. Film styles are CSS-only at display
 * time, so nothing is ever baked into the file (the Scene rule: never
 * destroy the original).
 */

const PHOTO_MAX_DIM = 2000;
const PHOTO_QUALITY = 0.8;
const THUMB_SIZE = 640;
const THUMB_QUALITY = 0.78;

export interface CapturedShot {
  original: Blob;
  thumb: Blob;
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
      "image/jpeg",
      quality
    );
  });
}

function drawScaled(source: HTMLCanvasElement | HTMLVideoElement, maxSize: number, mirror = false): HTMLCanvasElement {
  const w = source instanceof HTMLVideoElement ? source.videoWidth : source.width;
  const h = source instanceof HTMLVideoElement ? source.videoHeight : source.height;
  const scale = Math.min(1, maxSize / Math.max(w, h));
  const out = document.createElement("canvas");
  out.width = Math.round(w * scale);
  out.height = Math.round(h * scale);
  const ctx = out.getContext("2d")!;
  if (mirror) {
    ctx.translate(out.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(source, 0, 0, out.width, out.height);
  return out;
}

/** Grab the current video frame, compressed for upload. */
export async function captureFrame(
  video: HTMLVideoElement,
  mirror: boolean
): Promise<CapturedShot> {
  if (!video.videoWidth || !video.videoHeight) throw new Error("video not ready");
  // Selfie camera: store what the guest saw in the preview.
  const full = drawScaled(video, PHOTO_MAX_DIM, mirror);
  const original = await canvasToBlob(full, PHOTO_QUALITY);
  const thumb = await canvasToBlob(drawScaled(full, THUMB_SIZE), THUMB_QUALITY);
  return { original, thumb };
}

/** Poster frame for a video recording, taken from the live preview. */
export async function capturePoster(video: HTMLVideoElement, mirror: boolean): Promise<Blob> {
  if (!video.videoWidth || !video.videoHeight) throw new Error("video not ready");
  return canvasToBlob(drawScaled(video, THUMB_SIZE, mirror), THUMB_QUALITY);
}

/** Fallback path: process a file from <input capture> on devices where
 *  getUserMedia is unavailable or denied. */
export async function processFile(file: File): Promise<CapturedShot> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("image decode failed"));
      img.src = url;
    });
    const source = document.createElement("canvas");
    source.width = img.naturalWidth;
    source.height = img.naturalHeight;
    source.getContext("2d")!.drawImage(img, 0, 0);
    const full = drawScaled(source, PHOTO_MAX_DIM);
    const original = await canvasToBlob(full, PHOTO_QUALITY);
    const thumb = await canvasToBlob(drawScaled(full, THUMB_SIZE), THUMB_QUALITY);
    return { original, thumb };
  } finally {
    URL.revokeObjectURL(url);
  }
}
