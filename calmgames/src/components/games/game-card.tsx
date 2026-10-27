"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { Pencil, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GameCover } from "./game-cover";
import { formatDate } from "@/lib/utils";
import type { GameSummary } from "@/lib/types";

export function StatusBadge({ game }: { game: GameSummary }) {
  if (game.status === "generating") return <Badge tone="lavender"><span className="size-1.5 animate-pulse rounded-full bg-[#4b3f7a]" />Generating</Badge>;
  if (game.status === "failed") return <Badge tone="rose">Generation failed</Badge>;
  if (game.status === "concept") return <Badge tone="neutral">Concept · not yet built</Badge>;
  if (game.qa === "passed") return <Badge tone="sage">Playable · QA passed</Badge>;
  if (game.qa === "failed") return <Badge tone="peach">Playable · QA issues</Badge>;
  return <Badge tone="coastal">Playable · untested</Badge>;
}

export function GameCard({ game, index = 0, actions }: { game: GameSummary; index?: number; actions?: React.ReactNode }) {
  const playable = game.status === "ready" || (game.currentVersion > 0 && game.status !== "concept");
  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: Math.min(index, 8) * 0.05, ease: [0.22, 1, 0.36, 1] }}
      className="group overflow-hidden rounded-3xl border border-line/80 bg-paper shadow-soft transition-shadow duration-500 hover:shadow-lift"
    >
      <Link href={`/games/${game.id}`} className="relative block aspect-[16/9] overflow-hidden" aria-label={`Open ${game.name}`}>
        <div className="h-full w-full transition-transform duration-[1.2s] ease-[var(--ease-calm)] group-hover:scale-[1.03]">
          <GameCover game={game} />
        </div>
        <div className="absolute left-3 top-3">
          <StatusBadge game={game} />
        </div>
      </Link>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow mb-1">{game.category}{game.origin === "seed" ? " · Studio original" : ""}</p>
            <h3 className="truncate font-display text-[21px] leading-tight text-midnight">{game.name}</h3>
          </div>
          {actions}
        </div>
        <p className="mt-2 line-clamp-2 min-h-[2.6em] text-[13.5px] leading-relaxed text-muted">{game.description}</p>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-[12px] text-muted">{formatDate(game.createdAt)}{game.versionCount > 1 ? ` · ${game.versionCount} versions` : ""}</span>
          <div className="flex gap-1.5">
            <Button asChild size="sm" variant="secondary">
              <Link href={`/games/${game.id}?focus=refine`}><Pencil />Edit</Link>
            </Button>
            {playable ? (
              <Button asChild size="sm">
                <Link href={`/games/${game.id}`}><Play />Play</Link>
              </Button>
            ) : game.status === "concept" ? (
              <Button asChild size="sm" variant="soft">
                <Link href={`/create?concept=${game.id}`}>Build</Link>
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </motion.article>
  );
}

export function GameCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-3xl border border-line/70 bg-paper">
      <div className="skeleton aspect-[16/9]" />
      <div className="space-y-3 p-5">
        <div className="skeleton h-3 w-20 rounded-full" />
        <div className="skeleton h-5 w-2/3 rounded-full" />
        <div className="skeleton h-3 w-full rounded-full" />
      </div>
    </div>
  );
}
