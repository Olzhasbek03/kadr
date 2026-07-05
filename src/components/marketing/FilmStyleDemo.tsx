"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { FILM_STYLES, FILTER_CSS, type FilmStyle } from "@/lib/filters";

/**
 * The six film styles, applied live to a real photograph exactly as they
 * are on the guest camera's viewfinder. A real product demo, not a mock.
 */
export default function FilmStyleDemo() {
  const t = useTranslations("landing");
  const tf = useTranslations("camera.filterNames");
  const [style, setStyle] = useState<FilmStyle>("polaroid");

  return (
    <div className="mx-auto max-w-3xl">
      <div className="relative mx-auto aspect-[4/5] max-w-md overflow-hidden rounded-[14px] sm:aspect-[4/3] sm:max-w-xl">
        <Image
          src="/photos/rings-gold.jpg"
          alt={t("stylesPhotoAlt")}
          fill
          sizes="(max-width: 640px) 90vw, 576px"
          className="object-cover transition-[filter] duration-300"
          style={{ filter: FILTER_CSS[style] }}
        />
        <span className="absolute left-4 top-4 rounded-full bg-dark/55 px-3.5 py-1.5 text-xs font-medium text-ivory backdrop-blur-sm">
          {tf(style)}
        </span>
      </div>

      <div
        className="scrollbar-none mt-6 flex justify-start gap-2 overflow-x-auto px-1 sm:justify-center"
        role="radiogroup"
        aria-label={t("stylesAria")}
      >
        {FILM_STYLES.map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={style === s}
            onClick={() => setStyle(s)}
            className={`flex shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors ${
              style === s
                ? "border-accent bg-accent/5 text-accent"
                : "border-line bg-surface text-ink-2 hover:border-ink-2/40"
            }`}
            style={{ minHeight: 46 }}
          >
            <span className="relative h-5 w-5 overflow-hidden rounded-full">
              <Image
                src="/photos/rings-gold.jpg"
                alt=""
                fill
                sizes="20px"
                className="object-cover"
                style={{ filter: FILTER_CSS[s] }}
              />
            </span>
            {tf(s)}
          </button>
        ))}
      </div>
    </div>
  );
}
