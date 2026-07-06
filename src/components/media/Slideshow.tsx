"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { GalleryItem } from "@/lib/types";
import { filterCss } from "@/lib/filters";
import { canShareFiles, shareOrDownload } from "@/lib/client/shareMedia";
import {
  ArrowLeft,
  ArrowRight,
  DownloadIcon,
  PauseIcon,
  PlayIcon,
  ShareIcon,
  XIcon,
} from "@/components/icons";

const PHOTO_MS = 6000;

interface Layer {
  key: number;
  item: GalleryItem;
  kb: string;
}

/**
 * Big-screen mode: a full-screen, auto-advancing photo slideshow meant to be
 * projected at the venue. Photos crossfade into each other with a slow Ken
 * Burns drift, and it reads the same live `items` the gallery polls, so shots
 * appear on the big screen moments after a guest takes them. Photos only:
 * videos would break the ambient rhythm and can't autoplay everywhere.
 */
export default function Slideshow({
  items,
  startIndex = 0,
  onClose,
}: {
  items: GalleryItem[];
  startIndex?: number;
  onClose: () => void;
}) {
  const t = useTranslations("gallery");
  const tc = useTranslations("common");
  const [index, setIndex] = useState(Math.min(startIndex, Math.max(0, items.length - 1)));
  const [playing, setPlaying] = useState(true);
  const [controls, setControls] = useState(true);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [canShare, setCanShare] = useState(false);
  const advanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seqRef = useRef(0);

  const count = items.length;
  const item = items[index];

  useEffect(() => setCanShare(canShareFiles()), []);

  const go = useCallback(
    (dir: 1 | -1) => setIndex((i) => (count ? (i + dir + count) % count : 0)),
    [count]
  );

  // Push each shown photo as a new crossfade layer; keep only the outgoing
  // and incoming frames mounted so the DOM stays light.
  useEffect(() => {
    if (!item) return;
    const key = ++seqRef.current;
    setLayers((prev) => [
      ...prev.slice(-1),
      { key, item, kb: key % 2 === 0 ? "ken-burns" : "ken-burns-alt" },
    ]);
  }, [item]);

  // Auto-advance on a timer.
  useEffect(() => {
    if (advanceRef.current) clearTimeout(advanceRef.current);
    if (!playing || count <= 1) return;
    advanceRef.current = setTimeout(() => go(1), PHOTO_MS);
    return () => {
      if (advanceRef.current) clearTimeout(advanceRef.current);
    };
  }, [index, playing, count, go]);

  // Keep the index in range as the live gallery grows or shrinks.
  useEffect(() => {
    if (index > count - 1) setIndex(count ? count - 1 : 0);
  }, [count, index]);

  const nudgeControls = useCallback(() => {
    setControls(true);
    if (hideRef.current) clearTimeout(hideRef.current);
    hideRef.current = setTimeout(() => setControls(false), 3000);
  }, []);

  useEffect(() => {
    nudgeControls();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      }
      nudgeControls();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (hideRef.current) clearTimeout(hideRef.current);
    };
  }, [go, onClose, nudgeControls]);

  const saveCurrent = useCallback(() => {
    if (item?.url) void shareOrDownload(item.url, "photo");
  }, [item]);

  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden bg-black"
      role="dialog"
      aria-modal="true"
      aria-label={t("slideshow")}
      onMouseMove={nudgeControls}
      onClick={nudgeControls}
    >
      {/* crossfading frames */}
      {layers.map((layer, i) => {
        const active = i === layers.length - 1;
        return (
          <div
            key={layer.key}
            className={`absolute inset-0 flex items-center justify-center ${
              active ? "slide-in" : "slide-out"
            }`}
            onAnimationEnd={
              active ? () => setLayers((prev) => prev.slice(-1)) : undefined
            }
          >
            {layer.item.url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={layer.item.url}
                alt=""
                className={`${active ? layer.kb : ""} max-h-full max-w-full object-contain`}
                style={{ filter: filterCss(layer.item.filter) }}
              />
            )}
          </div>
        );
      })}

      {/* attribution + counter, bottom */}
      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between p-6 transition-opacity duration-500 sm:p-10 ${
          controls ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="max-w-[55%]">
          {item.guestName && (
            <p className="font-display text-2xl text-white drop-shadow sm:text-4xl">
              {item.guestName}
            </p>
          )}
        </div>
        <span className="numeral rounded-full bg-white/12 px-4 py-1.5 text-lg text-white backdrop-blur-sm">
          {index + 1} / {count}
        </span>
      </div>

      {/* top bar: title, save, close */}
      <div
        className={`absolute inset-x-0 top-0 flex items-center justify-between p-5 transition-opacity duration-500 ${
          controls ? "opacity-100" : "opacity-0"
        }`}
      >
        <span className="rounded-full bg-white/12 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-sm">
          {t("slideshow")}
        </span>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={saveCurrent}
            aria-label={t("saveShare")}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white/12 text-white backdrop-blur-sm"
          >
            {canShare ? <ShareIcon size={19} /> : <DownloadIcon size={19} />}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label={tc("close")}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white/12 text-white backdrop-blur-sm"
          >
            <XIcon size={20} />
          </button>
        </div>
      </div>

      {/* prev / play / next */}
      <div
        className={`absolute bottom-1/2 flex w-full translate-y-1/2 items-center justify-between px-4 transition-opacity duration-500 sm:px-8 ${
          controls ? "opacity-100" : "opacity-0"
        }`}
      >
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label={tc("previous")}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-white/12 text-white backdrop-blur-sm"
        >
          <ArrowLeft size={22} />
        </button>
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          aria-label={playing ? t("slidePause") : t("slidePlay")}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm"
        >
          {playing ? <PauseIcon size={26} /> : <PlayIcon size={26} />}
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          aria-label={tc("next")}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-white/12 text-white backdrop-blur-sm"
        >
          <ArrowRight size={22} />
        </button>
      </div>
    </div>
  );
}
