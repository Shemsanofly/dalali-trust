import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { Actor } from "../actor";
import { assertActive } from "../actor";
import { prisma } from "../db";
import { scheduleSmsDelivery, smsEnabled } from "../sms";
import { scheduleWhatsAppDelivery, whatsappEnabled } from "../whatsapp";
import type { WhatsAppTemplate } from "../whatsapp-templates";

/**
 * Creates an in-app notification. With `whatsapp` (a message template and its values), a
 * WhatsApp and/or SMS copy is also queued for each channel that is configured and that the
 * recipient opted in to with a mobile number. Copies are sent after the response (see
 * server/whatsapp.ts and server/sms.ts). No email is sent from here.
 */
export async function notify(
  tx: Prisma.TransactionClient,
  n: {
    userId: string;
    type: string;
    title: string;
    body: string;
    link?: string;
    /** Values for showing the notification in the reader's language (see i18n/notification-text). */
    data?: Record<string, string | undefined>;
    whatsapp?: { template: WhatsAppTemplate; params: string[] };
  },
) {
  const { whatsapp, ...rest } = n;
  let queueWhatsApp = false;
  let queueSms = false;
  if (whatsapp && (whatsappEnabled() || smsEnabled())) {
    const user = await tx.user.findUnique({
      where: { id: n.userId },
      select: { phoneNumber: true, whatsappUpdates: true, smsUpdates: true },
    });
    queueWhatsApp = whatsappEnabled() && Boolean(user?.whatsappUpdates && user.phoneNumber);
    queueSms = smsEnabled() && Boolean(user?.smsUpdates && user.phoneNumber);
  }
  await tx.notification.create({
    data: {
      ...rest,
      link: n.link ?? null,
      data: n.data ? JSON.parse(JSON.stringify(n.data)) : undefined,
      ...((queueWhatsApp || queueSms) && whatsapp
        ? { whatsappTemplate: whatsapp.template, whatsappParams: whatsapp.params }
        : {}),
      ...(queueWhatsApp ? { whatsappStatus: "PENDING" } : {}),
      ...(queueSms ? { smsStatus: "PENDING" } : {}),
    },
  });
  if (queueWhatsApp) scheduleWhatsAppDelivery();
  if (queueSms) scheduleSmsDelivery();
}

export async function listNotifications(actor: Actor, take = 50) {
  assertActive(actor);
  return prisma.notification.findMany({
    where: { userId: actor.id },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export async function unreadCount(actor: Actor): Promise<number> {
  return prisma.notification.count({ where: { userId: actor.id, readAt: null } });
}

export async function markAllRead(actor: Actor) {
  assertActive(actor);
  await prisma.notification.updateMany({
    where: { userId: actor.id, readAt: null },
    data: { readAt: new Date() },
  });
}
