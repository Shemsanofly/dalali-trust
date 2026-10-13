"use client";

import { useActionState } from "react";
import type { Dictionary } from "@/i18n";
import { REGIONS } from "@/lib/locations";
import { FieldError, FormMessage, SubmitButton } from "../ui/form";

type State = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[]>;
  values?: Record<string, string>;
};
type Action = (prev: State, form: FormData) => Promise<State>;

export type ListingDefaults = {
  id?: string;
  title?: string;
  description?: string;
  propertyType?: string;
  region?: string;
  district?: string;
  neighborhood?: string;
  streetAddress?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  rentAmount?: number;
  advanceMonths?: number;
  depositAmount?: number;
  agentFeeAmount?: number;
  agentFeeNote?: string | null;
  paymentTerms?: string | null;
  bedrooms?: number;
  bathrooms?: number;
  furnished?: boolean;
  amenities?: string[];
  electricity?: string;
  water?: string;
  utilityNotes?: string | null;
  contactPhone?: string | null;
  contactWhatsapp?: string | null;
  availabilityStatus?: string;
  availableFrom?: string | null;
  charges?: { label: string; amount: number; frequency: string; note: string | null }[];
};

const PROPERTY_TYPES = ["ROOM", "BEDSITTER", "APARTMENT", "HOUSE", "OTHER"] as const;
const UTILITIES = [
  "SEPARATE_METER",
  "INCLUDED_IN_RENT",
  "SHARED_SPLIT",
  "NOT_AVAILABLE",
  "ASK_ADVERTISER",
] as const;

export function ListingForm({
  action,
  defaults,
  t,
  submitLabel,
}: {
  action: Action;
  defaults: ListingDefaults;
  t: Dictionary["property"];
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, { ok: false });
  const v = state.values;
  const err = state.fieldErrors ?? {};
  // After a failed submit, re-populate from what was sent; otherwise from saved data.
  const val = (k: keyof ListingDefaults & string, fallback?: string | number | null) =>
    (v ? (v[k] ?? "") : (fallback ?? "")).toString();
  const amenities = v ? (v.amenities ?? "").split(",") : (defaults.amenities ?? []);
  const charges = Array.from({ length: 6 }, (_, i) => ({
    label: v ? (v[`charge_label_${i}`] ?? "") : (defaults.charges?.[i]?.label ?? ""),
    amount: v ? (v[`charge_amount_${i}`] ?? "") : (defaults.charges?.[i]?.amount?.toString() ?? ""),
    frequency: v
      ? (v[`charge_frequency_${i}`] ?? "ONE_TIME")
      : (defaults.charges?.[i]?.frequency ?? "ONE_TIME"),
    note: v ? (v[`charge_note_${i}`] ?? "") : (defaults.charges?.[i]?.note ?? ""),
  }));
  const regionDistricts =
    REGIONS.find((r) => r.slug === val("region", defaults.region))?.districts ??
    REGIONS.flatMap((r) => r.districts);
  // Remount the form when server state changes so defaultValues refresh.
  const formKey = state.values ? JSON.stringify(state.values) : "saved";

  return (
    <form key={formKey} action={formAction} className="space-y-8" noValidate>
      {defaults.id ? <input type="hidden" name="id" value={defaults.id} /> : null}
      <FormMessage state={state} />

      <Section title="Basics">
        <Text
          name="title"
          label="Title"
          hint="E.g. Self-contained room near Mwenge bus stand"
          defaultValue={val("title", defaults.title)}
          errors={err.title}
          maxLength={120}
          required
        />
        <div>
          <label className="label" htmlFor="description">
            Description
          </label>
          <textarea
            className="input"
            id="description"
            name="description"
            rows={6}
            maxLength={5000}
            required
            defaultValue={val("description", defaults.description)}
            aria-describedby="description-hint"
          />
          <p id="description-hint" className="mt-1 text-xs text-navy-500">
            Describe the home honestly: condition, access road, security, who it suits. At least 40
            characters.
          </p>
          <FieldError errors={err.description} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Select
            name="propertyType"
            label="Property type"
            defaultValue={val("propertyType", defaults.propertyType ?? "BEDSITTER")}
            options={PROPERTY_TYPES.map((p) => [p, t.types[p]])}
            errors={err.propertyType}
          />
          <Text
            name="bedrooms"
            label="Bedrooms"
            type="number"
            min={0}
            max={20}
            defaultValue={val("bedrooms", defaults.bedrooms ?? 1)}
            errors={err.bedrooms}
          />
          <Text
            name="bathrooms"
            label="Bathrooms"
            type="number"
            min={0}
            max={20}
            defaultValue={val("bathrooms", defaults.bathrooms ?? 1)}
            errors={err.bathrooms}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="furnished"
            defaultChecked={v ? v.furnished === "on" : defaults.furnished}
            className="h-5 w-5 accent-brand-600"
          />{" "}
          {t.furnished}
        </label>
      </Section>

      <Section title="Location">
        <div className="grid gap-4 sm:grid-cols-3">
          <Select
            name="region"
            label="Region"
            defaultValue={val("region", defaults.region ?? "dar-es-salaam")}
            options={REGIONS.map((r) => [r.slug, r.name])}
            errors={err.region}
          />
          <div>
            <label className="label" htmlFor="district">
              District
            </label>
            <input
              className="input"
              id="district"
              name="district"
              list="district-list"
              required
              maxLength={80}
              defaultValue={val("district", defaults.district)}
            />
            <datalist id="district-list">
              {regionDistricts.map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
            <FieldError errors={err.district} />
          </div>
          <Text
            name="neighborhood"
            label="Neighbourhood / street area"
            defaultValue={val("neighborhood", defaults.neighborhood)}
            errors={err.neighborhood}
            maxLength={80}
            required
          />
        </div>
        <Text
          name="streetAddress"
          label="Directions or landmark (optional)"
          hint="Shown publicly. Do not give a house number if you prefer to share it after contact."
          defaultValue={val("streetAddress", defaults.streetAddress)}
          errors={err.streetAddress}
          maxLength={160}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Text
            name="latitude"
            label="Approximate latitude (optional)"
            hint="Rounded to about 100 m before saving."
            inputMode="decimal"
            defaultValue={val("latitude", defaults.latitude)}
            errors={err.latitude}
          />
          <Text
            name="longitude"
            label="Approximate longitude (optional)"
            inputMode="decimal"
            defaultValue={val("longitude", defaults.longitude)}
            errors={err.longitude}
          />
        </div>
      </Section>

      <Section
        title="Costs (TZS)"
        description="Tenants see all of these before contacting you. Listings with missing or hidden charges are rejected."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Text
            name="rentAmount"
            label="Monthly rent (TSh)"
            inputMode="numeric"
            defaultValue={val("rentAmount", defaults.rentAmount)}
            errors={err.rentAmount}
            required
          />
          <Text
            name="advanceMonths"
            label="Months of rent paid in advance"
            type="number"
            min={1}
            max={24}
            defaultValue={val("advanceMonths", defaults.advanceMonths ?? 3)}
            errors={err.advanceMonths}
          />
          <Text
            name="depositAmount"
            label="Deposit (TSh, 0 if none)"
            inputMode="numeric"
            defaultValue={val("depositAmount", defaults.depositAmount ?? 0)}
            errors={err.depositAmount}
          />
          <Text
            name="agentFeeAmount"
            label="Agent fee (TSh, 0 if none)"
            inputMode="numeric"
            defaultValue={val("agentFeeAmount", defaults.agentFeeAmount ?? 0)}
            errors={err.agentFeeAmount}
          />
        </div>
        <Text
          name="agentFeeNote"
          label="Agent fee details (optional)"
          hint="E.g. one month's rent, paid after signing the agreement"
          defaultValue={val("agentFeeNote", defaults.agentFeeNote)}
          errors={err.agentFeeNote}
          maxLength={200}
        />
        <Text
          name="paymentTerms"
          label="Payment terms (optional)"
          hint="E.g. 6 months upfront, then quarterly. Payment only after viewing and signing."
          defaultValue={val("paymentTerms", defaults.paymentTerms)}
          errors={err.paymentTerms}
          maxLength={500}
        />
        <fieldset>
          <legend className="label">Other charges (security, garbage collection, service charge…)</legend>
          <div className="space-y-2">
            {charges.map((c, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr_2fr]">
                <input
                  className="input"
                  name={`charge_label_${i}`}
                  placeholder="Name, e.g. Security"
                  defaultValue={c.label}
                  aria-label={`Charge ${i + 1} name`}
                  maxLength={60}
                />
                <input
                  className="input"
                  name={`charge_amount_${i}`}
                  placeholder="Amount"
                  inputMode="numeric"
                  defaultValue={c.amount}
                  aria-label={`Charge ${i + 1} amount`}
                />
                <select
                  className="input"
                  name={`charge_frequency_${i}`}
                  defaultValue={c.frequency}
                  aria-label={`Charge ${i + 1} frequency`}
                >
                  <option value="ONE_TIME">{t.oneTime}</option>
                  <option value="MONTHLY">{t.monthly}</option>
                </select>
                <input
                  className="input"
                  name={`charge_note_${i}`}
                  placeholder="Note (optional)"
                  defaultValue={c.note}
                  aria-label={`Charge ${i + 1} note`}
                  maxLength={160}
                />
              </div>
            ))}
          </div>
          <FieldError
            errors={err.charges ?? Object.entries(err).find(([k]) => k.startsWith("charges."))?.[1]}
          />
        </fieldset>
      </Section>

      <Section title="Utilities and amenities">
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            name="electricity"
            label={t.electricity}
            defaultValue={val("electricity", defaults.electricity ?? "SEPARATE_METER")}
            options={UTILITIES.map((u) => [u, t.utility[u]])}
            errors={err.electricity}
          />
          <Select
            name="water"
            label={t.water}
            defaultValue={val("water", defaults.water ?? "SHARED_SPLIT")}
            options={UTILITIES.map((u) => [u, t.utility[u]])}
            errors={err.water}
          />
        </div>
        <Text
          name="utilityNotes"
          label="Utility notes (optional)"
          hint="E.g. water bill shared between 4 tenants, about TSh 10,000/month"
          defaultValue={val("utilityNotes", defaults.utilityNotes)}
          errors={err.utilityNotes}
          maxLength={300}
        />
        <fieldset>
          <legend className="label">{t.amenitiesTitle}</legend>
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(t.amenities).map(([key, label]) => (
              <label key={key} className="flex min-h-9 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="amenities"
                  value={key}
                  defaultChecked={amenities.includes(key)}
                  className="h-4 w-4 accent-brand-600"
                />{" "}
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      </Section>

      <Section title="Availability and contact">
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            name="availabilityStatus"
            label="Availability"
            defaultValue={val("availabilityStatus", defaults.availabilityStatus ?? "AVAILABLE")}
            options={[
              ["AVAILABLE", "Available now"],
              ["AVAILABLE_SOON", "Available from a date"],
              ["OCCUPIED", "Currently occupied"],
            ]}
            errors={err.availabilityStatus}
          />
          <Text
            name="availableFrom"
            label="Available from (if not now)"
            type="date"
            defaultValue={val("availableFrom", defaults.availableFrom)}
            errors={err.availableFrom}
          />
          <Text
            name="contactPhone"
            label="Phone for this listing (optional)"
            hint="Leave empty to use your profile number"
            type="tel"
            defaultValue={val("contactPhone", defaults.contactPhone)}
            errors={err.contactPhone}
          />
          <Text
            name="contactWhatsapp"
            label="WhatsApp for this listing (optional)"
            type="tel"
            defaultValue={val("contactWhatsapp", defaults.contactWhatsapp)}
            errors={err.contactWhatsapp}
          />
        </div>
      </Section>

      <div className="sticky bottom-0 -mx-4 border-t border-navy-100 bg-white/95 px-4 py-3 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
        <SubmitButton className="btn-primary w-full sm:w-auto">{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="card space-y-4 p-5">
      <legend className="sr-only">{title}</legend>
      <div>
        <h2 className="text-lg font-bold text-navy-900">{title}</h2>
        {description ? <p className="text-sm text-navy-600">{description}</p> : null}
      </div>
      {children}
    </fieldset>
  );
}

function Text({
  name,
  label,
  hint,
  errors,
  ...rest
}: {
  name: string;
  label: string;
  hint?: string;
  errors?: string[];
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="label" htmlFor={name}>
        {label}
      </label>
      <input
        className="input"
        id={name}
        name={name}
        aria-invalid={errors?.length ? true : undefined}
        aria-describedby={hint ? `${name}-hint` : undefined}
        {...rest}
      />
      {hint ? (
        <p id={`${name}-hint`} className="mt-1 text-xs text-navy-500">
          {hint}
        </p>
      ) : null}
      <FieldError errors={errors} />
    </div>
  );
}

function Select({
  name,
  label,
  options,
  errors,
  defaultValue,
}: {
  name: string;
  label: string;
  options: (readonly [string, string])[];
  errors?: string[];
  defaultValue?: string;
}) {
  return (
    <div>
      <label className="label" htmlFor={name}>
        {label}
      </label>
      <select className="input" id={name} name={name} defaultValue={defaultValue}>
        {options.map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
      <FieldError errors={errors} />
    </div>
  );
}
