"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { GalleryItem } from "@/lib/types";
import { filterCss } from "@/lib/filters";
import { canShareFiles, shareOrDownload } from "@/lib/client/shareMedia";
import {
  ArrowLeft,
  ArrowRight,
  DownloadIcon,
  ShareIcon,
  TrashIcon,
  XIcon,
} from "@/components/icons";

/**
 * Full-screen viewer for photos and videos (voice wishes play in their own
 * cards). Keyboard: ← → navigate, Esc closes. Videos get a real player with
 * poster; downloads use the content-disposition URL so "Save" saves.
 */
export default function MediaLightbox({
  items,
  index,
  onNavigate,
  onClose,
  onDelete,
}: {
  items: GalleryItem[];
  index: number;
  onNavigate: (index: number) => void;
  onClose: () => void;
  /** Host moderation hook; omit for the guest gallery. */
  onDelete?: (item: GalleryItem) => void;
}) {
  const tc = useTranslations("common");
  const t = useTranslations("gallery");
  const item = items[index];
  const [canShare, setCanShare] = useState(false);

  useEffect(() => setCanShare(canShareFiles()), []);

  const save = useCallback(() => {
    if (item?.url) void shareOrDownload(item.url, item.type);
  }, [item]);

  const prev = useCallback(
    () => index > 0 && onNavigate(index - 1),
    [index, onNavigate]
  );
  const next = useCallback(
    () => index < items.length - 1 && onNavigate(index + 1),
    [index, items.length, onNavigate]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, prev, next]);

  if (!item) return null;
  const polaroid = item.filter === "polaroid";

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-dark/95 text-ivory"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="flex items-center justify-between p-4">
        <span className="pl-2 text-sm text-ivory/60">
          {item.guestName ?? ""}
          <span className="numeral ml-3 text-base text-ivory">
            {index + 1} / {items.length}
          </span>
        </span>
        <button
          type="button"
          onClick={onClose}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-ivory/10"
          aria-label={tc("close")}
        >
          <XIcon size={18} />
        </button>
      </div>

      <div
        className="flex flex-1 items-center justify-center overflow-hidden px-3"
        onClick={(e) => e.stopPropagation()}
      >
        {item.type === "video" ? (
          item.url && (
            <video
              key={item.id}
              src={item.url}
              poster={item.thumbUrl ?? undefined}
              controls
              playsInline
              preload="metadata"
              className="max-h-full max-w-full rounded-[10px]"
              style={{ filter: filterCss(item.filter) }}
            />
          )
        ) : (
          item.url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.url}
              alt=""
              className={`max-h-full max-w-full object-contain ${
                polaroid
                  ? "rounded-[4px] border-[10px] border-b-[34px] border-[#faf7ef] bg-[#faf7ef]"
                  : "rounded-[10px]"
              }`}
              style={{ filter: filterCss(item.filter) }}
            />
          )
        )}
      </div>

      <div
        className="flex items-center justify-between gap-3 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          disabled={index === 0}
          onClick={prev}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-ivory/10 disabled:opacity-40"
          aria-label={tc("previous")}
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-3">
          {item.url && (
            <button type="button" onClick={save} className="btn btn-dark !min-h-[50px]">
              {canShare ? <ShareIcon size={17} /> : <DownloadIcon size={17} />}
              {canShare ? t("saveShare") : t("download")}
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(item)}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-danger/20 text-danger"
              aria-label={t("deleteItem")}
            >
              <TrashIcon size={18} />
            </button>
          )}
        </div>
        <button
          type="button"
          disabled={index >= items.length - 1}
          onClick={next}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-ivory/10 disabled:opacity-40"
          aria-label={tc("next")}
        >
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
