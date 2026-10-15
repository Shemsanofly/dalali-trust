import { Bell, LogOut } from "lucide-react";
import Link from "next/link";
import { setLocaleAction, signOutAction } from "@/app/actions/common";
import { getDictionary } from "@/i18n/server";
import { isAdvertiser } from "@/server/actor";
import { getActor } from "@/server/session";
import { unreadCount } from "@/server/services/notifications";
import { MobileMenu } from "./nav/mobile-menu";
import { NavLink } from "./nav/nav-link";

const desktopLink =
  "relative whitespace-nowrap px-1 py-5 text-[15px] font-medium text-navy-600 transition-colors hover:text-navy-900 aria-[current=page]:text-navy-900 after:absolute after:inset-x-1 after:bottom-0 after:h-[3px] after:rounded-t after:bg-brand-600 after:opacity-0 after:transition-opacity aria-[current=page]:after:opacity-100";

const mobileLink =
  "flex items-center justify-between border-b border-navy-100 py-3.5 text-lg font-semibold text-navy-800 aria-[current=page]:text-brand-700";

export async function SiteHeader() {
  const [{ locale, t }, actor] = await Promise.all([getDictionary(), getActor()]);
  const unread = actor ? await unreadCount(actor) : 0;
  const links = [
    { href: "/properties", label: t.nav.search },
    { href: "/how-it-works", label: t.nav.howItWorks },
    { href: "/safety", label: t.nav.safety },
    ...(!actor || isAdvertiser(actor) ? [{ href: "/for-advertisers", label: t.nav.forAdvertisers }] : []),
  ];
  const nextLocale = locale === "en" ? "sw" : "en";

  const languageToggle = (
    <form action={setLocaleAction}>
      <input type="hidden" name="locale" value={nextLocale} />
      <button
        type="submit"
        aria-label={t.nav.language}
        title={t.nav.language}
        className="flex h-9 items-center rounded-lg border border-navy-200 p-0.5 text-xs font-bold tracking-wide text-navy-500 transition-colors hover:border-navy-300"
      >
        {(["en", "sw"] as const).map((l) => (
          <span
            key={l}
            className={`rounded-md px-2 py-1.5 uppercase ${l === locale ? "bg-navy-800 text-white" : ""}`}
          >
            {l}
          </span>
        ))}
      </button>
    </form>
  );

  const notificationsLabel = `${t.nav.notifications}${unread ? ` (${unread})` : ""}`;

  return (
    <header className="sticky top-0 z-40 border-b border-navy-100 bg-white">
      <div className="container-page flex h-16 items-center gap-7">
        <Link href="/" className="flex shrink-0 items-center gap-2.5 text-navy-900">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="" width={34} height={34} />
          <span className="font-display text-xl font-semibold tracking-tight whitespace-nowrap">
            Dalali Trust
          </span>
        </Link>

        <nav className="hidden items-center gap-5 xl:flex" aria-label="Main">
          {links.map((l) => (
            <NavLink key={l.href} href={l.href} className={desktopLink}>
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-2.5 xl:flex">
          {languageToggle}
          {actor ? (
            <>
              {actor.role === "ADMIN" ? (
                <NavLink href="/admin" className={desktopLink}>
                  {t.nav.admin}
                </NavLink>
              ) : null}
              <NavLink href="/dashboard" className={desktopLink}>
                {t.nav.dashboard}
              </NavLink>
              <Link
                href="/dashboard/notifications"
                className="relative flex h-9 w-9 items-center justify-center rounded-lg text-navy-600 hover:bg-navy-50 hover:text-navy-900"
                aria-label={notificationsLabel}
                title={t.nav.notifications}
              >
                <Bell className="h-5 w-5" aria-hidden />
                {unread ? (
                  <span
                    className="absolute -top-0.5 -right-0.5 min-w-[18px] rounded-full bg-gold-500 px-1 text-center text-[11px] leading-[18px] font-bold text-navy-900"
                    aria-hidden
                  >
                    {unread > 9 ? "9+" : unread}
                  </span>
                ) : null}
              </Link>
              <form action={signOutAction}>
                <button
                  type="submit"
                  aria-label={t.nav.signOut}
                  title={t.nav.signOut}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-navy-600 hover:bg-navy-50 hover:text-navy-900"
                >
                  <LogOut className="h-5 w-5" aria-hidden />
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/sign-in" className="btn-ghost min-h-9 px-3 py-1.5">
                {t.nav.signIn}
              </Link>
              <Link href="/sign-up" className="btn-primary min-h-9 px-4 py-1.5">
                {t.nav.signUp}
              </Link>
            </>
          )}
        </div>

        <div className="ml-auto xl:hidden">
          <MobileMenu label={t.nav.menu}>
            <nav aria-label="Main">
              {links.map((l) => (
                <NavLink key={l.href} href={l.href} className={mobileLink}>
                  {l.label}
                </NavLink>
              ))}
              {actor ? (
                <>
                  <NavLink href="/dashboard" className={mobileLink}>
                    {t.nav.dashboard}
                  </NavLink>
                  <NavLink href="/dashboard/notifications" className={mobileLink}>
                    {t.nav.notifications}
                    {unread ? (
                      <span className="rounded-full bg-gold-500 px-2 py-0.5 text-sm font-bold text-navy-900">
                        {unread}
                      </span>
                    ) : null}
                  </NavLink>
                  {actor.role === "ADMIN" ? (
                    <NavLink href="/admin" className={mobileLink}>
                      {t.nav.admin}
                    </NavLink>
                  ) : null}
                </>
              ) : null}
            </nav>
            <div className="mt-6 flex flex-col gap-3">
              {actor ? (
                <form action={signOutAction}>
                  <button type="submit" className="btn-secondary w-full">
                    {t.nav.signOut}
                  </button>
                </form>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <Link href="/sign-in" className="btn-secondary">
                    {t.nav.signIn}
                  </Link>
                  <Link href="/sign-up" className="btn-primary">
                    {t.nav.signUp}
                  </Link>
                </div>
              )}
              <form action={setLocaleAction}>
                <input type="hidden" name="locale" value={nextLocale} />
                <button type="submit" className="btn-ghost w-full" lang={nextLocale}>
                  {t.nav.language}
                </button>
              </form>
            </div>
          </MobileMenu>
        </div>
      </div>
    </header>
  );
}
