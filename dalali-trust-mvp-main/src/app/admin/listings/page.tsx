import Link from "next/link";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui/basics";
import type { ListingStatus } from "@/generated/prisma/enums";
import { formatDateTime } from "@/lib/dates";
import { formatTZS } from "@/lib/money";
import { requirePageActor } from "@/server/session";
import { listModerationQueue } from "@/server/services/listings";

const STATUSES: ListingStatus[] = [
  "PENDING_REVIEW",
  "PUBLISHED",
  "SUSPENDED",
  "REJECTED",
  "DRAFT",
  "ARCHIVED",
];

export default async function AdminListings({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const actor = await requirePageActor({ roles: ["ADMIN"] });
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status as ListingStatus)
    ? (sp.status as ListingStatus)
    : "PENDING_REVIEW";
  const items = await listModerationQueue(actor, status);
  return (
    <>
      <PageHeader title="Listing moderation" subtitle="Oldest submissions first." />
      <div className="mb-4 flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/listings?status=${s}`}
            className={s === status ? "btn-primary" : "btn-secondary"}
          >
            {s.replace("_", " ").toLowerCase()}
          </Link>
        ))}
      </div>
      {items.length === 0 ? (
        <EmptyState title="Nothing here." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="table-stack w-full text-sm md:min-w-[640px]">
            <thead className="bg-navy-50 text-left">
              <tr>
                <th className="p-3">Listing</th>
                <th className="p-3">Advertiser</th>
                <th className="p-3">Rent</th>
                <th className="p-3">Photos / reports</th>
                <th className="p-3">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {items.map((l) => (
                <tr key={l.id} className="border-t border-navy-100">
                  <td className="p-3 max-md:py-1">
                    <Link href={`/admin/listings/${l.id}`} className="font-semibold underline">
                      {l.title}
                    </Link>
                    <div>
                      <StatusBadge status={l.status} />
                    </div>
                  </td>
                  <td data-label="Advertiser" className="p-3 max-md:py-1">
                    <Link href={`/admin/users/${l.advertiser.id}`} className="underline">
                      {l.advertiser.name}
                    </Link>
                    <div className="text-xs text-navy-500">
                      {l.advertiser.role} · {l.advertiser.status}
                    </div>
                  </td>
                  <td data-label="Rent" className="p-3 max-md:py-1">
                    {formatTZS(l.rentAmount)}
                  </td>
                  <td data-label="Photos / reports" className="p-3 max-md:py-1">
                    {l._count.images} / {l._count.reports}
                  </td>
                  <td data-label="Submitted" className="p-3 max-md:py-1">
                    {l.submittedAt ? formatDateTime(l.submittedAt) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
