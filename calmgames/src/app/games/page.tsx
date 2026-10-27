"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { Page, PageHeader } from "@/components/shell/app-shell";
import { GameCard, GameCardSkeleton } from "@/components/games/game-card";
import { GameActions } from "@/components/games/game-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useData } from "@/lib/use-data";
import { CATEGORIES, type GameSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

const FILTERS = ["All", "Playable", "Generating", "Concepts"] as const;

export default function Library() {
  const { data, refresh } = useData<{ games: GameSummary[] }>("/api/games", { poll: (d) => d.games.some((g) => g.status === "generating"), interval: 3000 });
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [category, setCategory] = useState<string>("");
  const games = useMemo(
    () =>
      (data?.games ?? []).filter((g) => {
        if (q && !`${g.name} ${g.description} ${g.prompt}`.toLowerCase().includes(q.toLowerCase())) return false;
        if (category && g.category !== category) return false;
        if (filter === "Playable") return g.currentVersion > 0;
        if (filter === "Generating") return g.status === "generating";
        if (filter === "Concepts") return g.status === "concept";
        return true;
      }),
    [data, q, filter, category],
  );
  return (
    <Page>
      <PageHeader
        eyebrow="My games"
        title="Library"
        description="Every game and every version the studio has made. Open one to play, refine, export or inspect what each agent produced."
        actions={<Button asChild><Link href="/create"><Plus /> New game</Link></Button>}
      />
      <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-sm">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or prompt" className="pl-10" aria-label="Search games" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full bg-ivory-deep p-1">
            {FILTERS.map((f) => (
              <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f} className={cn("rounded-full px-3.5 py-1.5 text-[13px] transition", filter === f ? "bg-paper text-midnight shadow-soft" : "text-ink/60 hover:text-ink")}>{f}</button>
            ))}
          </div>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-9 rounded-full border border-line bg-paper px-3 text-[13px]" aria-label="Category">
            <option value="">All categories</option>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {!data && Array.from({ length: 6 }, (_, i) => <GameCardSkeleton key={i} />)}
        {games.map((g, i) => <GameCard key={g.id} game={g} index={i} actions={<GameActions game={g} onChange={() => void refresh()} />} />)}
      </div>
      {data && !games.length && (
        <div className="rounded-3xl border border-dashed border-line p-14 text-center">
          <p className="font-display text-2xl text-midnight">Nothing here yet</p>
          <p className="mt-2 text-[14px] text-muted">{q || category || filter !== "All" ? "No games match these filters." : "Describe your first game and the studio will build it."}</p>
        </div>
      )}
    </Page>
  );
}
