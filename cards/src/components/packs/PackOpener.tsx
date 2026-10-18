"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useMotionValue, useTransform } from "motion/react";
import { ChevronsRight, Loader2, Sparkles, Volume2, VolumeX } from "lucide-react";
import { Art } from "@/components/art/Art";
import { CardBack } from "@/components/cards/CardBack";
import { RarityLabel } from "@/components/cards/RarityGem";
import { TradingCard } from "@/components/cards/TradingCard";
import { prefersReducedMotion, useViewer } from "@/components/shell/Viewer";
import { DustIcon } from "@/components/ui/Currency";
import { btn } from "@/components/ui/styles";
import type { ArtStyle, DisplayFont, Palette, Rarity } from "@/lib/content/types";
import type { PackOpening, Wallet } from "@/lib/db/types";
import { RARITY_META, VARIANT_META, rarityRank } from "@/lib/economy/config";
import type { PackTypeId } from "@/lib/economy/packs";
import type { CardFace } from "@/lib/view/face";
import { ApiError, post } from "@/lib/view/client-api";
import { haptic, isMuted, play, RARITY_HAPTICS, setMuted } from "./sfx";

export interface PackUniverse {
  id: string;
  slug: string;
  title: string;
  font: DisplayFont;
  palette: Palette;
  style: ArtStyle;
  seed: number;
}

interface Props {
  packType: PackTypeId;
  packName: string;
  cardCount: number;
  universe: PackUniverse;
  episodeId?: string;
  useToken?: boolean;
  /** Shown instead of the open action when the pack can't be opened. */
  blocked?: string;
  costLabel?: string;
  onComplete?: (opening: PackOpening, faces: Record<string, CardFace>) => void;
  /** Replaces the summary's primary action */
  onDone?: () => void;
  /** Hide "open another" (onboarding) */
  single?: boolean;
  doneHref?: string;
  doneLabel?: string;
  /** Rendered above the pack while choosing (e.g. a universe picker) */
  header?: React.ReactNode;
}

type Phase = "ready" | "requesting" | "tearing" | "reveal" | "summary";

interface Result {
  opening: PackOpening;
  faces: Record<string, CardFace>;
  wallet: Wallet;
}

const newKey = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

/* ------------------------------------------------------------------ */

export function PackFace({ universe, packName, cardCount, glow = 0 }: { universe: PackUniverse; packName: string; cardCount: number; glow?: number }) {
  const p = universe.palette;
  const crimp = "polygon(0 2%, 4% 0, 8% 2%, 12% 0, 16% 2%, 20% 0, 24% 2%, 28% 0, 32% 2%, 36% 0, 40% 2%, 44% 0, 48% 2%, 52% 0, 56% 2%, 60% 0, 64% 2%, 68% 0, 72% 2%, 76% 0, 80% 2%, 84% 0, 88% 2%, 92% 0, 96% 2%, 100% 0, 100% 100%, 96% 98%, 92% 100%, 88% 98%, 84% 100%, 80% 98%, 76% 100%, 72% 98%, 68% 100%, 64% 98%, 60% 100%, 56% 98%, 52% 100%, 48% 98%, 44% 100%, 40% 98%, 36% 100%, 32% 98%, 28% 100%, 24% 98%, 20% 100%, 16% 98%, 12% 100%, 8% 98%, 4% 100%, 0 98%)";
  return (
    <div className="relative h-full w-full" style={{ clipPath: crimp, background: p.bg }}>
      <div className="nx-animate absolute inset-0">
        <Art style={universe.style} palette={p} seed={universe.seed + 11} aspect="tall" sceneOnly className="h-full w-full" />
      </div>
      <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${p.bg}00 30%, ${p.bg}ee 78%)` }} />
      {/* foil */}
      <div className="absolute inset-0 opacity-50 mix-blend-color-dodge" style={{ background: "linear-gradient(115deg, transparent 20%, rgba(255,255,255,.35) 35%, transparent 45%, rgba(255,200,255,.25) 60%, transparent 70%)" }} />
      <div className="absolute inset-x-0 top-[17.5%] border-t border-dashed" style={{ borderColor: `${p.ink}55` }} />
      <div className="absolute inset-x-0 top-[5%] flex justify-center">
        <span className="font-brand text-[11px] font-semibold tracking-[0.42em]" style={{ color: p.ink }}>NEXARA</span>
      </div>
      <div className="absolute inset-x-0 bottom-[7%] flex flex-col items-center px-4 text-center">
        <span className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: p.accent }}>{packName}</span>
        <span className={`ff-${universe.font} mt-2 text-[34px] leading-none`} style={{ color: p.ink }}>{universe.title}</span>
        <span className="mt-2 text-[11px] font-semibold tracking-[0.18em]" style={{ color: `${p.ink}aa` }}>{cardCount} CARDS</span>
      </div>
      {glow > 0 && <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 50% 12%, ${p.accent}${Math.round(glow * 200).toString(16).padStart(2, "0")}, transparent 60%)` }} />}
    </div>
  );
}

function Burst({ color, count, spread, colors }: { color: string; count: number; spread: number; colors?: string[] }) {
  const parts = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2 + Math.random() * 0.4;
        const d = spread * (0.5 + Math.random() * 0.7);
        return { x: Math.cos(a) * d, y: Math.sin(a) * d, s: 3 + Math.random() * 6, c: colors ? colors[i % colors.length] : color, delay: Math.random() * 0.15 };
      }),
    [count, spread, color, colors],
  );
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 z-30" aria-hidden>
      {parts.map((p, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full"
          style={{ width: p.s, height: p.s, background: p.c, boxShadow: `0 0 12px ${p.c}` }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: p.x, y: p.y, opacity: 0, scale: 0.3 }}
          transition={{ duration: 1.1 + Math.random() * 0.6, ease: [0.1, 0.7, 0.3, 1], delay: p.delay }}
        />
      ))}
    </div>
  );
}

const MYTHIC_COLORS = ["#ff5fd2", "#ffb35f", "#fff26b", "#5fffb0", "#5fd0ff", "#a65fff"];

/* ------------------------------------------------------------------ */

export function PackOpener(props: Props) {
  const { packType, packName, cardCount, universe, episodeId, useToken, blocked, costLabel, onComplete, single, doneHref, doneLabel, header, onDone } = props;
  const { viewer, setWallet } = useViewer();
  const router = useRouter();
  const sound = viewer.settings.sound;
  const haptics = viewer.settings.haptics;
  const [reduced, setReduced] = useState(false);
  const [muted, setMutedState] = useState(false);
  const [phase, setPhase] = useState<Phase>("ready");
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<Result>();
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState<boolean[]>([]);
  const [charging, setCharging] = useState(false);
  const [flash, setFlash] = useState<string>();
  const [bursts, setBursts] = useState<number>(0);
  const intentKey = `nx-intent:${packType}:${universe.id}:${episodeId ?? ""}`;
  const busy = useRef(false);

  useEffect(() => {
    setReduced(prefersReducedMotion(viewer));
    setMutedState(isMuted());
  }, [viewer]);

  // Order reveals so the best card comes last.
  const items = useMemo(() => (result ? [...result.opening.items].sort((a, b) => rarityRank(a.rarity) - rarityRank(b.rarity) || a.slot - b.slot) : []), [result]);

  const request = useCallback(
    async (resume: boolean) => {
      if (busy.current) return;
      busy.current = true;
      setError(undefined);
      let key: string;
      try {
        key = sessionStorage.getItem(intentKey) ?? newKey();
        sessionStorage.setItem(intentKey, key);
      } catch {
        key = newKey();
      }
      setPhase("requesting");
      haptic(10, haptics);
      try {
        const r = await post<Result>("/api/packs/open", { packType, universeId: universe.id, episodeId, idempotencyKey: key, useToken });
        setResult(r);
        setWallet(r.wallet);
        setFlipped(r.opening.items.map(() => false));
        setIndex(0);
        if (resume || reduced) {
          setPhase("reveal");
        } else {
          setPhase("tearing");
          play("tear", sound);
          haptic([20, 30, 60], haptics);
          setTimeout(() => setPhase("reveal"), 1500);
        }
      } catch (e) {
        try {
          sessionStorage.removeItem(intentKey);
        } catch {
          /* ignore */
        }
        setError(e instanceof ApiError ? e.message : "Couldn't open the pack. Check your connection and try again.");
        setPhase("ready");
      } finally {
        busy.current = false;
      }
    },
    [episodeId, haptics, intentKey, packType, reduced, setWallet, sound, universe.id, useToken],
  );

  // Resume an interrupted opening (e.g. a refresh mid-animation): same key, same cards.
  useEffect(() => {
    try {
      if (sessionStorage.getItem(intentKey)) void request(true);
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finish = useCallback(() => {
    try {
      sessionStorage.removeItem(intentKey);
    } catch {
      /* ignore */
    }
    setPhase("summary");
    play("summary", sound);
    if (result) onComplete?.(result.opening, result.faces);
    router.refresh();
  }, [intentKey, onComplete, result, router, sound]);

  const flip = useCallback(
    (i: number) => {
      const item = items[i];
      if (!item || flipped[i] || charging) return;
      const r = item.rarity;
      const big = rarityRank(r) >= rarityRank("legendary");
      const doFlip = () => {
        setCharging(false);
        setFlipped((f) => f.map((x, k) => (k === i ? true : x)));
        play("flip", sound);
        setTimeout(() => play(r, sound), 120);
        haptic(RARITY_HAPTICS[r], haptics);
        if (rarityRank(r) >= rarityRank("rare")) setBursts((b) => b + 1);
        if (big && !reduced) {
          setFlash(r === "mythic" ? "#ffffff" : "#ffe7a0");
          setTimeout(() => setFlash(undefined), 450);
        }
      };
      if (big && !reduced) {
        setCharging(true);
        haptic([15, 60, 15, 60, 15], haptics);
        setTimeout(doFlip, r === "mythic" ? 2200 : 1200);
      } else doFlip();
    },
    [charging, flipped, haptics, items, reduced, sound],
  );

  const advance = useCallback(() => {
    if (!flipped[index]) return flip(index);
    if (index >= items.length - 1) return finish();
    play("deal", sound);
    setIndex((i) => i + 1);
  }, [finish, flip, flipped, index, items.length, sound]);

  // Keyboard: space/enter/right arrow advance; escape skips.
  useEffect(() => {
    if (phase !== "reveal") return;
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowRight", " ", "Enter"].includes(e.key)) {
        e.preventDefault();
        advance();
      }
      if (e.key === "Escape") finish();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance, finish, phase]);

  const toggleMute = () => {
    setMuted(!muted);
    setMutedState(!muted);
  };

  /* ---------------- render ---------------- */

  const current = items[index];
  const currentFace = current && result ? result.faces[current.cardId] : undefined;
  const currentRarity: Rarity | undefined = current?.rarity;
  const isFlipped = !!flipped[index];
  const mythicMoment = currentRarity === "mythic" && (charging || isFlipped);

  return (
    <div className="relative isolate min-h-[calc(100svh-4rem)] overflow-hidden" style={{ background: `radial-gradient(ellipse at 50% 35%, ${universe.palette.surface}, #050507 70%)` }}>
      <motion.div className="absolute inset-0 -z-10 bg-black" animate={{ opacity: phase === "ready" ? 0.35 : mythicMoment ? 0.96 : 0.72 }} transition={{ duration: 0.8 }} />

      <div className="absolute right-4 top-4 z-40 flex gap-2">
        <button onClick={toggleMute} className="glass focus-ring grid h-10 w-10 place-items-center rounded-full" aria-label={muted ? "Unmute sound effects" : "Mute sound effects"}>
          {muted || !sound ? <VolumeX size={17} /> : <Volume2 size={17} />}
        </button>
        {phase === "reveal" && (
          <button onClick={finish} className="glass focus-ring flex h-10 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold">
            Reveal all <ChevronsRight size={16} />
          </button>
        )}
      </div>

      <AnimatePresence>{flash && <motion.div key="flash" className="pointer-events-none fixed inset-0 z-50" style={{ background: flash }} initial={{ opacity: 0.9 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }} />}</AnimatePresence>

      {phase === "ready" && header && <div className="absolute inset-x-0 top-16 z-30 flex justify-center px-4">{header}</div>}
      {(phase === "ready" || phase === "requesting" || phase === "tearing") && (
        <ReadyStage
          universe={universe}
          packName={packName}
          cardCount={cardCount}
          phase={phase}
          reduced={reduced}
          blocked={blocked}
          costLabel={costLabel}
          error={error}
          onOpen={() => void request(false)}
          hoverSound={() => play("hover", sound)}
        />
      )}

      {phase === "reveal" && current && currentFace && (
        <div className="flex min-h-[calc(100svh-4rem)] flex-col items-center justify-center px-4 pb-10 pt-20">
          <div className="mb-6 flex gap-1.5" aria-label={`Card ${index + 1} of ${items.length}`}>
            {items.map((it, i) => (
              <span key={i} className="h-1.5 w-6 rounded-full transition" style={{ background: i < index || (i === index && isFlipped) ? RARITY_META[it.rarity].color : "rgba(255,255,255,.15)" }} />
            ))}
          </div>

          <div className="relative grid w-[min(74vw,330px)] place-items-center">
            {/* rarity aura + rays */}
            {currentRarity && rarityRank(currentRarity) >= rarityRank("rare") && (isFlipped || charging) && !reduced && (
              <motion.div
                className="absolute -inset-[45%] -z-10 rounded-full"
                style={{
                  background:
                    currentRarity === "mythic"
                      ? "conic-gradient(from 0deg, #ff5fd2, #ffb35f, #fff26b, #5fffb0, #5fd0ff, #a65fff, #ff5fd2)"
                      : `repeating-conic-gradient(from 0deg, ${RARITY_META[currentRarity].glow} 0 8deg, transparent 8deg 22deg)`,
                  maskImage: "radial-gradient(circle, #000 20%, transparent 68%)",
                  WebkitMaskImage: "radial-gradient(circle, #000 20%, transparent 68%)",
                }}
                initial={{ opacity: 0, rotate: 0, scale: 0.6 }}
                animate={{ opacity: currentRarity === "mythic" ? 0.85 : rarityRank(currentRarity) >= 4 ? 0.9 : 0.55, rotate: 360, scale: 1 }}
                transition={{ rotate: { duration: currentRarity === "mythic" ? 8 : 18, repeat: Infinity, ease: "linear" }, opacity: { duration: 0.6 }, scale: { duration: 0.6 } }}
              />
            )}
            {bursts > 0 && isFlipped && currentRarity && rarityRank(currentRarity) >= rarityRank("rare") && !reduced && (
              <Burst key={`${index}-${bursts}`} color={RARITY_META[currentRarity].color} colors={currentRarity === "mythic" ? MYTHIC_COLORS : undefined} count={currentRarity === "mythic" ? 90 : currentRarity === "legendary" ? 60 : currentRarity === "epic" ? 36 : 20} spread={currentRarity === "mythic" ? 520 : 300} />
            )}

            <AnimatePresence mode="popLayout">
              <RevealCard
                key={index}
                face={currentFace}
                variant={current.variant}
                flipped={isFlipped}
                charging={charging}
                rarity={current.rarity}
                reduced={reduced}
                onTap={advance}
                universe={universe}
              />
            </AnimatePresence>
          </div>

          <div className="mt-8 min-h-[92px] text-center" aria-live="polite">
            {isFlipped ? (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-2">
                {currentRarity === "mythic" ? (
                  <span className="bg-[linear-gradient(90deg,#ff5fd2,#ffb35f,#fff26b,#5fffb0,#5fd0ff,#a65fff)] bg-clip-text font-brand text-4xl font-bold tracking-[0.3em] text-transparent">MYTHIC</span>
                ) : currentRarity === "legendary" ? (
                  <span className="font-brand text-3xl font-bold tracking-[0.25em] text-legendary">LEGENDARY</span>
                ) : (
                  <RarityLabel rarity={current.rarity} className="text-[13px]" />
                )}
                <div className="flex flex-wrap items-center justify-center gap-2 text-[13px] font-semibold">
                  {current.isNew ? (
                    <span className="rounded-full bg-ember px-3 py-1 text-[11px] font-black uppercase tracking-wider text-ink">New discovery</span>
                  ) : (
                    <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[12px]">
                      Duplicate · ×{current.ownedAfter} <DustIcon /> +{current.dust}
                    </span>
                  )}
                  {current.variant !== "standard" && <span className="rounded-full border border-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider">{VARIANT_META[current.variant].label}</span>}
                </div>
                <p className="text-[12px] text-bone-3">{index < items.length - 1 ? "Tap the card or swipe for the next one" : "Tap to see your haul"}</p>
              </motion.div>
            ) : (
              <p className="text-[13px] text-bone-3">{charging ? (currentRarity === "mythic" ? "Something unforgettable…" : "Something special…") : "Tap to reveal"}</p>
            )}
          </div>
        </div>
      )}

      {phase === "summary" && result && (
        <Summary result={result} items={items} universe={universe} single={single} doneHref={doneHref} doneLabel={doneLabel} onDone={onDone} blocked={blocked} onAgain={() => { setResult(undefined); setPhase("ready"); }} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function ReadyStage({
  universe,
  packName,
  cardCount,
  phase,
  reduced,
  blocked,
  costLabel,
  error,
  onOpen,
  hoverSound,
}: {
  universe: PackUniverse;
  packName: string;
  cardCount: number;
  phase: Phase;
  reduced: boolean;
  blocked?: string;
  costLabel?: string;
  error?: string;
  onOpen: () => void;
  hoverSound: () => void;
}) {
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const dragY = useMotionValue(0);
  const glow = useTransform(dragY, [0, -140], [0.15, 1]);
  const [g, setG] = useState(0.15);
  useEffect(() => glow.on("change", setG), [glow]);
  const tearing = phase === "tearing";
  const requesting = phase === "requesting";
  const can = !blocked && phase === "ready";

  return (
    <div className="flex min-h-[calc(100svh-4rem)] flex-col items-center justify-center px-4 py-20">
      <motion.div
        className="relative h-[min(64vh,440px)] w-[min(68vw,300px)] cursor-grab touch-none active:cursor-grabbing"
        style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
        onPointerMove={(e) => {
          if (reduced) return;
          const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
          rx.set(((e.clientY - r.top) / r.height - 0.5) * -16);
          ry.set(((e.clientX - r.left) / r.width - 0.5) * 18);
        }}
        onPointerEnter={hoverSound}
        onPointerLeave={() => {
          rx.set(0);
          ry.set(0);
        }}
        animate={requesting && !reduced ? { x: [0, -4, 4, -3, 3, 0], transition: { repeat: Infinity, duration: 0.35 } } : { x: 0 }}
        drag={can ? "y" : false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.6, bottom: 0.1 }}
        onDrag={(_, info) => dragY.set(info.offset.y)}
        onDragEnd={(_, info) => {
          dragY.set(0);
          if (info.offset.y < -110 && can) onOpen();
        }}
        onClick={() => can && onOpen()}
        role="button"
        tabIndex={can ? 0 : -1}
        aria-label={can ? `Open ${packName}` : blocked ?? "Opening"}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && can && onOpen()}
      >
        {/* glow */}
        <motion.div className="absolute -inset-10 -z-10 rounded-[40%] blur-3xl" style={{ background: universe.palette.accent, opacity: g * 0.6 }} animate={reduced ? undefined : { scale: [1, 1.06, 1] }} transition={{ repeat: Infinity, duration: 2.6 }} />
        {/* body */}
        <motion.div className="absolute inset-0 drop-shadow-[0_30px_50px_rgba(0,0,0,.7)]" style={{ clipPath: "inset(18% 0 0 0)" }} animate={tearing && !reduced ? { y: 60, opacity: 0, transition: { delay: 0.8, duration: 0.6 } } : {}}>
          <PackFace universe={universe} packName={packName} cardCount={cardCount} glow={g} />
        </motion.div>
        {/* top strip that tears away */}
        <motion.div
          className="absolute inset-0 drop-shadow-[0_20px_30px_rgba(0,0,0,.6)]"
          style={{ clipPath: "inset(0 0 82% 0)" }}
          animate={tearing && !reduced ? { y: -180, x: 60, rotate: 22, opacity: 0, transition: { duration: 0.7, ease: [0.3, 0.6, 0.3, 1] } } : {}}
        >
          <PackFace universe={universe} packName={packName} cardCount={cardCount} glow={g} />
        </motion.div>
        {tearing && !reduced && (
          <>
            <motion.div className="absolute inset-x-[-30%] top-[14%] h-10 blur-xl" style={{ background: "#fff" }} initial={{ opacity: 0, scaleX: 0.2 }} animate={{ opacity: [0, 1, 0], scaleX: [0.2, 1.4, 1.8] }} transition={{ duration: 0.9 }} />
            <motion.div className="absolute left-1/2 top-[18%] w-[70%] -translate-x-1/2" initial={{ y: 40, opacity: 0 }} animate={{ y: -60, opacity: [0, 1, 1, 0] }} transition={{ delay: 0.5, duration: 1 }}>
              <CardBack palette={universe.palette} />
            </motion.div>
            <Burst color={universe.palette.accent} count={40} spread={260} />
          </>
        )}
      </motion.div>

      <div className="mt-10 flex min-h-[110px] flex-col items-center gap-3 text-center">
        {requesting ? (
          <p className="flex items-center gap-2 text-sm text-bone-2">
            <Loader2 className="animate-spin" size={16} /> Opening…
          </p>
        ) : tearing ? null : blocked ? (
          <p className="max-w-sm text-sm text-bone-2">{blocked}</p>
        ) : (
          <>
            <button onClick={onOpen} className={btn("primary", "lg")}>
              <Sparkles size={18} /> Tear it open
            </button>
            <p className="text-[12.5px] text-bone-3">Tap the pack or swipe it upwards{costLabel ? ` · ${costLabel}` : ""}</p>
          </>
        )}
        {error && <p className="max-w-sm rounded-xl bg-red-500/15 px-4 py-2 text-sm text-red-200" role="alert">{error}</p>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function RevealCard({
  face,
  variant,
  flipped,
  charging,
  rarity,
  reduced,
  onTap,
  universe,
}: {
  face: CardFace;
  variant: PackOpening["items"][number]["variant"];
  flipped: boolean;
  charging: boolean;
  rarity: Rarity;
  reduced: boolean;
  onTap: () => void;
  universe: PackUniverse;
}) {
  const hint = rarityRank(rarity) >= rarityRank("rare") ? RARITY_META[rarity].glow : "transparent";
  return (
    <motion.div
      className="relative w-full cursor-pointer touch-pan-y select-none [perspective:1200px]"
      initial={reduced ? { opacity: 0 } : { y: 260, opacity: 0, rotate: -6, scale: 0.8 }}
      animate={reduced ? { opacity: 1 } : { y: 0, opacity: 1, rotate: 0, scale: 1, x: charging ? [0, -3, 3, -2, 2, 0] : 0 }}
      exit={reduced ? { opacity: 0 } : { x: -420, rotate: -18, opacity: 0, transition: { duration: 0.45 } }}
      transition={charging ? { x: { repeat: Infinity, duration: rarity === "mythic" ? 0.18 : 0.28 } } : { type: "spring", stiffness: 180, damping: 22 }}
      drag={reduced ? false : "x"}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.5}
      onDragEnd={(_, info) => Math.abs(info.offset.x) > 80 && onTap()}
      onTap={onTap}
      role="button"
      tabIndex={0}
      aria-label={flipped ? `${face.name}. Next card` : "Reveal card"}
    >
      <motion.div
        className="relative [transform-style:preserve-3d]"
        animate={{ rotateY: flipped ? 180 : 0, scale: charging ? 1.04 : 1 }}
        transition={{ duration: reduced ? 0 : rarityRank(rarity) >= 4 ? 0.9 : 0.6, ease: [0.3, 0.7, 0.2, 1] }}
      >
        <div className="[backface-visibility:hidden]">
          <div className="rounded-[5%] transition-shadow duration-700" style={{ boxShadow: charging ? `0 0 90px 30px ${hint}` : `0 0 40px 4px ${hint}` }}>
            <CardBack palette={universe.palette} title={universe.title} font={universe.font} />
          </div>
        </div>
        <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <TradingCard face={face} variant={variant} animate className="[&_.tcard-glow]:opacity-100" />
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */

function Summary({
  result,
  items,
  universe,
  single,
  doneHref,
  doneLabel,
  onDone,
  blocked,
  onAgain,
}: {
  onDone?: () => void;
  result: Result;
  items: PackOpening["items"];
  universe: PackUniverse;
  single?: boolean;
  doneHref?: string;
  doneLabel?: string;
  blocked?: string;
  onAgain: () => void;
}) {
  const fresh = items.filter((i) => i.isNew).length;
  const dust = items.reduce((s, i) => s + i.dust, 0);
  const best = items[items.length - 1]!;
  return (
    <motion.div className="mx-auto max-w-5xl px-4 pb-16 pt-20" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <p className="text-center text-[11px] font-bold uppercase tracking-[0.2em] text-bone-3">{universe.title}</p>
      <h2 className="mt-2 text-center text-3xl font-extrabold tracking-tight md:text-4xl">
        {fresh > 0 ? `${fresh} new ${fresh === 1 ? "discovery" : "discoveries"}` : "All duplicates — Stardust earned"}
      </h2>
      <p className="mt-2 flex items-center justify-center gap-3 text-sm text-bone-2">
        <span>Best pull: <span style={{ color: RARITY_META[best.rarity].color }} className="font-bold">{RARITY_META[best.rarity].label}</span></span>
        {dust > 0 && (
          <span className="flex items-center gap-1">
            · <DustIcon /> +{dust} Stardust
          </span>
        )}
      </p>
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {items.map((it, i) => (
          <motion.div key={`${it.slot}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <Link href={`/cards/${it.cardId}`} className="focus-ring block rounded-[5%]">
              <TradingCard
                face={result.faces[it.cardId]!}
                variant={it.variant}
                badge={
                  it.isNew ? (
                    <span className="absolute left-[6%] top-[5%] z-[6] rounded-full bg-ember px-2 py-0.5 text-[10px] font-black uppercase text-ink">New</span>
                  ) : (
                    <span className="absolute right-[6%] top-[5%] z-[6] rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-black text-white">×{it.ownedAfter}</span>
                  )
                }
              />
            </Link>
          </motion.div>
        ))}
      </div>
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        {onDone && (
          <button onClick={onDone} className={btn("primary", "lg")}>
            {doneLabel ?? "Continue"}
          </button>
        )}
        {doneHref && (
          <Link href={doneHref} className={btn("primary", "lg")}>
            {doneLabel ?? "Continue"}
          </Link>
        )}
        {!single && !blocked && (
          <button onClick={onAgain} className={btn(doneHref ? "glass" : "primary", "lg")}>
            Open another
          </button>
        )}
        {!onDone && (
          <Link href={`/collection/${universe.slug}`} className={btn("glass", "lg")}>
            View in collection
          </Link>
        )}
        {!single && (
          <Link href="/packs" className={btn("ghost", "lg")}>
            All packs
          </Link>
        )}
      </div>
    </motion.div>
  );
}
