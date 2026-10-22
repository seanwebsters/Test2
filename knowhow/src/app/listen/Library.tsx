"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Cover, CoverArt } from "@/components/art/Cover";
import { useApp } from "@/components/providers/AppState";
import { useCatalog } from "@/components/providers/CatalogProvider";
import { usePlayer } from "@/components/player/PlayerProvider";
import { EpisodeTile, SeriesTile } from "@/components/catalog/Tiles";
import { ArrowRight, Check, Headphones, Layers, Pause, Play, Wand2 } from "@/components/ui/Icon";
import type { Art, Series } from "@/lib/types";
import { cn, fmtTime } from "@/lib/cn";

interface AiSummary { id: string; title: string; tagline: string; art: Art; mode: "live" | "demo"; prompt: string; episodes: number; episodeIds: string[] }

type Tab = "all" | "following" | "ai" | "finished";

export function Library() {
  const { state } = useApp();
  const { series, byEpisode, bySlug } = useCatalog();
  const p = usePlayer();
  const [tab, setTab] = useState<Tab>("all");
  const [ai, setAi] = useState<AiSummary[] | null>(null);
  const { api } = useApp();

  useEffect(() => {
    if (!state) return;
    api<AiSummary[]>("/api/ai/series").then(setAi).catch(() => setAi([]));
  }, [state?.aiSeries.length, api, state]);

  const inProgress = useMemo(
    () =>
      Object.entries(state?.progress ?? {})
        .filter(([id, pr]) => !pr.completed && pr.position > 5 && byEpisode[id])
        .sort((a, b) => b[1].updatedAt.localeCompare(a[1].updatedAt))
        .map(([id]) => ({ s: bySlug[byEpisode[id].seriesSlug], e: byEpisode[id] })),
    [state?.progress, byEpisode, bySlug],
  );
  const finished = useMemo(
    () =>
      Object.entries(state?.progress ?? {})
        .filter(([id, pr]) => pr.completed && byEpisode[id])
        .sort((a, b) => (b[1].completedAt ?? "").localeCompare(a[1].completedAt ?? ""))
        .map(([id]) => ({ s: bySlug[byEpisode[id].seriesSlug], e: byEpisode[id] })),
    [state?.progress, byEpisode, bySlug],
  );
  const following = (state?.following ?? []).map((s) => bySlug[s]).filter(Boolean);
  const favourites = (state?.favourites ?? []).map((s) => bySlug[s]).filter(Boolean);

  return (
    <div className="pb-safe-nav px-4 pt-[calc(20px+var(--safe-top))] md:px-10 md:pt-10">
      <h1 className="display text-[40px] md:text-[64px]">Listen</h1>
      <p className="editorial text-2xl text-cream-dim">Your library, your queue, your obsessions.</p>

      {p.current ? (
        <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onClick={() => p.setExpanded(true)} className="mt-6 flex w-full items-center gap-4 overflow-hidden rounded-[28px] p-4 text-left md:p-5" style={{ background: `linear-gradient(110deg, ${p.current.art.palette[0]}, #1D1D22 70%)` }}>
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl md:h-24 md:w-24"><CoverArt art={p.current.art} seed={p.current.seed} /></div>
          <div className="min-w-0 flex-1">
            <div className="eyebrow" style={{ color: p.current.art.palette[1] }}>{p.playing ? "Now playing" : "Paused"}</div>
            <div className="mt-1 truncate text-lg font-bold">{p.current.title}</div>
            <div className="truncate text-sm text-cream-dim">{p.current.seriesTitle} · {fmtTime(p.position)} / {fmtTime(p.duration)}</div>
            {p.queue.length > 0 && <div className="mt-1 truncate text-xs text-cream-mute">Up next: {p.queue[0].title}</div>}
          </div>
          <span onClick={(e) => { e.stopPropagation(); p.toggle(); }} className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-cream text-ink" role="button" aria-label={p.playing ? "Pause" : "Play"}>
            {p.playing ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" className="ml-0.5" />}
          </span>
        </motion.button>
      ) : (
        <div className="mt-6 flex items-center gap-4 rounded-[28px] border border-dashed border-white/15 p-5">
          <Headphones className="text-lime" />
          <div className="flex-1 text-sm text-cream-dim">Nothing playing. Your next obsession is one tap away.</div>
          <Link href="/discover" className="btn-lime h-10 px-4">Discover</Link>
        </div>
      )}

      <div className="no-scrollbar mt-8 flex gap-2 overflow-x-auto">
        {(["all", "following", "ai", "finished"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cn("relative shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition", tab === t ? "text-ink" : "bg-white/[0.06] text-cream-dim hover:text-cream")}>
            {tab === t && <motion.span layoutId="libtab" className="absolute inset-0 rounded-full bg-lime" />}
            <span className="relative">{{ all: "Everything", following: `Following · ${following.length}`, ai: `AI series · ${ai?.length ?? 0}`, finished: `Finished · ${finished.length}` }[t]}</span>
          </button>
        ))}
      </div>

      {(tab === "all") && inProgress.length > 0 && (
        <Section title="Continue listening">
          <div className="rail">{inProgress.map(({ s, e }) => <EpisodeTile key={e.id} series={s} ep={e} />)}</div>
        </Section>
      )}

      {(tab === "all" || tab === "following") && (
        <Section title="Following" action={<Link href="/collections" className="flex items-center gap-1 text-sm font-semibold text-cream-dim hover:text-cream"><Layers size={15} /> Collections</Link>}>
          {following.length ? <Grid list={following} /> : <Empty text="Follow a series and new episodes land here." cta={{ href: "/", label: "Browse series" }} />}
        </Section>
      )}

      {(tab === "all" || tab === "ai") && (
        <Section title="Your AI series" action={<Link href="/make" className="flex items-center gap-1 text-sm font-semibold text-lavender hover:text-cream"><Wand2 size={15} /> Make one</Link>}>
          {!ai && <div className="skeleton h-24" />}
          {ai && ai.length === 0 && (
            <Link href="/make" className="group flex items-center gap-4 rounded-[28px] p-5 text-ink" style={{ background: "linear-gradient(120deg,#B6A1FF,#FF92C7)" }}>
              <Wand2 size={28} />
              <div className="flex-1"><div className="display text-xl">Make me smarter about…</div><div className="text-sm opacity-75">Type any topic. Get a personal audio series.</div></div>
              <ArrowRight className="transition group-hover:translate-x-1" />
            </Link>
          )}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {ai?.map((s) => {
              const done = s.episodeIds.filter((id) => state?.progress[id]?.completed).length;
              return (
                <Link key={s.id} href={`/ai/${s.id}`} className="flex items-center gap-4 rounded-[24px] bg-ink-2 p-3 transition hover:bg-ink-3">
                  <Cover art={s.art} seed={s.id} label={null} showTitle={false} className="h-20 w-20 shrink-0 rounded-2xl" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", s.mode === "demo" ? "bg-white/10 text-cream-dim" : "bg-lavender text-ink")}>{s.mode === "demo" ? "Sample" : "AI-made"}</span>
                      <span className="text-xs text-cream-mute">{done}/{s.episodes} done</span>
                    </div>
                    <div className="mt-1 truncate font-bold">{s.title}</div>
                    <div className="truncate text-xs text-cream-mute">&ldquo;{s.prompt}&rdquo;</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </Section>
      )}

      {(tab === "all") && favourites.length > 0 && (
        <Section title="Favourites"><Grid list={favourites} /></Section>
      )}

      {(tab === "all" || tab === "finished") && (
        <Section title="Recently finished">
          {finished.length ? (
            <ul className="divide-y divide-white/[0.06]">
              {finished.slice(0, tab === "finished" ? 100 : 6).map(({ s, e }) => (
                <li key={e.id} className="flex items-center gap-3 py-3">
                  <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl"><CoverArt art={s.art} seed={s.slug} /></div>
                  <Link href={`/series/${s.slug}`} className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{e.title}</div>
                    <div className="truncate text-xs text-cream-mute">{s.title} · Ep {e.n}</div>
                  </Link>
                  <Check size={18} className="text-lime" />
                </li>
              ))}
            </ul>
          ) : (
            <Empty text="Finish an episode and it'll show up here — and as a star in your universe." />
          )}
        </Section>
      )}
      {series.length === 0 && null}
    </div>
  );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-bold md:text-2xl">{title}</h2>{action}</div>
      {children}
    </section>
  );
}

function Grid({ list }: { list: Series[] }) {
  return <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-5 [&>div]:w-full">{list.map((s) => <SeriesTile key={s.slug} series={s} />)}</div>;
}

function Empty({ text, cta }: { text: string; cta?: { href: string; label: string } }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-[24px] border border-dashed border-white/15 p-5 text-sm text-cream-dim sm:flex-row sm:items-center">
      <span className="flex-1">{text}</span>
      {cta && <Link href={cta.href} className="btn-ghost h-10 px-4">{cta.label}</Link>}
    </div>
  );
}
