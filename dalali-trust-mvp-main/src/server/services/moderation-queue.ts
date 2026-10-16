import "server-only";
import { prisma } from "../db";

/** Report categories the operations playbook says to handle the same day. */
export const URGENT_REPORT_CATEGORIES = ["ADVANCE_PAYMENT_REQUEST", "IMPERSONATION"] as const;
const ACTIONABLE_REPORT_STATUSES = ["SUBMITTED", "UNDER_REVIEW", "APPEALED"] as const;

export type ModerationQueue = {
  listings: number;
  verifications: number;
  reports: number;
  urgentReports: number;
  /** When the longest-waiting listing was submitted, if any are waiting. */
  oldestListingSubmittedAt: Date | null;
  total: number;
};

/**
 * Work waiting for a moderator right now. Reports waiting on the reporter (INFO_REQUESTED)
 * are not counted. Callers decide who may see it (admin header badge, daily summary job).
 */
export async function moderationQueue(): Promise<ModerationQueue> {
  const [listings, verifications, reports, urgentReports, oldest] = await Promise.all([
    prisma.property.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.verificationRequest.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.report.count({ where: { status: { in: [...ACTIONABLE_REPORT_STATUSES] } } }),
    prisma.report.count({
      where: {
        status: { in: [...ACTIONABLE_REPORT_STATUSES] },
        category: { in: [...URGENT_REPORT_CATEGORIES] },
      },
    }),
    prisma.property.findFirst({
      where: { status: "PENDING_REVIEW" },
      orderBy: { submittedAt: "asc" },
      select: { submittedAt: true },
    }),
  ]);
  return {
    listings,
    verifications,
    reports,
    urgentReports,
    oldestListingSubmittedAt: oldest?.submittedAt ?? null,
    total: listings + verifications + reports,
  };
}

/** Plain-text daily summary for moderators, or null when nothing is waiting. */
export function moderationDigest(
  q: ModerationQueue,
  appUrl: string,
  now = new Date(),
): { subject: string; text: string } | null {
  if (q.total === 0) return null;
  const waitingDays = q.oldestListingSubmittedAt
    ? Math.floor((now.getTime() - q.oldestListingSubmittedAt.getTime()) / 86_400_000)
    : null;
  const lines = [
    "Good morning. This is waiting for review on Dalali Trust:",
    "",
    `- Listings awaiting review: ${q.listings}${waitingDays && waitingDays > 0 ? ` (oldest waiting ${waitingDays} day${waitingDays === 1 ? "" : "s"})` : ""}`,
    `- Verification requests: ${q.verifications}`,
    `- Open reports: ${q.reports}${q.urgentReports ? ` — ${q.urgentReports} urgent (payment before viewing or impersonation): handle today` : ""}`,
    "",
    `Open the admin area: ${new URL("/admin", appUrl).toString()}`,
    "",
    "Target: listings and verifications within 2 working days; urgent reports the same day.",
  ];
  const urgent = q.urgentReports ? `, ${q.urgentReports} urgent` : "";
  return {
    subject: `Dalali Trust: ${q.total} item${q.total === 1 ? "" : "s"} waiting for review${urgent}`,
    text: lines.join("\n"),
  };
}
