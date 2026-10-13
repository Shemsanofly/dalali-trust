import Link from "next/link";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui/basics";
import type { ReportStatus } from "@/generated/prisma/enums";
import { formatDateTime } from "@/lib/dates";
import { requirePageActor } from "@/server/session";
import { listReportsForAdmin } from "@/server/services/reports";

const STATUSES: ReportStatus[] = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "INFO_REQUESTED",
  "APPEALED",
  "ACTION_TAKEN",
  "DISMISSED",
];

export default async function AdminReports({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const actor = await requirePageActor({ roles: ["ADMIN"] });
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status as ReportStatus) ? (sp.status as ReportStatus) : undefined;
  const items = await listReportsForAdmin(actor, status);
  return (
    <>
      <PageHeader
        title="Reports and complaints"
        subtitle="A report is an allegation. Review the evidence and both sides before acting."
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/admin/reports" className={!status ? "btn-primary" : "btn-secondary"}>
          all open
        </Link>
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/reports?status=${s}`}
            className={s === status ? "btn-primary" : "btn-secondary"}
          >
            {s.replaceAll("_", " ").toLowerCase()}
          </Link>
        ))}
      </div>
      {items.length === 0 ? (
        <EmptyState title="No reports here." />
      ) : (
        <ul className="space-y-2">
          {items.map((r) => (
            <li key={r.id} className="card flex flex-wrap items-center justify-between gap-2 p-4">
              <div>
                <Link href={`/admin/reports/${r.id}`} className="font-semibold underline">
                  {r.category.replaceAll("_", " ").toLowerCase()}
                </Link>
                <p className="text-sm text-navy-600">
                  {r.property
                    ? `Listing: ${r.property.title}`
                    : r.subjectUser
                      ? `Account: ${r.subjectUser.name}`
                      : ""}{" "}
                  · by {r.reporter.name} · {r._count.evidence} attachments
                </p>
              </div>
              <div className="text-right text-sm">
                <StatusBadge status={r.status} />
                <p className="text-navy-500">{formatDateTime(r.createdAt)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
