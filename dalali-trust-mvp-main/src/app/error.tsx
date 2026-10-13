"use client";

import { useEffect } from "react";

/** Generic error boundary. Never shows error details or stack traces to users. */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The digest lets operators correlate with server logs without exposing details.
    if (error.digest) console.warn("Error reference:", error.digest);
  }, [error]);
  return (
    <div className="container-page py-20 text-center">
      <h1 className="text-2xl font-extrabold text-navy-900">Something went wrong · Kuna hitilafu</h1>
      <p className="mt-2 text-navy-600">Please try again. If the problem continues, contact support.</p>
      {error.digest ? <p className="mt-1 text-xs text-navy-500">Reference: {error.digest}</p> : null}
      <button type="button" onClick={reset} className="btn-primary mt-6">
        Try again · Jaribu tena
      </button>
    </div>
  );
}
