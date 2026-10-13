import Link from "next/link";
import { notFound } from "next/navigation";
import { decideVerificationAction } from "@/app/actions/admin";
import { ActionForm } from "@/components/ui/action-form";
import { Notice, PageHeader, StatusBadge } from "@/components/ui/basics";
import { formatDateTime } from "@/lib/dates";
import { isAppError } from "@/server/errors";
import { requirePageActor } from "@/server/session";
import { DEFAULT_SCOPE, getVerificationForReview } from "@/server/services/verification";

export default async function AdminVerificationDetail({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePageActor({ roles: ["ADMIN"] });
  const { id } = await params;
  let v;
  try {
    v = await getVerificationForReview(actor, id);
  } catch (e) {
    if (isAppError(e) && e.code === "NOT_FOUND") notFound();
    throw e;
  }
  const own = v.subjectUser.id === actor.id;
  return (
    <>
      <PageHeader title={`${v.type} verification`} subtitle={<StatusBadge status={v.status} />} />
      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="space-y-6">
          <section className="card p-5 text-sm">
            <h2 className="mb-2 font-bold">Applicant</h2>
            <Link href={`/admin/users/${v.subjectUser.id}`} className="font-semibold underline">
              {v.subjectUser.name}
            </Link>
            <p>
              {v.subjectUser.email} · {v.subjectUser.role} · {v.subjectUser.phoneNumber ?? "no phone"}
            </p>
            <p className="text-navy-500">Account created {formatDateTime(v.subjectUser.createdAt)}</p>
            {v.property ? (
              <p className="mt-2">
                Property:{" "}
                <Link href={`/admin/listings/${v.property.id}`} className="underline">
                  {v.property.title}
                </Link>{" "}
                ({v.property.neighborhood}, {v.property.district})
              </p>
            ) : null}
            {v.applicantNote ? (
              <p className="mt-2 rounded-lg bg-navy-50 p-3">Applicant note: {v.applicantNote}</p>
            ) : null}
          </section>
          <section className="card p-5 text-sm">
            <h2 className="mb-2 font-bold">Evidence</h2>
            <Notice tone="amber">
              Opening a document is recorded in the audit log. Do not download documents to personal devices.
            </Notice>
            <ul className="mt-3 divide-y divide-navy-100">
              {v.evidence.map((e) => (
                <li key={e.id} className="flex justify-between py-2">
                  {e.purgedAt ? (
                    <span className="text-navy-500">{e.kind} (purged)</span>
                  ) : (
                    <a href={`/api/evidence/${e.id}`} target="_blank" rel="noopener" className="underline">
                      {e.kind} ({e.mimeType}, {Math.round(e.sizeBytes / 1024)} KB)
                    </a>
                  )}
                  <span className="text-navy-500">{formatDateTime(e.createdAt)}</span>
                </li>
              ))}
            </ul>
          </section>
          <section className="card p-5 text-sm">
            <h2 className="mb-2 font-bold">History</h2>
            {v.moderationActions.length ? (
              <ul className="space-y-1">
                {v.moderationActions.map((a) => (
                  <li key={a.id}>
                    {a.action} by {a.actor.name}, {formatDateTime(a.createdAt)} — {a.reason}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-navy-500">No decisions yet.</p>
            )}
            {v.scopeStatement ? (
              <p className="mt-2 rounded-lg bg-brand-50 p-3">Recorded scope: {v.scopeStatement}</p>
            ) : null}
          </section>
        </div>
        <aside>
          {v.status === "PENDING_REVIEW" && !own ? (
            <section className="card p-5">
              <h2 className="mb-2 font-bold">Decision</h2>
              <ActionForm
                action={decideVerificationAction}
                submitLabel="Record decision"
                className="space-y-3"
              >
                <input type="hidden" name="id" value={v.id} />
                <select name="decision" className="input" aria-label="Decision">
                  <option value="VERIFY">Verify — the check passed</option>
                  <option value="REQUEST_INFO">Request more information</option>
                  <option value="REJECT">Reject</option>
                </select>
                <label className="label" htmlFor="reason">
                  Reason (recorded, shown to applicant if not verified)
                </label>
                <textarea id="reason" name="reason" className="input" rows={3} required maxLength={1000} />
                <label className="label" htmlFor="scope">
                  Scope statement (shown publicly if verified)
                </label>
                <textarea
                  id="scope"
                  name="scopeStatement"
                  className="input"
                  rows={5}
                  maxLength={1000}
                  defaultValue={DEFAULT_SCOPE[v.type]}
                />
                <p className="text-xs text-navy-500">
                  Describe exactly what you checked. Never state or imply legal ownership.
                </p>
              </ActionForm>
            </section>
          ) : own ? (
            <Notice tone="red">You cannot review your own verification request.</Notice>
          ) : v.status === "MORE_INFO_REQUIRED" ? (
            <Notice tone="amber">
              Waiting for the applicant to provide more information. Requested by{" "}
              {v.reviewer?.name ?? "a reviewer"}: {v.decisionReason}
            </Notice>
          ) : (
            <Notice tone="gray">
              Decided {v.decidedAt ? formatDateTime(v.decidedAt) : ""}{" "}
              {v.reviewer ? `by ${v.reviewer.name}` : ""}. {v.decisionReason}
            </Notice>
          )}
        </aside>
      </div>
    </>
  );
}
