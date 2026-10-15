"use client";

import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * Small-screen menu. Built on <details> so it still opens without JavaScript; with
 * JavaScript it also closes on navigation, on Escape and when tapping outside.
 */
export function MobileMenu({ label, children }: { label: string; children: ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (ref.current) ref.current.open = false;
  }, [pathname]);

  useEffect(() => {
    const close = () => {
      if (ref.current) ref.current.open = false;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && ref.current?.open) {
        close();
        ref.current.querySelector("summary")?.focus();
      }
    };
    const onPointer = (e: PointerEvent) => {
      if (ref.current?.open && !ref.current.contains(e.target as Node)) close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, []);

  return (
    <details ref={ref} className="group xl:hidden">
      <summary
        className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-lg text-navy-800 hover:bg-navy-50 [&::-webkit-details-marker]:hidden"
        aria-label={label}
      >
        <Menu className="h-6 w-6 group-open:hidden" aria-hidden />
        <X className="hidden h-6 w-6 group-open:block" aria-hidden />
      </summary>
      <div className="fixed inset-x-0 top-16 bottom-0 overflow-y-auto border-t border-navy-100 bg-white">
        <div className="container-page py-4">{children}</div>
      </div>
    </details>
  );
}
