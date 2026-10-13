"use client";

import { useActionState } from "react";
import { feedbackAction } from "@/app/actions/common";
import { FieldError, FormMessage, SubmitButton } from "./ui/form";

export function FeedbackForm({
  kind,
  page,
  labels,
}: {
  kind: "FEEDBACK" | "CONTACT";
  page?: string;
  labels: { prompt: string; submit: string; thanks: string; name: string; email: string };
}) {
  const [state, action] = useActionState(feedbackAction, { ok: false } as {
    ok: boolean;
    message?: string;
    fieldErrors?: Record<string, string[]>;
  });
  if (state.ok) return <FormMessage state={{ ok: true, message: labels.thanks }} />;
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="page" value={page ?? ""} />
      <FormMessage state={state} />
      {kind === "CONTACT" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="fb-name">
              {labels.name}
            </label>
            <input className="input" id="fb-name" name="name" maxLength={80} autoComplete="name" />
          </div>
          <div>
            <label className="label" htmlFor="fb-email">
              {labels.email}
            </label>
            <input className="input" id="fb-email" name="email" type="email" autoComplete="email" />
            <FieldError errors={state.fieldErrors?.email} />
          </div>
        </div>
      ) : null}
      <div>
        <label className="label" htmlFor="fb-message">
          {labels.prompt}
        </label>
        <textarea
          className="input"
          id="fb-message"
          name="message"
          rows={4}
          required
          minLength={5}
          maxLength={3000}
        />
        <FieldError errors={state.fieldErrors?.message} />
      </div>
      <SubmitButton>{labels.submit}</SubmitButton>
    </form>
  );
}
