export const APP_TIME_ZONE = "Africa/Dar_es_Salaam";

type Loc = "en" | "sw";
const intlLocale = (l: Loc) => (l === "sw" ? "sw-TZ" : "en-GB");

export function formatDate(d: Date | string, locale: Loc = "en"): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: APP_TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(d));
}

/** "25/10/2026 10:00" in East Africa Time: reads the same in English and Swahili (used in WhatsApp messages). */
export function formatEatNumeric(d: Date | string): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: APP_TIME_ZONE,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(d))
      .map((p) => [p.type, p.value]),
  );
  return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}`;
}

export function formatDateTime(d: Date | string, locale: Loc = "en"): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: APP_TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(d));
}

export function daysSince(d: Date | string, now: Date = new Date()): number {
  return Math.floor((now.getTime() - new Date(d).getTime()) / 86_400_000);
}

/**
 * Converts a `datetime-local` input value (interpreted as East Africa Time, UTC+3,
 * which has no daylight saving) into a UTC Date.
 */
export function parseEatLocalDateTime(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m.map(Number) as [number, number, number, number, number, number];
  const utc = Date.UTC(y, mo - 1, d, h - 3, mi);
  const date = new Date(utc);
  return Number.isNaN(date.getTime()) ? null : date;
}
