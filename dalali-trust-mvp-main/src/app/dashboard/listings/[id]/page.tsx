import { ChevronDown } from "lucide-react";
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
import { StepGuide } from "@/components/listing/step-guide";
import { imageUrl } from "@/components/property/property-card";
import { ActionForm } from "@/components/ui/action-form";
import { PageHeader, StatusBadge } from "@/components/ui/basics";
import { fmt } from "@/i18n";
import { getDictionary } from "@/i18n/server";
import { formatDateTime } from "@/lib/dates";
import { isAppError } from "@/server/errors";
import { requirePageActor } from "@/server/session";
import { getListingForOwner } from "@/server/services/listings";
import { MAX_IMAGES_PER_LISTING } from "@/server/uploads";

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePageActor({ roles: ["LANDLORD", "AGENT"] });
  const { id } = await params;
  const { locale, t } = await getDictionary();
  const tl = t.landlord;
  let listing;
  try {
    listing = await getListingForOwner(actor, id);
  } catch (e) {
    if (isAppError(e) && e.code === "NOT_FOUND") notFound();
    throw e;
  }
  if (listing.advertiserId !== actor.id) notFound();
  const editable = ["DRAFT", "REJECTED", "PENDING_REVIEW", "PUBLISHED"].includes(listing.status);
  const canSubmit = listing.status === "DRAFT" || listing.status === "REJECTED";
  const hasPhotos = listing.images.length > 0;
  const status = listing.status as keyof typeof tl.statusHelp;

  return (
    <>
      <PageHeader
        title={listing.title}
        subtitle={<StatusBadge status={listing.status} label={tl.statuses[status]} />}
        actions={
          <Link href={`/properties/${listing.slug}`} className="btn-secondary">
            {listing.status === "PUBLISHED" ? tl.viewPublic : tl.preview}
          </Link>
        }
      />

      {canSubmit ? <StepGuide t={tl.steps} current={hasPhotos ? 3 : 2} /> : null}

      <section className="card mb-6 p-5">
        <p className="text-sm text-navy-700">{tl.statusHelp[status]}</p>
        {listing.reviewNote ? (
          <p className="mt-2 rounded-lg bg-red-50 p-3 text-sm text-red-800">
            {fmt(tl.moderatorNote, { note: listing.reviewNote })}
          </p>
        ) : null}
        {listing.status === "ARCHIVED" ? (
          <ActionForm
            action={listingStatusAction}
            submitLabel={tl.restore}
            submitClassName="btn-secondary mt-3"
            className="contents"
          >
            <input type="hidden" name="id" value={listing.id} />
            <input type="hidden" name="op" value="restore" />
          </ActionForm>
        ) : null}
      </section>

      {listing.status === "PUBLISHED" ? (
        <section className="card mb-6 p-5">
          <h2 className="font-bold">{tl.availability.title}</h2>
          <p className="text-sm text-navy-600">
            {fmt(tl.availability.lastConfirmed, {
              date: listing.availabilityConfirmedAt
                ? formatDateTime(listing.availabilityConfirmedAt, locale)
                : tl.availability.never,
            })}{" "}
            {tl.availability.warning}
          </p>
          <ActionForm
            action={availabilityAction}
            submitLabel={tl.availability.confirm}
            className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
          >
            <input type="hidden" name="id" value={listing.id} />
            <div>
              <label className="label" htmlFor="av-status">
                {tl.availability.status}
              </label>
              <select
                className="input"
                id="av-status"
                name="availabilityStatus"
                defaultValue={listing.availabilityStatus}
              >
                <option value="AVAILABLE">{tl.availability.AVAILABLE}</option>
                <option value="AVAILABLE_SOON">{tl.availability.AVAILABLE_SOON}</option>
                <option value="OCCUPIED">{tl.availability.OCCUPIED}</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="av-from">
                {tl.availability.from}
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
          {fmt(tl.photos.title, { count: listing.images.length, max: MAX_IMAGES_PER_LISTING })}
        </h2>
        <p className="text-sm text-navy-600">{tl.photos.help}</p>
        <p className="mt-1 text-sm text-navy-600">{tl.photos.tip}</p>
        {hasPhotos ? (
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {listing.images.map((img, i) => (
              <li key={img.id} className="relative overflow-hidden rounded-xl border border-navy-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl(img.id, "thumb")} alt="" className="aspect-[4/3] w-full object-cover" />
                {i === 0 ? (
                  <span className="absolute bottom-1 left-1 rounded-full bg-navy-900/80 px-2 py-0.5 text-xs font-semibold text-white">
                    {tl.photos.cover}
                  </span>
                ) : null}
                {editable ? (
                  <form action={removeImageAction} className="absolute top-1 right-1">
                    <input type="hidden" name="id" value={listing.id} />
                    <input type="hidden" name="imageId" value={img.id} />
                    <button
                      type="submit"
                      className="rounded-full bg-white/90 px-2 py-1 text-xs font-semibold text-red-700 shadow"
                    >
                      {tl.photos.remove}
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
            submitLabel={tl.photos.upload}
            pendingLabel={tl.photos.uploading}
            submitClassName={hasPhotos ? "btn-secondary" : "btn-primary"}
            encType="multipart/form-data"
            className="mt-4 space-y-3"
            resetOnSuccess
            autoSubmit
          >
            <input type="hidden" name="id" value={listing.id} />
            <label className="label" htmlFor="images">
              {tl.photos.add}
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

        {canSubmit ? (
          <div className="mt-5 border-t border-navy-100 pt-5">
            <p className="mb-3 text-sm font-semibold text-navy-800">
              {hasPhotos ? tl.nextSubmit : tl.nextPhotos}
            </p>
            <ActionForm
              action={listingStatusAction}
              submitLabel={tl.submit}
              submitClassName={hasPhotos ? "btn-primary w-full sm:w-auto" : "btn-secondary w-full sm:w-auto"}
              className="space-y-3"
            >
              <input type="hidden" name="id" value={listing.id} />
              <input type="hidden" name="op" value="submit" />
            </ActionForm>
          </div>
        ) : null}
      </section>

      {editable ? (
        <details className="group card mb-6" open={listing.status === "REJECTED" || undefined}>
          <summary className="flex cursor-pointer list-none items-center justify-between p-5 font-bold [&::-webkit-details-marker]:hidden">
            {tl.editDetails}
            <ChevronDown
              className="h-5 w-5 text-navy-500 transition-transform group-open:rotate-180"
              aria-hidden
            />
          </summary>
          <div className="border-t border-navy-100 p-4 sm:p-5">
            <ListingForm
              action={updateListingAction}
              role={actor.role === "AGENT" ? "AGENT" : "LANDLORD"}
              t={t.property}
              tf={tl.form}
              submitLabel={listing.status === "PUBLISHED" ? tl.saveChangesReview : tl.saveChanges}
              defaults={{
                ...listing,
                latitude: listing.latitude?.toString() ?? null,
                longitude: listing.longitude?.toString() ?? null,
                availableFrom: listing.availableFrom?.toISOString().slice(0, 10) ?? null,
              }}
            />
          </div>
        </details>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Link href={`/dashboard/verification?property=${listing.id}`} className="btn-ghost">
          {tl.addEvidence}
        </Link>
        {listing.status !== "ARCHIVED" && listing.status !== "SUSPENDED" ? (
          <ActionForm
            action={listingStatusAction}
            submitLabel={tl.archive}
            submitClassName="btn-ghost text-navy-600"
            className="contents"
          >
            <input type="hidden" name="id" value={listing.id} />
            <input type="hidden" name="op" value="archive" />
          </ActionForm>
        ) : null}
      </div>
    </>
  );
}
