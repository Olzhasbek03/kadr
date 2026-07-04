"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { FILTER_CSS } from "@/lib/filters";
import { PhotoArt } from "@/components/ArtDecor";
import { FilmIcon, LockIcon } from "@/components/icons";

const TILE_FILTERS = ["warm", "noir", "original", "vintage", "cool", "cine"] as const;

/**
 * The reveal, demonstrated: a looping night → morning cycle.
 * 23:47 — six locked frames. 09:00 — the same frames develop in.
 */
export default function RevealDemo() {
  const t = useTranslations("landing");
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRevealed(true);
      return;
    }
    let alive = true;
    const cycle = () => {
      if (!alive) return;
      setRevealed((r) => !r);
    };
    const id = setInterval(cycle, 4200);
    const kickoff = setTimeout(cycle, 1200);
    return () => {
      alive = false;
      clearInterval(id);
      clearTimeout(kickoff);
    };
  }, []);

  return (
    <div className="mx-auto max-w-md">
      <div className="card overflow-hidden">
        <div className="sprockets" aria-hidden />
        <div className="flex items-center justify-between px-5 py-4">
          <span className="stat-numeral text-2xl" suppressHydrationWarning>
            {revealed ? "09:00" : "23:47"}
          </span>
          <span
            className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider transition ${
              revealed ? "bg-accent/15 text-accent-strong" : "bg-surface-2 text-muted"
            }`}
          >
            {revealed ? <FilmIcon size={13} /> : <LockIcon size={13} />}
            {revealed ? t("revealDemoOpen") : t("revealDemoLocked")}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1.5 px-3 pb-3">
          {TILE_FILTERS.map((f, i) => (
            <div
              key={i}
              className="relative aspect-square overflow-hidden rounded-lg bg-surface-2"
            >
              <PhotoArt
                id={`reveal-tile-${i}`}
                className="absolute inset-0 h-full w-full"
                style={{
                  filter: revealed
                    ? FILTER_CSS[f]
                    : "brightness(0.14) sepia(0.7) blur(6px)",
                  transform: `scale(${1 + (i % 3) * 0.25}) rotate(${(i % 2) * 180}deg)`,
                  transition: "filter 1.1s ease",
                  transitionDelay: revealed ? `${i * 120}ms` : "0ms",
                }}
              />
              {!revealed && (
                <LockIcon
                  size={14}
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-ink/30"
                />
              )}
            </div>
          ))}
        </div>
        <div className="sprockets" aria-hidden />
      </div>
    </div>
  );
}
