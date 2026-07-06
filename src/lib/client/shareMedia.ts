"use client";

/**
 * Save a photo/video to the phone's gallery or post it to social. On mobile
 * the only reliable "Save to Photos" path is the Web Share sheet with the
 * actual file (a cross-origin `<a download>` just opens the image in a new
 * tab on iOS), and the same sheet offers Instagram/WhatsApp/etc. Desktop and
 * unsupported browsers fall back to a real file download.
 *
 * Returns "shared" | "downloaded" | "cancelled" | "failed" for the caller
 * to reflect in the UI if it wants to.
 */
export type ShareOutcome = "shared" | "downloaded" | "cancelled" | "failed";

export async function shareOrDownload(
  url: string,
  type: "photo" | "video" | "audio",
  baseName = "kormem"
): Promise<ShareOutcome> {
  const ext = type === "video" ? "mp4" : type === "audio" ? "m4a" : "jpg";
  const filename = `${baseName}.${ext}`;

  let blob: Blob | null = null;
  try {
    const res = await fetch(url);
    if (res.ok) blob = await res.blob();
  } catch {
    /* network hiccup; try native share by URL, then give up */
  }

  const nav = navigator as Navigator & {
    canShare?: (data: { files?: File[]; url?: string }) => boolean;
  };

  // Preferred: share the file → "Save Image" lands it in the gallery, and
  // the same sheet posts to social.
  if (blob && typeof nav.share === "function") {
    const file = new File([blob], filename, { type: blob.type || undefined });
    if (!nav.canShare || nav.canShare({ files: [file] })) {
      try {
        await nav.share({ files: [file] });
        return "shared";
      } catch (err) {
        // AbortError = user closed the sheet; anything else falls through.
        if (err instanceof DOMException && err.name === "AbortError") return "cancelled";
      }
    }
  }

  // Fallback: force a download from the blob (keeps the filename, unlike a
  // cross-origin href).
  if (blob) {
    try {
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
      return "downloaded";
    } catch {
      /* fall through */
    }
  }

  // Last resort: hand the URL to the OS.
  try {
    if (typeof nav.share === "function") {
      await nav.share({ url });
      return "shared";
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return "cancelled";
  }
  return "failed";
}

/** True on first mount if the platform can share files (mobile). */
export function canShareFiles(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { canShare?: (d: { files?: File[] }) => boolean };
  return typeof nav.share === "function";
}
