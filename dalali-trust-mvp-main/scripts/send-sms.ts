/**
 * Safety net for SMS updates. Messages are normally sent right after the action that
 * caused them; this job re-queues any that were interrupted mid-send and delivers anything
 * still waiting. Run every 15 minutes or so from a scheduler:
 *
 *   npm run jobs:send-sms
 *
 * Does nothing while SMS_PROVIDER=none.
 */
import "dotenv/config";
import { prisma } from "../src/server/db";
import { deliverPendingSms, requeueStuckSms, smsEnabled } from "../src/server/sms";

async function run() {
  if (!smsEnabled()) {
    console.log("SMS is disabled (SMS_PROVIDER=none). Nothing to do.");
    return;
  }
  const requeued = await requeueStuckSms();
  let sent = 0;
  let failed = 0;
  for (;;) {
    const r = await deliverPendingSms(50);
    sent += r.sent;
    failed += r.failed;
    if (r.sent + r.failed < 50) break;
  }
  console.log(`SMS: ${sent} sent, ${failed} failed, ${requeued} re-queued after an interruption.`);
}

run()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
