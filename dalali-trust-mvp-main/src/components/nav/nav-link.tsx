"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function isActivePath(pathname: string, href: string, exact = false) {
  if (exact || href === "/") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Link that marks itself with aria-current="page" when it matches the current route. */
export function NavLink({
  href,
  className,
  exact,
  children,
}: {
  href: string;
  className?: string;
  /** Only match this exact path, not its sub-pages (for "Overview" entries). */
  exact?: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  return (
    <Link
      href={href}
      className={className}
      aria-current={isActivePath(pathname, href, exact) ? "page" : undefined}
    >
      {children}
    </Link>
  );
}
