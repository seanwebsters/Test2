"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Cover } from "@/components/art/Cover";
import { useApp } from "@/components/providers/AppState";
import { usePlayer, type PlayItem } from "@/components/player/PlayerProvider";
import { estimateLines } from "@/components/player/browser-voice";
import { ArrowRight, Check, ChevronLeft, Pause, Play, Sparkles, Wand2 } from "@/components/ui/Icon";
import { CATEGORY_BY_ID } from "@/content/categories";
import type { AiSeriesRecord } from "@/lib/model";
import { cn, fmtTime } from "@/lib/cn";

type View = Omit<AiSeriesRecord, "episodes"> & { episodes: (Omit<AiSeriesRecord["episodes"][number], "challenge"> & { challenge?: { question: string; options: string[] } })[] };

export function AiSeriesView({ id }: { id: string }) {
  const { api, state } = useApp();
  const p = usePlayer();
  const [s, setS] = useState<View | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api<View>(`/api/ai/series/${id}`).then(setS).catch((e) => setErr(e.message));
  }, [id, api]);

  if (err) return <div className="p-10 text-coral">{err} <Link href="/listen" className="underline">Back to library</Link></div>;
  if (!s) return <div className="p-4 md:p-10"><div className="skeleton h-72" /><div className="skeleton mt-6 h-40" /></div>;

  const items: PlayItem[] = s.episodes.map((e) => {
    const lines = e.audio?.lines ?? estimateLines(e.segments);
    return {
      id: e.id, kind: "ai", title: e.title, n: e.n, seriesTitle: s.title, seriesHref: `/ai/${s.id}`, art: s.art, seed: s.id,
      duration: e.audio?.duration ?? (lines.at(-1)?.t1 ?? 60), lines, segments: e.segments, insights: e.insights, challenge: e.challenge ?? null, audio: Boolean(e.audio),
    };
  });
  const cat = CATEGORY_BY_ID[s.category];
  const accent = s.art.palette[1];

  return (
    <div className="pb-safe-nav px-4 pt-[calc(14px+var(--safe-top))] md:px-10 md:pt-8">
      <Link href="/listen" className="inline-grid h-10 w-10 place-items-center rounded-full bg-white/10" aria-label="Back"><ChevronLeft size={20} /></Link>
      <div className="mt-6 grid gap-8 md:grid-cols-[320px_1fr] md:items-end">
        <Cover art={s.art} seed={s.id} title={s.title} label={s.mode === "demo" ? "KNOWHOW Sample" : "Made for you"} className="aspect-square w-full max-w-[320px] rounded-[28px]" />
        <div>
          <div className="flex flex-wrap gap-2">
            <span className={cn("chip border-transparent", s.mode === "demo" ? "bg-white/10 text-cream" : "bg-lavender text-ink")}><Wand2 size={12} /> {s.mode === "demo" ? "Sample series" : "AI-generated"}</span>
            <span className="chip" style={{ color: cat.color }}>{cat.label}</span>
            <span className="chip capitalize">{s.difficulty}</span>
          </div>
          <h1 className="display mt-4 text-[40px] md:text-[64px]">{s.title}</h1>
          <p className="editorial mt-2 text-2xl text-cream">{s.tagline}</p>
          <p className="mt-3 max-w-xl text-cream-dim">{s.description}</p>
          <p className="mt-3 text-sm text-cream-mute">You asked: &ldquo;{s.prompt}&rdquo;</p>
          <div className="mt-4 rounded-2xl bg-white/[0.04] p-3 text-xs leading-relaxed text-cream-dim">
            {s.mode === "demo"
              ? "Demo mode: this sample was written in advance by the KNOWHOW team and narrated with Kokoro TTS. It was not generated from your prompt."
              : `Written by ${s.model ?? "Claude"}. ${s.ttsProvider ? `Narrated with ${s.ttsProvider}.` : "No TTS provider was configured, so episodes are read by your browser's voice (development fallback)."} AI can make mistakes — check anything important.`}
          </div>
          <button onClick={() => p.play(items[0], { queue: items.slice(1) })} className="btn mt-6 h-14 px-7 text-ink" style={{ background: accent }}>
            <Play size={20} fill="currentColor" /> Play series
          </button>
        </div>
      </div>

      <ol className="mt-10 max-w-3xl divide-y divide-white/[0.06]">
        {items.map((it, i) => {
          const e = s.episodes[i];
          const pr = state?.progress[it.id];
          const current = p.current?.id === it.id;
          return (
            <li key={it.id} className="flex gap-4 py-4">
              <button onClick={() => (current ? p.toggle() : p.play(it, { queue: items.slice(i + 1) }))} className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-ink" style={{ background: pr?.completed ? accent : "#26262D", color: pr?.completed ? "#111114" : accent }} aria-label={`Play ${it.title}`}>
                {pr?.completed ? <Check size={22} strokeWidth={3} /> : current && p.playing ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}
              </button>
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{it.n}. {it.title}</div>
                <p className="mt-1 text-sm text-cream-dim">{e.description}</p>
                <div className="mt-1 text-xs text-cream-mute">{fmtTime(it.duration)} {!it.audio && "· browser voice"}</div>
              </div>
            </li>
          );
        })}
      </ol>

      <section className="mt-10 max-w-3xl rounded-[28px] bg-ink-2 p-5">
        <div className="flex items-center gap-2 font-bold"><Sparkles size={16} className="text-lavender" /> Where to next</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {s.followUps.map((f) => (
            <Link key={f} href={`/make?prompt=${encodeURIComponent(f)}`} className="flex items-center gap-1.5 rounded-full border border-white/10 px-4 py-2 text-sm hover:border-white/30">{f} <ArrowRight size={14} /></Link>
          ))}
        </div>
      </section>
    </div>
  );
}
