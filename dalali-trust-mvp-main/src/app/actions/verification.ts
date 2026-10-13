"use server";

import { revalidatePath } from "next/cache";
import { files, runAction, str, type ActionState } from "@/server/action-result";
import { AppError, unauthenticated } from "@/server/errors";
import { getActor } from "@/server/session";
import {
  addEvidence,
  removeEvidence,
  startVerification,
  submitVerification,
} from "@/server/services/verification";

async function actorOrThrow() {
  const actor = await getActor();
  if (!actor) throw unauthenticated();
  return actor;
}

export async function startVerificationAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return runAction(async () => {
    const type = str(form, "type");
    if (type !== "IDENTITY" && type !== "ADVERTISER_ROLE" && type !== "PROPERTY_EVIDENCE")
      throw new AppError("VALIDATION", "Choose a check.");
    await startVerification(await actorOrThrow(), type, str(form, "propertyId") || undefined);
    revalidatePath("/dashboard/verification");
  });
}

export async function addEvidenceAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return runAction(async () => {
    const [file] = files(form, "file");
    if (!file) throw new AppError("VALIDATION", "Choose a file to upload.");
    await addEvidence(await actorOrThrow(), str(form, "requestId") ?? "", str(form, "kind") ?? "", file);
    revalidatePath("/dashboard/verification");
  }, "Document uploaded.");
}

export async function removeEvidenceAction(form: FormData) {
  const actor = await getActor();
  if (!actor) return;
  await runAction(() => removeEvidence(actor, str(form, "evidenceId") ?? ""));
  revalidatePath("/dashboard/verification");
}

export async function submitVerificationAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return runAction(async () => {
    await submitVerification(await actorOrThrow(), str(form, "requestId") ?? "", str(form, "note"));
    revalidatePath("/dashboard/verification");
  }, "Submitted for review.");
}
