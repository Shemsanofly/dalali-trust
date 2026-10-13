import Link from "next/link";
import { FeedbackForm } from "@/components/feedback-form";
import { Notice, PageHeader, StatusBadge } from "@/components/ui/basics";
import { fmt } from "@/i18n";
import { getDictionary } from "@/i18n/server";
import { isAdvertiser } from "@/server/actor";
import { prisma } from "@/server/db";
import { requirePageActor } from "@/server/session";
import { trustSummary } from "@/server/services/trust";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const actor = await requirePageActor();
  const { t } = await getDictionary();
  const { denied } = await searchParams;

  const cards: { label: string; value: number; href: string }[] = [];
  let trust = null;
  if (isAdvertiser(actor)) {
    const [byStatus, pendingViewings] = await Promise.all([
      prisma.property.groupBy({ by: ["status"], where: { advertiserId: actor.id }, _count: { _all: true } }),
      prisma.viewingRequest.count({ where: { advertiserId: actor.id, status: "PENDING" } }),
    ]);
    const count = (s: string) => byStatus.find((b) => b.status === s)?._count._all ?? 0;
    cards.push(
      { label: "Published", value: count("PUBLISHED"), href: "/dashboard/listings" },
      { label: "Awaiting review", value: count("PENDING_REVIEW"), href: "/dashboard/listings" },
      { label: "Drafts / rejected", value: count("DRAFT") + count("REJECTED"), href: "/dashboard/listings" },
      { label: t.dashboard.viewings, value: pendingViewings, href: "/dashboard/viewings" },
    );
    trust = await trustSummary(actor.id);
  } else {
    const [saved, viewings, reports] = await Promise.all([
      prisma.savedProperty.count({ where: { userId: actor.id } }),
      prisma.viewingRequest.count({
        where: { requesterId: actor.id, status: { in: ["PENDING", "ACCEPTED"] } },
      }),
      prisma.report.count({ where: { reporterId: actor.id } }),
    ]);
    cards.push(
      { label: t.dashboard.saved, value: saved, href: "/dashboard/saved" },
      { label: t.dashboard.viewings, value: viewings, href: "/dashboard/viewings" },
      { label: t.dashboard.reports, value: reports, href: "/dashboard/reports" },
    );
  }
  const notifications = await prisma.notification.findMany({
    where: { userId: actor.id },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return (
    <>
      <PageHeader
        title={fmt(t.dashboard.welcome, { name: actor.name.split(" ")[0] ?? actor.name })}
        actions={
          isAdvertiser(actor) ? (
            <Link href="/dashboard/listings/new" className="btn-primary">
              {t.dashboard.newListing}
            </Link>
          ) : (
            <Link href="/properties" className="btn-primary">
              {t.nav.search}
            </Link>
          )
        }
      />
      {denied ? (
        <div className="mb-4">
          <Notice>{t.dashboard.deniedNotice}</Notice>
        </div>
      ) : null}
      {actor.role === "ADMIN" ? (
        <div className="mb-4">
          <Notice tone="blue">
            <Link href="/admin" className="font-semibold underline">
              Open the administrator dashboard →
            </Link>
          </Notice>
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="card p-4 hover:border-brand-300">
            <p className="text-2xl font-extrabold text-navy-900">{c.value}</p>
            <p className="text-sm text-navy-600">{c.label}</p>
          </Link>
        ))}
      </div>

      {trust ? (
        <section className="card mt-6 p-5">
          <h2 className="font-bold text-navy-900">{t.dashboard.verification}</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {[trust.identity, trust.advertiserRole].map((c) => (
              <li key={c.type} className="flex items-center justify-between gap-3">
                <span>{t.trust.checks[c.type]}</span>
                <StatusBadge
                  status={c.state === "PENDING" ? "PENDING_REVIEW" : c.state}
                  label={t.trust.states[c.state]}
                />
              </li>
            ))}
          </ul>
          <Link
            href="/dashboard/verification"
            className="mt-3 inline-block text-sm font-semibold text-brand-700 underline"
          >
            {t.trust.learnMore}
          </Link>
        </section>
      ) : null}

      <section className="card mt-6 p-5">
        <h2 className="font-bold text-navy-900">{t.dashboard.notifications}</h2>
        {notifications.length ? (
          <ul className="mt-3 divide-y divide-navy-100 text-sm">
            {notifications.map((n) => (
              <li key={n.id} className="py-2">
                <p className={n.readAt ? "text-navy-600" : "font-semibold text-navy-900"}>{n.title}</p>
                <p className="text-navy-600">{n.body}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-navy-600">{t.dashboard.emptyNotifications}</p>
        )}
      </section>

      <section className="card mt-6 p-5">
        <h2 className="mb-3 font-bold text-navy-900">{t.common.feedback}</h2>
        <FeedbackForm
          kind="FEEDBACK"
          page="/dashboard"
          labels={{
            prompt: t.common.feedbackPrompt,
            submit: t.common.submit,
            thanks: t.common.feedbackThanks,
            name: t.auth.name,
            email: t.auth.email,
          }}
        />
      </section>
    </>
  );
}
