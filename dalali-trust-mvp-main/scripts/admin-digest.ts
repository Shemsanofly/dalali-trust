/**
 * Daily moderation summary: emails every active administrator how many listings,
 * verification requests and reports are waiting (urgent reports flagged). Sends nothing
 * when the queue is empty. Run each morning from a scheduler (cron, platform job, GitHub Action):
 *
 *   npm run jobs:admin-digest
 *
 * Requires EMAIL_PROVIDER=resend in production. With EMAIL_PROVIDER=none the summary is
 * printed to the log instead and nobody is told it was sent.
 */
import "dotenv/config";
import { prisma } from "../src/server/db";
import { emailEnabled, sendEmail } from "../src/server/email";
import { env } from "../src/server/env";
import { moderationDigest, moderationQueue } from "../src/server/services/moderation-queue";

async function run() {
  const digest = moderationDigest(await moderationQueue(), env().APP_URL);
  if (!digest) {
    console.log("Nothing waiting for review. No summary sent.");
    return;
  }
  if (!emailEnabled()) {
    console.log(
      `Email is disabled (EMAIL_PROVIDER=none). Summary not sent:\n\n${digest.subject}\n${digest.text}`,
    );
    return;
  }
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", status: "ACTIVE" },
    select: { email: true },
  });
  let sent = 0;
  for (const a of admins) if (await sendEmail({ to: a.email, ...digest })) sent++;
  console.log(`${digest.subject} — sent to ${sent} of ${admins.length} administrator(s).`);
}

run()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
