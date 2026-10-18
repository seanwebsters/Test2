"use client";

import { useRef, type ReactNode } from "react";

/** Pointer-driven 3D tilt + light position for cards. Disabled for reduced motion. */
export function Tilt({ children, className = "", max = 10, scale = 1.02 }: { children: ReactNode; className?: string; max?: number; scale?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || document.documentElement.dataset.reducedMotion === "true" || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.transform = `perspective(900px) rotateX(${(0.5 - y) * max}deg) rotateY(${(x - 0.5) * max}deg) scale(${scale})`;
    const card = el.querySelector<HTMLElement>(".tcard");
    card?.style.setProperty("--mx", `${x * 100}%`);
    card?.style.setProperty("--my", `${y * 100}%`);
  };
  const reset = () => {
    if (ref.current) ref.current.style.transform = "";
  };
  return (
    <div ref={ref} onPointerMove={onMove} onPointerLeave={reset} className={`transition-transform duration-200 ease-out will-change-transform [transform-style:preserve-3d] ${className}`}>
      {children}
    </div>
  );
}
