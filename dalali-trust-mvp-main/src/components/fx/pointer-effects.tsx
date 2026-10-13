"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Site-wide progressive enhancements, mounted once in the root layout:
 * - reveals `[data-reveal]` elements as they scroll into view;
 * - feeds the pointer position to `.card-interactive` so its glow follows the cursor.
 * Server-rendered markup stays fully usable without it.
 */
export function PointerEffects() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    (window as unknown as { __revealReady?: boolean }).__revealReady = true;
    root.classList.add("js-reveal");

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    const observe = () =>
      document.querySelectorAll("[data-reveal]:not(.is-visible)").forEach((el) => io.observe(el));
    observe();
    const mo = new MutationObserver(observe);
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, [pathname]);

  useEffect(() => {
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const card = (e.target as Element | null)?.closest?.<HTMLElement>(".card-interactive");
        if (!card) return;
        const r = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${e.clientX - r.left}px`);
        card.style.setProperty("--my", `${e.clientY - r.top}px`);
      });
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      document.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}

/** Runs before first paint so revealed content does not flash; falls back to visible if hydration stalls. */
export const revealBootstrap = `(function(){var d=document.documentElement;if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;d.classList.add('js-reveal');setTimeout(function(){if(!window.__revealReady)d.classList.remove('js-reveal')},3000)})();`;
