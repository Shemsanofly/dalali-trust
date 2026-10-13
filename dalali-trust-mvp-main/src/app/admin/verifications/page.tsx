import Link from "next/link";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui/basics";
import type { VerificationStatus } from "@/generated/prisma/enums";
import { formatDateTime } from "@/lib/dates";
import { requirePageActor } from "@/server/session";
import { listVerificationQueue } from "@/server/services/verification";

const STATUSES: VerificationStatus[] = [
  "PENDING_REVIEW",
  "MORE_INFO_REQUIRED",
  "VERIFIED",
  "REJECTED",
  "EXPIRED",
];

export default async function AdminVerifications({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const actor = await requirePageActor({ roles: ["ADMIN"] });
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status as VerificationStatus)
    ? (sp.status as VerificationStatus)
    : "PENDING_REVIEW";
  const items = await listVerificationQueue(actor, status);
  return (
    <>
      <PageHeader
        title="Verification queue"
        subtitle="Manual checks only — there is no government registry integration."
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/verifications?status=${s}`}
            className={s === status ? "btn-primary" : "btn-secondary"}
          >
            {s.replaceAll("_", " ").toLowerCase()}
          </Link>
        ))}
      </div>
      {items.length === 0 ? (
        <EmptyState title="Nothing in this queue." />
      ) : (
        <ul className="space-y-2">
          {items.map((v) => (
            <li key={v.id} className="card flex flex-wrap items-center justify-between gap-2 p-4">
              <div>
                <Link href={`/admin/verifications/${v.id}`} className="font-semibold underline">
                  {v.type} — {v.subjectUser.name}
                </Link>
                <p className="text-sm text-navy-600">
                  {v.subjectUser.role} · {v._count.evidence} documents{" "}
                  {v.property ? `· ${v.property.title}` : ""}
                </p>
              </div>
              <div className="text-right text-sm">
                <StatusBadge status={v.status} />
                <p className="text-navy-500">{v.submittedAt ? formatDateTime(v.submittedAt) : "—"}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
