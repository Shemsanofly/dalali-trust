import Link from "next/link";
import {
  addEvidenceAction,
  removeEvidenceAction,
  startVerificationAction,
  submitVerificationAction,
} from "@/app/actions/verification";
import { ActionForm } from "@/components/ui/action-form";
import { Notice, PageHeader, StatusBadge } from "@/components/ui/basics";
import type { VerificationType } from "@/generated/prisma/enums";
import { getDictionary } from "@/i18n/server";
import { formatDate } from "@/lib/dates";
import { prisma } from "@/server/db";
import { requirePageActor } from "@/server/session";
import { ALLOWED_EVIDENCE, listMyVerifications } from "@/server/services/verification";

const EVIDENCE_LABELS: Record<string, string> = {
  NATIONAL_ID: "National ID (NIDA card)",
  PASSPORT: "Passport",
  DRIVING_LICENCE: "Driving licence",
  VOTER_ID: "Voter ID",
  SELFIE_WITH_ID: "Selfie holding your ID",
  BUSINESS_LICENCE: "Business licence / registration",
  OWNER_AUTHORIZATION_LETTER: "Owner's authorisation letter",
  MANAGEMENT_AGREEMENT: "Property management agreement",
  UTILITY_BILL: "Utility bill for the property",
  PROPERTY_OWNERSHIP_DOCUMENT: "Ownership document (e.g. title or offer letter)",
  PROPERTY_PHOTO: "Photo of you at the property",
  OTHER: "Other supporting document",
};

const TYPE_HELP: Record<VerificationType, string> = {
  IDENTITY:
    "Upload a government photo ID and a selfie holding it. A reviewer confirms the name matches your account.",
  ADVERTISER_ROLE:
    "Show that you may let property: e.g. a management agreement, owner's authorisation letter, or business licence.",
  PROPERTY_EVIDENCE:
    "Link yourself to one listing: e.g. a recent utility bill or the owner's authorisation for that address.",
};

export default async function VerificationPage({
  searchParams,
}: {
  searchParams: Promise<{ property?: string }>;
}) {
  const actor = await requirePageActor({ roles: ["LANDLORD", "AGENT"] });
  const { property } = await searchParams;
  const { locale, t } = await getDictionary();
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
      <PageHeader
        title={t.dashboard.verification}
        subtitle="Optional manual checks that let tenants see who they are dealing with."
      />
      <Notice tone="blue">
        Documents are stored privately. Only you and Dalali Trust reviewers can open them, every reviewer
        access is logged, and files are deleted if you delete your account. Upload only documents you are
        entitled to share.{" "}
        <Link href="/verification" className="font-semibold underline">
          What each check means
        </Link>
      </Notice>

      <section className="mt-6 grid gap-3 sm:grid-cols-2">
        {(["IDENTITY", "ADVERTISER_ROLE"] as const).map((type) => (
          <div key={type} className="card p-4">
            <h2 className="font-bold">{t.trust.checks[type]}</h2>
            <p className="mt-1 text-sm text-navy-600">{TYPE_HELP[type]}</p>
            <ActionForm
              action={startVerificationAction}
              submitLabel="Start or continue"
              submitClassName="btn-secondary mt-3"
            >
              <input type="hidden" name="type" value={type} />
            </ActionForm>
          </div>
        ))}
        <div className="card p-4 sm:col-span-2">
          <h2 className="font-bold">{t.trust.checks.PROPERTY_EVIDENCE}</h2>
          <p className="mt-1 text-sm text-navy-600">{TYPE_HELP.PROPERTY_EVIDENCE}</p>
          {listings.length ? (
            <ActionForm
              action={startVerificationAction}
              submitLabel="Start for this listing"
              submitClassName="btn-secondary"
              className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-start"
            >
              <input type="hidden" name="type" value="PROPERTY_EVIDENCE" />
              <select name="propertyId" className="input" defaultValue={property} aria-label="Listing">
                {listings.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.title}
                  </option>
                ))}
              </select>
            </ActionForm>
          ) : (
            <p className="mt-2 text-sm text-navy-500">Create a listing first.</p>
          )}
        </div>
      </section>

      <h2 className="mt-8 mb-3 text-lg font-bold">Your requests</h2>
      {requests.length === 0 ? <p className="text-sm text-navy-600">No verification requests yet.</p> : null}
      <ul className="space-y-4">
        {requests.map((r) => {
          const editable = r.status === "DRAFT" || r.status === "MORE_INFO_REQUIRED";
          return (
            <li key={r.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-bold">{t.trust.checks[r.type]}</p>
                  {r.property ? <p className="text-sm text-navy-600">{r.property.title}</p> : null}
                  <p className="text-xs text-navy-500">Started {formatDate(r.createdAt, locale)}</p>
                </div>
                <StatusBadge status={r.status} label={r.status === "DRAFT" ? "Not submitted" : undefined} />
              </div>
              {r.decisionReason && r.status !== "VERIFIED" ? (
                <p className="mt-2 rounded-lg bg-gold-50 p-3 text-sm">Reviewer: {r.decisionReason}</p>
              ) : null}
              {r.status === "VERIFIED" ? (
                <div className="mt-2 rounded-lg bg-brand-50 p-3 text-sm">
                  <p>{r.scopeStatement}</p>
                  <p className="mt-1 text-xs text-navy-600">
                    Checked {r.decidedAt ? formatDate(r.decidedAt, locale) : ""} · valid until{" "}
                    {r.expiresAt ? formatDate(r.expiresAt, locale) : "—"}
                  </p>
                </div>
              ) : null}

              {r.evidence.length ? (
                <ul className="mt-3 divide-y divide-navy-100 text-sm">
                  {r.evidence.map((e) => (
                    <li key={e.id} className="flex items-center justify-between gap-2 py-2">
                      <a href={`/api/evidence/${e.id}`} className="underline" target="_blank" rel="noopener">
                        {EVIDENCE_LABELS[e.kind]}
                      </a>
                      {editable ? (
                        <form action={removeEvidenceAction}>
                          <input type="hidden" name="evidenceId" value={e.id} />
                          <button type="submit" className="text-xs font-semibold text-red-700 underline">
                            Remove
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
                    submitLabel="Upload document"
                    submitClassName="btn-secondary"
                    encType="multipart/form-data"
                    resetOnSuccess
                  >
                    <input type="hidden" name="requestId" value={r.id} />
                    <label className="label" htmlFor={`kind-${r.id}`}>
                      Document type
                    </label>
                    <select className="input" id={`kind-${r.id}`} name="kind">
                      {ALLOWED_EVIDENCE[r.type].map((k) => (
                        <option key={k} value={k}>
                          {EVIDENCE_LABELS[k]}
                        </option>
                      ))}
                    </select>
                    <input
                      className="input"
                      type="file"
                      name="file"
                      accept="application/pdf,image/jpeg,image/png,image/webp"
                      required
                      aria-label="File"
                    />
                  </ActionForm>
                  <ActionForm action={submitVerificationAction} submitLabel="Submit for review">
                    <input type="hidden" name="requestId" value={r.id} />
                    <label className="label" htmlFor={`note-${r.id}`}>
                      Note for the reviewer ({t.common.optional})
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
