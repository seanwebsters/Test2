"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useDreamStore } from "@/lib/store";
import { worlds } from "@/lib/data/worlds";
import { characterById } from "@/lib/data/characters";
import { curatedDreams } from "@/lib/data/catalog";
import { allCurated, lengthLabel, toneLabel } from "@/lib/services/dreams";
import { HomeHero } from "@/components/home/HomeHero";
import { HowItWorks } from "@/components/home/HowItWorks";
import { NewThisWeek } from "@/components/home/NewThisWeek";
import { Rail, SectionHeader } from "@/components/ui/primitives";
import { WorldCard } from "@/components/cards/WorldCard";
import { CharacterCard } from "@/components/cards/CharacterCard";
import { ContinueCard, DreamCard, DreamCover, CastStack } from "@/components/cards/DreamCard";
import { worldById } from "@/lib/data/worlds";

export default function HomePage() {
  const store = useDreamStore();
  const curated = useMemo(() => allCurated(), []);
  const originals = curated.filter((d) => d.author?.kind === "calm");
  const popular = [...curated].sort((a, b) => playsNum(b.id) - playsNum(a.id));

  // Continue Dreaming: latest episode of each series the user has listened to
  const continuing = useMemo(() => {
    const seen = new Set<string>();
    const out: { dream: (typeof store.dreams)[number]; session?: (typeof store.sessions)[number] }[] = [];
    for (const d of [...store.dreams].sort((a, b) => b.createdAt - a.createdAt)) {
      if (seen.has(d.seriesId)) continue;
      seen.add(d.seriesId);
      out.push({ dream: d, session: store.sessions.find((s) => s.dreamId === d.id) });
    }
    return out;
  }, [store.dreams, store.sessions]);

  const lastDream = continuing[0]?.dream;
  const becauseWorld = lastDream ? worldById(lastDream.request.worlds[0]) : undefined;
  const because = becauseWorld
    ? curated.filter((d) => d.id !== lastDream?.id && d.output.dream_title !== lastDream?.output.dream_title && (d.request.worlds.includes(becauseWorld.id) || d.request.characters.some((c) => lastDream!.request.characters.includes(c))))
    : [];
  const favChars = store.prefs.favouriteCharacters.map(characterById).filter(Boolean);
  const featuredWorlds = [...worlds].sort((a, b) => b.popularity - a.popularity);
  const unexplored = worlds.filter((w) => !store.prefs.favouriteWorlds.includes(w.id));

  return (
    <div className="overflow-x-hidden">
      <HomeHero featured={originals[0]} name={store.prefs.displayName} />
      <div className="hidden lg:block">
        <HowItWorks />
      </div>

      <div className="mx-auto mt-12 max-w-[1480px] space-y-14 lg:mt-16 lg:space-y-20">
        {continuing.length > 0 && (
          <section>
            <SectionHeader eyebrow="Pick up where you drifted off" title="Continue Dreaming" href="/my-dreams" />
            <Rail>
              {continuing.map(({ dream, session }) => (
                <ContinueCard key={dream.id} dream={dream} session={session} />
              ))}
            </Rail>
          </section>
        )}

        <NewThisWeek compact />

        <section>
          <SectionHeader eyebrow="Official worlds" title="Featured Worlds" href="/explore" />
          <Rail>
            {featuredWorlds.map((w) => (
              <WorldCard key={w.id} world={w} />
            ))}
          </Rail>
        </section>

        <section>
          <SectionHeader eyebrow="Your cast" title="Characters You Love" href="/explore?tab=characters" />
          <Rail>
            {favChars.map((c) => (
              <CharacterCard key={c!.id} character={c!} />
            ))}
          </Rail>
        </section>

        <section>
          <SectionHeader eyebrow="From the Calm studio" title="Calm Originals" href="/explore?tab=dreams" />
          <Rail>
            {originals.map((d) => (
              <DreamCard key={d.id} dream={d} wide />
            ))}
          </Rail>
        </section>

        <section>
          <SectionHeader eyebrow="Tonight, everywhere" title="Popular Dreams" href="/explore?tab=dreams" />
          <Rail>
            {popular.slice(0, 8).map((d, i) => (
              <Link key={d.id} href={`/dream/${d.id}`} className="group flex shrink-0 snap-start items-end">
                <span className="-mr-4 select-none font-display text-[110px] font-light leading-[0.8] text-transparent [-webkit-text-stroke:1.5px_rgba(184,168,244,0.45)] lg:text-[140px]">{i + 1}</span>
                <div className="relative h-[170px] w-[124px] overflow-hidden rounded-[18px] ring-1 ring-white/10 lg:h-[210px] lg:w-[150px]">
                  <DreamCover dream={d} className="absolute inset-0 transition-transform duration-[1200ms] group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-night-950/95 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-3">
                    <h3 className="line-clamp-2 font-display text-[14px] font-light leading-tight text-white">{d.output.dream_title}</h3>
                    <p className="mt-1 text-[10px] text-mist-400">{curatedDreams.find((c) => c.id === d.id)?.plays} plays</p>
                  </div>
                </div>
              </Link>
            ))}
          </Rail>
        </section>

        {because.length > 0 && lastDream && (
          <section>
            <SectionHeader eyebrow="Because you dreamed about" title={lastDream.output.dream_title} />
            <Rail>
              {because.map((d) => (
                <DreamCard key={d.id} dream={d} />
              ))}
            </Rail>
          </section>
        )}

        <section className="px-5 lg:px-10">
          <SectionHeader eyebrow="Somewhere new" title="Explore New Worlds" href="/explore" className="!px-0" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">
            {unexplored.map((w) => (
              <WorldCard key={w.id} world={w} size="lg" />
            ))}
          </div>
        </section>

        {lastDream && (
          <section className="px-5 lg:px-10">
            <Link href={`/dream/${lastDream.id}`} className="group relative block overflow-hidden rounded-[28px] ring-1 ring-white/10">
              <DreamCover dream={lastDream} detail="hero" className="absolute inset-0 transition-transform duration-[2000ms] group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-r from-night-950/95 via-night-950/60 to-night-950/10" />
              <div className="relative max-w-lg p-6 lg:p-12">
                <p className="eyebrow text-ember-200/90">Your universe is growing</p>
                <h3 className="mt-3 font-display text-3xl font-light leading-tight text-white lg:text-4xl">Tonight, night {lastDream.episode + 1} of {lastDream.output.dream_title.replace(/ · Night \d+$/, "")}</h3>
                <p className="mt-3 text-sm leading-relaxed text-mist-300">Dream Worlds remembers what happened, who you met and the choices you made. Every night adds a chapter to a story that is only yours.</p>
                <div className="mt-5 flex items-center gap-3">
                  <CastStack ids={lastDream.request.characters} size={30} />
                  <span className="text-xs text-mist-400">{lengthLabel(lastDream.request.length)} · {toneLabel(lastDream.request.tone)}</span>
                </div>
              </div>
            </Link>
          </section>
        )}

        <footer className="px-5 pb-6 text-center text-[11px] leading-relaxed text-mist-500 lg:px-10">
          Dream Worlds prototype · All worlds, characters and partners shown are fictional demo content.
          <br />
          Designed so licensed IP can plug into the same platform.
        </footer>
      </div>
    </div>
  );
}

function playsNum(id: string) {
  const p = curatedDreams.find((d) => d.id === id)?.plays ?? "0";
  return parseFloat(p) * (p.endsWith("M") ? 1_000_000 : p.endsWith("K") ? 1_000 : 1);
}
