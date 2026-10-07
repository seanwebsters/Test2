"use client";

import Link from "next/link";
import { ArrowRight, AudioLines } from "lucide-react";
import { weeklyDrop } from "@/lib/data/catalog";
import { worldById } from "@/lib/data/worlds";
import { characterById } from "@/lib/data/characters";
import { voiceById } from "@/lib/data/partners";
import { WorldArt } from "../art/WorldArt";
import { CharacterCard } from "../cards/CharacterCard";
import { NewBadge, Rail } from "../ui/primitives";

export function NewThisWeek({ compact = false }: { compact?: boolean }) {
  const [lead, second] = weeklyDrop.worldIds.map((id) => worldById(id)!);
  return (
    <section className="mx-auto max-w-[1480px]">
      <div className="px-5 lg:px-10">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <p className="eyebrow mb-1.5 text-ember-200/90">{weeklyDrop.week}</p>
            <h2 className="font-display text-[28px] font-light leading-tight text-white lg:text-4xl">New this week</h2>
            <p className="mt-1 text-sm text-mist-300">{weeklyDrop.headline}</p>
          </div>
          {compact && (
            <Link href="/new" className="hidden items-center gap-1 text-xs font-medium text-mist-300 hover:text-white sm:flex">
              Explore this week <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>

        <div className="grid grid-cols-4 gap-2 lg:gap-3">
          {weeklyDrop.stats.map((s) => (
            <div key={s.label} className="glass rounded-2xl px-3 py-3 lg:px-5 lg:py-4">
              <p className="font-display text-2xl font-light text-white lg:text-4xl">{s.value}</p>
              <p className="mt-0.5 text-[10px] leading-tight text-mist-300 lg:text-xs">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-[2fr_1fr]">
          <Link href={`/world/${lead.id}`} className="group relative block h-[220px] overflow-hidden rounded-3xl ring-1 ring-white/10 lg:h-[320px]">
            <WorldArt scene={lead.visualStyle.scene} palette={lead.visualStyle.palette} seed={`drop-${lead.id}`} detail="hero" className="absolute inset-0 transition-transform duration-[1500ms] group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-night-950/90 via-night-950/10 to-transparent" />
            <NewBadge className="absolute right-4 top-4" label="New world" />
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-5 lg:p-7">
              <div>
                <h3 className="font-display text-3xl font-light text-white lg:text-4xl">{lead.title}</h3>
                <p className="mt-1 text-sm text-mist-200">{lead.tagline}</p>
              </div>
              <span className="grid h-10 w-10 place-items-center rounded-full border border-white/30 bg-white/10 backdrop-blur"><ArrowRight className="h-4 w-4 text-white" /></span>
            </div>
          </Link>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
            <Link href={`/world/${second.id}`} className="group relative block h-[150px] overflow-hidden rounded-3xl ring-1 ring-white/10 lg:h-auto">
              <WorldArt scene={second.visualStyle.scene} palette={second.visualStyle.palette} seed={`drop-${second.id}`} className="absolute inset-0 transition-transform duration-[1500ms] group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-night-950/90 to-transparent" />
              <NewBadge className="absolute right-3 top-3" />
              <h3 className="absolute bottom-3 left-4 right-4 font-display text-lg font-light leading-tight text-white lg:text-2xl">{second.title}</h3>
            </Link>
            <div className="glass flex flex-col justify-between rounded-3xl p-4 lg:p-5">
              <p className="eyebrow">New story styles</p>
              <ul className="mt-2 space-y-1.5">
                {weeklyDrop.styles.map((s) => (
                  <li key={s.name} className="text-[13px] text-mist-100">{s.name}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <p className="eyebrow mb-3 px-5 lg:px-10">New characters</p>
        <Rail>
          {weeklyDrop.characterIds.map((id) => (
            <CharacterCard key={id} character={characterById(id)!} />
          ))}
        </Rail>
      </div>

      {!compact && (
        <div className="mt-6 px-5 lg:px-10">
          <p className="eyebrow mb-3">New voices</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {weeklyDrop.voiceIds.map((id) => {
              const v = voiceById(id)!;
              return (
                <div key={id} className="glass flex items-center gap-3 rounded-2xl p-3">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-dusk-500/40 to-glow-500/30"><AudioLines className="h-4 w-4 text-white" /></span>
                  <div>
                    <p className="text-sm font-medium text-white">{v.name}</p>
                    <p className="text-xs text-mist-400">{v.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
