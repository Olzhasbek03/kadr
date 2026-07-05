"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";

const TILES = [
  "/photos/kyz-dance.jpg",
  "/photos/ceremony-lights.jpg",
  "/photos/rings-gold.jpg",
  "/photos/confetti.jpg",
  "/photos/chapel.jpg",
  "/photos/ceremony-lights.jpg",
];

/**
 * The reveal, demonstrated on real photographs: a looping night → morning
 * cycle. At 23:47 every frame sleeps under an ivory veil; at 09:00 the
 * veil lifts and the photographs develop in, one after another.
 */
export default function RevealDemo() {
  const t = useTranslations("landing");
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRevealed(true);
      return;
    }
    const first = setTimeout(() => setRevealed(true), 1600);
    const id = setInterval(() => setRevealed((r) => !r), 5200);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-5 flex items-baseline justify-between px-1">
        <span className="numeral text-3xl text-ivory sm:text-4xl" suppressHydrationWarning>
          {revealed ? "09:00" : "23:47"}
        </span>
        <span
          className={`text-sm transition-colors duration-500 ${
            revealed ? "text-accent-soft" : "text-ivory/50"
          }`}
          suppressHydrationWarning
        >
          {revealed ? t("revealDemoOpen") : t("revealDemoLocked")}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {TILES.map((src, i) => (
          <div
            key={src}
            className="relative aspect-[3/4] overflow-hidden rounded-[10px] bg-ivory/10"
          >
            <Image
              src={src}
              alt=""
              fill
              sizes="(max-width: 640px) 30vw, 210px"
              className="object-cover"
              style={{
                filter: revealed ? "blur(0px) saturate(1)" : "blur(16px) saturate(0.55)",
                opacity: revealed ? 1 : 0.45,
                transform: revealed ? "scale(1)" : "scale(1.06)",
                transition:
                  "filter 900ms cubic-bezier(0.23,1,0.32,1), opacity 900ms ease, transform 900ms cubic-bezier(0.23,1,0.32,1)",
                transitionDelay: revealed ? `${i * 110}ms` : "0ms",
              }}
            />
            {/* ivory veil over the sleeping frame */}
            <div
              aria-hidden
              className="veil absolute inset-0"
              style={{
                opacity: revealed ? 0 : 1,
                transition: "opacity 800ms ease",
                transitionDelay: revealed ? `${i * 110}ms` : "0ms",
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
