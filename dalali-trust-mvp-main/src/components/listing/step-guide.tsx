import { Check } from "lucide-react";
import type { Dictionary } from "@/i18n";

/** Three-step progress for a new listing: details → photos → send for review. */
export function StepGuide({ t, current }: { t: Dictionary["landlord"]["steps"]; current: 1 | 2 | 3 }) {
  const steps = [t.details, t.photos, t.submit];
  return (
    <nav aria-label={t.label} className="mb-6">
      <ol className="flex items-center gap-2 text-sm">
        {steps.map((label, i) => {
          const n = i + 1;
          const done = n < current;
          const active = n === current;
          return (
            <li
              key={label}
              className="flex min-w-0 flex-1 items-center gap-2"
              aria-current={active ? "step" : undefined}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors ${
                  done
                    ? "border-brand-600 bg-brand-600 text-white"
                    : active
                      ? "border-brand-600 bg-white text-brand-700"
                      : "border-navy-200 bg-white text-navy-500"
                }`}
              >
                {done ? <Check className="h-4 w-4" aria-hidden /> : n}
              </span>
              <span
                className={`text-xs leading-tight font-semibold sm:text-sm ${active ? "text-navy-900" : done ? "text-navy-700" : "text-navy-500"}`}
              >
                {label}
              </span>
              {n < steps.length ? (
                <span
                  className={`hidden h-0.5 flex-1 rounded sm:block ${done ? "bg-brand-600" : "bg-navy-100"}`}
                  aria-hidden
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
