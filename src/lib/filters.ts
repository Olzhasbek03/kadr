/**
 * Film styles. Applied as CSS filters at display time only — the stored
 * original is never modified, so the style can change later and downloads
 * always return the clean full-resolution file.
 *
 * Three deliberate choices: none, black and white, polaroid.
 */

export const FILM_STYLES = ["original", "noir", "polaroid"] as const;

export type FilmStyle = (typeof FILM_STYLES)[number];

export const FILTER_CSS: Record<FilmStyle, string> = {
  original: "none",
  noir: "grayscale(1) contrast(1.08) brightness(1.02)",
  // Authentic instant-film grade: faded (lower contrast + desaturated),
  // gently warm with lifted shadows — matches the polaroid-photo skill's
  // reference grade rather than the old oversaturated orange cast.
  polaroid: "contrast(0.92) saturate(0.9) brightness(1.06) sepia(0.18) hue-rotate(-6deg)",
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
  polaroid: "linear-gradient(150deg, #f1ece1 0%, #ded2bc 55%, #b4a68c 100%)",
};
