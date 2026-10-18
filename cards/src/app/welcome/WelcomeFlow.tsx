"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Bell, Check } from "lucide-react";
import { Art } from "@/components/art/Art";
import { TradingCard } from "@/components/cards/TradingCard";
import { PackOpener, type PackUniverse } from "@/components/packs/PackOpener";
import { fmt } from "@/components/ui/Currency";
import { FollowButton } from "@/components/ui/FollowButton";
import { LogoMark } from "@/components/ui/Logo";
import { btn, eyebrow } from "@/components/ui/styles";
import type { GenreId } from "@/lib/content/types";
import type { PackOpening } from "@/lib/db/types";
import type { CardFace } from "@/lib/view/face";
import { post } from "@/lib/view/client-api";

type U = PackUniverse & { tagline: string; premise: string; genres: GenreId[]; followers: number; following: boolean };
type Step = "hello" | "genres" | "picks" | "pack" | "cards" | "follow";

const GENRE_ART: Record<string, string> = {
  fantasy: "afterlight", "sci-fi": "neon-runners", horror: "ghost-signal", romance: "heartbreak-highway", mystery: "the-last-hotel", cosy: "tiny-titans",
  adventure: "deep-blue", comedy: "oddly-alive", surreal: "afterlight", anime: "moon-market", creatures: "deep-blue", drama: "crownless",
};

export function WelcomeFlow({ universes, genres, initialGenres, starterClaimed, isGuest }: { universes: U[]; genres: { id: GenreId; label: string }[]; initialGenres: GenreId[]; starterClaimed: boolean; isGuest: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(starterClaimed ? "follow" : "hello");
  const [picked, setPicked] = useState<GenreId[]>(initialGenres);
  const [choice, setChoice] = useState<U | undefined>();
  const [opened, setOpened] = useState<{ opening: PackOpening; faces: Record<string, CardFace> }>();
  const bySlug = useMemo(() => new Map(universes.map((u) => [u.slug, u])), [universes]);

  const recs = useMemo(() => {
    return [...universes]
      .map((u) => ({ u, s: u.genres.filter((g) => picked.includes(g)).length * 10 + Math.log10(u.followers) }))
      .sort((a, b) => b.s - a.s)
      .slice(0, 3)
      .map((x) => x.u);
  }, [universes, picked]);

  const finish = async () => {
    await post("/api/me/onboarding", { complete: true }).catch(() => undefined);
    router.push("/?skip=1");
    router.refresh();
  };

  const fade = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -16 }, transition: { duration: 0.45 } };

  return (
    <div className="relative min-h-[calc(100svh-4rem)] overflow-hidden">
      <AnimatePresence mode="wait">
        {step === "hello" && (
          <motion.section key="hello" {...fade} className="relative grid min-h-[calc(100svh-4rem)] place-items-center px-4">
            <div className="absolute inset-0 grid grid-cols-3 gap-2 opacity-40 sm:grid-cols-6">
              {universes.slice(0, 12).map((u) => (
                <div key={u.id} className="nx-animate overflow-hidden"><Art style={u.style} palette={u.palette} seed={u.seed} aspect="tall" sceneOnly className="h-full w-full" /></div>
              ))}
            </div>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(9,9,13,.6),#09090d_75%)]" />
            <div className="relative max-w-2xl text-center">
              <LogoMark size={56} className="mx-auto" />
              <h1 className="mt-6 font-brand text-4xl font-bold tracking-[0.18em] sm:text-6xl">NEXARA</h1>
              <p className="mt-4 text-xl text-bone-2 sm:text-2xl">Infinite worlds. One collection.</p>
              <p className="mx-auto mt-6 max-w-lg text-bone-3">Original fictional universes, told in episodes and collected as cards. Every card is a piece of a bigger story — and your first five are free.</p>
              <div className="mt-10 flex flex-wrap justify-center gap-3">
                <button className={btn("primary", "lg")} onClick={() => setStep("genres")}>
                  Begin <ArrowRight size={18} />
                </button>
                {isGuest && (
                  <Link href="/settings#account" className={btn("ghost", "lg")}>I already have an account</Link>
                )}
              </div>
            </div>
          </motion.section>
        )}

        {step === "genres" && (
          <motion.section key="genres" {...fade} className="mx-auto max-w-5xl px-4 py-14">
            <p className={eyebrow}>Step 1 of 4</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">What kind of worlds pull you in?</h2>
            <p className="mt-2 text-bone-3">Pick three or more. We'll use them to recommend universes — you can change them any time.</p>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {genres.map((g) => {
                const on = picked.includes(g.id);
                const u = bySlug.get(GENRE_ART[g.id] ?? "") ?? universes[0]!;
                return (
                  <button
                    key={g.id}
                    onClick={() => setPicked((p) => (on ? p.filter((x) => x !== g.id) : [...p, g.id]))}
                    aria-pressed={on}
                    className={`focus-ring relative h-28 overflow-hidden rounded-2xl border text-left transition ${on ? "border-ember ring-2 ring-ember" : "border-white/10 hover:border-white/30"}`}
                  >
                    <Art style={u.style} palette={u.palette} seed={u.seed + g.id.length * 31} aspect="hero" sceneOnly className="absolute inset-0 h-full w-full" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-black/10" />
                    <span className="absolute bottom-3 left-4 text-lg font-bold">{g.label}</span>
                    {on && <span className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full bg-ember text-ink"><Check size={14} /></span>}
                  </button>
                );
              })}
            </div>
            <div className="mt-10 flex items-center justify-between">
              <span className="text-sm text-bone-3">{picked.length} selected</span>
              <button
                className={btn("primary", "lg")}
                disabled={picked.length < 3}
                onClick={() => {
                  void post("/api/me/onboarding", { genres: picked }).catch(() => undefined);
                  setStep("picks");
                }}
              >
                Continue <ArrowRight size={18} />
              </button>
            </div>
          </motion.section>
        )}

        {step === "picks" && (
          <motion.section key="picks" {...fade} className="mx-auto max-w-6xl px-4 py-14">
            <p className={eyebrow}>Step 2 of 4</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Three worlds we think you'll love.</h2>
            <p className="mt-2 text-bone-3">Choose one for your free starter pack. Five cards, one guaranteed Rare or better.</p>
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {recs.map((u) => (
                <button key={u.id} onClick={() => { setChoice(u); setStep("pack"); }} className="focus-ring group relative aspect-[3/4] overflow-hidden rounded-3xl text-left shadow-card" style={{ background: u.palette.bg }}>
                  <div className="nx-animate absolute inset-0"><Art style={u.style} palette={u.palette} seed={u.seed} aspect="tall" sceneOnly className="h-full w-full transition duration-700 group-hover:scale-105" /></div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-6">
                    <h3 className={`ff-${u.font} text-4xl leading-none`} style={{ color: u.palette.ink }}>{u.title}</h3>
                    <p className="mt-3 text-sm text-white/80">{u.premise}</p>
                    <p className="mt-3 text-[12px] font-semibold text-white/60">{fmt(u.followers)} followers</p>
                    <span className={`${btn("light", "sm")} mt-4`}>Open my first pack</span>
                  </div>
                </button>
              ))}
            </div>
            <details className="mt-8">
              <summary className="cursor-pointer text-sm font-semibold text-bone-2">Or choose from every universe</summary>
              <div className="mt-4 flex flex-wrap gap-2">
                {universes.map((u) => (
                  <button key={u.id} onClick={() => { setChoice(u); setStep("pack"); }} className="rounded-full border border-white/10 px-4 py-2 text-sm hover:border-white/30">{u.title}</button>
                ))}
              </div>
            </details>
          </motion.section>
        )}

        {step === "pack" && choice && (
          <motion.section key="pack" {...fade}>
            <PackOpener
              packType="starter"
              packName="Starter Pack"
              cardCount={5}
              universe={choice}
              single
              costLabel="Free"
              onComplete={(opening, faces) => setOpened({ opening, faces })}
              onDone={() => setStep("cards")}
              doneLabel="Continue"
            />
          </motion.section>
        )}

        {step === "cards" && opened && choice && (
          <motion.section key="cards" {...fade} className="mx-auto max-w-5xl px-4 py-14 text-center">
            <p className={eyebrow}>Step 3 of 4</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Your collection has begun.</h2>
            <p className="mx-auto mt-2 max-w-xl text-bone-3">These cards live in your {choice.title} binder. Each one unlocks more of the story: diaries, secrets and side chapters.</p>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              {opened.opening.items.map((it, i) => (
                <motion.div key={i} className="w-[30vw] max-w-[150px]" initial={{ opacity: 0, rotate: -8 + i * 4, y: 30 }} animate={{ opacity: 1, rotate: -8 + i * 4, y: Math.abs(i - 2) * 10 }} transition={{ delay: i * 0.08 }}>
                  <TradingCard face={opened.faces[it.cardId]!} variant={it.variant} compact />
                </motion.div>
              ))}
            </div>
            <button className={`${btn("primary", "lg")} mt-12`} onClick={() => setStep("follow")}>
              Continue <ArrowRight size={18} />
            </button>
          </motion.section>
        )}

        {step === "follow" && (
          <motion.section key="follow" {...fade} className="mx-auto max-w-3xl px-4 py-14 text-center">
            <p className={eyebrow}>Step 4 of 4</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Follow the story.</h2>
            <p className="mx-auto mt-2 max-w-xl text-bone-3">Followers hear first about new episodes, new cards and season launches.</p>
            <div className="mt-8 space-y-3">
              {(choice ? [choice] : recs).map((u) => (
                <div key={u.id} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-ink-2 p-4 text-left">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl"><Art style={u.style} palette={u.palette} seed={u.seed} aspect="square" sceneOnly className="h-full w-full" /></div>
                  <div className="min-w-0 flex-1">
                    <p className={`ff-${u.font} text-2xl`} style={{ color: u.palette.ink }}>{u.title}</p>
                    <p className="truncate text-sm text-bone-3">{u.tagline}</p>
                  </div>
                  <FollowButton universeId={u.id} following={u.following} kind="primary" />
                </div>
              ))}
            </div>
            <p className="mt-4 flex items-center justify-center gap-2 text-[13px] text-bone-3"><Bell size={14} /> In-app notifications are on. Change them in Settings.</p>
            <button className={`${btn("light", "lg")} mt-10`} onClick={finish}>
              Enter NEXARA <ArrowRight size={18} />
            </button>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
