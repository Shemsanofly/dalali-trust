import Link from "next/link";
import { notFound } from "next/navigation";
import { decideReportAction } from "@/app/actions/admin";
import { ActionForm } from "@/components/ui/action-form";
import { Notice, PageHeader, StatusBadge } from "@/components/ui/basics";
import { formatDateTime } from "@/lib/dates";
import { isAppError } from "@/server/errors";
import { requirePageActor } from "@/server/session";
import { getReportForAdmin } from "@/server/services/reports";

export default async function AdminReportDetail({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePageActor({ roles: ["ADMIN"] });
  const { id } = await params;
  let data;
  try {
    data = await getReportForAdmin(actor, id);
  } catch (e) {
    if (isAppError(e) && e.code === "NOT_FOUND") notFound();
    throw e;
  }
  const { report: r, reporterHistory, otherReportsOnTarget } = data;
  const open = ["SUBMITTED", "UNDER_REVIEW", "INFO_REQUESTED", "APPEALED"].includes(r.status);
  return (
    <>
      <PageHeader
        title={r.category.replaceAll("_", " ").toLowerCase()}
        subtitle={<StatusBadge status={r.status} />}
      />
      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="space-y-6">
          <section className="card p-5 text-sm">
            <h2 className="mb-2 font-bold">Report</h2>
            <p className="whitespace-pre-line text-navy-800">{r.description}</p>
            <p className="mt-2 text-navy-500">Submitted {formatDateTime(r.createdAt)}</p>
            {r.appealNote ? (
              <p className="mt-3 rounded-lg bg-gold-50 p-3">
                Appeal ({r.appealedAt ? formatDateTime(r.appealedAt) : ""}): {r.appealNote}
              </p>
            ) : null}
            {r.evidence.length ? (
              <ul className="mt-3">
                {r.evidence.map((e) => (
                  <li key={e.id}>
                    <a
                      href={`/api/report-evidence/${e.id}`}
                      target="_blank"
                      rel="noopener"
                      className="underline"
                    >
                      Attachment ({e.mimeType}, {Math.round(e.sizeBytes / 1024)} KB)
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
          <section className="card p-5 text-sm">
            <h2 className="mb-2 font-bold">Subject</h2>
            {r.property ? (
              <p>
                Listing:{" "}
                <Link href={`/admin/listings/${r.property.id}`} className="underline">
                  {r.property.title}
                </Link>{" "}
                <StatusBadge status={r.property.status} />
              </p>
            ) : null}
            {r.subjectUser ? (
              <p>
                Account:{" "}
                <Link href={`/admin/users/${r.subjectUser.id}`} className="underline">
                  {r.subjectUser.name}
                </Link>{" "}
                ({r.subjectUser.role}) <StatusBadge status={r.subjectUser.status} />
              </p>
            ) : null}
            <p className="mt-1 text-navy-600">Other reports about this listing: {otherReportsOnTarget}</p>
          </section>
          <section className="card p-5 text-sm">
            <h2 className="mb-2 font-bold">Reporter</h2>
            <p>
              {r.reporter.name} · {r.reporter.email} · joined {formatDateTime(r.reporter.createdAt)}
            </p>
            <p className="mt-1 text-navy-600">
              Report history:{" "}
              {reporterHistory.map((h) => `${h.status.toLowerCase()}: ${h._count._all}`).join(", ")}
            </p>
            <p className="mt-1 text-xs text-navy-500">
              Many dismissed reports may indicate malicious or retaliatory reporting.
            </p>
          </section>
          <section className="card p-5 text-sm">
            <h2 className="mb-2 font-bold">History</h2>
            {r.moderationActions.length ? (
              <ul className="space-y-1">
                {r.moderationActions.map((a) => (
                  <li key={a.id}>
                    {a.action} by {a.actor.name}, {formatDateTime(a.createdAt)} — {a.reason}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-navy-500">No actions yet.</p>
            )}
            {r.internalNote ? (
              <p className="mt-2 rounded-lg bg-navy-50 p-3">Internal note: {r.internalNote}</p>
            ) : null}
          </section>
        </div>
        <aside>
          {open ? (
            <section className="card p-5">
              <h2 className="mb-2 font-bold">Decision</h2>
              <Notice tone="blue">
                Do not label anyone a criminal. Record facts and the action taken. Suspensions should be
                proportionate and reversible.
              </Notice>
              <ActionForm
                action={decideReportAction}
                submitLabel="Record decision"
                className="mt-3 space-y-3"
              >
                <input type="hidden" name="id" value={r.id} />
                <select name="decision" className="input" aria-label="Decision">
                  {r.status === "SUBMITTED" ? <option value="START_REVIEW">Start review</option> : null}
                  <option value="REQUEST_INFO">Request more information from reporter</option>
                  <option value="TAKE_ACTION">Action taken</option>
                  <option value="DISMISS">Dismiss — no action</option>
                </select>
                <label className="label" htmlFor="publicResponse">
                  Response to reporter
                </label>
                <textarea
                  id="publicResponse"
                  name="publicResponse"
                  className="input"
                  rows={3}
                  maxLength={1000}
                />
                <label className="label" htmlFor="internalNote">
                  Internal note (never shown to users)
                </label>
                <textarea id="internalNote" name="internalNote" className="input" rows={2} maxLength={2000} />
                {r.property ? (
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="suspendListing" className="h-4 w-4" /> Suspend the listing
                    (with &ldquo;Action taken&rdquo;)
                  </label>
                ) : null}
                {r.subjectUser ? (
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="suspendUser" className="h-4 w-4" /> Suspend the
                    advertiser&apos;s account (with &ldquo;Action taken&rdquo;)
                  </label>
                ) : null}
              </ActionForm>
            </section>
          ) : (
            <Notice tone="gray">
              Resolved {r.resolvedAt ? formatDateTime(r.resolvedAt) : ""}. {r.publicResponse}
            </Notice>
          )}
        </aside>
      </div>
    </>
  );
}
