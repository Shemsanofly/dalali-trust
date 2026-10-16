import Link from "next/link";
import {
  addEvidenceAction,
  removeEvidenceAction,
  startVerificationAction,
  submitVerificationAction,
} from "@/app/actions/verification";
import { ActionForm } from "@/components/ui/action-form";
import { Notice, PageHeader, StatusBadge } from "@/components/ui/basics";
import { fmt } from "@/i18n";
import { getDictionary } from "@/i18n/server";
import { formatDate } from "@/lib/dates";
import { prisma } from "@/server/db";
import { requirePageActor } from "@/server/session";
import { ALLOWED_EVIDENCE, listMyVerifications } from "@/server/services/verification";

export default async function VerificationPage({
  searchParams,
}: {
  searchParams: Promise<{ property?: string }>;
}) {
  const actor = await requirePageActor({ roles: ["LANDLORD", "AGENT"] });
  const { property } = await searchParams;
  const { locale, t } = await getDictionary();
  const tv = t.landlord.verification;
  const [requests, listings] = await Promise.all([
    listMyVerifications(actor),
    prisma.property.findMany({
      where: { advertiserId: actor.id, status: { not: "ARCHIVED" } },
      select: { id: true, title: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return (
    <>
      <PageHeader title={t.dashboard.verification} subtitle={tv.subtitle} />
      <Notice tone="blue">
        {tv.privacy}{" "}
        <Link href="/verification" className="font-semibold underline">
          {tv.whatEachMeans}
        </Link>
      </Notice>

      <section className="mt-6 grid gap-3 sm:grid-cols-2">
        {(["IDENTITY", "ADVERTISER_ROLE"] as const).map((type) => (
          <div key={type} className="card p-4">
            <h2 className="font-bold">{t.trust.checks[type]}</h2>
            <p className="mt-1 text-sm text-navy-600">{tv.help[type]}</p>
            <ActionForm
              action={startVerificationAction}
              submitLabel={tv.start}
              submitClassName="btn-secondary mt-3"
            >
              <input type="hidden" name="type" value={type} />
            </ActionForm>
          </div>
        ))}
        <div className="card p-4 sm:col-span-2">
          <h2 className="font-bold">{t.trust.checks.PROPERTY_EVIDENCE}</h2>
          <p className="mt-1 text-sm text-navy-600">{tv.help.PROPERTY_EVIDENCE}</p>
          {listings.length ? (
            <ActionForm
              action={startVerificationAction}
              submitLabel={tv.startForListing}
              submitClassName="btn-secondary"
              className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-start"
            >
              <input type="hidden" name="type" value="PROPERTY_EVIDENCE" />
              <select name="propertyId" className="input" defaultValue={property} aria-label={tv.listing}>
                {listings.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.title}
                  </option>
                ))}
              </select>
            </ActionForm>
          ) : (
            <p className="mt-2 text-sm text-navy-500">{tv.createListingFirst}</p>
          )}
        </div>
      </section>

      <h2 className="mt-8 mb-3 text-lg font-bold">{tv.yourRequests}</h2>
      {requests.length === 0 ? <p className="text-sm text-navy-600">{tv.none}</p> : null}
      <ul className="space-y-4">
        {requests.map((r) => {
          const editable = r.status === "DRAFT" || r.status === "MORE_INFO_REQUIRED";
          return (
            <li key={r.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-bold">{t.trust.checks[r.type]}</p>
                  {r.property ? <p className="text-sm text-navy-600">{r.property.title}</p> : null}
                  <p className="text-xs text-navy-500">
                    {fmt(tv.started, { date: formatDate(r.createdAt, locale) })}
                  </p>
                </div>
                <StatusBadge
                  status={r.status}
                  label={
                    r.status === "DRAFT"
                      ? t.landlord.statuses.NOT_SUBMITTED
                      : t.landlord.statuses[r.status as keyof typeof t.landlord.statuses]
                  }
                />
              </div>
              {r.decisionReason && r.status !== "VERIFIED" ? (
                <p className="mt-2 rounded-lg bg-gold-50 p-3 text-sm">
                  {fmt(tv.reviewer, { note: r.decisionReason })}
                </p>
              ) : null}
              {r.status === "VERIFIED" ? (
                <div className="mt-2 rounded-lg bg-brand-50 p-3 text-sm">
                  <p>{r.scopeStatement}</p>
                  <p className="mt-1 text-xs text-navy-600">
                    {fmt(tv.checked, {
                      date: r.decidedAt ? formatDate(r.decidedAt, locale) : "",
                      until: r.expiresAt ? formatDate(r.expiresAt, locale) : "—",
                    })}
                  </p>
                </div>
              ) : null}

              {r.evidence.length ? (
                <ul className="mt-3 divide-y divide-navy-100 text-sm">
                  {r.evidence.map((e) => (
                    <li key={e.id} className="flex items-center justify-between gap-2 py-2">
                      <a href={`/api/evidence/${e.id}`} className="underline" target="_blank" rel="noopener">
                        {tv.evidence[e.kind]}
                      </a>
                      {editable ? (
                        <form action={removeEvidenceAction}>
                          <input type="hidden" name="evidenceId" value={e.id} />
                          <button type="submit" className="text-xs font-semibold text-red-700 underline">
                            {tv.remove}
                          </button>
                        </form>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}

              {editable ? (
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <ActionForm
                    action={addEvidenceAction}
                    submitLabel={tv.upload}
                    submitClassName="btn-secondary"
                    encType="multipart/form-data"
                    resetOnSuccess
                  >
                    <input type="hidden" name="requestId" value={r.id} />
                    <label className="label" htmlFor={`kind-${r.id}`}>
                      {tv.documentType}
                    </label>
                    <select className="input" id={`kind-${r.id}`} name="kind">
                      {ALLOWED_EVIDENCE[r.type].map((k) => (
                        <option key={k} value={k}>
                          {tv.evidence[k]}
                        </option>
                      ))}
                    </select>
                    <input
                      className="input"
                      type="file"
                      name="file"
                      accept="application/pdf,image/jpeg,image/png,image/webp"
                      required
                      aria-label={tv.file}
                    />
                  </ActionForm>
                  <ActionForm action={submitVerificationAction} submitLabel={tv.submit}>
                    <input type="hidden" name="requestId" value={r.id} />
                    <label className="label" htmlFor={`note-${r.id}`}>
                      {tv.noteForReviewer}
                    </label>
                    <textarea className="input" id={`note-${r.id}`} name="note" rows={3} maxLength={1000} />
                  </ActionForm>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </>
  );
}
