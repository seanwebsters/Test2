"use client";
import { useEffect, useMemo, useState } from "react";
import { downloadEpisode, downloadedIds, offlineSupported, removeDownload } from "@/components/player/offline";
import Link from "next/link";
import { motion } from "framer-motion";
import { Cover, CoverArt } from "@/components/art/Cover";
import { KnowledgeCard } from "@/components/cards/KnowledgeCard";
import { useApp } from "@/components/providers/AppState";
import { useCatalog } from "@/components/providers/CatalogProvider";
import { usePlayer } from "@/components/player/PlayerProvider";
import { catalogItem, firstPlayable, seriesQueue } from "@/components/player/items";
import { Rail, SeriesTile, TrendingBadge } from "@/components/catalog/Tiles";
import { AddToCollection } from "@/components/catalog/AddToCollection";
import { Avatar } from "@/components/ui/Avatar";
import { Check, ChevronLeft, Clock, Heart, ListMusic, Lock, Pause, Play, Plus, RotateCcw, Share2, Star } from "@/components/ui/Icon";
import { CATEGORY_BY_ID, TOPIC_BY_ID } from "@/content/categories";
import { cardView } from "@/lib/cards";
import { seriesCardRarity } from "@/lib/gamification";
import type { EpisodeMeta, Series } from "@/lib/types";
import { cn, fmtTime } from "@/lib/cn";

export function SeriesView({ series }: { series: Series }) {
  const { state, api, toast } = useApp();
  const { series: all, bySlug } = useCatalog();
  const p = usePlayer();
  const cat = CATEGORY_BY_ID[series.category];
  const accent = series.art.palette[1];
  const released = series.episodes.filter((e) => e.status === "released");
  const done = released.filter((e) => state?.progress[e.id]?.completed).length;
  const inProgress = released.find((e) => {
    const pr = state?.progress[e.id];
    return pr && !pr.completed && pr.position > 5;
  });
  const following = state?.following.includes(series.slug);
  const favourite = state?.favourites.includes(series.slug);
  const avg = Math.round(series.episodes.reduce((n, e) => n + e.minutes, 0) / series.episodes.length);
  const card = cardView(`series:${series.slug}`, seriesCardRarity(released.length), bySlug)!;
  const owned = state?.cards.find((c) => c.key === `series:${series.slug}`);
  const playingThis = p.current?.seed === series.slug;

  const related = useMemo(() => {
    const topics = new Set(series.episodes.flatMap((e) => e.topics));
    return all
      .filter((s) => s.slug !== series.slug)
      .map((s) => ({ s, score: (s.category === series.category ? 2 : 0) + s.episodes.flatMap((e) => e.topics).filter((t) => topics.has(t)).length }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((x) => x.s);
  }, [all, series]);

  const playEp = (ep: EpisodeMeta) => {
    if (p.current?.id === ep.id) return p.toggle();
    void p.play(catalogItem(series, ep), { queue: seriesQueue(series, ep) });
  };
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: series.title, text: series.hook, url });
      else {
        await navigator.clipboard.writeText(url);
        toast({ title: "Link copied", body: series.title, tone: "plain" });
      }
    } catch {
      /* cancelled */
    }
  };

  return (
    <div className="pb-safe-nav">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 scale-125 blur-3xl saturate-150" aria-hidden>
          <CoverArt art={series.art} seed={series.slug} />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-ink/30 via-ink/70 to-ink" />
        <div className="relative px-4 pb-10 pt-[calc(14px+var(--safe-top))] md:px-10 md:pt-8">
          <Link href="/" className="inline-grid h-10 w-10 place-items-center rounded-full bg-black/30 backdrop-blur hover:bg-black/50" aria-label="Back"><ChevronLeft size={20} /></Link>
          <div className="mt-6 grid items-end gap-8 md:grid-cols-[minmax(0,380px)_1fr] md:gap-12">
            <motion.div initial={{ opacity: 0, y: 30, rotate: -3 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ type: "spring", stiffness: 120, damping: 16 }}>
              <Cover art={series.art} seed={series.slug} title={series.title} className="mx-auto aspect-square w-[78%] max-w-[380px] rounded-[28px] shadow-[0_40px_100px_rgba(0,0,0,0.6)] md:w-full" />
            </motion.div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                {series.trending && <TrendingBadge rank={series.trending} />}
                <Link href={`/c/${cat.id}`} className="chip border-transparent text-ink" style={{ background: cat.color }}>{cat.label}</Link>
                {series.format === "deep" ? <span className="chip">Deep dive</span> : <span className="chip">Quick hits</span>}
              </div>
              <h1 className="display mt-4 text-[44px] sm:text-[64px] lg:text-[88px]">{series.title}</h1>
              <p className="editorial mt-3 text-[24px] leading-tight text-cream md:text-[30px]">{series.tagline}</p>
              <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-cream-dim md:text-base">{series.description}</p>
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-cream-dim">
                <span className="flex items-center gap-1 font-semibold text-cream"><Star size={15} fill="#DFFF57" className="text-lime" /> {series.rating} <span className="font-normal text-cream-mute">({series.ratingCount.toLocaleString()})</span></span>
                <span>{series.episodes.length} episodes</span>
                <span>~{avg} min avg</span>
                <span>{released.length} out now</span>
              </div>
              {done > 0 && (
                <div className="mt-4 flex max-w-sm items-center gap-3 text-xs text-cream-dim">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full" style={{ width: `${(done / released.length) * 100}%`, background: accent }} /></div>
                  {done}/{released.length} finished
                </div>
              )}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => (playingThis ? p.toggle() : playEp(firstPlayable(series, undefined)!))}
                  className="btn h-14 px-7 text-base text-ink"
                  style={{ background: accent === "#111114" ? "#F7F4E9" : accent }}
                >
                  {playingThis && p.playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                  {playingThis && p.playing ? "Pause" : "Play from the beginning"}
                </button>
                {inProgress && !playingThis && (
                  <button onClick={() => playEp(inProgress)} className="btn-ghost h-14 px-6"><RotateCcw size={18} /> Resume Ep {inProgress.n}</button>
                )}
                <button onClick={() => api("/api/follow", { body: { slug: series.slug, on: !following } })} className={cn("btn-ghost h-14 px-5", following && "border-lime/50 text-lime")}>
                  {following ? <Check size={18} /> : <Plus size={18} />} {following ? "Following" : "Follow"}
                </button>
                <button onClick={() => api("/api/favourite", { body: { slug: series.slug, on: !favourite } })} className={cn("grid h-14 w-14 place-items-center rounded-full border border-white/15 transition hover:border-white/30", favourite && "border-bubblegum/60 text-bubblegum")} aria-label={favourite ? "Remove from favourites" : "Add to favourites"}>
                  <Heart size={20} fill={favourite ? "currentColor" : "none"} />
                </button>
                <AddToCollection slug={series.slug} />
                <button onClick={share} className="grid h-14 w-14 place-items-center rounded-full border border-white/15 transition hover:border-white/30" aria-label="Share"><Share2 size={20} /></button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-10 px-4 md:px-10 lg:grid-cols-[1fr_320px]">
        <section>
          <div className="flex items-end justify-between">
            <h2 className="text-2xl font-bold">Episodes</h2>
            {series.releaseNote && <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: accent === "#111114" ? "#DFFF57" : accent }}>{series.releaseNote}</span>}
          </div>
          <ol className="mt-4 divide-y divide-white/[0.06]">
            {series.episodes.map((e) => <EpisodeRow key={e.id} series={series} ep={e} onPlay={() => playEp(e)} />)}
          </ol>
        </section>

        <aside className="space-y-6">
          <div className="rounded-[28px] bg-ink-2 p-5">
            <div className="eyebrow">Hosted by</div>
            <div className="mt-3 flex items-center gap-3">
              <Avatar name={series.creator.name} hue={series.creator.name.length * 37} className="h-12 w-12 text-base" />
              <div>
                <div className="font-bold">{series.creator.name}</div>
                <div className="text-xs text-cream-mute">@{series.creator.handle}</div>
              </div>
            </div>
            <p className="mt-3 text-sm text-cream-dim">{series.creator.bio}</p>
            <p className="mt-3 text-[11px] leading-snug text-cream-mute">Written by the KNOWHOW editorial team. {series.creator.name} is a host persona voiced by an AI narrator (Kokoro TTS).</p>
          </div>

          <div className="rounded-[28px] bg-ink-2 p-5">
            <div className="eyebrow">Ratings</div>
            <div className="mt-2 flex items-end gap-3">
              <div className="display text-6xl text-lime">{series.rating}</div>
              <div className="pb-1.5">
                <div className="flex gap-0.5 text-lime">{Array.from({ length: 5 }, (_, i) => <Star key={i} size={14} fill={i < Math.round(series.rating) ? "currentColor" : "none"} />)}</div>
                <div className="mt-1 text-xs text-cream-mute">{series.ratingCount.toLocaleString()} ratings · seed data</div>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] bg-ink-2 p-5">
            <div className="eyebrow mb-3">{owned ? "You collected this" : "Finish every released episode to collect"}</div>
            <div className="mx-auto max-w-[220px]">
              <KnowledgeCard card={card} unlockedAt={owned?.unlockedAt} locked={!owned} />
            </div>
          </div>

          <div className="rounded-[28px] bg-ink-2 p-5">
            <div className="eyebrow mb-3">Lights up in your universe</div>
            <div className="flex flex-wrap gap-1.5">
              {[...new Set(series.episodes.flatMap((e) => e.topics))].map((t) => TOPIC_BY_ID[t]).filter(Boolean).map((t) => (
                <span key={t.id} className="chip" style={{ color: CATEGORY_BY_ID[t.category].color }}>{t.label}</span>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <Rail title="If you liked this," accent="try these">
          {related.map((s) => <SeriesTile key={s.slug} series={s} />)}
        </Rail>
      )}
    </div>
  );
}

function EpisodeRow({ series, ep, onPlay }: { series: Series; ep: EpisodeMeta; onPlay: () => void }) {
  const { state } = useApp();
  const p = usePlayer();
  const [open, setOpen] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const { toast } = useApp();
  useEffect(() => {
    const sync = () => setDownloaded(downloadedIds().includes(ep.id));
    sync();
    window.addEventListener("kh-downloads", sync);
    return () => window.removeEventListener("kh-downloads", sync);
  }, [ep.id]);
  const canDownload = offlineSupported() && (state?.plus || state?.unlocked.includes(ep.id));
  const toggleDownload = async () => {
    setOpen(false);
    try {
      if (downloaded) await removeDownload(`/api/episodes/${ep.id}/audio`, ep.id);
      else {
        await downloadEpisode(`/api/episodes/${ep.id}/audio`, ep.id);
        toast({ title: "Downloaded", body: `${ep.title} is available offline`, tone: "lime" });
      }
    } catch (e) {
      toast({ title: "Download failed", body: e instanceof Error ? e.message : undefined, tone: "coral" });
    }
  };
  const pr = state?.progress[ep.id];
  const upcoming = ep.status === "upcoming";
  const free = ep.n <= series.freeEpisodes;
  const locked = !upcoming && !free && !state?.plus && !state?.unlocked.includes(ep.id);
  const isCurrent = p.current?.id === ep.id;
  const pct = pr && ep.duration ? Math.min(100, (pr.position / ep.duration) * 100) : 0;
  const accent = series.art.palette[1] === "#111114" ? "#DFFF57" : series.art.palette[1];
  return (
    <li className={cn("group relative flex gap-4 py-4", upcoming && "opacity-55")}>
      <button
        onClick={onPlay}
        disabled={upcoming}
        className="relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-ink-2 transition group-hover:scale-105 disabled:cursor-not-allowed"
        aria-label={upcoming ? `${ep.title} — coming soon` : `${isCurrent && p.playing ? "Pause" : "Play"} episode ${ep.n}: ${ep.title}`}
      >
        {pr?.completed ? (
          <span className="grid h-full w-full place-items-center text-ink" style={{ background: accent }}><Check size={22} strokeWidth={3} /></span>
        ) : (
          <>
            <span className="display text-xl text-cream-mute transition group-hover:opacity-0">{String(ep.n).padStart(2, "0")}</span>
            <span className="absolute inset-0 grid place-items-center opacity-0 transition group-hover:opacity-100" style={{ color: accent }}>
              {upcoming ? <Clock size={20} /> : locked ? <Lock size={20} /> : isCurrent && p.playing ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}
            </span>
          </>
        )}
        {isCurrent && p.playing && !pr?.completed && <span className="absolute inset-0 grid place-items-center bg-ink-2"><span className="flex h-5 items-end gap-[3px]">{[0, 0.2, 0.4].map((d) => <span key={d} className="h-full w-[3px] origin-bottom animate-eq rounded-full" style={{ animationDelay: `${d}s`, background: accent }} />)}</span></span>}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-[16px] font-semibold leading-snug">{ep.title}</h3>
          {free && !upcoming && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cream-dim">Free</span>}
          {locked && <span className="flex items-center gap-1 rounded-full bg-lime/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-lime"><Lock size={10} /> Plus</span>}
          {upcoming && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">Coming soon</span>}
        </div>
        <p className="mt-1 line-clamp-2 text-sm text-cream-dim">{ep.description}</p>
        <div className="mt-1.5 flex items-center gap-3 text-xs text-cream-mute">
          <span>{ep.duration ? fmtTime(ep.duration) : `~${ep.minutes} min`}</span>
          {pr?.completed && <span style={{ color: accent }}>Finished</span>}
          {downloaded && <span className="text-lime">Downloaded</span>}
          {pct > 0 && !pr?.completed && (
            <span className="flex items-center gap-2">
              <span className="h-1 w-16 overflow-hidden rounded-full bg-white/10"><span className="block h-full" style={{ width: `${pct}%`, background: accent }} /></span>
              {fmtTime((ep.duration ?? 0) - (pr?.position ?? 0))} left
            </span>
          )}
        </div>
      </div>
      {!upcoming && ep.hasAudio && (
        <div className="relative self-center">
          <button onClick={() => setOpen((v) => !v)} className="grid h-10 w-10 place-items-center rounded-full text-cream-mute transition hover:bg-white/10 hover:text-cream" aria-label="Episode options" aria-expanded={open}>
            <ListMusic size={18} />
          </button>
          {open && (
            <div className="absolute right-0 top-11 z-20 w-44 rounded-2xl border border-white/10 bg-ink-3 p-1.5 shadow-2xl" onMouseLeave={() => setOpen(false)}>
              <button onClick={() => { p.addToQueue(catalogItem(series, ep), true); setOpen(false); }} className="block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-white/10">Play next</button>
              <button onClick={() => { p.addToQueue(catalogItem(series, ep)); setOpen(false); }} className="block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-white/10">Add to queue</button>
              {canDownload ? (
                <button onClick={toggleDownload} className="block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-white/10">{downloaded ? "Remove download" : "Download for offline"}</button>
              ) : (
                <Link href="/plus" className="block w-full rounded-xl px-3 py-2 text-left text-sm text-cream-mute hover:bg-white/10">Offline downloads · Plus</Link>
              )}
            </div>
          )}
        </div>
      )}
    </li>
  );
}
