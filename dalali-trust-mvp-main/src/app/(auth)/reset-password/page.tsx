import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/auth-forms";
import { getDictionary } from "@/i18n/server";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;
  const { t } = await getDictionary();
  return (
    <>
      <h1 className="mb-4 text-2xl font-extrabold text-navy-900">{t.auth.resetTitle}</h1>
      {!token || error ? (
        <div className="space-y-4">
          <p className="text-red-700">{t.auth.resetInvalid}</p>
          <Link href="/forgot-password" className="btn-primary">
            {t.auth.sendLink}
          </Link>
        </div>
      ) : (
        <ResetPasswordForm t={t.auth} token={token} />
      )}
    </>
  );
}
