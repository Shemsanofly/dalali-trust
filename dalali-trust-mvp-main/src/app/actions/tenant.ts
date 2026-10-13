"use server";

import { revalidatePath } from "next/cache";
import { parseEatLocalDateTime } from "@/lib/dates";
import { files, runAction, str, type ActionState } from "@/server/action-result";
import { AppError, unauthenticated } from "@/server/errors";
import { getActor } from "@/server/session";
import { addReportInformation, appealReport, createReport } from "@/server/services/reports";
import { toggleSaved } from "@/server/services/users";
import { cancelViewing, createViewingRequest } from "@/server/services/viewings";

async function actorOrThrow() {
  const actor = await getActor();
  if (!actor) throw unauthenticated();
  return actor;
}

export async function toggleSavedAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return runAction(async () => {
    const saved = await toggleSaved(await actorOrThrow(), str(form, "propertyId") ?? "");
    revalidatePath("/dashboard/saved");
    return { ok: true, message: saved ? "saved" : "unsaved" };
  });
}

export async function viewingRequestAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return runAction(async () => {
    const actor = await actorOrThrow();
    const proposedAt = parseEatLocalDateTime(str(form, "proposedAt") ?? "");
    if (!proposedAt)
      throw new AppError("VALIDATION", "Choose a date and time.", { proposedAt: ["Choose a date and time"] });
    await createViewingRequest(actor, {
      propertyId: str(form, "propertyId"),
      proposedAt,
      message: str(form, "message"),
      contactPhone: str(form, "contactPhone"),
    });
    revalidatePath("/dashboard/viewings");
    return { ok: true, message: "sent" };
  });
}

export async function reportAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return runAction(async () => {
    const actor = await actorOrThrow();
    await createReport(
      actor,
      {
        propertyId: str(form, "propertyId") || undefined,
        subjectUserId: str(form, "subjectUserId") || undefined,
        category: str(form, "category"),
        description: str(form, "description"),
      },
      files(form, "evidence"),
    );
    revalidatePath("/dashboard/reports");
    return { ok: true, message: "sent" };
  });
}

export async function cancelViewingAction(form: FormData) {
  const actor = await getActor();
  if (!actor) return;
  await runAction(() => cancelViewing(actor, str(form, "id") ?? ""));
  revalidatePath("/dashboard/viewings");
}

export async function reportInfoAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return runAction(async () => {
    await addReportInformation(await actorOrThrow(), str(form, "id") ?? "", str(form, "info") ?? "");
    revalidatePath("/dashboard/reports");
  }, "Information added. The report is back under review.");
}

export async function appealAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return runAction(async () => {
    await appealReport(await actorOrThrow(), str(form, "id") ?? "", str(form, "note") ?? "");
    revalidatePath("/dashboard/reports");
  }, "Appeal submitted. A different review will take place.");
}
