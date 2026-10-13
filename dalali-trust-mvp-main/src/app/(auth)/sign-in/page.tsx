import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignInForm } from "@/components/auth/auth-forms";
import { getDictionary } from "@/i18n/server";
import { safeNext } from "@/server/request";
import { getActor } from "@/server/session";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reset?: string }>;
}) {
  const sp = await searchParams;
  if (await getActor()) redirect(safeNext(sp.next));
  const { t } = await getDictionary();
  return (
    <>
      <h1 className="mb-6 text-2xl font-extrabold text-navy-900">{t.auth.signInTitle}</h1>
      <SignInForm t={t.auth} next={safeNext(sp.next)} notice={sp.reset ? t.auth.resetDone : undefined} />
    </>
  );
}
