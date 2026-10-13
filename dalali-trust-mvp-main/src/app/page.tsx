import { Search } from "lucide-react";
import Link from "next/link";
import { PropertyCard } from "@/components/property/property-card";
import { getDictionary } from "@/i18n/server";
import { searchListings } from "@/server/services/listings";
import { trustSummaries } from "@/server/services/trust";

export default async function HomePage() {
  const { locale, t } = await getDictionary();
  const latest = await searchListings({ sort: "newest" });
  const items = latest.items.slice(0, 6);
  const { byAdvertiser } = await trustSummaries([...new Set(items.map((i) => i.advertiserId))]);

  return (
    <>
      <section className="bg-navy-800 text-white">
        <div className="container-page grid gap-10 py-14 sm:py-20 lg:grid-cols-[3fr_2fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold tracking-wide text-brand-300 uppercase">{t.home.eyebrow}</p>
            <h1 className="mt-3 text-3xl leading-tight font-extrabold tracking-tight sm:text-5xl">
              {t.home.title}
            </h1>
            <p className="mt-4 max-w-xl text-lg text-navy-100">{t.home.subtitle}</p>
            <form
              action="/properties"
              method="get"
              className="mt-8 flex max-w-xl flex-col gap-2 sm:flex-row"
              role="search"
            >
              <label htmlFor="hero-q" className="sr-only">
                {t.search.keyword}
              </label>
              <input
                id="hero-q"
                name="q"
                className="input flex-1"
                placeholder={t.home.searchPlaceholder}
                maxLength={80}
              />
              <button type="submit" className="btn-primary">
                <Search className="h-4 w-4" aria-hidden /> {t.home.searchButton}
              </button>
            </form>
          </div>
          <div className="rounded-2xl border border-navy-600 bg-navy-700/60 p-6">
            <p className="font-bold text-gold-300">{t.brand.name}</p>
            <p className="mt-2 text-navy-100">{t.brand.mission}</p>
            <p className="mt-4 text-sm text-navy-200">{t.property.safetyReminder}</p>
            <Link href="/safety" className="mt-3 inline-block text-sm font-semibold text-brand-300 underline">
              {t.nav.safety}
            </Link>
          </div>
        </div>
      </section>

      <section className="container-page py-14">
        <h2 className="text-2xl font-extrabold text-navy-900">{t.home.problemTitle}</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {t.home.problems.map((p) => (
            <div key={p.title} className="card p-5">
              <h3 className="font-bold text-navy-900">{p.title}</h3>
              <p className="mt-2 text-sm text-navy-600">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white py-14">
        <div className="container-page">
          <h2 className="text-2xl font-extrabold text-navy-900">{t.home.howTitle}</h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {t.home.how.map((h, i) => (
              <li key={h.title} className="rounded-2xl bg-navy-50 p-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 font-bold text-white">
                  {i + 1}
                </span>
                <h3 className="mt-3 font-bold text-navy-900">{h.title}</h3>
                <p className="mt-2 text-sm text-navy-600">{h.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="container-page py-14">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-2xl font-extrabold text-navy-900">{t.home.latestTitle}</h2>
          <Link href="/properties" className="text-sm font-semibold text-brand-700 underline">
            {t.home.viewAll}
          </Link>
        </div>
        {items.length ? (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((p) => (
              <PropertyCard key={p.id} p={p} t={t} locale={locale} trust={byAdvertiser.get(p.advertiserId)} />
            ))}
          </div>
        ) : (
          <p className="card mt-6 p-8 text-center text-navy-600">{t.home.emptyLatest}</p>
        )}
      </section>

      <section className="container-page">
        <div className="flex flex-col items-start gap-4 rounded-2xl bg-brand-700 p-8 text-white sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-extrabold">{t.home.advertiserTitle}</h2>
            <p className="mt-1 text-brand-50">{t.home.advertiserBody}</p>
          </div>
          <Link href="/for-advertisers" className="btn bg-white text-brand-800 hover:bg-brand-50">
            {t.home.advertiserCta}
          </Link>
        </div>
        <p className="mt-6 text-xs text-navy-500">{t.home.disclaimer}</p>
      </section>
    </>
  );
}
