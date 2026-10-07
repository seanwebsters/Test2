"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Lock } from "lucide-react";
import type { Character } from "@/lib/types";
import { CharacterPortrait } from "../art/CharacterPortrait";
import { NewBadge } from "../ui/primitives";
import { worldById } from "@/lib/data/worlds";

interface Props {
  character: Character;
  size?: "sm" | "md" | "grid";
  selected?: boolean;
  blocked?: string | null;
  onClick?: () => void;
  href?: string;
}

export function CharacterCard({ character, size = "md", selected, blocked, onClick, href }: Props) {
  const world = worldById(character.worldId)!;
  const dims = size === "sm" ? "w-[112px] h-[150px]" : size === "grid" ? "w-full aspect-[3/4]" : "w-[140px] h-[188px] lg:w-[170px] lg:h-[228px]";
  const inner = (
    <motion.div
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.97 }}
      className={`group relative shrink-0 snap-start overflow-hidden rounded-[20px] ${dims} ${selected ? "ring-2 ring-glow-300 ring-offset-2 ring-offset-night-950" : "ring-1 ring-white/[0.08]"} ${blocked ? "opacity-35 grayscale" : ""}`}
    >
      <CharacterPortrait character={character} className="absolute inset-0" />
      {character.isNew && <NewBadge className="absolute left-2.5 top-2.5" />}
      <span className={`absolute right-2.5 top-2.5 grid h-6 w-6 place-items-center rounded-full border transition ${selected ? "chip-on border-transparent" : blocked ? "border-white/10 bg-night-900/80" : onClick ? "border-white/40 bg-night-950/30" : "hidden"}`}>
        {selected ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : blocked ? <Lock className="h-3 w-3 text-mist-300" /> : null}
      </span>
      <div className="absolute inset-x-0 bottom-0 p-3">
        <h3 className="font-display text-[15px] font-light leading-tight text-white lg:text-base">{character.name}</h3>
        <p className="mt-0.5 truncate text-[10px] uppercase tracking-wider text-mist-300">{size === "sm" ? world.title : character.title}</p>
      </div>
    </motion.div>
  );
  if (onClick)
    return (
      <button type="button" onClick={onClick} className="text-left" title={blocked ?? undefined}>
        {inner}
      </button>
    );
  return <Link href={href ?? `/world/${character.worldId}#${character.id}`}>{inner}</Link>;
}
