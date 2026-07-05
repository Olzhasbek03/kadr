"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import JSZip from "jszip";
import { filterCss } from "@/lib/filters";
import { DownloadIcon, ImageIcon, Mark, XIcon } from "@/components/icons";

export interface GalleryPhoto {
  id: string;
  url: string | null;
  thumbUrl: string | null;
  filter: string;
  guestName: string | null;
}

/** Host gallery: full grid (visible pre-reveal for the host only),
 *  lightbox, and "download all as zip" of the clean originals. */
export default function HostGallery({
  photos,
  eventName,
}: {
  photos: GalleryPhoto[];
  eventName: string;
}) {
  const t = useTranslations("event");
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [zipping, setZipping] = useState<null | { done: number; total: number }>(null);

  const downloadZip = async () => {
    const withUrls = photos.filter((p) => p.url);
    if (withUrls.length === 0 || zipping) return;
    setZipping({ done: 0, total: withUrls.length });
    try {
      const zip = new JSZip();
      let done = 0;
      // Fetch in small batches to stay gentle on mobile memory.
      const BATCH = 4;
      for (let i = 0; i < withUrls.length; i += BATCH) {
        await Promise.all(
          withUrls.slice(i, i + BATCH).map(async (photo, j) => {
            const res = await fetch(photo.url!);
            if (!res.ok) throw new Error(String(res.status));
            zip.file(`kadr-${String(i + j + 1).padStart(3, "0")}.jpg`, await res.blob());
            done += 1;
            setZipping({ done, total: withUrls.length });
          })
        );
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `kadr-${eventName.replace(/\s+/g, "-").toLowerCase().slice(0, 40)}.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 30_000);
    } catch (err) {
      console.error("zip:", err);
    } finally {
      setZipping(null);
    }
  };

  if (photos.length === 0) {
    return (
      <div className="card mt-5 flex flex-col items-center gap-4 px-6 py-16 text-center">
        <ImageIcon size={28} className="text-ink-2" />
        <p className="max-w-xs leading-relaxed text-ink-2">{t("noPhotosYet")}</p>
      </div>
    );
  }

  return (
    <>
      <div className="mt-5 flex items-center justify-between gap-3">
        <p className="text-sm text-ink-2">{t("photoCount", { count: photos.length })}</p>
        <button
          type="button"
          onClick={downloadZip}
          disabled={!!zipping}
          className="btn-secondary !min-h-[52px]"
        >
          {zipping ? (
            <>
              <Mark size={16} className="animate-spin" />
              {t("zipProgress", { done: zipping.done, total: zipping.total })}
            </>
          ) : (
            <>
              <DownloadIcon size={17} /> {t("downloadAll")}
            </>
          )}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-1.5 sm:grid-cols-4 md:grid-cols-5">
        {photos.map((photo, i) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => setLightbox(i)}
            className="group relative aspect-square overflow-hidden rounded-lg bg-surface"
            style={{ minHeight: 0 }}
            aria-label={photo.guestName ?? `photo ${i + 1}`}
          >
            {photo.thumbUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photo.thumbUrl}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover transition group-active:scale-95"
                style={{ filter: filterCss(photo.filter) }}
              />
            )}
          </button>
        ))}
      </div>

      {lightbox !== null && photos[lightbox] && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/95"
          onClick={() => setLightbox(null)}
        >
          <div className="flex items-center justify-between p-4">
            <span className="pl-2 text-sm text-ink-2">
              {photos[lightbox].guestName ?? ""}
              <span className="numeral ml-3 text-base text-ink">
                {lightbox + 1} / {photos.length}
              </span>
            </span>
            <button type="button" className="icon-btn" aria-label="close">
              <XIcon size={18} />
            </button>
          </div>
          <div
            className="flex flex-1 items-center justify-center overflow-hidden px-3"
            onClick={(e) => e.stopPropagation()}
          >
            {photos[lightbox].url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photos[lightbox].url!}
                alt=""
                className="max-h-full max-w-full rounded-lg object-contain"
                style={{ filter: filterCss(photos[lightbox].filter) }}
              />
            )}
          </div>
          <div className="flex justify-center p-4" onClick={(e) => e.stopPropagation()}>
            <a
              href={photos[lightbox].url ?? "#"}
              download={`kadr-${photos[lightbox].id}.jpg`}
              className="btn btn-primary !min-h-[52px]"
            >
              <DownloadIcon size={17} /> {t("downloadOriginal")}
            </a>
          </div>
        </div>
      )}
    </>
  );
}
