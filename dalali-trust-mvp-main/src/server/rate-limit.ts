import "server-only";
import { createHmac } from "node:crypto";
import type { Db } from "./db";
import { rateLimited } from "./errors";

export type RateRule = { window: number; max: number };

/** Application rate-limit rules (window in seconds). */
export const RATE_RULES = {
  report: { window: 60 * 60, max: 10 },
  viewingRequest: { window: 60 * 60, max: 15 },
  feedback: { window: 60 * 60, max: 10 },
  upload: { window: 60 * 60, max: 60 },
  listingWrite: { window: 60 * 60, max: 60 },
  verificationSubmit: { window: 60 * 60 * 24, max: 10 },
} satisfies Record<string, RateRule>;

/**
 * Atomically consumes one request in a fixed window using a single upsert, so
 * concurrent requests cannot all slip past a stale read.
 */
export async function consumeRateLimit(
  db: Db,
  key: string,
  rule: RateRule,
): Promise<{ allowed: boolean; retryAfter: number | null }> {
  const rows = await db.$queryRaw<{ count: number; windowStart: Date }[]>`
    INSERT INTO "rate_limit" ("key", "count", "windowStart")
    VALUES (${key}, 1, now())
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "rate_limit"."windowStart" <= now() - make_interval(secs => ${rule.window}::int)
                     THEN 1 ELSE "rate_limit"."count" + 1 END,
      "windowStart" = CASE WHEN "rate_limit"."windowStart" <= now() - make_interval(secs => ${rule.window}::int)
                     THEN now() ELSE "rate_limit"."windowStart" END
    RETURNING "count", "windowStart"`;
  const row = rows[0];
  if (!row) return { allowed: true, retryAfter: null };
  if (row.count <= rule.max) return { allowed: true, retryAfter: null };
  const elapsed = (Date.now() - new Date(row.windowStart).getTime()) / 1000;
  return { allowed: false, retryAfter: Math.max(1, Math.ceil(rule.window - elapsed)) };
}

export async function enforceRateLimit(db: Db, key: string, rule: RateRule): Promise<void> {
  const result = await consumeRateLimit(db, key, rule);
  if (!result.allowed) throw rateLimited();
}

/** Hashes an identifier (e.g. an IP address) so raw IPs are never persisted. */
export function hashIdentifier(value: string): string {
  const secret = process.env.BETTER_AUTH_SECRET ?? "dev-only-secret";
  return createHmac("sha256", secret).update(value).digest("hex").slice(0, 32);
}
