import { EmptyState, PageHeader } from "@/components/ui/basics";
import { formatDateTime } from "@/lib/dates";
import { requirePageActor } from "@/server/session";
import { listFeedback } from "@/server/services/users";

export default async function FeedbackPage() {
  const actor = await requirePageActor({ roles: ["ADMIN"] });
  const items = await listFeedback(actor);
  return (
    <>
      <PageHeader title="Feedback and contact messages" />
      {items.length === 0 ? (
        <EmptyState title="No messages yet." />
      ) : (
        <ul className="space-y-2">
          {items.map((f) => (
            <li key={f.id} className="card p-4 text-sm">
              <p className="text-xs text-navy-500">
                {f.kind} · {formatDateTime(f.createdAt)} ·{" "}
                {f.user ? `${f.user.name} (${f.user.role})` : (f.name ?? "anonymous")}{" "}
                {f.email ? `· ${f.email}` : ""} {f.page ? `· ${f.page}` : ""}
              </p>
              <p className="mt-1 whitespace-pre-line">{f.message}</p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
