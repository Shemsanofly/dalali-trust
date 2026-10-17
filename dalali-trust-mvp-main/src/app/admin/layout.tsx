import type { Metadata } from "next";
import { NavLink } from "@/components/nav/nav-link";
import { ScrollTabs } from "@/components/nav/scroll-tabs";
import { requirePageActor } from "@/server/session";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Page-level guard for navigation; every admin query/action also enforces assertAdmin.
  await requirePageActor({ roles: ["ADMIN"], next: "/admin" });
  const links = [
    ["/admin", "Overview"],
    ["/admin/listings", "Listings"],
    ["/admin/verifications", "Verifications"],
    ["/admin/reports", "Reports"],
    ["/admin/users", "Users"],
    ["/admin/audit", "Audit log"],
    ["/admin/feedback", "Feedback"],
  ];
  return (
    <div className="container-page py-6 lg:py-10">
      <ScrollTabs label="Admin" className="-mx-4 mb-6 px-4 sm:-mx-6 sm:px-6">
        <ul className="flex gap-1">
          {links.map(([href, label]) => (
            <li key={href}>
              <NavLink
                href={href!}
                exact={href === "/admin"}
                className="btn-ghost whitespace-nowrap aria-[current=page]:bg-white aria-[current=page]:text-brand-700 aria-[current=page]:shadow-[inset_0_-3px_0_var(--color-brand-600)]"
              >
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </ScrollTabs>
      {children}
    </div>
  );
}
