import "server-only";
import type { VerificationStatus, VerificationType } from "@/generated/prisma/enums";
import { prisma } from "../db";

export type CheckState = "VERIFIED" | "PENDING" | "NOT_VERIFIED" | "EXPIRED";

export type TrustCheck = {
  type: VerificationType;
  state: CheckState;
  scopeStatement: string | null;
  decidedAt: Date | null;
  expiresAt: Date | null;
};

export type TrustSummary = {
  identity: TrustCheck;
  advertiserRole: TrustCheck;
  propertyEvidence: TrustCheck | null;
};

type Row = {
  type: VerificationType;
  status: VerificationStatus;
  propertyId: string | null;
  scopeStatement: string | null;
  decidedAt: Date | null;
  expiresAt: Date | null;
};

/** A verification only counts while it is VERIFIED and not past its expiry date. */
export function effectiveState(
  row: Pick<Row, "status" | "expiresAt"> | undefined,
  now = new Date(),
): CheckState {
  if (!row) return "NOT_VERIFIED";
  if (row.status === "VERIFIED") return row.expiresAt && row.expiresAt <= now ? "EXPIRED" : "VERIFIED";
  if (row.status === "EXPIRED") return "EXPIRED";
  if (row.status === "PENDING_REVIEW" || row.status === "MORE_INFO_REQUIRED") return "PENDING";
  return "NOT_VERIFIED";
}

function pickBest(rows: Row[], now: Date): Row | undefined {
  const rank = (r: Row) => ({ VERIFIED: 0, PENDING: 1, EXPIRED: 2, NOT_VERIFIED: 3 })[effectiveState(r, now)];
  return [...rows].sort((a, b) => rank(a) - rank(b))[0];
}

function toCheck(type: VerificationType, row: Row | undefined, now: Date): TrustCheck {
  const state = effectiveState(row, now);
  return {
    type,
    state,
    scopeStatement: state === "VERIFIED" ? (row?.scopeStatement ?? null) : null,
    decidedAt: state === "VERIFIED" ? (row?.decidedAt ?? null) : null,
    expiresAt: state === "VERIFIED" ? (row?.expiresAt ?? null) : null,
  };
}

/**
 * Builds the public trust summary for many advertisers at once. Only fields that are
 * safe to show publicly (state, scope statement, dates) are returned — never evidence.
 */
export async function trustSummaries(
  advertiserIds: string[],
  propertyIds: string[] = [],
  now = new Date(),
): Promise<{
  byAdvertiser: Map<string, Omit<TrustSummary, "propertyEvidence">>;
  byProperty: Map<string, TrustCheck>;
}> {
  const rows = await prisma.verificationRequest.findMany({
    where: {
      OR: [
        { subjectUserId: { in: advertiserIds }, type: { in: ["IDENTITY", "ADVERTISER_ROLE"] } },
        ...(propertyIds.length
          ? [{ propertyId: { in: propertyIds }, type: "PROPERTY_EVIDENCE" as const }]
          : []),
      ],
      status: { in: ["VERIFIED", "PENDING_REVIEW", "MORE_INFO_REQUIRED", "EXPIRED"] },
    },
    select: {
      subjectUserId: true,
      type: true,
      status: true,
      propertyId: true,
      scopeStatement: true,
      decidedAt: true,
      expiresAt: true,
    },
  });

  const byAdvertiser = new Map<string, Omit<TrustSummary, "propertyEvidence">>();
  for (const id of advertiserIds) {
    const mine = rows.filter((r) => r.subjectUserId === id);
    byAdvertiser.set(id, {
      identity: toCheck(
        "IDENTITY",
        pickBest(
          mine.filter((r) => r.type === "IDENTITY"),
          now,
        ),
        now,
      ),
      advertiserRole: toCheck(
        "ADVERTISER_ROLE",
        pickBest(
          mine.filter((r) => r.type === "ADVERTISER_ROLE"),
          now,
        ),
        now,
      ),
    });
  }
  const byProperty = new Map<string, TrustCheck>();
  for (const pid of propertyIds) {
    byProperty.set(
      pid,
      toCheck(
        "PROPERTY_EVIDENCE",
        pickBest(
          rows.filter((r) => r.propertyId === pid && r.type === "PROPERTY_EVIDENCE"),
          now,
        ),
        now,
      ),
    );
  }
  return { byAdvertiser, byProperty };
}

export async function trustSummary(advertiserId: string, propertyId?: string): Promise<TrustSummary> {
  const { byAdvertiser, byProperty } = await trustSummaries([advertiserId], propertyId ? [propertyId] : []);
  const a = byAdvertiser.get(advertiserId)!;
  return { ...a, propertyEvidence: propertyId ? (byProperty.get(propertyId) ?? null) : null };
}

/** Advertiser ids whose identity check is currently valid — used for the "verified only" filter. */
export function verifiedIdentityWhere(now = new Date()) {
  return {
    verificationRequests: {
      some: {
        type: "IDENTITY" as const,
        status: "VERIFIED" as const,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    },
  };
}
