"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { RarityLabel } from "@/components/cards/RarityGem";
import { Tilt } from "@/components/cards/Tilt";
import { TradingCard } from "@/components/cards/TradingCard";
import type { Variant } from "@/lib/content/types";
import type { CardFace } from "@/lib/view/face";

/** One card at a time, museum-style. Swipe or use arrows. */
export function Gallery({ items }: { items: { face: CardFace; variant: Variant; count: number }[] }) {
  const [i, setI] = useState(0);
  if (!items.length) return null;
  const cur = items[Math.min(i, items.length - 1)]!;
  const go = (d: number) => setI((x) => (x + d + items.length) % items.length);
  return (
    <div className="grid items-center gap-10 py-6 md:grid-cols-[1fr_minmax(0,420px)_1fr]">
      <div className="hidden justify-end md:flex"><button onClick={() => go(-1)} className="glass grid h-12 w-12 place-items-center rounded-full" aria-label="Previous card"><ChevronLeft /></button></div>
      <AnimatePresence mode="wait">
        <motion.div key={cur.face.id} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} drag="x" dragConstraints={{ left: 0, right: 0 }} onDragEnd={(_, info) => Math.abs(info.offset.x) > 60 && go(info.offset.x < 0 ? 1 : -1)} className="mx-auto w-[min(80vw,420px)]">
          <Tilt max={12}>
            <TradingCard face={cur.face} variant={cur.variant} animate />
          </Tilt>
          <div className="mt-5 text-center">
            <RarityLabel rarity={cur.face.rarity} />
            <p className={`ff-${cur.face.universe.font} mt-1 text-2xl`}>{cur.face.name}</p>
            <p className="text-sm text-bone-3">{cur.face.universe.title} · ×{cur.count}</p>
            <Link href={`/cards/${cur.face.id}`} className="mt-2 inline-block text-[13px] font-semibold text-bone-2 hover:text-bone">Inspect →</Link>
          </div>
        </motion.div>
      </AnimatePresence>
      <div className="hidden md:flex"><button onClick={() => go(1)} className="glass grid h-12 w-12 place-items-center rounded-full" aria-label="Next card"><ChevronRight /></button></div>
      <p className="text-center text-[12px] text-bone-4 md:col-span-3">{i + 1} of {items.length} · swipe to browse</p>
    </div>
  );
}
