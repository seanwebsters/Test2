import type { Rarity } from "@/lib/content/types";
import { RARITY_META } from "@/lib/economy/config";

const PATHS: Record<Rarity, string> = {
  common: "M12 4a8 8 0 1 0 0 16a8 8 0 1 0 0-16Z",
  uncommon: "M12 2l8 10l-8 10l-8-10Z",
  rare: "M12 1l3 8l8 3l-8 3l-3 8l-3-8l-8-3l8-3Z",
  epic: "M12 2l8.7 5v10L12 22l-8.7-5V7Z",
  legendary: "M12 1.5l2.9 6.6l7.1.6l-5.4 4.7l1.6 7l-6.2-3.7l-6.2 3.7l1.6-7L2 8.7l7.1-.6Z",
  mythic: "M12 0l2.2 6.7L21 3l-3.7 6.8L24 12l-6.7 2.2L21 21l-6.8-3.7L12 24l-2.2-6.7L3 21l3.7-6.8L0 12l6.7-2.2L3 3l6.8 3.7Z",
};

export function RarityGem({ rarity, size = 14, className }: { rarity: Rarity; size?: number; className?: string }) {
  const m = RARITY_META[rarity];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-label={m.label} role="img">
      <path d={PATHS[rarity]} fill={m.color} stroke="rgba(0,0,0,.35)" strokeWidth="1" />
      <path d={PATHS[rarity]} fill="url(#nxgemshine)" opacity=".5" />
      <defs>
        <linearGradient id="nxgemshine" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" />
          <stop offset=".5" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function RarityLabel({ rarity, className = "" }: { rarity: Rarity; className?: string }) {
  const m = RARITY_META[rarity];
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] ${className}`} style={{ color: m.color }}>
      <RarityGem rarity={rarity} size={12} />
      {m.label}
    </span>
  );
}
