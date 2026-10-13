import Link from "next/link";
import { notFound } from "next/navigation";
import { moderateListingAction } from "@/app/actions/admin";
import { CostBreakdown } from "@/components/property/cost-breakdown";
import { imageUrl } from "@/components/property/property-card";
import { ActionForm } from "@/components/ui/action-form";
import { Notice, PageHeader, StatusBadge } from "@/components/ui/basics";
import { getDictionary } from "@/i18n/server";
import { formatDateTime } from "@/lib/dates";
import { regionName } from "@/lib/locations";
import { isAppError } from "@/server/errors";
import { requirePageActor } from "@/server/session";
import { findPossibleDuplicates, getListingForAdmin } from "@/server/services/listings";

export default async function AdminListingDetail({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePageActor({ roles: ["ADMIN"] });
  const { id } = await params;
  const { locale, t } = await getDictionary();
  let l;
  try {
    l = await getListingForAdmin(actor, id);
  } catch (e) {
    if (isAppError(e) && e.code === "NOT_FOUND") notFound();
    throw e;
  }
  const duplicates = await findPossibleDuplicates(actor, id);
  const decisions =
    l.status === "PENDING_REVIEW"
      ? [
          ["APPROVE", "Approve and publish"],
          ["REJECT", "Reject (reason required)"],
          ["SUSPEND", "Suspend (reason required)"],
        ]
      : l.status === "PUBLISHED"
        ? [["SUSPEND", "Suspend (reason required)"]]
        : l.status === "SUSPENDED"
          ? [["REINSTATE", "Reinstate (reason required)"]]
          : [];

  return (
    <>
      <PageHeader
        title={l.title}
        subtitle={<StatusBadge status={l.status} />}
        actions={
          <Link href={`/properties/${l.slug}`} className="btn-secondary">
            Preview as page
          </Link>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="mb-2 font-bold">Photos ({l.images.length})</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {l.images.map((img) => (
                <a key={img.id} href={imageUrl(img.id)} target="_blank" rel="noopener">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl(img.id, "thumb")}
                    alt=""
                    className="aspect-[4/3] w-full rounded-lg object-cover"
                  />
                </a>
              ))}
            </div>
          </section>
          <section className="card p-5 text-sm">
            <h2 className="mb-2 font-bold">Details</h2>
            <p>
              {t.property.types[l.propertyType]} · {l.bedrooms} bed · {l.bathrooms} bath · {l.neighborhood},{" "}
              {l.district}, {regionName(l.region)}
            </p>
            {l.streetAddress ? <p className="text-navy-600">{l.streetAddress}</p> : null}
            <p className="mt-3 whitespace-pre-line text-navy-700">{l.description}</p>
            <p className="mt-3 text-navy-600">Amenities: {l.amenities.join(", ") || "—"}</p>
            <p className="text-navy-600">
              Electricity: {l.electricity} · Water: {l.water} {l.utilityNotes ? `· ${l.utilityNotes}` : ""}
            </p>
          </section>
          <CostBreakdown t={t} locale={locale} p={l} />
          <section className="card p-5">
            <h2 className="mb-2 font-bold">Possible duplicates (review aid)</h2>
            <p className="mb-2 text-xs text-navy-500">
              Matches are prompts for a closer look, not proof of fraud. The same advertiser re-listing their
              own property is common.
            </p>
            {duplicates.length ? (
              <ul className="space-y-2 text-sm">
                {duplicates.map((d) => (
                  <li key={d.property.id}>
                    <Link href={`/admin/listings/${d.property.id}`} className="underline">
                      {d.property.title}
                    </Link>{" "}
                    <StatusBadge status={d.property.status} /> — {d.reasons.join("; ")} ·{" "}
                    {d.sameAdvertiser
                      ? "same advertiser"
                      : `different advertiser (${d.property.advertiser.name})`}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-navy-600">No similar listings found.</p>
            )}
          </section>
        </div>
        <aside className="space-y-6">
          <section className="card p-5 text-sm">
            <h2 className="mb-2 font-bold">Advertiser</h2>
            <Link href={`/admin/users/${l.advertiser.id}`} className="font-semibold underline">
              {l.advertiser.name}
            </Link>
            <p>
              {l.advertiser.email} · {l.advertiser.role} · <StatusBadge status={l.advertiser.status} />
            </p>
            <p className="text-navy-500">Joined {formatDateTime(l.advertiser.createdAt)}</p>
            <h3 className="mt-3 font-semibold">Verification</h3>
            <ul>
              {l.verificationRequests.map((v) => (
                <li key={v.id}>
                  <Link href={`/admin/verifications/${v.id}`} className="underline">
                    {v.type}
                  </Link>{" "}
                  <StatusBadge status={v.status} />
                </li>
              ))}
              {l.verificationRequests.length === 0 ? (
                <li className="text-navy-500">No property evidence submitted.</li>
              ) : null}
            </ul>
          </section>
          {decisions.length ? (
            <section className="card p-5">
              <h2 className="mb-2 font-bold">Decision</h2>
              <Notice tone="blue">
                Check: real photos, complete costs, no request for payment before viewing, plausible price for
                the area, agent authorisation.
              </Notice>
              <ActionForm
                action={moderateListingAction}
                submitLabel="Record decision"
                className="mt-3 space-y-3"
              >
                <input type="hidden" name="id" value={l.id} />
                <select name="decision" className="input" aria-label="Decision">
                  {decisions.map(([v, label]) => (
                    <option key={v} value={v}>
                      {label}
                    </option>
                  ))}
                </select>
                <textarea
                  name="reason"
                  className="input"
                  rows={3}
                  maxLength={1000}
                  placeholder="Reason shown to the advertiser"
                  aria-label="Reason"
                />
              </ActionForm>
            </section>
          ) : null}
          <section className="card p-5 text-sm">
            <h2 className="mb-2 font-bold">Reports</h2>
            {l.reports.length ? (
              <ul>
                {l.reports.map((r) => (
                  <li key={r.id}>
                    <Link href={`/admin/reports/${r.id}`} className="underline">
                      {r.category}
                    </Link>{" "}
                    <StatusBadge status={r.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-navy-500">None.</p>
            )}
          </section>
          <section className="card p-5 text-sm">
            <h2 className="mb-2 font-bold">Moderation history</h2>
            {l.moderationActions.length ? (
              <ul className="space-y-2">
                {l.moderationActions.map((a) => (
                  <li key={a.id}>
                    <span className="font-semibold">{a.action}</span> by {a.actor.name},{" "}
                    {formatDateTime(a.createdAt)} — {a.reason}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-navy-500">No decisions yet.</p>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
