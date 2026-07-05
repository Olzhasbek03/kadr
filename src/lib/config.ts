function int(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/**
 * Base URL for links guests will follow (QR codes, share links, print cards).
 * Resolution order: explicit env → canonical production domain → local dev.
 * The production fallback exists so a missing env var can never put
 * localhost on a printed table card.
 */
function resolveAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.NODE_ENV === "production") return "https://korme.vercel.app";
  return "http://localhost:3000";
}

/** Runtime configuration. Every value has a dev-safe default. */
export const config = {
  appUrl: resolveAppUrl(),
  /** Default per-event guest capacity (host can change per event). */
  defaultMaxGuests: int(process.env.DEFAULT_MAX_GUESTS, 30),
} as const;
