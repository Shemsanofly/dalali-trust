import "server-only";
import { assertActive, assertAdvertiser, type Actor } from "../actor";
import { writeAudit } from "../audit";
import { prisma } from "../db";
import { AppError, invalidState, notFound } from "../errors";
import { enforceRateLimit, RATE_RULES } from "../rate-limit";
import { parseOrThrow, viewingInputSchema } from "../validation";
import { track } from "./analytics";
import { publicListingWhere } from "./listings";
import { formatEatNumeric } from "@/lib/dates";
import { appLink } from "../whatsapp";
import { notify } from "./notifications";

const MIN_LEAD_MS = 60 * 60 * 1000; // at least 1 hour ahead
const MAX_LEAD_MS = 90 * 86_400_000; // at most 90 days ahead

export async function createViewingRequest(actor: Actor, raw: unknown) {
  assertActive(actor);
  await enforceRateLimit(prisma, `viewing:${actor.id}`, RATE_RULES.viewingRequest);
  const input = parseOrThrow(viewingInputSchema, raw);
  const now = Date.now();
  const t = input.proposedAt.getTime();
  if (t < now + MIN_LEAD_MS || t > now + MAX_LEAD_MS) {
    throw new AppError("VALIDATION", "Choose a time between 1 hour and 90 days from now.", {
      proposedAt: ["Invalid time"],
    });
  }
  const property = await prisma.property.findFirst({
    where: { id: input.propertyId, ...publicListingWhere() },
    select: { id: true, title: true, advertiserId: true },
  });
  if (!property) throw notFound("Listing not found.");
  if (property.advertiserId === actor.id)
    throw new AppError("VALIDATION", "You cannot request a viewing of your own listing.");
  const existing = await prisma.viewingRequest.findFirst({
    where: { propertyId: property.id, requesterId: actor.id, status: { in: ["PENDING", "ACCEPTED"] } },
    select: { id: true },
  });
  if (existing)
    throw new AppError("CONFLICT", "You already have an active viewing request for this property.");

  const request = await prisma.$transaction(async (tx) => {
    const vr = await tx.viewingRequest.create({
      data: {
        propertyId: property.id,
        requesterId: actor.id,
        advertiserId: property.advertiserId,
        proposedAt: input.proposedAt,
        message: input.message ?? null,
        contactPhone: input.contactPhone ?? null,
      },
    });
    await writeAudit(tx, {
      actorId: actor.id,
      action: "viewing.create",
      entityType: "ViewingRequest",
      entityId: vr.id,
    });
    await notify(tx, {
      userId: property.advertiserId,
      type: "viewing_requested",
      title: "New viewing request",
      body: `Someone asked to view "${property.title}".`,
      link: "/dashboard/viewings",
      whatsapp: {
        template: "dalali_viewing_requested",
        params: [property.title, formatEatNumeric(input.proposedAt), appLink("/dashboard/viewings")],
      },
    });
    return vr;
  });
  await track("viewing_requested", property.id);
  return request;
}

const requestSelect = {
  id: true,
  proposedAt: true,
  message: true,
  status: true,
  responseMessage: true,
  respondedAt: true,
  createdAt: true,
  property: { select: { id: true, title: true, slug: true, neighborhood: true, district: true } },
} as const;

export async function listMyViewingRequests(actor: Actor) {
  assertActive(actor);
  return prisma.viewingRequest.findMany({
    where: { requesterId: actor.id },
    orderBy: { createdAt: "desc" },
    select: { ...requestSelect, advertiser: { select: { name: true } } },
  });
}

/** Requests received by an advertiser. Requester contact details are only shared with that advertiser. */
export async function listReceivedViewingRequests(actor: Actor) {
  assertAdvertiser(actor);
  return prisma.viewingRequest.findMany({
    where: { advertiserId: actor.id },
    orderBy: [{ status: "asc" }, { proposedAt: "asc" }],
    select: {
      ...requestSelect,
      contactPhone: true,
      requester: { select: { name: true, phoneNumber: true } },
    },
  });
}

export async function respondToViewing(
  actor: Actor,
  requestId: string,
  decision: "ACCEPT" | "DECLINE" | "COMPLETE",
  message?: string,
) {
  assertAdvertiser(actor);
  const vr = await prisma.viewingRequest.findUnique({
    where: { id: requestId },
    include: { property: { select: { title: true } } },
  });
  if (!vr || vr.advertiserId !== actor.id) throw notFound("Viewing request not found.");
  const allowedFrom = decision === "COMPLETE" ? ["ACCEPTED"] : ["PENDING"];
  if (!allowedFrom.includes(vr.status)) throw invalidState("This request can no longer be changed.");
  const next = decision === "ACCEPT" ? "ACCEPTED" : decision === "DECLINE" ? "DECLINED" : "COMPLETED";
  const responseMessage = message?.trim().slice(0, 1000) || null;
  await prisma.$transaction(async (tx) => {
    const res = await tx.viewingRequest.updateMany({
      where: { id: requestId, status: vr.status },
      data: { status: next, respondedAt: new Date(), ...(responseMessage ? { responseMessage } : {}) },
    });
    if (res.count !== 1) throw invalidState("This request changed. Please refresh.");
    await writeAudit(tx, {
      actorId: actor.id,
      action: `viewing.${decision.toLowerCase()}`,
      entityType: "ViewingRequest",
      entityId: requestId,
    });
    if (decision !== "COMPLETE") {
      await notify(tx, {
        userId: vr.requesterId,
        type: `viewing_${next.toLowerCase()}`,
        title: "Viewing request update",
        body: `Your viewing request for "${vr.property.title}" was ${next.toLowerCase()}.${responseMessage ? ` Message: ${responseMessage}` : ""}`,
        link: "/dashboard/viewings",
        whatsapp:
          next === "ACCEPTED"
            ? {
                template: "dalali_viewing_accepted",
                params: [vr.property.title, formatEatNumeric(vr.proposedAt), appLink("/dashboard/viewings")],
              }
            : { template: "dalali_viewing_declined", params: [vr.property.title, appLink("/properties")] },
      });
    }
  });
}

export async function cancelViewing(actor: Actor, requestId: string) {
  assertActive(actor);
  const vr = await prisma.viewingRequest.findUnique({
    where: { id: requestId },
    include: { property: { select: { title: true } } },
  });
  if (!vr || vr.requesterId !== actor.id) throw notFound("Viewing request not found.");
  if (!["PENDING", "ACCEPTED"].includes(vr.status))
    throw invalidState("This request can no longer be cancelled.");
  await prisma.$transaction(async (tx) => {
    await tx.viewingRequest.update({ where: { id: requestId }, data: { status: "CANCELLED" } });
    await writeAudit(tx, {
      actorId: actor.id,
      action: "viewing.cancel",
      entityType: "ViewingRequest",
      entityId: requestId,
    });
    await notify(tx, {
      userId: vr.advertiserId,
      type: "viewing_cancelled",
      title: "Viewing cancelled",
      body: `A viewing request for "${vr.property.title}" was cancelled by the tenant.`,
      link: "/dashboard/viewings",
    });
  });
}
