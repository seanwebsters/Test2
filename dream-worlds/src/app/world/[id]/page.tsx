"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, AudioLines, Check, Heart, MapPin, ShieldCheck, Sparkles, X } from "lucide-react";
import { worldById, worlds } from "@/lib/data/worlds";
import { charactersForWorld } from "@/lib/data/characters";
import { loreDocuments, partnerById } from "@/lib/data/partners";
import { effectiveCrossover, effectiveUsageRules, worldsCompatible } from "@/lib/services/rights";
import { allCurated, toneLabel } from "@/lib/services/dreams";
import { useDreamStore } from "@/lib/store";
import { WorldArt } from "@/components/art/WorldArt";
import { CharacterCard } from "@/components/cards/CharacterCard";
import { DreamCard } from "@/components/cards/DreamCard";
import { Rail } from "@/components/ui/primitives";

export default function WorldPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const store = useDreamStore();
  const world = worldById(id);
  const dreams = useMemo(() => allCurated().filter((d) => d.request.worlds.includes(id)), [id]);
  if (!world) return <div className="p-10 text-mist-400">World not found</div>;

  const partner = partnerById(world.partnerId)!;
  const rules = effectiveUsageRules(world);
  const cross = effectiveCrossover(world);
  const chars = charactersForWorld(world.id);
  const fav = store.prefs.favouriteWorlds.includes(world.id);

  return (
    <div className="overflow-x-hidden">
      <section className="relative h-[72svh] min-h-[520px] overflow-hidden lg:h-[80vh]">
        <WorldArt scene={world.visualStyle.scene} palette={world.visualStyle.palette} seed={`world-${world.id}`} detail="hero" className="absolute inset-0 animate-pan" />
        <div className="grain absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-t from-night-950 via-night-950/20 to-night-950/50" />
        <button onClick={() => router.back()} className="absolute left-5 top-[max(var(--safe-top),18px)] grid h-10 w-10 place-items-center rounded-full bg-night-950/40 backdrop-blur lg:left-10 lg:top-24" aria-label="Back">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-[1480px] px-5 pb-8 lg:px-10 lg:pb-14">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }}>
            <p className="eyebrow mb-3">{world.genre} · {partner.tier === "calm-original" ? "Calm Original" : partner.name}</p>
            <h1 className="font-display text-[46px] font-light leading-none text-white lg:text-[88px]">{world.title}</h1>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-mist-200">{world.description}</p>
            <div className="mt-6 flex gap-3">
              <Link href={`/create?world=${world.id}`} className="btn-dream flex flex-1 items-center justify-center gap-2 rounded-full px-7 py-4 text-sm font-semibold sm:flex-none">
                <Sparkles className="h-4 w-4" /> Dream in this world
              </Link>
              <button onClick={() => store.toggleFavWorld(world.id)} className={`grid h-[52px] w-[52px] place-items-center rounded-full border backdrop-blur ${fav ? "border-ember-200/50 bg-ember-200/15 text-ember-200" : "border-white/20 bg-white/5"}`} aria-label="Favourite">
                <Heart className={`h-5 w-5 ${fav ? "fill-current" : ""}`} />
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="mx-auto max-w-[1480px] space-y-14 pt-6">
        <section>
          <h2 className="mb-4 px-5 font-display text-2xl font-light lg:px-10">Characters</h2>
          <Rail>
            {chars.map((c) => (
              <div key={c.id} id={c.id} className="flex shrink-0 snap-start flex-col gap-2">
                <CharacterCard character={c} href={`/create?character=${c.id}`} />
                <p className="w-[140px] text-[11px] leading-snug text-mist-400 lg:w-[170px]">{c.personality.slice(0, 3).join(" · ")}</p>
              </div>
            ))}
          </Rail>
        </section>

        <section className="grid grid-cols-1 gap-6 px-5 lg:grid-cols-[1.4fr_1fr] lg:px-10">
          <div>
            <h2 className="mb-3 font-display text-2xl font-light">Lore</h2>
            <p className="font-display text-lg font-light italic leading-relaxed text-mist-200">{world.lore}</p>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              {world.locations.map((l) => (
                <div key={l.id} className="glass rounded-2xl p-4">
                  <p className="flex items-center gap-2 text-sm font-medium text-white"><MapPin className="h-3.5 w-3.5 text-dusk-400" /> {l.name}</p>
                  <p className="mt-1 text-xs text-mist-400">{l.description}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {world.sounds.flatMap((s) => s.layers).map((l) => (
                <span key={l} className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs text-mist-300"><AudioLines className="h-3 w-3" /> {l}</span>
              ))}
            </div>
          </div>

          {/* Rights panel — what the IP partner configured */}
          <div className="glass h-fit rounded-3xl p-5 lg:p-6">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-ember-200/90"><ShieldCheck className="h-4 w-4" /> Rights holder settings</p>
            <p className="mt-2 text-sm text-mist-300">{partner.credit}</p>
            <dl className="mt-5 space-y-4 text-sm">
              <Row label="Approved tones">{world.allowedThemes.filter((t) => rules.allowedTones.length === 0 || rules.allowedTones.includes(t)).map(toneLabel).join(", ")}</Row>
              <Row label="Restricted themes">{rules.restrictedThemes.join(", ")}</Row>
              <Row label="Story rules">{[...rules.storyRestrictions, ...world.contentRestrictions].join(" · ")}</Row>
              <Row label="Crossovers">{cross.crossoverAllowed ? (cross.allowedPartners === "*" ? "Open to all partners" : "Approved partners only") : "Not permitted"}</Row>
              <Row label="Lore canon">{loreDocuments.filter((d) => d.worldId === world.id).map((d) => `${d.title} v${d.version}`).join(", ")}</Row>
            </dl>
            <div className="mt-5 grid grid-cols-2 gap-1.5 border-t border-white/[0.06] pt-4">
              {worlds.filter((w) => w.id !== world.id).map((w) => {
                const ok = worldsCompatible(world, w).ok;
                return (
                  <span key={w.id} className={`flex items-center gap-1.5 text-[11px] ${ok ? "text-mist-200" : "text-mist-500 line-through"}`}>
                    {ok ? <Check className="h-3 w-3 text-glow-300" /> : <X className="h-3 w-3" />} {w.title}
                  </span>
                );
              })}
            </div>
          </div>
        </section>

        {dreams.length > 0 && (
          <section>
            <h2 className="mb-4 px-5 font-display text-2xl font-light lg:px-10">Dreams set here</h2>
            <Rail>
              {dreams.map((d) => (
                <DreamCard key={d.id} dream={d} />
              ))}
            </Rail>
          </section>
        )}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-mist-500">{label}</dt>
      <dd className="mt-1 text-[13px] leading-relaxed text-mist-200">{children}</dd>
    </div>
  );
}
