import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { Actor } from "../actor";
import { assertActive } from "../actor";
import { prisma } from "../db";

/** Creates an in-app notification. It does not send SMS, WhatsApp or email. */
export async function notify(
  tx: Prisma.TransactionClient,
  n: { userId: string; type: string; title: string; body: string; link?: string },
) {
  await tx.notification.create({ data: { ...n, link: n.link ?? null } });
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
