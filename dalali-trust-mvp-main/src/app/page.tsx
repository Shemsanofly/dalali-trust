import {
  ArrowRight,
  BadgeCheck,
  Building2,
  ClipboardCheck,
  Eye,
  Flag,
  HelpCircle,
  Receipt,
  Search,
  UserRoundSearch,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { CountUp } from "@/components/fx/count-up";
import { InteractiveBackground } from "@/components/fx/interactive-background";
import { CostCalculator } from "@/components/home/cost-calculator";
import { TrustShowcase } from "@/components/home/trust-showcase";
import { PropertyCard } from "@/components/property/property-card";
import { getDictionary } from "@/i18n/server";
import { searchListings } from "@/server/services/listings";
import { trustSummaries } from "@/server/services/trust";

const PROBLEM_ICONS = [HelpCircle, UserRoundSearch, Wallet, Eye];
const HOW_ICONS = [ClipboardCheck, Receipt, BadgeCheck, Flag];

function delay(i: number) {
  return { "--reveal-delay": `${i * 90}ms` } as React.CSSProperties;
}

export default async function HomePage() {
  const { locale, t } = await getDictionary();
  const latest = await searchListings({ sort: "newest" });
  const items = latest.items.slice(0, 6);
  const { byAdvertiser } = await trustSummaries([...new Set(items.map((i) => i.advertiserId))]);

  const { title, titleHighlight } = t.home;
  const highlightAt = title.lastIndexOf(titleHighlight);
  const titleLead = highlightAt > 0 ? title.slice(0, highlightAt) : title;

  return (
    <>
      <section className="relative isolate overflow-hidden bg-navy-900 text-white">
        <div className="grid-pattern absolute inset-0 -z-10" aria-hidden />
        <div className="orb -top-32 left-1/4 -z-10 h-96 w-96 bg-gold-500/20" aria-hidden />
        <div
          className="orb -right-24 bottom-0 -z-10 h-[28rem] w-[28rem] bg-brand-500/20"
          style={{ animationDelay: "-8s" }}
          aria-hidden
        />
        <InteractiveBackground className="-z-10" />
        <div className="noise-overlay -z-10" aria-hidden />

        <div className="container-page grid gap-16 py-16 sm:py-24 lg:grid-cols-[7fr_5fr] lg:items-center">
          <div className="animate-fade-up">
            <span className="eyebrow border-white/15 bg-white/5 text-brand-200 backdrop-blur">
              <span className="pulse-dot h-2 w-2 rounded-full bg-brand-400" aria-hidden />
              {t.home.eyebrow}
            </span>
            <h1 className="mt-6 text-4xl leading-[1.08] font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              {titleLead}
              {highlightAt > 0 ? <span className="text-shimmer">{titleHighlight}</span> : null}
            </h1>
            <p className="mt-5 max-w-xl text-lg text-navy-200">{t.home.subtitle}</p>

            <form
              action="/properties"
              method="get"
              className="group mt-8 flex max-w-xl flex-col gap-2 rounded-2xl border border-white/15 bg-white/10 p-2 backdrop-blur-xl transition-colors focus-within:border-brand-400/60 sm:flex-row"
              role="search"
            >
              <label htmlFor="hero-q" className="sr-only">
                {t.search.keyword}
              </label>
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 text-navy-400 transition-colors group-focus-within:text-brand-600"
                  aria-hidden
                />
                <input
                  id="hero-q"
                  name="q"
                  className="input border-transparent pl-11"
                  placeholder={t.home.searchPlaceholder}
                  maxLength={80}
                />
              </div>
              <button type="submit" className="btn-primary">
                {t.home.searchButton} <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            </form>

            <dl className="mt-10 grid max-w-xl grid-cols-3 gap-4 border-t border-white/10 pt-8">
              <div className="flex flex-col">
                <dt className="text-xs font-semibold text-navy-300">{t.home.stats.published}</dt>
                <dd className="order-first text-2xl font-extrabold sm:text-3xl">
                  <CountUp value={latest.total} locale={locale} />
                </dd>
              </div>
              <div className="flex flex-col">
                <dt className="text-xs font-semibold text-navy-300">{t.home.stats.reviewed}</dt>
                <dd className="order-first text-2xl font-extrabold sm:text-3xl">
                  <CountUp value={100} locale={locale} />%
                </dd>
              </div>
              <div className="flex flex-col">
                <dt className="text-xs font-semibold text-navy-300">{t.home.stats.free}</dt>
                <dd className="order-first text-2xl font-extrabold text-gold-300 sm:text-3xl">TSh 0</dd>
              </div>
            </dl>
          </div>

          <div className="animate-fade-up px-4 pb-8 sm:px-8" style={{ animationDelay: "150ms" }}>
            <TrustShowcase labels={t.home.showcase} />
          </div>
        </div>
      </section>

      <section className="container-page py-16 sm:py-20">
        <h2 className="section-title" data-reveal>
          {t.home.problemTitle}
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {t.home.problems.map((p, i) => {
            const Icon = PROBLEM_ICONS[i % PROBLEM_ICONS.length] ?? HelpCircle;
            return (
              <div key={p.title} className="card-interactive group p-6" data-reveal style={delay(i)}>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold-50 text-gold-700 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-4 font-bold text-navy-900">{p.title}</h3>
                <p className="mt-2 text-sm text-navy-600">{p.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="relative overflow-hidden bg-white py-16 sm:py-20">
        <div className="orb -top-40 -left-40 h-80 w-80 bg-brand-200/40" aria-hidden />
        <div className="container-page relative">
          <h2 className="section-title" data-reveal>
            {t.home.howTitle}
          </h2>
          <ol className="relative mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <span
              className="absolute top-6 right-[12%] left-[12%] hidden h-0.5 bg-linear-to-r from-brand-200 via-gold-300 to-brand-200 lg:block"
              aria-hidden
            />
            {t.home.how.map((h, i) => {
              const Icon = HOW_ICONS[i % HOW_ICONS.length] ?? ClipboardCheck;
              return (
                <li key={h.title} className="group relative text-center" data-reveal style={delay(i)}>
                  <span className="relative mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-brand-500 to-brand-700 text-white shadow-lg shadow-brand-600/30 transition-transform duration-300 group-hover:-translate-y-1 group-hover:rotate-3">
                    <Icon className="h-5 w-5" aria-hidden />
                    <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-gold-400 text-xs font-extrabold text-navy-900 ring-4 ring-white">
                      {i + 1}
                    </span>
                  </span>
                  <h3 className="mt-5 font-bold text-navy-900">{h.title}</h3>
                  <p className="mt-2 text-sm text-navy-600">{h.body}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section className="container-page py-16 sm:py-20" data-reveal>
        <CostCalculator labels={t.home.calculator} locale={locale} />
      </section>

      <section className="container-page pb-16 sm:pb-20">
        <div className="flex items-end justify-between gap-4" data-reveal>
          <h2 className="section-title">{t.home.latestTitle}</h2>
          <Link
            href="/properties"
            className="group inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-800"
          >
            {t.home.viewAll}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
          </Link>
        </div>
        {items.length ? (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((p, i) => (
              <div key={p.id} data-reveal style={delay(i % 3)} className="flex">
                <PropertyCard p={p} t={t} locale={locale} trust={byAdvertiser.get(p.advertiserId)} />
              </div>
            ))}
          </div>
        ) : (
          <p className="card mt-8 p-10 text-center text-navy-600">{t.home.emptyLatest}</p>
        )}
      </section>

      <section className="container-page">
        <div
          className="relative isolate flex flex-col items-start gap-6 overflow-hidden rounded-3xl bg-navy-900 p-8 text-white sm:flex-row sm:items-center sm:justify-between sm:p-10"
          data-reveal
        >
          <div className="orb -top-20 -right-10 -z-10 h-64 w-64 bg-gold-500/25" aria-hidden />
          <div className="orb -bottom-24 left-10 -z-10 h-64 w-64 bg-brand-500/25" aria-hidden />
          <div className="flex items-start gap-4">
            <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 sm:flex">
              <Building2 className="h-6 w-6 text-gold-300" aria-hidden />
            </span>
            <div>
              <h2 className="text-xl font-extrabold sm:text-2xl">{t.home.advertiserTitle}</h2>
              <p className="mt-1 max-w-xl text-navy-200">{t.home.advertiserBody}</p>
            </div>
          </div>
          <Link href="/for-advertisers" className="btn-gold shrink-0">
            {t.home.advertiserCta} <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        <p className="mt-6 text-xs text-navy-500">{t.home.disclaimer}</p>
      </section>
    </>
  );
}
