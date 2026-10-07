"use client";

import Link from "next/link";
import { AudioLines, Check, Clock, Moon, RotateCcw } from "lucide-react";
import { useDreamStore } from "@/lib/store";
import { worlds } from "@/lib/data/worlds";
import { characters } from "@/lib/data/characters";
import { voices } from "@/lib/data/partners";
import { SLEEPINESS } from "@/lib/services/dreams";
import type { DreamLength } from "@/lib/types";
import { WorldArt } from "@/components/art/WorldArt";
import { CharacterPortrait } from "@/components/art/CharacterPortrait";
import { Chip, PageTitle } from "@/components/ui/primitives";

const LENGTHS: DreamLength[] = [20, 40, 60, "all-night"];

export default function YouPage() {
  const store = useDreamStore();
  const p = store.prefs;

  return (
    <div className="mx-auto max-w-[1100px] pb-10">
      <PageTitle eyebrow="Preferences" title={<>Good evening, <span className="italic text-gradient">{p.displayName}</span></>} subtitle="Dream Worlds learns what helps you sleep. Tune it here." />

      <div className="mt-8 space-y-10 px-5 lg:px-10">
        <Section title="Favourite worlds">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {worlds.map((w) => {
              const on = p.favouriteWorlds.includes(w.id);
              return (
                <button key={w.id} onClick={() => store.toggleFavWorld(w.id)} className={`group relative h-24 overflow-hidden rounded-2xl text-left ${on ? "ring-2 ring-glow-300" : "ring-1 ring-white/10"}`}>
                  <WorldArt scene={w.visualStyle.scene} palette={w.visualStyle.palette} seed={w.id} className="absolute inset-0" />
                  <div className="absolute inset-0 bg-gradient-to-t from-night-950/90 to-night-950/10" />
                  <span className="absolute bottom-2 left-3 right-8 text-[13px] font-medium leading-tight text-white">{w.title}</span>
                  {on && <span className="chip-on absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full"><Check className="h-3 w-3" strokeWidth={3} /></span>}
                </button>
              );
            })}
          </div>
        </Section>

        <Section title="Favourite characters">
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-8">
            {characters.map((c) => {
              const on = p.favouriteCharacters.includes(c.id);
              return (
                <button key={c.id} onClick={() => store.toggleFavCharacter(c.id)} className="flex flex-col items-center gap-1.5">
                  <div className={`relative h-16 w-16 overflow-hidden rounded-full ${on ? "ring-2 ring-glow-300 ring-offset-2 ring-offset-night-950" : "opacity-60 ring-1 ring-white/10"}`}>
                    <CharacterPortrait character={c} className="h-full w-full" />
                  </div>
                  <span className={`text-center text-[10px] leading-tight ${on ? "text-white" : "text-mist-400"}`}>{c.name.replace(/^The /, "")}</span>
                </button>
              );
            })}
          </div>
        </Section>

        <Section title="Preferred narrator voice" icon={AudioLines}>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {voices.filter((v) => v.approvedFor.includes("narration")).map((v) => (
              <button key={v.id} onClick={() => store.updatePrefs({ preferredVoiceId: v.id })} className={`rounded-2xl p-4 text-left transition ${p.preferredVoiceId === v.id ? "chip-on" : "glass hover:bg-white/[0.07]"}`}>
                <p className={`text-sm font-semibold ${p.preferredVoiceId === v.id ? "text-night-900" : "text-white"}`}>{v.name} {v.isNew && <span className="ml-1 text-[10px] uppercase tracking-wider opacity-70">New</span>}</p>
                <p className={`mt-0.5 text-xs ${p.preferredVoiceId === v.id ? "text-night-800/80" : "text-mist-400"}`}>{v.description}</p>
              </button>
            ))}
          </div>
        </Section>

        <div className="grid gap-10 lg:grid-cols-3">
          <Section title="Usual sleep time" icon={Clock}>
            <input type="time" value={p.usualSleepTime} onChange={(e) => store.updatePrefs({ usualSleepTime: e.target.value })} className="glass rounded-2xl px-4 py-3 text-lg text-white [color-scheme:dark]" />
            <p className="mt-2 text-xs text-mist-400">We&apos;ll have tonight&apos;s episode ready a little before.</p>
          </Section>
          <Section title="Default dream length">
            <div className="flex flex-wrap gap-2">
              {LENGTHS.map((l) => (
                <Chip key={String(l)} on={p.defaultLength === l} onClick={() => store.updatePrefs({ defaultLength: l })}>
                  {l === "all-night" ? "All night" : `${l} min`}
                </Chip>
              ))}
            </div>
          </Section>
          <Section title="Sleepiness level" icon={Moon}>
            <div className="flex flex-wrap gap-2">
              {SLEEPINESS.map((s) => (
                <Chip key={s.id} on={p.defaultSleepiness === s.id} onClick={() => store.updatePrefs({ defaultSleepiness: s.id })}>
                  {s.label}
                </Chip>
              ))}
            </div>
          </Section>
        </div>

        <div className="glass flex flex-col gap-4 rounded-3xl p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-white">Your data stays on this device</p>
            <p className="text-xs text-mist-400">Prototype storage uses localStorage. Production syncs to your Calm account.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/pitch" className="rounded-full border border-white/10 px-4 py-2 text-xs text-mist-300">About Dream Worlds</Link>
            <button onClick={store.resetDemo} className="flex items-center gap-1.5 rounded-full border border-white/10 px-4 py-2 text-xs text-mist-300">
              <RotateCcw className="h-3 w-3" /> Reset demo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon?: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-light text-white">
        {Icon && <Icon className="h-4 w-4 text-dusk-400" />} {title}
      </h2>
      {children}
    </section>
  );
}
