import Link from "next/link";
import { getDictionary } from "@/i18n/server";

export async function SiteFooter() {
  const { t } = await getDictionary();
  const links = [
    { href: "/about", label: t.footer.about },
    { href: "/verification", label: t.footer.verification },
    { href: "/safety", label: t.nav.safety },
    { href: "/contact", label: t.footer.contact },
    { href: "/privacy", label: t.footer.privacy },
    { href: "/terms", label: t.footer.terms },
  ];
  return (
    <footer className="relative isolate mt-20 overflow-hidden bg-navy-900 text-navy-100">
      <div className="h-0.5 bg-linear-to-r from-transparent via-gold-400 to-transparent" aria-hidden />
      <div className="orb -top-32 right-0 -z-10 h-72 w-72 bg-brand-500/15" aria-hidden />
      <div className="container-page grid gap-8 py-12 md:grid-cols-[2fr_3fr]">
        <div>
          <p className="flex items-center gap-2.5 text-lg font-extrabold text-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="" width={32} height={32} />
            <span>
              Dalali <span className="text-shimmer">Trust</span>
            </span>
          </p>
          <p className="mt-2 max-w-sm text-sm text-navy-200">{t.brand.mission}</p>
        </div>
        <div>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="transition-colors hover:text-gold-300">
                {l.label}
              </Link>
            ))}
          </nav>
          <p className="mt-6 text-xs leading-relaxed text-navy-300">{t.footer.disclaimer}</p>
          <p className="mt-2 text-xs text-navy-400">© {new Date().getFullYear()} Dalali Trust</p>
        </div>
      </div>
    </footer>
  );
}
