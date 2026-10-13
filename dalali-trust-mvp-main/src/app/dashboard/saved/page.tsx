import Link from "next/link";
import { imageUrl } from "@/components/property/property-card";
import { EmptyState, PageHeader } from "@/components/ui/basics";
import { getDictionary } from "@/i18n/server";
import { formatTZS } from "@/lib/money";
import { requirePageActor } from "@/server/session";
import { listSaved } from "@/server/services/users";

export default async function SavedPage() {
  const actor = await requirePageActor();
  const { locale, t } = await getDictionary();
  const saved = await listSaved(actor);
  return (
    <>
      <PageHeader title={t.dashboard.saved} />
      {saved.length === 0 ? (
        <EmptyState
          title={t.dashboard.emptySaved}
          action={{ href: "/properties", label: t.dashboard.emptySavedCta }}
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {saved.map(({ property: p }) => {
            const live = p.status === "PUBLISHED";
            return (
              <li key={p.id} className="card flex gap-3 p-3">
                <div className="h-20 w-24 shrink-0 overflow-hidden rounded-lg bg-navy-100">
                  {live && p.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imageUrl(p.images[0].id, "thumb")}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : null}
                </div>
                <div className="min-w-0">
                  {live ? (
                    <Link href={`/properties/${p.slug}`} className="line-clamp-2 font-semibold underline">
                      {p.title}
                    </Link>
                  ) : (
                    <p className="font-semibold text-navy-500">
                      {p.title} · {t.dashboard.unavailable}
                    </p>
                  )}
                  <p className="text-sm text-navy-600">
                    {p.neighborhood}, {p.district}
                  </p>
                  <p className="text-sm font-bold">{formatTZS(p.rentAmount, locale)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
