import "server-only";
import type { ReportStatus } from "@/generated/prisma/enums";
import { assertActive, assertAdmin, isAdmin, type Actor } from "../actor";
import { writeAudit } from "../audit";
import { prisma } from "../db";
import { AppError, invalidState, notFound } from "../errors";
import { enforceRateLimit, RATE_RULES } from "../rate-limit";
import { storage } from "../storage";
import { DOCUMENT_MAX_BYTES, fileToBuffer, newStorageKey, processEvidenceFile } from "../uploads";
import { parseOrThrow, reportInputSchema } from "../validation";
import { track } from "./analytics";
import { notify } from "./notifications";

const OPEN_STATUSES: ReportStatus[] = ["SUBMITTED", "UNDER_REVIEW", "INFO_REQUESTED", "APPEALED"];
export const MAX_REPORT_FILES = 4;

export async function createReport(actor: Actor, raw: unknown, files: File[] = []) {
  assertActive(actor);
  await enforceRateLimit(prisma, `report:${actor.id}`, RATE_RULES.report);
  const input = parseOrThrow(reportInputSchema, raw);
  if (files.length > MAX_REPORT_FILES)
    throw new AppError("VALIDATION", `Attach at most ${MAX_REPORT_FILES} files.`);

  let subjectUserId = input.subjectUserId ?? null;
  if (input.propertyId) {
    const property = await prisma.property.findUnique({
      where: { id: input.propertyId },
      select: { advertiserId: true, status: true },
    });
    if (!property || property.status === "DRAFT") throw notFound("Listing not found.");
    if (property.advertiserId === actor.id)
      throw new AppError("VALIDATION", "You cannot report your own listing.");
    subjectUserId = property.advertiserId;
  } else if (subjectUserId) {
    const user = await prisma.user.findUnique({
      where: { id: subjectUserId },
      select: { id: true, status: true },
    });
    if (!user || user.status === "DELETED") throw notFound("Account not found.");
    if (user.id === actor.id) throw new AppError("VALIDATION", "You cannot report yourself.");
  }

  // One open report per reporter and target — prevents report flooding.
  const duplicate = await prisma.report.findFirst({
    where: {
      reporterId: actor.id,
      status: { in: OPEN_STATUSES },
      ...(input.propertyId ? { propertyId: input.propertyId } : { subjectUserId, propertyId: null }),
    },
    select: { id: true },
  });
  if (duplicate)
    throw new AppError(
      "CONFLICT",
      "You already have an open report about this. You can add details to it from your dashboard.",
    );

  const processed: Awaited<ReturnType<typeof processEvidenceFile>>[] = [];
  for (const f of files) processed.push(await processEvidenceFile(await fileToBuffer(f, DOCUMENT_MAX_BYTES)));
  const keys: string[] = [];
  try {
    for (const p of processed) {
      const key = newStorageKey("reports", p.mimeType === "application/pdf" ? "pdf" : "jpg");
      await storage().put(key, p.body, p.mimeType);
      keys.push(key);
    }
    const report = await prisma.$transaction(async (tx) => {
      const r = await tx.report.create({
        data: {
          reporterId: actor.id,
          propertyId: input.propertyId ?? null,
          subjectUserId,
          category: input.category,
          description: input.description,
          evidence: {
            create: processed.map((p, i) => ({
              uploadedById: actor.id,
              storageKey: keys[i]!,
              mimeType: p.mimeType,
              sizeBytes: p.body.length,
              sha256: p.sha256,
            })),
          },
        },
      });
      await writeAudit(tx, {
        actorId: actor.id,
        action: "report.create",
        entityType: "Report",
        entityId: r.id,
        metadata: { category: input.category },
      });
      return r;
    });
    await track("report_submitted", input.propertyId);
    return report;
  } catch (e) {
    await Promise.allSettled(keys.map((k) => storage().delete(k)));
    throw e;
  }
}

/** Reporter's own reports. Internal moderator notes are never selected. */
export async function listMyReports(actor: Actor) {
  assertActive(actor);
  return prisma.report.findMany({
    where: { reporterId: actor.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      category: true,
      description: true,
      status: true,
      publicResponse: true,
      appealNote: true,
      appealedAt: true,
      resolvedAt: true,
      createdAt: true,
      updatedAt: true,
      property: { select: { title: true, slug: true } },
    },
  });
}

/** Reporter answers an information request; the report goes back to review. */
export async function addReportInformation(actor: Actor, reportId: string, text: string) {
  assertActive(actor);
  const info = text.trim();
  if (info.length < 5 || info.length > 2000)
    throw new AppError("VALIDATION", "Add between 5 and 2000 characters.");
  const report = await prisma.report.findUnique({ where: { id: reportId } });
  if (!report || report.reporterId !== actor.id) throw notFound("Report not found.");
  if (report.status !== "INFO_REQUESTED")
    throw invalidState("More information was not requested for this report.");
  const stamped =
    `${report.description}\n\n--- Additional information (${new Date().toISOString()}) ---\n${info}`.slice(
      0,
      8000,
    );
  await prisma.$transaction(async (tx) => {
    await tx.report.update({
      where: { id: reportId },
      data: { description: stamped, status: "UNDER_REVIEW" },
    });
    await writeAudit(tx, {
      actorId: actor.id,
      action: "report.info_added",
      entityType: "Report",
      entityId: reportId,
    });
  });
}

/**
 * Appeals are allowed once: by the reporter when a report is dismissed, or by the reported
 * advertiser when action was taken against them.
 */
export async function appealReport(actor: Actor, reportId: string, note: string) {
  assertActive(actor);
  const text = note.trim();
  if (text.length < 10 || text.length > 2000)
    throw new AppError("VALIDATION", "Explain your appeal in 10–2000 characters.");
  const report = await prisma.report.findUnique({ where: { id: reportId } });
  if (!report) throw notFound("Report not found.");
  const isReporter = report.reporterId === actor.id;
  const isSubject = report.subjectUserId === actor.id;
  if (!isReporter && !isSubject) throw notFound("Report not found.");
  if (report.appealedAt) throw invalidState("This report has already been appealed.");
  if (
    (isReporter && report.status !== "DISMISSED") ||
    (isSubject && !isReporter && report.status !== "ACTION_TAKEN")
  ) {
    throw invalidState("This report cannot be appealed.");
  }
  await prisma.$transaction(async (tx) => {
    await tx.report.update({
      where: { id: reportId },
      data: { status: "APPEALED", appealNote: text, appealedAt: new Date(), resolvedAt: null },
    });
    await writeAudit(tx, {
      actorId: actor.id,
      action: "report.appeal",
      entityType: "Report",
      entityId: reportId,
      metadata: { by: isReporter ? "reporter" : "subject" },
    });
  });
}

/** Moderation actions on the reported advertiser's listings, visible to them for appeal. */
export async function listReportsAgainstMe(actor: Actor) {
  assertActive(actor);
  return prisma.report.findMany({
    where: { subjectUserId: actor.id, status: { in: ["ACTION_TAKEN", "APPEALED"] } },
    orderBy: { updatedAt: "desc" },
    // The reporter's identity and description are deliberately not exposed to the reported party.
    select: {
      id: true,
      category: true,
      status: true,
      publicResponse: true,
      appealedAt: true,
      updatedAt: true,
      property: { select: { title: true } },
    },
  });
}

// ── Administration ──────────────────────────────────────────────────────────

export async function listReportsForAdmin(actor: Actor, status?: ReportStatus) {
  assertAdmin(actor);
  return prisma.report.findMany({
    where: status ? { status } : { status: { in: OPEN_STATUSES } },
    orderBy: { createdAt: "asc" },
    take: 100,
    include: {
      reporter: { select: { id: true, name: true } },
      property: { select: { id: true, title: true, status: true } },
      subjectUser: { select: { id: true, name: true } },
      _count: { select: { evidence: true } },
    },
  });
}

export async function getReportForAdmin(actor: Actor, reportId: string) {
  assertAdmin(actor);
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: {
      reporter: { select: { id: true, name: true, email: true, createdAt: true } },
      property: { select: { id: true, title: true, slug: true, status: true, advertiserId: true } },
      subjectUser: { select: { id: true, name: true, email: true, status: true, role: true } },
      assignedTo: { select: { name: true } },
      evidence: { where: { purgedAt: null } },
      moderationActions: { orderBy: { createdAt: "desc" }, include: { actor: { select: { name: true } } } },
    },
  });
  if (!report) throw notFound("Report not found.");
  // Reporter history helps moderators spot retaliatory or bulk reporting.
  const reporterHistory = await prisma.report.groupBy({
    by: ["status"],
    where: { reporterId: report.reporterId },
    _count: { _all: true },
  });
  const otherReportsOnTarget = report.propertyId
    ? await prisma.report.count({ where: { propertyId: report.propertyId, id: { not: report.id } } })
    : 0;
  return { report, reporterHistory, otherReportsOnTarget };
}

export type ReportDecision = "START_REVIEW" | "REQUEST_INFO" | "TAKE_ACTION" | "DISMISS";

export async function decideReport(
  actor: Actor,
  reportId: string,
  decision: ReportDecision,
  input: { publicResponse?: string; internalNote?: string; suspendListing?: boolean; suspendUser?: boolean },
) {
  assertAdmin(actor);
  const report = await prisma.report.findUnique({ where: { id: reportId }, include: { property: true } });
  if (!report) throw notFound("Report not found.");
  if (!OPEN_STATUSES.includes(report.status)) throw invalidState("This report is already resolved.");
  const publicResponse = input.publicResponse?.trim() || null;
  const internalNote = input.internalNote?.trim() || null;
  if (decision !== "START_REVIEW" && (!publicResponse || publicResponse.length < 5)) {
    throw new AppError("VALIDATION", "Write a short response for the reporter.", {
      publicResponse: ["Response is required"],
    });
  }
  if (report.subjectUserId === actor.id) throw invalidState("You cannot decide a report about yourself.");

  const next: ReportStatus = {
    START_REVIEW: "UNDER_REVIEW",
    REQUEST_INFO: "INFO_REQUESTED",
    TAKE_ACTION: "ACTION_TAKEN",
    DISMISS: "DISMISSED",
  }[decision] as ReportStatus;
  const actionType = {
    START_REVIEW: "REPORT_UNDER_REVIEW",
    REQUEST_INFO: "REPORT_INFO_REQUESTED",
    TAKE_ACTION: "REPORT_ACTION_TAKEN",
    DISMISS: "REPORT_DISMISSED",
  }[decision] as "REPORT_UNDER_REVIEW" | "REPORT_INFO_REQUESTED" | "REPORT_ACTION_TAKEN" | "REPORT_DISMISSED";
  const resolved = next === "ACTION_TAKEN" || next === "DISMISSED";
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    const res = await tx.report.updateMany({
      where: { id: reportId, status: report.status },
      data: {
        status: next,
        assignedToId: actor.id,
        ...(publicResponse ? { publicResponse } : {}),
        ...(internalNote ? { internalNote } : {}),
        resolvedAt: resolved ? now : null,
      },
    });
    if (res.count !== 1) throw invalidState("This report changed. Please reload.");
    await tx.moderationAction.create({
      data: {
        actorId: actor.id,
        action: actionType,
        reason: publicResponse ?? "Review started",
        reportId,
        propertyId: report.propertyId,
        targetUserId: report.subjectUserId,
      },
    });

    if (
      decision === "TAKE_ACTION" &&
      input.suspendListing &&
      report.property &&
      ["PUBLISHED", "PENDING_REVIEW"].includes(report.property.status)
    ) {
      await tx.property.update({
        where: { id: report.property.id },
        data: { status: "SUSPENDED", reviewNote: publicResponse },
      });
      await tx.moderationAction.create({
        data: {
          actorId: actor.id,
          action: "SUSPEND_LISTING",
          reason: publicResponse ?? "Suspended after report",
          reportId,
          propertyId: report.property.id,
          targetUserId: report.subjectUserId,
        },
      });
      await notify(tx, {
        userId: report.property.advertiserId,
        type: "listing_suspend",
        title: "Listing suspended",
        body: `Your listing "${report.property.title}" was suspended after a review. You can appeal from your dashboard.`,
        link: "/dashboard/listings",
      });
    }
    if (decision === "TAKE_ACTION" && input.suspendUser && report.subjectUserId) {
      const target = await tx.user.findUnique({
        where: { id: report.subjectUserId },
        select: { role: true, status: true },
      });
      if (target && target.role !== "ADMIN" && target.status === "ACTIVE") {
        await tx.user.update({
          where: { id: report.subjectUserId },
          data: { status: "SUSPENDED", suspendedAt: now, suspendedReason: publicResponse },
        });
        await tx.session.deleteMany({ where: { userId: report.subjectUserId } });
        await tx.moderationAction.create({
          data: {
            actorId: actor.id,
            action: "SUSPEND_USER",
            reason: publicResponse ?? "Suspended after report",
            reportId,
            targetUserId: report.subjectUserId,
          },
        });
      }
    }

    await writeAudit(tx, {
      actorId: actor.id,
      action: `report.${decision.toLowerCase()}`,
      entityType: "Report",
      entityId: reportId,
      metadata: {
        from: report.status,
        to: next,
        suspendListing: !!input.suspendListing,
        suspendUser: !!input.suspendUser,
      },
    });
    if (decision !== "START_REVIEW") {
      await notify(tx, {
        userId: report.reporterId,
        type: `report_${next.toLowerCase()}`,
        title: "Update on your report",
        body: publicResponse ?? "Your report status changed.",
        link: "/dashboard/reports",
      });
    }
  });
}

/** Authorises a download of report evidence: administrators or the reporter only. */
export async function getReportEvidenceForDownload(actor: Actor | null, evidenceId: string) {
  assertActive(actor);
  const ev = await prisma.reportEvidence.findUnique({
    where: { id: evidenceId },
    include: { report: { select: { reporterId: true } } },
  });
  if (!ev || ev.purgedAt) throw notFound();
  if (!isAdmin(actor) && ev.report.reporterId !== actor.id) throw notFound();
  return { storageKey: ev.storageKey, mimeType: ev.mimeType };
}
