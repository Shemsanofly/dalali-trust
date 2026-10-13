import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "@/components/content-page";
import { pages } from "@/i18n/content";
import { getDictionary } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getDictionary();
  return { title: pages.forAdvertisers[locale].title };
}

export default async function ForAdvertisersPage() {
  const { locale, t } = await getDictionary();
  return (
    <ContentPage content={pages.forAdvertisers[locale]}>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/sign-up?role=LANDLORD" className="btn-primary">
          {t.auth.roleLandlord}
        </Link>
        <Link href="/sign-up?role=AGENT" className="btn-secondary">
          {t.auth.roleAgent}
        </Link>
      </div>
    </ContentPage>
  );
}
