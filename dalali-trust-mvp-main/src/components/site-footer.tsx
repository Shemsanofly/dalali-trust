import Link from "next/link";
import { getDictionary } from "@/i18n/server";
import { InstallButton } from "./nav/install-button";

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
    <footer className="mt-20 bg-navy-900 text-navy-100">
      <div className="container-page grid gap-10 py-12 md:grid-cols-[2fr_3fr]">
        <div>
          <p className="flex items-center gap-2.5 text-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="" width={30} height={30} />
            <span className="font-display text-xl font-semibold">Dalali Trust</span>
          </p>
          <p className="mt-2 max-w-sm text-sm text-navy-200">{t.brand.mission}</p>
          <InstallButton
            label={t.nav.install}
            className="btn mt-4 border border-navy-600 text-white hover:border-gold-300 hover:text-gold-300"
          />
        </div>
        <div>
          <nav
            aria-label="Footer"
            className="grid grid-cols-2 gap-x-6 text-sm sm:flex sm:flex-wrap sm:gap-y-1"
          >
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="py-2 hover:text-white hover:underline hover:underline-offset-4"
              >
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
