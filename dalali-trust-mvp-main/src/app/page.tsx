import { ArrowRight, Search } from "lucide-react";
import Link from "next/link";
import { AdvertCompare } from "@/components/home/advert-compare";
import { InView } from "@/components/motion/in-view";
import { CostCalculator } from "@/components/home/cost-calculator";
import { PropertyCard } from "@/components/property/property-card";
import { fmt } from "@/i18n";
import { getDictionary } from "@/i18n/server";
import { searchListings } from "@/server/services/listings";
import { trustSummaries } from "@/server/services/trust";

export default async function HomePage() {
  const { locale, t } = await getDictionary();
  const latest = await searchListings({ sort: "newest" });
  const items = latest.items.slice(0, 6);
  const { byAdvertiser } = await trustSummaries([...new Set(items.map((i) => i.advertiserId))]);

  const { title, titleHighlight } = t.home;
  const highlightAt = title.lastIndexOf(titleHighlight);
  const titleLead = highlightAt > 0 ? title.slice(0, highlightAt) : title;
  // One-tap searches for neighbourhoods that actually have published homes.
  const popularAreas = [...new Set(latest.items.map((i) => i.neighborhood))].slice(0, 4);
  const d = (ms: number) => ({ "--d": `${ms}ms` }) as React.CSSProperties;

  return (
    <>
      <section className="border-b border-sand-200">
        <div className="container-page grid gap-12 py-12 sm:py-16 lg:grid-cols-[11fr_9fr] lg:items-center lg:gap-16 lg:py-20">
          <div>
            <p className="rise text-sm font-semibold text-brand-700">{t.home.eyebrow}</p>
            <h1 className="display rise mt-4 text-[2.6rem] leading-[1.05] sm:text-6xl" style={d(80)}>
              {titleLead}
              {highlightAt > 0 ? <span className="pen-underline italic">{titleHighlight}</span> : null}
            </h1>
            <p className="rise mt-6 max-w-xl text-lg leading-relaxed text-navy-600" style={d(180)}>
              {t.home.subtitle}
            </p>

            <form
              action="/properties"
              method="get"
              className="rise mt-8 flex max-w-xl flex-col gap-2 sm:flex-row"
              style={d(260)}
              role="search"
            >
              <label htmlFor="hero-q" className="sr-only">
                {t.search.keyword}
              </label>
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 text-navy-400"
                  aria-hidden
                />
                <input
                  id="hero-q"
                  name="q"
                  className="input min-h-12 pl-11"
                  placeholder={t.home.searchPlaceholder}
                  maxLength={80}
                />
              </div>
              <button type="submit" className="btn-primary min-h-12 px-6">
                {t.home.searchButton}
              </button>
            </form>
            {popularAreas.length ? (
              <div className="rise mt-4 flex flex-wrap items-center gap-2" style={d(340)}>
                <span className="text-sm text-navy-500">{t.home.popularAreas}:</span>
                {popularAreas.map((area) => (
                  <Link
                    key={area}
                    href={`/properties?q=${encodeURIComponent(area)}`}
                    className="rounded-full border border-sand-200 bg-white px-3 py-1 text-sm font-medium text-navy-700 transition-[color,border-color,transform] hover:-translate-y-px hover:border-brand-500 hover:text-brand-700 active:translate-y-0"
                  >
                    {area}
                  </Link>
                ))}
              </div>
            ) : null}
            {latest.total > 0 ? (
              <p className="rise mt-5 text-sm text-navy-600" style={d(400)}>
                <span
                  className="mr-2 inline-block h-2 w-2 rounded-full bg-brand-500 align-middle"
                  aria-hidden
                />
                {fmt(t.home.stats.published, { count: latest.total })} ·{" "}
                <Link href="/properties" className="font-semibold text-navy-900 underline underline-offset-4">
                  {t.home.viewAll}
                </Link>
              </p>
            ) : null}
          </div>

          <AdvertCompare labels={t.home.compare} locale={locale} />
        </div>
      </section>

      <section className="container-page py-16 sm:py-20">
        <h2 className="display max-w-2xl text-3xl sm:text-4xl">{t.home.problemTitle}</h2>
        <InView as="ol" className="mt-10 grid gap-x-12 sm:grid-cols-2">
          {t.home.problems.map((p, i) => (
            <li key={p.title} className="relative flex gap-5 py-6">
              <span
                className="on-view on-view-rule absolute inset-x-0 top-0 h-px bg-sand-200"
                style={d(i * 120)}
                aria-hidden
              />
              <span
                className="on-view on-view-rise font-display text-3xl leading-none text-gold-600 tabular-nums"
                style={d(150 + i * 120)}
                aria-hidden
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="on-view on-view-rise" style={d(220 + i * 120)}>
                <h3 className="font-semibold text-navy-900">{p.title}</h3>
                <p className="mt-1.5 text-navy-600">{p.body}</p>
              </div>
            </li>
          ))}
        </InView>
      </section>

      <section className="bg-white py-16 sm:py-20">
        <div className="container-page">
          <h2 className="display text-3xl sm:text-4xl">{t.home.howTitle}</h2>
          <InView
            as="ol"
            className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0 lg:divide-x lg:divide-navy-100"
          >
            {t.home.how.map((h, i) => (
              <li key={h.title} className="group lg:px-6 lg:first:pl-0 lg:last:pr-0">
                <span
                  className="on-view on-view-pop flex h-8 w-8 items-center justify-center rounded-full border-2 border-brand-600 text-sm font-bold text-brand-700 transition-colors group-hover:bg-brand-600 group-hover:text-white"
                  style={d(i * 160)}
                >
                  {i + 1}
                </span>
                <div className="on-view on-view-rise" style={d(80 + i * 160)}>
                  <h3 className="mt-4 font-semibold text-navy-900">{h.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-navy-600">{h.body}</p>
                </div>
              </li>
            ))}
          </InView>
        </div>
      </section>

      <section className="container-page py-16 sm:py-20">
        <CostCalculator labels={t.home.calculator} locale={locale} />
      </section>

      <section className="container-page pb-16 sm:pb-20">
        <div className="flex items-end justify-between gap-4 border-b border-sand-200 pb-4">
          <h2 className="display text-3xl sm:text-4xl">{t.home.latestTitle}</h2>
          <Link
            href="/properties"
            className="inline-flex items-center gap-1 text-sm font-semibold whitespace-nowrap text-navy-900 underline-offset-4 hover:underline"
          >
            {t.home.viewAll} <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        {items.length ? (
          <InView className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((p, i) => (
              <div key={p.id} className="on-view on-view-rise flex" style={d((i % 3) * 110)}>
                <PropertyCard p={p} t={t} locale={locale} trust={byAdvertiser.get(p.advertiserId)} />
              </div>
            ))}
          </InView>
        ) : (
          <p className="card mt-8 p-10 text-center text-navy-600">{t.home.emptyLatest}</p>
        )}
      </section>

      <section className="container-page">
        <div className="grid gap-6 rounded-xl bg-navy-900 p-8 text-white sm:p-10 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h2 className="font-display text-3xl font-semibold">{t.home.advertiserTitle}</h2>
            <p className="mt-2 max-w-xl text-navy-200">{t.home.advertiserBody}</p>
          </div>
          <Link href="/for-advertisers" className="btn-gold justify-self-start">
            {t.home.advertiserCta} <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        <p className="mt-6 max-w-3xl text-xs leading-relaxed text-navy-500">{t.home.disclaimer}</p>
      </section>
    </>
  );
}
