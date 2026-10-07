"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Lock } from "lucide-react";
import type { IPWorld } from "@/lib/types";
import { WorldArt } from "../art/WorldArt";
import { NewBadge } from "../ui/primitives";
import { partnerById } from "@/lib/data/partners";

interface Props {
  world: IPWorld;
  size?: "sm" | "md" | "lg";
  href?: string;
  selected?: boolean;
  blocked?: string | null;
  onClick?: () => void;
  showGenre?: boolean;
}

const SIZES = { sm: "w-[124px] h-[168px]", md: "w-[160px] h-[220px] lg:w-[200px] lg:h-[270px]", lg: "w-full aspect-[4/5]" };

export function WorldCard({ world, size = "md", href, selected, blocked, onClick, showGenre = true }: Props) {
  const partner = partnerById(world.partnerId);
  const inner = (
    <motion.div
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className={`group relative shrink-0 snap-start overflow-hidden rounded-[22px] ${SIZES[size]} ${selected ? "ring-2 ring-glow-300 ring-offset-2 ring-offset-night-950" : "ring-1 ring-white/[0.08] shadow-[0_18px_40px_-18px_rgba(0,0,0,0.9)]"} ${blocked ? "opacity-40 grayscale-[60%]" : ""}`}
    >
      <WorldArt scene={world.visualStyle.scene} palette={world.visualStyle.palette} seed={world.id} className="absolute inset-0 transition-transform duration-[1200ms] group-hover:scale-105" />
      <div className="absolute inset-0 bg-gradient-to-t from-night-950/95 via-night-950/20 to-transparent" />
      <div className="absolute left-3 top-3 flex gap-1.5">
        {world.isNew && <NewBadge />}
        {world.isOriginal && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur">Original</span>}
      </div>
      {selected && (
        <span className="chip-on absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full">
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </span>
      )}
      {blocked && (
        <span className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full bg-night-900/80">
          <Lock className="h-3 w-3 text-mist-300" />
        </span>
      )}
      <div className="absolute inset-x-0 bottom-0 p-3.5 lg:p-4">
        {showGenre && size !== "sm" && <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-mist-300/90">{world.genre}</p>}
        <h3 className={`font-display font-light leading-[1.1] text-white ${size === "sm" ? "text-[15px]" : "text-lg lg:text-xl"}`}>{world.title}</h3>
        {size === "lg" && <p className="mt-1 line-clamp-2 text-xs text-mist-300">{world.tagline}</p>}
        {size !== "sm" && partner?.tier !== "calm-original" && <p className="mt-1.5 text-[9px] uppercase tracking-wider text-mist-400">{partner?.name}</p>}
      </div>
    </motion.div>
  );
  if (onClick)
    return (
      <button type="button" onClick={onClick} className="text-left" title={blocked ?? undefined}>
        {inner}
      </button>
    );
  return <Link href={href ?? `/world/${world.id}`}>{inner}</Link>;
}
