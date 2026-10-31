import "server-only";
import type { PropertyType } from "@/generated/prisma/enums";
import { regionName } from "@/lib/locations";
import { formatTZS, moveInCost } from "@/lib/money";
import { normalizeTzPhone } from "@/lib/phone";
import { prisma } from "./db";
import { env } from "./env";
import { consumeRateLimit, hashIdentifier, RATE_RULES } from "./rate-limit";
import { track } from "./services/analytics";
import { publicListingWhere } from "./services/listings";
import { verifiedIdentityWhere } from "./services/trust";
import { sendSms, smsEnabled } from "./sms";
import { appLink } from "./whatsapp";

/**
 * Rental search over USSD (Africa's Talking), for people on basic phones or without data.
 * Read-only: it shows published listings and can SMS a listing's details to the caller's own
 * number. It never shows private data, takes payments or changes anything.
 *
 * Africa's Talking calls the callback with the whole session so far in `text`, e.g. "2*1*3"
 * (each answer separated by "*"). The menu is rebuilt from those answers on every request,
 * so no session state is stored. Replies start with "CON " (expects another answer) or
 * "END " (closes the session). "0" goes back one screen and "00" returns to the main menu.
 */

export type UssdRequest = { sessionId: string; serviceCode: string; phoneNumber: string; text: string };
type Lang = "en" | "sw";

/** Africa's Talking shows at most ~182 characters per USSD screen. */
export const USSD_MAX_CHARS = 182;
const REGIONS_PER_PAGE = 6;
const RESULTS_PER_PAGE = 4;
export const USSD_BUDGETS = [150_000, 300_000, 500_000, 1_000_000] as const;

const T = {
  en: {
    main: "Dalali Trust\n1. Find a home to rent\n2. Safety tips\n3. Contact us",
    chooseRegion: "Choose region:",
    noListings: "No homes are listed right now. Please try again later.",
    more: "More",
    back: "0. Back",
    budget: (region: string) =>
      `${region}: monthly rent?\n1. Up to 150k\n2. Up to 300k\n3. Up to 500k\n4. Up to 1M\n5. Any budget`,
    noResults: "No homes match. Try a higher budget.",
    results: (n: number) => `${n} home${n === 1 ? "" : "s"}, cheapest first:`,
    invalid: "Invalid choice.",
    bed: (n: number) => (n === 0 ? "studio" : `${n} bed`),
    types: { ROOM: "room", BEDSITTER: "bedsitter", APARTMENT: "apartment", HOUSE: "house", OTHER: "home" },
    rent: "Rent",
    perMonth: "/mo",
    moveIn: "Move-in",
    available: { AVAILABLE: "Available now", AVAILABLE_SOON: "Available soon", OCCUPIED: "Occupied" },
    idChecked: "Advertiser ID checked",
    smsMe: "1. SMS me details",
    listingGone: "This home is no longer listed.",
    smsSent: "Details sent by SMS. Never pay before you have seen the home.",
    smsLimit: "Too many SMS requests. Please try again later.",
    smsFailed: "Sorry, we could not send the SMS. Please try again later.",
    safety:
      "Stay safe: never pay rent, deposit or fees before you see the home and meet the advertiser. Report problems on Dalali Trust.",
    contact: (where: string) => `Dalali Trust\n${where}`,
    tooMany: "Too many requests. Please try again in a few minutes.",
    sms: {
      contact: "Contact",
      safety: "Never pay before you have seen the home.",
    },
  },
  sw: {
    main: "Dalali Trust\n1. Tafuta nyumba ya kupanga\n2. Ushauri wa usalama\n3. Wasiliana nasi",
    chooseRegion: "Chagua mkoa:",
    noListings: "Hakuna nyumba zilizotangazwa sasa. Tafadhali jaribu baadaye.",
    more: "Zaidi",
    back: "0. Rudi",
    budget: (region: string) =>
      `${region}: kodi kwa mwezi?\n1. Hadi 150k\n2. Hadi 300k\n3. Hadi 500k\n4. Hadi 1M\n5. Bajeti yoyote`,
    noResults: "Hakuna nyumba zinazolingana. Jaribu bajeti kubwa zaidi.",
    results: (n: number) => `Nyumba ${n}, nafuu kwanza:`,
    invalid: "Chaguo batili.",
    bed: (n: number) => (n === 0 ? "studio" : `vyumba ${n}`),
    types: {
      ROOM: "chumba",
      BEDSITTER: "bedsitter",
      APARTMENT: "apartment",
      HOUSE: "nyumba",
      OTHER: "nyumba",
    },
    rent: "Kodi",
    perMonth: "/mwezi",
    moveIn: "Kuhamia",
    available: {
      AVAILABLE: "Inapatikana sasa",
      AVAILABLE_SOON: "Itapatikana karibuni",
      OCCUPIED: "Imeshapangishwa",
    },
    idChecked: "ID ya mtangazaji imekaguliwa",
    smsMe: "1. Tuma maelezo kwa SMS",
    listingGone: "Nyumba hii haipo tena kwenye matangazo.",
    smsSent: "Maelezo yametumwa kwa SMS. Usilipe kabla ya kuona nyumba.",
    smsLimit: "Maombi mengi ya SMS. Tafadhali jaribu baadaye.",
    smsFailed: "Samahani, hatukuweza kutuma SMS. Tafadhali jaribu baadaye.",
    safety:
      "Kuwa salama: usilipe kodi, amana au ada kabla ya kuona nyumba na kukutana na mtangazaji. Ripoti matatizo kwenye Dalali Trust.",
    contact: (where: string) => `Dalali Trust\n${where}`,
    tooMany: "Maombi mengi mno. Tafadhali jaribu tena baada ya dakika chache.",
    sms: {
      contact: "Mawasiliano",
      safety: "Usilipe kabla ya kuona nyumba.",
    },
  },
} as const;

type Screen =
  | { kind: "lang" }
  | { kind: "main" }
  | { kind: "region"; page: number }
  | { kind: "budget"; region: string }
  | { kind: "results"; region: string; maxRent: number | null; page: number }
  | { kind: "detail"; listingId: string };

type Reply = { end: boolean; body: string };

/** Shortens TZS amounts for small screens: 250000 → "250k", 1200000 → "1.2M". */
export function compactTZS(amount: number): string {
  if (amount >= 1_000_000) return `${Number((amount / 1_000_000).toFixed(1))}M`;
  if (amount >= 1_000) return `${Math.round(amount / 1_000)}k`;
  return String(amount);
}

function fit(text: string): string {
  return text.length > USSD_MAX_CHARS ? `${text.slice(0, USSD_MAX_CHARS - 1)}…` : text;
}

/**
 * Lays out a menu so it fits one screen. Long options are shortened in their middle part
 * (e.g. the place name), never their number, their price, the heading or the navigation
 * options (More / Back) after them. An option is [number, text to shorten, kept ending].
 */
function menu(heading: string, options: [string, string, string?][], footer: string[]): string {
  const fixed = [heading, ...footer].join("\n").length + options.length; // + new lines
  const perLine = Math.floor((USSD_MAX_CHARS - 4 - fixed) / Math.max(1, options.length));
  const lines = options.map(([num, middle, end]) => {
    const tail = end ? ` ${end}` : "";
    const room = Math.max(6, perLine - num.length - tail.length);
    return `${num}${middle.length > room ? `${middle.slice(0, room - 1)}…` : middle}${tail}`;
  });
  return [heading, ...lines, ...footer].join("\n");
}

function format(reply: Reply): string {
  return `${reply.end ? "END" : "CON"} ${fit(reply.body)}`;
}

// ── Data ────────────────────────────────────────────────────────────────────

/** Regions that have published listings, busiest first. */
async function activeRegions(): Promise<string[]> {
  const rows = await prisma.property.groupBy({
    by: ["region"],
    where: publicListingWhere(),
    _count: { _all: true },
    orderBy: [{ _count: { region: "desc" } }, { region: "asc" }],
  });
  return rows.map((r) => r.region);
}

async function searchPage(region: string, maxRent: number | null, page: number) {
  const where = {
    ...publicListingWhere(),
    region,
    availabilityStatus: { not: "OCCUPIED" as const },
    ...(maxRent ? { rentAmount: { lte: maxRent } } : {}),
  };
  const [total, items] = await prisma.$transaction([
    prisma.property.count({ where }),
    prisma.property.findMany({
      where,
      orderBy: [{ rentAmount: "asc" }, { id: "asc" }],
      skip: page * RESULTS_PER_PAGE,
      take: RESULTS_PER_PAGE,
      select: { id: true, neighborhood: true, propertyType: true, bedrooms: true, rentAmount: true },
    }),
  ]);
  return { total, items };
}

async function loadListing(id: string) {
  return prisma.property.findFirst({
    where: { id, ...publicListingWhere() },
    select: {
      id: true,
      slug: true,
      title: true,
      propertyType: true,
      region: true,
      district: true,
      neighborhood: true,
      bedrooms: true,
      rentAmount: true,
      advanceMonths: true,
      depositAmount: true,
      agentFeeAmount: true,
      availabilityStatus: true,
      contactPhone: true,
      advertiserId: true,
      charges: { select: { amount: true, frequency: true } },
      advertiser: { select: { advertiserProfile: { select: { contactPhone: true, showPhone: true } } } },
    },
  });
}

function describeType(lang: Lang, type: PropertyType, bedrooms: number): string {
  const t = T[lang];
  return type === "ROOM" || type === "BEDSITTER" ? t.types[type] : `${t.bed(bedrooms)} ${t.types[type]}`;
}

// ── Screens ─────────────────────────────────────────────────────────────────

async function render(screen: Screen, lang: Lang, error: boolean): Promise<Reply> {
  const t = T[lang];
  const prefix = error ? `${t.invalid}\n` : "";
  switch (screen.kind) {
    case "lang":
      return { end: false, body: `${prefix}Dalali Trust\n1. English\n2. Kiswahili` };
    case "main":
      return { end: false, body: `${prefix}${t.main}` };
    case "region": {
      const regions = await activeRegions();
      if (regions.length === 0) return { end: true, body: t.noListings };
      const start = screen.page * REGIONS_PER_PAGE;
      const shown = regions.slice(start, start + REGIONS_PER_PAGE);
      const lines = shown.map((r, i): [string, string] => [`${i + 1}. `, regionName(r)]);
      const footer = start + REGIONS_PER_PAGE < regions.length ? [`9. ${t.more}`, t.back] : [t.back];
      return { end: false, body: menu(`${prefix}${t.chooseRegion}`, lines, footer) };
    }
    case "budget":
      return { end: false, body: `${prefix}${t.budget(regionName(screen.region))}\n${t.back}` };
    case "results": {
      const { total, items } = await searchPage(screen.region, screen.maxRent, screen.page);
      if (total === 0) return { end: false, body: `${t.noResults}\n${t.back}` };
      const lines = items.map((p, i): [string, string, string] => [
        `${i + 1}. `,
        `${p.neighborhood}, ${describeType(lang, p.propertyType, p.bedrooms)}`,
        compactTZS(p.rentAmount),
      ]);
      const footer = (screen.page + 1) * RESULTS_PER_PAGE < total ? [`9. ${t.more}`, t.back] : [t.back];
      return { end: false, body: menu(`${prefix}${t.results(total)}`, lines, footer) };
    }
    case "detail": {
      const p = await loadListing(screen.listingId);
      if (!p) return { end: true, body: t.listingGone };
      const verified =
        (await prisma.user.count({ where: { id: p.advertiserId, ...verifiedIdentityWhere() } })) > 0;
      const total = moveInCost(p).total;
      const lines = [
        `${t.rent} ${formatTZS(p.rentAmount, lang)}${t.perMonth}`,
        `${t.moveIn} ${formatTZS(total, lang)}`,
        t.available[p.availabilityStatus],
        ...(verified ? [t.idChecked] : []),
      ];
      const footer = [...(smsEnabled() ? [t.smsMe] : []), t.back];
      // Prices and options always show in full; the place name is shortened if needed.
      const rest = [...lines, ...footer].join("\n");
      const room = Math.max(16, USSD_MAX_CHARS - 4 - rest.length - 1);
      const place = `${prefix}${p.neighborhood}, ${describeType(lang, p.propertyType, p.bedrooms)}`;
      const heading = place.length > room ? `${place.slice(0, room - 1)}…` : place;
      await track("ussd_listing_view", p.id);
      return { end: false, body: `${heading}\n${rest}` };
    }
  }
}

/** Applies one answer to the current screen. Returns the next screen, "invalid", or a final reply. */
async function step(
  screen: Screen,
  input: string,
  lang: Lang,
  phoneNumber: string,
): Promise<Screen | "invalid" | Reply> {
  const t = T[lang];
  const n = /^\d{1,2}$/.test(input) ? Number(input) : NaN;
  switch (screen.kind) {
    case "lang":
      return n === 1 || n === 2 ? { kind: "main" } : "invalid";
    case "main":
      if (n === 1) return { kind: "region", page: 0 };
      if (n === 2) return { end: true, body: t.safety };
      if (n === 3) {
        const e = env();
        const where = [e.SUPPORT_PHONE, e.SUPPORT_EMAIL, new URL(e.APP_URL).host].filter(Boolean).join("\n");
        return { end: true, body: t.contact(where) };
      }
      return "invalid";
    case "region": {
      const regions = await activeRegions();
      const start = screen.page * REGIONS_PER_PAGE;
      if (n === 9 && start + REGIONS_PER_PAGE < regions.length)
        return { kind: "region", page: screen.page + 1 };
      const region = n >= 1 && n <= REGIONS_PER_PAGE ? regions[start + n - 1] : undefined;
      return region ? { kind: "budget", region } : "invalid";
    }
    case "budget":
      if (n >= 1 && n <= USSD_BUDGETS.length)
        return { kind: "results", region: screen.region, maxRent: USSD_BUDGETS[n - 1]!, page: 0 };
      if (n === 5) return { kind: "results", region: screen.region, maxRent: null, page: 0 };
      return "invalid";
    case "results": {
      const { total, items } = await searchPage(screen.region, screen.maxRent, screen.page);
      if (n === 9 && (screen.page + 1) * RESULTS_PER_PAGE < total)
        return { ...screen, page: screen.page + 1 };
      const listing = n >= 1 ? items[n - 1] : undefined;
      return listing ? { kind: "detail", listingId: listing.id } : "invalid";
    }
    case "detail": {
      if (n !== 1 || !smsEnabled()) return "invalid";
      // "1" here ends the session, so it is always the newest answer and is sent only once.
      return sendListingSms(screen.listingId, lang, phoneNumber);
    }
  }
}

async function sendListingSms(listingId: string, lang: Lang, phoneNumber: string): Promise<Reply> {
  const t = T[lang];
  const to = normalizeTzPhone(phoneNumber) ?? (/^\+\d{8,15}$/.test(phoneNumber) ? phoneNumber : null);
  if (!to) return { end: true, body: t.smsFailed };
  const limit = await consumeRateLimit(prisma, `ussd-sms:${hashIdentifier(to)}`, RATE_RULES.ussdSms);
  if (!limit.allowed) return { end: true, body: t.smsLimit };
  const p = await loadListing(listingId);
  if (!p) return { end: true, body: t.listingGone };
  const profile = p.advertiser.advertiserProfile;
  const phone = p.contactPhone ?? (profile?.showPhone ? profile.contactPhone : null);
  const text = [
    `Dalali Trust: ${p.title}`,
    `${p.neighborhood}, ${p.district}, ${regionName(p.region)}`,
    `${t.rent} ${formatTZS(p.rentAmount, lang)}${t.perMonth}. ${t.moveIn} ${formatTZS(moveInCost(p).total, lang)}`,
    ...(phone ? [`${t.sms.contact}: ${phone}`] : []),
    appLink(`/properties/${p.slug}`),
    t.sms.safety,
  ].join("\n");
  const result = await sendSms(to, text);
  if (!result.ok) {
    console.warn(`[ussd] listing SMS not sent: ${result.error}`);
    return { end: true, body: t.smsFailed };
  }
  await track("ussd_sms_details", p.id);
  return { end: true, body: t.smsSent };
}

/** Builds the reply for one Africa's Talking USSD callback ("CON …" or "END …"). */
export async function handleUssd(req: UssdRequest): Promise<string> {
  const phoneKey = hashIdentifier(req.phoneNumber || req.sessionId);
  const limit = await consumeRateLimit(prisma, `ussd:${phoneKey}`, RATE_RULES.ussd);
  const answers = req.text === "" ? [] : req.text.split("*").map((a) => a.trim());
  // The language is the first answer, so it is known before any screen is drawn.
  let lang: Lang = answers[0] === "2" ? "sw" : "en";
  if (!limit.allowed) return format({ end: true, body: T[lang].tooMany });

  const stack: Screen[] = [{ kind: "lang" }];
  let error = false;
  for (const answer of answers) {
    const top = stack[stack.length - 1]!;
    error = false;
    if (answer === "00" && stack.length > 2) {
      stack.length = 2; // [lang, main]
      continue;
    }
    if (answer === "0" && stack.length > 1 && top.kind !== "main") {
      stack.pop();
      continue;
    }
    const next = await step(top, answer, lang, req.phoneNumber);
    if (next === "invalid") {
      error = true;
      continue;
    }
    if ("end" in next) return format(next);
    if (top.kind === "lang") lang = answer === "2" ? "sw" : "en";
    stack.push(next);
  }
  return format(await render(stack[stack.length - 1]!, lang, error));
}
