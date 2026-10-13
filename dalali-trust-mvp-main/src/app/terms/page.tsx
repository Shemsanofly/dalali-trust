import type { Metadata } from "next";
import { ContentPage } from "@/components/content-page";
import { pages } from "@/i18n/content";
import { getLocale } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: pages.terms[await getLocale()].title };
}

export default async function Page() {
  return <ContentPage content={pages.terms[await getLocale()]} />;
}
