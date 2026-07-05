/**
 * Film styles. Applied as CSS filters at display time only — the stored
 * original is never modified, so the style can change later and downloads
 * always return the clean full-resolution file.
 */

export const FILM_STYLES = [
  "original",
  "noir",
  "warm",
  "cool",
  "cine",
  "vintage",
  "polaroid",
] as const;

export type FilmStyle = (typeof FILM_STYLES)[number];

export const FILTER_CSS: Record<FilmStyle, string> = {
  original: "none",
  noir: "grayscale(1) contrast(1.08) brightness(1.02)",
  warm: "sepia(0.28) saturate(1.35) contrast(1.05) brightness(1.04) hue-rotate(-10deg)",
  cool: "sepia(0.08) saturate(1.15) contrast(1.06) brightness(1.02) hue-rotate(8deg)",
  cine: "contrast(1.28) saturate(1.12) brightness(0.98)",
  vintage: "sepia(0.5) contrast(0.92) brightness(1.06) saturate(1.25) hue-rotate(-6deg)",
  polaroid: "sepia(0.32) contrast(0.88) brightness(1.1) saturate(1.18) hue-rotate(-4deg)",
};

export function isFilmStyle(value: unknown): value is FilmStyle {
  return typeof value === "string" && (FILM_STYLES as readonly string[]).includes(value);
}

export function filterCss(style: string | null | undefined): string {
  return isFilmStyle(style) ? FILTER_CSS[style] : "none";
}

/** Soft botanical cover gradients per preset — parchment-adjacent tones
 *  deep enough for sepia text. Used where an event has no photo yet. */
export const STYLE_COVER: Record<FilmStyle, string> = {
  original: "linear-gradient(150deg, #ece7de 0%, #d8d1c4 55%, #b8ac99 100%)",
  noir: "linear-gradient(150deg, #e8e6e3 0%, #c9c5c0 55%, #98938c 100%)",
  warm: "linear-gradient(150deg, #f0e2cc 0%, #ddc39c 55%, #b3906a 100%)",
  cool: "linear-gradient(150deg, #dfe7e5 0%, #bccfcc 55%, #8aa5a2 100%)",
  cine: "linear-gradient(150deg, #e4dfe7 0%, #c4bacb 55%, #93859e 100%)",
  vintage: "linear-gradient(150deg, #eee4d1 0%, #d4bd9c 55%, #a68a67 100%)",
  polaroid: "linear-gradient(150deg, #f1ece1 0%, #ded2bc 55%, #b4a68c 100%)",
};
