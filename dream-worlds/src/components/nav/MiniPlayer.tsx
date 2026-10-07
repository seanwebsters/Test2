"use client";

import Link from "next/link";
import { Play } from "lucide-react";
import { useDreamStore } from "@/lib/store";
import { DreamCover } from "../cards/DreamCard";

/** "Now dreaming" bar docked above the tab bar — resume the latest dream in one tap. */
export function MiniPlayer() {
  const store = useDreamStore();
  const latest = [...store.sessions].sort((a, b) => b.endedAt - a.endedAt)[0];
  const dream = latest && store.getDream(latest.dreamId);
  if (!dream) return null;
  const pct = Math.min(100, (latest.minutesListened / dream.totalMinutes) * 100);
  const ch = dream.output.chapters[latest.stoppedAtChapter];

  return (
    <div className="px-2 pb-2">
      <Link href={`/play/${dream.id}`} className="press relative mx-auto flex max-w-md items-center gap-3 overflow-hidden rounded-2xl border border-white/[0.08] bg-night-800/80 p-2 pr-3 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl">
          <DreamCover dream={dream} className="absolute inset-0" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-white">{dream.output.dream_title}</p>
          <p className="truncate text-[11px] text-mist-400">
            Night {dream.episode} · Chapter {(ch?.index ?? 0) + 1} · {latest.minutesListened} of {dream.totalMinutes} min
          </p>
        </div>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10">
          <Play className="ml-0.5 h-4 w-4 fill-white text-white" />
        </span>
        <span className="absolute inset-x-3 bottom-0 h-[2px] overflow-hidden rounded-full bg-white/10">
          <span className="block h-full bg-gradient-to-r from-ember-200 to-glow-300" style={{ width: `${pct}%` }} />
        </span>
      </Link>
    </div>
  );
}
