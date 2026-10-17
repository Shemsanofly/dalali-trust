import type { Metadata } from "next";
import Link from "next/link";
import { FilterPanel } from "@/components/property/filter-panel";
import { PropertyCard } from "@/components/property/property-card";
import { EmptyState, Pagination } from "@/components/ui/basics";
import { fmt } from "@/i18n";
import { getDictionary } from "@/i18n/server";
import { REGIONS } from "@/lib/locations";
import { searchListings } from "@/server/services/listings";
import { trustSummaries } from "@/server/services/trust";
import { PROPERTY_TYPES } from "@/server/validation";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t.search.title };
}

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function PropertiesPage({ searchParams }: { searchParams: SP }) {
  const raw = await searchParams;
  const flat = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  const { locale, t } = await getDictionary();
  const result = await searchListings(flat);
  const { byAdvertiser } = await trustSummaries([...new Set(result.items.map((i) => i.advertiserId))]);
  const p = result.params;

  const hrefFor = (page: number) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(flat)) if (v && k !== "page") qs.set(k, v);
    qs.set("page", String(page));
    return `/properties?${qs.toString()}`;
  };
  const activeFilters = Object.entries(flat).filter(([k, v]) => v && k !== "page" && k !== "sort").length;
  const resultsSummary = fmt(t.search.resultsCount, { count: result.total });

  return (
    <div className="container-page py-8">
      <h1 className="text-2xl font-extrabold text-navy-900 sm:text-3xl">{t.search.title}</h1>
      <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
        <FilterPanel label={t.search.filters} summary={resultsSummary} activeCount={activeFilters}>
          {/* Plain GET form: results are shareable URLs. */}
          <form
            method="get"
            action="/properties"
            id="filters"
            className="card h-fit space-y-4 p-5"
            aria-label={t.search.filters}
          >
            <h2 className="font-bold text-navy-900">{t.search.filters}</h2>
            <Field label={t.search.keyword} htmlFor="q">
              <input
                className="input"
                id="q"
                name="q"
                defaultValue={p.q ?? ""}
                maxLength={80}
                placeholder={t.home.searchPlaceholder}
              />
            </Field>
            <Field label={t.search.region} htmlFor="region">
              <select className="input" id="region" name="region" defaultValue={p.region ?? ""}>
                <option value="">{t.search.anyRegion}</option>
                {REGIONS.map((r) => (
                  <option key={r.slug} value={r.slug}>
                    {r.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t.search.district} htmlFor="district">
              <input
                className="input"
                id="district"
                name="district"
                defaultValue={p.district ?? ""}
                list="district-options"
                maxLength={80}
              />
              <datalist id="district-options">
                {(
                  REGIONS.find((r) => r.slug === p.region)?.districts ?? REGIONS.flatMap((r) => r.districts)
                ).map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
            </Field>
            <Field label={t.search.type} htmlFor="type">
              <select className="input" id="type" name="type" defaultValue={p.type ?? ""}>
                <option value="">{t.search.anyType}</option>
                {PROPERTY_TYPES.map((pt) => (
                  <option key={pt} value={pt}>
                    {t.property.types[pt]}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label={t.search.minRent} htmlFor="minRent">
                <input
                  className="input"
                  id="minRent"
                  name="minRent"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  defaultValue={p.minRent ?? ""}
                />
              </Field>
              <Field label={t.search.maxRent} htmlFor="maxRent">
                <input
                  className="input"
                  id="maxRent"
                  name="maxRent"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  defaultValue={p.maxRent ?? ""}
                />
              </Field>
            </div>
            <Field label={t.search.bedrooms} htmlFor="bedrooms">
              <select
                className="input"
                id="bedrooms"
                name="bedrooms"
                defaultValue={p.bedrooms?.toString() ?? ""}
              >
                <option value="">{t.search.any}</option>
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n}+
                  </option>
                ))}
              </select>
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="availableNow"
                value="1"
                defaultChecked={p.availableNow}
                className="h-5 w-5 accent-brand-600"
              />
              {t.search.availableNow}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="verifiedOnly"
                value="1"
                defaultChecked={p.verifiedOnly}
                className="h-5 w-5 accent-brand-600"
              />
              {t.search.verifiedOnly}
            </label>
            <Field label={t.search.sort} htmlFor="sort">
              <select className="input" id="sort" name="sort" defaultValue={p.sort}>
                <option value="newest">{t.search.sortNewest}</option>
                <option value="price_asc">{t.search.sortPriceAsc}</option>
                <option value="price_desc">{t.search.sortPriceDesc}</option>
                <option value="recently_confirmed">{t.search.sortConfirmed}</option>
              </select>
            </Field>
            <button type="submit" className="btn-primary w-full">
              {t.search.apply}
            </button>
            <Link href="/properties" className="block text-center text-sm text-navy-600 underline">
              {t.search.reset}
            </Link>
          </form>
        </FilterPanel>

        <section aria-live="polite">
          <p className="mb-4 hidden text-sm text-navy-600 lg:block">{resultsSummary}</p>
          {result.items.length ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {result.items.map((item, i) => (
                <PropertyCard
                  key={item.id}
                  priority={i === 0 ? "high" : i < 3 ? "eager" : "lazy"}
                  p={item}
                  t={t}
                  locale={locale}
                  trust={byAdvertiser.get(item.advertiserId)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title={t.search.emptyTitle}
              body={t.search.emptyBody}
              action={{ href: "/properties", label: t.search.reset }}
            />
          )}
          <Pagination
            page={result.page}
            pageCount={result.pageCount}
            hrefFor={hrefFor}
            labels={{
              previous: t.search.previous,
              next: t.search.next,
              page: fmt(t.search.page, { page: result.page, pageCount: result.pageCount }),
            }}
          />
        </section>
      </div>
    </div>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  );
}
