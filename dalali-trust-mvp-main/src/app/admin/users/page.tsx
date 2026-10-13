import Link from "next/link";
import { PageHeader, Pagination, StatusBadge } from "@/components/ui/basics";
import type { Role } from "@/generated/prisma/enums";
import { formatDate } from "@/lib/dates";
import { requirePageActor } from "@/server/session";
import { listUsers } from "@/server/services/users";

const ROLES: Role[] = ["TENANT", "LANDLORD", "AGENT", "ADMIN"];

export default async function AdminUsers({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; page?: string }>;
}) {
  const actor = await requirePageActor({ roles: ["ADMIN"] });
  const sp = await searchParams;
  const role = ROLES.includes(sp.role as Role) ? (sp.role as Role) : undefined;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const data = await listUsers(actor, { q: sp.q, role, page });
  return (
    <>
      <PageHeader title="Users" subtitle={`${data.total} accounts`} />
      <form method="get" className="mb-4 flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={sp.q ?? ""}
          className="input max-w-xs"
          placeholder="Name or email"
          aria-label="Search users"
        />
        <select name="role" defaultValue={role ?? ""} className="input max-w-[12rem]" aria-label="Role">
          <option value="">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <button type="submit" className="btn-secondary">
          Filter
        </button>
      </form>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-navy-50 text-left">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Role</th>
              <th className="p-3">Status</th>
              <th className="p-3">Listings</th>
              <th className="p-3">Reports against</th>
              <th className="p-3">Joined</th>
            </tr>
          </thead>
          <tbody>
            {data.users.map((u) => (
              <tr key={u.id} className="border-t border-navy-100">
                <td className="p-3">
                  <Link href={`/admin/users/${u.id}`} className="font-semibold underline">
                    {u.name}
                  </Link>
                  <div className="text-xs text-navy-500">{u.email}</div>
                </td>
                <td className="p-3">{u.role}</td>
                <td className="p-3">
                  <StatusBadge status={u.status} />
                </td>
                <td className="p-3">{u._count.properties}</td>
                <td className="p-3">{u._count.reportsAgainst}</td>
                <td className="p-3">{formatDate(u.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        page={data.page}
        pageCount={data.pageCount}
        hrefFor={(p) =>
          `/admin/users?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), ...(role ? { role } : {}), page: String(p) })}`
        }
        labels={{ previous: "Previous", next: "Next", page: `Page ${data.page} of ${data.pageCount}` }}
      />
    </>
  );
}
