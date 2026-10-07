"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Bookmark, BookmarkCheck, Clock, Code2, Moon, Play, RotateCcw, Shuffle, Sparkles, Waves } from "lucide-react";
import { useDreamStore } from "@/lib/store";
import { worldById } from "@/lib/data/worlds";
import { characterById } from "@/lib/data/characters";
import { creditsFor } from "@/lib/services/rights";
import { lengthLabel, sleepinessLabel, toneLabel } from "@/lib/services/dreams";
import { buildGroundedPayload } from "@/lib/engine/dreamEngine";
import { DreamCover } from "@/components/cards/DreamCard";
import { CharacterPortrait } from "@/components/art/CharacterPortrait";
import { SleepCurve, STAGE_META } from "@/components/player/SleepCurve";
import { DreamingLoader } from "@/components/create/DreamingLoader";

export default function DreamPreviewPage() {
  return (
    <Suspense>
      <Preview />
    </Suspense>
  );
}

function Preview() {
  const { id } = useParams<{ id: string }>();
  const isNew = useSearchParams().get("new") === "1";
  const router = useRouter();
  const store = useDreamStore();
  const dream = store.getDream(id);
  const [busy, setBusy] = useState<null | "remix" | "continue">(null);
  const [engine, setEngine] = useState(false);

  if (!dream) {
    return (
      <div className="grid min-h-[100svh] place-items-center px-6 text-center">
        <div>
          <p className="font-display text-2xl font-light">{store.hydrated ? "This dream has drifted away." : "…"}</p>
          {store.hydrated && (
            <Link href="/" className="mt-4 inline-block text-sm text-glow-300">
              Back home
            </Link>
          )}
        </div>
      </div>
    );
  }
  if (busy) return <DreamingLoader worldIds={dream.request.worlds} characterIds={dream.request.characters} />;

  const o = dream.output;
  const saved = store.isSaved(dream.id);
  const listened = store.latestSessionFor(dream.id);
  const series = store.seriesOf(dream);
  const prev = dream.request.story_history[dream.request.story_history.length - 1];

  const remix = async () => {
    setBusy("remix");
    const d = await store.remixDream(dream.id);
    router.replace(`/dream/${d.id}?new=1`);
    setBusy(null);
  };
  const cont = async () => {
    setBusy("continue");
    const d = await store.continueDream(dream.id);
    router.push(`/dream/${d.id}?new=1`);
    setBusy(null);
  };

  return (
    <div className="relative min-h-[100svh] overflow-x-hidden pb-16">
      <div className="fixed inset-0 -z-10 opacity-40">
        <DreamCover dream={dream} className="absolute inset-0 blur-2xl" />
      </div>
      <div className="fixed inset-0 -z-10 bg-night-950/80" />

      <div className="mx-auto max-w-6xl px-5 pt-[max(env(safe-area-inset-top),18px)] lg:px-10 lg:pt-10">
        <header className="flex items-center justify-between">
          <button onClick={() => router.back()} className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5" aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <p className="flex items-center gap-2 text-[15px] text-mist-100">
            {isNew ? (
              <>
                Your dream is ready <Sparkles className="h-4 w-4 text-ember-200" />
              </>
            ) : dream.author ? (
              dream.author.kind === "calm" ? "A Calm Original" : `By ${dream.author.name}`
            ) : (
              `Night ${dream.episode}`
            )}
          </p>
          <span className="w-10" />
        </header>

        <div className="mt-6 grid gap-8 lg:mt-10 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
          {/* Dream card */}
          <motion.div initial={{ opacity: 0, y: 30, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}>
            <div className="relative aspect-[4/5] overflow-hidden rounded-[32px] shadow-[0_40px_120px_-30px_rgba(108,91,212,0.55)] ring-1 ring-white/10 lg:aspect-[4/4.4]">
              <DreamCover dream={dream} detail="hero" className="absolute inset-0 animate-pan" />
              <div className="grain absolute inset-0" />
              <div className="absolute inset-0 bg-gradient-to-t from-night-950 via-night-950/20 to-transparent" />
              <div className="absolute left-5 top-5 flex flex-wrap gap-1.5">
                {dream.request.worlds.map((w) => (
                  <span key={w} className="rounded-full bg-night-950/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-mist-100 backdrop-blur-md">{worldById(w)?.title}</span>
                ))}
              </div>
              <div className="absolute inset-x-0 bottom-0 p-6 lg:p-8">
                {dream.episode > 1 && <p className="eyebrow mb-2 text-ember-200/90">Night {dream.episode} · continues</p>}
                <h1 className="font-display text-[34px] font-light leading-[1.05] text-white lg:text-5xl">{o.dream_title}</h1>
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
                  <Meta icon={Clock}>{lengthLabel(dream.request.length)}</Meta>
                  <Meta icon={Waves}>{toneLabel(dream.request.tone)}</Meta>
                  <Meta icon={Moon}>{sleepinessLabel(dream.request.sleepiness)}</Meta>
                </div>
              </div>
            </div>
          </motion.div>

          {/* details */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.2 }} className="flex flex-col">
            <p className="font-display text-xl font-light italic leading-relaxed text-mist-100 lg:text-2xl">{o.hook}</p>

            {prev && (
              <div className="glass mt-6 rounded-2xl p-4">
                <p className="eyebrow mb-2">Previously</p>
                <p className="text-sm leading-relaxed text-mist-200">{prev.summary}</p>
                <p className="mt-2 text-xs text-mist-400">Remembering {dream.request.story_history.reduce((n, h) => n + h.continuity.events.length, 0)} events · {prev.continuity.locationsVisited.length} places · {prev.continuity.relationships.length} {prev.continuity.relationships.length === 1 ? "relationship" : "relationships"}</p>
              </div>
            )}

            <div className="mt-7 flex flex-col gap-3">
              <Link href={`/play/${dream.id}`} className="btn-dream flex items-center justify-center gap-2.5 rounded-full py-4 text-[15px] font-semibold">
                <Play className="h-4 w-4 fill-current" /> Start Dream
              </Link>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={remix} className="flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.04] py-3.5 text-sm font-medium text-white transition hover:bg-white/10">
                  <Shuffle className="h-4 w-4" /> Remix
                </button>
                <button onClick={() => store.toggleSave(dream.id)} className={`flex items-center justify-center gap-2 rounded-full border py-3.5 text-sm font-medium transition ${saved ? "border-ember-200/40 bg-ember-200/10 text-ember-200" : "border-white/15 bg-white/[0.04] text-white hover:bg-white/10"}`}>
                  {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />} {saved ? "Saved" : "Save"}
                </button>
              </div>
              {listened && (
                <button onClick={cont} className="flex items-center justify-center gap-2 rounded-full py-3 text-sm font-medium text-glow-300 transition hover:text-white">
                  <RotateCcw className="h-4 w-4" /> Continue tonight with Night {dream.episode + 1}
                </button>
              )}
            </div>

            <div className="mt-8">
              <p className="eyebrow mb-3">Starring</p>
              <div className="flex flex-wrap gap-3">
                {dream.request.characters.map((cid) => {
                  const c = characterById(cid)!;
                  return (
                    <div key={cid} className="glass flex items-center gap-3 rounded-full py-1.5 pl-1.5 pr-4">
                      <div className="h-10 w-10 overflow-hidden rounded-full">
                        <CharacterPortrait character={c} className="h-full w-full" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{c.name}</p>
                        <p className="text-[10px] uppercase tracking-wider text-mist-400">{worldById(c.worldId)!.title}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="glass mt-8 rounded-3xl p-5">
              <div className="mb-3 flex items-center justify-between">
                <p className="eyebrow">Sleep curve</p>
                <p className="text-xs text-mist-400">{o.chapters.length} chapters</p>
              </div>
              <SleepCurve sleepiness={dream.request.sleepiness} className="h-14 w-full" />
              <ol className="mt-4 space-y-2.5">
                {o.chapters.map((c) => (
                  <li key={c.index} className="flex items-center gap-3 text-sm">
                    <span className="w-5 font-display text-mist-500">{c.index + 1}</span>
                    <span className="flex-1 truncate text-mist-100">{c.title}</span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: STAGE_META[c.stage].color }}>
                      {STAGE_META[c.stage].label}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            {series.length > 1 && (
              <p className="mt-4 text-xs text-mist-400">Part of a {series.length}-night series in your universe.</p>
            )}

            <button onClick={() => setEngine(!engine)} className="mt-6 flex items-center gap-2 self-start text-xs font-medium text-mist-400 transition hover:text-mist-100">
              <Code2 className="h-3.5 w-3.5" /> {engine ? "Hide" : "Behind the dream"} · Dream Engine
            </button>
            <AnimatePresence>
              {engine && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="mt-3 grid gap-3">
                    <EngineBlock title="Input → Dream Engine" data={{ ...dream.request, user_preferences: "…", story_history: dream.request.story_history.map((h) => ({ episode: h.episode, title: h.title })) }} />
                    <EngineBlock title="Rights & restrictions applied" data={buildGroundedPayload(dream.request).restrictions} />
                    <EngineBlock
                      title="Output (excerpt)"
                      data={{ dream_title: o.dream_title, summary: o.summary, chapters: o.chapters.map((c) => ({ title: c.title, stage: c.stage, intensity: c.intensity, dialogue: c.character_dialogue.length })), soundscape: o.soundscape.base, visual_prompts: o.visual_prompts.slice(0, 2), continuity_data: o.continuity_data }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <p className="mt-8 text-[11px] leading-relaxed text-mist-500">{creditsFor(dream.request.worlds).join(" · ")}</p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function Meta({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] text-mist-200">
      <Icon className="h-3.5 w-3.5 opacity-80" />
      {children}
    </span>
  );
}

function EngineBlock({ title, data }: { title: string; data: unknown }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-night-950/70 p-4">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-dusk-400">{title}</p>
      <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-mist-300">{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
