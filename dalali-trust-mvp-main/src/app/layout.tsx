import type { Metadata, Viewport } from "next";
import { Newsreader, Plus_Jakarta_Sans } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { DEFAULT_PREVIEW_IMAGE } from "@/lib/site";
import { SiteHeader } from "@/components/site-header";
import { getDictionary } from "@/i18n/server";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });
const newsreader = Newsreader({
  subsets: ["latin"],
  // Variable font: one file per style instead of one per weight, so headings arrive sooner.
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getDictionary();
  return {
    title: { default: t.meta.title, template: "%s · Dalali Trust" },
    description: t.meta.description,
    metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
    applicationName: "Dalali Trust",
    appleWebApp: { capable: true, title: "Dalali Trust", statusBarStyle: "default" },
    // Default link preview (WhatsApp, Facebook, X). Listing pages replace it with their own photo.
    openGraph: {
      type: "website",
      siteName: "Dalali Trust",
      title: t.meta.title,
      description: t.meta.description,
      locale: locale === "sw" ? "sw_TZ" : "en_TZ",
      images: [{ url: DEFAULT_PREVIEW_IMAGE, width: 1200, height: 630, alt: "Dalali Trust" }],
    },
    twitter: { card: "summary_large_image", images: [DEFAULT_PREVIEW_IMAGE] },
  };
}

export const viewport: Viewport = { themeColor: "#1a2639", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, t } = await getDictionary();
  return (
    <html
      lang={locale}
      className={`${jakarta.variable} ${newsreader.variable}`}
      data-scroll-behavior="smooth"
    >
      <body className="flex min-h-screen flex-col font-sans">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2"
        >
          {t.nav.skipToContent}
        </a>
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
