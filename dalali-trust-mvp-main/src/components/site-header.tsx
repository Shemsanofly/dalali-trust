import { Bell, Menu } from "lucide-react";
import Link from "next/link";
import { setLocaleAction, signOutAction } from "@/app/actions/common";
import { getDictionary } from "@/i18n/server";
import { isAdvertiser } from "@/server/actor";
import { getActor } from "@/server/session";
import { unreadCount } from "@/server/services/notifications";

export async function SiteHeader() {
  const [{ locale, t }, actor] = await Promise.all([getDictionary(), getActor()]);
  const unread = actor ? await unreadCount(actor) : 0;
  const links = [
    { href: "/properties", label: t.nav.search },
    { href: "/how-it-works", label: t.nav.howItWorks },
    { href: "/safety", label: t.nav.safety },
    ...(!actor || isAdvertiser(actor) ? [{ href: "/for-advertisers", label: t.nav.forAdvertisers }] : []),
  ];

  const languageForm = (
    <form action={setLocaleAction}>
      <input type="hidden" name="locale" value={locale === "en" ? "sw" : "en"} />
      <button type="submit" className="btn-ghost px-3 text-sm" lang={locale === "en" ? "sw" : "en"}>
        {t.nav.language}
      </button>
    </form>
  );

  const accountLinks = actor ? (
    <>
      {actor.role === "ADMIN" ? (
        <Link href="/admin" className="btn-ghost px-3">
          {t.nav.admin}
        </Link>
      ) : null}
      <Link href="/dashboard" className="btn-ghost px-3">
        {t.nav.dashboard}
      </Link>
      <Link
        href="/dashboard/notifications"
        className="btn-ghost relative px-3"
        aria-label={`${t.nav.notifications}${unread ? ` (${unread})` : ""}`}
      >
        <Bell className="h-5 w-5" aria-hidden />
        {unread ? (
          <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-gold-500" aria-hidden />
        ) : null}
      </Link>
      <form action={signOutAction}>
        <button type="submit" className="btn-secondary">
          {t.nav.signOut}
        </button>
      </form>
    </>
  ) : (
    <>
      <Link href="/sign-in" className="btn-ghost px-3">
        {t.nav.signIn}
      </Link>
      <Link href="/sign-up" className="btn-primary">
        {t.nav.signUp}
      </Link>
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-navy-100/80 bg-white/80 shadow-sm shadow-navy-900/5 backdrop-blur-xl">
      <div
        className="h-0.5 bg-linear-to-r from-brand-500 via-gold-400 to-brand-500 bg-[length:200%_100%] animate-shimmer"
        aria-hidden
      />
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/" className="group flex items-center gap-2.5 font-extrabold text-navy-900">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.svg"
            alt=""
            width={36}
            height={36}
            className="transition-transform duration-500 group-hover:rotate-[-8deg] group-hover:scale-110"
          />
          <span className="text-lg tracking-tight">
            Dalali <span className="text-brand-600">Trust</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="nav-link">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-1 lg:flex">
          {languageForm}
          {accountLinks}
        </div>
        {/* Mobile menu works without JavaScript */}
        <details className="group relative lg:hidden">
          <summary
            className="btn-ghost list-none px-3 [&::-webkit-details-marker]:hidden"
            aria-label={t.nav.menu}
          >
            <Menu className="h-6 w-6" aria-hidden />
          </summary>
          <div className="glass-light absolute right-0 mt-2 flex w-72 animate-fade-up flex-col gap-1 rounded-2xl p-3 [animation-duration:0.25s]">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="btn-ghost justify-start">
                {l.label}
              </Link>
            ))}
            <hr className="my-2 border-navy-100" />
            <div className="flex flex-col gap-1 [&>*]:justify-start [&_button]:w-full [&_button]:justify-start">
              {accountLinks}
            </div>
            <hr className="my-2 border-navy-100" />
            {languageForm}
          </div>
        </details>
      </div>
    </header>
  );
}
