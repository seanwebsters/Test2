"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Pause, Play } from "lucide-react";
import { Art } from "@/components/art/Art";
import type { ArtStyle, DisplayFont, Palette } from "@/lib/content/types";
import { track } from "@/lib/view/client-api";

/**
 * Motion teaser: a cinematic sequence built from the universe's own art and
 * story beats. (A real trailer video can replace this when one is uploaded.)
 */
export function Teaser({ universeId, title, font, palette, style, seed, beats }: { universeId: string; title: string; font: DisplayFont; palette: Palette; style: ArtStyle; seed: number; beats: string[] }) {
  const [playing, setPlaying] = useState(false);
  const [i, setI] = useState(0);
  const frames = [...beats, title];
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setI((x) => (x + 1) % frames.length), 3200);
    return () => clearInterval(t);
  }, [playing, frames.length]);
  return (
    <div className="relative aspect-video overflow-hidden rounded-3xl border border-white/10" style={{ background: palette.bg }}>
      <motion.div className="nx-animate absolute inset-0" animate={playing ? { scale: [1, 1.12], x: [0, -24] } : { scale: 1 }} transition={{ duration: 16, ease: "linear", repeat: playing ? Infinity : 0, repeatType: "mirror" }}>
        <Art style={style} palette={palette} seed={seed + i * 13} aspect="hero" sceneOnly className="h-full w-full" />
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40" />
      <div className="absolute inset-x-0 bottom-0 flex min-h-[40%] items-end p-6 md:p-10">
        <AnimatePresence mode="wait">
          {playing ? (
            <motion.p key={i} initial={{ opacity: 0, y: 12, filter: "blur(6px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.8 }} className={`${i === frames.length - 1 ? `ff-${font} text-5xl md:text-7xl` : "max-w-2xl text-xl font-semibold md:text-3xl"}`} style={{ color: palette.ink }}>
              {frames[i]}
            </motion.p>
          ) : (
            <motion.p key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
              Motion teaser
            </motion.p>
          )}
        </AnimatePresence>
      </div>
      <button
        onClick={() => {
          setPlaying((p) => !p);
          if (!playing) track("trailer_played", universeId);
        }}
        className="focus-ring absolute left-1/2 top-1/2 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink shadow-lift transition hover:scale-105 data-[on=true]:left-auto data-[on=true]:right-5 data-[on=true]:top-5 data-[on=true]:h-11 data-[on=true]:w-11 data-[on=true]:translate-x-0 data-[on=true]:translate-y-0"
        data-on={playing}
        aria-label={playing ? "Pause teaser" : "Play teaser"}
      >
        {playing ? <Pause size={18} /> : <Play size={24} className="ml-1" />}
      </button>
    </div>
  );
}
