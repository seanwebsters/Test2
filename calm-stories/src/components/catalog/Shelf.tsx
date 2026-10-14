"use client";

import { useRef } from "react";
import { Icon } from "@/components/ui/Icon";

/** Horizontally scrolling content row with keyboard-accessible arrow buttons. */
export function ShelfScroller({ title, subtitle, children, id }: { title: string; subtitle?: string; id: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };
  return (
    <section aria-labelledby={`shelf-${id}`} className="relative">
      <div className="mb-4 flex items-end justify-between gap-4 px-4 sm:px-8">
        <div>
          <h2 id={`shelf-${id}`} className="headline text-[1.9rem] leading-none">
            {title}
          </h2>
          {subtitle && <p className="mt-1.5 text-sm text-mist">{subtitle}</p>}
        </div>
        <div className="hidden gap-2 sm:flex">
          <button onClick={() => scroll(-1)} aria-label={`Scroll ${title} left`} className="rounded-full border border-white/10 p-2 text-mist hover:bg-white/5 hover:text-white">
            <Icon name="chevronLeft" size={18} />
          </button>
          <button onClick={() => scroll(1)} aria-label={`Scroll ${title} right`} className="rounded-full border border-white/10 p-2 text-mist hover:bg-white/5 hover:text-white">
            <Icon name="chevronRight" size={18} />
          </button>
        </div>
      </div>
      <div ref={ref} className="scrollbar-none flex snap-x gap-5 overflow-x-auto scroll-smooth px-4 pb-4 sm:px-8" role="list">
        {children}
      </div>
    </section>
  );
}
