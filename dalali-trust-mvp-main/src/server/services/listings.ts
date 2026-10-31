import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { ListingStatus } from "@/generated/prisma/enums";
import { listingAgentFeeAmount } from "@/lib/fees";
import { makeListingSlug } from "@/lib/slug";
import { assertActive, assertAdmin, assertAdvertiser, isAdmin, type Actor } from "../actor";
import { writeAudit } from "../audit";
import { prisma } from "../db";
import { AppError, forbidden, invalidState, notFound } from "../errors";
import { enforceRateLimit, RATE_RULES } from "../rate-limit";
import { ogImageKey } from "../og-image";
import { appLink } from "../whatsapp";
import { storage } from "../storage";
import {
  fileToBuffer,
  IMAGE_MAX_BYTES,
  MAX_IMAGES_PER_LISTING,
  newStorageKey,
  processListingImage,
} from "../uploads";
import {
  availabilityUpdateSchema,
  listingInputSchema,
  parseOrThrow,
  searchSchema,
  type ListingInput,
} from "../validation";
import { notify } from "./notifications";
import { verifiedIdentityWhere } from "./trust";

/** Statuses in which the advertiser may edit listing content. */
const EDITABLE: ListingStatus[] = ["DRAFT", "REJECTED", "PENDING_REVIEW", "PUBLISHED"];

/** Conditions a listing must meet to be shown to the public. */
export function publicListingWhere(): Prisma.PropertyWhereInput {
  return { status: "PUBLISHED", advertiser: { status: "ACTIVE" } };
}

function listingData(input: ListingInput) {
  return {
    title: input.title,
    description: input.description,
    propertyType: input.propertyType,
    region: input.region,
    district: input.district,
    neighborhood: input.neighborhood,
    streetAddress: input.streetAddress ?? null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    rentAmount: input.rentAmount,
    advanceMonths: input.advanceMonths,
    depositAmount: input.depositAmount,
    agentFeeNote: input.agentFeeNote ?? null,
    paymentTerms: input.paymentTerms ?? null,
    bedrooms: input.bedrooms,
    bathrooms: input.bathrooms,
    furnished: input.furnished,
    amenities: input.amenities,
    electricity: input.electricity,
    water: input.water,
    utilityNotes: input.utilityNotes ?? null,
    availabilityStatus: input.availabilityStatus,
    availableFrom: input.availableFrom ?? null,
  };
}

async function loadOwned(actor: Actor, propertyId: string) {
  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  // Return "not found" rather than "forbidden" so ids of other people's listings are not confirmed.
  if (!property || (property.advertiserId !== actor.id && !isAdmin(actor)))
    throw notFound("Listing not found.");
  return property;
}

export async function createListing(actor: Actor, raw: unknown) {
  assertAdvertiser(actor);
  await enforceRateLimit(prisma, `listing:${actor.id}`, RATE_RULES.listingWrite);
  const input = parseOrThrow(listingInputSchema, raw);
  return prisma.$transaction(async (tx) => {
    const property = await tx.property.create({
      data: {
        ...listingData(input),
        // Agent fee is derived from the rent; owners are never charged. Contacts are
        // company contacts now, so any per-listing number is cleared.
        agentFeeAmount: listingAgentFeeAmount(actor.role, input.rentAmount),
        contactPhone: null,
        contactWhatsapp: null,
        slug: makeListingSlug(input.title, input.neighborhood),
        advertiserId: actor.id,
        status: "DRAFT",
        availabilityConfirmedAt: new Date(),
        charges: { create: input.charges.map((c) => ({ ...c, note: c.note ?? null })) },
      },
    });
    await writeAudit(tx, {
      actorId: actor.id,
      action: "listing.create",
      entityType: "Property",
      entityId: property.id,
    });
    return property;
  });
}

/**
 * Updates listing content. Editing a published listing sends it back to review so that
 * prices or descriptions cannot be changed after approval without a moderator seeing it.
 */
export async function updateListing(actor: Actor, propertyId: string, raw: unknown) {
  assertAdvertiser(actor);
  await enforceRateLimit(prisma, `listing:${actor.id}`, RATE_RULES.listingWrite);
  const property = await loadOwned(actor, propertyId);
  if (property.advertiserId !== actor.id) throw notFound("Listing not found.");
  if (!EDITABLE.includes(property.status)) throw invalidState("This listing can no longer be edited.");
  const input = parseOrThrow(listingInputSchema, raw);
  const nextStatus: ListingStatus = property.status === "PUBLISHED" ? "PENDING_REVIEW" : property.status;
  return prisma.$transaction(async (tx) => {
    await tx.propertyCharge.deleteMany({ where: { propertyId } });
    const updated = await tx.property.update({
      where: { id: propertyId },
      data: {
        ...listingData(input),
        agentFeeAmount: listingAgentFeeAmount(actor.role, input.rentAmount),
        contactPhone: null,
        contactWhatsapp: null,
        status: nextStatus,
        submittedAt:
          nextStatus === "PENDING_REVIEW" && property.status === "PUBLISHED"
            ? new Date()
            : property.submittedAt,
        availabilityConfirmedAt: new Date(),
        charges: { create: input.charges.map((c) => ({ ...c, note: c.note ?? null })) },
      },
    });
    await writeAudit(tx, {
      actorId: actor.id,
      action: "listing.update",
      entityType: "Property",
      entityId: propertyId,
      metadata: { from: property.status, to: nextStatus },
    });
    return updated;
  });
}

export async function submitListingForReview(actor: Actor, propertyId: string) {
  assertAdvertiser(actor);
  const property = await loadOwned(actor, propertyId);
  if (property.advertiserId !== actor.id) throw notFound("Listing not found.");
  if (!["DRAFT", "REJECTED"].includes(property.status))
    throw invalidState("Only drafts or rejected listings can be submitted.");
  const imageCount = await prisma.propertyImage.count({ where: { propertyId } });
  if (imageCount < 1)
    throw new AppError("VALIDATION", "Add at least one real photo of the property before submitting.");
  return prisma.$transaction(async (tx) => {
    // Conditional update guards against a concurrent state change.
    const res = await tx.property.updateMany({
      where: { id: propertyId, status: property.status },
      data: { status: "PENDING_REVIEW", submittedAt: new Date(), reviewNote: null },
    });
    if (res.count !== 1) throw invalidState("The listing changed. Please refresh and try again.");
    await writeAudit(tx, {
      actorId: actor.id,
      action: "listing.submit",
      entityType: "Property",
      entityId: propertyId,
    });
  });
}

export async function archiveListing(actor: Actor, propertyId: string) {
  assertActive(actor);
  const property = await loadOwned(actor, propertyId);
  if (property.status === "ARCHIVED") return;
  if (property.status === "SUSPENDED" && !isAdmin(actor)) {
    throw invalidState("This listing is suspended. Contact support if you believe this is a mistake.");
  }
  await prisma.$transaction(async (tx) => {
    await tx.property.update({
      where: { id: propertyId },
      data: { status: "ARCHIVED", archivedAt: new Date() },
    });
    await writeAudit(tx, {
      actorId: actor.id,
      action: "listing.archive",
      entityType: "Property",
      entityId: propertyId,
      metadata: { from: property.status },
    });
  });
}

export async function restoreListingToDraft(actor: Actor, propertyId: string) {
  assertAdvertiser(actor);
  const property = await loadOwned(actor, propertyId);
  if (property.advertiserId !== actor.id) throw notFound("Listing not found.");
  if (property.status !== "ARCHIVED") throw invalidState("Only archived listings can be restored.");
  await prisma.$transaction(async (tx) => {
    await tx.property.update({ where: { id: propertyId }, data: { status: "DRAFT", archivedAt: null } });
    await writeAudit(tx, {
      actorId: actor.id,
      action: "listing.restore",
      entityType: "Property",
      entityId: propertyId,
    });
  });
}

/** Confirms the listing is still current without sending it back to review. */
export async function updateAvailability(actor: Actor, propertyId: string, raw: unknown) {
  assertAdvertiser(actor);
  const property = await loadOwned(actor, propertyId);
  if (property.advertiserId !== actor.id) throw notFound("Listing not found.");
  if (!["PUBLISHED", "PENDING_REVIEW", "DRAFT"].includes(property.status))
    throw invalidState("This listing cannot be updated.");
  const input = parseOrThrow(availabilityUpdateSchema, raw);
  await prisma.$transaction(async (tx) => {
    await tx.property.update({
      where: { id: propertyId },
      data: {
        availabilityStatus: input.availabilityStatus,
        availableFrom: input.availableFrom ?? null,
        availabilityConfirmedAt: new Date(),
      },
    });
    await writeAudit(tx, {
      actorId: actor.id,
      action: "listing.availability",
      entityType: "Property",
      entityId: propertyId,
      metadata: { availabilityStatus: input.availabilityStatus },
    });
  });
}

// ── Photos ──────────────────────────────────────────────────────────────────

export async function addListingImages(actor: Actor, propertyId: string, files: File[]) {
  assertAdvertiser(actor);
  await enforceRateLimit(prisma, `upload:${actor.id}`, RATE_RULES.upload);
  const property = await loadOwned(actor, propertyId);
  if (property.advertiserId !== actor.id) throw notFound("Listing not found.");
  if (!EDITABLE.includes(property.status))
    throw invalidState("Photos can no longer be changed on this listing.");
  const existing = await prisma.propertyImage.count({ where: { propertyId } });
  if (existing + files.length > MAX_IMAGES_PER_LISTING) {
    throw new AppError("VALIDATION", `A listing can have at most ${MAX_IMAGES_PER_LISTING} photos.`);
  }
  const store = storage();
  const written: string[] = [];
  try {
    const processed: {
      img: Awaited<ReturnType<typeof processListingImage>>;
      storageKey: string;
      thumbKey: string;
      size: number;
    }[] = [];
    for (const file of files) {
      const img = await processListingImage(await fileToBuffer(file, IMAGE_MAX_BYTES));
      const storageKey = newStorageKey("listings", "webp");
      const thumbKey = storageKey.replace(/\.webp$/, ".thumb.webp");
      await store.put(storageKey, img.full, "image/webp");
      written.push(storageKey);
      await store.put(thumbKey, img.thumb, "image/webp");
      written.push(thumbKey);
      processed.push({ img, storageKey, thumbKey, size: img.full.length });
    }
    await prisma.$transaction(async (tx) => {
      let order = existing;
      for (const p of processed) {
        await tx.propertyImage.create({
          data: {
            propertyId,
            storageKey: p.storageKey,
            thumbKey: p.thumbKey,
            width: p.img.width,
            height: p.img.height,
            sizeBytes: p.size,
            sha256: p.img.sha256,
            sortOrder: order++,
          },
        });
      }
      // Changing photos on a published listing requires a fresh review.
      if (property.status === "PUBLISHED") {
        await tx.property.update({
          where: { id: propertyId },
          data: { status: "PENDING_REVIEW", submittedAt: new Date() },
        });
      }
      await writeAudit(tx, {
        actorId: actor.id,
        action: "listing.images.add",
        entityType: "Property",
        entityId: propertyId,
        metadata: { count: processed.length },
      });
    });
  } catch (e) {
    await Promise.allSettled(written.map((k) => store.delete(k)));
    throw e;
  }
}

export async function removeListingImage(actor: Actor, imageId: string) {
  assertAdvertiser(actor);
  const image = await prisma.propertyImage.findUnique({
    where: { id: imageId },
    include: { property: true },
  });
  if (!image || image.property.advertiserId !== actor.id) throw notFound("Photo not found.");
  if (!EDITABLE.includes(image.property.status))
    throw invalidState("Photos can no longer be changed on this listing.");
  await prisma.$transaction(async (tx) => {
    await tx.propertyImage.delete({ where: { id: imageId } });
    await writeAudit(tx, {
      actorId: actor.id,
      action: "listing.images.remove",
      entityType: "Property",
      entityId: image.propertyId,
    });
  });
  await Promise.allSettled([
    storage().delete(image.storageKey),
    storage().delete(image.thumbKey),
    storage().delete(ogImageKey(image.storageKey)),
  ]);
}

/** Decides whether `actor` may view a listing photo. Published listings are public. */
export async function canViewListingImage(actor: Actor | null, imageId: string) {
  const image = await prisma.propertyImage.findUnique({
    where: { id: imageId },
    select: {
      storageKey: true,
      thumbKey: true,
      property: { select: { status: true, advertiserId: true, advertiser: { select: { status: true } } } },
    },
  });
  if (!image) return null;
  const isPublic = image.property.status === "PUBLISHED" && image.property.advertiser.status === "ACTIVE";
  const allowed = isPublic || (actor && (actor.id === image.property.advertiserId || isAdmin(actor)));
  return allowed ? { storageKey: image.storageKey, thumbKey: image.thumbKey, isPublic } : null;
}

// ── Advertiser views ────────────────────────────────────────────────────────

export async function listMyListings(actor: Actor) {
  assertAdvertiser(actor);
  return prisma.property.findMany({
    where: { advertiserId: actor.id },
    orderBy: { updatedAt: "desc" },
    include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
  });
}

export async function getListingForOwner(actor: Actor, propertyId: string) {
  assertActive(actor);
  await loadOwned(actor, propertyId);
  return prisma.property.findUniqueOrThrow({
    where: { id: propertyId },
    include: { images: { orderBy: { sortOrder: "asc" } }, charges: true },
  });
}

/** Basic performance numbers for the advertiser dashboard (last 30 days + totals). */
export async function listingStats(actor: Actor) {
  assertAdvertiser(actor);
  const since = new Date(Date.now() - 30 * 86_400_000);
  const ids = (
    await prisma.property.findMany({ where: { advertiserId: actor.id }, select: { id: true } })
  ).map((p) => p.id);
  if (ids.length === 0)
    return new Map<string, { views: number; contacts: number; saves: number; viewings: number }>();
  const [events, saves, viewings] = await Promise.all([
    prisma.analyticsEvent.groupBy({
      by: ["propertyId", "name"],
      where: {
        propertyId: { in: ids },
        createdAt: { gte: since },
        name: { in: ["listing_view", "contact_reveal", "whatsapp_click"] },
      },
      _count: { _all: true },
    }),
    prisma.savedProperty.groupBy({
      by: ["propertyId"],
      where: { propertyId: { in: ids } },
      _count: { _all: true },
    }),
    prisma.viewingRequest.groupBy({
      by: ["propertyId"],
      where: { propertyId: { in: ids } },
      _count: { _all: true },
    }),
  ]);
  const out = new Map<string, { views: number; contacts: number; saves: number; viewings: number }>();
  for (const id of ids) out.set(id, { views: 0, contacts: 0, saves: 0, viewings: 0 });
  for (const e of events) {
    const s = out.get(e.propertyId!);
    if (!s) continue;
    if (e.name === "listing_view") s.views += e._count._all;
    else s.contacts += e._count._all;
  }
  for (const s of saves) out.get(s.propertyId)!.saves = s._count._all;
  for (const v of viewings) out.get(v.propertyId)!.viewings = v._count._all;
  return out;
}

// ── Public search & detail ──────────────────────────────────────────────────

export const PAGE_SIZE = 12;

const publicCardSelect = {
  id: true,
  slug: true,
  title: true,
  propertyType: true,
  region: true,
  district: true,
  neighborhood: true,
  rentAmount: true,
  currency: true,
  advanceMonths: true,
  depositAmount: true,
  agentFeeAmount: true,
  bedrooms: true,
  bathrooms: true,
  furnished: true,
  availabilityStatus: true,
  availableFrom: true,
  availabilityConfirmedAt: true,
  publishedAt: true,
  advertiserId: true,
  images: { orderBy: { sortOrder: "asc" as const }, take: 1, select: { id: true, altText: true } },
} satisfies Prisma.PropertySelect;

export type PublicListingCard = Prisma.PropertyGetPayload<{ select: typeof publicCardSelect }>;

export async function searchListings(rawParams: unknown) {
  const p = searchSchema.parse(rawParams);
  const where: Prisma.PropertyWhereInput = { ...publicListingWhere() };
  const and: Prisma.PropertyWhereInput[] = [];
  if (p.region) and.push({ region: p.region });
  if (p.district) and.push({ district: { equals: p.district, mode: "insensitive" } });
  if (p.type) and.push({ propertyType: p.type });
  if (p.minRent !== undefined) and.push({ rentAmount: { gte: p.minRent } });
  if (p.maxRent !== undefined) and.push({ rentAmount: { lte: p.maxRent } });
  if (p.bedrooms !== undefined) and.push({ bedrooms: { gte: p.bedrooms } });
  if (p.availableNow) and.push({ availabilityStatus: "AVAILABLE" });
  if (p.verifiedOnly) and.push({ advertiser: verifiedIdentityWhere() });
  if (p.q) {
    // Parameterised ILIKE search on indexed-by-filter result sets. See docs/ARCHITECTURE.md
    // for the trade-off versus PostgreSQL full-text search.
    and.push({
      OR: [
        { title: { contains: p.q, mode: "insensitive" } },
        { neighborhood: { contains: p.q, mode: "insensitive" } },
        { district: { contains: p.q, mode: "insensitive" } },
        { description: { contains: p.q, mode: "insensitive" } },
      ],
    });
  }
  if (and.length) where.AND = and;

  const orderBy: Prisma.PropertyOrderByWithRelationInput[] =
    p.sort === "price_asc"
      ? [{ rentAmount: "asc" }, { id: "asc" }]
      : p.sort === "price_desc"
        ? [{ rentAmount: "desc" }, { id: "asc" }]
        : p.sort === "recently_confirmed"
          ? [{ availabilityConfirmedAt: { sort: "desc", nulls: "last" } }, { id: "asc" }]
          : [{ publishedAt: "desc" }, { id: "asc" }];

  const [total, items] = await prisma.$transaction([
    prisma.property.count({ where }),
    prisma.property.findMany({
      where,
      orderBy,
      skip: (p.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: publicCardSelect,
    }),
  ]);
  return { params: p, total, items, page: p.page, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

/** Public listing detail. Returns null unless the listing is publicly visible (or viewer is owner/admin). */
export async function getPublicListing(slug: string, viewer: Actor | null) {
  const property = await prisma.property.findUnique({
    where: { slug },
    include: {
      images: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, altText: true, width: true, height: true },
      },
      charges: { select: { id: true, label: true, amount: true, frequency: true, note: true } },
      advertiser: {
        select: {
          id: true,
          name: true,
          role: true,
          status: true,
          createdAt: true,
          advertiserProfile: {
            select: {
              displayName: true,
              agencyName: true,
              contactPhone: true,
              whatsappNumber: true,
              showPhone: true,
            },
          },
        },
      },
    },
  });
  if (!property) return null;
  const isPublic = property.status === "PUBLISHED" && property.advertiser.status === "ACTIVE";
  const privileged = viewer && (viewer.id === property.advertiserId || isAdmin(viewer));
  if (!isPublic && !privileged) return null;
  return { property, isPublic };
}

// ── Moderation ──────────────────────────────────────────────────────────────

export async function listModerationQueue(actor: Actor, status: ListingStatus = "PENDING_REVIEW") {
  assertAdmin(actor);
  return prisma.property.findMany({
    where: { status },
    orderBy: status === "PENDING_REVIEW" ? { submittedAt: "asc" } : { updatedAt: "desc" },
    take: 100,
    include: {
      advertiser: { select: { id: true, name: true, email: true, role: true, status: true } },
      images: { take: 1, orderBy: { sortOrder: "asc" } },
      _count: { select: { reports: true, images: true } },
    },
  });
}

export async function getListingForAdmin(actor: Actor, propertyId: string) {
  assertAdmin(actor);
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      charges: true,
      advertiser: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          phoneNumber: true,
          createdAt: true,
        },
      },
      reports: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, category: true, status: true, createdAt: true },
      },
      moderationActions: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { actor: { select: { name: true } } },
      },
      verificationRequests: { select: { id: true, type: true, status: true, decidedAt: true } },
    },
  });
  if (!property) throw notFound("Listing not found.");
  return property;
}

type ModerationDecision = "APPROVE" | "REJECT" | "SUSPEND" | "REINSTATE";

const TRANSITIONS: Record<
  ModerationDecision,
  {
    from: ListingStatus[];
    to: ListingStatus;
    action: "APPROVE_LISTING" | "REJECT_LISTING" | "SUSPEND_LISTING" | "REINSTATE_LISTING";
  }
> = {
  APPROVE: { from: ["PENDING_REVIEW"], to: "PUBLISHED", action: "APPROVE_LISTING" },
  REJECT: { from: ["PENDING_REVIEW"], to: "REJECTED", action: "REJECT_LISTING" },
  SUSPEND: { from: ["PUBLISHED", "PENDING_REVIEW"], to: "SUSPENDED", action: "SUSPEND_LISTING" },
  REINSTATE: { from: ["SUSPENDED"], to: "PUBLISHED", action: "REINSTATE_LISTING" },
};

export async function moderateListing(
  actor: Actor,
  propertyId: string,
  decision: ModerationDecision,
  reason: string,
) {
  assertAdmin(actor);
  const trimmedReason = reason.trim();
  if (decision !== "APPROVE" && trimmedReason.length < 5) {
    throw new AppError("VALIDATION", "Give the advertiser a clear reason (at least 5 characters).", {
      reason: ["Reason is required"],
    });
  }
  const t = TRANSITIONS[decision];
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: { advertiser: { select: { status: true } } },
  });
  if (!property) throw notFound("Listing not found.");
  if (property.advertiserId === actor.id) throw forbidden("You cannot moderate your own listing.");
  if (!t.from.includes(property.status))
    throw invalidState(`A ${property.status.toLowerCase()} listing cannot be ${decision.toLowerCase()}d.`);
  if (t.to === "PUBLISHED" && property.advertiser.status !== "ACTIVE")
    throw invalidState("The advertiser's account is not active.");
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    const res = await tx.property.updateMany({
      where: { id: propertyId, status: property.status },
      data: {
        status: t.to,
        reviewNote: decision === "APPROVE" ? null : trimmedReason,
        ...(t.to === "PUBLISHED" ? { publishedAt: property.publishedAt ?? now } : {}),
      },
    });
    if (res.count !== 1)
      throw invalidState("The listing changed while you were reviewing it. Please reload.");
    await tx.moderationAction.create({
      data: {
        actorId: actor.id,
        action: t.action,
        reason: trimmedReason || "Approved",
        propertyId,
        targetUserId: property.advertiserId,
      },
    });
    await writeAudit(tx, {
      actorId: actor.id,
      action: `listing.${decision.toLowerCase()}`,
      entityType: "Property",
      entityId: propertyId,
      metadata: { from: property.status, to: t.to, reason: trimmedReason },
    });
    const messages: Record<ModerationDecision, string> = {
      APPROVE: `Your listing "${property.title}" is now published.`,
      REJECT: `Your listing "${property.title}" was not approved: ${trimmedReason}`,
      SUSPEND: `Your listing "${property.title}" has been suspended: ${trimmedReason}`,
      REINSTATE: `Your listing "${property.title}" has been reinstated.`,
    };
    await notify(tx, {
      userId: property.advertiserId,
      type: `listing_${decision.toLowerCase()}`,
      title: "Listing review update",
      body: messages[decision],
      link: `/dashboard/listings/${propertyId}`,
      data: { listing: property.title, reason: trimmedReason || undefined },
      whatsapp:
        decision === "APPROVE"
          ? {
              template: "dalali_listing_published",
              params: [property.title, appLink(`/properties/${property.slug}`)],
            }
          : decision === "REJECT"
            ? {
                template: "dalali_listing_not_approved",
                params: [property.title, trimmedReason, appLink(`/dashboard/listings/${propertyId}`)],
              }
            : undefined,
    });
  });
}

/**
 * Review aid only: finds other listings that share a photo or look very similar.
 * A match is a prompt for a human to look closer, never proof of fraud.
 */
export async function findPossibleDuplicates(actor: Actor, propertyId: string) {
  assertAdmin(actor);
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: { images: { select: { sha256: true } } },
  });
  if (!property) throw notFound("Listing not found.");
  const hashes = property.images.map((i) => i.sha256);
  const [sharedPhoto, similar] = await Promise.all([
    hashes.length
      ? prisma.property.findMany({
          where: { id: { not: propertyId }, images: { some: { sha256: { in: hashes } } } },
          select: {
            id: true,
            title: true,
            slug: true,
            status: true,
            advertiserId: true,
            advertiser: { select: { name: true } },
          },
          take: 20,
        })
      : Promise.resolve([]),
    prisma.property.findMany({
      where: {
        id: { not: propertyId },
        district: { equals: property.district, mode: "insensitive" },
        neighborhood: { equals: property.neighborhood, mode: "insensitive" },
        bedrooms: property.bedrooms,
        rentAmount: { gte: Math.floor(property.rentAmount * 0.9), lte: Math.ceil(property.rentAmount * 1.1) },
        status: { notIn: ["ARCHIVED"] },
      },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        advertiserId: true,
        advertiser: { select: { name: true } },
      },
      take: 20,
    }),
  ]);
  const results = new Map<
    string,
    { property: (typeof similar)[number]; reasons: string[]; sameAdvertiser: boolean }
  >();
  for (const p of sharedPhoto) {
    results.set(p.id, {
      property: p,
      reasons: ["Shares at least one identical photo"],
      sameAdvertiser: p.advertiserId === property.advertiserId,
    });
  }
  for (const p of similar) {
    const entry = results.get(p.id) ?? {
      property: p,
      reasons: [],
      sameAdvertiser: p.advertiserId === property.advertiserId,
    };
    entry.reasons.push("Same neighbourhood, bedrooms and similar rent");
    results.set(p.id, entry);
  }
  return [...results.values()];
}
