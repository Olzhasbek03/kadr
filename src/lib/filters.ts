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
] as const;

export type FilmStyle = (typeof FILM_STYLES)[number];

export const FILTER_CSS: Record<FilmStyle, string> = {
  original: "none",
  noir: "grayscale(1) contrast(1.08) brightness(1.02)",
  warm: "sepia(0.28) saturate(1.35) contrast(1.05) brightness(1.04) hue-rotate(-10deg)",
  cool: "sepia(0.08) saturate(1.15) contrast(1.06) brightness(1.02) hue-rotate(8deg)",
  cine: "contrast(1.28) saturate(1.12) brightness(0.98)",
  vintage: "sepia(0.5) contrast(0.92) brightness(1.06) saturate(1.25) hue-rotate(-6deg)",
};

export function isFilmStyle(value: unknown): value is FilmStyle {
  return typeof value === "string" && (FILM_STYLES as readonly string[]).includes(value);
}

export function filterCss(style: string | null | undefined): string {
  return isFilmStyle(style) ? FILTER_CSS[style] : "none";
}

/** Cover gradients per preset — used for event covers and style swatches. */
export const STYLE_COVER: Record<FilmStyle, string> = {
  original: "radial-gradient(120% 90% at 30% 10%, #3d4a52 0%, #1c2226 55%, #0c0a08 100%)",
  noir: "radial-gradient(120% 90% at 30% 10%, #4a4a4a 0%, #1e1e1e 55%, #0a0a0a 100%)",
  warm: "radial-gradient(120% 90% at 30% 10%, #5c452a 0%, #2a1f14 55%, #0c0a08 100%)",
  cool: "radial-gradient(120% 90% at 30% 10%, #32485c 0%, #17222b 55%, #0a0b0c 100%)",
  cine: "radial-gradient(120% 90% at 30% 10%, #423c50 0%, #1d1a24 55%, #0b0a0c 100%)",
  vintage: "radial-gradient(120% 90% at 30% 10%, #5a4a33 0%, #2b2318 55%, #0c0a08 100%)",
};
