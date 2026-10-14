"use client";

import { useRef, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "./icons";

export function Shelf({ title, subtitle, badge, children }: { title: string; subtitle?: string; badge?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: reduce ? "auto" : "smooth" });
  };
  const id = `shelf-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <section aria-labelledby={id} className="relative">
      <div className="mb-4 flex items-end justify-between gap-4 px-4 sm:px-6 lg:px-10">
        <div>
          <h2 id={id} className="font-serif text-2xl font-semibold text-white sm:text-[1.7rem]">
            {title}
            {badge && <span className="ml-3 align-middle font-sans text-[10px] font-medium uppercase tracking-wider text-mist/70">{badge}</span>}
          </h2>
          {subtitle && <p className="mt-1 text-sm text-mist">{subtitle}</p>}
        </div>
        <div className="hidden gap-2 sm:flex">
          <button type="button" onClick={() => scroll(-1)} aria-label={`Scroll ${title} left`} className="rounded-full border border-white/10 p-2 text-mist transition hover:border-white/30 hover:text-white">
            <ChevronLeft size={16} />
          </button>
          <button type="button" onClick={() => scroll(1)} aria-label={`Scroll ${title} right`} className="rounded-full border border-white/10 p-2 text-mist transition hover:border-white/30 hover:text-white">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <div ref={ref} className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 pb-4 pt-1 sm:gap-5 sm:scroll-px-6 sm:px-6 lg:scroll-px-10 lg:px-10">
        {children}
      </div>
    </section>
  );
}
