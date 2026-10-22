"use client";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { CoverArt } from "@/components/art/Cover";
import { Loader2, Pause, Play, RotateCw } from "@/components/ui/Icon";
import { usePlayer } from "./PlayerProvider";
import { cn } from "@/lib/cn";

export function MiniPlayer() {
  const p = usePlayer();
  const pathname = usePathname();
  const hidden = !p.current || p.expanded || pathname.startsWith("/onboarding") || pathname.startsWith("/discover");
  const pct = p.duration ? Math.min(100, (p.position / p.duration) * 100) : 0;
  const accent = p.current?.art.palette[1] ?? "#DFFF57";
  return (
    <AnimatePresence>
      {!hidden && p.current && (
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
          className="fixed inset-x-3 bottom-[calc(80px+var(--safe-bottom))] z-30 md:inset-x-auto md:bottom-5 md:left-[100px] md:right-6 xl:left-[268px]"
        >
          <div
            role="button"
            tabIndex={0}
            onClick={() => p.setExpanded(true)}
            onKeyDown={(e) => e.key === "Enter" && p.setExpanded(true)}
            aria-label={`Open player: ${p.current.title}`}
            className="relative mx-auto flex max-w-3xl cursor-pointer items-center gap-3 overflow-hidden rounded-[22px] border border-white/10 p-2 pr-3 shadow-[0_20px_50px_rgba(0,0,0,0.55)] backdrop-blur-xl"
            style={{ background: `linear-gradient(100deg, ${p.current.art.palette[0]}F2, #1D1D22F2 60%)` }}
          >
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[14px]">
              <CoverArt art={p.current.art} seed={p.current.seed} />
              {p.playing && (
                <div className="absolute inset-0 flex items-end justify-center gap-[3px] bg-black/25 pb-2.5">
                  {[0, 0.2, 0.4].map((d) => <span key={d} className="h-4 w-[3px] origin-bottom animate-eq rounded-full bg-cream" style={{ animationDelay: `${d}s` }} />)}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{p.current.title}</div>
              <div className="truncate text-xs text-cream-dim">
                {p.current.seriesTitle} · Ep {p.current.n}
                {p.usingBrowserVoice && <span className="ml-1 text-lavender">· browser voice</span>}
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); p.skip(15); }}
              className="hidden h-10 w-10 place-items-center rounded-full text-cream-dim transition hover:bg-white/10 hover:text-cream sm:grid"
              aria-label="Skip forward 15 seconds"
            >
              <RotateCw size={19} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); p.toggle(); }}
              className={cn("grid h-11 w-11 place-items-center rounded-full text-ink transition active:scale-90")}
              style={{ background: accent }}
              aria-label={p.playing ? "Pause" : "Play"}
            >
              {p.loading ? <Loader2 size={20} className="animate-spin" /> : p.playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
            </button>
            <div className="absolute inset-x-3 bottom-0 h-[2px] overflow-hidden rounded-full bg-white/10">
              <div className="h-full" style={{ width: `${pct}%`, background: accent }} />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
