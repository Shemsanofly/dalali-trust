/**
 * Daily maintenance: marks verifications past their expiry date as EXPIRED (notifying the
 * advertiser) and purges evidence files older than EVIDENCE_RETENTION_DAYS after a decision.
 * Run daily from a scheduler (cron, platform job, GitHub Action):
 *
 *   npm run jobs:expire-verifications
 *
 * The public site already treats expired checks as not verified even if this job has
 * not run; the job keeps stored statuses and notifications accurate.
 */
import "dotenv/config";
import { expireVerifications, purgeDecidedEvidence } from "../src/server/services/verification";
import { prisma } from "../src/server/db";

async function run() {
  console.log(`Expired ${await expireVerifications()} verification(s).`);
  console.log(`Purged ${await purgeDecidedEvidence()} evidence file(s) past the retention period.`);
}

run()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
