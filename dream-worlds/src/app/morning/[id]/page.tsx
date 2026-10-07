"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { Bookmark, BookmarkCheck, BookOpen, Clock, Globe, Moon, RotateCcw, Sparkles, Sun, X } from "lucide-react";
import { useDreamStore } from "@/lib/store";
import { worldById } from "@/lib/data/worlds";
import { characterById } from "@/lib/data/characters";
import { toneLabel } from "@/lib/services/dreams";
import { DreamCover } from "@/components/cards/DreamCard";
import { CharacterPortrait } from "@/components/art/CharacterPortrait";
import { STAGE_META } from "@/components/player/SleepCurve";
import { DreamingLoader } from "@/components/create/DreamingLoader";

const ink = "#1b2045";

export default function MorningPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const store = useDreamStore();
  const dream = store.getDream(id);
  const [busy, setBusy] = useState(false);
  if (!dream) return <div className="min-h-[100svh] bg-[#f3e2d3]" />;
  if (busy) return <DreamingLoader worldIds={dream.request.worlds} characterIds={dream.request.characters} />;

  const session = store.latestSessionFor(dream.id);
  const minutes = session?.minutesListened ?? Math.round(dream.totalMinutes * 0.8);
  const stopCh = dream.output.chapters[session?.stoppedAtChapter ?? dream.output.chapters.length - 1];
  const heardChapters = dream.output.chapters.filter((c) => c.startMinute <= minutes);
  const chars = [...new Set(heardChapters.flatMap((c) => c.presentCharacterIds))].map(characterById).filter(Boolean);
  const locs = heardChapters.map((c) => dream.request.worlds.flatMap((w) => worldById(w)!.locations).find((l) => l.id === c.locationId)?.name).filter(Boolean);
  const glimpse = heardChapters.flatMap((c) => c.character_dialogue)[0];
  const saved = store.isSaved(dream.id);

  const cont = async () => {
    setBusy(true);
    const d = await store.continueDream(dream.id);
    router.push(`/dream/${d.id}?new=1`);
  };

  const fade = (d: number) => ({ initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 1.2, delay: d, ease: [0.22, 1, 0.36, 1] as const } });

  return (
    <div className="relative min-h-[100svh] overflow-x-hidden pb-16" style={{ color: ink, background: "linear-gradient(180deg,#f8e6d4 0%,#f1d9d6 30%,#ddd5f1 62%,#c8d3f2 100%)" }}>
      {/* sunrise */}
      <svg viewBox="0 0 400 220" preserveAspectRatio="xMidYMax slice" className="pointer-events-none absolute inset-x-0 top-0 h-[300px] w-full lg:h-[380px]">
        <defs>
          <radialGradient id="sun" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#fff6dc" />
            <stop offset="0.35" stopColor="#ffd9a0" stopOpacity="0.9" />
            <stop offset="1" stopColor="#ffd9a0" stopOpacity="0" />
          </radialGradient>
        </defs>
        <motion.circle cx="300" cy="150" r="140" fill="url(#sun)" initial={{ cy: 220, opacity: 0 }} animate={{ cy: 150, opacity: 1 }} transition={{ duration: 3, ease: "easeOut" }} />
        <path d="M0 200 Q80 150 160 180 T320 165 T400 175 L400 220 L0 220 Z" fill="#e8cfe0" opacity="0.7" />
        <path d="M0 210 Q100 180 200 200 T400 195 L400 220 L0 220 Z" fill="#dcd2ef" opacity="0.8" />
      </svg>

      <div className="relative mx-auto max-w-5xl px-5 pt-[max(var(--safe-top),18px)] lg:px-10 lg:pt-10">
        <header className="flex justify-end">
          <Link href="/" className="grid h-10 w-10 place-items-center rounded-full bg-white/50 backdrop-blur" aria-label="Close">
            <X className="h-4 w-4" />
          </Link>
        </header>

        <motion.div {...fade(0.2)} className="mt-10 text-center lg:mt-16">
          <h1 className="flex items-center justify-center gap-3 font-display text-[44px] font-light leading-none lg:text-6xl">
            Good morning <Sun className="h-8 w-8 text-[#f0a64a]" />
          </h1>
          <p className="mt-3 text-[15px] opacity-70">Here&apos;s what you dreamed.</p>
        </motion.div>

        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_1fr] lg:gap-10">
          <motion.div {...fade(0.6)}>
            <div className="relative aspect-[16/11] overflow-hidden rounded-[28px] shadow-[0_30px_80px_-30px_rgba(60,50,120,0.55)]">
              <DreamCover dream={dream} detail="hero" className="absolute inset-0" />
              <div className="absolute inset-0 bg-gradient-to-t from-night-950/85 via-transparent to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 text-white lg:p-7">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ember-200">Last night you dreamed…</p>
                <h2 className="mt-1.5 font-display text-[26px] font-light leading-tight lg:text-4xl">{dream.output.dream_title}</h2>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2 text-[13px] opacity-80 lg:justify-start">
              <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> {minutes} min listened</span>
              <span className="flex items-center gap-1.5"><BookOpen className="h-4 w-4" /> {heardChapters.length} chapters</span>
              <span className="flex items-center gap-1.5"><Sparkles className="h-4 w-4" /> {toneLabel(dream.request.tone)}</span>
            </div>
          </motion.div>

          <motion.div {...fade(1)} className="min-w-0 space-y-5">
            <p className="font-display text-[24px] font-light leading-snug lg:text-[30px]">{dream.output.summary}</p>

            <div className="rounded-3xl bg-white/45 p-5 backdrop-blur-md">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] opacity-60">Characters encountered</p>
              <div className="flex flex-wrap gap-4">
                {chars.map((c) => (
                  <div key={c!.id} className="flex flex-col items-center gap-1.5">
                    <div className="h-14 w-14 overflow-hidden rounded-full ring-2 ring-white/70">
                      <CharacterPortrait character={c!} className="h-full w-full" />
                    </div>
                    <span className="max-w-[72px] text-center text-[11px] leading-tight opacity-80">{c!.name.replace(/^The /, "")}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-3xl bg-white/45 p-4 backdrop-blur-md">
                <Moon className="h-4 w-4 opacity-60" />
                <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.2em] opacity-60">You drifted off</p>
                <p className="mt-1 text-sm font-medium">Chapter {(stopCh?.index ?? 0) + 1} · {stopCh?.title}</p>
                <p className="mt-0.5 text-xs opacity-60">during the {STAGE_META[session?.stoppedAtStage ?? stopCh?.stage ?? "sleepy"].label.toLowerCase()} stage</p>
              </div>
              <div className="rounded-3xl bg-white/45 p-4 backdrop-blur-md">
                <Globe className="h-4 w-4 opacity-60" />
                <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.2em] opacity-60">Worlds visited</p>
                <p className="mt-1 text-sm font-medium">{dream.request.worlds.map((w) => worldById(w)?.title).join(" & ")}</p>
                <p className="mt-0.5 line-clamp-2 text-xs opacity-60">{[...new Set(locs)].join(" · ")}</p>
              </div>
            </div>

            {glimpse && (
              <div className="rounded-3xl border border-white/60 bg-white/30 p-5 backdrop-blur-md">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] opacity-60">A glimpse from your dream</p>
                <p className="font-display text-lg font-light italic leading-relaxed">&ldquo;{glimpse.line}&rdquo;</p>
                <p className="mt-1 text-xs opacity-60">— {characterById(glimpse.characterId)?.name}</p>
              </div>
            )}

            {session?.lastHeard && (
              <p className="text-xs leading-relaxed opacity-60">
                The last thing you probably heard: <span className="italic">&ldquo;{session.lastHeard.slice(0, 140)}{session.lastHeard.length > 140 ? "…" : ""}&rdquo;</span>
              </p>
            )}
          </motion.div>
        </div>

        <motion.div {...fade(1.4)} className="mx-auto mt-10 flex max-w-xl flex-col gap-3">
          <button onClick={cont} className="flex items-center justify-center gap-2 rounded-full py-4 text-[15px] font-semibold text-white shadow-[0_14px_40px_-12px_rgba(40,40,110,0.7)]" style={{ background: "linear-gradient(100deg,#2b3478,#5a4fc0 60%,#7d6fe0)" }}>
            <RotateCcw className="h-4 w-4" /> Continue Tonight
          </button>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/create" className="flex items-center justify-center gap-2 rounded-full bg-white/55 py-3.5 text-sm font-medium backdrop-blur">
              <Sparkles className="h-4 w-4" /> Create Something New
            </Link>
            <button onClick={() => store.toggleSave(dream.id)} className="flex items-center justify-center gap-2 rounded-full bg-white/55 py-3.5 text-sm font-medium backdrop-blur">
              {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />} {saved ? "Saved to My Dreams" : "Save to My Dreams"}
            </button>
          </div>
          <p className="mt-2 text-center text-xs opacity-60">Tonight&apos;s episode will remember everything that happened — and everyone you met.</p>
        </motion.div>
      </div>
    </div>
  );
}
