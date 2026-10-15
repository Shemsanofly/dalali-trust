"use client";

import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";

/**
 * Marks its children for scroll-triggered animation (`.on-view-*` classes in globals.css).
 * Server markup has no state, so content is always visible without JavaScript; only
 * sections that are still below the fold when the page loads wait to animate in.
 */
export function InView({
  as: Tag = "div",
  className,
  children,
}: {
  as?: ElementType;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const [state, setState] = useState<"pending" | "true" | undefined>(undefined);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) {
      setState("true");
      return;
    }
    setState("pending");
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setState("true");
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag ref={ref} className={className} data-inview={state}>
      {children}
    </Tag>
  );
}
