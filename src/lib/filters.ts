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

/** Deep blue-hour cover gradients per preset — dark enough for ivory text
 *  to sit on. Used where an event has no photo of its own yet. */
export const STYLE_COVER: Record<FilmStyle, string> = {
  original: "linear-gradient(150deg, #2c2c3c 0%, #232331 55%, #1a1a26 100%)",
  noir: "linear-gradient(150deg, #32323a 0%, #26262c 55%, #19191f 100%)",
  warm: "linear-gradient(150deg, #3b3028 0%, #2e2620 55%, #1f1a17 100%)",
  cool: "linear-gradient(150deg, #283440 0%, #202a34 55%, #171e26 100%)",
  cine: "linear-gradient(150deg, #322c40 0%, #272232 55%, #1a1724 100%)",
  vintage: "linear-gradient(150deg, #38312a 0%, #2c2620 55%, #1e1a16 100%)",
  polaroid: "linear-gradient(150deg, #35332c 0%, #2a2823 55%, #1c1b17 100%)",
};
