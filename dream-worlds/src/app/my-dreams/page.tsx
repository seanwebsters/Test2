"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Brain, MapPin, Plus, Sparkles, Users } from "lucide-react";
import { useDreamStore } from "@/lib/store";
import { worldById } from "@/lib/data/worlds";
import { characterById } from "@/lib/data/characters";
import { allCurated } from "@/lib/services/dreams";
import type { Dream } from "@/lib/types";
import { ContinueCard, DreamRow, CastStack, DreamCover } from "@/components/cards/DreamCard";
import { WorldCard } from "@/components/cards/WorldCard";
import { CharacterCard } from "@/components/cards/CharacterCard";
import { Rail, SectionHeader } from "@/components/ui/primitives";
import { CompactHeader } from "@/components/ui/CompactHeader";

const TABS = ["Recent", "Saved", "Favourites"] as const;

export default function MyDreamsPage() {
  const store = useDreamStore();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Recent");

  const series = useMemo(() => {
    const map = new Map<string, Dream[]>();
    for (const d of store.dreams) map.set(d.seriesId, [...(map.get(d.seriesId) ?? []), d]);
    return [...map.values()].map((eps) => eps.sort((a, b) => a.episode - b.episode)).sort((a, b) => b[b.length - 1].createdAt - a[a.length - 1].createdAt);
  }, [store.dreams]);

  const recent = [...store.dreams].sort((a, b) => b.createdAt - a.createdAt);
  const saved = [...store.dreams.filter((d) => d.saved), ...allCurated().filter((d) => store.savedCuratedIds.includes(d.id))];
  const favourites = recent.filter((d) => d.request.characters.some((c) => store.prefs.favouriteCharacters.includes(c)));
  const list = tab === "Recent" ? recent : tab === "Saved" ? saved : favourites;

  const totalMinutes = store.sessions.reduce((n, s) => n + s.minutesListened, 0);
  const worldsVisited = new Set(store.dreams.flatMap((d) => d.request.worlds));
  const charsMet = new Set(store.dreams.flatMap((d) => d.request.characters));

  const history = [...store.sessions].sort((a, b) => b.endedAt - a.endedAt);

  return (
    <div className="mx-auto max-w-[1480px] pb-10">
      <CompactHeader title="My Dreams" />
      <div className="flex items-end justify-between px-5 pt-[calc(max(var(--safe-top),14px)+28px)] lg:px-10 lg:pt-28">
        <div>
          <p className="eyebrow mb-2">Your personal universe</p>
          <h1 className="font-display text-[38px] font-light leading-none text-white lg:text-6xl">My Dreams</h1>
        </div>
        <Link href="/create" className="grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-white/5" aria-label="Create a dream">
          <Plus className="h-5 w-5" />
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-4 gap-2 px-5 lg:max-w-3xl lg:px-10">
        {[
          { v: store.sessions.length, l: "Nights dreamed" },
          { v: totalMinutes, l: "Minutes listened" },
          { v: worldsVisited.size, l: "Worlds visited" },
          { v: charsMet.size, l: "Characters met" },
        ].map((s) => (
          <div key={s.l} className="glass rounded-2xl px-3 py-3">
            <p className="font-display text-2xl font-light text-white">{s.v}</p>
            <p className="text-[10px] leading-tight text-mist-400">{s.l}</p>
          </div>
        ))}
      </div>

      <section className="mt-10">
        <SectionHeader eyebrow="Pick up the thread" title="Continue Dreaming" />
        <Rail>
          {series.map((eps) => {
            const last = eps[eps.length - 1];
            return <ContinueCard key={last.id} dream={last} session={store.sessions.find((s) => s.dreamId === last.id)} />;
          })}
        </Rail>
      </section>

      {/* tabs + list */}
      <section className="mt-10 px-5 lg:px-10">
        <div className="inline-flex rounded-full border border-white/10 bg-white/[0.03] p-1">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} role="tab" className={`relative min-h-[40px] rounded-full px-5 py-2 text-sm transition ${tab === t ? "text-night-900" : "text-mist-300"}`}>
              {tab === t && <motion.span layoutId="mdtab" className="chip-on absolute inset-0 rounded-full" />}
              <span className="relative">{t}</span>
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-1 lg:grid-cols-2 lg:gap-x-8">
          {list.length === 0 && <p className="py-8 text-sm text-mist-400">Nothing here yet.</p>}
          {list.map((d) => (
            <DreamRow key={d.id} dream={d} sub={`${d.episode > 1 ? `Night ${d.episode} · ` : ""}${d.totalMinutes >= 480 ? "All night" : `${d.totalMinutes} min`} · ${d.request.worlds.map((w) => worldById(w)?.title).join(" × ")}`} />
          ))}
        </div>
      </section>

      {/* persistent universes */}
      <section className="mt-14">
        <SectionHeader eyebrow="Dream Worlds remembers" title="Your ongoing stories" />
        <div className="grid gap-4 px-5 lg:grid-cols-2 lg:px-10">
          {series.slice(0, 4).map((eps) => {
            const last = eps[eps.length - 1];
            const c = last.output.continuity_data;
            return (
              <Link key={last.seriesId} href={`/dream/${last.id}`} className="glass group relative overflow-hidden rounded-3xl p-5 transition hover:bg-white/[0.07]">
                <div className="absolute inset-y-0 right-0 w-1/3 opacity-30 [mask-image:linear-gradient(to_left,black,transparent)]">
                  <DreamCover dream={last} className="absolute inset-0" />
                </div>
                <div className="relative">
                  <p className="eyebrow text-ember-200/90">{eps.length} {eps.length === 1 ? "night" : "nights"} so far</p>
                  <h3 className="mt-1.5 font-display text-xl font-light text-white">{last.output.dream_title.replace(/ · Night \d+$/, "")}</h3>
                  <ul className="mt-4 space-y-2.5 text-[13px] leading-snug text-mist-300">
                    <li className="flex gap-2.5"><Brain className="mt-0.5 h-4 w-4 shrink-0 text-dusk-400" /><span>{c.events.length} moments remembered</span></li>
                    <li className="flex gap-2.5"><Users className="mt-0.5 h-4 w-4 shrink-0 text-dusk-400" /><span>{c.relationships.map((r) => `${characterById(r.a)?.name.replace(/^The /, "")} & ${characterById(r.b)?.name.replace(/^The /, "")} ${r.bond.split(", then ").pop()}`)[0] ?? "Getting to know each other"}</span></li>
                    <li className="flex gap-2.5"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-dusk-400" /><span>{c.locationsVisited.length} places visited</span></li>
                    {c.openThreads[0] && <li className="flex gap-2.5"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-ember-200" /><span className="italic">Next time: {c.openThreads[0]}</span></li>}
                  </ul>
                  <div className="mt-4"><CastStack ids={last.request.characters} size={28} /></div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-14">
        <SectionHeader eyebrow="Where you go at night" title="Your Worlds" />
        <Rail>
          {[...new Set([...store.prefs.favouriteWorlds, ...worldsVisited])].map((w) => worldById(w)).filter(Boolean).map((w) => (
            <WorldCard key={w!.id} world={w!} />
          ))}
        </Rail>
      </section>

      <section className="mt-14">
        <SectionHeader eyebrow="Your cast" title="Favourite Characters" href="/you" action="Edit" />
        <Rail>
          {store.prefs.favouriteCharacters.map(characterById).filter(Boolean).map((c) => (
            <CharacterCard key={c!.id} character={c!} size="sm" />
          ))}
        </Rail>
      </section>

      <section className="mt-14 px-5 lg:px-10">
        <SectionHeader eyebrow="Night by night" title="Dream History" className="!px-0" />
        <ol className="relative space-y-1 border-l border-white/10 pl-5">
          {history.map((s) => {
            const d = store.dreams.find((x) => x.id === s.dreamId);
            if (!d) return null;
            return (
              <li key={s.id} className="relative">
                <span className="absolute -left-[25px] top-6 h-2 w-2 rounded-full bg-dusk-400 ring-4 ring-night-950" />
                <Link href={`/morning/${d.id}`} className="flex items-center gap-4 rounded-2xl p-3 transition hover:bg-white/[0.04]">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl">
                    <DreamCover dream={d} className="absolute inset-0" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] uppercase tracking-wider text-mist-500" suppressHydrationWarning>{nightLabel(s.endedAt)}</p>
                    <p className="truncate text-sm text-mist-100">{d.output.dream_title}</p>
                    <p className="text-xs text-mist-400">Fell asleep after {s.minutesListened} min · chapter {s.stoppedAtChapter + 1}</p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="mt-14">
        <SectionHeader eyebrow="Kept for another night" title="Saved Dreams" />
        <Rail>
          {saved.map((d) => (
            <Link key={d.id} href={`/dream/${d.id}`} className="w-[200px] shrink-0 snap-start">
              <div className="relative aspect-square overflow-hidden rounded-[20px] ring-1 ring-white/10">
                <DreamCover dream={d} className="absolute inset-0" />
                <div className="absolute inset-0 bg-gradient-to-t from-night-950/90 to-transparent" />
                <p className="absolute inset-x-3 bottom-3 font-display text-[15px] font-light leading-tight text-white">{d.output.dream_title}</p>
              </div>
            </Link>
          ))}
        </Rail>
      </section>
    </div>
  );
}

function nightLabel(ts: number) {
  const days = Math.round((Date.now() - ts) / 86_400_000);
  if (days <= 0) return "Last night";
  if (days === 1) return "Last night";
  if (days < 7) return new Date(ts).toLocaleDateString(undefined, { weekday: "long" }) + " night";
  return new Date(ts).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
