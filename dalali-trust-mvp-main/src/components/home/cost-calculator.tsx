"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";
import { fmt, type Locale } from "@/i18n";
import { agentFeeAmount, agentFeePercent } from "@/lib/fees";
import { formatTZS, moveInCost } from "@/lib/money";
import { useTweened } from "../motion/use-tweened";

type Labels = {
  title: string;
  body: string;
  rent: string;
  advance: string;
  deposit: string;
  agentFee: string;
  months: string;
  total: string;
  breakdown: string;
  note: string;
  cta: string;
};

function Slider({
  id,
  label,
  value,
  display,
  min,
  max,
  step,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-semibold text-navy-800">
          {label}
        </label>
        <output htmlFor={id} className="text-sm font-bold text-brand-700 tabular-nums">
          {display}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full accent-brand-600"
        style={{
          background: `linear-gradient(to right, var(--color-brand-500) ${pct}%, var(--color-navy-100) ${pct}%)`,
        }}
      />
    </div>
  );
}

/** Interactive move-in cost estimate using the same arithmetic as listing pages. */
export function CostCalculator({ labels, locale }: { labels: Labels; locale: Locale }) {
  const id = useId();
  const [rent, setRent] = useState(300_000);
  const [advance, setAdvance] = useState(6);
  const [depositMonths, setDepositMonths] = useState(1);

  const deposit = rent * depositMonths;
  const agentFee = agentFeeAmount(rent);
  const cost = moveInCost({
    rentAmount: rent,
    advanceMonths: advance,
    depositAmount: deposit,
    agentFeeAmount: agentFee,
    charges: [],
  });
  const money = (n: number) => formatTZS(n, locale);
  const shownTotal = useTweened(cost.total);
  const segments = [
    { amount: cost.advanceRent, className: "bg-brand-500" },
    { amount: deposit, className: "bg-gold-300" },
    { amount: agentFee, className: "bg-navy-400" },
  ];

  return (
    <div className="grid overflow-hidden rounded-xl border border-navy-100 bg-white lg:grid-cols-[3fr_2fr]">
      <div className="p-6 sm:p-8">
        <h2 className="display text-3xl">{labels.title}</h2>
        <p className="mt-3 text-navy-600">{labels.body}</p>
        <div className="mt-6 space-y-5">
          <Slider
            id={`${id}-rent`}
            label={labels.rent}
            value={rent}
            display={money(rent)}
            min={10_000}
            max={2_000_000}
            step={10_000}
            onChange={setRent}
          />
          <Slider
            id={`${id}-adv`}
            label={labels.advance}
            value={advance}
            display={fmt(labels.months, { count: advance })}
            min={1}
            max={12}
            step={1}
            onChange={setAdvance}
          />
          <Slider
            id={`${id}-dep`}
            label={labels.deposit}
            value={depositMonths}
            display={money(deposit)}
            min={0}
            max={3}
            step={1}
            onChange={setDepositMonths}
          />
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm font-semibold text-navy-800">
              {labels.agentFee} ({agentFeePercent(rent)}%)
            </span>
            <output className="text-sm font-bold text-brand-700 tabular-nums" aria-live="polite">
              {money(agentFee)}
            </output>
          </div>
        </div>
      </div>

      <div className="flex flex-col justify-center bg-navy-900 p-6 text-white sm:p-8">
        <p className="text-sm font-semibold text-navy-200">{labels.total}</p>
        <p
          className="mt-2 font-display text-4xl font-semibold text-gold-300 tabular-nums sm:text-5xl"
          aria-hidden
        >
          {money(shownTotal)}
        </p>
        <p className="sr-only" aria-live="polite">
          {money(cost.total)}
        </p>
        <div className="mt-6 flex h-2 overflow-hidden rounded-sm bg-white/10" aria-hidden>
          {segments.map((s, i) => (
            <div
              key={i}
              className={`${s.className} transition-[width] duration-500 ease-out`}
              style={{ width: `${cost.total ? (s.amount / cost.total) * 100 : 0}%` }}
            />
          ))}
        </div>
        <p className="mt-3 text-sm leading-relaxed text-navy-200">
          {fmt(labels.breakdown, {
            advance: money(cost.advanceRent),
            deposit: money(deposit),
            fee: money(agentFee),
          })}
        </p>
        <p className="mt-6 text-sm text-navy-300">{labels.note}</p>
        <Link href={`/properties?maxRent=${rent}`} className="btn-gold mt-6 self-start">
          {labels.cta} <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
