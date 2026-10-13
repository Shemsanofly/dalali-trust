import { en, type Dictionary } from "./en";
import { sw } from "./sw";

export type Locale = "en" | "sw";
export const LOCALES: Locale[] = ["en", "sw"];
export const LOCALE_COOKIE = "dalali_locale";

export const dictionaries: Record<Locale, Dictionary> = { en, sw };

export function isLocale(v: unknown): v is Locale {
  return v === "en" || v === "sw";
}

/** Replaces {placeholders} in a message. */
export function fmt(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? `{${k}}`));
}

export type { Dictionary };
