"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Eye, Info, Lock, Sparkles, UsersRound, X } from "lucide-react";
import type { DreamLength, DreamTone, Sleepiness, StoryRole } from "@/lib/types";
import { worlds, worldById } from "@/lib/data/worlds";
import { characters, characterById } from "@/lib/data/characters";
import { allowedTones, characterBlockReason, creditsFor, worldBlockReason } from "@/lib/services/rights";
import { SLEEPINESS, TONES } from "@/lib/services/dreams";
import { useDreamStore } from "@/lib/store";
import { WorldCard } from "@/components/cards/WorldCard";
import { CharacterCard } from "@/components/cards/CharacterCard";
import { Chip } from "@/components/ui/primitives";
import { SleepCurve } from "@/components/player/SleepCurve";
import { WorldArt } from "@/components/art/WorldArt";
import { DreamingLoader } from "@/components/create/DreamingLoader";

const STEPS = ["Choose your worlds", "Choose your characters", "What kind of dream?", "Make it yours"];
const LENGTHS: { id: DreamLength; label: string }[] = [
  { id: 20, label: "20 min" },
  { id: 40, label: "40 min" },
  { id: 60, label: "60 min" },
  { id: "all-night", label: "All night" },
];
const TONE_GLYPH: Record<DreamTone, string> = { cozy: "☾", adventure: "⛵︎", mystery: "✧", funny: "◠", romantic: "♡", epic: "✦", nostalgic: "❋", "very-sleepy": "∽" };

export default function CreatePage() {
  return (
    <Suspense>
      <CreateFlow />
    </Suspense>
  );
}

function CreateFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const store = useDreamStore();

  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [worldIds, setWorldIds] = useState<string[]>([]);
  const [charIds, setCharIds] = useState<string[]>([]);
  const [tone, setTone] = useState<DreamTone | null>(null);
  const [length, setLength] = useState<DreamLength>(store.prefs.defaultLength);
  const [sleepiness, setSleepiness] = useState<Sleepiness>(store.prefs.defaultSleepiness);
  const [role, setRole] = useState<StoryRole>("watch");
  const [prompt, setPrompt] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  // deep links: /create?world=…&character=…
  useEffect(() => {
    const w = params.get("world");
    const c = params.get("character");
    if (c && characterById(c)) {
      const ch = characterById(c)!;
      setWorldIds([ch.worldId]);
      setCharIds([c]);
      setStep(1);
    } else if (w && worldById(w)) {
      setWorldIds([w]);
      setStep(1);
    }
  }, [params]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3800);
    return () => clearTimeout(t);
  }, [toast]);

  const tonesOk = useMemo(() => allowedTones([...new Set([...worldIds, ...charIds.map((c) => characterById(c)!.worldId)])]), [worldIds, charIds]);
  useEffect(() => {
    if (tone && !tonesOk.has(tone)) setTone(null);
  }, [tone, tonesOk]);

  const toggleWorld = (id: string) => {
    if (worldIds.includes(id)) {
      setWorldIds(worldIds.filter((w) => w !== id));
      setCharIds(charIds.filter((c) => characterById(c)!.worldId !== id));
      return;
    }
    const reason = worldBlockReason(id, worldIds);
    if (reason) return setToast(reason);
    setWorldIds([...worldIds, id]);
  };

  const toggleChar = (id: string) => {
    if (charIds.includes(id)) return setCharIds(charIds.filter((c) => c !== id));
    if (charIds.length >= 4) return setToast("Up to four characters per dream — any more and it gets a little crowded for sleep.");
    const ch = characterById(id)!;
    const reason = characterBlockReason(ch, charIds, worldIds);
    if (reason) return setToast(reason);
    setCharIds([...charIds, id]);
    if (!worldIds.includes(ch.worldId)) setWorldIds([...worldIds, ch.worldId]);
  };

  const canNext = [worldIds.length > 0, charIds.length > 0, !!tone, true][step];
  const go = (d: number) => {
    setDir(d);
    if (step + d < 0) return router.back();
    setStep(step + d);
  };

  const create = async () => {
    setGenerating(true);
    const finalWorlds = [...new Set([...worldIds, ...charIds.map((c) => characterById(c)!.worldId)])];
    const dream = await store.createDream({
      user_id: "demo-user",
      worlds: finalWorlds,
      characters: charIds,
      tone: tone!,
      length,
      sleepiness,
      story_role: role,
      user_prompt: prompt,
      story_history: [],
      user_preferences: store.prefs,
    });
    router.push(`/dream/${dream.id}?new=1`);
  };

  const bgWorld = worldById(worldIds[worldIds.length - 1] ?? "endless-seas")!;
  const selectedWorldChars = characters.filter((c) => worldIds.includes(c.worldId));
  const guestChars = characters.filter((c) => !worldIds.includes(c.worldId));

  if (generating) return <DreamingLoader worldIds={worldIds} characterIds={charIds} />;

  return (
    <div className="relative min-h-[100svh] overflow-hidden">
      {/* ambient backdrop follows your world choice */}
      <AnimatePresence>
        <motion.div key={bgWorld.id} initial={{ opacity: 0 }} animate={{ opacity: 0.35 }} exit={{ opacity: 0 }} transition={{ duration: 1.6 }} className="fixed inset-0 -z-10">
          <WorldArt scene={bgWorld.visualStyle.scene} palette={bgWorld.visualStyle.palette} seed={`create-${bgWorld.id}`} className="absolute inset-0 blur-[2px]" />
        </motion.div>
      </AnimatePresence>
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-night-950/80 via-night-950/90 to-night-950" />

      <div className="mx-auto max-w-5xl px-5 pb-40 pt-[max(env(safe-area-inset-top),18px)] lg:px-10 lg:pt-10">
        <header className="flex items-center justify-between">
          <button onClick={() => go(-1)} className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5" aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <span key={i} className={`h-1 rounded-full transition-all duration-500 ${i === step ? "w-8 bg-gradient-to-r from-ember-200 to-dusk-400" : i < step ? "w-3 bg-white/50" : "w-3 bg-white/15"}`} />
            ))}
          </div>
          <button onClick={() => router.push("/")} className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="mt-8 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow mb-2">Create a dream · {step + 1}/4</p>
            <h1 className="font-display text-[32px] font-light leading-[1.05] text-white lg:text-5xl">{STEPS[step]}</h1>
          </div>
          {step === 1 && <span className="mb-1 shrink-0 text-sm text-mist-300">{charIds.length}/4</span>}
        </div>

        {/* selection summary */}
        {(worldIds.length > 0 || charIds.length > 0) && step > 0 && (
          <div className="no-scrollbar -mx-5 mt-4 flex gap-2 overflow-x-auto px-5">
            {worldIds.map((w) => (
              <span key={w} className="shrink-0 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-mist-200">{worldById(w)!.title}</span>
            ))}
            {charIds.map((c) => (
              <span key={c} className="shrink-0 rounded-full bg-dusk-500/25 px-3 py-1 text-xs text-white">{characterById(c)!.name}</span>
            ))}
            {tone && step > 2 && <span className="shrink-0 rounded-full bg-ember-200/15 px-3 py-1 text-xs text-ember-200">{TONES.find((t) => t.id === tone)!.label}</span>}
          </div>
        )}

        <AnimatePresence mode="wait" custom={dir}>
          <motion.section
            key={step}
            custom={dir}
            initial={{ opacity: 0, x: dir * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -40 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="mt-7"
          >
            {step === 0 && (
              <>
                <p className="mb-5 max-w-md text-sm text-mist-300">Choose one world, or several. Some rights holders allow their worlds to meet; others keep them apart.</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {worlds.map((w) => (
                    <WorldCard key={w.id} world={w} size="lg" selected={worldIds.includes(w.id)} blocked={worldIds.includes(w.id) ? null : worldBlockReason(w.id, worldIds)} onClick={() => toggleWorld(w.id)} />
                  ))}
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {selectedWorldChars.map((c) => (
                    <CharacterCard key={c.id} character={c} size="grid" selected={charIds.includes(c.id)} blocked={charIds.includes(c.id) ? null : characterBlockReason(c, charIds, worldIds)} onClick={() => toggleChar(c.id)} />
                  ))}
                </div>
                <div className="mt-10">
                  <div className="mb-1 flex items-center gap-2">
                    <UsersRound className="h-4 w-4 text-glow-300" />
                    <h2 className="font-display text-xl font-light text-white">Crossover guests</h2>
                  </div>
                  <p className="mb-4 text-xs text-mist-400">Characters from other worlds, where their rights holders allow it.</p>
                  <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">
                    {guestChars.map((c) => {
                      const blocked = charIds.includes(c.id) ? null : characterBlockReason(c, charIds, worldIds);
                      return <CharacterCard key={c.id} character={c} size="grid" selected={charIds.includes(c.id)} blocked={blocked} onClick={() => toggleChar(c.id)} />;
                    })}
                  </div>
                </div>
              </>
            )}

            {step === 2 && (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {TONES.map((t) => {
                  const ok = tonesOk.has(t.id);
                  const on = tone === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => (ok ? setTone(t.id) : setToast(`${t.label} isn't available for this combination — a rights holder has restricted it.`))}
                      className={`relative overflow-hidden rounded-3xl p-5 text-left transition-all duration-300 ${on ? "chip-on" : "glass hover:bg-white/[0.07]"} ${ok ? "" : "opacity-35"}`}
                    >
                      <span className={`font-display text-3xl ${on ? "text-night-900" : "text-ember-200/80"}`}>{TONE_GLYPH[t.id]}</span>
                      <p className={`mt-5 text-base font-semibold ${on ? "text-night-900" : "text-white"}`}>{t.label}</p>
                      <p className={`mt-0.5 text-xs ${on ? "text-night-800/80" : "text-mist-400"}`}>{t.hint}</p>
                      {!ok && <Lock className="absolute right-4 top-4 h-3.5 w-3.5 text-mist-300" />}
                    </button>
                  );
                })}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-8 lg:grid lg:grid-cols-2 lg:gap-10 lg:space-y-0">
                <div className="space-y-8">
                  <Field label="Length">
                    <div className="flex flex-wrap gap-2">
                      {LENGTHS.map((l) => (
                        <Chip key={String(l.id)} on={length === l.id} onClick={() => setLength(l.id)}>
                          {l.label}
                        </Chip>
                      ))}
                    </div>
                  </Field>
                  <Field label="Sleepiness" hint="How quickly the dream winds down">
                    <div className="flex flex-wrap gap-2">
                      {SLEEPINESS.map((s) => (
                        <Chip key={s.id} on={sleepiness === s.id} onClick={() => setSleepiness(s.id)}>
                          {s.label}
                        </Chip>
                      ))}
                    </div>
                    <div className="glass mt-4 rounded-2xl p-4">
                      <div className="mb-2 flex justify-between text-[10px] uppercase tracking-wider text-mist-400">
                        <span>Awake</span>
                        <span>Drifting</span>
                        <span>Sleepy</span>
                        <span>Asleep</span>
                      </div>
                      <SleepCurve sleepiness={sleepiness} className="h-16 w-full" />
                      <p className="mt-2 text-xs text-mist-400">The story slows, quiets and fades into ambience along this curve.</p>
                    </div>
                  </Field>
                  <Field label="Story role">
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: "watch" as const, label: "Watch the story", icon: Eye, hint: "Told in third person" },
                        { id: "participate" as const, label: "Be part of the story", icon: Sparkles, hint: "You're a welcome guest" },
                      ].map((r) => (
                        <button key={r.id} onClick={() => setRole(r.id)} className={`rounded-2xl p-4 text-left transition ${role === r.id ? "chip-on" : "glass"}`}>
                          <r.icon className={`h-4 w-4 ${role === r.id ? "text-night-900" : "text-glow-300"}`} />
                          <p className={`mt-3 text-sm font-semibold ${role === r.id ? "text-night-900" : "text-white"}`}>{r.label}</p>
                          <p className={`text-xs ${role === r.id ? "text-night-800/80" : "text-mist-400"}`}>{r.hint}</p>
                        </button>
                      ))}
                    </div>
                  </Field>
                </div>
                <div className="space-y-6">
                  <Field label="What would you like to happen?" hint="Optional">
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      rows={5}
                      placeholder="e.g. A peaceful journey aboard a pirate ship where the Star Admiral unexpectedly appears and everyone has to work together."
                      className="glass w-full resize-none rounded-2xl p-4 text-[15px] leading-relaxed text-white placeholder:text-mist-500 focus:outline-none focus:ring-1 focus:ring-dusk-400/60"
                    />
                    <div className="mt-2 flex flex-wrap gap-2">
                      {["A storm passes and everyone shares soup", "We find an island that isn't on any map", "A quiet night watch under the stars"].map((s) => (
                        <button key={s} onClick={() => setPrompt(s)} className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-mist-300 transition hover:bg-white/5">
                          {s}
                        </button>
                      ))}
                    </div>
                  </Field>
                  <div className="glass flex gap-3 rounded-2xl p-4 text-xs leading-relaxed text-mist-300">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-glow-300" />
                    <div>
                      Your dream is written by the Dream Engine using approved lore, personalities and voices.
                      <div className="mt-1.5 text-mist-400">{creditsFor(worldIds).join(" · ")}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.section>
        </AnimatePresence>
      </div>

      {/* sticky footer CTA */}
      <div className="fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-night-950 via-night-950/95 to-transparent pb-[max(env(safe-area-inset-bottom),20px)] pt-10">
        <div className="mx-auto max-w-5xl px-5 lg:px-10">
          {step < 3 ? (
            <button
              disabled={!canNext}
              onClick={() => go(1)}
              className="btn-indigo flex w-full items-center justify-center gap-2 rounded-full py-4 text-[15px] font-semibold text-white transition disabled:opacity-30 disabled:shadow-none lg:ml-auto lg:w-72"
            >
              Next <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button onClick={create} className="btn-dream flex w-full items-center justify-center gap-2 rounded-full py-4 text-[15px] font-semibold lg:ml-auto lg:w-80">
              <Sparkles className="h-4 w-4" /> Create My Dream <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed inset-x-5 bottom-28 z-40 mx-auto max-w-md">
            <div className="glass-strong flex gap-3 rounded-2xl p-4 text-sm text-mist-100">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-ember-200" />
              {toast}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-white">{label}</h3>
        {hint && <span className="text-xs text-mist-400">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
