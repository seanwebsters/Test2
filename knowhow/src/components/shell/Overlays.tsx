"use client";
import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useApp, ApiError } from "@/components/providers/AppState";
import { useCatalog } from "@/components/providers/CatalogProvider";
import { usePlayer } from "@/components/player/PlayerProvider";
import { KnowledgeCard } from "@/components/cards/KnowledgeCard";
import { Bookmark, Clock, Crown, Flame, ListMusic, Lock, Moon, X, Zap } from "@/components/ui/Icon";
import { cardView } from "@/lib/cards";
import { UNLOCK_COST } from "@/lib/entitlements";
import { RARITY_STYLE } from "@/lib/gamification";

const ICONS = { zap: Zap, flame: Flame, bookmark: Bookmark, moon: Moon, list: ListMusic } as const;
const TONES = { lime: "#DFFF57", lavender: "#B6A1FF", coral: "#FF7768", plain: "#F7F4E9" } as const;

export function Toasts() {
  const { toasts, dismissToast } = useApp();
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col items-center gap-2 px-4" style={{ paddingTop: "calc(12px + var(--safe-top))" }} aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => {
          const Icon = t.icon ? ICONS[t.icon as keyof typeof ICONS] : null;
          const color = TONES[t.tone ?? "plain"];
          return (
            <motion.button
              key={t.id}
              layout
              initial={{ y: -30, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -20, opacity: 0, scale: 0.95 }}
              onClick={() => dismissToast(t.id)}
              className="pointer-events-auto flex max-w-sm items-center gap-3 rounded-full border border-white/10 bg-ink-2/95 py-2 pl-2 pr-5 text-left shadow-2xl backdrop-blur-xl"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink" style={{ background: color }}>
                {Icon ? <Icon size={16} /> : <Zap size={16} />}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold" style={{ color }}>{t.title}</span>
                {t.body && <span className="block truncate text-xs text-cream-dim">{t.body}</span>}
              </span>
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

/** Full-screen moments for genuine milestones: level ups and card unlocks. */
export function Celebration() {
  const { celebrations, shiftCelebration, state } = useApp();
  const { bySlug } = useCatalog();
  const e = celebrations[0];
  const card = e?.type === "card" ? cardView(e.key, e.rarity, bySlug) : null;
  const unlockedAt = e?.type === "card" ? state?.cards.find((c) => c.key === e.key)?.unlockedAt : undefined;
  return (
    <AnimatePresence>
      {e && (
        <motion.div key={JSON.stringify(e)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] grid place-items-center bg-black/80 p-6 backdrop-blur-md" onClick={shiftCelebration} role="dialog" aria-modal>
          <Burst color={e.type === "card" ? RARITY_STYLE[e.rarity].color : "#DFFF57"} />
          <motion.div initial={{ scale: 0.6, rotate: -8, y: 40 }} animate={{ scale: 1, rotate: 0, y: 0 }} transition={{ type: "spring", stiffness: 220, damping: 16 }} className="relative w-full max-w-xs text-center" onClick={(ev) => ev.stopPropagation()}>
            {e.type === "level" && (
              <>
                <div className="eyebrow text-lime">Level up</div>
                <div className="display mt-3 text-[120px] leading-none text-lime">{e.level}</div>
                <div className="display mt-2 text-3xl">{e.title}</div>
                <p className="mt-3 text-sm text-cream-dim">Your brain is officially bigger than it was this morning.</p>
              </>
            )}
            {card && e.type === "card" && (
              <>
                <div className="eyebrow mb-4" style={{ color: RARITY_STYLE[e.rarity].color }}>New {RARITY_STYLE[e.rarity].label} knowledge card</div>
                <KnowledgeCard card={card} unlockedAt={unlockedAt} />
                <p className="mt-4 text-sm text-cream-dim">{card.how}</p>
              </>
            )}
            <button onClick={shiftCelebration} className="btn-lime mt-6 w-full">Keep going</button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Burst({ color }: { color: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {Array.from({ length: 22 }, (_, i) => {
        const a = (i / 22) * Math.PI * 2;
        return (
          <motion.span
            key={i}
            className="absolute left-1/2 top-1/2 h-2 w-2 rounded-full"
            style={{ background: i % 3 ? color : "#F7F4E9" }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: Math.cos(a) * (180 + (i % 4) * 40), y: Math.sin(a) * (180 + (i % 4) * 40), opacity: 0, scale: 0.4 }}
            transition={{ duration: 1.3, ease: "easeOut" }}
          />
        );
      })}
    </div>
  );
}

/** Shown when an episode can't play: premium, daily limit or not out yet. Everything is enforced server-side. */
export function GateSheet() {
  const p = usePlayer();
  const { state, api, toast } = useApp();
  const [busy, setBusy] = useState(false);
  const gate = p.gate;
  const unlock = async () => {
    if (!gate) return;
    setBusy(true);
    try {
      await api("/api/unlock", { body: { episodeId: gate.item.id } });
      toast({ title: "Episode unlocked", body: `${UNLOCK_COST} credits spent`, tone: "lime" });
      const item = gate.item;
      p.clearGate();
      await p.play(item);
    } catch (e) {
      toast({ title: e instanceof ApiError && e.code === "insufficient_credits" ? "Not enough credits" : "Couldn't unlock", body: e instanceof Error ? e.message : undefined, tone: "coral" });
    } finally {
      setBusy(false);
    }
  };
  return (
    <AnimatePresence>
      {gate && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[65] flex items-end justify-center bg-black/70 backdrop-blur-sm md:items-center" onClick={p.clearGate}>
          <motion.div
            initial={{ y: 60 }}
            animate={{ y: 0 }}
            exit={{ y: 60 }}
            className="w-full max-w-md rounded-t-[32px] border border-white/10 bg-ink-2 p-6 md:rounded-[32px]"
            style={{ paddingBottom: "calc(24px + var(--safe-bottom))" }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal
          >
            <div className="flex items-start justify-between">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-lime text-ink">{gate.reason === "daily_limit" ? <Clock size={22} /> : <Lock size={22} />}</div>
              <button onClick={p.clearGate} className="grid h-9 w-9 place-items-center rounded-full bg-white/10" aria-label="Close"><X size={16} /></button>
            </div>
            {gate.reason === "locked" && (
              <>
                <h3 className="display mt-5 text-2xl">This one&apos;s premium</h3>
                <p className="mt-2 text-sm text-cream-dim">
                  <strong className="text-cream">{gate.item.seriesTitle} · Ep {gate.item.n}</strong> is part of KNOWHOW+. Unlock it with credits, or go unlimited.
                </p>
                <button onClick={unlock} disabled={busy} className="btn-lime mt-6 w-full">
                  Unlock for {UNLOCK_COST} credits <span className="opacity-60">· you have {state?.credits ?? 0}</span>
                </button>
                <Link href="/plus" onClick={p.clearGate} className="btn-ghost mt-2 w-full"><Crown size={16} /> Get KNOWHOW+ · £9.99/mo</Link>
                <Link href="/wallet" onClick={p.clearGate} className="mt-3 block text-center text-xs text-cream-mute underline-offset-4 hover:underline">Top up credits</Link>
              </>
            )}
            {gate.reason === "daily_limit" && (
              <>
                <h3 className="display mt-5 text-2xl">That&apos;s today&apos;s free listening</h3>
                <p className="mt-2 text-sm text-cream-dim">Free listening resets tomorrow. Discover previews are always free — or go unlimited with KNOWHOW+.</p>
                <Link href="/plus" onClick={p.clearGate} className="btn-lime mt-6 w-full"><Crown size={16} /> Go unlimited</Link>
                <Link href="/discover" onClick={p.clearGate} className="btn-ghost mt-2 w-full">Browse free previews</Link>
              </>
            )}
            {(gate.reason === "upcoming" || gate.reason === "no_audio") && (
              <>
                <h3 className="display mt-5 text-2xl">Coming soon</h3>
                <p className="mt-2 text-sm text-cream-dim">This episode is still in production. Follow the series and it&apos;ll land in your feed.</p>
                <button onClick={p.clearGate} className="btn-ghost mt-6 w-full">Got it</button>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
