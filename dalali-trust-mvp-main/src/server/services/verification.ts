import "server-only";
import type { EvidenceKind, VerificationStatus, VerificationType } from "@/generated/prisma/enums";
import { assertActive, assertAdmin, assertAdvertiser, isAdmin, type Actor } from "../actor";
import { writeAudit } from "../audit";
import { prisma } from "../db";
import { env } from "../env";
import { AppError, forbidden, invalidState, notFound } from "../errors";
import { enforceRateLimit, RATE_RULES } from "../rate-limit";
import { storage } from "../storage";
import {
  DOCUMENT_MAX_BYTES,
  fileToBuffer,
  MAX_EVIDENCE_FILES,
  newStorageKey,
  processEvidenceFile,
} from "../uploads";
import { EVIDENCE_KINDS } from "../validation";
import { notify } from "./notifications";

const OPEN: VerificationStatus[] = ["DRAFT", "PENDING_REVIEW", "MORE_INFO_REQUIRED"];
const APPLICANT_EDITABLE: VerificationStatus[] = ["DRAFT", "MORE_INFO_REQUIRED"];

/**
 * The default description of exactly what a reviewer checked. Reviewers can adjust the
 * wording, but a VERIFIED decision always records a scope statement.
 */
export const DEFAULT_SCOPE: Record<VerificationType, string> = {
  IDENTITY:
    "An Estate reviewer compared a government-issued photo ID and a selfie submitted by this account holder with the name on the account. This confirms who operates the account. It does not confirm ownership of any property.",
  ADVERTISER_ROLE:
    "An Estate reviewer examined documents indicating this person is authorised to let property as a landlord or agent (for example a management agreement or an owner's authorisation letter). The documents were not confirmed with any government registry.",
  PROPERTY_EVIDENCE:
    "An Estate reviewer examined documents and photos linking this advertiser to this specific property (for example a utility bill or the owner's authorisation). This is not a legal title search and does not prove legal ownership.",
};

export const ALLOWED_EVIDENCE: Record<VerificationType, EvidenceKind[]> = {
  IDENTITY: ["NATIONAL_ID", "PASSPORT", "DRIVING_LICENCE", "VOTER_ID", "SELFIE_WITH_ID"],
  ADVERTISER_ROLE: ["BUSINESS_LICENCE", "OWNER_AUTHORIZATION_LETTER", "MANAGEMENT_AGREEMENT", "OTHER"],
  PROPERTY_EVIDENCE: [
    "UTILITY_BILL",
    "OWNER_AUTHORIZATION_LETTER",
    "MANAGEMENT_AGREEMENT",
    "PROPERTY_OWNERSHIP_DOCUMENT",
    "PROPERTY_PHOTO",
    "OTHER",
  ],
};

/** Marks verifications past their expiry date as EXPIRED. Safe to run repeatedly (e.g. from a cron). */
export async function expireVerifications(now = new Date()): Promise<number> {
  const due = await prisma.verificationRequest.findMany({
    where: { status: "VERIFIED", expiresAt: { lte: now } },
    select: { id: true, subjectUserId: true, type: true },
  });
  for (const r of due) {
    await prisma.$transaction(async (tx) => {
      const res = await tx.verificationRequest.updateMany({
        where: { id: r.id, status: "VERIFIED" },
        data: { status: "EXPIRED" },
      });
      if (res.count !== 1) return;
      await writeAudit(tx, {
        actorId: null,
        action: "verification.expire",
        entityType: "VerificationRequest",
        entityId: r.id,
      });
      await notify(tx, {
        userId: r.subjectUserId,
        type: "verification_expired",
        title: "Verification expired",
        body: "One of your verification checks has expired. Please submit it again to keep your badge.",
        link: "/dashboard/verification",
        data: {},
      });
    });
  }
  return due.length;
}

export async function listMyVerifications(actor: Actor) {
  assertAdvertiser(actor);
  return prisma.verificationRequest.findMany({
    where: { subjectUserId: actor.id },
    orderBy: { createdAt: "desc" },
    include: {
      property: { select: { id: true, title: true } },
      evidence: {
        where: { purgedAt: null },
        select: { id: true, kind: true, mimeType: true, sizeBytes: true, createdAt: true },
      },
    },
  });
}

/** Opens (or returns the existing open) request of a type for the advertiser. */
export async function startVerification(actor: Actor, type: VerificationType, propertyId?: string) {
  assertAdvertiser(actor);
  if (type === "PROPERTY_EVIDENCE") {
    if (!propertyId) throw new AppError("VALIDATION", "Choose the listing this evidence is for.");
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { advertiserId: true },
    });
    if (!property || property.advertiserId !== actor.id) throw notFound("Listing not found.");
  } else if (propertyId) {
    throw new AppError("VALIDATION", "This check is not linked to a listing.");
  }
  const existing = await prisma.verificationRequest.findFirst({
    where: { subjectUserId: actor.id, type, propertyId: propertyId ?? null, status: { in: OPEN } },
  });
  if (existing) return existing;
  return prisma.$transaction(async (tx) => {
    const request = await tx.verificationRequest.create({
      data: { subjectUserId: actor.id, type, propertyId: propertyId ?? null, status: "DRAFT" },
    });
    await writeAudit(tx, {
      actorId: actor.id,
      action: "verification.start",
      entityType: "VerificationRequest",
      entityId: request.id,
      metadata: { type },
    });
    return request;
  });
}

async function loadOwnRequest(actor: Actor, requestId: string) {
  const request = await prisma.verificationRequest.findUnique({ where: { id: requestId } });
  if (!request || request.subjectUserId !== actor.id) throw notFound("Verification request not found.");
  return request;
}

export async function addEvidence(actor: Actor, requestId: string, kind: string, file: File) {
  assertAdvertiser(actor);
  await enforceRateLimit(prisma, `upload:${actor.id}`, RATE_RULES.upload);
  const request = await loadOwnRequest(actor, requestId);
  if (!APPLICANT_EDITABLE.includes(request.status))
    throw invalidState("Evidence can only be added before submission or when more information is requested.");
  if (
    !(EVIDENCE_KINDS as readonly string[]).includes(kind) ||
    !ALLOWED_EVIDENCE[request.type].includes(kind as EvidenceKind)
  ) {
    throw new AppError("VALIDATION", "Choose a document type that fits this check.");
  }
  const count = await prisma.verificationEvidence.count({ where: { requestId, purgedAt: null } });
  if (count >= MAX_EVIDENCE_FILES)
    throw new AppError("VALIDATION", `You can upload at most ${MAX_EVIDENCE_FILES} documents per check.`);
  const processed = await processEvidenceFile(await fileToBuffer(file, DOCUMENT_MAX_BYTES));
  const key = newStorageKey("evidence", processed.mimeType === "application/pdf" ? "pdf" : "jpg");
  await storage().put(key, processed.body, processed.mimeType);
  try {
    await prisma.$transaction(async (tx) => {
      const ev = await tx.verificationEvidence.create({
        data: {
          requestId,
          uploadedById: actor.id,
          kind: kind as EvidenceKind,
          storageKey: key,
          mimeType: processed.mimeType,
          sizeBytes: processed.body.length,
          sha256: processed.sha256,
        },
      });
      // Never log file names or contents — only the fact of the upload.
      await writeAudit(tx, {
        actorId: actor.id,
        action: "verification.evidence.add",
        entityType: "VerificationEvidence",
        entityId: ev.id,
        metadata: { kind },
      });
    });
  } catch (e) {
    await storage()
      .delete(key)
      .catch(() => undefined);
    throw e;
  }
}

export async function removeEvidence(actor: Actor, evidenceId: string) {
  assertAdvertiser(actor);
  const ev = await prisma.verificationEvidence.findUnique({
    where: { id: evidenceId },
    include: { request: true },
  });
  if (!ev || ev.request.subjectUserId !== actor.id) throw notFound("Document not found.");
  if (!APPLICANT_EDITABLE.includes(ev.request.status))
    throw invalidState("Submitted documents cannot be removed while under review.");
  await prisma.$transaction(async (tx) => {
    await tx.verificationEvidence.delete({ where: { id: evidenceId } });
    await writeAudit(tx, {
      actorId: actor.id,
      action: "verification.evidence.remove",
      entityType: "VerificationEvidence",
      entityId: evidenceId,
    });
  });
  await storage()
    .delete(ev.storageKey)
    .catch(() => undefined);
}

export async function submitVerification(actor: Actor, requestId: string, note?: string) {
  assertAdvertiser(actor);
  await enforceRateLimit(prisma, `verify-submit:${actor.id}`, RATE_RULES.verificationSubmit);
  const request = await loadOwnRequest(actor, requestId);
  if (!APPLICANT_EDITABLE.includes(request.status))
    throw invalidState("This request has already been submitted.");
  const count = await prisma.verificationEvidence.count({ where: { requestId, purgedAt: null } });
  if (count < 1) throw new AppError("VALIDATION", "Upload at least one document before submitting.");
  await prisma.$transaction(async (tx) => {
    const res = await tx.verificationRequest.updateMany({
      where: { id: requestId, status: request.status },
      data: {
        status: "PENDING_REVIEW",
        submittedAt: new Date(),
        applicantNote: note?.trim().slice(0, 1000) || null,
      },
    });
    if (res.count !== 1) throw invalidState("This request changed. Please refresh.");
    await writeAudit(tx, {
      actorId: actor.id,
      action: "verification.submit",
      entityType: "VerificationRequest",
      entityId: requestId,
    });
  });
}

// ── Reviewer ────────────────────────────────────────────────────────────────

export async function listVerificationQueue(actor: Actor, status: VerificationStatus = "PENDING_REVIEW") {
  assertAdmin(actor);
  return prisma.verificationRequest.findMany({
    where: { status },
    orderBy: { submittedAt: "asc" },
    take: 100,
    include: {
      subjectUser: { select: { id: true, name: true, email: true, role: true } },
      property: { select: { id: true, title: true } },
      _count: { select: { evidence: true } },
    },
  });
}

export async function getVerificationForReview(actor: Actor, requestId: string) {
  assertAdmin(actor);
  const request = await prisma.verificationRequest.findUnique({
    where: { id: requestId },
    include: {
      subjectUser: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          phoneNumber: true,
          createdAt: true,
          status: true,
        },
      },
      property: {
        select: { id: true, title: true, slug: true, region: true, district: true, neighborhood: true },
      },
      reviewer: { select: { name: true } },
      evidence: { orderBy: { createdAt: "asc" } },
      moderationActions: { orderBy: { createdAt: "desc" }, include: { actor: { select: { name: true } } } },
    },
  });
  if (!request) throw notFound("Verification request not found.");
  return request;
}

export type VerificationDecision = "VERIFY" | "REJECT" | "REQUEST_INFO";

export async function decideVerification(
  actor: Actor,
  requestId: string,
  decision: VerificationDecision,
  input: { reason: string; scopeStatement?: string },
) {
  assertAdmin(actor);
  const reason = input.reason.trim();
  if (reason.length < 5)
    throw new AppError("VALIDATION", "Record the reason for this decision.", {
      reason: ["Reason is required"],
    });
  const request = await prisma.verificationRequest.findUnique({ where: { id: requestId } });
  if (!request) throw notFound("Verification request not found.");
  if (request.subjectUserId === actor.id) throw forbidden("You cannot review your own verification.");
  if (request.status !== "PENDING_REVIEW")
    throw invalidState("Only requests awaiting review can be decided.");
  const evidenceCount = await prisma.verificationEvidence.count({ where: { requestId, purgedAt: null } });
  if (decision === "VERIFY" && evidenceCount < 1) throw invalidState("There is no evidence on this request.");

  const now = new Date();
  const scope = decision === "VERIFY" ? input.scopeStatement?.trim() || DEFAULT_SCOPE[request.type] : null;
  const next: VerificationStatus =
    decision === "VERIFY" ? "VERIFIED" : decision === "REJECT" ? "REJECTED" : "MORE_INFO_REQUIRED";
  const expiresAt =
    decision === "VERIFY" ? new Date(now.getTime() + env().VERIFICATION_VALIDITY_DAYS * 86_400_000) : null;

  await prisma.$transaction(async (tx) => {
    const res = await tx.verificationRequest.updateMany({
      where: { id: requestId, status: "PENDING_REVIEW" },
      data: {
        status: next,
        reviewerId: actor.id,
        decisionReason: reason,
        scopeStatement: scope,
        decidedAt: decision === "REQUEST_INFO" ? null : now,
        expiresAt,
      },
    });
    if (res.count !== 1) throw invalidState("This request was changed by someone else. Please reload.");
    // A newer verification supersedes older verified ones of the same scope.
    if (decision === "VERIFY") {
      await tx.verificationRequest.updateMany({
        where: {
          id: { not: requestId },
          subjectUserId: request.subjectUserId,
          type: request.type,
          propertyId: request.propertyId,
          status: "VERIFIED",
        },
        data: { status: "EXPIRED" },
      });
    }
    await tx.moderationAction.create({
      data: {
        actorId: actor.id,
        action:
          decision === "VERIFY"
            ? "VERIFICATION_APPROVED"
            : decision === "REJECT"
              ? "VERIFICATION_REJECTED"
              : "VERIFICATION_INFO_REQUESTED",
        reason,
        verificationRequestId: requestId,
        targetUserId: request.subjectUserId,
        propertyId: request.propertyId,
      },
    });
    await writeAudit(tx, {
      actorId: actor.id,
      action: `verification.${decision.toLowerCase()}`,
      entityType: "VerificationRequest",
      entityId: requestId,
      metadata: { type: request.type, to: next },
    });
    const body =
      decision === "VERIFY"
        ? "Your verification was approved."
        : decision === "REJECT"
          ? `Your verification was not approved: ${reason}`
          : `More information is needed for your verification: ${reason}`;
    await notify(tx, {
      userId: request.subjectUserId,
      type: `verification_${next.toLowerCase()}`,
      title: "Verification update",
      body,
      link: "/dashboard/verification",
      data: { reason: reason || undefined },
    });
  });
}

/**
 * Authorises access to a private evidence file. Only administrators and the person who
 * submitted it may download it. Everyone else receives "not found".
 */
export async function getEvidenceForDownload(actor: Actor | null, evidenceId: string) {
  assertActive(actor);
  const ev = await prisma.verificationEvidence.findUnique({
    where: { id: evidenceId },
    include: { request: { select: { subjectUserId: true } } },
  });
  if (!ev || ev.purgedAt) throw notFound();
  if (!isAdmin(actor) && ev.request.subjectUserId !== actor.id) throw notFound();
  if (isAdmin(actor)) {
    await prisma.$transaction((tx) =>
      writeAudit(tx, {
        actorId: actor.id,
        action: "verification.evidence.view",
        entityType: "VerificationEvidence",
        entityId: ev.id,
      }),
    );
  }
  return { storageKey: ev.storageKey, mimeType: ev.mimeType };
}

/**
 * Data minimisation: deletes evidence files once a decision is old enough. The decision,
 * reviewer, scope and dates are kept; only the documents themselves are removed.
 * Open requests (draft / pending / more info) are never purged.
 */
export async function purgeDecidedEvidence(
  retentionDays = env().EVIDENCE_RETENTION_DAYS,
  now = new Date(),
): Promise<number> {
  const cutoff = new Date(now.getTime() - retentionDays * 86_400_000);
  const due = await prisma.verificationEvidence.findMany({
    where: {
      purgedAt: null,
      request: {
        status: { in: ["VERIFIED", "REJECTED", "EXPIRED"] },
        OR: [{ decidedAt: { lte: cutoff } }, { decidedAt: null, updatedAt: { lte: cutoff } }],
      },
    },
    select: { id: true, storageKey: true },
  });
  for (const ev of due) {
    await storage().delete(ev.storageKey);
    await prisma.$transaction(async (tx) => {
      await tx.verificationEvidence.update({ where: { id: ev.id }, data: { purgedAt: now } });
      await writeAudit(tx, {
        actorId: null,
        action: "verification.evidence.purge",
        entityType: "VerificationEvidence",
        entityId: ev.id,
      });
    });
  }
  return due.length;
}
