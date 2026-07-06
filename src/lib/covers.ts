/**
 * Invitation card templates. The cover is the first thing a guest sees
 * after scanning the QR; the host picks one of three fixed designs when
 * creating the event. Fixed set by design: consistent, print-safe, and
 * every one already localized.
 */
export const COVER_TEMPLATES = ["classic", "botanical", "noir"] as const;

export type CoverTemplate = (typeof COVER_TEMPLATES)[number];

export function isCoverTemplate(value: unknown): value is CoverTemplate {
  return (
    typeof value === "string" && (COVER_TEMPLATES as readonly string[]).includes(value)
  );
}
