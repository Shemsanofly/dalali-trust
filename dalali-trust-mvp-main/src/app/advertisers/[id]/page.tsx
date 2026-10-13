import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PropertyCard } from "@/components/property/property-card";
import { TrustPanel } from "@/components/property/trust-panel";
import { fmt } from "@/i18n";
import { getDictionary } from "@/i18n/server";
import { formatDate } from "@/lib/dates";
import { regionName } from "@/lib/locations";
import { prisma } from "@/server/db";
import { publicListingWhere } from "@/server/services/listings";
import { trustSummary } from "@/server/services/trust";

async function load(id: string) {
  if (!/^[\w-]{10,60}$/.test(id)) return null;
  return prisma.user.findFirst({
    where: { id, status: "ACTIVE", role: { in: ["LANDLORD", "AGENT"] } },
    // Public page: select only fields that are safe to show.
    select: {
      id: true,
      name: true,
      role: true,
      createdAt: true,
      advertiserProfile: { select: { displayName: true, bio: true, agencyName: true, serviceRegions: true } },
    },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const user = await load((await params).id);
  return { title: user ? (user.advertiserProfile?.displayName ?? user.name) : "Not found" };
}

export default async function AdvertiserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await load(id);
  if (!user) notFound();
  const { locale, t } = await getDictionary();
  const [trust, listings] = await Promise.all([
    trustSummary(user.id),
    prisma.property.findMany({
      where: { advertiserId: user.id, ...publicListingWhere() },
      orderBy: { publishedAt: "desc" },
      take: 24,
      select: {
        id: true,
        slug: true,
        title: true,
        propertyType: true,
        region: true,
        district: true,
        neighborhood: true,
        rentAmount: true,
        currency: true,
        advanceMonths: true,
        depositAmount: true,
        agentFeeAmount: true,
        bedrooms: true,
        bathrooms: true,
        furnished: true,
        availabilityStatus: true,
        availableFrom: true,
        availabilityConfirmedAt: true,
        publishedAt: true,
        advertiserId: true,
        images: { orderBy: { sortOrder: "asc" }, take: 1, select: { id: true, altText: true } },
      },
    }),
  ]);
  const p = user.advertiserProfile;
  return (
    <div className="container-page py-10">
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div>
          <h1 className="text-3xl font-extrabold text-navy-900">{p?.displayName ?? user.name}</h1>
          <p className="text-navy-600">
            {t.property.roles[user.role]}
            {p?.agencyName ? ` · ${p.agencyName}` : ""} ·{" "}
            {fmt(t.property.memberSince, { date: formatDate(user.createdAt, locale) })}
          </p>
          {p?.bio ? <p className="mt-4 whitespace-pre-line text-navy-700">{p.bio}</p> : null}
          {p?.serviceRegions.length ? (
            <p className="mt-3 text-sm text-navy-600">{p.serviceRegions.map(regionName).join(", ")}</p>
          ) : null}
        </div>
        <TrustPanel t={t} locale={locale} trust={trust} reviewed={false} />
      </div>
      <h2 className="mt-10 mb-4 text-xl font-bold">{t.search.title}</h2>
      {listings.length ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((l) => (
            <PropertyCard key={l.id} p={l} t={t} locale={locale} trust={trust} />
          ))}
        </div>
      ) : (
        <p className="text-navy-600">{t.search.emptyTitle}</p>
      )}
    </div>
  );
}
