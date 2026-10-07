"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useDragControls } from "framer-motion";
import { haptic } from "@/lib/ui/haptics";
import { AudioLines, ChevronDown, Ellipsis, Gauge, Mic, Moon, Pause, Play, RotateCcw, RotateCw, Sunrise, Timer, X } from "lucide-react";
import type { DialogueLine, SleepStage } from "@/lib/types";
import { useDreamStore } from "@/lib/store";
import { worlds } from "@/lib/data/worlds";
import { characterById } from "@/lib/data/characters";
import { WorldArt } from "@/components/art/WorldArt";
import { CharacterPortrait } from "@/components/art/CharacterPortrait";
import { SleepCurve, STAGE_META } from "@/components/player/SleepCurve";
import { AmbientEngine } from "@/lib/audio/ambient";

const STAGES: SleepStage[] = ["awake", "drifting", "sleepy", "asleep"];
const DIM: Record<SleepStage, number> = { awake: 0, drifting: 0.22, sleepy: 0.45, asleep: 0.68 };
const BLUR: Record<SleepStage, string> = { awake: "blur(0px)", drifting: "blur(0.5px)", sleepy: "blur(2px)", asleep: "blur(5px)" };
const SPEEDS = [1, 20, 60] as const;

type Item = { kind: "narration"; text: string } | { kind: "dialogue"; line: DialogueLine };

const fmt = (min: number) => {
  const m = Math.max(0, Math.floor(min));
  const s = Math.max(0, Math.floor((min - m) * 60));
  if (m >= 60) return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
};

export default function PlayerPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const store = useDreamStore();
  const dream = store.getDream(id);

  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(20);
  const [timerEnd, setTimerEnd] = useState<number | null>(null);
  const [narrationOn, setNarrationOn] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [sheet, setSheet] = useState<null | "timer" | "menu" | "sound">(null);
  const [drift, setDrift] = useState(false);
  const [idle, setIdle] = useState(false);
  const startedAt = useRef(Date.now());
  const audio = useRef<AmbientEngine | null>(null);
  const ended = useRef(false);
  const drag = useDragControls();

  const total = dream?.totalMinutes ?? 40;
  const chapters = dream?.output.chapters ?? [];

  /* ---------- derived timeline ---------- */
  const chIdx = Math.max(0, chapters.findLastIndex((c) => c.startMinute <= elapsed));
  const chapter = chapters[chIdx];
  const storyEnd = chapters.length ? chapters[chapters.length - 1].startMinute + chapters[chapters.length - 1].durationMinutes : total;
  const pastStory = elapsed >= storyEnd;
  const curvePt = useMemo(() => {
    const c = dream?.output.sleep_curve ?? [];
    let best = c[0];
    for (const p of c) if (p.minute <= elapsed) best = p;
    return best;
  }, [dream, elapsed]);
  const stage: SleepStage = pastStory ? "asleep" : (chapter?.stage ?? "awake");

  const items: Item[] = useMemo(() => {
    if (!chapter) return [];
    const out: Item[] = [];
    const n = Math.max(chapter.narration.length, chapter.character_dialogue.length);
    for (let i = 0; i < n; i++) {
      if (chapter.narration[i]) out.push({ kind: "narration", text: chapter.narration[i] });
      if (chapter.character_dialogue[i]) out.push({ kind: "dialogue", line: chapter.character_dialogue[i] });
    }
    return out;
  }, [chapter]);
  const itemIdx = chapter ? Math.min(items.length - 1, Math.floor(((elapsed - chapter.startMinute) / chapter.durationMinutes) * items.length)) : 0;
  const item: Item | undefined = pastStory ? { kind: "narration", text: "…the night carries on, softly, by itself…" } : items[Math.max(0, itemIdx)];

  const sceneWorld = useMemo(() => {
    const loc = chapter?.locationId;
    return worlds.find((w) => w.locations.some((l) => l.id === loc)) ?? worlds.find((w) => w.id === dream?.request.worlds[0]) ?? worlds[0];
  }, [chapter, dream]);

  /* ---------- clock ---------- */
  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const t = setInterval(() => {
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      setElapsed((e) => Math.min(total, e + (dt * speed) / 60));
    }, 200);
    return () => clearInterval(t);
  }, [playing, speed, total]);

  /* ---------- end / morning ---------- */
  const finish = useCallback(() => {
    if (!dream || ended.current) return;
    ended.current = true;
    audio.current?.stop();
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    const ch = chapters[chIdx];
    store.recordSession({
      dreamId: dream.id,
      startedAt: startedAt.current,
      endedAt: Date.now(),
      minutesListened: Math.max(1, Math.round(elapsed)),
      stoppedAtChapter: ch?.index ?? 0,
      stoppedAtStage: stage,
      lastHeard: item?.kind === "narration" ? item.text : item?.line.line ?? "",
    });
    router.push(`/morning/${dream.id}`);
  }, [dream, chapters, chIdx, elapsed, stage, item, store, router]);

  useEffect(() => {
    if (elapsed >= total || (timerEnd !== null && elapsed >= timerEnd)) finish();
  }, [elapsed, total, timerEnd, finish]);

  /* ---------- audio ---------- */
  useEffect(() => {
    if (!curvePt) return;
    audio.current?.setLevels(curvePt.musicLevel, curvePt.ambienceLevel);
  }, [curvePt]);
  useEffect(() => () => audio.current?.stop(), []);

  const toggle = () => {
    haptic("medium");
    if (!audio.current) audio.current = new AmbientEngine();
    if (playing) {
      audio.current.pause();
      window.speechSynthesis?.pause();
    } else {
      if (soundOn) audio.current.start();
      audio.current.resume();
      window.speechSynthesis?.resume();
    }
    setPlaying(!playing);
  };

  const setSound = (on: boolean) => {
    setSoundOn(on);
    if (!audio.current) audio.current = new AmbientEngine();
    if (on && playing) {
      audio.current.start();
      audio.current.resume();
    } else audio.current.pause();
  };

  /* ---------- narration (browser TTS as a stand-in for licensed voices) ---------- */
  const spokenKey = useRef("");
  useEffect(() => {
    if (!narrationOn || !playing || !item || typeof window === "undefined" || !window.speechSynthesis) return;
    const key = `${chIdx}-${itemIdx}-${pastStory}`;
    if (spokenKey.current === key) return;
    spokenKey.current = key;
    const text = item.kind === "narration" ? item.text : item.line.line;
    const u = new SpeechSynthesisUtterance(text.replace(/…/g, ", "));
    const s = STAGES.indexOf(stage);
    u.rate = [0.88, 0.8, 0.72, 0.66][s];
    u.pitch = item.kind === "dialogue" ? 1.05 : 0.92;
    u.volume = [1, 0.85, 0.65, 0.45][s];
    const v = window.speechSynthesis.getVoices().find((x) => /en-GB/i.test(x.lang)) ?? window.speechSynthesis.getVoices().find((x) => /^en/i.test(x.lang));
    if (v) u.voice = v;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }, [narrationOn, playing, item, chIdx, itemIdx, pastStory, stage]);

  const setNarration = (on: boolean) => {
    setNarrationOn(on);
    if (on) setSpeed(1);
    else window.speechSynthesis?.cancel();
  };

  /* ---------- idle → controls fade; deep stages → "drifting with you" ---------- */
  useEffect(() => {
    setIdle(false);
    const wake = () => setIdle(false);
    window.addEventListener("pointermove", wake);
    window.addEventListener("pointerdown", wake);
    return () => {
      window.removeEventListener("pointermove", wake);
      window.removeEventListener("pointerdown", wake);
    };
  }, []);
  useEffect(() => {
    if (idle || !playing) return;
    const t = setTimeout(() => setIdle(true), stage === "awake" ? 12000 : 6000);
    return () => clearTimeout(t);
  }, [idle, playing, stage]);
  useEffect(() => {
    if (playing && idle && (stage === "sleepy" || stage === "asleep")) setDrift(true);
  }, [idle, playing, stage]);

  if (!dream) return <div className="grid min-h-[100svh] place-items-center text-mist-400">{store.hydrated ? "Dream not found" : ""}</div>;

  const present = (pastStory ? [] : chapter?.presentCharacterIds ?? []).map(characterById).filter(Boolean);
  const stageIdx = STAGES.indexOf(stage);
  const remaining = total - elapsed;
  const textSize = ["text-[19px] lg:text-[26px]", "text-[18px] lg:text-[24px]", "text-[17px] lg:text-[22px]", "text-[16px] lg:text-[20px]"][stageIdx];

  return (
    <motion.div
      drag="y"
      dragControls={drag}
      dragListener={false}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0, bottom: 0.6 }}
      onDragEnd={(_, info) => {
        if (info.offset.y > 140 || info.velocity.y > 700) {
          haptic();
          router.back();
        }
      }}
      className="fixed inset-0 overflow-hidden bg-night-950 text-white"
    >
      {/* cinematic backdrop */}
      <AnimatePresence>
        <motion.div key={sceneWorld.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 4 }} className="absolute inset-0" style={{ filter: BLUR[stage], transition: "filter 6s ease" }}>
          <WorldArt scene={sceneWorld.visualStyle.scene} palette={sceneWorld.visualStyle.palette} seed={`play-${dream.id}-${sceneWorld.id}`} detail="hero" dim={DIM[stage]} className="absolute inset-0 animate-pan" />
        </motion.div>
      </AnimatePresence>
      <div className="grain absolute inset-0" />
      <div className="absolute inset-0 bg-gradient-to-b from-night-950/60 via-night-950/10 to-night-950/95" />
      <motion.div className="pointer-events-none absolute inset-0 bg-night-950" animate={{ opacity: [0, 0.05, 0.15, 0.3][stageIdx] }} transition={{ duration: 5 }} />

      {/* floating motes */}
      <div className="pointer-events-none absolute inset-0">
        {Array.from({ length: 14 }, (_, i) => (
          <span key={i} className="absolute h-1 w-1 animate-drift rounded-full bg-ember-200/60 blur-[1px]" style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 80 + 10}%`, animationDelay: `${i * 0.7}s`, opacity: 0.6 - stageIdx * 0.12 }} />
        ))}
      </div>

      <motion.div animate={{ opacity: idle && stage !== "awake" ? 0.35 : 1 }} transition={{ duration: 2 }} className="relative mx-auto flex h-full max-w-6xl flex-col px-5 pb-[max(var(--safe-bottom),16px)] pt-[max(var(--safe-top),14px)] lg:px-10">
        {/* grabber: swipe down anywhere on the top bar to dismiss */}
        <div onPointerDown={(e) => drag.start(e)} className="absolute inset-x-0 top-0 h-24 touch-none" />
        <span className="pointer-events-none mx-auto mb-2 block h-1 w-9 rounded-full bg-white/25 lg:hidden" />
        {/* top bar */}
        <header onPointerDown={(e) => drag.start(e)} className="relative flex touch-none items-center justify-between">
          <button onClick={() => router.back()} className="grid h-10 w-10 place-items-center rounded-full bg-white/5 backdrop-blur" aria-label="Minimise">
            <ChevronDown className="h-5 w-5" />
          </button>
          <div className="text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-mist-300">Dream Worlds</p>
            <p className="max-w-[200px] truncate text-xs text-mist-100 lg:max-w-none">{dream.output.dream_title}</p>
          </div>
          <button onClick={() => setSheet("menu")} className="grid h-10 w-10 place-items-center rounded-full bg-white/5 backdrop-blur" aria-label="More">
            <Ellipsis className="h-5 w-5" />
          </button>
        </header>

        <div className="flex flex-1 flex-col justify-end gap-6 lg:flex-row lg:items-end lg:gap-14">
          {/* main column */}
          <div className="flex flex-1 flex-col justify-end">
            <AnimatePresence mode="wait">
              <motion.div key={stage} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-4 inline-flex items-center gap-2 self-start rounded-full bg-white/[0.07] px-3 py-1.5 backdrop-blur-md">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: STAGE_META[stage].color, animationDuration: `${2 + stageIdx}s` }} />
                  <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: STAGE_META[stage].color }} />
                </span>
                <span className="text-xs text-mist-100">{playing ? STAGE_META[stage].copy : "Paused"}</span>
              </motion.div>
            </AnimatePresence>

            <p className="eyebrow text-ember-200/90">
              {pastStory ? "Ambience until morning" : `Chapter ${chIdx + 1} of ${chapters.length} · ${chapter?.title}`}
            </p>
            <h1 className="mt-2 font-display text-[30px] font-light leading-[1.05] lg:text-5xl">{dream.output.dream_title}</h1>

            {/* characters present */}
            <div className="mt-4 flex h-9 items-center gap-2">
              <AnimatePresence>
                {present.map((c) => (
                  <motion.div key={c!.id} layout initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }} transition={{ duration: 1.2 }} className="flex items-center gap-2 rounded-full bg-white/[0.06] py-1 pl-1 pr-3 backdrop-blur" title={c!.name}>
                    <div className="h-7 w-7 overflow-hidden rounded-full">
                      <CharacterPortrait character={c!} className="h-full w-full" avatar />
                    </div>
                    <span className="text-[11px] text-mist-200">{c!.name.replace(/^The /, "")}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
              {present.length === 0 && <span className="text-xs text-mist-400">Everyone is resting</span>}
            </div>

            {/* live narration */}
            <div className="mt-5 min-h-[132px] lg:min-h-[170px]">
              <AnimatePresence mode="wait">
                {item && (
                  <motion.div key={`${chIdx}-${itemIdx}-${pastStory}`} initial={{ opacity: 0, y: 10, filter: "blur(6px)" }} animate={{ opacity: 1 - stageIdx * 0.12, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, filter: "blur(6px)" }} transition={{ duration: 1.4 + stageIdx * 0.5 }}>
                    {item.kind === "narration" ? (
                      <p className={`max-w-2xl font-display font-light italic leading-[1.5] text-mist-100 ${textSize}`}>{item.text}</p>
                    ) : (
                      <div className="max-w-2xl">
                        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: characterById(item.line.characterId)?.portrait.hue }}>
                          {characterById(item.line.characterId)?.name}
                        </p>
                        <p className={`font-display font-light leading-[1.45] text-white ${textSize}`}>&ldquo;{item.line.line}&rdquo;</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* sleep intensity indicator */}
            <div className="mt-5">
              <div className="flex items-center gap-1.5">
                {STAGES.map((s, i) => (
                  <div key={s} className="flex-1">
                    <div className="h-[3px] overflow-hidden rounded-full bg-white/10">
                      <motion.div className="h-full rounded-full" style={{ background: STAGE_META[s].color }} animate={{ width: i < stageIdx ? "100%" : i === stageIdx ? "55%" : "0%" }} transition={{ duration: 2 }} />
                    </div>
                    <p className={`mt-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] transition-colors duration-1000 ${i === stageIdx ? "text-white" : "text-mist-500"}`}>{STAGE_META[s].label}</p>
                  </div>
                ))}
              </div>
              <p className="mt-1 text-[11px] text-mist-400">{STAGE_META[stage].detail}</p>
            </div>

            {/* progress */}
            <div className="mt-5">
              <input
                type="range"
                min={0}
                max={total}
                step={0.1}
                value={elapsed}
                onChange={(e) => setElapsed(Number(e.target.value))}
                aria-label="Seek"
                className="dream-range w-full"
                style={{ ["--p" as string]: `${(elapsed / total) * 100}%` }}
              />
              <div className="mt-1 flex justify-between text-[11px] tabular-nums text-mist-300">
                <span>{fmt(elapsed)}</span>
                <span className="flex items-center gap-2">
                  {timerEnd !== null && (
                    <span className="flex items-center gap-1 text-ember-200">
                      <Timer className="h-3 w-3" /> {fmt(timerEnd - elapsed)}
                    </span>
                  )}
                  -{fmt(remaining)}
                </span>
              </div>
            </div>

            {/* transport */}
            <div className="mt-3 flex items-center justify-center gap-10">
              <button onClick={() => setElapsed((e) => Math.max(0, e - 0.25))} className="relative grid h-12 w-12 place-items-center text-mist-100" aria-label="Back 15 seconds">
                <RotateCcw className="h-7 w-7" strokeWidth={1.3} />
                <span className="absolute text-[9px] font-bold">15</span>
              </button>
              <button onClick={toggle} className="grid h-[72px] w-[72px] place-items-center rounded-full border-2 border-white/80 bg-white/5 backdrop-blur transition hover:bg-white/10" aria-label={playing ? "Pause" : "Play"}>
                {playing ? <Pause className="h-7 w-7 fill-white" /> : <Play className="ml-1 h-7 w-7 fill-white" />}
              </button>
              <button onClick={() => setElapsed((e) => Math.min(total, e + 0.25))} className="relative grid h-12 w-12 place-items-center text-mist-100" aria-label="Forward 15 seconds">
                <RotateCw className="h-7 w-7" strokeWidth={1.3} />
                <span className="absolute text-[9px] font-bold">15</span>
              </button>
            </div>

            {/* utility row */}
            <div className="mt-4 grid grid-cols-4 gap-2 border-t border-white/[0.06] pt-3">
              <Util icon={Mic} label="Narration" on={narrationOn} onClick={() => setNarration(!narrationOn)} />
              <Util icon={Timer} label="Sleep Timer" on={timerEnd !== null} onClick={() => setSheet("timer")} />
              <Util icon={AudioLines} label="Background" on={soundOn} onClick={() => setSheet("sound")} />
              <Util icon={Moon} label="Drift off" onClick={() => setDrift(true)} />
            </div>
          </div>

          {/* desktop side panel */}
          <aside className="glass hidden w-[340px] shrink-0 rounded-3xl p-6 lg:block">
            <p className="eyebrow mb-4">Sleep intensity</p>
            <SleepCurve sleepiness={dream.request.sleepiness} progress={Math.min(1, elapsed / (dream.request.length === "all-night" ? 90 : total))} className="h-20 w-full" height={80} />
            <div className="mt-5 space-y-3">
              {STAGES.map((s, i) => (
                <div key={s} className={`flex gap-3 transition-opacity duration-1000 ${i === stageIdx ? "opacity-100" : "opacity-40"}`}>
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: STAGE_META[s].color }} />
                  <div>
                    <p className="text-sm font-semibold">{STAGE_META[s].label}</p>
                    <p className="text-xs text-mist-400">{STAGE_META[s].detail}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3 border-t border-white/[0.06] pt-5 text-xs">
              <Level label="Music" v={curvePt?.musicLevel ?? 0} />
              <Level label="Ambience" v={curvePt?.ambienceLevel ?? 0} />
              <Level label="Narration" v={curvePt?.narrationDensity ?? 0} />
              <Level label="Intensity" v={curvePt?.intensity ?? 0} />
            </div>
          </aside>
        </div>
      </motion.div>

      {/* demo speed badge */}
      <button onClick={() => setSpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length])} className="absolute right-5 top-[calc(max(var(--safe-top),14px)+52px)] flex items-center gap-1 rounded-full bg-white/[0.06] px-2.5 py-1 text-[10px] font-semibold text-mist-300 backdrop-blur lg:right-10" title="Prototype time-lapse">
        <Gauge className="h-3 w-3" /> Demo {speed}×
      </button>

      {/* Drifting with you */}
      <AnimatePresence>
        {drift && (
          <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 2.5 }} onClick={() => setDrift(false)} className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-gradient-to-b from-[#0b0f2a] via-[#070a1d] to-[#04060f] px-10 text-center">
            <motion.div animate={{ opacity: [0.7, 1, 0.7] }} transition={{ duration: 8, repeat: Infinity }}>
              <svg viewBox="0 0 100 100" className="h-20 w-20">
                <defs>
                  <mask id="crescent">
                    <rect width="100" height="100" fill="#fff" />
                    <circle cx="62" cy="40" r="30" fill="#000" />
                  </mask>
                </defs>
                <circle cx="50" cy="50" r="30" fill="#f6e2b8" mask="url(#crescent)" />
              </svg>
            </motion.div>
            <p className="mt-10 font-display text-2xl font-light text-mist-100">Drifting with you</p>
            <svg viewBox="0 0 300 40" className="mt-6 w-64 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_25%,black_75%,transparent)]">
              <motion.path d="M0 20 Q37 4 75 20 T150 20 T225 20 T300 20 T375 20 T450 20" fill="none" stroke="#8fb6ff" strokeOpacity="0.7" strokeWidth="2" animate={{ x: [0, -150] }} transition={{ duration: 9, repeat: Infinity, ease: "linear" }} />
            </svg>
            <ol className="mt-10 space-y-5 text-left">
              {["Story continues", "Breathing slows", "Mind quiets", "You drift off"].map((l, i) => (
                <li key={l} className="flex items-center gap-4">
                  <span className={`grid h-5 w-5 place-items-center rounded-full border ${i < stageIdx ? "border-glow-300/60" : i === stageIdx ? "border-glow-300" : "border-white/20"}`}>
                    {i <= stageIdx && <span className={`h-2.5 w-2.5 rounded-full ${i === stageIdx ? "bg-glow-300" : "bg-glow-300/40"}`} />}
                  </span>
                  <span className={`text-sm ${i === stageIdx ? "text-white" : "text-mist-400"}`}>{l}</span>
                </li>
              ))}
            </ol>
            <p className="absolute bottom-[max(var(--safe-bottom),24px)] text-[11px] text-mist-500">Tap anywhere to return</p>
          </motion.button>
        )}
      </AnimatePresence>

      {/* sheets */}
      <AnimatePresence>
        {sheet && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSheet(null)} className="absolute inset-0 z-40 bg-night-950/60 backdrop-blur-sm" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 260 }} className="glass-strong absolute inset-x-0 bottom-0 z-50 mx-auto max-w-lg rounded-t-[28px] p-6 pb-[max(var(--safe-bottom),28px)]">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="font-display text-xl font-light">{sheet === "timer" ? "Sleep timer" : sheet === "sound" ? "Background soundscape" : "Dream options"}</h3>
                <button onClick={() => setSheet(null)} className="grid h-8 w-8 place-items-center rounded-full bg-white/5" aria-label="Close">
                  <X className="h-4 w-4" />
                </button>
              </div>
              {sheet === "timer" && (
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { l: "15 minutes", v: 15 },
                    { l: "30 minutes", v: 30 },
                    { l: "45 minutes", v: 45 },
                    { l: "End of chapter", v: -1 },
                  ].map((o) => (
                    <button
                      key={o.l}
                      onClick={() => {
                        setTimerEnd(o.v === -1 ? (chapter ? chapter.startMinute + chapter.durationMinutes : total) : Math.min(total, elapsed + o.v));
                        setSheet(null);
                      }}
                      className="glass rounded-2xl py-4 text-sm hover:bg-white/10"
                    >
                      {o.l}
                    </button>
                  ))}
                  <button onClick={() => (setTimerEnd(null), setSheet(null))} className="col-span-2 rounded-2xl py-3 text-sm text-mist-400">
                    Off — let the dream play out
                  </button>
                </div>
              )}
              {sheet === "sound" && (
                <div className="space-y-4">
                  <p className="text-sm text-mist-300">
                    <span className="text-white">{dream.output.soundscape.base}</span> — {sceneWorld.sounds[0]?.layers.join(" · ")}
                  </p>
                  <p className="text-xs text-mist-400">Music softens and ambience rises automatically along your sleep curve.</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setSound(true)} className={`rounded-2xl py-3.5 text-sm ${soundOn ? "chip-on" : "glass"}`}>Soundscape on</button>
                    <button onClick={() => setSound(false)} className={`rounded-2xl py-3.5 text-sm ${!soundOn ? "chip-on" : "glass"}`}>Silence</button>
                  </div>
                </div>
              )}
              {sheet === "menu" && (
                <div className="space-y-2">
                  <p className="mb-2 text-xs text-mist-400">Prototype time-lapse — so the sleep transition can be seen in a meeting.</p>
                  <div className="grid grid-cols-3 gap-2">
                    {SPEEDS.map((s) => (
                      <button key={s} onClick={() => setSpeed(s)} className={`rounded-2xl py-3 text-sm ${speed === s ? "chip-on" : "glass"}`}>
                        {s === 1 ? "Real time" : `${s}×`}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-4 gap-2 pt-2">
                    {STAGES.map((s) => (
                      <button key={s} onClick={() => setElapsed(Math.max(0, (chapters.find((c) => c.stage === s)?.startMinute ?? (s === "asleep" ? storyEnd * 0.9 : 0)) + 0.05))} className="glass rounded-xl py-2.5 text-[11px]">
                        {STAGE_META[s].label}
                      </button>
                    ))}
                  </div>
                  <button onClick={finish} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-ember-200/10 py-3.5 text-sm text-ember-200">
                    <Sunrise className="h-4 w-4" /> Skip to morning
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Util({ icon: Icon, label, on, onClick }: { icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; label: string; on?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1.5 rounded-xl py-1.5 transition ${on ? "text-glow-300" : "text-mist-300 hover:text-white"}`}>
      <Icon className="h-5 w-5" strokeWidth={1.5} />
      <span className="text-[10px]">{label}</span>
    </button>
  );
}

function Level({ label, v }: { label: string; v: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-mist-400">
        <span>{label}</span>
        <span className="tabular-nums">{Math.round(v * 100)}</span>
      </div>
      <div className="h-1 rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-dusk-400 to-glow-300 transition-all duration-1000" style={{ width: `${v * 100}%` }} />
      </div>
    </div>
  );
}
