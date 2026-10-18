"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { CoverArt } from "@/components/art/Cover";
import { useApp } from "@/components/providers/AppState";
import { useCatalog } from "@/components/providers/CatalogProvider";
import { usePlayer } from "@/components/player/PlayerProvider";
import { catalogItem, seriesQueue } from "@/components/player/items";
import { Bookmark, BookmarkCheck, ChevronDown, Heart, Play, Share2, Volume2 } from "@/components/ui/Icon";
import { CATEGORY_BY_ID } from "@/content/categories";
import type { TranscriptLine } from "@/lib/types";
import { cn } from "@/lib/cn";

export interface FeedItem {
  episodeId: string;
  slug: string;
  n: number;
  title: string;
  hook: string;
  lines: TranscriptLine[];
  duration: number;
  free: boolean;
}

export function DiscoverFeed({ items }: { items: FeedItem[] }) {
  const scroller = useRef<HTMLDivElement>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const [active, setActive] = useState(0);
  const [time, setTime] = useState(0);
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const player = usePlayer();

  useEffect(() => {
    const a = new Audio();
    a.preload = "auto";
    audio.current = a;
    const onTime = () => setTime(a.currentTime);
    const onEnd = () => {
      // Loop the hook once more after a beat, like a short-form feed.
      setTimeout(() => {
        if (!a.paused || a.currentTime < a.duration - 0.2) return;
        a.currentTime = 0;
        void a.play().catch(() => undefined);
      }, 1800);
    };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnd);
    return () => {
      a.pause();
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("ended", onEnd);
    };
  }, []);

  // Which card is on screen?
  useEffect(() => {
    const root = scroller.current!;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting && e.intersectionRatio > 0.6) setActive(Number((e.target as HTMLElement).dataset.i));
      },
      { root, threshold: [0.6] },
    );
    root.querySelectorAll("[data-i]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [items.length]);

  useEffect(() => {
    const a = audio.current;
    if (!a || !started) return;
    a.src = `/api/preview/${items[active].episodeId}`;
    setTime(0);
    setPaused(false);
    if (player.playing) player.pause();
    void a.play().catch(() => setPaused(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, started, items]);

  const go = useCallback((d: number) => {
    const root = scroller.current!;
    root.scrollBy({ top: d * root.clientHeight, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "j") { e.preventDefault(); go(1); }
      if (e.key === "ArrowUp" || e.key === "k") { e.preventDefault(); go(-1); }
      if (e.key === " ") { e.preventDefault(); togglePreview(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const togglePreview = () => {
    const a = audio.current;
    if (!a) return;
    if (!started) return setStarted(true);
    if (a.paused) { void a.play(); setPaused(false); } else { a.pause(); setPaused(true); }
  };

  const stopPreview = () => audio.current?.pause();

  return (
    <div className="relative">
      <div ref={scroller} className="no-scrollbar h-[100svh] snap-y snap-mandatory overflow-y-scroll overscroll-contain" aria-label="Discover feed">
        {items.map((it, i) => (
          <DiscoverCard key={it.episodeId} item={it} index={i} active={i === active} time={i === active ? time : 0} paused={paused || !started} onTap={togglePreview} onContinue={stopPreview} />
        ))}
      </div>
      {!started && (
        <button onClick={() => setStarted(true)} className="absolute inset-0 z-30 grid place-items-center bg-ink/60 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
            <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-lime text-ink shadow-[0_0_80px_rgba(223,255,87,0.5)]"><Volume2 size={36} /></div>
            <div className="display mt-6 text-3xl">Tap to start</div>
            <p className="mt-2 text-sm text-cream-dim">Swipe up for the next idea. Previews are always free.</p>
          </motion.div>
        </button>
      )}
    </div>
  );
}

function DiscoverCard({ item, index, active, time, paused, onTap, onContinue }: { item: FeedItem; index: number; active: boolean; time: number; paused: boolean; onTap: () => void; onContinue: () => void }) {
  const { bySlug } = useCatalog();
  const { state, api, toast } = useApp();
  const player = usePlayer();
  const s = bySlug[item.slug];
  const ep = s.episodes.find((e) => e.id === item.episodeId)!;
  const cat = CATEGORY_BY_ID[s.category];
  const [bg, a1, a2] = s.art.palette;
  const following = state?.following.includes(s.slug);
  const favourite = state?.favourites.includes(s.slug);
  const pct = Math.min(100, (time / item.duration) * 100);

  const cont = () => {
    onContinue();
    const startAt = Math.max(0, item.duration - 0.8);
    void player.play(catalogItem(s, ep), { queue: seriesQueue(s, ep), from: startAt });
    player.setExpanded(true);
  };
  const share = async () => {
    const url = `${window.location.origin}/series/${s.slug}`;
    try {
      if (navigator.share) await navigator.share({ title: s.title, text: item.hook, url });
      else { await navigator.clipboard.writeText(url); toast({ title: "Link copied", body: s.title, tone: "plain" }); }
    } catch { /* cancelled */ }
  };

  return (
    <section data-i={index} className="relative flex h-[100svh] snap-start snap-always items-stretch justify-center overflow-hidden" aria-label={`${s.title}: ${item.hook}`}>
      {/* Immersive, slowly moving background */}
      <div className="absolute inset-0" style={{ background: bg }}>
        <motion.div className="absolute -inset-[20%] opacity-70" animate={active ? { scale: [1.05, 1.18, 1.05], rotate: [0, 4, 0] } : { scale: 1.05 }} transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}>
          <CoverArt art={s.art} seed={`${s.slug}-${item.n}`} />
        </motion.div>
        <motion.div className="absolute left-[-20%] top-[10%] h-[60vh] w-[60vh] rounded-full blur-[90px]" style={{ background: a1, opacity: 0.35 }} animate={active ? { x: [0, 80, 0], y: [0, 60, 0] } : {}} transition={{ duration: 14, repeat: Infinity }} />
        <motion.div className="absolute bottom-[-10%] right-[-20%] h-[50vh] w-[50vh] rounded-full blur-[90px]" style={{ background: a2, opacity: 0.3 }} animate={active ? { x: [0, -60, 0], y: [0, -80, 0] } : {}} transition={{ duration: 16, repeat: Infinity }} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/25 to-black/85" />
      </div>

      <div className="relative flex w-full max-w-[520px] flex-col px-5 pb-[calc(96px+var(--safe-bottom))] pt-[calc(20px+var(--safe-top))] md:pb-10 md:pt-8">
        <div className="h-1 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-cream transition-[width] duration-200" style={{ width: `${pct}%` }} /></div>
        <div className="mt-4 flex items-center justify-between">
          <span className="chip border-transparent text-ink" style={{ background: cat.color }}>{cat.label}</span>
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-cream/70">Free preview</span>
        </div>

        <button onClick={onTap} className="mt-6 flex flex-1 flex-col justify-center text-left" aria-label={paused ? "Play preview" : "Pause preview"}>
          <motion.h2 initial={{ opacity: 0, y: 20 }} animate={active ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5 }} className="display text-balance text-[34px] text-cream sm:text-[42px]">
            {item.hook}
          </motion.h2>
          <Captions lines={item.lines} time={time} active={active} accent={a1 === "#111114" ? "#DFFF57" : a1} />
          {paused && active && (
            <span className="mt-6 inline-flex w-fit items-center gap-2 rounded-full bg-black/40 px-4 py-2 text-sm font-semibold backdrop-blur"><Play size={14} fill="currentColor" /> Tap to play</span>
          )}
        </button>

        <div className="flex items-end gap-4">
          <div className="min-w-0 flex-1">
            <Link href={`/series/${s.slug}`} className="flex items-center gap-3" onClick={onContinue}>
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl ring-2 ring-white/20"><CoverArt art={s.art} seed={s.slug} /></div>
              <div className="min-w-0">
                <div className="truncate font-bold">{s.title}</div>
                <div className="truncate text-xs text-cream/70">Ep {item.n} · {item.title}</div>
              </div>
            </Link>
            <button onClick={cont} className="btn-lime mt-4 h-12 w-full">
              <Play size={16} fill="currentColor" /> Continue listening {!item.free && !state?.plus && "· Plus"}
            </button>
          </div>
          <div className="flex flex-col items-center gap-4 pb-1">
            <RailButton label={following ? "Saved" : "Save"} active={following} onClick={() => api("/api/follow", { body: { slug: s.slug, on: !following } }).then(() => !following && toast({ title: "Series saved", body: s.title, tone: "lime" }))}>
              {following ? <BookmarkCheck size={24} /> : <Bookmark size={24} />}
            </RailButton>
            <RailButton label="Love" active={favourite} onClick={() => api("/api/favourite", { body: { slug: s.slug, on: !favourite } })}>
              <Heart size={24} fill={favourite ? "currentColor" : "none"} />
            </RailButton>
            <RailButton label="Share" onClick={share}><Share2 size={24} /></RailButton>
          </div>
        </div>
        {index === 0 && <div className="mt-3 flex justify-center text-cream/60"><ChevronDown size={18} className="animate-bounce" /></div>}
      </div>
    </section>
  );
}

function RailButton({ children, label, onClick, active }: { children: React.ReactNode; label: string; onClick: () => void; active?: boolean }) {
  return (
    <motion.button whileTap={{ scale: 0.8 }} onClick={onClick} className={cn("flex flex-col items-center gap-1 text-[11px] font-semibold", active ? "text-lime" : "text-cream")} aria-pressed={active}>
      <span className="grid h-12 w-12 place-items-center rounded-full bg-black/35 backdrop-blur">{children}</span>
      {label}
    </motion.button>
  );
}

/** Word-by-word captions synced to the real sentence timings of the preview audio. */
function Captions({ lines, time, active, accent }: { lines: TranscriptLine[]; time: number; active: boolean; accent: string }) {
  const line = lines.find((l) => time >= l.t0 - 0.1 && time <= l.t1 + 0.3) ?? (time < (lines[0]?.t0 ?? 0) ? null : null);
  if (!active || !line) return <div className="mt-6 h-[84px]" />;
  const words = line.text.split(" ");
  const p = Math.max(0, Math.min(1, (time - line.t0) / (line.t1 - line.t0)));
  const shown = Math.ceil(p * words.length);
  return (
    <div className="mt-6 min-h-[84px]" aria-live="off">
      <p key={line.t0} className="text-[22px] font-bold leading-snug sm:text-[24px]">
        {words.map((w, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={i < shown ? { opacity: 1, y: 0 } : { opacity: 0.15, y: 0 }}
            transition={{ duration: 0.18 }}
            className="mr-[0.28em] inline-block"
            style={i === shown - 1 ? { color: accent } : undefined}
          >
            {w}
          </motion.span>
        ))}
      </p>
    </div>
  );
}
