"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { APIError } from "better-auth/api";
import { runAction, str, type ActionState } from "@/server/action-result";
import { getLocale } from "@/i18n/server";
import { auth } from "@/server/auth";
import { emailEnabled } from "@/server/email";
import { AppError } from "@/server/errors";
import { safeNext } from "@/server/request";
import { getActor } from "@/server/session";
import { setInitialRole } from "@/server/services/users";
import { parseOrThrow, signUpSchema } from "@/server/validation";

export async function signUpAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const values = {
    name: str(form, "name") ?? "",
    email: str(form, "email") ?? "",
    role: str(form, "role") ?? "",
    phoneNumber: str(form, "phoneNumber") ?? "",
    whatsappUpdates: form.get("whatsappUpdates") === "on" ? "on" : "",
    smsUpdates: form.get("smsUpdates") === "on" ? "on" : "",
  };
  const result = await runAction(async () => {
    const input = parseOrThrow(signUpSchema, {
      ...values,
      password: str(form, "password") ?? "",
      acceptTerms: form.get("acceptTerms") === "on",
      whatsappUpdates: form.get("whatsappUpdates") === "on",
      smsUpdates: form.get("smsUpdates") === "on",
    });
    let userId: string;
    try {
      const res = await auth.api.signUpEmail({
        body: { name: input.name, email: input.email, password: input.password },
        headers: await headers(),
      });
      userId = res.user.id;
    } catch (e) {
      if (e instanceof APIError) {
        // Generic wording: do not confirm whether an email address is registered.
        throw new AppError(
          "VALIDATION",
          "We could not create an account with these details. If you already have an account, sign in or reset your password.",
        );
      }
      throw e;
    }
    // Keep the language they signed up in, so WhatsApp messages and the site match it.
    await setInitialRole(userId, input.role, input.phoneNumber, {
      locale: await getLocale(),
      whatsappUpdates: input.whatsappUpdates,
      smsUpdates: input.smsUpdates,
    });
  });
  if (!result.ok) return { ...result, values };
  redirect(values.role === "TENANT" ? "/dashboard" : "/dashboard/listings/new?welcome=1");
}

export async function signInAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const email = str(form, "email")?.trim().toLowerCase() ?? "";
  const password = str(form, "password") ?? "";
  const result = await runAction(async () => {
    if (!email || !password) throw new AppError("VALIDATION", "Enter your email and password.");
    try {
      await auth.api.signInEmail({ body: { email, password, rememberMe: true }, headers: await headers() });
    } catch (e) {
      if (e instanceof APIError) {
        if (e.status === 429 || e.statusCode === 429)
          throw new AppError("RATE_LIMITED", "Too many attempts. Please wait a few minutes and try again.");
        throw new AppError("UNAUTHENTICATED", "invalid_credentials");
      }
      throw e;
    }
  });
  if (!result.ok) return { ...result, values: { email } };
  redirect(safeNext(str(form, "next")));
}

export async function requestPasswordResetAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return runAction(async () => {
    if (!emailEnabled()) return { ok: false, message: "email_disabled" };
    const email = str(form, "email")?.trim().toLowerCase() ?? "";
    if (!email.includes("@")) throw new AppError("VALIDATION", "Enter a valid email address.");
    try {
      await auth.api.requestPasswordReset({
        body: { email, redirectTo: "/reset-password" },
        headers: await headers(),
      });
    } catch (e) {
      if (e instanceof APIError && (e.status === 429 || e.statusCode === 429))
        throw new AppError("RATE_LIMITED", "Too many attempts. Please wait and try again.");
      // Any other outcome is reported identically so the form cannot be used to discover accounts.
    }
    return { ok: true, message: "sent" };
  });
}

export async function resetPasswordAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const result = await runAction(async () => {
    const token = str(form, "token") ?? "";
    const newPassword = str(form, "password") ?? "";
    if (newPassword.length < 10)
      throw new AppError("VALIDATION", "Use at least 10 characters.", {
        password: ["Use at least 10 characters"],
      });
    try {
      await auth.api.resetPassword({ body: { token, newPassword }, headers: await headers() });
    } catch (e) {
      if (e instanceof APIError) throw new AppError("VALIDATION", "invalid_token");
      throw e;
    }
  });
  if (!result.ok) return result;
  redirect("/sign-in?reset=1");
}

export async function changePasswordAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return runAction(async () => {
    const actor = await getActor();
    if (!actor) throw new AppError("UNAUTHENTICATED", "Please sign in again.");
    const currentPassword = str(form, "currentPassword") ?? "";
    const newPassword = str(form, "newPassword") ?? "";
    if (newPassword.length < 10)
      throw new AppError("VALIDATION", "Use at least 10 characters.", {
        newPassword: ["Use at least 10 characters"],
      });
    try {
      await auth.api.changePassword({
        body: { currentPassword, newPassword, revokeOtherSessions: true },
        headers: await headers(),
      });
    } catch (e) {
      if (e instanceof APIError)
        throw new AppError("VALIDATION", "Your current password is incorrect.", {
          currentPassword: ["Incorrect password"],
        });
      throw e;
    }
    return { ok: true, message: "Password changed. Other devices have been signed out." };
  });
}
