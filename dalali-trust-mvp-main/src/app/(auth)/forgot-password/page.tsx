import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/auth-forms";
import { getDictionary } from "@/i18n/server";

export const metadata: Metadata = { title: "Reset password", robots: { index: false } };

export default async function ForgotPasswordPage() {
  const { t } = await getDictionary();
  return (
    <>
      <h1 className="mb-4 text-2xl font-extrabold text-navy-900">{t.auth.forgotTitle}</h1>
      <ForgotPasswordForm t={t.auth} />
    </>
  );
}
