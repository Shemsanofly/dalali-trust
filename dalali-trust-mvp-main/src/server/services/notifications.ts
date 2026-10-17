import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { Actor } from "../actor";
import { assertActive } from "../actor";
import { prisma } from "../db";
import { scheduleWhatsAppDelivery, whatsappEnabled } from "../whatsapp";
import type { WhatsAppTemplate } from "../whatsapp-templates";

/**
 * Creates an in-app notification. With `whatsapp`, a WhatsApp copy is also queued when
 * WhatsApp is configured and the recipient opted in with a mobile number; it is sent
 * after the response (see server/whatsapp.ts). No SMS or email is sent from here.
 */
export async function notify(
  tx: Prisma.TransactionClient,
  n: {
    userId: string;
    type: string;
    title: string;
    body: string;
    link?: string;
    whatsapp?: { template: WhatsAppTemplate; params: string[] };
  },
) {
  const { whatsapp, ...rest } = n;
  let queueWhatsApp = false;
  if (whatsapp && whatsappEnabled()) {
    const user = await tx.user.findUnique({
      where: { id: n.userId },
      select: { phoneNumber: true, whatsappUpdates: true },
    });
    queueWhatsApp = Boolean(user?.whatsappUpdates && user.phoneNumber);
  }
  await tx.notification.create({
    data: {
      ...rest,
      link: n.link ?? null,
      ...(queueWhatsApp && whatsapp
        ? { whatsappStatus: "PENDING", whatsappTemplate: whatsapp.template, whatsappParams: whatsapp.params }
        : {}),
    },
  });
  if (queueWhatsApp) scheduleWhatsAppDelivery();
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
