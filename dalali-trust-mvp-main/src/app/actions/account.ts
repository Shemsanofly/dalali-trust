"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { runAction, str, type ActionState } from "@/server/action-result";
import { auth } from "@/server/auth";
import { unauthenticated } from "@/server/errors";
import { getActor } from "@/server/session";
import { deleteMyAccount, updateProfile, upsertAdvertiserProfile } from "@/server/services/users";

async function actorOrThrow() {
  const actor = await getActor();
  if (!actor) throw unauthenticated();
  return actor;
}

export async function updateProfileAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return runAction(async () => {
    await updateProfile(await actorOrThrow(), {
      name: str(form, "name"),
      phoneNumber: str(form, "phoneNumber"),
      locale: str(form, "locale"),
      // Only change consent when the checkbox was on the form (it is hidden while WhatsApp is off).
      whatsappUpdates: form.has("whatsappField") ? form.get("whatsappUpdates") === "on" : undefined,
    });
    revalidatePath("/dashboard/settings");
  }, "Profile saved.");
}

export async function advertiserProfileAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return runAction(async () => {
    await upsertAdvertiserProfile(await actorOrThrow(), {
      displayName: str(form, "displayName"),
      bio: str(form, "bio"),
      agencyName: str(form, "agencyName"),
      serviceRegions: form.getAll("serviceRegions").filter((v): v is string => typeof v === "string"),
      contactPhone: str(form, "contactPhone"),
      whatsappNumber: str(form, "whatsappNumber"),
      showPhone: form.get("showPhone") === "on",
    });
    revalidatePath("/dashboard/profile");
  }, "Public profile saved.");
}

export async function deleteAccountAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const result = await runAction(async () => {
    const actor = await actorOrThrow();
    await deleteMyAccount(actor, str(form, "confirmEmail") ?? "");
    await auth.api.signOut({ headers: await headers() }).catch(() => undefined);
  });
  if (!result.ok) return result;
  redirect("/?deleted=1");
}
