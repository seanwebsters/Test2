"use client";
import { motion } from "framer-motion";
import { CoverArt } from "@/components/art/Cover";
import type { CardView } from "@/lib/cards";
import { RARITY_STYLE } from "@/lib/gamification";
import { cn } from "@/lib/cn";

/** A collectible knowledge card. Tilts toward the pointer like a holo card. */
export function KnowledgeCard({ card, unlockedAt, className, locked }: { card: CardView; unlockedAt?: string; className?: string; locked?: boolean }) {
  const r = RARITY_STYLE[card.rarity];
  return (
    <motion.div
      whileHover={locked ? undefined : { rotateY: 8, rotateX: -6, scale: 1.03 }}
      transition={{ type: "spring", stiffness: 250, damping: 18 }}
      style={{ transformPerspective: 900, boxShadow: locked ? undefined : `0 20px 50px ${r.glow}` }}
      className={cn("relative flex aspect-[5/7] w-full flex-col overflow-hidden rounded-[22px] border p-[3px]", locked && "opacity-40 grayscale", className)}
    >
      <div className="absolute inset-0" style={{ background: `linear-gradient(140deg, ${r.color}, transparent 40%, ${r.color}88 70%, transparent)` }} />
      <div className="relative flex flex-1 flex-col overflow-hidden rounded-[19px] bg-ink">
        <div className="relative h-[52%] overflow-hidden">
          <CoverArt art={card.art} seed={card.key} />
          {(card.rarity === "epic" || card.rarity === "legendary") && (
            <div className="absolute inset-0 animate-shimmer opacity-40 mix-blend-overlay" style={{ background: "linear-gradient(110deg, transparent 30%, #fff 50%, transparent 70%)", backgroundSize: "200% 100%" }} />
          )}
          <span className="absolute left-2.5 top-2.5 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-ink" style={{ background: r.color }}>
            {r.label}
          </span>
        </div>
        <div className="flex flex-1 flex-col p-3">
          <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-cream-mute">{card.topic}</div>
          <div className="display mt-1 text-[clamp(13px,4.2cqw,17px)] leading-[1.02]" style={{ containerType: "normal" }}>{card.title}</div>
          <p className="mt-2 line-clamp-4 text-[11px] leading-snug text-cream-dim">{card.fact}</p>
          <div className="mt-auto pt-2 text-[9px] text-cream-mute">
            {locked ? card.how : unlockedAt ? `Unlocked ${new Date(unlockedAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}` : card.how}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
