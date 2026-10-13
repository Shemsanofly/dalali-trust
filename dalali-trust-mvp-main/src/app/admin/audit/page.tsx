import { PageHeader, Pagination } from "@/components/ui/basics";
import { formatDateTime } from "@/lib/dates";
import { requirePageActor } from "@/server/session";
import { listAuditLog } from "@/server/services/users";

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; entity?: string }>;
}) {
  const actor = await requirePageActor({ roles: ["ADMIN"] });
  const sp = await searchParams;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const entity = sp.entity && /^[A-Za-z]{1,40}$/.test(sp.entity) ? sp.entity : undefined;
  const data = await listAuditLog(actor, { page, entityType: entity });
  return (
    <>
      <PageHeader
        title="Audit log"
        subtitle="Append-only record of security-relevant and administrative operations."
      />
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-navy-50 text-left">
            <tr>
              <th className="p-3">When</th>
              <th className="p-3">Actor</th>
              <th className="p-3">Action</th>
              <th className="p-3">Entity</th>
              <th className="p-3">Details</th>
            </tr>
          </thead>
          <tbody>
            {data.entries.map((e) => (
              <tr key={e.id} className="border-t border-navy-100 align-top">
                <td className="p-3 whitespace-nowrap">{formatDateTime(e.createdAt)}</td>
                <td className="p-3">{e.actor?.name ?? "system"}</td>
                <td className="p-3 font-mono text-xs">{e.action}</td>
                <td className="p-3 text-xs">
                  {e.entityType} {e.entityId ? <span className="text-navy-500">{e.entityId}</span> : null}
                </td>
                <td className="p-3 font-mono text-xs break-all text-navy-600">
                  {e.metadata ? JSON.stringify(e.metadata) : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        page={data.page}
        pageCount={data.pageCount}
        hrefFor={(p) => `/admin/audit?page=${p}${entity ? `&entity=${entity}` : ""}`}
        labels={{ previous: "Newer", next: "Older", page: `Page ${data.page} of ${data.pageCount}` }}
      />
    </>
  );
}
