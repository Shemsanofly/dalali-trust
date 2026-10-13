import "server-only";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { dictionaries, isLocale, LOCALE_COOKIE, type Locale } from ".";

export const getLocale = cache(async (): Promise<Locale> => {
  const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;
  const accept = (await headers()).get("accept-language") ?? "";
  return /^sw\b|,\s*sw\b/i.test(accept) ? "sw" : "en";
});

export async function getDictionary() {
  const locale = await getLocale();
  return { locale, t: dictionaries[locale] };
}
