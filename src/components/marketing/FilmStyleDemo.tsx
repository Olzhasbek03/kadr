"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { FILM_STYLES, FILTER_CSS, STYLE_COVER, type FilmStyle } from "@/lib/filters";
import { PhotoArt } from "@/components/ArtDecor";

/**
 * Live film-style switcher — the same six styles guests get on the camera,
 * applied instantly to the preview exactly like on the real viewfinder.
 */
export default function FilmStyleDemo() {
  const t = useTranslations("landing");
  const tf = useTranslations("camera.filterNames");
  const [style, setStyle] = useState<FilmStyle>("warm");

  return (
    <div className="mx-auto max-w-3xl">
      <div className="film-grain relative mx-auto aspect-[4/3] max-w-xl overflow-hidden rounded-[1.6rem] border border-line">
        <PhotoArt
          id="style-demo"
          className="absolute inset-0 h-full w-full transition-[filter] duration-300"
          style={{ filter: FILTER_CSS[style] }}
        />
        <span className="absolute left-4 top-4 rounded-full bg-black/55 px-3.5 py-1.5 text-xs font-medium text-ink backdrop-blur">
          {tf(style)}
        </span>
      </div>

      <div
        className="scrollbar-none mt-5 flex justify-start gap-2 overflow-x-auto px-1 sm:justify-center"
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
            data-selected={style === s}
            className="option-card shrink-0 gap-2 rounded-full !px-3.5 !py-2 text-sm"
            style={{ minHeight: 44 }}
          >
            <span
              aria-hidden
              className="h-5 w-5 rounded-full border border-line"
              style={{ background: STYLE_COVER.original, filter: FILTER_CSS[s] }}
            />
            {tf(s)}
          </button>
        ))}
      </div>
    </div>
  );
}
