import { fmt, type Dictionary, type Locale } from "@/i18n";
import { formatTZS, moveInCost } from "@/lib/money";

type Props = {
  t: Dictionary;
  locale: Locale;
  p: {
    rentAmount: number;
    advanceMonths: number;
    depositAmount: number;
    agentFeeAmount: number;
    agentFeeNote: string | null;
    paymentTerms: string | null;
    charges: {
      id: string;
      label: string;
      amount: number;
      frequency: "ONE_TIME" | "MONTHLY";
      note: string | null;
    }[];
  };
};

export function CostBreakdown({ t, locale, p }: Props) {
  const cost = moveInCost(p);
  const money = (n: number) => (n === 0 ? t.property.none : formatTZS(n, locale));
  return (
    <section className="card p-5" aria-labelledby="costs-title">
      <h2 id="costs-title" className="text-lg font-bold text-navy-900">
        {t.property.costsTitle}
      </h2>
      <dl className="mt-3 divide-y divide-navy-100 text-sm">
        <Row label={t.property.rent} value={formatTZS(p.rentAmount, locale)} strong />
        <Row
          label={`${t.property.advance} (${fmt(t.property.advanceMonths, { count: p.advanceMonths })})`}
          value={formatTZS(cost.advanceRent, locale)}
        />
        <Row label={t.property.deposit} value={money(p.depositAmount)} />
        <Row label={t.property.agentFee} value={money(p.agentFeeAmount)} hint={p.agentFeeNote} />
        {p.charges.map((c) => (
          <Row
            key={c.id}
            label={`${c.label} (${c.frequency === "MONTHLY" ? t.property.monthly : t.property.oneTime})`}
            value={formatTZS(c.amount, locale)}
            hint={c.note}
          />
        ))}
      </dl>
      <div className="mt-4 rounded-xl bg-navy-50 p-4">
        <p className="text-sm font-semibold text-navy-700">{t.property.moveInTotal}</p>
        <p className="text-2xl font-extrabold text-navy-900">{formatTZS(cost.total, locale)}</p>
        <p className="mt-1 text-xs text-navy-600">{t.property.moveInNote}</p>
      </div>
      {p.paymentTerms ? (
        <p className="mt-3 text-sm text-navy-700">
          <span className="font-semibold">{t.property.paymentTerms}:</span> {p.paymentTerms}
        </p>
      ) : null}
    </section>
  );
}

function Row({
  label,
  value,
  hint,
  strong,
}: {
  label: string;
  value: string;
  hint?: string | null;
  strong?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <dt className="text-navy-600">
        {label}
        {hint ? <span className="block text-xs text-navy-500">{hint}</span> : null}
      </dt>
      <dd className={strong ? "font-extrabold text-navy-900" : "font-semibold text-navy-800"}>{value}</dd>
    </div>
  );
}
