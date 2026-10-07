"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowDown, ArrowRight, AudioLines, BookOpen, Building2, Clapperboard, Cpu, Gamepad2, Mic2, Moon, Music, Radio, ShieldCheck, Sparkles, Trophy, Tv, Users } from "lucide-react";
import { worldById } from "@/lib/data/worlds";
import { partners } from "@/lib/data/partners";
import { DREAM_ENGINE_SYSTEM_PROMPT } from "@/lib/engine/systemPrompt";
import { WorldArt } from "@/components/art/WorldArt";
import { CalmMark } from "@/components/ui/CalmMark";
import { SleepCurve, STAGE_META } from "@/components/player/SleepCurve";

const reveal = { initial: { opacity: 0, y: 30 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-80px" }, transition: { duration: 1, ease: [0.22, 1, 0.36, 1] as const } };

const PHASES = [
  {
    n: "01",
    name: "Dream It",
    when: "Buildable now",
    body: "Describe an idea. AI tells you a personalised bedtime story. Audio-first, built on Calm's sleep expertise.",
    points: ["Text-to-dream generation", "Sleep-curve narration", "Calm Original worlds"],
    world: "glasshouse-gardens",
  },
  {
    n: "02",
    name: "Build Worlds",
    when: "Persistent universes",
    body: "Characters and stories persist. Creators publish Dreams. New worlds and characters drop weekly. Stories continue across nights.",
    points: ["Continuity memory", "Creator publishing", "Weekly live-service drops"],
    world: "moonlit-academy",
  },
  {
    n: "03",
    name: "Dream Anything",
    when: "Official licensed IP",
    body: "Entertainment companies bring their worlds. Users mix permitted characters and dream inside the stories they love.",
    points: ["Movies · TV · Games", "Music · Sport · Live", "Rights-aware generation"],
    world: "starlight-armada",
  },
];

const VERTICALS = [
  { icon: Clapperboard, label: "Movies" },
  { icon: Tv, label: "TV" },
  { icon: Gamepad2, label: "Games" },
  { icon: Music, label: "Music" },
  { icon: Trophy, label: "Sport" },
  { icon: Users, label: "Creators" },
  { icon: Mic2, label: "Live" },
];

const CONFIG = [
  ["Partner", "Contract, credit, visual guidelines, default rules"],
  ["IPWorld", "Lore, locations, sounds, visual style, content restrictions"],
  ["Character", "Personality, speaking style, relationships, allowed interactions, brand safety"],
  ["Voice", "Approved voices per character and narrator"],
  ["LoreDocument", "Versioned canon the model must never contradict"],
  ["UsageRules", "Allowed tones, restricted themes, story restrictions, publishing rights"],
  ["CrossoverPermissions", "Which worlds and partners may meet, and which may not"],
];

export default function PitchPage() {
  const [showPrompt, setShowPrompt] = useState(false);
  const sea = worldById("endless-seas")!;

  return (
    <div className="overflow-x-hidden bg-night-950">
      {/* 1. Title */}
      <section className="relative grid h-[100svh] min-h-[640px] place-items-center overflow-hidden text-center">
        <WorldArt scene={sea.visualStyle.scene} palette={sea.visualStyle.palette} seed="pitch" detail="hero" className="absolute inset-0 animate-pan" />
        <div className="grain absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-b from-night-950/70 via-night-950/40 to-night-950" />
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.6 }} className="relative px-6">
          <CalmMark className="text-5xl lg:text-6xl" />
          <h1 className="mt-4 font-display text-[64px] font-light leading-[0.95] tracking-tight lg:text-[140px]">
            <span className="text-gradient">Dream Worlds</span>
          </h1>
          <p className="mt-6 text-lg text-mist-200 lg:text-2xl">Pick a world. Pick your characters. AI tells you the story.</p>
          <p className="mx-auto mt-3 max-w-lg text-sm text-mist-400">Netflix for personalised dream worlds — powered by AI, built for sleep.</p>
        </motion.div>
        <ArrowDown className="absolute bottom-8 h-5 w-5 animate-bounce text-mist-400" />
      </section>

      {/* 2. Thesis */}
      <section className="mx-auto max-w-5xl px-6 py-24 lg:py-40">
        <motion.p {...reveal} className="eyebrow mb-6">The thesis</motion.p>
        <motion.h2 {...reveal} className="font-display text-4xl font-light leading-[1.1] lg:text-7xl">
          Calm <span className="text-mist-500">×</span> Netflix <span className="text-mist-500">×</span> Spotify <span className="text-mist-500">×</span> interactive fandom.
        </motion.h2>
        <motion.p {...reveal} className="mt-8 max-w-2xl text-lg leading-relaxed text-mist-300">
          Every streaming product is designed to keep you awake. Dream Worlds is the first entertainment platform designed to help you fall asleep — inside the worlds and characters you already love.
        </motion.p>
        <div className="mt-14 grid gap-3 sm:grid-cols-4">
          {["Pick a world", "Pick your characters", "Pick the kind of dream", "AI tells you the story"].map((s, i) => (
            <motion.div key={s} {...reveal} transition={{ ...reveal.transition, delay: i * 0.1 }} className="glass rounded-3xl p-5">
              <p className="font-display text-mist-500">0{i + 1}</p>
              <p className="mt-6 text-lg text-white">{s}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 3. Sleep curve */}
      <section className="border-y border-white/[0.06] bg-night-900/50">
        <div className="mx-auto max-w-5xl px-6 py-24 lg:py-32">
          <motion.p {...reveal} className="eyebrow mb-6">The difference</motion.p>
          <motion.h2 {...reveal} className="font-display text-4xl font-light leading-tight lg:text-6xl">The story gets slower, quieter and softer as you fall asleep.</motion.h2>
          <motion.div {...reveal} className="glass mt-12 rounded-3xl p-6 lg:p-10">
            <SleepCurve sleepiness="relaxed" className="h-32 w-full lg:h-44" height={120} />
            <div className="mt-6 grid gap-6 sm:grid-cols-4">
              {(["awake", "drifting", "sleepy", "asleep"] as const).map((s) => (
                <div key={s}>
                  <p className="flex items-center gap-2 text-sm font-semibold"><span className="h-2 w-2 rounded-full" style={{ background: STAGE_META[s].color }} /> {STAGE_META[s].label}</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-mist-400">{STAGE_META[s].detail}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* 4. Roadmap */}
      <section className="mx-auto max-w-[1300px] px-6 py-24 lg:py-40">
        <motion.p {...reveal} className="eyebrow mb-6">Product evolution</motion.p>
        <motion.h2 {...reveal} className="font-display text-4xl font-light lg:text-6xl">Three phases.</motion.h2>
        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {PHASES.map((p, i) => {
            const w = worldById(p.world)!;
            return (
              <motion.div key={p.n} {...reveal} transition={{ ...reveal.transition, delay: i * 0.15 }} className="group relative overflow-hidden rounded-[32px] ring-1 ring-white/10">
                <div className="relative h-56">
                  <WorldArt scene={w.visualStyle.scene} palette={w.visualStyle.palette} seed={`phase-${p.n}`} className="absolute inset-0 transition-transform duration-[2000ms] group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-night-900 to-transparent" />
                  <span className="absolute left-6 top-5 font-display text-6xl font-light text-white/80">{p.n}</span>
                </div>
                <div className="bg-night-900 p-6 pt-2">
                  <p className="eyebrow text-ember-200/90">Phase {i + 1} · {p.when}</p>
                  <h3 className="mt-2 font-display text-3xl font-light">{p.name}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-mist-300">{p.body}</p>
                  <ul className="mt-5 space-y-2">
                    {p.points.map((x) => (
                      <li key={x} className="flex items-center gap-2 text-sm text-mist-200"><Sparkles className="h-3.5 w-3.5 text-dusk-400" /> {x}</li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            );
          })}
        </div>
        <motion.div {...reveal} className="mt-10 flex flex-wrap justify-center gap-3">
          {VERTICALS.map((v) => (
            <span key={v.label} className="glass flex items-center gap-2 rounded-full px-4 py-2 text-sm text-mist-200"><v.icon className="h-4 w-4 text-glow-300" /> {v.label}</span>
          ))}
        </motion.div>
      </section>

      {/* 5. Platform */}
      <section className="border-y border-white/[0.06] bg-night-900/50">
        <div className="mx-auto max-w-[1300px] px-6 py-24 lg:py-32">
          <motion.p {...reveal} className="eyebrow mb-6">The platform</motion.p>
          <motion.h2 {...reveal} className="font-display text-4xl font-light lg:text-6xl">Official IP in. Personalised dreams out.</motion.h2>
          <motion.div {...reveal} className="mt-14 grid items-stretch gap-3 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr]">
            {[
              { icon: Building2, t: "Official IP", d: "Studios, publishers, leagues and creators configure worlds, characters, voices and rules." },
              { icon: Cpu, t: "Dream Engine", d: "An LLM grounded in canon lore and character sheets, constrained by rights rules and the sleep curve." },
              { icon: Moon, t: "Personalised Dream", d: "Narration, dialogue, soundscape and visuals that slow down as you drift off — and remember tomorrow." },
              { icon: Users, t: "Consumer", d: "A nightly ritual inside the worlds you love. Subscriptions, premium worlds, creator revenue share." },
            ].flatMap((b, i, arr) => {
              const card = (
                <div key={b.t} className={`rounded-3xl p-6 ${i === 1 ? "chip-on" : "glass"}`}>
                  <b.icon className={`h-6 w-6 ${i === 1 ? "text-night-900" : "text-glow-300"}`} />
                  <p className={`mt-6 font-display text-2xl font-light ${i === 1 ? "text-night-900" : "text-white"}`}>{b.t}</p>
                  <p className={`mt-2 text-sm leading-relaxed ${i === 1 ? "text-night-800" : "text-mist-400"}`}>{b.d}</p>
                </div>
              );
              return i < arr.length - 1 ? [card, <ArrowRight key={`a${i}`} className="mx-auto h-5 w-5 rotate-90 self-center text-mist-500 lg:rotate-0" />] : [card];
            })}
          </motion.div>

          <div className="mt-16 grid gap-8 lg:grid-cols-2">
            <motion.div {...reveal}>
              <h3 className="flex items-center gap-2 font-display text-2xl font-light"><ShieldCheck className="h-5 w-5 text-ember-200" /> What a rights holder controls</h3>
              <div className="mt-5 divide-y divide-white/[0.06] rounded-3xl border border-white/[0.06]">
                {CONFIG.map(([k, v]) => (
                  <div key={k} className="flex gap-4 p-4">
                    <code className="w-44 shrink-0 font-mono text-xs text-dusk-400">{k}</code>
                    <p className="text-sm text-mist-300">{v}</p>
                  </div>
                ))}
              </div>
            </motion.div>
            <motion.div {...reveal}>
              <h3 className="font-display text-2xl font-light">Demo partners in this prototype</h3>
              <div className="mt-5 grid gap-2">
                {partners.map((p) => (
                  <div key={p.id} className="glass flex items-center justify-between rounded-2xl p-4">
                    <div>
                      <p className="text-sm font-medium text-white">{p.name}</p>
                      <p className="text-xs text-mist-400">{p.tier.replace("-", " ")} · {p.crossover.crossoverAllowed ? (p.crossover.allowedPartners === "*" ? "open crossovers" : "selective crossovers") : "no crossovers"}</p>
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-mist-500">{p.contractRef}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-mist-500">All partners, worlds and characters are fictional. Real licensed IP plugs into the same data model.</p>
            </motion.div>
          </div>

          <motion.div {...reveal} className="mt-16">
            <button onClick={() => setShowPrompt(!showPrompt)} className="flex items-center gap-2 text-sm text-glow-300">
              <BookOpen className="h-4 w-4" /> {showPrompt ? "Hide" : "Read"} the Dream Engine system prompt
            </button>
            {showPrompt && <pre className="mt-4 max-h-[480px] overflow-auto whitespace-pre-wrap rounded-3xl border border-white/[0.06] bg-night-950 p-6 font-mono text-xs leading-relaxed text-mist-300">{DREAM_ENGINE_SYSTEM_PROMPT}</pre>}
          </motion.div>
        </div>
      </section>

      {/* 6. Live service */}
      <section className="mx-auto max-w-5xl px-6 py-24 lg:py-40">
        <motion.p {...reveal} className="eyebrow mb-6">A live-service entertainment product</motion.p>
        <motion.h2 {...reveal} className="font-display text-4xl font-light leading-tight lg:text-6xl">Something new to dream about, every week.</motion.h2>
        <motion.div {...reveal} className="mt-12 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { v: "2", l: "New worlds", i: Sparkles },
            { v: "6", l: "New characters", i: Users },
            { v: "3", l: "New story styles", i: BookOpen },
            { v: "4", l: "New voices", i: AudioLines },
          ].map((s) => (
            <div key={s.l} className="glass rounded-3xl p-6">
              <s.i className="h-5 w-5 text-glow-300" />
              <p className="mt-6 font-display text-5xl font-light">{s.v}</p>
              <p className="mt-1 text-sm text-mist-400">{s.l}</p>
            </div>
          ))}
        </motion.div>
        <motion.p {...reveal} className="mt-8 flex items-center gap-2 text-sm text-mist-400"><Radio className="h-4 w-4" /> The business compounds as new IP, characters and worlds enter the platform.</motion.p>
      </section>

      {/* 7. Vision */}
      <section className="relative grid h-[90svh] min-h-[560px] place-items-center overflow-hidden text-center">
        <WorldArt scene="space" palette={worldById("starlight-armada")!.visualStyle.palette} seed="vision" detail="hero" className="absolute inset-0 animate-pan" />
        <div className="absolute inset-0 bg-gradient-to-b from-night-950 via-night-950/40 to-night-950" />
        <motion.div {...reveal} className="relative px-6">
          <p className="eyebrow mb-6">The final vision</p>
          <h2 className="font-display text-5xl font-light leading-[1.05] lg:text-[110px]">
            Dream inside the <span className="italic text-gradient">worlds you love.</span>
          </h2>
          <Link href="/" className="btn-dream mt-12 inline-flex items-center gap-2 rounded-full px-8 py-4 text-sm font-semibold">
            Enter the prototype <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </section>
    </div>
  );
}
