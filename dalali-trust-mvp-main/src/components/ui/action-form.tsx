"use client";

import { useActionState, type ReactNode } from "react";
import { FieldError, FormMessage, SubmitButton } from "./form";

type State = { ok: boolean; message?: string; fieldErrors?: Record<string, string[]> };
type Action = (prev: State, form: FormData) => Promise<State>;

/**
 * A small generic form bound to a server action, showing the action's success or error
 * message. Children render the fields (they can be server-rendered).
 */
export function ActionForm({
  action,
  submitLabel,
  submitClassName = "btn-primary",
  className = "space-y-3",
  children,
  encType,
  resetOnSuccess,
}: {
  action: Action;
  submitLabel: string;
  submitClassName?: string;
  className?: string;
  children?: ReactNode;
  encType?: "multipart/form-data";
  resetOnSuccess?: boolean;
}) {
  const [state, formAction] = useActionState(action, { ok: false });
  return (
    <form
      action={formAction}
      className={className}
      encType={encType}
      key={resetOnSuccess && state.ok ? state.message : undefined}
    >
      <FormMessage state={state} />
      {children}
      {state.fieldErrors ? (
        <ul className="text-sm text-red-700">
          {Object.entries(state.fieldErrors).map(([k, v]) => (
            <li key={k}>
              <FieldError errors={v.map((m) => (k === "_form" ? m : `${k}: ${m}`))} />
            </li>
          ))}
        </ul>
      ) : null}
      <SubmitButton className={submitClassName}>{submitLabel}</SubmitButton>
    </form>
  );
}
