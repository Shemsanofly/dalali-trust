import "server-only";
import { after } from "next/server";
import { prisma } from "./db";
import { env } from "./env";
import { cleanParam, renderTemplate, type WhatsAppTemplate } from "./whatsapp-templates";

/**
 * SMS through Africa's Talking (https://africastalking.com).
 * Providers: "africastalking" (real API; with AT_USERNAME=sandbox messages go to the sandbox
 * simulator and nobody is charged), "console" (development: printed to the log) and "none"
 * (default: nothing is sent and the app never claims otherwise).
 *
 * SMS copies of notifications use the same wording as the WhatsApp templates and follow the
 * same rules: only users who opted in (User.smsUpdates) with a mobile number get them, and
 * delivery runs after the response so an SMS outage never blocks the action that caused it.
 */

export function smsEnabled(): boolean {
  return env().SMS_PROVIDER !== "none";
}

/** Africa's Talking API host. The "sandbox" username always uses the sandbox. */
export function africasTalkingBaseUrl(username = env().AT_USERNAME): string {
  return username === "sandbox" ? "https://api.sandbox.africastalking.com" : "https://api.africastalking.com";
}

export type SmsResult = { ok: true; messageId?: string } | { ok: false; error: string };

/** Africa's Talking per-recipient status codes that mean the message was accepted. */
const AT_ACCEPTED = new Set([100, 101, 102]);

type AtSmsResponse = {
  SMSMessageData?: {
    Message?: string;
    Recipients?: { statusCode?: number; status?: string; number?: string; messageId?: string }[];
  };
};

export async function sendSms(toE164: string, text: string): Promise<SmsResult> {
  const e = env();
  const message = text.replace(/\r\n?/g, "\n").trim().slice(0, 918); // at most 6 SMS parts
  if (e.SMS_PROVIDER === "console") {
    console.info(`[sms:console] to=${toE164}\n${message}`);
    return { ok: true };
  }
  if (e.SMS_PROVIDER !== "africastalking") return { ok: false, error: "disabled" };
  const body = new URLSearchParams({ username: e.AT_USERNAME, to: toE164, message });
  if (e.AT_SENDER_ID) body.set("from", e.AT_SENDER_ID);
  try {
    const res = await fetch(`${africasTalkingBaseUrl(e.AT_USERNAME)}/version1/messaging`, {
      method: "POST",
      headers: {
        apiKey: e.AT_API_KEY ?? "",
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    const raw = await res.text();
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}: ${raw}`.slice(0, 300) };
    let data: AtSmsResponse | null = null;
    try {
      data = JSON.parse(raw) as AtSmsResponse;
    } catch {
      return { ok: false, error: `Unexpected response: ${raw}`.slice(0, 300) };
    }
    const recipient = data.SMSMessageData?.Recipients?.[0];
    if (recipient && AT_ACCEPTED.has(Number(recipient.statusCode)))
      return { ok: true, messageId: recipient.messageId };
    return {
      ok: false,
      error: (recipient
        ? `${recipient.status ?? "Failed"} (${recipient.statusCode})`
        : (data.SMSMessageData?.Message ?? "No recipient accepted")
      ).slice(0, 300),
    };
  } catch (err) {
    return { ok: false, error: (err instanceof Error ? err.message : String(err)).slice(0, 300) };
  }
}

/** The SMS text for a notification template, in the recipient's language. */
export function renderSms(template: WhatsAppTemplate, locale: "en" | "sw", params: string[]): string {
  return renderTemplate(
    template,
    locale,
    params.map((p) => cleanParam(p)),
  );
}

/**
 * Sends SMS copies of notifications marked PENDING. Each row is claimed first
 * (PENDING → SENDING) so two concurrent runs never send the same message twice.
 */
export async function deliverPendingSms(limit = 50): Promise<{ sent: number; failed: number }> {
  if (!smsEnabled()) return { sent: 0, failed: 0 };
  const pending = await prisma.notification.findMany({
    where: { smsStatus: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: {
      id: true,
      whatsappTemplate: true,
      whatsappParams: true,
      user: { select: { phoneNumber: true, locale: true, smsUpdates: true, status: true } },
    },
  });
  let sent = 0;
  let failed = 0;
  for (const n of pending) {
    const claimed = await prisma.notification.updateMany({
      where: { id: n.id, smsStatus: "PENDING" },
      data: { smsStatus: "SENDING" },
    });
    if (claimed.count !== 1) continue;
    const { phoneNumber, locale, smsUpdates, status } = n.user;
    const result: SmsResult =
      !phoneNumber || !smsUpdates || status !== "ACTIVE"
        ? { ok: false, error: "recipient opted out or has no mobile number" }
        : !n.whatsappTemplate
          ? { ok: false, error: "no message template" }
          : await sendSms(
              phoneNumber,
              renderSms(
                n.whatsappTemplate as WhatsAppTemplate,
                locale === "sw" ? "sw" : "en",
                Array.isArray(n.whatsappParams) ? n.whatsappParams.map(String) : [],
              ),
            );
    await prisma.notification.update({
      where: { id: n.id },
      data: result.ok
        ? { smsStatus: "SENT", smsSentAt: new Date(), smsError: null }
        : { smsStatus: "FAILED", smsError: result.error },
    });
    if (result.ok) sent++;
    else {
      failed++;
      console.warn(`[sms] notification ${n.id} not delivered: ${result.error}`);
    }
  }
  return { sent, failed };
}

/** Puts messages stuck in SENDING (e.g. the server restarted mid-send) back in the queue. */
export async function requeueStuckSms(olderThanMinutes = 10): Promise<number> {
  const res = await prisma.notification.updateMany({
    where: { smsStatus: "SENDING", createdAt: { lt: new Date(Date.now() - olderThanMinutes * 60_000) } },
    data: { smsStatus: "PENDING" },
  });
  return res.count;
}

/** Delivers queued SMS after the current response has been sent. */
export function scheduleSmsDelivery(): void {
  try {
    after(() =>
      deliverPendingSms()
        .then(() => undefined)
        .catch((e: unknown) => console.error("[sms] delivery failed", e instanceof Error ? e.message : e)),
    );
  } catch {
    // Not inside a request (tests, scripts): the send-sms job delivers the queue instead.
  }
}
