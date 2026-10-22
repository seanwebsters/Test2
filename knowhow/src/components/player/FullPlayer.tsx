"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { CoverArt } from "@/components/art/Cover";
import { useApp } from "@/components/providers/AppState";
import {
  Bookmark, BookmarkCheck, Captions, ChevronDown, ListMusic, Loader2, Moon, Pause, Play, RotateCcw, RotateCw, SkipForward, Sparkles, Trash2, X,
} from "@/components/ui/Icon";
import { cn, fmtTime } from "@/lib/cn";
import { RATES, usePlayer, type SleepMode } from "./PlayerProvider";
import { ChallengeCard } from "./ChallengeCard";

type Tab = "captions" | "insights" | "queue";

export function FullPlayer() {
  const p = usePlayer();
  const [tab, setTab] = useState<Tab>("captions");
  const [sleepOpen, setSleepOpen] = useState(false);

  useEffect(() => {
    if (!p.expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") p.setExpanded(false);
      if (e.key === " " && (e.target as HTMLElement).tagName !== "BUTTON") {
        e.preventDefault();
        p.toggle();
      }
      if (e.key === "ArrowLeft") p.skip(-15);
      if (e.key === "ArrowRight") p.skip(15);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [p]);

  const c = p.current;
  const [bg, accent, accent2] = c?.art.palette ?? ["#111114", "#DFFF57", "#B6A1FF"];
  const pct = p.duration ? (p.position / p.duration) * 100 : 0;

  return (
    <AnimatePresence>
      {p.expanded && c && (
        <motion.div
          role="dialog"
          aria-modal
          aria-label="Now playing"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 300, damping: 34 }}
          className="fixed inset-0 z-50 overflow-y-auto bg-ink"
          style={{ paddingTop: "var(--safe-top)" }}
        >
          <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(120% 70% at 30% 0%, ${bg} 0%, ${accent}22 35%, #111114 75%)` }} />
          <div className="relative mx-auto flex min-h-full max-w-6xl flex-col px-5 pb-10 pt-3 md:px-10 md:pt-8">
            <header className="flex items-center justify-between">
              <button onClick={() => p.setExpanded(false)} className="grid h-11 w-11 place-items-center rounded-full bg-white/10 transition hover:bg-white/20" aria-label="Minimise player">
                <ChevronDown size={22} />
              </button>
              <Link href={c.seriesHref} onClick={() => p.setExpanded(false)} className="text-center">
                <div className="eyebrow">Playing from</div>
                <div className="text-sm font-semibold hover:underline">{c.seriesTitle}</div>
              </Link>
              <button onClick={() => setTab("queue")} className="grid h-11 w-11 place-items-center rounded-full bg-white/10 transition hover:bg-white/20 lg:invisible" aria-label="Queue">
                <ListMusic size={20} />
              </button>
            </header>

            <div className="mt-6 grid flex-1 gap-8 lg:mt-10 lg:grid-cols-[minmax(0,440px)_1fr] lg:gap-14">
              <div className="flex flex-col">
                <motion.div
                  animate={{ scale: p.playing ? 1 : 0.94, rotate: p.playing ? 0 : -1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  className="relative mx-auto aspect-square w-full max-w-[min(440px,78vw)] overflow-hidden rounded-[28px] shadow-[0_40px_100px_rgba(0,0,0,0.6)]"
                  style={{ boxShadow: `0 40px 120px ${accent}33` }}
                >
                  <CoverArt art={c.art} seed={c.seed} />
                  <div className="absolute inset-x-6 bottom-6">
                    <div className="display text-balance text-[clamp(22px,6.5vw,38px)]" style={{ color: c.art.palette[3] }}>{c.seriesTitle}</div>
                  </div>
                </motion.div>

                <div className="mt-7 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="eyebrow" style={{ color: accent }}>Episode {c.n}</div>
                    <h2 className="display-soft mt-1 text-2xl font-bold leading-tight md:text-[28px]">{c.title}</h2>
                  </div>
                  <button onClick={() => setTab("insights")} className="mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/10 transition hover:bg-white/20" aria-label="Save an insight">
                    <Bookmark size={19} />
                  </button>
                </div>

                {p.usingBrowserVoice && (
                  <div className="mt-3 rounded-2xl border border-lavender/30 bg-lavender/10 px-3 py-2 text-xs text-lavender">
                    Development fallback: this AI episode is read by your browser&apos;s built-in voice because no TTS provider is configured. Timings are estimated.
                  </div>
                )}

                <div className="mt-5">
                  <input
                    type="range"
                    className="scrub"
                    min={0}
                    max={Math.max(1, p.duration)}
                    step={0.5}
                    value={Math.min(p.position, p.duration)}
                    onChange={(e) => p.seek(Number(e.target.value))}
                    style={{ ["--pct" as string]: `${pct}%`, ["--fill" as string]: accent }}
                    aria-label="Seek"
                    aria-valuetext={`${fmtTime(p.position)} of ${fmtTime(p.duration)}`}
                  />
                  <div className="mt-1 flex justify-between text-xs tabular-nums text-cream-mute">
                    <span>{fmtTime(p.position)}</span>
                    <span>-{fmtTime(Math.max(0, p.duration - p.position))}</span>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <button
                    onClick={() => p.setRate(RATES[(RATES.indexOf(p.rate) + 1) % RATES.length])}
                    className="h-11 min-w-[56px] rounded-full bg-white/10 px-3 text-sm font-bold tabular-nums transition hover:bg-white/20"
                    aria-label={`Playback speed ${p.rate}×`}
                  >
                    {p.rate}×
                  </button>
                  <button onClick={() => p.skip(-15)} className="relative grid h-14 w-14 place-items-center rounded-full transition hover:bg-white/10" aria-label="Back 15 seconds">
                    <RotateCcw size={28} strokeWidth={1.8} />
                    <span className="absolute text-[9px] font-bold">15</span>
                  </button>
                  <button
                    onClick={p.toggle}
                    className="grid h-[76px] w-[76px] place-items-center rounded-full text-ink shadow-lg transition hover:scale-105 active:scale-95"
                    style={{ background: accent, boxShadow: `0 10px 40px ${accent}55` }}
                    aria-label={p.playing ? "Pause" : "Play"}
                  >
                    {p.loading ? <Loader2 size={30} className="animate-spin" /> : p.playing ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
                  </button>
                  <button onClick={() => p.skip(15)} className="relative grid h-14 w-14 place-items-center rounded-full transition hover:bg-white/10" aria-label="Forward 15 seconds">
                    <RotateCw size={28} strokeWidth={1.8} />
                    <span className="absolute text-[9px] font-bold">15</span>
                  </button>
                  <button onClick={p.next} disabled={!p.queue.length} className="grid h-11 w-14 place-items-center rounded-full bg-white/10 transition hover:bg-white/20 disabled:opacity-30" aria-label="Next episode">
                    <SkipForward size={20} />
                  </button>
                </div>

                <div className="relative mt-5 flex items-center justify-center gap-2">
                  <button onClick={() => setSleepOpen((v) => !v)} className={cn("chip h-9 transition hover:text-cream", p.sleep.mode !== "off" && "border-lavender/40 text-lavender")}>
                    <Moon size={14} /> <SleepLabel sleep={p.sleep} />
                  </button>
                  <button onClick={() => setTab("captions")} className={cn("chip h-9 lg:hidden", tab === "captions" && "text-cream")}>
                    <Captions size={14} /> Captions
                  </button>
                  <button onClick={() => setTab("queue")} className={cn("chip h-9 lg:hidden", tab === "queue" && "text-cream")}>
                    <ListMusic size={14} /> Queue {p.queue.length > 0 && `(${p.queue.length})`}
                  </button>
                  <AnimatePresence>
                    {sleepOpen && <SleepMenu onClose={() => setSleepOpen(false)} />}
                  </AnimatePresence>
                </div>
              </div>

              <div className="flex min-h-[420px] flex-col">
                {p.ended && (
                  <div className="mb-5">
                    <EndCard accent={accent} accent2={accent2} />
                  </div>
                )}
                <div className="flex gap-1 rounded-full bg-white/[0.06] p-1">
                  {(["captions", "insights", "queue"] as Tab[]).map((t) => (
                    <button key={t} onClick={() => setTab(t)} className={cn("relative flex-1 rounded-full py-2 text-sm font-semibold capitalize transition", tab === t ? "text-ink" : "text-cream-dim hover:text-cream")}>
                      {tab === t && <motion.span layoutId="ptab" className="absolute inset-0 rounded-full" style={{ background: accent }} />}
                      <span className="relative">{t === "queue" ? `Up next${p.queue.length ? ` · ${p.queue.length}` : ""}` : t}</span>
                    </button>
                  ))}
                </div>
                <div className="mt-4 flex-1">
                  {tab === "captions" && <CaptionsPanel accent={accent} />}
                  {tab === "insights" && <InsightsPanel accent={accent} />}
                  {tab === "queue" && <QueuePanel />}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SleepLabel({ sleep }: { sleep: SleepMode }) {
  const [, force] = useState(0);
  useEffect(() => {
    if (sleep.mode !== "timer") return;
    const t = setInterval(() => force((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [sleep]);
  if (sleep.mode === "off") return <>Sleep timer</>;
  if (sleep.mode === "episode") return <>End of episode</>;
  return <>{fmtTime((sleep.endsAt - Date.now()) / 1000)}</>;
}

function SleepMenu({ onClose }: { onClose: () => void }) {
  const p = usePlayer();
  const opts: { label: string; value: SleepMode }[] = [
    { label: "Off", value: { mode: "off" } },
    ...[5, 15, 30, 45, 60].map((m) => ({ label: `${m} minutes`, value: { mode: "timer", minutes: m, endsAt: 0 } as SleepMode })),
    { label: "End of episode", value: { mode: "episode" } },
  ];
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="absolute bottom-12 z-10 w-56 rounded-3xl border border-white/10 bg-ink-2 p-2 shadow-2xl">
      {opts.map((o) => (
        <button
          key={o.label}
          onClick={() => {
            p.setSleep(o.value.mode === "timer" ? { ...o.value, endsAt: Date.now() + o.value.minutes * 60000 } : o.value);
            onClose();
          }}
          className="block w-full rounded-2xl px-4 py-2.5 text-left text-sm hover:bg-white/10"
        >
          {o.label}
        </button>
      ))}
    </motion.div>
  );
}

function useSaveInsight() {
  const { api, state, toast } = useApp();
  const p = usePlayer();
  const saved = useMemo(() => new Set(state?.insights.filter((i) => i.episodeId === p.current?.id).map((i) => i.text)), [state?.insights, p.current?.id]);
  const save = async (text: string) => {
    if (!p.current) return;
    try {
      await api("/api/insights", { body: { episodeId: p.current.id, text } });
      toast({ title: "Insight saved", body: "Find it in your profile, forever.", tone: "lavender", icon: "bookmark" });
    } catch (e) {
      toast({ title: "Couldn't save", body: e instanceof Error ? e.message : undefined, tone: "coral" });
    }
  };
  return { saved, save };
}

function CaptionsPanel({ accent }: { accent: string }) {
  const p = usePlayer();
  const { saved, save } = useSaveInsight();
  const box = useRef<HTMLDivElement>(null);
  const activeIdx = p.lines.findIndex((l) => p.position >= l.t0 - 0.05 && p.position < l.t1 + 0.25);
  useEffect(() => {
    const el = box.current?.querySelector<HTMLElement>(`[data-i="${activeIdx}"]`);
    if (el && box.current) box.current.scrollTo({ top: el.offsetTop - box.current.clientHeight / 3, behavior: "smooth" });
  }, [activeIdx]);
  if (!p.lines.length) return <p className="text-sm text-cream-mute">No transcript for this episode.</p>;
  return (
    <div ref={box} className="no-scrollbar relative max-h-[52vh] overflow-y-auto pr-1 lg:max-h-[62vh]" style={{ maskImage: "linear-gradient(to bottom, transparent, black 8%, black 85%, transparent)" }}>
      <div className="space-y-1 py-6">
        {p.lines.map((l, i) => {
          const active = i === activeIdx;
          const past = p.position > l.t1;
          const isSaved = saved.has(l.text);
          return (
            <div key={i} data-i={i} className="group relative flex items-start gap-2">
              <button
                onClick={() => p.seek(l.t0)}
                className={cn(
                  "flex-1 rounded-2xl px-3 py-1.5 text-left text-[19px] font-semibold leading-snug transition-all duration-300 md:text-[22px]",
                  active ? "text-cream" : past ? "text-cream/35" : "text-cream/20 hover:text-cream/60",
                  l.kind === "hook" && "display-soft",
                  l.kind === "insight" && active && "editorial text-[24px] md:text-[28px]",
                )}
                style={active ? { textShadow: `0 0 30px ${accent}55` } : undefined}
              >
                {l.kind === "fact" && <span className="mr-2 inline-block rounded-full px-2 py-0.5 align-middle text-[10px] font-bold uppercase tracking-wider text-ink" style={{ background: accent }}>Fact</span>}
                {l.text}
              </button>
              <button
                onClick={() => save(l.text)}
                className={cn("mt-2 grid h-8 w-8 shrink-0 place-items-center rounded-full transition", isSaved ? "text-lime" : "text-cream-mute opacity-0 hover:bg-white/10 group-hover:opacity-100 focus:opacity-100", active && !isSaved && "opacity-100")}
                aria-label={isSaved ? "Saved" : "Save this line as an insight"}
              >
                {isSaved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InsightsPanel({ accent }: { accent: string }) {
  const p = usePlayer();
  const { saved, save } = useSaveInsight();
  if (!p.insights.length) return <p className="text-sm text-cream-mute">Tap the bookmark next to any caption line to save it.</p>;
  return (
    <div className="space-y-3">
      <p className="text-sm text-cream-dim">Save the facts you want to keep. They become collectible insights on your profile.</p>
      {p.insights.map((text) => {
        const isSaved = saved.has(text);
        return (
          <motion.button
            key={text}
            whileTap={{ scale: 0.98 }}
            onClick={() => !isSaved && save(text)}
            className={cn("flex w-full items-start gap-3 rounded-3xl border p-4 text-left transition", isSaved ? "border-transparent" : "border-white/10 bg-white/[0.03] hover:border-white/25")}
            style={isSaved ? { background: `${accent}18`, borderColor: `${accent}55` } : undefined}
          >
            <Sparkles size={18} className="mt-0.5 shrink-0" style={{ color: accent }} />
            <span className="flex-1 text-[15px] leading-snug">{text}</span>
            {isSaved ? <BookmarkCheck size={18} style={{ color: accent }} /> : <Bookmark size={18} className="text-cream-mute" />}
          </motion.button>
        );
      })}
    </div>
  );
}

function QueuePanel() {
  const p = usePlayer();
  if (!p.queue.length) return <p className="text-sm text-cream-mute">Your queue is empty. Add episodes from any series page.</p>;
  return (
    <ul className="space-y-2">
      {p.queue.map((q, i) => (
        <li key={q.id} className="flex items-center gap-3 rounded-2xl p-2 transition hover:bg-white/5">
          <span className="w-5 text-center text-xs tabular-nums text-cream-mute">{i + 1}</span>
          <button onClick={() => p.play(q, { queue: p.queue.slice(i + 1) })} className="flex min-w-0 flex-1 items-center gap-3 text-left">
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl">
              <CoverArt art={q.art} seed={q.seed} />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{q.title}</div>
              <div className="truncate text-xs text-cream-mute">{q.seriesTitle} · Ep {q.n} · {fmtTime(q.duration)}</div>
            </div>
          </button>
          <button onClick={() => p.removeFromQueue(q.id)} className="grid h-9 w-9 place-items-center rounded-full text-cream-mute hover:bg-white/10 hover:text-coral" aria-label={`Remove ${q.title} from queue`}>
            <Trash2 size={15} />
          </button>
        </li>
      ))}
    </ul>
  );
}

function EndCard({ accent, accent2 }: { accent: string; accent2: string }) {
  const p = usePlayer();
  const { state } = useApp();
  // Decide once, so the card stays visible after the listener answers.
  const [answered] = useState(() => (p.current ? Boolean(state?.challenges[p.current.id]) : false));
  const [countdown, setCountdown] = useState<number | null>(null);
  const showChallenge = p.challenge && !answered;
  useEffect(() => {
    if (showChallenge || !p.queue.length) return;
    setCountdown(8);
    const t = setInterval(() => setCountdown((c) => (c === null ? null : c - 1)), 1000);
    return () => clearInterval(t);
  }, [showChallenge, p.queue.length]);
  useEffect(() => {
    if (countdown === 0) p.next();
  }, [countdown, p]);
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-[28px] p-5" style={{ background: `linear-gradient(135deg, ${accent}26, ${accent2}1a)` }}>
      <div className="flex items-center justify-between">
        <div className="eyebrow" style={{ color: accent }}>Episode complete</div>
        {countdown !== null && countdown > 0 && (
          <button onClick={() => setCountdown(null)} className="flex items-center gap-1 text-xs text-cream-dim hover:text-cream">
            Next in {countdown}s <X size={12} />
          </button>
        )}
      </div>
      {showChallenge && p.current && p.challenge ? (
        <ChallengeCard episodeId={p.current.id} challenge={p.challenge} accent={accent} />
      ) : (
        <p className="mt-2 text-lg font-semibold">Nice. That&apos;s another star in your universe.</p>
      )}
      {p.queue.length > 0 && (
        <button onClick={p.next} className="btn mt-4 w-full text-ink" style={{ background: accent }}>
          <SkipForward size={16} /> Next: {p.queue[0].title}
        </button>
      )}
    </motion.div>
  );
}
