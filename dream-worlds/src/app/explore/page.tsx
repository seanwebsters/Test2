"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { worlds, worldById } from "@/lib/data/worlds";
import { characters } from "@/lib/data/characters";
import { creators } from "@/lib/data/catalog";
import { allCurated } from "@/lib/services/dreams";
import { WorldCard } from "@/components/cards/WorldCard";
import { CharacterCard } from "@/components/cards/CharacterCard";
import { DreamCard } from "@/components/cards/DreamCard";
import { PageTitle } from "@/components/ui/primitives";

const TABS = ["worlds", "characters", "dreams", "creators"] as const;
type Tab = (typeof TABS)[number];

export default function ExplorePage() {
  return (
    <Suspense>
      <Explore />
    </Suspense>
  );
}

function Explore() {
  const initial = (useSearchParams().get("tab") as Tab) ?? "worlds";
  const [tab, setTab] = useState<Tab>(TABS.includes(initial) ? initial : "worlds");
  const [q, setQ] = useState("");
  const [genre, setGenre] = useState<string | null>(null);
  const curated = useMemo(() => allCurated(), []);
  const match = (s: string) => s.toLowerCase().includes(q.toLowerCase());

  return (
    <div className="mx-auto max-w-[1480px]">
      <PageTitle eyebrow="Discover" title="Explore" subtitle="Official worlds, beloved characters, and dreams from Calm and creators." />

      <div className="sticky top-0 z-30 mt-6 bg-night-950/80 px-5 pb-3 pt-3 backdrop-blur-xl lg:top-20 lg:px-10">
        <label className="glass flex items-center gap-3 rounded-full px-4 py-3">
          <Search className="h-4 w-4 text-mist-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search worlds, characters, dreams…" className="w-full bg-transparent text-sm text-white placeholder:text-mist-500 focus:outline-none" />
        </label>
        <div className="mt-3 flex gap-6 border-b border-white/[0.06]">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`relative pb-3 text-sm capitalize transition ${tab === t ? "text-white" : "text-mist-400 hover:text-mist-200"}`}>
              {t}
              {tab === t && <motion.span layoutId="exptab" className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-gradient-to-r from-ember-200 to-dusk-400" />}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 px-5 lg:px-10">
        {tab === "worlds" && (
          <>
            <div className="no-scrollbar -mx-5 mb-5 flex gap-2 overflow-x-auto px-5 lg:mx-0 lg:px-0">
              {[null, ...new Set(worlds.map((w) => w.genre))].map((g) => (
                <button key={g ?? "all"} onClick={() => setGenre(g)} className={`shrink-0 rounded-full px-4 py-2 text-xs transition ${genre === g ? "chip-on" : "border border-white/10 text-mist-300"}`}>
                  {g ?? "All"}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-5">
              {worlds.filter((w) => (!genre || w.genre === genre) && (match(w.title) || match(w.description))).map((w) => (
                <WorldCard key={w.id} world={w} size="lg" />
              ))}
            </div>
          </>
        )}

        {tab === "characters" && (
          <div className="space-y-10">
            {worlds.map((w) => {
              const cs = characters.filter((c) => c.worldId === w.id && (match(c.name) || match(c.title) || match(w.title)));
              if (!cs.length) return null;
              return (
                <div key={w.id}>
                  <Link href={`/world/${w.id}`} className="mb-3 block font-display text-xl font-light text-white">{w.title}</Link>
                  <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-7">
                    {cs.map((c) => (
                      <CharacterCard key={c.id} character={c} size="grid" />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "dreams" && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {curated.filter((d) => match(d.output.dream_title) || d.request.worlds.some((w) => match(worldById(w)!.title))).map((d) => (
              <div key={d.id} className="[&>a]:block [&>a>div]:w-full">
                <DreamCard dream={d} />
              </div>
            ))}
          </div>
        )}

        {tab === "creators" && (
          <div className="grid gap-4 lg:grid-cols-2">
            {creators.filter((c) => match(c.name) || match(c.bio)).map((c) => (
              <div key={c.id} className="glass rounded-3xl p-5">
                <div className="flex items-center gap-4">
                  <span className="grid h-14 w-14 place-items-center rounded-full font-display text-xl text-night-900" style={{ background: `linear-gradient(135deg, ${c.hue}, #f6e2b8)` }}>
                    {c.name.split(" ").map((x) => x[0]).join("")}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium text-white">{c.name}</p>
                    <p className="text-xs text-mist-400">{c.handle} · {c.followers} followers</p>
                  </div>
                  <button className="rounded-full border border-white/15 px-4 py-1.5 text-xs text-white">Follow</button>
                </div>
                <p className="mt-3 text-sm text-mist-300">{c.bio}</p>
                <div className="no-scrollbar mt-4 flex gap-3 overflow-x-auto">
                  {c.dreamIds.map((id) => curated.find((d) => d.id === id)).filter(Boolean).map((d) => (
                    <DreamCard key={d!.id} dream={d!} />
                  ))}
                </div>
              </div>
            ))}
            <div className="glass rounded-3xl p-6 lg:col-span-2">
              <p className="eyebrow mb-2 text-ember-200/90">Phase 2</p>
              <p className="font-display text-2xl font-light text-white">Creators publish Dreams inside official worlds.</p>
              <p className="mt-2 max-w-2xl text-sm text-mist-300">Each published Dream is checked against the rights holder&apos;s usage rules before it goes live, and revenue is shared between Calm, the creator and the IP owner.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
