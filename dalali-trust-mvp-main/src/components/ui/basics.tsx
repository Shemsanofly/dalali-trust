import Link from "next/link";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex animate-fade-up flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-navy-900 sm:text-3xl">{title}</h1>
        <span
          className="mt-2 block h-1 w-12 rounded-full bg-linear-to-r from-brand-500 to-gold-400"
          aria-hidden
        />
        {subtitle ? <p className="mt-1 text-navy-600">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="card flex animate-fade-up flex-col items-center px-6 py-12 text-center">
      <p className="text-lg font-semibold text-navy-900">{title}</p>
      {body ? <p className="mt-1 max-w-md text-navy-600">{body}</p> : null}
      {action ? (
        <Link href={action.href} className="btn-primary mt-5">
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

const tones = {
  green: "bg-brand-50 text-brand-800 border-brand-200",
  amber: "bg-gold-50 text-gold-800 border-gold-200",
  red: "bg-red-50 text-red-800 border-red-200",
  gray: "bg-navy-50 text-navy-700 border-navy-200",
  blue: "bg-sky-50 text-sky-800 border-sky-200",
} as const;

export type Tone = keyof typeof tones;

export function Badge({ tone = "gray", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function Notice({ tone = "amber", children }: { tone?: Tone; children: ReactNode }) {
  return <div className={`rounded-xl border px-4 py-3 text-sm ${tones[tone]}`}>{children}</div>;
}

const STATUS_TONES: Record<string, Tone> = {
  DRAFT: "gray",
  PENDING_REVIEW: "amber",
  PUBLISHED: "green",
  REJECTED: "red",
  ARCHIVED: "gray",
  SUSPENDED: "red",
  MORE_INFO_REQUIRED: "amber",
  VERIFIED: "green",
  EXPIRED: "gray",
  SUBMITTED: "blue",
  UNDER_REVIEW: "amber",
  INFO_REQUESTED: "amber",
  ACTION_TAKEN: "green",
  DISMISSED: "gray",
  APPEALED: "amber",
  PENDING: "amber",
  ACCEPTED: "green",
  DECLINED: "red",
  CANCELLED: "gray",
  COMPLETED: "green",
  ACTIVE: "green",
  DELETED: "gray",
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return (
    <Badge tone={STATUS_TONES[status] ?? "gray"}>{label ?? status.replaceAll("_", " ").toLowerCase()}</Badge>
  );
}

export function Pagination({
  page,
  pageCount,
  hrefFor,
  labels,
}: {
  page: number;
  pageCount: number;
  hrefFor: (p: number) => string;
  labels: { previous: string; next: string; page: string };
}) {
  if (pageCount <= 1) return null;
  return (
    <nav className="mt-8 flex items-center justify-between gap-3" aria-label="Pagination">
      {page > 1 ? (
        <Link className="btn-secondary" href={hrefFor(page - 1)} rel="prev">
          {labels.previous}
        </Link>
      ) : (
        <span />
      )}
      <span className="text-sm text-navy-600">{labels.page}</span>
      {page < pageCount ? (
        <Link className="btn-secondary" href={hrefFor(page + 1)} rel="next">
          {labels.next}
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
