import type { Metadata } from "next";
import Link from "next/link";
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
      <nav aria-label="Admin" className="-mx-4 mb-6 overflow-x-auto px-4">
        <ul className="flex gap-1">
          {links.map(([href, label]) => (
            <li key={href}>
              <Link href={href!} className="btn-ghost whitespace-nowrap">
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {children}
    </div>
  );
}
