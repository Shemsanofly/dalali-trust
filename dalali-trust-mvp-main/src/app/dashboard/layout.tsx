import { NavLink } from "@/components/nav/nav-link";
import { getDictionary } from "@/i18n/server";
import { isAdvertiser } from "@/server/actor";
import { requirePageActor } from "@/server/session";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const actor = await requirePageActor({ next: "/dashboard" });
  const { t } = await getDictionary();
  const d = t.dashboard;
  const links = [
    { href: "/dashboard", label: d.overview },
    ...(isAdvertiser(actor)
      ? [
          { href: "/dashboard/listings", label: d.listings },
          { href: "/dashboard/viewings", label: d.viewings },
          { href: "/dashboard/verification", label: d.verification },
          { href: "/dashboard/profile", label: d.profile },
        ]
      : [
          { href: "/dashboard/saved", label: d.saved },
          { href: "/dashboard/viewings", label: d.viewings },
        ]),
    { href: "/dashboard/reports", label: d.reports },
    { href: "/dashboard/notifications", label: d.notifications },
    { href: "/dashboard/settings", label: d.settings },
  ];
  return (
    <div className="container-page grid gap-6 py-6 lg:grid-cols-[220px_1fr] lg:py-10">
      <nav aria-label={d.title} className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
        <ul className="flex gap-1 lg:flex-col">
          {links.map((l) => (
            <li key={l.href}>
              <NavLink
                href={l.href}
                exact={l.href === "/dashboard"}
                className={
                  "btn-ghost w-full justify-start whitespace-nowrap aria-[current=page]:bg-white aria-[current=page]:text-brand-700 aria-[current=page]:shadow-[inset_3px_0_0_var(--color-brand-600)]"
                }
              >
                {l.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
