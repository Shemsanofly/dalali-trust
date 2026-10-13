import Link from "next/link";
import { notFound } from "next/navigation";
import {
  availabilityAction,
  listingStatusAction,
  removeImageAction,
  updateListingAction,
  uploadImagesAction,
} from "@/app/actions/listings";
import { ListingForm } from "@/components/listing/listing-form";
import { imageUrl } from "@/components/property/property-card";
import { ActionForm } from "@/components/ui/action-form";
import { Notice, PageHeader, StatusBadge } from "@/components/ui/basics";
import { getDictionary } from "@/i18n/server";
import { formatDateTime } from "@/lib/dates";
import { isAppError } from "@/server/errors";
import { requirePageActor } from "@/server/session";
import { getListingForOwner } from "@/server/services/listings";
import { MAX_IMAGES_PER_LISTING } from "@/server/uploads";

const STATUS_HELP: Record<string, string> = {
  DRAFT: "Private draft. Add at least one photo, then submit it for review.",
  PENDING_REVIEW: "Waiting for a moderator. You can still edit it.",
  PUBLISHED:
    "Live and visible to tenants. Changing details or photos sends it back to review; confirming availability does not.",
  REJECTED: "Not approved. Read the moderator's note, fix the listing and submit again.",
  ARCHIVED: "Hidden from tenants. Restore it as a draft to use it again.",
  SUSPENDED: "Suspended by a moderator after a review. You can appeal from My reports.",
};

export default async function EditListingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const actor = await requirePageActor({ roles: ["LANDLORD", "AGENT"] });
  const { id } = await params;
  const { created } = await searchParams;
  const { t } = await getDictionary();
  let listing;
  try {
    listing = await getListingForOwner(actor, id);
  } catch (e) {
    if (isAppError(e) && e.code === "NOT_FOUND") notFound();
    throw e;
  }
  if (listing.advertiserId !== actor.id) notFound();
  const editable = ["DRAFT", "REJECTED", "PENDING_REVIEW", "PUBLISHED"].includes(listing.status);

  return (
    <>
      <PageHeader
        title={listing.title}
        subtitle={<StatusBadge status={listing.status} />}
        actions={
          <Link href={`/properties/${listing.slug}`} className="btn-secondary">
            {listing.status === "PUBLISHED" ? "View public page" : "Preview"}
          </Link>
        }
      />
      {created ? (
        <div className="mb-4">
          <Notice tone="green">Draft saved. Step 2: add real photos below. Step 3: submit for review.</Notice>
        </div>
      ) : null}

      <section className="card mb-6 p-5">
        <p className="text-sm text-navy-700">{STATUS_HELP[listing.status]}</p>
        {listing.reviewNote ? (
          <p className="mt-2 rounded-lg bg-red-50 p-3 text-sm text-red-800">
            Moderator note: {listing.reviewNote}
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          {listing.status === "DRAFT" || listing.status === "REJECTED" ? (
            <ActionForm action={listingStatusAction} submitLabel="Submit for review" className="contents">
              <input type="hidden" name="id" value={listing.id} />
              <input type="hidden" name="op" value="submit" />
            </ActionForm>
          ) : null}
          {listing.status !== "ARCHIVED" && listing.status !== "SUSPENDED" ? (
            <ActionForm
              action={listingStatusAction}
              submitLabel="Archive listing"
              submitClassName="btn-secondary"
              className="contents"
            >
              <input type="hidden" name="id" value={listing.id} />
              <input type="hidden" name="op" value="archive" />
            </ActionForm>
          ) : null}
          {listing.status === "ARCHIVED" ? (
            <ActionForm
              action={listingStatusAction}
              submitLabel="Restore as draft"
              submitClassName="btn-secondary"
              className="contents"
            >
              <input type="hidden" name="id" value={listing.id} />
              <input type="hidden" name="op" value="restore" />
            </ActionForm>
          ) : null}
          <Link href={`/dashboard/verification?property=${listing.id}`} className="btn-ghost">
            Add property evidence
          </Link>
        </div>
      </section>

      {listing.status === "PUBLISHED" ? (
        <section className="card mb-6 p-5">
          <h2 className="font-bold">Confirm availability</h2>
          <p className="text-sm text-navy-600">
            Last confirmed:{" "}
            {listing.availabilityConfirmedAt ? formatDateTime(listing.availabilityConfirmedAt) : "never"}.
            Tenants see a warning when a listing has not been confirmed recently.
          </p>
          <ActionForm
            action={availabilityAction}
            submitLabel="Confirm"
            className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
          >
            <input type="hidden" name="id" value={listing.id} />
            <div>
              <label className="label" htmlFor="av-status">
                Status
              </label>
              <select
                className="input"
                id="av-status"
                name="availabilityStatus"
                defaultValue={listing.availabilityStatus}
              >
                <option value="AVAILABLE">Available now</option>
                <option value="AVAILABLE_SOON">Available from a date</option>
                <option value="OCCUPIED">Occupied</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="av-from">
                Available from
              </label>
              <input
                className="input"
                id="av-from"
                type="date"
                name="availableFrom"
                defaultValue={listing.availableFrom?.toISOString().slice(0, 10) ?? ""}
              />
            </div>
          </ActionForm>
        </section>
      ) : null}

      <section className="card mb-6 p-5">
        <h2 className="font-bold">
          Photos ({listing.images.length}/{MAX_IMAGES_PER_LISTING})
        </h2>
        <p className="text-sm text-navy-600">
          Use recent photos of this exact property. Location data is removed from photos automatically. JPEG,
          PNG or WebP, up to 8 MB each.
        </p>
        {listing.images.length ? (
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {listing.images.map((img) => (
              <li key={img.id} className="relative overflow-hidden rounded-xl border border-navy-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl(img.id, "thumb")} alt="" className="aspect-[4/3] w-full object-cover" />
                {editable ? (
                  <form action={removeImageAction} className="absolute top-1 right-1">
                    <input type="hidden" name="id" value={listing.id} />
                    <input type="hidden" name="imageId" value={img.id} />
                    <button
                      type="submit"
                      className="rounded-full bg-white/90 px-2 py-1 text-xs font-semibold text-red-700 shadow"
                    >
                      Remove
                    </button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
        {editable && listing.images.length < MAX_IMAGES_PER_LISTING ? (
          <ActionForm
            action={uploadImagesAction}
            submitLabel="Upload photos"
            encType="multipart/form-data"
            className="mt-4 space-y-3"
            resetOnSuccess
          >
            <input type="hidden" name="id" value={listing.id} />
            <label className="label" htmlFor="images">
              Add photos
            </label>
            <input
              className="input"
              id="images"
              name="images"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              required
            />
          </ActionForm>
        ) : null}
      </section>

      {editable ? (
        <ListingForm
          action={updateListingAction}
          t={t.property}
          submitLabel={listing.status === "PUBLISHED" ? "Save changes (sends to review)" : "Save changes"}
          defaults={{
            ...listing,
            latitude: listing.latitude?.toString() ?? null,
            longitude: listing.longitude?.toString() ?? null,
            availableFrom: listing.availableFrom?.toISOString().slice(0, 10) ?? null,
          }}
        />
      ) : null}
    </>
  );
}
