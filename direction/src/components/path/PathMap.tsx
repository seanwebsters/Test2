"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import { Check, Crown, Flag, Lock, SkipForward, Star } from "lucide-react";
import { Pip } from "@/components/brand/Pip";
import { MissionCard } from "@/components/mission/MissionCard";
import { cn } from "@/lib/cn";
import type { Level, Mission } from "@/lib/content/types";
import type { LevelStatus } from "@/lib/engine/progression";

export interface MapLevel {
  level: Level;
  status: LevelStatus;
  done: number;
  questUnlocked: boolean;
  missions: { mission: Mission; done: boolean; available: boolean; lockedReason: string | null }[];
}

const OFFSETS = [0, 14, 22, 14, 0, -14, -22, -14, 0, 14];

export function PathMap({ levels, current, interactive, careerSlug }: { levels: MapLevel[]; current: number; interactive: boolean; careerSlug: string }) {
  const [open, setOpen] = useState<number | null>(interactive ? current : null);
  return (
    <ol className="relative mx-auto max-w-md overflow-x-clip py-4" aria-label="Career path levels">
      {levels.map((l, i) => {
        const n = l.level.n;
        const isCurrent = n === current && l.status === "available";
        const complete = l.status === "complete" || l.status === "skipped";
        const locked = l.status === "locked";
        const offset = OFFSETS[i % OFFSETS.length]!;
        const nextOffset = OFFSETS[(i + 1) % OFFSETS.length]!;
        return (
          <li key={n} className="relative">
            {i < levels.length - 1 && open !== n && (
              <svg className="pointer-events-none absolute left-0 top-[44px] z-0 h-[196px] w-full overflow-visible" aria-hidden="true" preserveAspectRatio="none" viewBox="0 0 100 100">
                <path
                  d={`M ${50 + offset} 0 C ${50 + offset} 55, ${50 + nextOffset} 45, ${50 + nextOffset} 100`}
                  stroke={complete ? "rgb(var(--teal))" : "rgb(var(--line))"}
                  strokeWidth="6"
                  strokeDasharray={complete ? "0" : "1 12"}
                  strokeLinecap="round"
                  fill="none"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            )}
            <div className="relative z-[1] flex flex-col items-center" style={{ transform: `translateX(${offset}%)` }}>
              <div className="relative">
                {isCurrent && (
                  <div className="absolute -left-20 top-0 hidden sm:block" aria-hidden="true">
                    <Pip mood="excited" size={64} />
                  </div>
                )}
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  onClick={() => setOpen(open === n ? null : n)}
                  aria-expanded={open === n}
                  aria-label={`Level ${n}: ${l.level.title}, ${complete ? "complete" : locked ? "locked" : `${l.done} of ${l.missions.length} missions done`}`}
                  className={cn(
                    "focus-ring relative grid h-[88px] w-[88px] place-items-center rounded-full font-display text-2xl font-extrabold transition",
                    complete && "bg-teal text-white shadow-[0_6px_0_0_rgb(var(--teal-deep))]",
                    isCurrent && "bg-sun text-navy shadow-[0_6px_0_0_#D9A21E]",
                    !complete && !isCurrent && !locked && "bg-mint text-navy shadow-[0_6px_0_0_rgb(var(--teal))]",
                    locked && "bg-surface-3 text-ink-3 shadow-[0_6px_0_0_rgb(var(--line))]",
                  )}
                >
                  {isCurrent && <span className="absolute inset-0 animate-ping rounded-full bg-sun/40" aria-hidden="true" />}
                  <span className="relative">
                    {l.status === "skipped" ? <SkipForward size={30} /> : complete ? <Check size={34} strokeWidth={3.5} /> : locked ? <Lock size={28} /> : n === 10 ? <Crown size={32} /> : n}
                  </span>
                  {!locked && !complete && (
                    <svg className="absolute inset-[-6px] -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
                      <circle cx="50" cy="50" r="47" stroke="rgb(var(--teal))" strokeWidth="5" fill="none" strokeDasharray={`${(l.done / l.missions.length) * 295} 295`} strokeLinecap="round" />
                    </svg>
                  )}
                </motion.button>
              </div>
              <div className="mb-8 mt-3 flex h-16 max-w-[170px] flex-col items-center justify-start"><div className="rounded-2xl bg-bg/95 px-2.5 py-1 text-center">
                <div className="eyebrow">Level {n}</div>
                <div className={cn("font-display font-bold leading-tight", locked && "text-ink-3")}>{l.level.title}</div>
              </div></div>
            </div>
            <AnimatePresence initial={false}>
              {open === n && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="relative z-10 overflow-hidden">
                  <div className="mb-10 rounded-4xl border-2 border-line bg-surface p-4 shadow-lift">
                    <p className="text-sm text-ink-2">{l.level.summary}</p>
                    <div className="mt-2 flex items-center gap-2 rounded-2xl bg-surface-2 px-3 py-2 text-xs font-semibold text-ink-2">
                      <Star size={14} className="shrink-0 text-sun" /> Milestone: {l.level.milestone}
                    </div>
                    <div className="mt-3 space-y-2">
                      {l.missions.map((m) => (
                        <div key={m.mission.id}>
                          <MissionCard mission={m.mission} done={m.done} locked={!m.available || !interactive} href={`/missions/${m.mission.id}?from=path`} compact />
                          {!m.done && !m.available && m.lockedReason && <p className="ml-16 mt-1 text-[11px] font-semibold text-ink-3">{m.lockedReason}</p>}
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-3">
                      <Flag size={12} /> Finish the quest plus 3 other missions to complete this level.
                    </p>
                    {locked && interactive && n <= 6 && (
                      <Link href={`/missions/${l.missions.find((x) => x.mission.quest)?.mission.id}?placement=1&from=path`} className="btn-ghost btn-sm mt-3 w-full">
                        <SkipForward size={14} /> Already experienced? Skip ahead to here
                      </Link>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        );
      })}
      <li className="flex flex-col items-center pt-2 text-center" aria-hidden="true">
        <span className="text-xs font-bold text-ink-3">Keep going — your future self says thanks.</span>
      </li>
    </ol>
  );
}
