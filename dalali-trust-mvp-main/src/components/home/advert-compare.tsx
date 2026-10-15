"use client";

import { Forward, X } from "lucide-react";
import { useId, useState } from "react";
import type { Dictionary, Locale } from "@/i18n";
import { formatTZS, moveInCost } from "@/lib/money";

type Labels = Dictionary["home"]["compare"];

const EXAMPLE = {
  rentAmount: 180_000,
  advanceMonths: 6,
  depositAmount: 0,
  agentFeeAmount: 180_000,
  charges: [],
};

/**
 * Hero illustration: the same room as a forwarded WhatsApp-style advert and as a
 * Dalali Trust listing sheet. The figures are a fixed, clearly labelled example.
 */
export function AdvertCompare({ labels, locale }: { labels: Labels; locale: Locale }) {
  const id = useId();
  const [tab, setTab] = useState<"vague" | "clear">("vague");
  const cost = moveInCost(EXAMPLE);
  const money = (n: number) => formatTZS(n, locale);
  const tabs = [
    { key: "vague", label: labels.vagueTab },
    { key: "clear", label: labels.clearTab },
  ] as const;

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div role="tablist" aria-label={labels.label} className="inline-flex rounded-lg bg-sand-100 p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              id={`${id}-${t.key}-tab`}
              aria-controls={`${id}-${t.key}`}
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                  const next = tab === "vague" ? "clear" : "vague";
                  setTab(next);
                  document.getElementById(`${id}-${next}-tab`)?.focus();
                }
              }}
              tabIndex={tab === t.key ? 0 : -1}
              className="rounded-md px-3.5 py-2 text-sm font-semibold text-navy-600 transition-colors aria-selected:bg-white aria-selected:text-navy-900 aria-selected:shadow-sm"
            >
              {t.label}
            </button>
          ))}
        </div>
        <span className="text-xs font-medium tracking-wide text-navy-500 uppercase">{labels.label}</span>
      </div>

      <div className="mt-4 min-h-[23rem]">
        <div
          role="tabpanel"
          id={`${id}-vague`}
          aria-labelledby={`${id}-vague-tab`}
          hidden={tab !== "vague"}
          className="rounded-xl bg-[#e9e4d8] p-5 sm:p-6"
        >
          <div className="max-w-[19rem] rounded-lg rounded-tl-none bg-[#dcf8c6] px-3.5 pt-2 pb-1.5 text-[15px] text-[#111b21] shadow-[0_1px_0_rgb(0_0_0_/_0.12)]">
            <p className="flex items-center gap-1 text-xs text-[#667781] italic">
              <Forward className="h-3.5 w-3.5" aria-hidden /> {labels.vagueMeta}
            </p>
            <p className="mt-1 leading-snug">{labels.vagueAd}</p>
            <p className="mt-1 text-right text-[11px] text-[#667781]">09:41</p>
          </div>
          <p className="mt-6 text-sm font-semibold text-navy-800">{labels.missingTitle}</p>
          <ul className="mt-2 space-y-2">
            {labels.missing.map((m) => (
              <li key={m} className="flex items-start gap-2 text-sm text-navy-700">
                <X className="mt-0.5 h-4 w-4 shrink-0 text-red-700" aria-hidden />
                {m}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setTab("clear")}
            className="mt-5 text-sm font-semibold text-brand-700 underline underline-offset-4 hover:text-brand-800"
          >
            {labels.clearTab} →
          </button>
        </div>

        <div
          role="tabpanel"
          id={`${id}-clear`}
          aria-labelledby={`${id}-clear-tab`}
          hidden={tab !== "clear"}
          className="relative overflow-hidden rounded-xl border border-navy-100 bg-white p-5 sm:p-6"
        >
          <span
            className="pointer-events-none absolute top-5 right-4 -rotate-12 rounded border-2 border-brand-600/70 px-2 py-0.5 font-display text-sm font-semibold tracking-widest text-brand-700/80 uppercase"
            aria-hidden
          >
            {labels.stamp}
          </span>
          <p className="pr-24 font-display text-xl font-semibold text-navy-900">{labels.title}</p>
          <p className="mt-1 text-navy-600">
            <span className="text-2xl font-bold text-navy-900">{money(EXAMPLE.rentAmount)}</span>{" "}
            {labels.perMonth}
          </p>
          <dl className="mt-5 space-y-2 text-sm">
            {[
              [labels.advance, money(cost.advanceRent)],
              [labels.deposit, labels.none],
              [labels.agentFee, money(EXAMPLE.agentFeeAmount)],
              [labels.utilities, labels.utilitiesValue],
            ].map(([k, v]) => (
              <div key={k} className="flex items-baseline gap-2">
                <dt className="text-navy-600">{k}</dt>
                <span className="flex-1 border-b border-dotted border-navy-200" aria-hidden />
                <dd className="font-medium text-navy-900">{v}</dd>
              </div>
            ))}
            <div className="flex items-baseline gap-2 border-t border-navy-900 pt-2.5">
              <dt className="font-semibold text-navy-900">{labels.total}</dt>
              <span className="flex-1" aria-hidden />
              <dd className="text-base font-bold text-navy-900">{money(cost.total)}</dd>
            </div>
          </dl>
          <dl className="mt-5 grid grid-cols-2 gap-3 rounded-lg bg-sand-50 p-3 text-xs">
            <div>
              <dt className="text-navy-500">{labels.advertiser}</dt>
              <dd className="mt-0.5 font-semibold text-navy-800">{labels.advertiserValue}</dd>
            </div>
            <div>
              <dt className="text-navy-500">{labels.availability}</dt>
              <dd className="mt-0.5 font-semibold text-navy-800">{labels.availabilityValue}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
