"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { coordinatesFromForm } from "@/lib/coordinates";
import { files, runAction, str, type ActionState } from "@/server/action-result";
import { unauthenticated } from "@/server/errors";
import { getActor } from "@/server/session";
import {
  addListingImages,
  archiveListing,
  createListing,
  removeListingImage,
  restoreListingToDraft,
  submitListingForReview,
  updateAvailability,
  updateListing,
} from "@/server/services/listings";
import { respondToViewing } from "@/server/services/viewings";

async function actorOrThrow() {
  const actor = await getActor();
  if (!actor) throw unauthenticated();
  return actor;
}

/** Converts the listing form into a plain object. Only known fields are read (no mass assignment). */
function listingFromForm(form: FormData) {
  const charges = [];
  for (let i = 0; i < 6; i++) {
    const label = str(form, `charge_label_${i}`)?.trim();
    const amount = str(form, `charge_amount_${i}`)?.replace(/[,\s]/g, "");
    if (!label && !amount) continue;
    charges.push({
      label,
      amount,
      frequency: str(form, `charge_frequency_${i}`),
      note: str(form, `charge_note_${i}`),
    });
  }
  const money = (k: string) => (str(form, k) ?? "").replace(/[,\s]/g, "");
  const [latitude, longitude] = coordinatesFromForm(str(form, "latitude"), str(form, "longitude"));
  return {
    title: str(form, "title"),
    description: str(form, "description"),
    propertyType: str(form, "propertyType"),
    region: str(form, "region"),
    district: str(form, "district"),
    neighborhood: str(form, "neighborhood"),
    streetAddress: str(form, "streetAddress"),
    latitude,
    longitude,
    rentAmount: money("rentAmount"),
    advanceMonths: str(form, "advanceMonths"),
    depositAmount: money("depositAmount") || "0",
    agentFeeNote: str(form, "agentFeeNote"),
    paymentTerms: str(form, "paymentTerms"),
    bedrooms: str(form, "bedrooms"),
    bathrooms: str(form, "bathrooms"),
    furnished: form.get("furnished") === "on",
    amenities: form.getAll("amenities").filter((v): v is string => typeof v === "string"),
    electricity: str(form, "electricity"),
    water: str(form, "water"),
    utilityNotes: str(form, "utilityNotes"),
    availabilityStatus: str(form, "availabilityStatus"),
    availableFrom: str(form, "availableFrom"),
    charges,
  };
}

function echo(form: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of form.entries())
    if (typeof v === "string" && !k.startsWith("$ACTION")) out[k] = out[k] ? `${out[k]},${v}` : v;
  return out;
}

export async function createListingAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  let id: string | undefined;
  const result = await runAction(async () => {
    const listing = await createListing(await actorOrThrow(), listingFromForm(form));
    id = listing.id;
  });
  if (!result.ok || !id) return { ...result, values: echo(form) };
  redirect(`/dashboard/listings/${id}?created=1`);
}

export async function updateListingAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const id = str(form, "id") ?? "";
  const result = await runAction(async () => {
    await updateListing(await actorOrThrow(), id, listingFromForm(form));
    revalidatePath(`/dashboard/listings/${id}`);
  }, "Listing saved.");
  return result.ok ? result : { ...result, values: echo(form) };
}

export async function uploadImagesAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const id = str(form, "id") ?? "";
  return runAction(async () => {
    const images = files(form, "images");
    if (images.length === 0) return { ok: false, message: "Choose at least one photo." };
    await addListingImages(await actorOrThrow(), id, images);
    revalidatePath(`/dashboard/listings/${id}`);
  }, "Photos uploaded.");
}

export async function removeImageAction(form: FormData) {
  const actor = await getActor();
  if (!actor) return;
  await runAction(() => removeListingImage(actor, str(form, "imageId") ?? ""));
  revalidatePath(`/dashboard/listings/${str(form, "id") ?? ""}`);
}

export async function listingStatusAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const id = str(form, "id") ?? "";
  const op = str(form, "op");
  return runAction(async () => {
    const actor = await actorOrThrow();
    if (op === "submit") await submitListingForReview(actor, id);
    else if (op === "archive") await archiveListing(actor, id);
    else if (op === "restore") await restoreListingToDraft(actor, id);
    else return { ok: false, message: "Unknown action." };
    revalidatePath(`/dashboard/listings/${id}`);
    revalidatePath("/dashboard/listings");
    return {
      ok: true,
      message:
        op === "submit"
          ? "Submitted for review."
          : op === "archive"
            ? "Listing archived."
            : "Listing restored as a draft.",
    };
  });
}

export async function availabilityAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const id = str(form, "id") ?? "";
  return runAction(async () => {
    await updateAvailability(await actorOrThrow(), id, {
      availabilityStatus: str(form, "availabilityStatus"),
      availableFrom: str(form, "availableFrom"),
    });
    revalidatePath(`/dashboard/listings/${id}`);
  }, "Availability confirmed.");
}

export async function respondViewingAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return runAction(async () => {
    const decision = str(form, "decision");
    if (decision !== "ACCEPT" && decision !== "DECLINE" && decision !== "COMPLETE")
      return { ok: false, message: "Unknown action." };
    await respondToViewing(await actorOrThrow(), str(form, "id") ?? "", decision, str(form, "message"));
    revalidatePath("/dashboard/viewings");
  }, "Updated.");
}
