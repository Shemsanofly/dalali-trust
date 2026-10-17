import Link from "next/link";
import { Notice, PageHeader } from "@/components/ui/basics";
import { requirePageActor } from "@/server/session";
import { moderationQueue } from "@/server/services/moderation-queue";
import { adminMetrics } from "@/server/services/users";

export default async function AdminOverview() {
  const actor = await requirePageActor({ roles: ["ADMIN"] });
  const [m, queue] = await Promise.all([adminMetrics(actor), moderationQueue()]);
  const pending = m.listingsByStatus.find((s) => s.status === "PENDING_REVIEW")?._count._all ?? 0;
  const published = m.listingsByStatus.find((s) => s.status === "PUBLISHED")?._count._all ?? 0;
  const tiles = [
    { label: "Listings awaiting review", value: pending, href: "/admin/listings" },
    { label: "Verification requests waiting", value: m.pendingVerifications, href: "/admin/verifications" },
    { label: "Open reports", value: m.openReports, href: "/admin/reports" },
    { label: "Published listings", value: published, href: "/admin/listings?status=PUBLISHED" },
    { label: "New users (30 days)", value: m.newUsers30, href: "/admin/users" },
    { label: "Viewing requests (30 days)", value: m.viewings30, href: "/admin" },
    { label: "Feedback messages (30 days)", value: m.feedback30, href: "/admin/feedback" },
  ];
  return (
    <>
      <PageHeader title="Operations overview" />
      {queue.urgentReports ? (
        <div className="mb-4">
          <Notice tone="red">
            {queue.urgentReports} urgent report{queue.urgentReports === 1 ? "" : "s"} (payment before viewing
            or impersonation) — handle today.{" "}
            <Link href="/admin/reports" className="font-semibold underline">
              Open reports
            </Link>
          </Notice>
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map((tile) => (
          <Link key={tile.label} href={tile.href} className="card p-4 hover:border-brand-300">
            <p className="text-2xl font-extrabold">{tile.value}</p>
            <p className="text-sm text-navy-600">{tile.label}</p>
          </Link>
        ))}
      </div>
      <div className="mt-6 grid gap-6 md:grid-cols-3">
        <Table title="Users by role" rows={m.usersByRole.map((r) => [r.role, r._count._all])} />
        <Table title="Listings by status" rows={m.listingsByStatus.map((r) => [r.status, r._count._all])} />
        <Table title="Product events (30 days)" rows={m.events30.map((r) => [r.name, r._count._all])} />
      </div>
    </>
  );
}

function Table({ title, rows }: { title: string; rows: [string, number][] }) {
  return (
    <section className="card p-4">
      <h2 className="mb-2 font-bold">{title}</h2>
      {rows.length ? (
        <table className="w-full text-sm">
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k} className="border-t border-navy-100">
                <td className="py-1.5">{k}</td>
                <td className="py-1.5 text-right font-semibold">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-sm text-navy-500">No data yet.</p>
      )}
    </section>
  );
}
