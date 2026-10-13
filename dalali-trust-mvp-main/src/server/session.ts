import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Role } from "@/generated/prisma/enums";
import type { Actor } from "./actor";
import { auth } from "./auth";
import { prisma } from "./db";

/**
 * Returns the signed-in user with role and status read fresh from PostgreSQL (never
 * from a cookie or client input), or null. Cached per request.
 */
export const getActor = cache(async (): Promise<Actor | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, status: true, name: true, email: true },
  });
  if (!user || user.status === "DELETED") return null;
  return user;
});

/** For pages: redirect to sign-in when signed out; to the dashboard when the role is not allowed. */
export async function requirePageActor(
  opts: { roles?: readonly Role[]; next?: string } = {},
): Promise<Actor> {
  const actor = await getActor();
  if (!actor) redirect(`/sign-in${opts.next ? `?next=${encodeURIComponent(opts.next)}` : ""}`);
  if (opts.roles && !opts.roles.includes(actor.role)) redirect("/dashboard?denied=1");
  return actor;
}
