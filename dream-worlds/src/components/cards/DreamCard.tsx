"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Clock, Play } from "lucide-react";
import type { Dream, ListeningSession } from "@/lib/types";
import { worldById } from "@/lib/data/worlds";
import { characterById } from "@/lib/data/characters";
import { WorldArt } from "../art/WorldArt";
import { CharacterPortrait } from "../art/CharacterPortrait";
import { lengthLabel, toneLabel } from "@/lib/services/dreams";

export function DreamCover({ dream, className = "", detail = "card", dim = 0 }: { dream: Dream; className?: string; detail?: "card" | "hero"; dim?: number }) {
  const w = worldById(dream.request.worlds[0] ?? characterById(dream.request.characters[0])!.worldId)!;
  return <WorldArt scene={w.visualStyle.scene} palette={w.visualStyle.palette} seed={dream.output.dream_title} className={className} detail={detail} dim={dim} />;
}

export function CastStack({ ids, size = 28 }: { ids: string[]; size?: number }) {
  return (
    <div className="flex -space-x-2">
      {ids.slice(0, 4).map((id) => {
        const c = characterById(id);
        if (!c) return null;
        return (
          <div key={id} className="overflow-hidden rounded-full ring-2 ring-night-950" style={{ width: size, height: size }} title={c.name}>
            <CharacterPortrait character={c} className="h-full w-full" />
          </div>
        );
      })}
    </div>
  );
}

/** Landscape card used for Popular / Originals / Because-you-dreamed shelves. */
export function DreamCard({ dream, href, wide = false }: { dream: Dream; href?: string; wide?: boolean }) {
  return (
    <Link href={href ?? `/dream/${dream.id}`} className="shrink-0 snap-start">
      <motion.div whileHover={{ y: -4 }} whileTap={{ scale: 0.98 }} className={`group ${wide ? "w-[300px] lg:w-[380px]" : "w-[240px] lg:w-[300px]"}`}>
        <div className="relative aspect-[16/10] overflow-hidden rounded-[20px] ring-1 ring-white/[0.08]">
          <DreamCover dream={dream} className="absolute inset-0 transition-transform duration-[1200ms] group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-night-950/90 via-transparent to-transparent" />
          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
            <CastStack ids={dream.request.characters} size={26} />
            <span className="grid h-9 w-9 place-items-center rounded-full bg-white/15 backdrop-blur-md transition group-hover:bg-white/25">
              <Play className="ml-0.5 h-4 w-4 fill-white text-white" />
            </span>
          </div>
          {dream.author?.kind === "calm" && <span className="absolute left-3 top-3 rounded-full bg-night-950/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ember-200 backdrop-blur">Calm Original</span>}
        </div>
        <h3 className="mt-3 line-clamp-1 font-display text-[17px] font-light text-white">{dream.output.dream_title}</h3>
        <p className="mt-0.5 line-clamp-1 text-xs text-mist-400">
          {lengthLabel(dream.request.length)} · {toneLabel(dream.request.tone)}
          {dream.author?.kind === "creator" ? ` · by ${dream.author.name}` : ""}
        </p>
      </motion.div>
    </Link>
  );
}

/** Big "Continue Dreaming" card with progress. */
export function ContinueCard({ dream, session }: { dream: Dream; session?: ListeningSession }) {
  const pct = session ? Math.min(100, (session.minutesListened / dream.totalMinutes) * 100) : 0;
  const chapter = session ? dream.output.chapters[session.stoppedAtChapter] : dream.output.chapters[0];
  return (
    <Link href={`/dream/${dream.id}`} className="shrink-0 snap-start">
      <motion.div whileHover={{ y: -4 }} whileTap={{ scale: 0.98 }} className="group relative h-[200px] w-[310px] overflow-hidden rounded-[24px] ring-1 ring-white/[0.08] lg:h-[230px] lg:w-[420px]">
        <DreamCover dream={dream} className="absolute inset-0 transition-transform duration-[1200ms] group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-r from-night-950/90 via-night-950/40 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-between p-5">
          <div>
            <p className="eyebrow text-ember-200/90">Night {dream.episode} · {chapter ? `Chapter ${chapter.index + 1}` : ""}</p>
            <h3 className="mt-2 max-w-[220px] font-display text-[22px] font-light leading-tight text-white lg:max-w-[280px] lg:text-2xl">{dream.output.dream_title}</h3>
          </div>
          <div>
            <div className="mb-3 flex items-center gap-3">
              <CastStack ids={dream.request.characters} size={26} />
              <span className="inline-flex items-center gap-1 text-xs text-mist-300">
                <Clock className="h-3 w-3" /> {session ? `${session.minutesListened} of ${dream.totalMinutes} min` : lengthLabel(dream.request.length)}
              </span>
            </div>
            <div className="h-[3px] w-full overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full bg-gradient-to-r from-ember-200 via-dusk-400 to-glow-300" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

/** Row used in My Dreams lists (matches the reference board). */
export function DreamRow({ dream, sub, href }: { dream: Dream; sub?: string; href?: string }) {
  return (
    <Link href={href ?? `/dream/${dream.id}`} className="group flex items-center gap-4 rounded-2xl p-2 transition hover:bg-white/[0.04]">
      <div className="relative h-[68px] w-[68px] shrink-0 overflow-hidden rounded-[14px] ring-1 ring-white/10 lg:h-20 lg:w-28">
        <DreamCover dream={dream} className="absolute inset-0" />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-2 text-[15px] font-medium leading-snug text-mist-100">{dream.output.dream_title}</h3>
        <p className="mt-1 text-xs text-mist-400">{sub ?? `${lengthLabel(dream.request.length)} · ${toneLabel(dream.request.tone)}`}</p>
      </div>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/15 bg-white/[0.04] transition group-hover:bg-white/10">
        <Play className="ml-0.5 h-4 w-4 fill-white text-white" />
      </span>
    </Link>
  );
}
