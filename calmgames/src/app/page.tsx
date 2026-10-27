"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, FlaskConical } from "lucide-react";
import { Page } from "@/components/shell/app-shell";
import { PromptComposer } from "@/components/studio/prompt-composer";
import { GameCard, GameCardSkeleton } from "@/components/games/game-card";
import { AGENTS } from "@/lib/agents/meta";
import { AGENT_IDS, type GameSummary } from "@/lib/types";
import { useData } from "@/lib/use-data";
import { Button } from "@/components/ui/button";

export default function Overview() {
  const { data } = useData<{ games: GameSummary[] }>("/api/games", { poll: (d) => d.games.some((g) => g.status === "generating"), interval: 3000 });
  const recent = data?.games.slice(0, 6);
  return (
    <Page>
      <section className="relative pb-16 pt-4 sm:pt-10">
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }} className="pointer-events-none absolute -right-24 -top-24 hidden size-[420px] rounded-full bg-gradient-to-br from-lavender/50 via-peach/40 to-coastal/30 blur-3xl md:block" />
        <p className="eyebrow mb-5">Welcome to Calm AI Game Studio</p>
        <h1 className="max-w-3xl font-display text-5xl leading-[1.02] font-light text-midnight sm:text-[68px]">
          Turn an idea into <em className="font-normal italic text-[#6a5aa8]">something beautiful.</em>
        </h1>
        <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-muted">Describe a calming game. Six specialised agents will design it, art-direct it, build it, play-test it in a real browser and hand you something you can play.</p>
        <div className="mt-10">
          <PromptComposer />
        </div>
      </section>

      <section className="mb-16">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="eyebrow mb-2">Library</p>
            <h2 className="font-display text-3xl font-light text-midnight">Recently made</h2>
          </div>
          <Button asChild variant="ghost">
            <Link href="/games">All games <ArrowRight /></Link>
          </Button>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {recent ? recent.map((g, i) => <GameCard key={g.id} game={g} index={i} />) : Array.from({ length: 3 }, (_, i) => <GameCardSkeleton key={i} />)}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-3xl border border-line/80 bg-paper/80 p-7 shadow-soft">
          <p className="eyebrow mb-2">The studio</p>
          <h2 className="font-display text-2xl text-midnight">Six agents, one pipeline</h2>
          <ol className="mt-6 grid gap-3 sm:grid-cols-2">
            {AGENT_IDS.map((id, i) => (
              <li key={id} className="flex gap-3">
                <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full text-[12px] font-medium text-white" style={{ background: AGENTS[id].color }}>{i + 1}</span>
                <span>
                  <span className="block text-[14px] font-medium text-midnight">{AGENTS[id].name}</span>
                  <span className="block text-[12.5px] leading-snug text-muted">{AGENTS[id].short}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
        <div className="flex flex-col justify-between rounded-3xl bg-midnight p-7 text-ivory shadow-lift">
          <div>
            <FlaskConical className="size-6 text-lavender" strokeWidth={1.5} />
            <h2 className="mt-4 font-display text-2xl">Creative Lab</h2>
            <p className="mt-2 text-[14px] leading-relaxed text-ivory/70">Ask the Ideation and Design agents for five genuinely different concepts, compare them side by side, and build the one you love.</p>
          </div>
          <Button asChild variant="secondary" className="mt-6 self-start">
            <Link href="/lab">Open the lab <ArrowRight /></Link>
          </Button>
        </div>
      </section>
    </Page>
  );
}
