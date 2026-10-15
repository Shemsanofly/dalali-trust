import { BedDouble, Bath, MapPin } from "lucide-react";
import Link from "next/link";
import { fmt, type Dictionary, type Locale } from "@/i18n";
import { formatDate } from "@/lib/dates";
import { regionName } from "@/lib/locations";
import { formatTZS } from "@/lib/money";
import type { PublicListingCard } from "@/server/services/listings";
import type { TrustSummary } from "@/server/services/trust";
import { Badge } from "../ui/basics";

export function imageUrl(id: string, size: "full" | "thumb" = "full") {
  return `/api/media/${id}${size === "thumb" ? "?size=thumb" : ""}`;
}

export function availabilityLabel(
  t: Dictionary,
  locale: Locale,
  p: { availabilityStatus: "AVAILABLE" | "AVAILABLE_SOON" | "OCCUPIED"; availableFrom: Date | null },
) {
  if (p.availabilityStatus === "AVAILABLE_SOON" && p.availableFrom) {
    return fmt(t.property.availability.AVAILABLE_SOON, { date: formatDate(p.availableFrom, locale) });
  }
  return t.property.availability[
    p.availabilityStatus === "AVAILABLE_SOON" ? "AVAILABLE" : p.availabilityStatus
  ];
}

export function PropertyCard({
  p,
  t,
  locale,
  trust,
}: {
  p: PublicListingCard;
  t: Dictionary;
  locale: Locale;
  trust?: Omit<TrustSummary, "propertyEvidence">;
}) {
  const img = p.images[0];
  return (
    <article className="card group relative flex flex-col overflow-hidden transition-[border-color,box-shadow] hover:border-navy-200 hover:shadow-[0_6px_20px_-8px_rgb(10_17_40_/_0.25)]">
      <div className="relative aspect-[4/3] overflow-hidden bg-navy-100">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl(img.id, "thumb")}
            alt={img.altText ?? p.title}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            width={640}
            height={480}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-navy-500">
            {t.property.noPhotos}
          </div>
        )}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <Badge tone={p.availabilityStatus === "OCCUPIED" ? "gray" : "green"}>
            {availabilityLabel(t, locale, p)}
          </Badge>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-xl font-extrabold text-navy-900">
          {formatTZS(p.rentAmount, locale)}
          <span className="text-sm font-medium text-navy-500"> {t.property.perMonth}</span>
        </p>
        <h3 className="line-clamp-2 font-semibold text-navy-800 group-hover:underline group-hover:decoration-navy-300 group-hover:underline-offset-4">
          <Link href={`/properties/${p.slug}`} className="after:absolute after:inset-0">
            {p.title}
          </Link>
        </h3>
        <p className="flex items-center gap-1 text-sm text-navy-600">
          <MapPin className="h-4 w-4 shrink-0" aria-hidden />
          {p.neighborhood}, {p.district}, {regionName(p.region)}
        </p>
        <div className="mt-auto flex flex-wrap items-center gap-3 pt-2 text-sm text-navy-600">
          <span>{t.property.types[p.propertyType]}</span>
          <span className="flex items-center gap-1">
            <BedDouble className="h-4 w-4" aria-hidden /> {fmt(t.property.bedrooms, { count: p.bedrooms })}
          </span>
          <span className="flex items-center gap-1">
            <Bath className="h-4 w-4" aria-hidden /> {fmt(t.property.bathrooms, { count: p.bathrooms })}
          </span>
        </div>
        {p.advanceMonths > 1 || p.agentFeeAmount > 0 ? (
          <p className="text-xs text-navy-500">
            {p.advanceMonths > 1
              ? `${t.property.advance}: ${fmt(t.property.advanceMonths, { count: p.advanceMonths })}`
              : null}
            {p.advanceMonths > 1 && p.agentFeeAmount > 0 ? " · " : null}
            {p.agentFeeAmount > 0 ? `${t.property.agentFee}: ${formatTZS(p.agentFeeAmount, locale)}` : null}
          </p>
        ) : null}
        {trust?.identity.state === "VERIFIED" ? (
          <div>
            <Badge tone="green">✓ {t.trust.checks.IDENTITY}</Badge>
          </div>
        ) : null}
      </div>
    </article>
  );
}
