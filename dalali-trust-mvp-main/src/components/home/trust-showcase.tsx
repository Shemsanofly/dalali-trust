"use client";

import { BadgeCheck, CheckCircle2, Circle, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";

type Labels = {
  label: string;
  steps: string[];
  verified: string;
  verifiedNote: string;
  noUpfront: string;
};

/** Hero illustration: a listing "earning" its checks one by one, with floating trust chips. */
export function TrustShowcase({ labels }: { labels: Labels }) {
  const total = labels.steps.length;
  const [done, setDone] = useState(total);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setDone((d) => (d >= total ? 0 : d + 1)), 1400);
    return () => window.clearInterval(id);
  }, [paused, total]);

  const progress = Math.round((done / total) * 100);

  return (
    <div
      className="relative mx-auto w-full max-w-md"
      onPointerEnter={() => {
        setPaused(true);
        setDone(total);
      }}
      onPointerLeave={() => setPaused(false)}
    >
      <div className="glass rounded-3xl p-6 shadow-2xl shadow-black/30">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-bold tracking-widest text-gold-300 uppercase">{labels.label}</p>
          <span className="rounded-full bg-brand-500/15 px-2.5 py-1 text-xs font-bold text-brand-300 tabular-nums">
            {progress}%
          </span>
        </div>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-linear-to-r from-brand-400 to-gold-400 transition-[width] duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <ul className="mt-5 mb-8 space-y-3">
          {labels.steps.map((step, i) => {
            const ok = i < done;
            return (
              <li
                key={step}
                className={`flex items-start gap-3 rounded-xl px-3 py-2.5 transition-all duration-500 ${
                  ok ? "bg-white/10 text-white" : "text-navy-300"
                }`}
              >
                {ok ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-400" aria-hidden />
                ) : (
                  <Circle className="mt-0.5 h-5 w-5 shrink-0 text-navy-500" aria-hidden />
                )}
                <span className="text-sm font-medium">{step}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="glass-light absolute -bottom-8 -left-4 flex animate-float items-center gap-3 rounded-2xl p-3.5 sm:-left-10">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100">
          <BadgeCheck className="h-5 w-5 text-brand-700" aria-hidden />
        </span>
        <span>
          <span className="block text-sm font-extrabold text-navy-900">{labels.verified}</span>
          <span className="block text-xs text-navy-600">{labels.verifiedNote}</span>
        </span>
      </div>

      <div
        className="glass-light absolute -top-6 -right-3 flex animate-float items-center gap-2.5 rounded-2xl px-3.5 py-2.5 sm:-right-8"
        style={{ animationDelay: "1.5s" }}
      >
        <ShieldAlert className="h-5 w-5 text-gold-600" aria-hidden />
        <span className="text-xs font-bold text-navy-900">{labels.noUpfront}</span>
      </div>
    </div>
  );
}
