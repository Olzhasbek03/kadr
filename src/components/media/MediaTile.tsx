"use client";

import type { GalleryItem } from "@/lib/types";
import { filterCss } from "@/lib/filters";
import { PlayIcon } from "@/components/icons";

/** Grid tile for a photo or video (voice wishes render as cards instead). */
export default function MediaTile({
  item,
  index,
  mineLabel,
  onOpen,
  eager,
}: {
  item: GalleryItem;
  index: number;
  /** localized "mine" badge text, or null to hide */
  mineLabel: string | null;
  onOpen: () => void;
  eager?: boolean;
}) {
  const thumb = item.thumbUrl ?? item.url;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="develop-in group relative aspect-square overflow-hidden rounded-[10px] bg-surface"
      style={{ ["--dev-delay" as string]: `${Math.min(index, 14) * 70}ms`, minHeight: 0 }}
      aria-label={item.guestName ?? `media ${index + 1}`}
    >
      {thumb && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumb}
          alt=""
          loading={eager ? "eager" : "lazy"}
          className="h-full w-full object-cover transition-transform group-active:scale-95"
          style={{ filter: filterCss(item.filter) }}
        />
      )}
      {item.type === "video" && (
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-dark/55 text-ivory backdrop-blur-sm">
            <PlayIcon size={18} />
          </span>
          {item.durationS !== null && (
            <span className="numeral absolute bottom-2 right-2 rounded-full bg-dark/55 px-2 py-0.5 text-[0.7rem] text-ivory backdrop-blur-sm">
              {Math.round(item.durationS)}s
            </span>
          )}
        </span>
      )}
      {mineLabel && (
        <span className="absolute left-2 top-2 rounded-full bg-dark/55 px-2.5 py-1 text-[0.68rem] font-semibold text-ivory backdrop-blur-sm">
          {mineLabel}
        </span>
      )}
    </button>
  );
}
