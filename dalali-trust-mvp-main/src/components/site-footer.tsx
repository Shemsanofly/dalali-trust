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
    <footer className="mt-16 border-t border-navy-100 bg-navy-800 text-navy-100">
      <div className="container-page grid gap-8 py-10 md:grid-cols-[2fr_3fr]">
        <div>
          <p className="text-lg font-extrabold text-white">Dalali Trust</p>
          <p className="mt-2 max-w-sm text-sm text-navy-200">{t.brand.mission}</p>
        </div>
        <div>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-white hover:underline">
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
