export default function Loading() {
  return (
    <div className="container-page py-8" aria-busy="true" aria-live="polite">
      <div className="h-8 w-48 animate-pulse rounded bg-navy-100" />
      <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="card h-80 animate-pulse bg-navy-100/60" />
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
