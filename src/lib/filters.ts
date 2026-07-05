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

/** Soft cover gradients per preset — hazy, light, echoing golden-hour
 *  photography. Used where an event has no photo of its own yet. */
export const STYLE_COVER: Record<FilmStyle, string> = {
  original: "linear-gradient(150deg, #e9e2dd 0%, #cfc4bd 55%, #a99b93 100%)",
  noir: "linear-gradient(150deg, #e6e4e2 0%, #b9b5b2 55%, #7d7876 100%)",
  warm: "linear-gradient(150deg, #f0dfc9 0%, #ddb98d 55%, #b3835a 100%)",
  cool: "linear-gradient(150deg, #dfe6e6 0%, #b5c6c8 55%, #7f989d 100%)",
  cine: "linear-gradient(150deg, #e3dfe6 0%, #beb3c4 55%, #857a93 100%)",
  vintage: "linear-gradient(150deg, #eee3d2 0%, #d1bb9d 55%, #a08769 100%)",
  polaroid: "linear-gradient(150deg, #f2ece1 0%, #ddd0ba 55%, #b3a288 100%)",
};
