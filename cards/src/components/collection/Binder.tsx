"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { TradingCard } from "@/components/cards/TradingCard";
import type { Variant } from "@/lib/content/types";
import type { CardFace } from "@/lib/view/face";

export interface BinderSlot {
  face: CardFace;
  owned: boolean;
  count: number;
  variant: Variant;
}

const PER_PAGE = 9;

const PAGE_TURN = {
  enter: (d: number) => ({ rotateY: d > 0 ? 70 : -70, opacity: 0, transformOrigin: d > 0 ? "left center" : "right center" }),
  center: { rotateY: 0, opacity: 1 },
  exit: (d: number) => ({ rotateY: d > 0 ? -70 : 70, opacity: 0, transformOrigin: d > 0 ? "left center" : "right center" }),
};

/** A binder with page-turn animation: two-page spreads on desktop, single pages on mobile. */
export function Binder({ slots, title, palette }: { slots: BinderSlot[]; title: string; palette: { bg: string; surface: string; accent: string; ink: string } }) {
  const pages: BinderSlot[][] = [];
  for (let i = 0; i < slots.length; i += PER_PAGE) pages.push(slots.slice(i, i + PER_PAGE));
  const [wide, setWide] = useState(true);
  const [spread, setSpread] = useState(0);
  const [dir, setDir] = useState(1);
  useEffect(() => {
    const m = matchMedia("(min-width: 1024px)");
    const on = () => setWide(m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  const step = wide ? 2 : 1;
  const max = Math.max(0, Math.ceil(pages.length / step) - 1);
  const cur = Math.min(spread, max);
  const go = (d: number) => {
    setDir(d);
    setSpread((s) => Math.min(max, Math.max(0, s + d)));
  };
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });
  const shown = pages.slice(cur * step, cur * step + step);

  return (
    <div>
      <div className="relative mx-auto max-w-6xl [perspective:2200px]">
        <div className="rounded-[28px] p-3 shadow-lift md:p-5" style={{ background: `linear-gradient(135deg, ${palette.surface}, ${palette.bg})`, border: `1px solid ${palette.accent}33` }}>
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            <motion.div
              key={cur}
              custom={dir}
              className={`grid gap-3 md:gap-5 ${wide ? "grid-cols-2" : "grid-cols-1"} [transform-style:preserve-3d]`}
              variants={PAGE_TURN}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.55, ease: [0.4, 0.1, 0.2, 1] }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.25}
              onDragEnd={(_, info) => {
                if (info.offset.x < -70) go(1);
                if (info.offset.x > 70) go(-1);
              }}
            >
              {shown.map((page, pi) => (
                <div key={pi} className="relative grid grid-cols-3 gap-2 rounded-2xl bg-black/30 p-2.5 md:gap-3 md:p-4" style={{ boxShadow: "inset 0 0 40px rgba(0,0,0,.45)" }}>
                  {page.map((s) => (
                    <Link key={s.face.id} href={`/cards/${s.face.id}`} className="focus-ring relative block rounded-[5%]" aria-label={s.owned ? s.face.name : `Undiscovered card ${s.face.number}`}>
                      <div className="rounded-[5%] bg-white/[0.04] p-[3%] ring-1 ring-white/10">
                        <TradingCard face={s.face} variant={s.variant} locked={!s.owned} compact={!wide} badge={s.count > 1 ? <span className="absolute right-[6%] top-[5%] z-[6] rounded-full bg-black/70 px-1.5 text-[10px] font-black text-white">×{s.count}</span> : undefined} />
                      </div>
                      {!s.owned && <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-bold tracking-widest text-white/30">#{String(s.face.number).padStart(3, "0")}</span>}
                    </Link>
                  ))}
                  {Array.from({ length: PER_PAGE - page.length }).map((_, i) => (
                    <div key={`e${i}`} className="aspect-[5/7] rounded-[5%] border border-dashed border-white/5" />
                  ))}
                  <span className="absolute -bottom-0 right-3 translate-y-full pt-1 text-[10px] font-semibold text-bone-4">{title} · page {(cur * step) + pi + 1}</span>
                </div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
        {wide && <div className="pointer-events-none absolute inset-y-6 left-1/2 w-6 -translate-x-1/2 bg-gradient-to-r from-transparent via-black/40 to-transparent" />}
      </div>
      <div className="mt-8 flex items-center justify-center gap-4">
        <button onClick={() => go(-1)} disabled={cur === 0} className="glass focus-ring grid h-11 w-11 place-items-center rounded-full disabled:opacity-30" aria-label="Previous page"><ChevronLeft /></button>
        <span className="text-sm tabular-nums text-bone-3">{cur + 1} / {max + 1}</span>
        <button onClick={() => go(1)} disabled={cur === max} className="glass focus-ring grid h-11 w-11 place-items-center rounded-full disabled:opacity-30" aria-label="Next page"><ChevronRight /></button>
      </div>
    </div>
  );
}
