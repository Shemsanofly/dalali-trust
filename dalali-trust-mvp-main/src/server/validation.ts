import { z } from "zod";
import { REGION_SLUGS } from "@/lib/locations";
import { MAX_TZS_AMOUNT } from "@/lib/money";
import { normalizeTzPhone } from "@/lib/phone";
import { AppError } from "./errors";

/** Throws a VALIDATION AppError with per-field messages. */
export function parseOrThrow<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join(".") || "_form";
      (fieldErrors[key] ??= []).push(issue.message);
    }
    throw new AppError("VALIDATION", "Please correct the highlighted fields.", fieldErrors);
  }
  return result.data;
}

const trimmed = (min: number, max: number, label: string) =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .min(min, `${label} must be at least ${min} characters`)
    .max(max, `${label} must be at most ${max} characters`);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Must be at most ${max} characters`)
    .optional()
    .transform((v) => (v ? v : undefined));

const tzs = (label: string, min = 0) =>
  z.coerce
    .number({ error: `${label} must be a whole number of shillings` })
    .int(`${label} must be a whole number of shillings`)
    .min(min, min > 0 ? `${label} must be greater than zero` : `${label} cannot be negative`)
    .max(MAX_TZS_AMOUNT, `${label} is too large`);

export const tzPhone = z
  .string()
  .trim()
  .transform((v, ctx) => {
    const normalized = normalizeTzPhone(v);
    if (!normalized) {
      ctx.addIssue({ code: "custom", message: "Enter a Tanzanian mobile number, e.g. 0712 345 678" });
      return z.NEVER;
    }
    return normalized;
  });

export const optionalTzPhone = z
  .string()
  .trim()
  .optional()
  .transform((v, ctx) => {
    if (!v) return undefined;
    const normalized = normalizeTzPhone(v);
    if (!normalized) {
      ctx.addIssue({ code: "custom", message: "Enter a Tanzanian mobile number, e.g. 0712 345 678" });
      return z.NEVER;
    }
    return normalized;
  });

export const PROPERTY_TYPES = ["ROOM", "BEDSITTER", "APARTMENT", "HOUSE", "OTHER"] as const;
export const UTILITY_ARRANGEMENTS = [
  "INCLUDED_IN_RENT",
  "SEPARATE_METER",
  "SHARED_SPLIT",
  "NOT_AVAILABLE",
  "ASK_ADVERTISER",
] as const;
export const AVAILABILITY = ["AVAILABLE", "AVAILABLE_SOON", "OCCUPIED"] as const;

export const AMENITIES = [
  "water_tank",
  "parking",
  "security_guard",
  "perimeter_wall",
  "gate",
  "tiled_floors",
  "ceiling_board",
  "wardrobe",
  "private_kitchen",
  "private_bathroom",
  "balcony",
  "air_conditioning",
  "internet",
  "backup_power",
  "cctv",
  "near_public_transport",
  "pets_allowed",
] as const;

const dateOnly = z
  .string()
  .trim()
  .optional()
  .transform((v, ctx) => {
    if (!v) return undefined;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      ctx.addIssue({ code: "custom", message: "Enter a valid date" });
      return z.NEVER;
    }
    const d = new Date(`${v}T00:00:00.000Z`);
    if (Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: "custom", message: "Enter a valid date" });
      return z.NEVER;
    }
    return d;
  });

const coord = (min: number, max: number) =>
  z
    .union([z.literal(""), z.coerce.number().min(min).max(max)])
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : Math.round(v * 1000) / 1000));

export const chargeSchema = z.object({
  label: trimmed(2, 60, "Charge name"),
  amount: tzs("Charge amount"),
  frequency: z.enum(["ONE_TIME", "MONTHLY"]),
  note: optionalText(160),
});

/**
 * Fields an advertiser may set on a listing. Anything not listed here (status, slug,
 * advertiserId, publishedAt, ...) cannot be mass-assigned from a request.
 */
export const listingInputSchema = z
  .object({
    title: trimmed(8, 120, "Title"),
    description: trimmed(40, 5000, "Description"),
    propertyType: z.enum(PROPERTY_TYPES, { error: "Choose a property type" }),
    region: z.enum(REGION_SLUGS, { error: "Choose a region" }),
    district: trimmed(2, 80, "District"),
    neighborhood: trimmed(2, 80, "Neighbourhood"),
    streetAddress: optionalText(160),
    latitude: coord(-12, 0),
    longitude: coord(29, 41),
    rentAmount: tzs("Monthly rent", 1),
    advanceMonths: z.coerce.number().int().min(1, "At least 1 month").max(24, "At most 24 months"),
    depositAmount: tzs("Deposit"),
    agentFeeAmount: tzs("Agent fee"),
    agentFeeNote: optionalText(200),
    paymentTerms: optionalText(500),
    bedrooms: z.coerce.number().int().min(0).max(20),
    bathrooms: z.coerce.number().int().min(0).max(20),
    furnished: z.boolean().default(false),
    amenities: z.array(z.enum(AMENITIES)).max(AMENITIES.length).default([]),
    electricity: z.enum(UTILITY_ARRANGEMENTS),
    water: z.enum(UTILITY_ARRANGEMENTS),
    utilityNotes: optionalText(300),
    contactPhone: optionalTzPhone,
    contactWhatsapp: optionalTzPhone,
    availabilityStatus: z.enum(AVAILABILITY),
    availableFrom: dateOnly,
    charges: z.array(chargeSchema).max(10, "At most 10 additional charges").default([]),
  })
  .superRefine((v, ctx) => {
    if ((v.latitude === undefined) !== (v.longitude === undefined)) {
      ctx.addIssue({
        code: "custom",
        path: ["latitude"],
        message: "Provide both latitude and longitude, or neither",
      });
    }
    if (v.availabilityStatus === "AVAILABLE_SOON" && !v.availableFrom) {
      ctx.addIssue({
        code: "custom",
        path: ["availableFrom"],
        message: "Tell tenants when it becomes available",
      });
    }
  });

export type ListingInput = z.infer<typeof listingInputSchema>;

export const availabilityUpdateSchema = z
  .object({
    availabilityStatus: z.enum(AVAILABILITY),
    availableFrom: dateOnly,
  })
  .superRefine((v, ctx) => {
    if (v.availabilityStatus === "AVAILABLE_SOON" && !v.availableFrom) {
      ctx.addIssue({
        code: "custom",
        path: ["availableFrom"],
        message: "Tell tenants when it becomes available",
      });
    }
  });

export const SORTS = ["newest", "price_asc", "price_desc", "recently_confirmed"] as const;

export const searchSchema = z.object({
  q: z.string().trim().max(80).optional().catch(undefined),
  region: z.enum(REGION_SLUGS).optional().catch(undefined),
  district: z.string().trim().max(80).optional().catch(undefined),
  type: z.enum(PROPERTY_TYPES).optional().catch(undefined),
  minRent: z.coerce.number().int().min(0).max(MAX_TZS_AMOUNT).optional().catch(undefined),
  maxRent: z.coerce.number().int().min(0).max(MAX_TZS_AMOUNT).optional().catch(undefined),
  bedrooms: z.coerce.number().int().min(0).max(20).optional().catch(undefined),
  availableNow: z
    .enum(["1", "true"])
    .optional()
    .catch(undefined)
    .transform((v) => v !== undefined),
  verifiedOnly: z
    .enum(["1", "true"])
    .optional()
    .catch(undefined)
    .transform((v) => v !== undefined),
  sort: z.enum(SORTS).default("newest").catch("newest"),
  page: z.coerce.number().int().min(1).max(500).default(1).catch(1),
});

export type SearchParams = z.infer<typeof searchSchema>;

export const REPORT_CATEGORIES = [
  "IMPERSONATION",
  "DUPLICATE_OR_MISLEADING",
  "INCORRECT_PRICE_OR_AVAILABILITY",
  "ADVANCE_PAYMENT_REQUEST",
  "UNAUTHORIZED_ADVERTISING",
  "OTHER",
] as const;

export const reportInputSchema = z
  .object({
    propertyId: z.string().trim().max(40).optional(),
    subjectUserId: z.string().trim().max(60).optional(),
    category: z.enum(REPORT_CATEGORIES, { error: "Choose what is wrong" }),
    description: trimmed(20, 3000, "Description"),
  })
  .refine((v) => v.propertyId || v.subjectUserId, {
    message: "Choose a listing or account to report",
    path: ["_form"],
  });

export const viewingInputSchema = z.object({
  propertyId: z.string().trim().min(1).max(40),
  proposedAt: z.date({ error: "Choose a date and time" }),
  message: optionalText(1000),
  contactPhone: optionalTzPhone,
});

export const EVIDENCE_KINDS = [
  "NATIONAL_ID",
  "PASSPORT",
  "DRIVING_LICENCE",
  "VOTER_ID",
  "SELFIE_WITH_ID",
  "BUSINESS_LICENCE",
  "OWNER_AUTHORIZATION_LETTER",
  "MANAGEMENT_AGREEMENT",
  "UTILITY_BILL",
  "PROPERTY_OWNERSHIP_DOCUMENT",
  "PROPERTY_PHOTO",
  "OTHER",
] as const;

const NEEDS_PHONE = "Add your mobile number to get WhatsApp updates";

export const profileSchema = z
  .object({
    name: trimmed(2, 80, "Name"),
    phoneNumber: optionalTzPhone,
    locale: z.enum(["en", "sw"]).default("en"),
    whatsappUpdates: z.boolean().optional(),
  })
  .refine((v) => !v.whatsappUpdates || v.phoneNumber, { path: ["phoneNumber"], message: NEEDS_PHONE });

export const advertiserProfileSchema = z.object({
  displayName: trimmed(2, 80, "Display name"),
  bio: optionalText(1000),
  agencyName: optionalText(120),
  serviceRegions: z.array(z.enum(REGION_SLUGS)).max(31).default([]),
  contactPhone: optionalTzPhone,
  whatsappNumber: optionalTzPhone,
  showPhone: z.boolean().default(true),
});

export const SELF_SERVICE_ROLES = ["TENANT", "LANDLORD", "AGENT"] as const;

export const signUpSchema = z
  .object({
    name: trimmed(2, 80, "Name"),
    email: z.email("Enter a valid email address").trim().toLowerCase().max(254),
    password: z.string().min(10, "Use at least 10 characters").max(128, "Use at most 128 characters"),
    role: z.enum(SELF_SERVICE_ROLES, { error: "Choose how you will use Dalali Trust" }),
    phoneNumber: optionalTzPhone,
    acceptTerms: z.literal(true, { error: "You must accept the terms to continue" }),
    whatsappUpdates: z.boolean().default(false),
  })
  .refine((v) => !v.whatsappUpdates || v.phoneNumber, { path: ["phoneNumber"], message: NEEDS_PHONE });

export const feedbackSchema = z.object({
  kind: z.enum(["FEEDBACK", "CONTACT"]).default("FEEDBACK"),
  name: optionalText(80),
  email: z
    .union([z.literal(""), z.email("Enter a valid email address")])
    .optional()
    .transform((v) => (v ? v : undefined)),
  message: trimmed(5, 3000, "Message"),
  page: optionalText(200),
});
