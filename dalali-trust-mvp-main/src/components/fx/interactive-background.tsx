"use client";

import { useEffect, useRef } from "react";

/**
 * Constellation of drifting particles that gently move away from the pointer, with a
 * soft glow trailing it — the SahaShares hero background, rewritten for performance:
 * it pauses off-screen and renders a single still frame for reduced-motion users.
 */
export function InteractiveBackground({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !parent || !ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    type Particle = { x: number; y: number; vx: number; vy: number; r: number };
    let particles: Particle[] = [];
    let width = 0;
    let height = 0;
    let frame = 0;
    let running = false;
    const mouse = { x: -1e4, y: -1e4 };
    const glow = { x: -1e4, y: -1e4 };

    const resize = () => {
      width = parent.offsetWidth;
      height = parent.offsetHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(90, Math.floor((width * height) / 14000));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        r: Math.random() * 1.8 + 0.8,
      }));
      if (!running) draw();
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      if (mouse.x > -1e3) {
        glow.x = glow.x < -1e3 ? mouse.x : glow.x + (mouse.x - glow.x) * 0.1;
        glow.y = glow.y < -1e3 ? mouse.y : glow.y + (mouse.y - glow.y) * 0.1;
        const g = ctx.createRadialGradient(glow.x, glow.y, 0, glow.x, glow.y, 320);
        g.addColorStop(0, "rgba(212, 175, 55, 0.14)");
        g.addColorStop(1, "rgba(212, 175, 55, 0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, width, height);
      }

      for (const p of particles) {
        if (running) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0 || p.x > width) p.vx *= -1;
          if (p.y < 0 || p.y > height) p.vy *= -1;
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 150) {
            const force = (150 - dist) / 150;
            p.x -= dx * force * 0.03;
            p.y -= dy * force * 0.03;
          }
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(224, 205, 134, 0.55)";
        ctx.fill();
      }

      ctx.lineWidth = 1;
      particles.forEach((a, i) => {
        for (const b of particles.slice(i + 1)) {
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < 130) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(59, 204, 126, ${(1 - dist / 130) * 0.35})`;
            ctx.stroke();
          }
        }
      });

      if (running) frame = requestAnimationFrame(draw);
    };

    const start = () => {
      if (running || reduceMotion) return;
      running = true;
      frame = requestAnimationFrame(draw);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(frame);
    };

    const onMove = (e: PointerEvent) => {
      const rect = parent.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    const onLeave = () => {
      mouse.x = mouse.y = glow.x = glow.y = -1e4;
    };

    const visibility = new IntersectionObserver(([entry]) => (entry?.isIntersecting ? start() : stop()));
    const sizeObserver = new ResizeObserver(resize);

    resize();
    sizeObserver.observe(parent);
    visibility.observe(parent);
    parent.addEventListener("pointermove", onMove);
    parent.addEventListener("pointerleave", onLeave);

    return () => {
      stop();
      sizeObserver.disconnect();
      visibility.disconnect();
      parent.removeEventListener("pointermove", onMove);
      parent.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <canvas ref={canvasRef} aria-hidden className={`pointer-events-none absolute inset-0 ${className}`} />
  );
}
