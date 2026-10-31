/**
 * Sends one test SMS with the current Africa's Talking settings, to check the setup.
 * With AT_USERNAME=sandbox the message appears in the Africa's Talking simulator
 * (https://simulator.africastalking.com) for the same phone number.
 *
 *   npm run sms:test -- +255712345678
 */
import "dotenv/config";
import { normalizeTzPhone } from "../src/lib/phone";
import { env } from "../src/server/env";
import { sendSms } from "../src/server/sms";

async function run() {
  const raw = process.argv[2] ?? "";
  const to = normalizeTzPhone(raw) ?? (/^\+\d{8,15}$/.test(raw) ? raw : null);
  if (!to) throw new Error("Usage: npm run sms:test -- +2557XXXXXXXX");
  const e = env();
  console.log(`Provider: ${e.SMS_PROVIDER}, Africa's Talking username: ${e.AT_USERNAME}`);
  const result = await sendSms(to, "Estate test message. SMS is set up correctly.");
  if (!result.ok) throw new Error(`Not sent: ${result.error}`);
  console.log(`Sent to ${to}${result.messageId ? ` (message id ${result.messageId})` : ""}.`);
}

run().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
