import Link from "next/link";
import { imageUrl } from "@/components/property/property-card";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui/basics";
import { fmt } from "@/i18n";
import { getDictionary } from "@/i18n/server";
import { formatDate } from "@/lib/dates";
import { formatTZS } from "@/lib/money";
import { requirePageActor } from "@/server/session";
import { listingStats, listMyListings } from "@/server/services/listings";

export default async function MyListingsPage() {
  const actor = await requirePageActor({ roles: ["LANDLORD", "AGENT"] });
  const { locale, t } = await getDictionary();
  const [listings, stats] = await Promise.all([listMyListings(actor), listingStats(actor)]);
  return (
    <>
      <PageHeader
        title={t.dashboard.listings}
        subtitle={t.landlord.myListings.subtitle}
        actions={
          <Link href="/dashboard/listings/new" className="btn-primary">
            {t.dashboard.newListing}
          </Link>
        }
      />
      {listings.length === 0 ? (
        <EmptyState
          title={t.landlord.myListings.empty}
          body={t.landlord.myListings.emptyBody}
          action={{ href: "/dashboard/listings/new", label: t.dashboard.newListing }}
        />
      ) : (
        <ul className="space-y-3">
          {listings.map((l) => {
            const s = stats.get(l.id);
            return (
              <li key={l.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-navy-100">
                  {l.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imageUrl(l.images[0].id, "thumb")}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/dashboard/listings/${l.id}`} className="font-semibold underline">
                      {l.title}
                    </Link>
                    <StatusBadge
                      status={l.status}
                      label={t.landlord.statuses[l.status as keyof typeof t.landlord.statuses]}
                    />
                  </div>
                  <p className="text-sm text-navy-600">
                    {l.neighborhood}, {l.district} · {formatTZS(l.rentAmount, locale)} ·{" "}
                    {fmt(t.landlord.myListings.updated, { date: formatDate(l.updatedAt, locale) })}
                  </p>
                  {s ? (
                    <p className="mt-1 text-xs text-navy-500">
                      {fmt(t.landlord.myListings.stats, {
                        views: s.views,
                        contacts: s.contacts,
                        saves: s.saves,
                        viewings: s.viewings,
                      })}
                    </p>
                  ) : null}
                  {l.reviewNote && (l.status === "REJECTED" || l.status === "SUSPENDED") ? (
                    <p className="mt-1 text-sm text-red-700">
                      {fmt(t.landlord.moderatorNote, { note: l.reviewNote })}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
