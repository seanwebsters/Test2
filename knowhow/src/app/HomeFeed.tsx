"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Cover, CoverArt } from "@/components/art/Cover";
import { useApp } from "@/components/providers/AppState";
import { useCatalog } from "@/components/providers/CatalogProvider";
import { usePlayer } from "@/components/player/PlayerProvider";
import { EpisodeTile, Rail, SeriesTile, TrendingBadge, WideSeriesCard, usePlaySeries, useSeriesList } from "@/components/catalog/Tiles";
import { ArrowRight, Flame, Pause, Play, Plus, Check, Sparkles, Wand2, Zap } from "@/components/ui/Icon";
import { CATEGORIES, CATEGORY_BY_ID } from "@/content/categories";
import { levelProgress } from "@/lib/gamification";
import type { Series } from "@/lib/types";
import { cn } from "@/lib/cn";

const EVERYONE_SHOULD_KNOW = ["the-money-game", "inside-your-mind", "universe-explained", "people-who-changed-everything", "stoic-mode", "internet-explained", "how-ai-actually-works"];
const RABBIT_HOLE_SERIES = ["big-questions-tiny-episodes", "the-making-of", "history-of-everything", "human-body-is-weird", "greatest-heists"];

function dayOfYear(d = new Date()) {
  return Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86400000);
}

export function HomeFeed() {
  const { series, bySlug } = useCatalog();
  const { state } = useApp();
  const progress = state?.progress;

  const continueEps = useMemo(() => {
    if (!progress) return [];
    return Object.entries(progress)
      .filter(([id, p]) => !p.completed && p.position > 5 && !id.startsWith("ai_"))
      .sort((a, b) => b[1].updatedAt.localeCompare(a[1].updatedAt))
      .map(([id]) => {
        const s = series.find((x) => x.episodes.some((e) => e.id === id));
        return s ? { s, e: s.episodes.find((e) => e.id === id)! } : null;
      })
      .filter(Boolean) as { s: Series; e: Series["episodes"][number] }[];
  }, [progress, series]);

  const obsessed = useMemo(() => {
    if (!state) return [];
    const minutes = new Map<string, number>();
    for (const [id, p] of Object.entries(state.progress)) {
      const slug = series.find((s) => s.episodes.some((e) => e.id === id))?.slug;
      if (slug) minutes.set(slug, (minutes.get(slug) ?? 0) + p.listened);
    }
    const ranked = [...minutes.entries()].sort((a, b) => b[1] - a[1]).map(([s]) => s);
    return [...new Set([...ranked, ...state.following])].map((s) => bySlug[s]).filter(Boolean).slice(0, 10);
  }, [state, series, bySlug]);

  const brainFood = useMemo(
    () => series.flatMap((s) => s.episodes.filter((e) => e.hasAudio && (e.duration ?? 999) <= 330 && e.n <= s.freeEpisodes).map((e) => ({ s, e }))).sort((a, b) => (a.e.duration ?? 0) - (b.e.duration ?? 0)).slice(0, 12),
    [series],
  );
  const trending = useMemo(() => series.filter((s) => s.trending).sort((a, b) => a.trending! - b.trending! || b.ratingCount - a.ratingCount).slice(0, 10), [series]);
  const madeForYou = useMemo(() => {
    const interests = state?.interests.length ? state.interests : ["science", "psychology", "history"];
    const style = state?.learnStyle ?? "mix";
    return series
      .filter((s) => interests.includes(s.category) && !state?.following.includes(s.slug))
      .sort((a, b) => (style !== "mix" ? Number(b.format === style) - Number(a.format === style) : 0) || b.rating - a.rating)
      .slice(0, 10);
  }, [series, state]);
  const internet = useSeriesList(series.filter((s) => s.category === "culture" || s.category === "technology").map((s) => s.slug));
  const everyone = useSeriesList(EVERYONE_SHOULD_KNOW);
  const bigIdeas = useMemo(() => series.filter((s) => s.category === "philosophy" || (s.format === "quick" && s.category === "creativity")), [series]);
  const rabbitSeries = useSeriesList(RABBIT_HOLE_SERIES);
  const rabbitHoles = bySlug["rabbit-holes"];
  // Picked after mount so the server render (UTC) and the listener's local day can't disagree.
  const [day, setDay] = useState(0);
  useEffect(() => setDay(dayOfYear()), []);
  const todays = rabbitHoles.episodes[day % rabbitHoles.episodes.length];

  return (
    <div className="pb-safe-nav">
      <Header />
      <Hero series={bySlug["the-money-game"]} />

      <UniverseChips />

      {continueEps.length > 0 && (
        <Rail title="Pick up where" accent="you left off">
          {continueEps.map(({ s, e }) => <EpisodeTile key={e.id} series={s} ep={e} />)}
        </Rail>
      )}

      <DailyRabbitHole series={rabbitHoles} ep={todays} />

      {obsessed.length > 0 && (
        <Rail title="Currently" accent="obsessed">
          {obsessed.map((s) => <SeriesTile key={s.slug} series={s} />)}
        </Rail>
      )}

      <Rail title="Trending" accent="this week" kicker="What everyone's bingeing">
        {trending.map((s, i) => <SeriesTile key={s.slug} series={s} rank={i + 1} />)}
      </Rail>

      <Rail title="5-minute" accent="brain food" kicker="Free · under five and a half minutes">
        {brainFood.map(({ s, e }) => <EpisodeTile key={e.id} series={s} ep={e} />)}
      </Rail>

      <Rail title="Made for" accent="your brain" kicker={state?.interests.length ? `Because you're into ${state.interests.slice(0, 2).map((i) => CATEGORY_BY_ID[i].label.toLowerCase()).join(" & ")}` : "Picked for you"}>
        {madeForYou.map((s) => <SeriesTile key={s.slug} series={s} size="lg" />)}
      </Rail>

      <MakePromo />

      <Rail title="Things everyone" accent="should know">
        {everyone.map((s) => <WideSeriesCard key={s.slug} series={s} />)}
      </Rail>

      <Rail title="The internet made me" accent="curious">
        {internet.map((s) => <SeriesTile key={s.slug} series={s} />)}
      </Rail>

      <Rail title="Rabbit holes" accent="worth falling into">
        {rabbitHoles.episodes.map((e) => <EpisodeTile key={e.id} series={rabbitHoles} ep={e} />)}
        {rabbitSeries.map((s) => <SeriesTile key={s.slug} series={s} size="sm" />)}
      </Rail>

      <Rail title="Big ideas," accent="tiny episodes">
        {bigIdeas.map((s) => <SeriesTile key={s.slug} series={s} />)}
      </Rail>

      <div className="mt-16 text-center text-xs text-cream-mute">
        KNOWHOW Originals are written by our editorial team and narrated with AI voices.
      </div>
    </div>
  );
}

function Header() {
  const { state } = useApp();
  const lp = state ? levelProgress(state.xp) : null;
  return (
    <header className="flex items-start justify-between gap-4 px-4 pt-[calc(20px+var(--safe-top))] md:px-10 md:pt-10">
      <div>
        <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="display text-[34px] md:text-[56px]">
          hey, curious <span className="text-lime">mind.</span>
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="editorial mt-1 text-[22px] text-cream-dim md:text-[28px]">
          what are we getting into today?
        </motion.p>
      </div>
      {state && lp && (
        <Link href="/profile" className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] p-1.5 pr-3 text-sm font-bold">
          <span className="flex items-center gap-1 rounded-full bg-coral px-2 py-1 text-ink"><Flame size={14} />{state.streak.current}</span>
          <span className="flex items-center gap-1 text-lime"><Zap size={14} />{state.xp}</span>
        </Link>
      )}
    </header>
  );
}

function Hero({ series }: { series: Series }) {
  const play = usePlaySeries();
  const p = usePlayer();
  const { state, api } = useApp();
  const released = series.episodes.filter((e) => e.status === "released");
  const done = released.filter((e) => state?.progress[e.id]?.completed).length;
  const isPlaying = p.playing && p.current?.seed === series.slug;
  const following = state?.following.includes(series.slug);
  const avg = Math.round(series.episodes.reduce((n, e) => n + e.minutes, 0) / series.episodes.length);
  return (
    <section className="mt-6 px-4 md:mt-8 md:px-10">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="relative overflow-hidden rounded-[32px]">
        <Cover art={series.art} seed={series.slug} label="KNOWHOW Original" showTitle={false} className="aspect-[4/5] w-full rounded-[32px] sm:aspect-[16/10] lg:aspect-[21/9]">
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent lg:bg-gradient-to-r lg:from-black/80 lg:via-black/30" />
          <div className="absolute inset-x-5 bottom-5 md:inset-x-10 md:bottom-10 lg:max-w-[56%]">
            <div className="flex flex-wrap items-center gap-2">
              {series.trending && <TrendingBadge rank={series.trending} />}
              <span className="chip border-white/20 bg-black/30 text-cream backdrop-blur">{CATEGORY_BY_ID[series.category].label}</span>
            </div>
            <h2 className="display mt-4 text-[44px] text-cream sm:text-[64px] lg:text-[84px]">{series.title}</h2>
            <p className="editorial mt-3 text-[22px] leading-tight text-cream/90 md:text-[28px]">{series.tagline}</p>
            <p className="mt-3 text-sm font-medium text-cream/70">
              {series.episodes.length} episodes · {CATEGORY_BY_ID[series.category].label} · {avg} min each · ★ {series.rating}
            </p>
            {done > 0 && (
              <div className="mt-4 flex max-w-xs items-center gap-3 text-xs text-cream/80">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-lime" style={{ width: `${(done / released.length) * 100}%` }} /></div>
                {done}/{released.length} released
              </div>
            )}
            <div className="mt-6 flex items-center gap-3">
              <button onClick={() => (isPlaying ? p.toggle() : play(series))} className="btn-lime h-14 px-7 text-base">
                {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                {isPlaying ? "Pause" : done > 0 ? "Continue" : "Play episode 1"}
              </button>
              <button onClick={() => api("/api/follow", { body: { slug: series.slug, on: !following } })} className={cn("grid h-14 w-14 place-items-center rounded-full border border-white/25 bg-black/30 backdrop-blur transition hover:border-white/50", following && "border-lime text-lime")} aria-label={following ? "Unfollow" : "Follow"}>
                {following ? <Check size={22} /> : <Plus size={22} />}
              </button>
              <Link href={`/series/${series.slug}`} className="hidden text-sm font-semibold text-cream/80 underline-offset-4 hover:underline sm:block">Episode guide</Link>
            </div>
          </div>
        </Cover>
      </motion.div>
    </section>
  );
}

function UniverseChips() {
  return (
    <div className="no-scrollbar mt-6 flex gap-2 overflow-x-auto px-4 md:px-10">
      {CATEGORIES.map((c) => (
        <Link key={c.id} href={`/c/${c.id}`} className="flex shrink-0 items-center gap-2 rounded-full border border-white/10 py-1.5 pl-1.5 pr-4 text-sm font-semibold transition hover:border-white/30" style={{ background: `linear-gradient(90deg, ${c.color}1f, transparent)` }}>
          <span className="grid h-7 w-7 place-items-center rounded-full text-[13px] font-black text-ink" style={{ background: c.color }}>{c.glyph}</span>
          {c.label}
        </Link>
      ))}
    </div>
  );
}

function DailyRabbitHole({ series, ep }: { series: Series; ep: Series["episodes"][number] }) {
  const play = usePlaySeries();
  const p = usePlayer();
  const isCurrent = p.current?.id === ep.id;
  const { state } = useApp();
  const done = state?.progress[ep.id]?.completed;
  return (
    <section className="mt-10 px-4 md:mt-14 md:px-10">
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={() => (isCurrent ? p.toggle() : play(series, ep))}
        className="group relative flex w-full items-center gap-5 overflow-hidden rounded-[32px] bg-lime p-5 text-left text-ink md:p-8"
      >
        <div className="absolute -right-10 -top-10 h-56 w-56 animate-spinslow rounded-full opacity-90 md:h-72 md:w-72" aria-hidden>
          <CoverArt art={series.art} seed={`${series.slug}-daily`} className="rounded-full" />
        </div>
        <div className="relative z-10 max-w-[70%]">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] opacity-70">Today&apos;s rabbit hole</div>
          <div className="display mt-3 text-[30px] md:text-[48px]">{ep.title}</div>
          <p className="mt-2 text-sm font-medium opacity-75 md:text-base">{ep.description}</p>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-bold text-lime">
            {isCurrent && p.playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
            {done ? "Listen again" : "One-tap listen"} · {Math.round((ep.duration ?? 240) / 60)} min
          </div>
        </div>
      </motion.button>
    </section>
  );
}

function MakePromo() {
  return (
    <section className="mt-10 px-4 md:mt-14 md:px-10">
      <Link href="/make" className="group relative block overflow-hidden rounded-[32px] p-6 md:p-10" style={{ background: "linear-gradient(120deg, #B6A1FF 0%, #FF92C7 55%, #FF7768 100%)" }}>
        <div className="absolute -right-6 -top-6 text-[180px] leading-none opacity-20 transition-transform duration-500 group-hover:rotate-12 md:text-[260px]" aria-hidden>✦</div>
        <div className="relative text-ink">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em]"><Wand2 size={14} /> AI personal series</div>
          <div className="display mt-3 max-w-xl text-[32px] md:text-[52px]">Make me smarter about…</div>
          <div className="mt-4 flex flex-wrap gap-2">
            {["How does Formula 1 actually work?", "Teach me the basics of investing.", "Explain quantum physics like I'm 20."].map((q) => (
              <span key={q} className="rounded-full bg-ink/10 px-3 py-1.5 text-sm font-semibold">{q}</span>
            ))}
          </div>
          <div className="mt-6 inline-flex items-center gap-2 font-bold">
            <Sparkles size={18} /> Build my series <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
          </div>
        </div>
      </Link>
    </section>
  );
}
