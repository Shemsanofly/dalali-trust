import "server-only";
import { after } from "next/server";
import { prisma } from "./db";
import { env } from "./env";
import { cleanParam, renderTemplate, type WhatsAppTemplate } from "./whatsapp-templates";

/**
 * Automatic WhatsApp updates through Meta's WhatsApp Business Platform (Cloud API).
 * Providers: "cloud" (real messages), "console" (development: printed to the log) and
 * "none" (default: nothing is sent and the app never claims otherwise).
 *
 * Only users who opted in (User.whatsappUpdates) and have a mobile number get messages.
 * notify() marks the notification PENDING inside the transaction; delivery runs after the
 * response, so a WhatsApp outage never blocks or undoes the action that caused it.
 */
/** Full address of a page on this site, for links inside WhatsApp messages. */
export function appLink(path: string): string {
  return new URL(path, env().APP_URL).toString();
}

export function whatsappEnabled(): boolean {
  return env().WHATSAPP_PROVIDER !== "none";
}

export type WhatsAppResult = { ok: true } | { ok: false; error: string };

export async function sendWhatsAppTemplate(
  toE164: string,
  template: WhatsAppTemplate,
  locale: "en" | "sw",
  params: string[],
): Promise<WhatsAppResult> {
  const e = env();
  const clean = params.map((p) => cleanParam(p));
  if (e.WHATSAPP_PROVIDER === "console") {
    console.info(
      `[whatsapp:console] to=${toE164} template=${template} (${locale})\n${renderTemplate(template, locale, clean)}`,
    );
    return { ok: true };
  }
  if (e.WHATSAPP_PROVIDER !== "cloud") return { ok: false, error: "disabled" };
  try {
    const res = await fetch(
      `https://graph.facebook.com/${e.WHATSAPP_API_VERSION}/${e.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${e.WHATSAPP_ACCESS_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: toE164.replace(/\D/g, ""),
          type: "template",
          template: {
            name: template,
            language: { code: locale },
            components: [{ type: "body", parameters: clean.map((text) => ({ type: "text", text })) }],
          },
        }),
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (res.ok) return { ok: true };
    const body = (await res.json().catch(() => null)) as {
      error?: { code?: number; message?: string };
    } | null;
    return {
      ok: false,
      error: `HTTP ${res.status}${body?.error ? ` (${body.error.code}): ${body.error.message}` : ""}`.slice(
        0,
        300,
      ),
    };
  } catch (err) {
    return { ok: false, error: (err instanceof Error ? err.message : String(err)).slice(0, 300) };
  }
}

/**
 * Sends WhatsApp copies of notifications marked PENDING. Each row is claimed first
 * (PENDING → SENDING) so two concurrent runs never send the same message twice.
 */
export async function deliverPendingWhatsApp(limit = 50): Promise<{ sent: number; failed: number }> {
  if (!whatsappEnabled()) return { sent: 0, failed: 0 };
  const pending = await prisma.notification.findMany({
    where: { whatsappStatus: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: {
      id: true,
      whatsappTemplate: true,
      whatsappParams: true,
      user: { select: { phoneNumber: true, locale: true, whatsappUpdates: true, status: true } },
    },
  });
  let sent = 0;
  let failed = 0;
  for (const n of pending) {
    const claimed = await prisma.notification.updateMany({
      where: { id: n.id, whatsappStatus: "PENDING" },
      data: { whatsappStatus: "SENDING" },
    });
    if (claimed.count !== 1) continue;
    const { phoneNumber, locale, whatsappUpdates, status } = n.user;
    const result: WhatsAppResult =
      !phoneNumber || !whatsappUpdates || status !== "ACTIVE"
        ? { ok: false, error: "recipient opted out or has no mobile number" }
        : await sendWhatsAppTemplate(
            phoneNumber,
            n.whatsappTemplate as WhatsAppTemplate,
            locale === "sw" ? "sw" : "en",
            Array.isArray(n.whatsappParams) ? n.whatsappParams.map(String) : [],
          );
    await prisma.notification.update({
      where: { id: n.id },
      data: result.ok
        ? { whatsappStatus: "SENT", whatsappSentAt: new Date(), whatsappError: null }
        : { whatsappStatus: "FAILED", whatsappError: result.error },
    });
    if (result.ok) sent++;
    else {
      failed++;
      console.warn(`[whatsapp] notification ${n.id} not delivered: ${result.error}`);
    }
  }
  return { sent, failed };
}

/** Puts messages stuck in SENDING (e.g. the server restarted mid-send) back in the queue. */
export async function requeueStuckWhatsApp(olderThanMinutes = 10): Promise<number> {
  const res = await prisma.notification.updateMany({
    where: { whatsappStatus: "SENDING", createdAt: { lt: new Date(Date.now() - olderThanMinutes * 60_000) } },
    data: { whatsappStatus: "PENDING" },
  });
  return res.count;
}

/** Delivers queued WhatsApp messages after the current response has been sent. */
export function scheduleWhatsAppDelivery(): void {
  try {
    after(() =>
      deliverPendingWhatsApp()
        .then(() => undefined)
        .catch((e: unknown) =>
          console.error("[whatsapp] delivery failed", e instanceof Error ? e.message : e),
        ),
    );
  } catch {
    // Not inside a request (tests, scripts): the send-whatsapp job delivers the queue instead.
  }
}
