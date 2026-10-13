"use client";

import { Heart } from "lucide-react";
import { useActionState } from "react";
import { reportAction, toggleSavedAction, viewingRequestAction } from "@/app/actions/tenant";
import { FieldError, FormMessage, SubmitButton } from "../ui/form";

const initial = { ok: false } as { ok: boolean; message?: string; fieldErrors?: Record<string, string[]> };

export function SaveButton({
  propertyId,
  initiallySaved,
  labels,
}: {
  propertyId: string;
  initiallySaved: boolean;
  labels: { save: string; saved: string };
}) {
  const [state, action] = useActionState(toggleSavedAction, initial);
  const saved = state.message === "saved" ? true : state.message === "unsaved" ? false : initiallySaved;
  return (
    <form action={action}>
      <input type="hidden" name="propertyId" value={propertyId} />
      <SubmitButton className="btn-secondary" pendingLabel="…">
        <Heart className={`h-4 w-4 ${saved ? "fill-red-600 text-red-600" : ""}`} aria-hidden />
        <span aria-live="polite">{saved ? labels.saved : labels.save}</span>
      </SubmitButton>
      {!state.ok && state.message ? <p className="mt-1 text-sm text-red-700">{state.message}</p> : null}
    </form>
  );
}

type ViewingLabels = {
  title: string;
  when: string;
  message: string;
  messagePlaceholder: string;
  phone: string;
  phoneHelp: string;
  submit: string;
  sent: string;
};

export function ViewingRequestForm({
  propertyId,
  labels,
  minDateTime,
}: {
  propertyId: string;
  labels: ViewingLabels;
  minDateTime: string;
}) {
  const [state, action] = useActionState(viewingRequestAction, initial);
  if (state.ok) return <FormMessage state={{ ok: true, message: labels.sent }} />;
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="propertyId" value={propertyId} />
      <FormMessage state={state} />
      <div>
        <label className="label" htmlFor="proposedAt">
          {labels.when}
        </label>
        <input
          className="input"
          type="datetime-local"
          id="proposedAt"
          name="proposedAt"
          required
          min={minDateTime}
          aria-describedby="proposedAt-error"
        />
        <FieldError id="proposedAt-error" errors={state.fieldErrors?.proposedAt} />
      </div>
      <div>
        <label className="label" htmlFor="message">
          {labels.message}
        </label>
        <textarea
          className="input"
          id="message"
          name="message"
          rows={3}
          maxLength={1000}
          placeholder={labels.messagePlaceholder}
        />
      </div>
      <div>
        <label className="label" htmlFor="contactPhone">
          {labels.phone}
        </label>
        <input
          className="input"
          id="contactPhone"
          name="contactPhone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="07XX XXX XXX"
          aria-describedby="phone-help"
        />
        <p id="phone-help" className="mt-1 text-xs text-navy-500">
          {labels.phoneHelp}
        </p>
        <FieldError errors={state.fieldErrors?.contactPhone} />
      </div>
      <SubmitButton className="btn-primary w-full">{labels.submit}</SubmitButton>
    </form>
  );
}

type ReportLabels = {
  intro: string;
  category: string;
  categories: Record<string, string>;
  description: string;
  descriptionHelp: string;
  evidence: string;
  submit: string;
  sent: string;
};

export function ReportForm({ propertyId, labels }: { propertyId: string; labels: ReportLabels }) {
  const [state, action] = useActionState(reportAction, initial);
  if (state.ok) return <FormMessage state={{ ok: true, message: labels.sent }} />;
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="propertyId" value={propertyId} />
      <p className="text-sm text-navy-600">{labels.intro}</p>
      <FormMessage state={state} />
      <div>
        <label className="label" htmlFor="category">
          {labels.category}
        </label>
        <select className="input" id="category" name="category" required defaultValue="">
          <option value="" disabled>
            —
          </option>
          {Object.entries(labels.categories).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <FieldError errors={state.fieldErrors?.category} />
      </div>
      <div>
        <label className="label" htmlFor="description">
          {labels.description}
        </label>
        <textarea
          className="input"
          id="description"
          name="description"
          rows={4}
          minLength={20}
          maxLength={3000}
          required
          aria-describedby="desc-help"
        />
        <p id="desc-help" className="mt-1 text-xs text-navy-500">
          {labels.descriptionHelp}
        </p>
        <FieldError errors={state.fieldErrors?.description} />
      </div>
      <div>
        <label className="label" htmlFor="evidence">
          {labels.evidence}
        </label>
        <input
          className="input"
          id="evidence"
          name="evidence"
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,application/pdf"
        />
      </div>
      <SubmitButton className="btn-danger w-full">{labels.submit}</SubmitButton>
    </form>
  );
}
