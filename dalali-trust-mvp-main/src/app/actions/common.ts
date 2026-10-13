"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { isLocale, LOCALE_COOKIE } from "@/i18n";
import { runAction, str, type ActionState } from "@/server/action-result";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db";
import { consumeRateLimit } from "@/server/rate-limit";
import { clientKey, safeNext } from "@/server/request";
import { getActor } from "@/server/session";
import { track } from "@/server/services/analytics";
import { markAllRead } from "@/server/services/notifications";
import { submitFeedback } from "@/server/services/users";

export async function setLocaleAction(form: FormData) {
  const locale = str(form, "locale");
  if (isLocale(locale)) {
    (await cookies()).set(LOCALE_COOKIE, locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      httpOnly: true,
    });
    const actor = await getActor();
    if (actor) await prisma.user.update({ where: { id: actor.id }, data: { locale } });
  }
  redirect(safeNext(str(form, "returnTo") ?? (await sameOriginReferer()), "/"));
}

/** Path of the referring page, only if it is on this site. */
async function sameOriginReferer(): Promise<string | undefined> {
  const h = await headers();
  const referer = h.get("referer");
  if (!referer) return undefined;
  try {
    const url = new URL(referer);
    return url.host === h.get("host") ? `${url.pathname}${url.search}` : undefined;
  } catch {
    return undefined;
  }
}

export async function signOutAction() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/");
}

export async function feedbackAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return runAction(async () => {
    const actor = await getActor();
    await submitFeedback(
      actor,
      {
        kind: str(form, "kind"),
        name: str(form, "name"),
        email: str(form, "email"),
        message: str(form, "message"),
        page: str(form, "page"),
      },
      await clientKey(),
    );
    return { ok: true, message: "ok" };
  });
}

/** Records that a signed-in user revealed contact details (no personal data stored). */
export async function trackContactAction(propertyId: string, kind: "contact_reveal" | "whatsapp_click") {
  const actor = await getActor();
  if (!actor || typeof propertyId !== "string" || propertyId.length > 40) return;
  if (kind !== "contact_reveal" && kind !== "whatsapp_click") return;
  const { allowed } = await consumeRateLimit(prisma, `track:${actor.id}`, { window: 3600, max: 120 });
  if (allowed) await track(kind, propertyId);
}

export async function markNotificationsReadAction() {
  const actor = await getActor();
  if (actor) await markAllRead(actor);
}
