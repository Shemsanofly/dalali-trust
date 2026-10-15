"use client";

import { useEffect, useRef, useState } from "react";

/** Smoothly animates a number toward `target` (ease-out), e.g. a total that changes. */
export function useTweened(target: number, durationMs = 450): number {
  const [value, setValue] = useState(target);
  const from = useRef(target);

  useEffect(() => {
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : durationMs;
    const start = from.current;
    const t0 = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const p = duration ? Math.min(1, (now - t0) / duration) : 1;
      const v = Math.round(start + (target - start) * (1 - Math.pow(1 - p, 3)));
      from.current = v;
      setValue(v);
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);

  return value;
}
