"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Cover } from "@/components/art/Cover";
import { useApp } from "@/components/providers/AppState";
import { useCatalog } from "@/components/providers/CatalogProvider";
import { usePlaySeries } from "@/components/catalog/Tiles";
import { UniverseGraph } from "@/components/universe/UniverseGraph";
import { ArrowRight, Check, Play } from "@/components/ui/Icon";
import { CATEGORIES, CATEGORY_BY_ID } from "@/content/categories";
import { buildUniverse } from "@/lib/universe";
import type { CategoryId, Series } from "@/lib/types";
import type { LearnStyle } from "@/lib/model";
import { cn } from "@/lib/cn";

const STYLES: { id: LearnStyle; title: string; blurb: string; emoji: string; color: string }[] = [
  { id: "quick", title: "5-minute quick hits", blurb: "Snackable. One idea, one episode, done before the kettle boils.", emoji: "⚡", color: "#DFFF57" },
  { id: "deep", title: "Deep dives", blurb: "Long arcs and big stories. Give me the whole saga.", emoji: "🌊", color: "#587BFF" },
  { id: "mix", title: "A bit of everything", blurb: "Surprise me. Quick hits on the bus, sagas on the weekend.", emoji: "🎲", color: "#FF92C7" },
];

export function Onboarding() {
  const router = useRouter();
  const { api, state } = useApp();
  const { series } = useCatalog();
  const play = usePlaySeries();
  const [step, setStep] = useState(0);
  const [interests, setInterests] = useState<CategoryId[]>([]);
  const [style, setStyle] = useState<LearnStyle | null>(null);
  const [busy, setBusy] = useState(false);

  const universe = useMemo(() => buildUniverse(series, [], interests), [series, interests]);
  const starters = useMemo(() => pickStarters(series, interests, style ?? "mix"), [series, interests, style]);

  const finish = async (thenPlay?: Series) => {
    setBusy(true);
    try {
      await api("/api/onboarding", { body: { interests, learnStyle: style ?? "mix" } });
    } finally {
      setBusy(false);
    }
    router.replace("/");
    if (thenPlay) play(thenPlay);
  };

  const steps = 5;
  const next = () => setStep((s) => Math.min(steps - 1, s + 1));

  return (
    <div className="relative min-h-[100svh] overflow-hidden bg-ink">
      <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-5 pt-[calc(16px+var(--safe-top))] md:px-10 md:pt-8">
        <div className="flex gap-1.5" aria-label={`Step ${step + 1} of ${steps}`}>
          {Array.from({ length: steps }, (_, i) => (
            <motion.span key={i} animate={{ width: i === step ? 28 : 8, backgroundColor: i <= step ? "#DFFF57" : "rgba(247,244,233,0.2)" }} className="h-2 rounded-full" />
          ))}
        </div>
        <button onClick={() => finish()} disabled={busy || !state} className="text-sm font-semibold text-cream-dim hover:text-cream">Skip</button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
          className="mx-auto flex min-h-[100svh] max-w-5xl flex-col px-5 pb-[calc(24px+var(--safe-bottom))] pt-24 md:px-10"
        >
          {step === 0 && <Intro series={series} onNext={next} />}

          {step === 1 && (
            <>
              <h1 className="display text-[40px] md:text-[72px]">What&apos;s your brain <span className="text-lime">into?</span></h1>
              <p className="editorial mt-2 text-2xl text-cream-dim">Pick as many as you like.</p>
              <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
                {CATEGORIES.map((c, i) => {
                  const on = interests.includes(c.id);
                  return (
                    <motion.button
                      key={c.id}
                      initial={{ opacity: 0, y: 20, rotate: i % 2 ? 2 : -2 }}
                      animate={{ opacity: 1, y: 0, rotate: on ? (i % 2 ? -2 : 2) : 0, scale: on ? 1.03 : 1 }}
                      transition={{ delay: i * 0.035, type: "spring", stiffness: 300, damping: 20 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setInterests((x) => (on ? x.filter((y) => y !== c.id) : [...x, c.id]))}
                      aria-pressed={on}
                      className={cn("relative flex aspect-[4/5] flex-col justify-between overflow-hidden rounded-3xl p-4 text-left transition-shadow", on ? "text-ink" : "border border-white/10 bg-ink-2 text-cream")}
                      style={on ? { background: `linear-gradient(150deg, ${c.color}, ${c.color2})`, boxShadow: `0 16px 50px ${c.color}55` } : undefined}
                    >
                      <span className="text-[44px] font-black leading-none md:text-[52px]" style={{ color: on ? c.deep : c.color }}>{c.glyph}</span>
                      <span>
                        <span className="display block text-[17px] md:text-[18px]">{c.label}</span>
                        <span className={cn("mt-1 block text-xs leading-snug", on ? "text-ink/70" : "text-cream-mute")}>{c.blurb}</span>
                      </span>
                      {on && <span className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-ink text-lime"><Check size={15} /></span>}
                    </motion.button>
                  );
                })}
              </div>
              <div className="mt-auto pt-8">
                <button onClick={next} className="btn-lime h-14 w-full text-base md:w-auto md:px-10">{interests.length ? `Lock in ${interests.length}` : "Surprise me"} <ArrowRight size={18} /></button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h1 className="display text-[40px] md:text-[72px]">How do you like to <span className="text-lime">learn?</span></h1>
              <div className="mt-10 grid gap-3 md:grid-cols-3">
                {STYLES.map((s, i) => (
                  <motion.button
                    key={s.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => { setStyle(s.id); setTimeout(next, 250); }}
                    aria-pressed={style === s.id}
                    className={cn("flex items-center gap-4 rounded-[28px] border p-5 text-left transition md:flex-col md:items-start md:p-7", style === s.id ? "border-transparent text-ink" : "border-white/10 bg-ink-2 hover:border-white/25")}
                    style={style === s.id ? { background: s.color } : undefined}
                  >
                    <span className="text-4xl md:text-6xl">{s.emoji}</span>
                    <span>
                      <span className="display-soft block text-xl font-bold md:text-2xl">{s.title}</span>
                      <span className={cn("mt-1 block text-sm", style === s.id ? "text-ink/70" : "text-cream-dim")}>{s.blurb}</span>
                    </span>
                  </motion.button>
                ))}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h1 className="display text-[40px] md:text-[72px]">Your brain, <span className="text-lime">but bigger.</span></h1>
              <p className="mt-3 max-w-lg text-cream-dim">This is your knowledge universe. Every episode you finish lights up a star. The dim ones are waiting{interests.length ? ` — starting with ${interests.map((i) => CATEGORY_BY_ID[i].label).slice(0, 3).join(", ")}` : ""}.</p>
              <motion.div initial={{ scale: 0.6, opacity: 0, rotate: -20 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 60, damping: 14 }} className="relative -mx-5 mt-4 h-[52vh] min-h-[320px] md:mx-0">
                <UniverseGraph universe={universe} compact className="absolute inset-0" />
              </motion.div>
              <div className="mt-auto pt-4">
                <button onClick={next} className="btn-lime h-14 w-full text-base md:w-auto md:px-10">Show me where to start <ArrowRight size={18} /></button>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <h1 className="display text-[48px] md:text-[88px]">Press <span className="text-lime">play.</span></h1>
              <p className="editorial mt-2 text-2xl text-cream-dim">Three series we think you&apos;ll binge.</p>
              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {starters.map((s, i) => (
                  <motion.div key={s.slug} initial={{ opacity: 0, y: 30, rotate: (i - 1) * 3 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ delay: 0.1 + i * 0.1, type: "spring", stiffness: 200, damping: 20 }} className="flex items-center gap-4 md:flex-col md:items-stretch">
                    <Cover art={s.art} seed={s.slug} title={s.title} className="aspect-square w-28 shrink-0 rounded-2xl md:w-full md:rounded-3xl" label={null} />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold uppercase tracking-wider" style={{ color: CATEGORY_BY_ID[s.category].color }}>{CATEGORY_BY_ID[s.category].label}</div>
                      <div className="mt-1 text-lg font-bold leading-tight">{s.title}</div>
                      <p className="mt-1 line-clamp-2 text-sm text-cream-dim">{s.tagline}</p>
                      <button onClick={() => finish(s)} disabled={busy} className="btn-lime mt-3 h-10 px-4"><Play size={14} fill="currentColor" /> Play</button>
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="mt-auto pt-8">
                <button onClick={() => finish()} disabled={busy} className="btn-ghost h-14 w-full text-base md:w-auto md:px-10">Take me home <ArrowRight size={18} /></button>
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Intro({ series, onNext }: { series: Series[]; onNext: () => void }) {
  const wall = series.slice(0, 12);
  return (
    <>
      <div className="pointer-events-none absolute inset-0 -z-0 overflow-hidden opacity-50" aria-hidden>
        <div className="absolute -left-20 top-16 flex w-[200%] animate-marquee gap-3">
          {[...wall, ...wall].map((s, i) => <Cover key={i} art={s.art} seed={s.slug} title={s.title} label={null} className="aspect-square w-36 shrink-0 rounded-2xl md:w-52" />)}
        </div>
        <div className="absolute -left-20 top-[220px] flex w-[200%] animate-marquee gap-3 md:top-[300px]" style={{ animationDirection: "reverse", animationDuration: "40s" }}>
          {[...wall.slice(6), ...wall.slice(0, 6), ...wall].map((s, i) => <Cover key={i} art={s.art} seed={s.slug} title={s.title} label={null} className="aspect-square w-36 shrink-0 rounded-2xl md:w-52" />)}
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-ink/40 via-ink/70 to-ink" />
      </div>
      <div className="relative mt-auto">
        <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="display text-[64px] leading-[0.85] sm:text-[96px] md:text-[140px]">
          Get<br /><span className="text-lime">inter&shy;esting.</span>
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="editorial mt-5 max-w-md text-[26px] leading-tight text-cream md:text-[32px]">
          Your next obsession might teach you something.
        </motion.p>
        <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} onClick={onNext} className="btn-lime mt-10 h-14 w-full text-base md:w-auto md:px-10">
          Let&apos;s go <ArrowRight size={18} />
        </motion.button>
      </div>
    </>
  );
}

function pickStarters(series: Series[], interests: CategoryId[], style: LearnStyle): Series[] {
  const pool = interests.length ? series.filter((s) => interests.includes(s.category)) : series;
  const scored = [...pool].sort((a, b) => {
    const fa = (style === "mix" ? 0 : Number(a.format === style)) + (a.trending ? 1 / a.trending : 0) + a.rating / 10;
    const fb = (style === "mix" ? 0 : Number(b.format === style)) + (b.trending ? 1 / b.trending : 0) + b.rating / 10;
    return fb - fa;
  });
  const picked: Series[] = [];
  const cats = new Set<string>();
  for (const s of scored) if (!cats.has(s.category) && picked.length < 3) { picked.push(s); cats.add(s.category); }
  for (const s of scored) if (picked.length < 3 && !picked.includes(s)) picked.push(s);
  return picked;
}
