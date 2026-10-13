"use server";

import { revalidatePath } from "next/cache";
import type { Role } from "@/generated/prisma/enums";
import { runAction, str, type ActionState } from "@/server/action-result";
import { AppError, unauthenticated } from "@/server/errors";
import { getActor } from "@/server/session";
import { moderateListing } from "@/server/services/listings";
import { decideReport, type ReportDecision } from "@/server/services/reports";
import { changeUserRole, setUserSuspended } from "@/server/services/users";
import { decideVerification, type VerificationDecision } from "@/server/services/verification";

// Every action re-checks authorization inside the service (assertAdmin). Hiding admin
// pages is not relied on for security.

async function actorOrThrow() {
  const actor = await getActor();
  if (!actor) throw unauthenticated();
  return actor;
}

export async function moderateListingAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const id = str(form, "id") ?? "";
  return runAction(async () => {
    const decision = str(form, "decision");
    if (!decision || !["APPROVE", "REJECT", "SUSPEND", "REINSTATE"].includes(decision))
      throw new AppError("VALIDATION", "Choose a decision.");
    await moderateListing(
      await actorOrThrow(),
      id,
      decision as "APPROVE" | "REJECT" | "SUSPEND" | "REINSTATE",
      str(form, "reason") ?? "",
    );
    revalidatePath(`/admin/listings/${id}`);
    revalidatePath("/admin/listings");
  }, "Decision recorded.");
}

export async function decideVerificationAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const id = str(form, "id") ?? "";
  return runAction(async () => {
    const decision = str(form, "decision");
    if (!decision || !["VERIFY", "REJECT", "REQUEST_INFO"].includes(decision))
      throw new AppError("VALIDATION", "Choose a decision.");
    await decideVerification(await actorOrThrow(), id, decision as VerificationDecision, {
      reason: str(form, "reason") ?? "",
      scopeStatement: str(form, "scopeStatement"),
    });
    revalidatePath(`/admin/verifications/${id}`);
  }, "Decision recorded.");
}

export async function decideReportAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const id = str(form, "id") ?? "";
  return runAction(async () => {
    const decision = str(form, "decision");
    if (!decision || !["START_REVIEW", "REQUEST_INFO", "TAKE_ACTION", "DISMISS"].includes(decision))
      throw new AppError("VALIDATION", "Choose a decision.");
    await decideReport(await actorOrThrow(), id, decision as ReportDecision, {
      publicResponse: str(form, "publicResponse"),
      internalNote: str(form, "internalNote"),
      suspendListing: form.get("suspendListing") === "on",
      suspendUser: form.get("suspendUser") === "on",
    });
    revalidatePath(`/admin/reports/${id}`);
  }, "Decision recorded.");
}

export async function userAdminAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const id = str(form, "id") ?? "";
  return runAction(async () => {
    const actor = await actorOrThrow();
    const op = str(form, "op");
    const reason = str(form, "reason") ?? "";
    if (op === "role") {
      const role = str(form, "role");
      if (!role || !["TENANT", "LANDLORD", "AGENT", "ADMIN"].includes(role))
        throw new AppError("VALIDATION", "Choose a role.");
      await changeUserRole(actor, id, role as Role, reason);
    } else if (op === "suspend") await setUserSuspended(actor, id, true, reason);
    else if (op === "reinstate") await setUserSuspended(actor, id, false, reason);
    else throw new AppError("VALIDATION", "Unknown action.");
    revalidatePath(`/admin/users/${id}`);
  }, "Saved.");
}
