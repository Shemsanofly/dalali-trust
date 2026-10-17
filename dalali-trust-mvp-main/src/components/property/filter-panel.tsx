"use client";

import { SlidersHorizontal } from "lucide-react";
import { useId, useState } from "react";

/**
 * Search filters: always visible beside the results on large screens; on phones and tablets
 * they fold away behind a "Filters" button at the top so the homes come first.
 */
export function FilterPanel({
  label,
  summary,
  activeCount,
  children,
}: {
  label: string;
  summary: string;
  activeCount: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  return (
    <div>
      <div className="flex items-center justify-between gap-3 lg:hidden">
        <p className="text-sm text-navy-600">{summary}</p>
        <button
          type="button"
          className="btn-secondary"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((o) => !o)}
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden />
          {label}
          {activeCount ? (
            <span className="rounded-full bg-brand-700 px-2 text-xs leading-5 text-white">{activeCount}</span>
          ) : null}
        </button>
      </div>
      <div id={panelId} className={`${open ? "mt-4" : "max-lg:hidden"} lg:mt-0`}>
        {children}
      </div>
    </div>
  );
}
