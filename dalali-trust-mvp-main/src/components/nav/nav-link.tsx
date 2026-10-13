"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/** Link that marks itself with aria-current="page" when it matches the current route. */
export function NavLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  return (
    <Link href={href} className={className} aria-current={isActivePath(pathname, href) ? "page" : undefined}>
      {children}
    </Link>
  );
}
