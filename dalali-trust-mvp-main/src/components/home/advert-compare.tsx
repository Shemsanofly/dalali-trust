"use client";

import { Forward, X } from "lucide-react";
import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import type { Dictionary, Locale } from "@/i18n";
import { formatTZS, moveInCost } from "@/lib/money";

type Labels = Dictionary["home"]["compare"];
type Tab = "vague" | "clear";

const EXAMPLE = {
  rentAmount: 180_000,
  advanceMonths: 6,
  depositAmount: 0,
  agentFeeAmount: 180_000,
  charges: [],
};

const delay = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

/**
 * Hero illustration: the same room as a forwarded WhatsApp-style advert and as a
 * Dalali Trust listing sheet. The figures are a fixed, clearly labelled example.
 */
export function AdvertCompare({ labels, locale }: { labels: Labels; locale: Locale }) {
  const id = useId();
  const [tab, setTab] = useState<Tab>("vague");
  // Coming back to the advert replays it "arriving": a typing indicator, then the message.
  const [typing, setTyping] = useState(false);
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({ vague: null, clear: null });
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);
  const cost = moveInCost(EXAMPLE);
  const money = (n: number) => formatTZS(n, locale);
  const tabs = [
    { key: "vague", label: labels.vagueTab },
    { key: "clear", label: labels.clearTab },
  ] as const;

  useLayoutEffect(() => {
    const measure = () => {
      const el = tabRefs.current[tab];
      if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [tab]);

  useEffect(() => {
    if (!typing) return;
    const t = window.setTimeout(() => setTyping(false), 900);
    return () => window.clearTimeout(t);
  }, [typing]);

  const select = (next: Tab, focus = false) => {
    if (next === tab) return;
    setTab(next);
    if (next === "vague" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) setTyping(true);
    if (focus) tabRefs.current[next]?.focus();
  };

  return (
    <div className="rise" style={delay(200)}>
      <div className="flex items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label={labels.label}
          className="relative inline-flex rounded-lg bg-sand-100 p-1"
        >
          {indicator ? (
            <span
              className="absolute top-1 bottom-1 left-0 rounded-md bg-white shadow-sm transition-[transform,width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{ width: indicator.width, transform: `translateX(${indicator.left}px)` }}
              aria-hidden
            />
          ) : null}
          {tabs.map((t) => (
            <button
              key={t.key}
              ref={(el) => {
                tabRefs.current[t.key] = el;
              }}
              type="button"
              role="tab"
              id={`${id}-${t.key}-tab`}
              aria-controls={`${id}-${t.key}`}
              aria-selected={tab === t.key}
              onClick={() => select(t.key)}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight" || e.key === "ArrowLeft")
                  select(tab === "vague" ? "clear" : "vague", true);
              }}
              tabIndex={tab === t.key ? 0 : -1}
              className={`relative rounded-md px-3.5 py-2 text-sm font-semibold text-navy-600 transition-colors aria-selected:text-navy-900 ${
                indicator ? "" : "aria-selected:bg-white aria-selected:shadow-sm"
              }`}
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
          className="pop-in rounded-xl bg-[#e9e4d8] p-5 sm:p-6"
        >
          <div className="min-h-[7.5rem]">
            {typing ? (
              <div
                className="pop-in inline-flex gap-1 rounded-lg rounded-tl-none bg-white px-3.5 py-3 shadow-[0_1px_0_rgb(0_0_0_/_0.12)]"
                aria-hidden
              >
                {[0, 150, 300].map((d) => (
                  <span
                    key={d}
                    className="typing-dot h-2 w-2 rounded-full bg-[#54656f]"
                    style={{ animationDelay: `${d}ms` }}
                  />
                ))}
              </div>
            ) : (
              <div
                className="pop-in max-w-[19rem] rounded-lg rounded-tl-none bg-[#dcf8c6] px-3.5 pt-2 pb-1.5 text-[15px] text-[#111b21] shadow-[0_1px_0_rgb(0_0_0_/_0.12)]"
                style={delay(500)}
              >
                <p className="flex items-center gap-1 text-xs text-[#54656f] italic">
                  <Forward className="h-3.5 w-3.5" aria-hidden /> {labels.vagueMeta}
                </p>
                <p className="mt-1 leading-snug">{labels.vagueAd}</p>
                <p className="mt-1 text-right text-[11px] text-[#54656f]">09:41</p>
              </div>
            )}
          </div>
          <p className="mt-6 text-sm font-semibold text-navy-800">{labels.missingTitle}</p>
          <ul className="mt-2 space-y-2">
            {labels.missing.map((m, i) => (
              <li
                key={m}
                className="rise flex items-start gap-2 text-sm text-navy-700"
                style={delay((typing ? 1000 : 700) + i * 120)}
              >
                <X className="mt-0.5 h-4 w-4 shrink-0 text-red-700" aria-hidden />
                {m}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => select("clear")}
            className="group mt-5 text-sm font-semibold text-brand-700 underline underline-offset-4 hover:text-brand-800"
          >
            {labels.clearTab}{" "}
            <span className="inline-block transition-transform group-hover:translate-x-1" aria-hidden>
              →
            </span>
          </button>
        </div>

        <div
          role="tabpanel"
          id={`${id}-clear`}
          aria-labelledby={`${id}-clear-tab`}
          hidden={tab !== "clear"}
          className="pop-in relative overflow-hidden rounded-xl border border-navy-100 bg-white p-5 sm:p-6"
        >
          <span
            className="stamp-in pointer-events-none absolute top-5 right-4 rounded border-2 border-brand-600/70 px-2 py-0.5 font-display text-sm font-semibold tracking-widest text-brand-700/80 uppercase"
            style={delay(750)}
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
            ].map(([k, v], i) => (
              <div key={k} className="rise flex items-baseline gap-2" style={delay(120 + i * 90)}>
                <dt className="text-navy-600">{k}</dt>
                <span className="flex-1 border-b border-dotted border-navy-200" aria-hidden />
                <dd className="font-medium text-navy-900">{v}</dd>
              </div>
            ))}
            <div
              className="rise flex items-baseline gap-2 border-t border-navy-900 pt-2.5"
              style={delay(520)}
            >
              <dt className="font-semibold text-navy-900">{labels.total}</dt>
              <span className="flex-1" aria-hidden />
              <dd className="text-base font-bold text-navy-900">{money(cost.total)}</dd>
            </div>
          </dl>
          <dl
            className="rise mt-5 grid grid-cols-2 gap-3 rounded-lg bg-sand-50 p-3 text-xs"
            style={delay(620)}
          >
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
