/**
 * Safety net for WhatsApp updates. Messages are normally sent right after the action that
 * caused them; this job re-queues any that were interrupted mid-send and delivers anything
 * still waiting. Run every 15 minutes or so from a scheduler:
 *
 *   npm run jobs:send-whatsapp
 *
 * Does nothing while WHATSAPP_PROVIDER=none.
 */
import "dotenv/config";
import { prisma } from "../src/server/db";
import { deliverPendingWhatsApp, requeueStuckWhatsApp, whatsappEnabled } from "../src/server/whatsapp";

async function run() {
  if (!whatsappEnabled()) {
    console.log("WhatsApp is disabled (WHATSAPP_PROVIDER=none). Nothing to do.");
    return;
  }
  const requeued = await requeueStuckWhatsApp();
  let sent = 0;
  let failed = 0;
  for (;;) {
    const r = await deliverPendingWhatsApp(50);
    sent += r.sent;
    failed += r.failed;
    if (r.sent + r.failed < 50) break;
  }
  console.log(`WhatsApp: ${sent} sent, ${failed} failed, ${requeued} re-queued after an interruption.`);
}

run()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
