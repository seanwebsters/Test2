"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useApp } from "@/components/providers/AppState";
import { useCatalog } from "@/components/providers/CatalogProvider";
import { UniverseGraph, type Positioned } from "@/components/universe/UniverseGraph";
import { usePlaySeries } from "@/components/catalog/Tiles";
import { CoverArt } from "@/components/art/Cover";
import { ArrowUpRight, Play, Share2, Sparkles, X } from "@/components/ui/Icon";
import { CATEGORIES, CATEGORY_BY_ID, TOPICS, TOPIC_BY_ID } from "@/content/categories";
import { buildUniverse } from "@/lib/universe";

const SEEN_KEY = "kh_seen_stars";

export function UniversePage() {
  const { state, toast } = useApp();
  const { series, bySlug } = useCatalog();
  const [selected, setSelected] = useState<Positioned | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());

  const completed = useMemo(() => Object.entries(state?.progress ?? {}).filter(([, p]) => p.completed).map(([id]) => id), [state?.progress]);
  const universe = useMemo(() => buildUniverse(series, completed, state?.interests ?? []), [series, completed, state?.interests]);

  // Stars lit since the last visit get an unlock animation.
  useEffect(() => {
    if (!state) return;
    try {
      const seen = new Set<string>(JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]"));
      const now = universe.litTopics.filter((t) => !seen.has(t));
      if (now.length) {
        setFresh(new Set(now));
        toast({ title: `${now.length} new star${now.length > 1 ? "s" : ""} unlocked`, body: now.map((t) => TOPIC_BY_ID[t]?.label).filter(Boolean).slice(0, 3).join(" · "), tone: "lime", icon: "zap" });
      }
      localStorage.setItem(SEEN_KEY, JSON.stringify(universe.litTopics));
    } catch {
      /* storage unavailable */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.id, universe.litTopics.length]);

  const litCats = CATEGORIES.filter((c) => universe.categoryCounts[c.id] > 0).length;

  return (
    <div className="relative h-[100svh] overflow-hidden bg-[radial-gradient(80%_60%_at_50%_45%,#1b1b33_0%,#111114_70%)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 px-4 pt-[calc(18px+var(--safe-top))] md:px-10 md:pt-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="eyebrow">My Universe</div>
            <h1 className="display mt-1 text-[30px] md:text-[44px]">Your brain, <span className="editorial normal-case text-lime">mapped</span></h1>
          </div>
          {state && (
            <Link href={`/u/${state.handle}`} className="pointer-events-auto chip h-10 hover:text-cream"><Share2 size={14} /> Share</Link>
          )}
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="chip"><span className="h-2 w-2 rounded-full bg-lime" /> {universe.litTopics.length} star{universe.litTopics.length === 1 ? "" : "s"} lit</span>
          <span className="chip">{litCats}/10 universes</span>
          <span className="chip">{completed.length} episode{completed.length === 1 ? "" : "s"} finished</span>
          <span className="chip">{universe.hiddenCount} still in the dark</span>
        </div>
      </div>

      <UniverseGraph universe={universe} selected={selected?.id} onSelect={setSelected} fresh={fresh} className="absolute inset-0" />

      {completed.length === 0 && !selected && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="absolute inset-x-4 bottom-[calc(150px+var(--safe-bottom))] z-10 mx-auto max-w-md rounded-3xl border border-white/10 bg-ink-2/90 p-5 backdrop-blur-xl md:bottom-8">
          <div className="flex items-center gap-2 text-sm font-bold text-lime"><Sparkles size={16} /> Your universe is waiting</div>
          <p className="mt-1.5 text-sm text-cream-dim">Every episode you finish lights up the topics it covers. Tap a dim star to see which series will light it.</p>
          <Link href="/" className="btn-lime mt-4 w-full">Find something to play</Link>
        </motion.div>
      )}

      <AnimatePresence>{selected && <NodePanel key={selected.id} node={selected} onClose={() => setSelected(null)} completedCount={completed.length} bySlugKeys={bySlug} />}</AnimatePresence>
    </div>
  );
}

function NodePanel({ node, onClose, completedCount, bySlugKeys }: { node: Positioned; onClose: () => void; completedCount: number; bySlugKeys: ReturnType<typeof useCatalog>["bySlug"] }) {
  const play = usePlaySeries();
  const { series } = useCatalog();
  const isCat = node.id.startsWith("cat:");
  const cat = isCat ? CATEGORY_BY_ID[node.id.slice(4) as keyof typeof CATEGORY_BY_ID] : node.category !== "self" ? CATEGORY_BY_ID[node.category] : null;
  const list = isCat ? series.filter((s) => s.category === cat!.id) : node.series.map((s) => bySlugKeys[s]).filter(Boolean);
  const topic = TOPIC_BY_ID[node.id];
  const related = topic ? [...(topic.related ?? []), ...TOPICS.filter((t) => t.related?.includes(topic.id)).map((t) => t.id)].map((id) => TOPIC_BY_ID[id]).filter(Boolean) : [];
  const status =
    node.id === "self" ? `${completedCount} episodes finished`
    : node.state === "lit" ? `Lit · ${node.count} episode${node.count === 1 ? "" : "s"} finished here`
    : node.state === "path" ? "On your path — you've explored beneath it"
    : node.state === "category-lit" ? `${node.count} episodes finished in this universe`
    : node.state === "category-dim" ? "Not explored yet"
    : "Undiscovered — finish an episode below to light it";
  return (
    <motion.aside
      initial={{ y: "100%", opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: "100%", opacity: 0 }}
      transition={{ type: "spring", stiffness: 320, damping: 34 }}
      className="absolute inset-x-0 z-20 max-h-[60vh] overflow-y-auto rounded-t-[32px] border-t border-white/10 bg-ink-2/95 p-5 backdrop-blur-xl md:inset-x-auto md:bottom-6 md:right-24 md:top-28 md:max-h-none md:w-[380px] md:rounded-[32px] md:border bottom-[calc(76px+var(--safe-bottom))] md:bottom-6"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="eyebrow" style={{ color: node.color }}>{node.id === "self" ? "Your mind" : isCat ? "Universe" : cat?.label}</div>
          <h2 className="display mt-1 text-2xl">{node.id === "self" ? "You" : node.label}</h2>
          <p className="mt-1 text-sm text-cream-dim">{status}</p>
        </div>
        <button onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10" aria-label="Close"><X size={16} /></button>
      </div>
      {isCat && cat && <p className="mt-3 text-sm text-cream-dim">{cat.blurb}</p>}
      {related.length > 0 && (
        <div className="mt-4">
          <div className="eyebrow mb-2">Connected to</div>
          <div className="flex flex-wrap gap-1.5">
            {related.map((t) => <span key={t.id} className="chip" style={{ color: CATEGORY_BY_ID[t.category].color }}>{t.label}</span>)}
          </div>
        </div>
      )}
      {list.length > 0 && (
        <div className="mt-5">
          <div className="eyebrow mb-2">{node.state === "lit" ? "Go deeper" : "Light it up with"}</div>
          <ul className="space-y-2">
            {list.slice(0, 6).map((s) => (
              <li key={s.slug} className="flex items-center gap-3">
                <Link href={`/series/${s.slug}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl p-1.5 transition hover:bg-white/5">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl"><CoverArt art={s.art} seed={s.slug} /></div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{s.title}</div>
                    <div className="truncate text-xs text-cream-mute">{s.tagline}</div>
                  </div>
                </Link>
                <button onClick={() => play(s)} className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink" style={{ background: node.color }} aria-label={`Play ${s.title}`}>
                  <Play size={16} fill="currentColor" className="ml-0.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {isCat && cat && (
        <Link href={`/c/${cat.id}`} className="btn-ghost mt-4 w-full">Explore {cat.label} <ArrowUpRight size={16} /></Link>
      )}
    </motion.aside>
  );
}
