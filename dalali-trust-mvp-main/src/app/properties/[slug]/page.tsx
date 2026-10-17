import { AlertTriangle, Bath, BedDouble, Check, MapPin } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContactButtons } from "@/components/property/contact-buttons";
import { CostBreakdown } from "@/components/property/cost-breakdown";
import { Gallery } from "@/components/property/gallery";
import { ShareButtons } from "@/components/property/share-buttons";
import { DEFAULT_PREVIEW_IMAGE } from "@/lib/site";
import { availabilityLabel } from "@/components/property/property-card";
import { ReportForm, SaveButton, ViewingRequestForm } from "@/components/property/tenant-forms";
import { TrustPanel } from "@/components/property/trust-panel";
import { Badge, Notice } from "@/components/ui/basics";
import { fmt } from "@/i18n";
import { getDictionary } from "@/i18n/server";
import { daysSince, formatDate } from "@/lib/dates";
import { regionName } from "@/lib/locations";
import { formatTZS, moveInCost } from "@/lib/money";
import { env } from "@/server/env";
import { getActor } from "@/server/session";
import { track } from "@/server/services/analytics";
import { getPublicListing } from "@/server/services/listings";
import { trustSummary } from "@/server/services/trust";
import { savedIds } from "@/server/services/users";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPublicListing(slug, null);
  if (!data) return { title: "Not found", robots: { index: false } };
  const { locale, t } = await getDictionary();
  const p = data.property;
  const area = `${p.neighborhood}, ${p.district}`;
  const cover = p.images[0];
  // Shown when the link is shared on WhatsApp, Facebook or X: photo, rent, area and total cost.
  const previewTitle = fmt(t.property.previewTitle, {
    price: formatTZS(p.rentAmount, locale),
    perMonth: t.property.perMonth,
    title: p.title,
  });
  const previewDescription = fmt(t.property.previewDescription, {
    area,
    total: formatTZS(moveInCost(p).total, locale),
  });
  const images = [
    cover
      ? { url: `/api/media/${cover.id}?size=og`, width: 1200, height: 630, alt: p.title }
      : { url: DEFAULT_PREVIEW_IMAGE, width: 1200, height: 630, alt: "Dalali Trust" },
  ];
  return {
    title: p.title,
    description: p.description.slice(0, 160),
    alternates: { canonical: `/properties/${p.slug}` },
    openGraph: {
      type: "website",
      siteName: "Dalali Trust",
      url: `/properties/${p.slug}`,
      title: previewTitle,
      description: previewDescription,
      locale: locale === "sw" ? "sw_TZ" : "en_TZ",
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: previewTitle,
      description: previewDescription,
      images,
    },
  };
}

function minViewingTime(): string {
  // Earliest selectable slot: 2 hours from now in East Africa Time (UTC+3), as datetime-local.
  const eat = new Date(Date.now() + 2 * 3600_000 + 3 * 3600_000);
  return eat.toISOString().slice(0, 16);
}

export default async function PropertyPage({ params }: { params: Params }) {
  const { slug } = await params;
  const [{ locale, t }, actor] = await Promise.all([getDictionary(), getActor()]);
  const data = await getPublicListing(slug, actor);
  if (!data) notFound();
  const { property: p, isPublic } = data;

  const isOwner = actor?.id === p.advertiserId;
  if (isPublic && !isOwner) await track("listing_view", p.id);

  const [trust, saved] = await Promise.all([trustSummary(p.advertiserId, p.id), savedIds(actor, [p.id])]);
  const profile = p.advertiser.advertiserProfile;
  const advertiserName = profile?.displayName ?? p.advertiser.name;
  const phone = p.contactPhone ?? (profile?.showPhone ? profile.contactPhone : null);
  const whatsapp = p.contactWhatsapp ?? (profile?.showPhone ? profile.whatsappNumber : null);
  const confirmedDays = p.availabilityConfirmedAt ? daysSince(p.availabilityConfirmedAt) : null;
  const stale = confirmedDays === null || confirmedDays > env().AVAILABILITY_STALE_DAYS;
  const canInteract = actor && !isOwner && isPublic && actor.status === "ACTIVE";
  const share = isPublic ? (
    <ShareButtons
      path={`/properties/${p.slug}`}
      text={fmt(t.property.shareText, {
        title: p.title,
        price: formatTZS(p.rentAmount, locale),
        perMonth: t.property.perMonth,
        area: `${p.neighborhood}, ${p.district}`,
      })}
      labels={{
        share: t.property.share,
        shareWhatsapp: t.property.shareWhatsapp,
        linkCopied: t.property.linkCopied,
      }}
    />
  ) : null;

  return (
    <div className="container-page py-6 sm:py-8">
      {!isPublic ? (
        <div className="mb-4">
          <Notice tone="amber">{fmt(t.property.previewBanner, { status: p.status })}</Notice>
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[3fr_2fr]">
        <div className="min-w-0 space-y-6">
          <Gallery
            images={p.images}
            title={p.title}
            labels={{ photoOf: t.property.photoOf, noPhotos: t.property.noPhotos }}
          />

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="blue">{t.property.types[p.propertyType]}</Badge>
              <Badge tone={p.availabilityStatus === "OCCUPIED" ? "gray" : "green"}>
                {availabilityLabel(t, locale, p)}
              </Badge>
              <Badge>{p.furnished ? t.property.furnished : t.property.unfurnished}</Badge>
            </div>
            <h1 className="display mt-3 text-3xl sm:text-4xl">{p.title}</h1>
            <p className="mt-2 flex items-center gap-1 text-navy-600">
              <MapPin className="h-4 w-4" aria-hidden /> {p.neighborhood}, {p.district},{" "}
              {regionName(p.region)}
            </p>
            <div className="mt-3 flex flex-wrap gap-4 text-navy-700">
              <span className="flex items-center gap-1">
                <BedDouble className="h-5 w-5" aria-hidden />{" "}
                {fmt(t.property.bedrooms, { count: p.bedrooms })}
              </span>
              <span className="flex items-center gap-1">
                <Bath className="h-5 w-5" aria-hidden /> {fmt(t.property.bathrooms, { count: p.bathrooms })}
              </span>
            </div>
            <p className="mt-3 text-sm text-navy-600">
              {confirmedDays === 0
                ? t.property.confirmedToday
                : confirmedDays !== null
                  ? fmt(t.property.confirmed, { days: confirmedDays })
                  : null}
            </p>
            {/* On phones the side column comes after the description, so repeat the essentials here. */}
            <div className="card mt-4 p-4 lg:hidden">
              <p className="text-2xl font-extrabold text-navy-900">
                {formatTZS(p.rentAmount, locale)}
                <span className="text-sm font-medium text-navy-500"> {t.property.perMonth}</span>
              </p>
              <p className="mt-1 text-sm text-navy-600">
                {t.property.moveInTotal}:{" "}
                <span className="font-semibold text-navy-900">{formatTZS(moveInCost(p).total, locale)}</span>
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <a href="#adv-title" className="btn-primary">
                  {t.property.contact}
                </a>
                <a href={canInteract ? "#view-title" : "#costs"} className="btn-secondary whitespace-normal">
                  {canInteract ? t.viewing.title : t.property.costsTitle}
                </a>
              </div>
              {share ? <div className="mt-2">{share}</div> : null}
            </div>
            {stale ? (
              <div className="mt-3">
                <Notice tone="amber">
                  <span className="flex gap-2">
                    <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden /> {t.property.staleWarning}
                  </span>
                </Notice>
              </div>
            ) : null}
          </div>

          <section aria-labelledby="desc-title">
            <h2 id="desc-title" className="text-lg font-bold text-navy-900">
              {t.property.descriptionTitle}
            </h2>
            {/* Rendered as text — React escapes it, so advertiser input cannot inject markup. */}
            <p className="mt-2 leading-relaxed whitespace-pre-line text-navy-700">{p.description}</p>
          </section>

          {p.amenities.length ? (
            <section aria-labelledby="amen-title">
              <h2 id="amen-title" className="text-lg font-bold text-navy-900">
                {t.property.amenitiesTitle}
              </h2>
              <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {p.amenities.map((a) => (
                  <li key={a} className="flex items-center gap-2 text-navy-700">
                    <Check className="h-4 w-4 text-brand-600" aria-hidden />
                    {t.property.amenities[a as keyof typeof t.property.amenities] ?? a}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section aria-labelledby="util-title" className="card p-5">
            <h2 id="util-title" className="text-lg font-bold text-navy-900">
              {t.property.utilitiesTitle}
            </h2>
            <dl className="mt-2 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-navy-500">{t.property.electricity}</dt>
                <dd className="font-semibold">{t.property.utility[p.electricity]}</dd>
              </div>
              <div>
                <dt className="text-navy-500">{t.property.water}</dt>
                <dd className="font-semibold">{t.property.utility[p.water]}</dd>
              </div>
            </dl>
            {p.utilityNotes ? <p className="mt-2 text-sm text-navy-600">{p.utilityNotes}</p> : null}
          </section>

          {p.latitude !== null && p.longitude !== null ? (
            <section aria-labelledby="loc-title">
              <h2 id="loc-title" className="text-lg font-bold text-navy-900">
                {t.property.locationTitle}
              </h2>
              <iframe
                title={t.property.locationTitle}
                className="mt-2 h-64 w-full rounded-2xl border border-navy-100"
                loading="lazy"
                referrerPolicy="no-referrer"
                sandbox="allow-scripts allow-same-origin"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(p.longitude) - 0.01}%2C${Number(p.latitude) - 0.008}%2C${Number(p.longitude) + 0.01}%2C${Number(p.latitude) + 0.008}&layer=mapnik`}
              />
              <p className="mt-1 text-xs text-navy-500">{t.property.approximateLocation}</p>
            </section>
          ) : null}
        </div>

        <aside className="space-y-5">
          <div className="card p-5">
            <p className="text-3xl font-extrabold text-navy-900">
              {formatTZS(p.rentAmount, locale)}
              <span className="text-sm font-medium text-navy-500"> {t.property.perMonth}</span>
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {canInteract ? (
                <SaveButton
                  propertyId={p.id}
                  initiallySaved={saved.has(p.id)}
                  labels={{ save: t.property.save, saved: t.property.saved }}
                />
              ) : null}
            </div>
            {share ? <div className="mt-3 hidden lg:block">{share}</div> : null}
          </div>

          <div id="costs" className="scroll-mt-20">
            <CostBreakdown t={t} locale={locale} p={p} />
          </div>
          <TrustPanel t={t} locale={locale} trust={trust} reviewed={isPublic} />

          <section className="card p-5" aria-labelledby="adv-title">
            <h2 id="adv-title" className="text-lg font-bold text-navy-900">
              {t.property.advertiserTitle}
            </h2>
            <p className="mt-2 font-semibold">
              <Link href={`/advertisers/${p.advertiser.id}`} className="underline">
                {advertiserName}
              </Link>{" "}
              <span className="text-sm font-normal text-navy-500">
                · {t.property.roles[p.advertiser.role]}
              </span>
            </p>
            {profile?.agencyName ? <p className="text-sm text-navy-600">{profile.agencyName}</p> : null}
            <p className="text-xs text-navy-500">
              {fmt(t.property.memberSince, { date: formatDate(p.advertiser.createdAt, locale) })}
            </p>
            <div className="mt-4">
              {!actor ? (
                <div className="space-y-3">
                  <p className="text-sm text-navy-600">{t.property.signInToContact}</p>
                  <Link href={`/sign-in?next=/properties/${p.slug}`} className="btn-primary w-full">
                    {t.nav.signIn}
                  </Link>
                </div>
              ) : canInteract ? (
                phone || whatsapp ? (
                  <ContactButtons
                    propertyId={p.id}
                    phone={phone}
                    whatsapp={whatsapp}
                    labels={{ call: t.property.call, whatsapp: t.property.whatsapp }}
                  />
                ) : (
                  <p className="text-sm text-navy-600">{t.property.noPhone}</p>
                )
              ) : null}
            </div>
            <p className="mt-4 rounded-xl bg-gold-50 p-3 text-xs text-gold-800">
              {t.property.safetyReminder}
            </p>
          </section>

          {canInteract ? (
            <>
              <section className="card p-5" aria-labelledby="view-title">
                <h2 id="view-title" className="mb-3 text-lg font-bold text-navy-900">
                  {t.viewing.title}
                </h2>
                <ViewingRequestForm propertyId={p.id} labels={t.viewing} minDateTime={minViewingTime()} />
              </section>
              <details className="card p-5">
                <summary className="cursor-pointer font-semibold text-red-700">{t.property.report}</summary>
                <div className="mt-3">
                  <ReportForm propertyId={p.id} labels={{ ...t.report, categories: t.report.categories }} />
                </div>
              </details>
            </>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
