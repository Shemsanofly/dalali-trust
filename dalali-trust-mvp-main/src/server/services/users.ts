import "server-only";
import type { Role } from "@/generated/prisma/enums";
import { assertActive, assertAdmin, assertAdvertiser, type Actor } from "../actor";
import { writeAudit } from "../audit";
import { prisma } from "../db";
import { AppError, forbidden, invalidState, notFound } from "../errors";
import { enforceRateLimit, RATE_RULES } from "../rate-limit";
import { ogImageKey } from "../og-image";
import { storage } from "../storage";
import {
  advertiserProfileSchema,
  feedbackSchema,
  parseOrThrow,
  profileSchema,
  SELF_SERVICE_ROLES,
} from "../validation";
import { track } from "./analytics";
import { publicListingWhere } from "./listings";

// ── Saved properties ────────────────────────────────────────────────────────

export async function toggleSaved(actor: Actor, propertyId: string): Promise<boolean> {
  assertActive(actor);
  const key = { userId_propertyId: { userId: actor.id, propertyId } };
  const existing = await prisma.savedProperty.findUnique({ where: key });
  if (existing) {
    await prisma.savedProperty.delete({ where: key });
    return false;
  }
  const property = await prisma.property.findFirst({
    where: { id: propertyId, ...publicListingWhere() },
    select: { id: true },
  });
  if (!property) throw notFound("Listing not found.");
  await prisma.savedProperty.upsert({ where: key, create: { userId: actor.id, propertyId }, update: {} });
  await track("listing_saved", propertyId);
  return true;
}

export async function listSaved(actor: Actor) {
  assertActive(actor);
  return prisma.savedProperty.findMany({
    where: { userId: actor.id },
    orderBy: { createdAt: "desc" },
    include: {
      property: {
        select: {
          id: true,
          slug: true,
          title: true,
          status: true,
          neighborhood: true,
          district: true,
          region: true,
          rentAmount: true,
          bedrooms: true,
          availabilityStatus: true,
          images: { take: 1, orderBy: { sortOrder: "asc" }, select: { id: true } },
        },
      },
    },
  });
}

export async function savedIds(actor: Actor | null, propertyIds: string[]): Promise<Set<string>> {
  if (!actor || propertyIds.length === 0) return new Set();
  const rows = await prisma.savedProperty.findMany({
    where: { userId: actor.id, propertyId: { in: propertyIds } },
    select: { propertyId: true },
  });
  return new Set(rows.map((r) => r.propertyId));
}

// ── Profiles ────────────────────────────────────────────────────────────────

export async function getMyAccount(actor: Actor) {
  assertActive(actor);
  return prisma.user.findUniqueOrThrow({
    where: { id: actor.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phoneNumber: true,
      locale: true,
      whatsappUpdates: true,
      smsUpdates: true,
      createdAt: true,
      advertiserProfile: true,
    },
  });
}

export async function updateProfile(actor: Actor, raw: unknown) {
  assertActive(actor);
  // Only name, phone and language are accepted; role/status/email cannot be set here.
  const input = parseOrThrow(profileSchema, raw);
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: actor.id },
      data: {
        name: input.name,
        phoneNumber: input.phoneNumber ?? null,
        locale: input.locale,
        ...(input.whatsappUpdates === undefined ? {} : { whatsappUpdates: input.whatsappUpdates }),
        ...(input.smsUpdates === undefined ? {} : { smsUpdates: input.smsUpdates }),
      },
    });
    await writeAudit(tx, {
      actorId: actor.id,
      action: "user.profile.update",
      entityType: "User",
      entityId: actor.id,
    });
  });
}

export async function upsertAdvertiserProfile(actor: Actor, raw: unknown) {
  assertAdvertiser(actor);
  const input = parseOrThrow(advertiserProfileSchema, raw);
  const data = {
    displayName: input.displayName,
    bio: input.bio ?? null,
    agencyName: input.agencyName ?? null,
    serviceRegions: input.serviceRegions,
    contactPhone: input.contactPhone ?? null,
    whatsappNumber: input.whatsappNumber ?? null,
    showPhone: input.showPhone,
  };
  await prisma.$transaction(async (tx) => {
    await tx.advertiserProfile.upsert({
      where: { userId: actor.id },
      create: { userId: actor.id, ...data },
      update: data,
    });
    await writeAudit(tx, {
      actorId: actor.id,
      action: "advertiser.profile.update",
      entityType: "AdvertiserProfile",
      entityId: actor.id,
    });
  });
}

/** Applies the role chosen at sign-up. Only self-service roles are accepted; ADMIN never is. */
export async function setInitialRole(
  userId: string,
  role: string,
  phoneNumber?: string,
  extra: { locale?: "en" | "sw"; whatsappUpdates?: boolean; smsUpdates?: boolean } = {},
) {
  if (!(SELF_SERVICE_ROLES as readonly string[]).includes(role)) throw forbidden();
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { role: true, createdAt: true, name: true },
    });
    if (!user) throw notFound();
    // Only applies to brand-new tenant accounts, so it cannot be replayed to change roles later.
    if (user.role !== "TENANT" || Date.now() - user.createdAt.getTime() > 10 * 60 * 1000) throw forbidden();
    await tx.user.update({
      where: { id: userId },
      data: {
        role: role as Role,
        phoneNumber: phoneNumber ?? null,
        locale: extra.locale ?? "en",
        whatsappUpdates: Boolean(extra.whatsappUpdates && phoneNumber),
        smsUpdates: Boolean(extra.smsUpdates && phoneNumber),
      },
    });
    if (role === "LANDLORD" || role === "AGENT") {
      await tx.advertiserProfile.upsert({
        where: { userId },
        create: { userId, displayName: user.name, contactPhone: phoneNumber ?? null },
        update: {},
      });
    }
    await writeAudit(tx, {
      actorId: userId,
      action: "user.signup",
      entityType: "User",
      entityId: userId,
      metadata: { role },
    });
  });
  await track("signup_completed");
}

/**
 * Account deletion: personal data is removed or anonymised; records needed for safety
 * and audit (moderation decisions, reports) are kept without identifying details.
 */
export async function deleteMyAccount(actor: Actor, confirmEmail: string) {
  assertActive(actor);
  if (confirmEmail.trim().toLowerCase() !== actor.email.toLowerCase()) {
    throw new AppError("VALIDATION", "Type your email address exactly to confirm.", {
      confirmEmail: ["Email does not match"],
    });
  }
  if (actor.role === "ADMIN") {
    const otherAdmins = await prisma.user.count({
      where: { role: "ADMIN", status: "ACTIVE", id: { not: actor.id } },
    });
    if (otherAdmins === 0)
      throw invalidState("You are the only administrator. Promote another administrator first.");
  }
  const [evidence, reportEvidence, images] = await Promise.all([
    prisma.verificationEvidence.findMany({
      where: { request: { subjectUserId: actor.id }, purgedAt: null },
      select: { storageKey: true },
    }),
    prisma.reportEvidence.findMany({
      where: { uploadedById: actor.id, purgedAt: null },
      select: { storageKey: true },
    }),
    prisma.propertyImage.findMany({
      where: { property: { advertiserId: actor.id } },
      select: { storageKey: true, thumbKey: true },
    }),
  ]);
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.verificationEvidence.updateMany({
      where: { request: { subjectUserId: actor.id } },
      data: { purgedAt: now },
    });
    await tx.reportEvidence.updateMany({ where: { uploadedById: actor.id }, data: { purgedAt: now } });
    await tx.propertyImage.deleteMany({ where: { property: { advertiserId: actor.id } } });
    await tx.property.updateMany({
      where: { advertiserId: actor.id },
      data: {
        status: "ARCHIVED",
        archivedAt: now,
        contactPhone: null,
        contactWhatsapp: null,
        streetAddress: null,
      },
    });
    await tx.savedProperty.deleteMany({ where: { userId: actor.id } });
    await tx.notification.deleteMany({ where: { userId: actor.id } });
    await tx.advertiserProfile.deleteMany({ where: { userId: actor.id } });
    await tx.viewingRequest.updateMany({
      where: { requesterId: actor.id, status: { in: ["PENDING", "ACCEPTED"] } },
      data: { status: "CANCELLED" },
    });
    await tx.viewingRequest.updateMany({
      where: { requesterId: actor.id },
      data: { contactPhone: null, message: null },
    });
    await tx.session.deleteMany({ where: { userId: actor.id } });
    await tx.account.deleteMany({ where: { userId: actor.id } });
    await tx.user.update({
      where: { id: actor.id },
      data: {
        status: "DELETED",
        deletedAt: now,
        name: "Deleted user",
        email: `deleted+${actor.id}@deleted.invalid`,
        phoneNumber: null,
        image: null,
        emailVerified: false,
      },
    });
    await writeAudit(tx, {
      actorId: actor.id,
      action: "user.delete",
      entityType: "User",
      entityId: actor.id,
    });
  });
  const store = storage();
  await Promise.allSettled([
    ...evidence.map((e) => store.delete(e.storageKey)),
    ...reportEvidence.map((e) => store.delete(e.storageKey)),
    ...images.flatMap((i) => [
      store.delete(i.storageKey),
      store.delete(i.thumbKey),
      store.delete(ogImageKey(i.storageKey)),
    ]),
  ]);
}

// ── Administration ──────────────────────────────────────────────────────────

export async function listUsers(actor: Actor, opts: { q?: string; role?: Role; page?: number } = {}) {
  assertAdmin(actor);
  const q = opts.q?.trim().slice(0, 80);
  const where = {
    status: { not: "DELETED" as const },
    ...(opts.role ? { role: opts.role } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const page = Math.max(1, opts.page ?? 1);
  const [total, users] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * 25,
      take: 25,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        _count: { select: { properties: true, reportsAgainst: true } },
      },
    }),
  ]);
  return { total, users, page, pageCount: Math.max(1, Math.ceil(total / 25)) };
}

export async function getUserForAdmin(actor: Actor, userId: string) {
  assertAdmin(actor);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      phoneNumber: true,
      suspendedReason: true,
      suspendedAt: true,
      createdAt: true,
      advertiserProfile: true,
      properties: {
        select: { id: true, title: true, status: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      verificationRequests: {
        select: { id: true, type: true, status: true, decidedAt: true, expiresAt: true },
        orderBy: { createdAt: "desc" },
      },
      reportsAgainst: {
        select: { id: true, category: true, status: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      reportsFiled: {
        select: { id: true, category: true, status: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      moderationTargets: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { actor: { select: { name: true } } },
      },
    },
  });
  if (!user) throw notFound("User not found.");
  return user;
}

export async function changeUserRole(actor: Actor, userId: string, role: Role, reason: string) {
  assertAdmin(actor);
  if (userId === actor.id) throw forbidden("You cannot change your own role.");
  if (!["TENANT", "LANDLORD", "AGENT", "ADMIN"].includes(role))
    throw new AppError("VALIDATION", "Invalid role.");
  if (reason.trim().length < 5)
    throw new AppError("VALIDATION", "Record why the role is changing.", { reason: ["Reason is required"] });
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, status: true, name: true },
  });
  if (!user || user.status === "DELETED") throw notFound("User not found.");
  if (user.role === role) return;
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { role } });
    if (role === "LANDLORD" || role === "AGENT") {
      await tx.advertiserProfile.upsert({
        where: { userId },
        create: { userId, displayName: user.name },
        update: {},
      });
    }
    // Force re-authentication so the new privileges are picked up cleanly.
    await tx.session.deleteMany({ where: { userId } });
    await tx.moderationAction.create({
      data: {
        actorId: actor.id,
        action: "CHANGE_ROLE",
        reason: `${user.role} → ${role}: ${reason.trim()}`,
        targetUserId: userId,
      },
    });
    await writeAudit(tx, {
      actorId: actor.id,
      action: "user.role.change",
      entityType: "User",
      entityId: userId,
      metadata: { from: user.role, to: role },
    });
  });
}

export async function setUserSuspended(actor: Actor, userId: string, suspended: boolean, reason: string) {
  assertAdmin(actor);
  if (userId === actor.id) throw forbidden("You cannot suspend yourself.");
  if (reason.trim().length < 5)
    throw new AppError("VALIDATION", "Record a reason.", { reason: ["Reason is required"] });
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { status: true } });
  if (!user || user.status === "DELETED") throw notFound("User not found.");
  if (suspended && user.status !== "ACTIVE") throw invalidState("This account is not active.");
  if (!suspended && user.status !== "SUSPENDED") throw invalidState("This account is not suspended.");
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: suspended
        ? { status: "SUSPENDED", suspendedAt: new Date(), suspendedReason: reason.trim() }
        : { status: "ACTIVE", suspendedAt: null, suspendedReason: null },
    });
    if (suspended) await tx.session.deleteMany({ where: { userId } });
    await tx.moderationAction.create({
      data: {
        actorId: actor.id,
        action: suspended ? "SUSPEND_USER" : "REINSTATE_USER",
        reason: reason.trim(),
        targetUserId: userId,
      },
    });
    await writeAudit(tx, {
      actorId: actor.id,
      action: suspended ? "user.suspend" : "user.reinstate",
      entityType: "User",
      entityId: userId,
      metadata: { reason: reason.trim() },
    });
  });
}

export async function listAuditLog(actor: Actor, opts: { page?: number; entityType?: string } = {}) {
  assertAdmin(actor);
  const page = Math.max(1, opts.page ?? 1);
  const where = opts.entityType ? { entityType: opts.entityType } : {};
  const [total, entries] = await prisma.$transaction([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * 50,
      take: 50,
      include: { actor: { select: { name: true, email: true } } },
    }),
  ]);
  return { total, entries, page, pageCount: Math.max(1, Math.ceil(total / 50)) };
}

export async function adminMetrics(actor: Actor) {
  assertAdmin(actor);
  const since = new Date(Date.now() - 30 * 86_400_000);
  const [
    usersByRole,
    listingsByStatus,
    pendingVerifications,
    openReports,
    viewings30,
    newUsers30,
    events30,
    feedback30,
  ] = await Promise.all([
    prisma.user.groupBy({ by: ["role"], where: { status: { not: "DELETED" } }, _count: { _all: true } }),
    prisma.property.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.verificationRequest.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.report.count({
      where: { status: { in: ["SUBMITTED", "UNDER_REVIEW", "INFO_REQUESTED", "APPEALED"] } },
    }),
    prisma.viewingRequest.count({ where: { createdAt: { gte: since } } }),
    prisma.user.count({ where: { createdAt: { gte: since } } }),
    prisma.analyticsEvent.groupBy({
      by: ["name"],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
    }),
    prisma.feedback.count({ where: { createdAt: { gte: since } } }),
  ]);
  return {
    usersByRole,
    listingsByStatus,
    pendingVerifications,
    openReports,
    viewings30,
    newUsers30,
    events30,
    feedback30,
  };
}

// ── Feedback & contact ──────────────────────────────────────────────────────

export async function submitFeedback(actor: Actor | null, raw: unknown, clientKey: string) {
  await enforceRateLimit(prisma, `feedback:${actor?.id ?? clientKey}`, RATE_RULES.feedback);
  const input = parseOrThrow(feedbackSchema, raw);
  await prisma.feedback.create({
    data: {
      kind: input.kind,
      userId: actor?.id ?? null,
      name: input.name ?? null,
      email: input.email ?? null,
      message: input.message,
      page: input.page ?? null,
    },
  });
}

export async function listFeedback(actor: Actor) {
  assertAdmin(actor);
  return prisma.feedback.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { name: true, role: true } } },
  });
}
