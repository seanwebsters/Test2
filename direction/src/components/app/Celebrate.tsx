"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Pip } from "@/components/brand/Pip";

export interface Celebration {
  kind: "mission" | "level" | "achievement" | "path" | "challenge" | "upgrade" | "rank";
  title: string;
  subtitle?: string;
  xp?: number;
  achievements?: { id: string; name: string; emoji: string; xp: number }[];
  streak?: { current: number; outcome: string; earnedFreeze?: boolean };
  level?: { level: number; title: string; milestone: string } | null;
  rankUp?: number | null;
}

interface Toast {
  id: number;
  text: string;
  tone: "ok" | "error";
}

interface Ctx {
  celebrate: (c: Celebration) => void;
  toast: (text: string, tone?: "ok" | "error") => void;
}

const CelebrationContext = createContext<Ctx>({ celebrate: () => {}, toast: () => {} });

export function useCelebrate() {
  return useContext(CelebrationContext);
}

const COLORS = ["#0EAA9C", "#7EE7C4", "#FF7A68", "#A894FF", "#FFCE54"];

function Confetti() {
  const reduce = useReducedMotion();
  const pieces = useMemo(
    () =>
      Array.from({ length: reduce ? 0 : 46 }, (_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 520,
        y: -(160 + Math.random() * 260),
        r: Math.random() * 540 - 270,
        c: COLORS[i % COLORS.length]!,
        w: 6 + Math.random() * 8,
        round: Math.random() > 0.6,
        d: Math.random() * 0.15,
      })),
    [reduce],
  );
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2" aria-hidden="true">
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className="absolute block"
          style={{ width: p.w, height: p.round ? p.w : p.w * 0.45, background: p.c, borderRadius: p.round ? 999 : 2 }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
          animate={{ x: p.x, y: [0, p.y, p.y + 420], opacity: [1, 1, 0], rotate: p.r }}
          transition={{ duration: 1.8, delay: p.d, ease: [0.15, 0.7, 0.4, 1] }}
        />
      ))}
    </div>
  );
}

function CountUp({ to }: { to: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 700);
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [to]);
  return <>{n}</>;
}

export function CelebrationProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<Celebration[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const current = queue[0];

  const celebrate = useCallback((c: Celebration) => setQueue((q) => [...q, c]), []);
  const toast = useCallback((text: string, tone: "ok" | "error" = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);
  const dismiss = () => setQueue((q) => q.slice(1));

  const big = current && (current.kind !== "mission" || !!current.level || !!current.achievements?.length || !!current.rankUp);

  return (
    <CelebrationContext.Provider value={{ celebrate, toast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[70] flex flex-col items-center gap-2 px-4" aria-live="polite">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className={`pointer-events-auto max-w-md rounded-2xl px-4 py-3 text-sm font-semibold shadow-lift ${t.tone === "error" ? "bg-coral text-white" : "bg-ink text-bg"}`}
            >
              {t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {current && (
          <motion.div
            key={`${current.kind}-${current.title}-${queue.length}`}
            className="fixed inset-0 z-[60] grid place-items-center bg-navy/60 p-5 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={dismiss}
            role="dialog"
            aria-modal="true"
            aria-label={current.title}
          >
            <Confetti />
            <motion.div
              className="relative w-full max-w-sm overflow-hidden rounded-5xl bg-bg p-6 text-center shadow-lift"
              initial={{ scale: 0.8, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 22 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-mint-soft to-transparent" />
              <div className="relative mx-auto -mb-2 w-fit">
                <Pip mood={big ? "excited" : "proud"} size={110} />
              </div>
              {current.level && (
                <div className="relative mb-2 inline-flex rounded-full bg-sun px-3 py-1 font-display text-xs font-extrabold uppercase tracking-wider text-navy">Level {current.level.level} complete</div>
              )}
              <h2 className="h-display relative text-2xl text-balance">{current.level ? current.level.title : current.title}</h2>
              <p className="relative mt-1 text-sm text-ink-2">{current.level ? current.level.milestone : current.subtitle}</p>
              {current.xp ? (
                <div className="relative mt-4 font-display text-4xl font-extrabold text-teal">
                  +<CountUp to={current.xp} /> XP
                </div>
              ) : null}
              {current.rankUp && <div className="relative mt-2 text-sm font-bold text-lavender">You reached rank {current.rankUp}! 🎉</div>}
              {current.streak && current.streak.outcome !== "same-day" && (
                <div className="relative mt-3 text-sm font-semibold text-coral">
                  🔥 {current.streak.current}-day streak{current.streak.outcome === "protected" ? " — a streak freeze saved it!" : ""}
                  {current.streak.earnedFreeze ? " · earned a streak freeze ❄️" : ""}
                </div>
              )}
              {current.achievements && current.achievements.length > 0 && (
                <div className="relative mt-4 space-y-2">
                  {current.achievements.map((a) => (
                    <motion.div key={a.id} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="flex items-center gap-3 rounded-2xl bg-sun-soft p-3 text-left">
                      <span className="text-2xl">{a.emoji}</span>
                      <div>
                        <div className="eyebrow !text-[10px]">Badge unlocked</div>
                        <div className="font-display font-bold">{a.name}</div>
                      </div>
                      <span className="ml-auto text-sm font-bold text-teal">+{a.xp}</span>
                    </motion.div>
                  ))}
                </div>
              )}
              <button className="btn-primary relative mt-6 w-full" onClick={dismiss} autoFocus>
                {queue.length > 1 ? "Next" : "Keep going"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </CelebrationContext.Provider>
  );
}
