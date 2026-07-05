"use client";

import { useEffect, useRef, useState } from "react";
import type { GalleryItem } from "@/lib/types";
import { MicIcon, PauseIcon, PlayIcon } from "@/components/icons";

/**
 * A voice wish rendered as a small player card — never as a broken <img>.
 * Progress is tracked from the audio element itself so scrubbing/ending
 * stay honest; duration falls back to the stored value because
 * MediaRecorder blobs often report Infinity.
 */
export default function AudioWishCard({
  item,
  accentLabel,
}: {
  item: GalleryItem;
  /** e.g. the localized "mine" badge; null hides it */
  accentLabel?: string | null;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => {
      const total = Number.isFinite(el.duration) && el.duration > 0
        ? el.duration
        : (item.durationS ?? 0);
      setProgress(total > 0 ? Math.min(1, el.currentTime / total) : 0);
    };
    const onEnd = () => {
      setPlaying(false);
      setProgress(0);
    };
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("ended", onEnd);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("ended", onEnd);
    };
  }, [item.durationS]);

  const toggle = () => {
    const el = audioRef.current;
    if (!el || !item.url) return;
    if (el.paused) {
      void el.play();
      setPlaying(true);
    } else {
      el.pause();
      setPlaying(false);
    }
  };

  return (
    <div className="card flex items-center gap-4 p-4">
      <button
        type="button"
        onClick={toggle}
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-crimson text-ivory transition active:scale-95"
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? <PauseIcon size={20} /> : <PlayIcon size={20} />}
      </button>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 truncate text-sm font-medium">
          <MicIcon size={14} className="shrink-0 text-crimson" />
          <span className="truncate">{item.guestName ?? "—"}</span>
          {accentLabel && (
            <span className="shrink-0 rounded-full bg-crimson/10 px-2 py-0.5 text-[0.65rem] font-semibold text-crimson">
              {accentLabel}
            </span>
          )}
        </p>
        <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-crimson transition-[width] duration-200"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>
      {item.durationS !== null && (
        <span className="numeral shrink-0 text-sm text-ink-2">
          {Math.round(item.durationS)}s
        </span>
      )}
      {item.url && <audio ref={audioRef} src={item.url} preload="none" className="hidden" />}
    </div>
  );
}
