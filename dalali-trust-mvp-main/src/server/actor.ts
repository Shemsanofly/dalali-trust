import type { AccountStatus, Role } from "@/generated/prisma/enums";
import { forbidden, unauthenticated } from "./errors";

/** The authenticated principal performing an operation, loaded fresh from the database. */
export type Actor = {
  id: string;
  role: Role;
  status: AccountStatus;
  name: string;
  email: string;
};

export const ADVERTISER_ROLES: readonly Role[] = ["LANDLORD", "AGENT"];

export function isAdvertiser(actor: Pick<Actor, "role">): boolean {
  return ADVERTISER_ROLES.includes(actor.role);
}

export function isAdmin(actor: Pick<Actor, "role">): boolean {
  return actor.role === "ADMIN";
}

/** Throws unless the actor exists and is active. Suspended accounts may only read. */
export function assertActive(actor: Actor | null | undefined): asserts actor is Actor {
  if (!actor) throw unauthenticated();
  if (actor.status !== "ACTIVE") throw forbidden("Your account is not active. Please contact support.");
}

export function assertRole(actor: Actor | null | undefined, roles: readonly Role[]): asserts actor is Actor {
  assertActive(actor);
  if (!roles.includes(actor.role)) throw forbidden();
}

export function assertAdmin(actor: Actor | null | undefined): asserts actor is Actor {
  assertRole(actor, ["ADMIN"]);
}

export function assertAdvertiser(actor: Actor | null | undefined): asserts actor is Actor {
  assertRole(actor, ADVERTISER_ROLES);
}
