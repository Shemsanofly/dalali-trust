import Link from "next/link";
import { markNotificationsReadAction } from "@/app/actions/common";
import { EmptyState, PageHeader } from "@/components/ui/basics";
import { getDictionary } from "@/i18n/server";
import { formatDateTime } from "@/lib/dates";
import { requirePageActor } from "@/server/session";
import { notificationText } from "@/i18n/notification-text";
import { listNotifications } from "@/server/services/notifications";

export default async function NotificationsPage() {
  const actor = await requirePageActor();
  const { locale, t } = await getDictionary();
  const items = await listNotifications(actor);
  return (
    <>
      <PageHeader
        title={t.dashboard.notifications}
        actions={
          items.some((n) => !n.readAt) ? (
            <form action={markNotificationsReadAction}>
              <button type="submit" className="btn-secondary">
                {t.dashboard.markAllRead}
              </button>
            </form>
          ) : null
        }
      />
      {items.length === 0 ? (
        <EmptyState title={t.dashboard.emptyNotifications} />
      ) : (
        <ul className="card divide-y divide-navy-100">
          {items.map((n) => (
            <li key={n.id} className="p-4">
              <p className={n.readAt ? "text-navy-700" : "font-bold text-navy-900"}>
                {notificationText(t.notices, n.type, n.data)?.title ?? n.title}
              </p>
              <p className="text-sm text-navy-600">
                {notificationText(t.notices, n.type, n.data)?.body ?? n.body}
              </p>
              <p className="mt-1 text-xs text-navy-500">
                {formatDateTime(n.createdAt, locale)}
                {n.link && n.link.startsWith("/") ? (
                  <>
                    {" · "}
                    <Link href={n.link} className="underline">
                      Open
                    </Link>
                  </>
                ) : null}
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
