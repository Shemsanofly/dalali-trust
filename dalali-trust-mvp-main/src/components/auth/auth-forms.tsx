"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  requestPasswordResetAction,
  resetPasswordAction,
  signInAction,
  signUpAction,
} from "@/app/actions/auth";
import type { Dictionary } from "@/i18n";
import { FieldError, FormMessage, SubmitButton } from "../ui/form";

type State = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[]>;
  values?: Record<string, string>;
};
const initial: State = { ok: false };
type A = Dictionary["auth"];

export function SignInForm({ t, next, notice }: { t: A; next?: string; notice?: string }) {
  const [state, action] = useActionState(signInAction, initial);
  const message = state.message === "invalid_credentials" ? t.invalidCredentials : state.message;
  return (
    <form action={action} className="space-y-4" noValidate>
      {notice ? <FormMessage state={{ ok: true, message: notice }} /> : null}
      <FormMessage state={{ ok: false, message }} />
      <input type="hidden" name="next" value={next ?? ""} />
      <div>
        <label className="label" htmlFor="email">
          {t.email}
        </label>
        <input
          className="input"
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.values?.email}
        />
      </div>
      <div>
        <label className="label" htmlFor="password">
          {t.password}
        </label>
        <input
          className="input"
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      <SubmitButton className="btn-primary w-full">{t.submitSignIn}</SubmitButton>
      <div className="flex flex-wrap justify-between gap-2 text-sm">
        <Link href="/forgot-password" className="text-brand-700 underline">
          {t.forgot}
        </Link>
        <span>
          {t.noAccount}{" "}
          <Link href="/sign-up" className="font-semibold text-brand-700 underline">
            {t.submitSignUp}
          </Link>
        </span>
      </div>
    </form>
  );
}

export function SignUpForm({ t, defaultRole }: { t: A; defaultRole?: string }) {
  const [state, action] = useActionState(signUpAction, initial);
  const v = state.values ?? {};
  const err = state.fieldErrors ?? {};
  const role = v.role || defaultRole || "TENANT";
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <fieldset>
        <legend className="label">{t.role}</legend>
        <div className="grid gap-2">
          {(
            [
              ["TENANT", t.roleTenant],
              ["LANDLORD", t.roleLandlord],
              ["AGENT", t.roleAgent],
            ] as const
          ).map(([value, label]) => (
            <label
              key={value}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-navy-200 bg-white px-4 py-2 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50"
            >
              <input
                type="radio"
                name="role"
                value={value}
                defaultChecked={role === value}
                className="h-4 w-4 accent-brand-600"
              />
              <span className="text-sm font-medium">{label}</span>
            </label>
          ))}
        </div>
        <FieldError errors={err.role} />
      </fieldset>
      <div>
        <label className="label" htmlFor="name">
          {t.name}
        </label>
        <input
          className="input"
          id="name"
          name="name"
          autoComplete="name"
          required
          maxLength={80}
          defaultValue={v.name}
        />
        <FieldError errors={err.name} />
      </div>
      <div>
        <label className="label" htmlFor="email">
          {t.email}
        </label>
        <input
          className="input"
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={v.email}
        />
        <FieldError errors={err.email} />
      </div>
      <div>
        <label className="label" htmlFor="phoneNumber">
          {t.phone}
        </label>
        <input
          className="input"
          id="phoneNumber"
          name="phoneNumber"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="07XX XXX XXX"
          defaultValue={v.phoneNumber}
        />
        <FieldError errors={err.phoneNumber} />
      </div>
      <div>
        <label className="label" htmlFor="password">
          {t.password}
        </label>
        <input
          className="input"
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          maxLength={128}
          aria-describedby="pw-help"
        />
        <p id="pw-help" className="mt-1 text-xs text-navy-500">
          {t.passwordHelp}
        </p>
        <FieldError errors={err.password} />
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="acceptTerms" className="mt-0.5 h-5 w-5 accent-brand-600" required />
        <span>
          {t.acceptTerms} (
          <Link href="/terms" className="underline" target="_blank">
            Terms
          </Link>
          ,{" "}
          <Link href="/privacy" className="underline" target="_blank">
            Privacy
          </Link>
          )
        </span>
      </label>
      <FieldError errors={err.acceptTerms} />
      <SubmitButton className="btn-primary w-full">{t.submitSignUp}</SubmitButton>
      <p className="text-sm">
        {t.haveAccount}{" "}
        <Link href="/sign-in" className="font-semibold text-brand-700 underline">
          {t.submitSignIn}
        </Link>
      </p>
    </form>
  );
}

export function ForgotPasswordForm({ t }: { t: A }) {
  const [state, action] = useActionState(requestPasswordResetAction, initial);
  if (state.message === "email_disabled")
    return <FormMessage state={{ ok: false, message: t.forgotUnavailable }} />;
  if (state.ok) return <FormMessage state={{ ok: true, message: t.forgotSent }} />;
  return (
    <form action={action} className="space-y-4">
      <p className="text-navy-600">{t.forgotBody}</p>
      <FormMessage state={state} />
      <div>
        <label className="label" htmlFor="email">
          {t.email}
        </label>
        <input className="input" id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <SubmitButton className="btn-primary w-full">{t.sendLink}</SubmitButton>
    </form>
  );
}

export function ResetPasswordForm({ t, token }: { t: A; token: string }) {
  const [state, action] = useActionState(resetPasswordAction, initial);
  const message = state.message === "invalid_token" ? t.resetInvalid : state.message;
  return (
    <form action={action} className="space-y-4">
      <FormMessage state={{ ok: false, message }} />
      <input type="hidden" name="token" value={token} />
      <div>
        <label className="label" htmlFor="password">
          {t.newPassword}
        </label>
        <input
          className="input"
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
        />
        <p className="mt-1 text-xs text-navy-500">{t.passwordHelp}</p>
        <FieldError errors={state.fieldErrors?.password} />
      </div>
      <SubmitButton className="btn-primary w-full">{t.resetSubmit}</SubmitButton>
    </form>
  );
}
