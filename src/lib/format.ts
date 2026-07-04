/** All dates render in the event market's timezone for consistency
 *  between server and client rendering. */
export const APP_TZ = "Asia/Almaty";

const INTL_LOCALE: Record<string, string> = {
  ru: "ru-RU",
  kk: "kk-KZ",
  en: "en-GB",
};

export function intlLocale(locale: string): string {
  return INTL_LOCALE[locale] ?? "ru-RU";
}

export function formatDateTime(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: APP_TZ,
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: APP_TZ,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

export function formatTime(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: APP_TZ,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}
