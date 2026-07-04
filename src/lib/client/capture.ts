"use client";

/**
 * Frame capture for the guest camera. The ORIGINAL is stored clean at the
 * camera's native resolution — film styles are CSS-only at display time,
 * so nothing is ever baked into the file (the Scene rule: never destroy
 * the original).
 */

const ORIGINAL_QUALITY = 0.92;
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

function drawScaled(
  source: HTMLCanvasElement,
  maxSize: number
): HTMLCanvasElement {
  const scale = Math.min(1, maxSize / Math.max(source.width, source.height));
  const out = document.createElement("canvas");
  out.width = Math.round(source.width * scale);
  out.height = Math.round(source.height * scale);
  out.getContext("2d")!.drawImage(source, 0, 0, out.width, out.height);
  return out;
}

/** Grab the current video frame at native stream resolution. */
export async function captureFrame(
  video: HTMLVideoElement,
  mirror: boolean
): Promise<CapturedShot> {
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h) throw new Error("video not ready");

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  if (mirror) {
    // Selfie camera: store what the guest saw in the preview.
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, 0, 0, w, h);

  const original = await canvasToBlob(canvas, ORIGINAL_QUALITY);
  const thumb = await canvasToBlob(drawScaled(canvas, THUMB_SIZE), THUMB_QUALITY);
  return { original, thumb };
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
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.getContext("2d")!.drawImage(img, 0, 0);
    const original = await canvasToBlob(canvas, ORIGINAL_QUALITY);
    const thumb = await canvasToBlob(drawScaled(canvas, THUMB_SIZE), THUMB_QUALITY);
    return { original, thumb };
  } finally {
    URL.revokeObjectURL(url);
  }
}
