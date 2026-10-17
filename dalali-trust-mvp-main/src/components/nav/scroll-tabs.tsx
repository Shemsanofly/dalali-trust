"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * A row of section links that scrolls sideways on small screens. Keeps the current page's
 * link in view, so on a phone you never land on a page whose tab is hidden off screen.
 */
export function ScrollTabs({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const pathname = usePathname();
  useEffect(() => {
    const nav = ref.current;
    const current = nav?.querySelector<HTMLElement>("[aria-current=page]");
    if (!nav || !current || nav.scrollWidth <= nav.clientWidth) return;
    nav.scrollLeft = current.offsetLeft - (nav.clientWidth - current.offsetWidth) / 2;
  }, [pathname]);
  return (
    <nav ref={ref} aria-label={label} className={`scroll-tabs ${className ?? ""}`}>
      {children}
    </nav>
  );
}
