"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { GalleryItem } from "@/lib/types";
import { filterCss } from "@/lib/filters";
import {
  ArrowLeft,
  ArrowRight,
  PauseIcon,
  PlayIcon,
  XIcon,
} from "@/components/icons";

const PHOTO_MS = 6000;
const VIDEO_FALLBACK_MS = 15000;

/**
 * Big-screen mode: a full-screen, auto-advancing slideshow meant to be
 * projected at the venue. Photos get a slow Ken Burns drift; videos play
 * through (muted) and hand off when they end. It reads the same live
 * `items` the gallery polls, so shots appear on the big screen moments
 * after a guest takes them. Controls auto-hide; the show loops forever.
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
  const advanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const count = items.length;
  const item = items[index];

  const go = useCallback(
    (dir: 1 | -1) => setIndex((i) => (count ? (i + dir + count) % count : 0)),
    [count]
  );

  // Auto-advance. Photos run on a timer; videos hand off on `ended` (with a
  // safety timer in case metadata never fires).
  useEffect(() => {
    if (advanceRef.current) clearTimeout(advanceRef.current);
    if (!playing || count <= 1 || !item) return;
    const ms = item.type === "video" ? VIDEO_FALLBACK_MS : PHOTO_MS;
    advanceRef.current = setTimeout(() => go(1), ms);
    return () => {
      if (advanceRef.current) clearTimeout(advanceRef.current);
    };
  }, [index, playing, count, item, go]);

  // Keep the index in range as the live gallery grows or shrinks.
  useEffect(() => {
    if (index > count - 1) setIndex(count ? count - 1 : 0);
  }, [count, index]);

  // Play/pause the active video with the slideshow.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (playing) void v.play().catch(() => {});
    else v.pause();
  }, [playing, index]);

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

  if (!item) return null;
  const kb = index % 2 === 0 ? "ken-burns" : "ken-burns-alt";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden bg-black"
      role="dialog"
      aria-modal="true"
      aria-label={t("slideshow")}
      onMouseMove={nudgeControls}
      onClick={nudgeControls}
    >
      {/* the frame */}
      <div key={item.id} className="slide-fade absolute inset-0 flex items-center justify-center">
        {item.type === "video" ? (
          item.url && (
            <video
              ref={videoRef}
              src={item.url}
              poster={item.thumbUrl ?? undefined}
              autoPlay
              muted
              playsInline
              onEnded={() => playing && go(1)}
              className="max-h-full max-w-full"
              style={{ filter: filterCss(item.filter) }}
            />
          )
        ) : (
          item.url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.url}
              alt=""
              className={`${kb} max-h-full max-w-full object-contain`}
              style={{ filter: filterCss(item.filter) }}
            />
          )
        )}
      </div>

      {/* attribution + counter, bottom-left */}
      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between p-6 transition-opacity duration-500 sm:p-10 ${
          controls ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="max-w-[60%]">
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

      {/* controls, top bar */}
      <div
        className={`absolute inset-x-0 top-0 flex items-center justify-between p-5 transition-opacity duration-500 ${
          controls ? "opacity-100" : "opacity-0"
        }`}
      >
        <span className="rounded-full bg-white/12 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-sm">
          {t("slideshow")}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label={tc("close")}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white/12 text-white backdrop-blur-sm"
        >
          <XIcon size={20} />
        </button>
      </div>

      {/* prev / play / next, center-bottom */}
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
