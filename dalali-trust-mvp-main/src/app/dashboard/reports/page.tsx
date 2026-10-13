import Link from "next/link";
import { appealAction, reportInfoAction } from "@/app/actions/tenant";
import { ActionForm } from "@/components/ui/action-form";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui/basics";
import { getDictionary } from "@/i18n/server";
import { formatDate } from "@/lib/dates";
import { requirePageActor } from "@/server/session";
import { listMyReports, listReportsAgainstMe } from "@/server/services/reports";

export default async function ReportsPage() {
  const actor = await requirePageActor();
  const { locale, t } = await getDictionary();
  const [mine, against] = await Promise.all([listMyReports(actor), listReportsAgainstMe(actor)]);
  return (
    <>
      <PageHeader title={t.dashboard.reports} subtitle={t.report.intro} />
      {mine.length === 0 ? (
        <EmptyState title={t.dashboard.emptyReports} />
      ) : (
        <ul className="space-y-3">
          {mine.map((r) => (
            <li key={r.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{t.report.categories[r.category]}</p>
                  {r.property ? (
                    <Link href={`/properties/${r.property.slug}`} className="text-sm underline">
                      {r.property.title}
                    </Link>
                  ) : null}
                  <p className="text-xs text-navy-500">{formatDate(r.createdAt, locale)}</p>
                </div>
                <StatusBadge status={r.status} label={t.report.statuses[r.status]} />
              </div>
              {r.publicResponse ? (
                <p className="mt-2 rounded-lg bg-navy-50 p-3 text-sm">{r.publicResponse}</p>
              ) : null}
              {r.status === "INFO_REQUESTED" ? (
                <ActionForm
                  action={reportInfoAction}
                  submitLabel={t.common.submit}
                  className="mt-3 space-y-2"
                >
                  <input type="hidden" name="id" value={r.id} />
                  <label className="label" htmlFor={`info-${r.id}`}>
                    {t.report.statuses.INFO_REQUESTED}
                  </label>
                  <textarea
                    className="input"
                    id={`info-${r.id}`}
                    name="info"
                    rows={3}
                    minLength={5}
                    maxLength={2000}
                    required
                  />
                </ActionForm>
              ) : null}
              {r.status === "DISMISSED" && !r.appealedAt ? (
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm font-semibold text-brand-700">
                    Appeal this decision
                  </summary>
                  <ActionForm action={appealAction} submitLabel="Submit appeal" className="mt-2 space-y-2">
                    <input type="hidden" name="id" value={r.id} />
                    <textarea
                      className="input"
                      name="note"
                      rows={3}
                      minLength={10}
                      maxLength={2000}
                      required
                      aria-label="Appeal reason"
                    />
                  </ActionForm>
                </details>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {against.length ? (
        <section className="mt-10">
          <h2 className="mb-1 text-lg font-bold">Decisions about your listings</h2>
          <p className="mb-3 text-sm text-navy-600">
            You can appeal a decision once. Reporters&apos; identities are kept confidential.
          </p>
          <ul className="space-y-3">
            {against.map((r) => (
              <li key={r.id} className="card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{t.report.categories[r.category]}</p>
                    {r.property ? <p className="text-sm text-navy-600">{r.property.title}</p> : null}
                  </div>
                  <StatusBadge status={r.status} label={t.report.statuses[r.status]} />
                </div>
                {r.publicResponse ? (
                  <p className="mt-2 rounded-lg bg-navy-50 p-3 text-sm">{r.publicResponse}</p>
                ) : null}
                {r.status === "ACTION_TAKEN" && !r.appealedAt ? (
                  <ActionForm action={appealAction} submitLabel="Submit appeal" className="mt-3 space-y-2">
                    <input type="hidden" name="id" value={r.id} />
                    <textarea
                      className="input"
                      name="note"
                      rows={3}
                      minLength={10}
                      maxLength={2000}
                      required
                      aria-label="Appeal reason"
                      placeholder="Explain why this decision should be reconsidered"
                    />
                  </ActionForm>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
