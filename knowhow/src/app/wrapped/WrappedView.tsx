"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useApp } from "@/components/providers/AppState";
import { useCatalog } from "@/components/providers/CatalogProvider";
import { Download, Share2, X } from "@/components/ui/Icon";
import { computeWrapped } from "@/lib/wrapped";

const SLIDE_MS = 5200;

export function WrappedView() {
  const { state, toast } = useApp();
  const { bySlug } = useCatalog();
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const w = useMemo(() => (state ? computeWrapped(state, bySlug) : null), [state, bySlug]);

  const slides = useMemo(() => {
    if (!w) return [];
    return [
      { bg: "#DFFF57", fg: "#111114", node: <Big kicker="This year in your brain" big={`${w.minutes}`} small="minutes of listening. Not scrolling. Listening." /> },
      { bg: "#B6A1FF", fg: "#111114", node: <Big kicker="You finished" big={`${w.episodes}`} small={`episode${w.episodes === 1 ? "" : "s"} — every one a new star in your universe.`} /> },
      {
        bg: "#FF92C7", fg: "#111114",
        node: (
          <div>
            <Kicker>Your favourite subjects</Kicker>
            <ol className="mt-6 space-y-3">
              {(w.favourites.length ? w.favourites : [{ id: "none", label: "Still warming up", color: "#111114", minutes: 0 }]).map((f, n) => (
                <motion.li key={f.id} initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 + n * 0.15 }} className="display flex items-baseline gap-4 text-[clamp(32px,10vw,64px)]">
                  <span className="text-[0.5em] opacity-50">{n + 1}</span>{f.label}
                </motion.li>
              ))}
            </ol>
          </div>
        ),
      },
      {
        bg: "#587BFF", fg: "#F7F4E9",
        node: (
          <div>
            <Kicker>Most explored topics</Kicker>
            <div className="mt-6 flex flex-wrap gap-2">
              {(w.topics.length ? w.topics : [{ label: "Finish an episode to find out", count: 0 }]).map((t, n) => (
                <motion.span key={t.label} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2 + n * 0.1, type: "spring" }} className="rounded-full bg-cream px-5 py-3 text-xl font-bold text-ink md:text-2xl">{t.label}</motion.span>
              ))}
            </div>
          </div>
        ),
      },
      { bg: "#FF7768", fg: "#111114", node: <Big kicker="Longest learning streak" big={`${w.longestStreak}`} small={`day${w.longestStreak === 1 ? "" : "s"} in a row. ${w.completedSeries.length ? `And ${w.completedSeries.length} full series completed.` : ""}`} /> },
      {
        bg: "#111114", fg: "#F7F4E9",
        node: (
          <div>
            <Kicker>The most surprising thing you learned</Kicker>
            <p className="editorial mt-6 text-[clamp(28px,7vw,52px)] leading-[1.1]">{w.fact ? `“${w.fact}”` : "Nothing saved yet. Bookmark a line while you listen and it'll show up here."}</p>
          </div>
        ),
      },
      {
        bg: "linear-gradient(160deg,#DFFF57,#B6A1FF 60%,#FF92C7)", fg: "#111114",
        node: (
          <div>
            <Kicker>Your learning personality</Kicker>
            <motion.div initial={{ scale: 0.6, rotate: -6, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 120 }} className="display mt-6 text-[clamp(44px,12vw,96px)]">{w.personality.name}</motion.div>
            <p className="editorial mt-4 text-3xl">{w.personality.line}</p>
          </div>
        ),
      },
    ];
  }, [w]);

  const last = slides.length; // share slide index
  useEffect(() => {
    if (paused || !slides.length || i >= last) return;
    const t = setTimeout(() => setI((x) => x + 1), SLIDE_MS);
    return () => clearTimeout(t);
  }, [i, paused, slides.length, last]);

  const share = async () => {
    try {
      const res = await fetch("/api/wrapped/card");
      const blob = await res.blob();
      const file = new File([blob], "knowhow-brain-wrapped.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: "My Brain Wrapped" });
      else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "knowhow-brain-wrapped.png";
        a.click();
      }
    } catch {
      toast({ title: "Couldn't share", tone: "coral" });
    }
  };

  if (!w) return <div className="grid h-[100svh] place-items-center"><div className="skeleton h-[70vh] w-[min(420px,90vw)]" /></div>;
  const slide = slides[i];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
      <div className="relative h-full w-full max-w-[480px] overflow-hidden md:h-[90vh] md:rounded-[36px]">
        <div className="absolute inset-x-3 top-[calc(10px+var(--safe-top))] z-20 flex gap-1">
          {[...slides, null].map((_, n) => (
            <div key={n} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
              <motion.div className="h-full bg-white" initial={false} animate={{ width: n < i ? "100%" : n === i && !paused && i < last ? "100%" : n === i && i === last ? "100%" : "0%" }} transition={{ duration: n === i && i < last ? SLIDE_MS / 1000 : 0, ease: "linear" }} />
            </div>
          ))}
        </div>
        <Link href="/profile" className="absolute right-3 top-[calc(22px+var(--safe-top))] z-30 grid h-10 w-10 place-items-center rounded-full bg-black/25 text-white" aria-label="Close"><X size={18} /></Link>

        <AnimatePresence mode="wait">
          {slide ? (
            <motion.div key={i} initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }} className="absolute inset-0 flex flex-col justify-center px-7" style={{ background: slide.bg, color: slide.fg }}>
              {slide.node}
              <div className="absolute bottom-[calc(24px+var(--safe-bottom))] left-7 text-xs font-bold uppercase tracking-[0.2em] opacity-60">KNOWHOW · Brain Wrapped</div>
            </motion.div>
          ) : (
            <motion.div key="share" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-ink px-6">
              <Kicker>Your recap card</Kicker>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/wrapped/card?v=${state?.xp}`} alt={`Brain Wrapped card: ${w.personality.name}, ${w.minutes} minutes listened`} className="w-full max-w-[340px] rounded-3xl shadow-2xl" />
              <div className="flex w-full max-w-[340px] gap-2">
                <button onClick={share} className="btn-lime flex-1"><Share2 size={16} /> Share</button>
                <a href="/api/wrapped/card" download="knowhow-brain-wrapped.png" className="btn-ghost flex-1"><Download size={16} /> Save</a>
              </div>
              <button onClick={() => setI(0)} className="text-sm text-cream-mute hover:text-cream">Watch again</button>
            </motion.div>
          )}
        </AnimatePresence>

        {i < last && (
          <div className="absolute inset-0 z-10 flex">
            <button className="w-1/3" aria-label="Previous" onClick={() => setI((x) => Math.max(0, x - 1))} />
            <button className="flex-1" aria-label="Next" onClick={() => setI((x) => x + 1)} onPointerDown={() => setPaused(true)} onPointerUp={() => setPaused(false)} onPointerLeave={() => setPaused(false)} />
          </div>
        )}
      </div>
    </div>
  );
}

function Kicker({ children }: { children: React.ReactNode }) {
  return <div className="text-xs font-bold uppercase tracking-[0.22em] opacity-70">{children}</div>;
}

function Big({ kicker, big, small }: { kicker: string; big: string; small: string }) {
  return (
    <div>
      <Kicker>{kicker}</Kicker>
      <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 120, delay: 0.1 }} className="display mt-4 text-[clamp(96px,32vw,180px)] leading-[0.85]">{big}</motion.div>
      <p className="editorial mt-4 text-[28px] leading-tight">{small}</p>
    </div>
  );
}
