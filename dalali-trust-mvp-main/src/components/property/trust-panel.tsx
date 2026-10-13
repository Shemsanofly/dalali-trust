import { CheckCircle2, Clock, ShieldQuestion } from "lucide-react";
import Link from "next/link";
import { fmt, type Dictionary, type Locale } from "@/i18n";
import { formatDate } from "@/lib/dates";
import type { TrustCheck, TrustSummary } from "@/server/services/trust";

export function TrustPanel({
  t,
  locale,
  trust,
  reviewed,
}: {
  t: Dictionary;
  locale: Locale;
  trust: TrustSummary;
  reviewed: boolean;
}) {
  const checks: TrustCheck[] = [
    trust.identity,
    trust.advertiserRole,
    ...(trust.propertyEvidence ? [trust.propertyEvidence] : []),
  ];
  return (
    <section className="card p-5" aria-labelledby="trust-title">
      <h2 id="trust-title" className="text-lg font-bold text-navy-900">
        {t.trust.title}
      </h2>
      <ul className="mt-3 space-y-3 text-sm">
        {reviewed ? (
          <li className="flex gap-2">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden />
            <span>{t.trust.listingReviewed}</span>
          </li>
        ) : null}
        {checks.map((c) => (
          <li key={c.type} className="flex gap-2">
            {c.state === "VERIFIED" ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden />
            ) : c.state === "PENDING" ? (
              <Clock className="mt-0.5 h-5 w-5 shrink-0 text-gold-600" aria-hidden />
            ) : (
              <ShieldQuestion className="mt-0.5 h-5 w-5 shrink-0 text-navy-400" aria-hidden />
            )}
            <div>
              <p className="font-semibold text-navy-800">
                {t.trust.checks[c.type]}: <span className="font-normal">{t.trust.states[c.state]}</span>
              </p>
              {c.state === "VERIFIED" && c.decidedAt ? (
                <p className="text-xs text-navy-500">
                  {fmt(t.trust.verifiedOn, { date: formatDate(c.decidedAt, locale) })}
                  {c.expiresAt
                    ? `, ${fmt(t.trust.expiresOn, { date: formatDate(c.expiresAt, locale) })}`
                    : ""}
                </p>
              ) : null}
              {c.state === "VERIFIED" && c.scopeStatement ? (
                <p className="mt-1 text-xs text-navy-600">{c.scopeStatement}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-navy-600">{t.trust.notOwnership}</p>
      <Link href="/verification" className="mt-2 inline-block text-sm font-semibold text-brand-700 underline">
        {t.trust.learnMore}
      </Link>
    </section>
  );
}
