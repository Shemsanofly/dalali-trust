import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignUpForm } from "@/components/auth/auth-forms";
import { getDictionary } from "@/i18n/server";
import { getActor } from "@/server/session";
import { whatsappEnabled } from "@/server/whatsapp";

export const metadata: Metadata = { title: "Create account", robots: { index: false } };

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  if (await getActor()) redirect("/dashboard");
  const { role } = await searchParams;
  const { t } = await getDictionary();
  return (
    <>
      <h1 className="mb-6 text-2xl font-extrabold text-navy-900">{t.auth.signUpTitle}</h1>
      <SignUpForm
        t={t.auth}
        defaultRole={role === "LANDLORD" || role === "AGENT" ? role : undefined}
        whatsapp={whatsappEnabled()}
      />
    </>
  );
}
