"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Cover, CoverArt } from "@/components/art/Cover";
import { useApp } from "@/components/providers/AppState";
import { useCatalog } from "@/components/providers/CatalogProvider";
import { usePlayer } from "@/components/player/PlayerProvider";
import { catalogItem, firstPlayable, seriesQueue } from "@/components/player/items";
import { ChevronRight, Lock, Pause, Play, TrendingUp } from "@/components/ui/Icon";
import { CATEGORY_BY_ID } from "@/content/categories";
import type { EpisodeMeta, Series } from "@/lib/types";
import { cn, fmtTime } from "@/lib/cn";

export function Rail({ title, accent, kicker, href, children }: { title: ReactNode; accent?: string; kicker?: string; href?: string; children: ReactNode }) {
  return (
    <section className="mt-10 px-4 md:mt-14 md:px-10">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          {kicker && <div className="eyebrow mb-1.5">{kicker}</div>}
          <h2 className="text-[22px] font-bold leading-none tracking-tight md:text-[28px]">
            {title}
            {accent && <span className="editorial ml-1.5 text-[1.12em] text-lime">{accent}</span>}
          </h2>
        </div>
        {href && (
          <Link href={href} className="flex shrink-0 items-center gap-0.5 text-sm font-semibold text-cream-dim hover:text-cream">
            See all <ChevronRight size={16} />
          </Link>
        )}
      </div>
      <div className="rail">{children}</div>
    </section>
  );
}

export function usePlaySeries() {
  const p = usePlayer();
  const { state } = useApp();
  return (s: Series, ep?: EpisodeMeta) => {
    const target = ep ?? firstPlayable(s, state?.progress);
    if (!target) return;
    void p.play(catalogItem(s, target), { queue: seriesQueue(s, target) });
  };
}

export function SeriesTile({ series, size = "md", rank }: { series: Series; size?: "sm" | "md" | "lg"; rank?: number }) {
  const play = usePlaySeries();
  const { state } = useApp();
  const done = series.episodes.filter((e) => state?.progress[e.id]?.completed).length;
  const released = series.episodes.filter((e) => e.status === "released").length;
  const w = size === "lg" ? "w-[240px] md:w-[280px]" : size === "sm" ? "w-[132px] md:w-[156px]" : "w-[168px] md:w-[200px]";
  return (
    <div className={cn("group relative shrink-0", w, rank && "pl-8 md:pl-10")}>
      {rank && (
        <span className="display pointer-events-none absolute -left-1 bottom-12 z-0 text-[96px] leading-none text-transparent md:text-[120px]" style={{ WebkitTextStroke: "2px rgba(247,244,233,0.35)" }} aria-hidden>
          {rank}
        </span>
      )}
      <div className="relative z-10">
        <Link href={`/series/${series.slug}`} className="block">
          <motion.div whileHover={{ y: -4 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}>
            <Cover art={series.art} seed={series.slug} title={series.title} className="aspect-square w-full shadow-[0_16px_40px_rgba(0,0,0,0.45)] transition-shadow group-hover:shadow-[0_24px_60px_rgba(0,0,0,0.6)]" label={size === "sm" ? null : undefined} />
          </motion.div>
        </Link>
        <button
          onClick={() => play(series)}
          className="absolute -bottom-1 right-2.5 hidden h-11 w-11 place-items-center rounded-full bg-lime text-ink opacity-0 shadow-xl transition duration-200 group-hover:-translate-y-4 group-hover:opacity-100 focus-visible:opacity-100 md:grid"
          aria-label={`Play ${series.title}`}
        >
          <Play size={18} fill="currentColor" className="ml-0.5" />
        </button>
      </div>
      <div className="relative z-10 mt-2.5">
        <div className="truncate text-[15px] font-semibold">{series.title}</div>
        <div className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-cream-mute">
          <span style={{ color: CATEGORY_BY_ID[series.category].color }}>{CATEGORY_BY_ID[series.category].label}</span>
          <span>·</span>
          <span>{series.episodes.length} eps</span>
          {done > 0 && <span className="text-lime">· {done}/{released} done</span>}
        </div>
      </div>
    </div>
  );
}

export function EpisodeTile({ series, ep, note }: { series: Series; ep: EpisodeMeta; note?: string }) {
  const play = usePlaySeries();
  const p = usePlayer();
  const { state } = useApp();
  const prog = state?.progress[ep.id];
  const pct = prog ? Math.min(100, (prog.position / (ep.duration ?? 1)) * 100) : 0;
  const isCurrent = p.current?.id === ep.id;
  const locked = ep.n > series.freeEpisodes && !state?.plus && !state?.unlocked.includes(ep.id);
  return (
    <div className="group w-[280px] shrink-0 md:w-[320px]">
      <button onClick={() => (isCurrent ? p.toggle() : play(series, ep))} className="flex w-full items-center gap-3 rounded-3xl bg-ink-2 p-2.5 pr-4 text-left transition hover:bg-ink-3" aria-label={`Play ${ep.title}`}>
        <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-2xl">
          <CoverArt art={series.art} seed={series.slug} />
          <div className="absolute inset-0 grid place-items-center bg-black/30 opacity-0 transition group-hover:opacity-100">
            {isCurrent && p.playing ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}
          </div>
          {pct > 0 && (
            <div className="absolute inset-x-1.5 bottom-1.5 h-1 overflow-hidden rounded-full bg-black/40">
              <div className="h-full bg-lime" style={{ width: `${pct}%` }} />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[11px] font-semibold uppercase tracking-wider" style={{ color: series.art.palette[1] === "#111114" ? "#F7F4E9" : series.art.palette[1] }}>{series.title}</div>
          <div className="mt-0.5 line-clamp-2 text-[15px] font-semibold leading-tight">{ep.title}</div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-cream-mute">
            {locked && <Lock size={11} />}
            {note ?? (prog && !prog.completed ? `${fmtTime((ep.duration ?? 0) - prog.position)} left` : `${fmtTime(ep.duration ?? ep.minutes * 60)}`)}
          </div>
        </div>
      </button>
    </div>
  );
}

export function WideSeriesCard({ series }: { series: Series }) {
  const play = usePlaySeries();
  return (
    <div className="group relative w-[300px] shrink-0 md:w-[420px]">
      <Link href={`/series/${series.slug}`} className="block">
        <Cover art={series.art} seed={series.slug} className="aspect-[16/10] w-full rounded-3xl" showTitle={false}>
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
          <div className="absolute inset-x-5 bottom-5">
            <div className="display text-[26px] md:text-[32px]" style={{ color: "#F7F4E9" }}>{series.title}</div>
            <p className="mt-1.5 line-clamp-1 text-sm text-cream/80">{series.tagline}</p>
          </div>
        </Cover>
      </Link>
      <button onClick={() => play(series)} className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-cream text-ink opacity-90 shadow-lg transition hover:scale-105 hover:opacity-100" aria-label={`Play ${series.title}`}>
        <Play size={18} fill="currentColor" className="ml-0.5" />
      </button>
    </div>
  );
}

export function TrendingBadge({ rank }: { rank: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-coral px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-ink">
      <TrendingUp size={12} strokeWidth={3} /> #{rank} trending
    </span>
  );
}

export function useSeriesList(slugs: string[]) {
  const { bySlug } = useCatalog();
  return slugs.map((s) => bySlug[s]).filter(Boolean);
}
