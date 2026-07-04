function int(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/** Runtime configuration. Every value has a dev-safe default. */
export const config = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  /** Price of one paid event, in KZT. */
  eventPriceKzt: int(process.env.EVENT_PRICE_KZT, 9900),
  /** Events with max_guests at or below this are free. */
  freeGuestLimit: int(process.env.FREE_GUEST_LIMIT, 5),
  /** Active payment provider: "mock" | "kaspi". */
  paymentsProvider: process.env.PAYMENTS_PROVIDER ?? "mock",
  /** HMAC secret for webhook signatures (mock provider + kaspi fallback). */
  webhookSecret: process.env.PAYMENTS_WEBHOOK_SECRET ?? "dev-secret-change-me",
} as const;

/** Price for a given guest capacity. `null` maxGuests means unlimited → paid. */
export function priceForEvent(maxGuests: number | null): number {
  if (maxGuests !== null && maxGuests <= config.freeGuestLimit) return 0;
  return config.eventPriceKzt;
}

export function formatKzt(amount: number): string {
  return `${new Intl.NumberFormat("ru-RU").format(amount)} ₸`;
}
