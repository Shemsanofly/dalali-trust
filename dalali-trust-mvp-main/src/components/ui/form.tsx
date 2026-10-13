"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

export function SubmitButton({
  children,
  pendingLabel,
  className = "btn-primary",
  name,
  value,
}: {
  children: ReactNode;
  pendingLabel?: string;
  className?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={className}
      disabled={pending}
      aria-disabled={pending}
      name={name}
      value={value}
    >
      {pending ? (pendingLabel ?? "…") : children}
    </button>
  );
}

export function FieldError({ errors, id }: { errors?: string[]; id?: string }) {
  if (!errors?.length) return null;
  return (
    <p id={id} className="mt-1 text-sm text-red-700" role="alert">
      {errors[0]}
    </p>
  );
}

export function FormMessage({ state }: { state: { ok: boolean; message?: string } }) {
  if (!state.message) return null;
  return (
    <div
      role={state.ok ? "status" : "alert"}
      className={`rounded-xl border px-4 py-3 text-sm ${state.ok ? "border-brand-200 bg-brand-50 text-brand-800" : "border-red-200 bg-red-50 text-red-800"}`}
    >
      {state.message}
    </div>
  );
}
