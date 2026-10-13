import Link from "next/link";
import { notFound } from "next/navigation";
import { userAdminAction } from "@/app/actions/admin";
import { ActionForm } from "@/components/ui/action-form";
import { PageHeader, StatusBadge } from "@/components/ui/basics";
import { formatDateTime } from "@/lib/dates";
import { isAppError } from "@/server/errors";
import { requirePageActor } from "@/server/session";
import { getUserForAdmin } from "@/server/services/users";

export default async function AdminUserDetail({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePageActor({ roles: ["ADMIN"] });
  const { id } = await params;
  let u;
  try {
    u = await getUserForAdmin(actor, id);
  } catch (e) {
    if (isAppError(e) && e.code === "NOT_FOUND") notFound();
    throw e;
  }
  const self = u.id === actor.id;
  return (
    <>
      <PageHeader
        title={u.name}
        subtitle={
          <span className="flex gap-2">
            {u.email} · {u.role} <StatusBadge status={u.status} />
          </span>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="space-y-6 text-sm">
          <section className="card p-5">
            <h2 className="mb-2 font-bold">Account</h2>
            <p>Phone: {u.phoneNumber ?? "—"}</p>
            <p>Joined: {formatDateTime(u.createdAt)}</p>
            {u.suspendedReason ? (
              <p className="text-red-700">
                Suspended {u.suspendedAt ? formatDateTime(u.suspendedAt) : ""}: {u.suspendedReason}
              </p>
            ) : null}
            {u.advertiserProfile ? (
              <p className="mt-2">
                Public name: {u.advertiserProfile.displayName}{" "}
                {u.advertiserProfile.agencyName ? `(${u.advertiserProfile.agencyName})` : ""}
              </p>
            ) : null}
          </section>
          <List
            title="Listings"
            items={u.properties.map((p) => ({
              href: `/admin/listings/${p.id}`,
              label: p.title,
              status: p.status,
            }))}
          />
          <List
            title="Verification"
            items={u.verificationRequests.map((v) => ({
              href: `/admin/verifications/${v.id}`,
              label: v.type,
              status: v.status,
            }))}
          />
          <List
            title="Reports against this account"
            items={u.reportsAgainst.map((r) => ({
              href: `/admin/reports/${r.id}`,
              label: r.category,
              status: r.status,
            }))}
          />
          <List
            title="Reports filed by this account"
            items={u.reportsFiled.map((r) => ({
              href: `/admin/reports/${r.id}`,
              label: r.category,
              status: r.status,
            }))}
          />
          <section className="card p-5">
            <h2 className="mb-2 font-bold">Moderation history</h2>
            {u.moderationTargets.length ? (
              <ul className="space-y-1">
                {u.moderationTargets.map((a) => (
                  <li key={a.id}>
                    {a.action} by {a.actor.name}, {formatDateTime(a.createdAt)} — {a.reason}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-navy-500">None.</p>
            )}
          </section>
        </div>
        <aside className="space-y-6">
          {self ? (
            <p className="card p-5 text-sm text-navy-600">You cannot change your own role or status.</p>
          ) : u.status === "DELETED" ? null : (
            <>
              <section className="card p-5">
                <h2 className="mb-2 font-bold">Change role</h2>
                <ActionForm action={userAdminAction} submitLabel="Change role" className="space-y-3">
                  <input type="hidden" name="id" value={u.id} />
                  <input type="hidden" name="op" value="role" />
                  <select name="role" defaultValue={u.role} className="input" aria-label="Role">
                    <option value="TENANT">Tenant</option>
                    <option value="LANDLORD">Landlord</option>
                    <option value="AGENT">Agent</option>
                    <option value="ADMIN">Administrator</option>
                  </select>
                  <textarea
                    name="reason"
                    className="input"
                    rows={2}
                    placeholder="Reason (required, recorded)"
                    aria-label="Reason"
                    required
                  />
                </ActionForm>
              </section>
              <section className="card p-5">
                <h2 className="mb-2 font-bold">
                  {u.status === "SUSPENDED" ? "Reinstate account" : "Suspend account"}
                </h2>
                <p className="mb-2 text-xs text-navy-500">
                  Suspension signs the user out, hides their listings and blocks sign-in. It is reversible.
                </p>
                <ActionForm
                  action={userAdminAction}
                  submitLabel={u.status === "SUSPENDED" ? "Reinstate" : "Suspend"}
                  submitClassName={u.status === "SUSPENDED" ? "btn-primary" : "btn-danger"}
                  className="space-y-3"
                >
                  <input type="hidden" name="id" value={u.id} />
                  <input type="hidden" name="op" value={u.status === "SUSPENDED" ? "reinstate" : "suspend"} />
                  <textarea
                    name="reason"
                    className="input"
                    rows={2}
                    placeholder="Reason (required, recorded)"
                    aria-label="Reason"
                    required
                  />
                </ActionForm>
              </section>
            </>
          )}
        </aside>
      </div>
    </>
  );
}

function List({ title, items }: { title: string; items: { href: string; label: string; status: string }[] }) {
  return (
    <section className="card p-5">
      <h2 className="mb-2 font-bold">{title}</h2>
      {items.length ? (
        <ul className="space-y-1">
          {items.map((i) => (
            <li key={i.href}>
              <Link href={i.href} className="underline">
                {i.label}
              </Link>{" "}
              <StatusBadge status={i.status} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-navy-500">None.</p>
      )}
    </section>
  );
}
