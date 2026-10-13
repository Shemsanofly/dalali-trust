import "server-only";
import type { Prisma } from "@/generated/prisma/client";

type TxClient = Prisma.TransactionClient;

const SENSITIVE_KEYS = /pass|token|secret|otp|document|nida|evidence_?content|authorization/i;

/** Removes anything that looks sensitive before it is written to the audit log. */
export function sanitizeMetadata(value: unknown, depth = 0): Prisma.InputJsonValue | null {
  if (value === null || value === undefined) return null;
  if (depth > 4) return "[truncated]";
  if (typeof value === "string") return value.length > 500 ? `${value.slice(0, 500)}…` : value;
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => sanitizeMetadata(v, depth + 1));
  if (typeof value === "object") {
    const out: Record<string, Prisma.InputJsonValue | null> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE_KEYS.test(k) ? "[redacted]" : sanitizeMetadata(v, depth + 1);
    }
    return out as Prisma.InputJsonValue;
  }
  return null;
}

export async function writeAudit(
  tx: TxClient,
  entry: {
    actorId: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    metadata?: unknown;
  },
) {
  const metadata = sanitizeMetadata(entry.metadata);
  await tx.auditLog.create({
    data: {
      actorId: entry.actorId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      ...(metadata === null ? {} : { metadata }),
    },
  });
}
