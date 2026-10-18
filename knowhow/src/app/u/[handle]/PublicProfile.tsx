"use client";
import { useMemo } from "react";
import { useCatalog } from "@/components/providers/CatalogProvider";
import { useApp } from "@/components/providers/AppState";
import { Avatar } from "@/components/ui/Avatar";
import { KnowledgeCard } from "@/components/cards/KnowledgeCard";
import { CollectionCard } from "@/components/catalog/CollectionCard";
import { SeriesTile } from "@/components/catalog/Tiles";
import { UniverseGraph } from "@/components/universe/UniverseGraph";
import { Flame, Share2, Zap } from "@/components/ui/Icon";
import { cardView } from "@/lib/cards";
import { buildUniverse } from "@/lib/universe";
import { TOPIC_BY_ID, CATEGORY_BY_ID } from "@/content/categories";
import type { CardRecord, CollectionRecord } from "@/lib/model";
import type { CategoryId } from "@/lib/types";

interface Props {
  handle: string; displayName: string; bio: string; avatarHue: number; level: number; title: string; xp: number;
  streak: { current: number; longest: number }; completed: string[]; favourites: string[]; completedSeries: string[];
  cards: CardRecord[]; interests: CategoryId[]; minutes: number; collections: CollectionRecord[];
}

export function PublicProfile({ profile: p }: { profile: Props }) {
  const { series, bySlug } = useCatalog();
  const { state, toast } = useApp();
  const universe = useMemo(() => buildUniverse(series, p.completed, p.interests), [series, p.completed, p.interests]);
  const mine = state?.handle === p.handle;
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: `${p.displayName} on KNOWHOW`, url: window.location.href });
      else { await navigator.clipboard.writeText(window.location.href); toast({ title: "Profile link copied", tone: "plain" }); }
    } catch { /* cancelled */ }
  };
  return (
    <div className="pb-safe-nav px-4 pt-[calc(20px+var(--safe-top))] md:px-10 md:pt-10">
      <header className="flex flex-col items-start gap-5 md:flex-row md:items-center">
        <Avatar name={p.displayName} hue={p.avatarHue} className="h-24 w-24 text-3xl" />
        <div className="flex-1">
          <h1 className="display text-[36px] md:text-[52px]">{p.displayName}</h1>
          <div className="text-cream-dim">@{p.handle} · Level {p.level} {p.title}</div>
          {p.bio && <p className="mt-2 max-w-lg text-sm text-cream-dim">{p.bio}</p>}
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <span className="chip"><Zap size={13} className="text-lime" /> {p.xp} XP</span>
            <span className="chip"><Flame size={13} className="text-coral" /> {p.streak.current} day streak</span>
            <span className="chip">{p.minutes} min listened</span>
            <span className="chip">{p.completed.length} episodes</span>
          </div>
        </div>
        <button onClick={share} className="btn-ghost h-11 px-5"><Share2 size={16} /> {mine ? "Share my profile" : "Share"}</button>
      </header>

      <section className="mt-10">
        <h2 className="text-2xl font-bold">Knowledge universe</h2>
        <div className="relative mt-4 h-[460px] overflow-hidden rounded-[32px] bg-[radial-gradient(80%_60%_at_50%_45%,#1b1b33_0%,#111114_70%)] md:h-[560px]">
          <UniverseGraph universe={universe} className="absolute inset-0" />
        </div>
        {universe.litTopics.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {universe.litTopics.map((t) => TOPIC_BY_ID[t]).filter(Boolean).map((t) => <span key={t.id} className="chip" style={{ color: CATEGORY_BY_ID[t.category].color }}>{t.label}</span>)}
          </div>
        )}
      </section>

      {p.favourites.length > 0 && (
        <section className="mt-12">
          <h2 className="text-2xl font-bold">Favourite series</h2>
          <div className="rail mt-4">{p.favourites.map((s) => bySlug[s]).filter(Boolean).map((s) => <SeriesTile key={s.slug} series={s} />)}</div>
        </section>
      )}

      <section className="mt-12">
        <h2 className="text-2xl font-bold">Badges & cards</h2>
        {p.cards.length ? (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {p.cards.map((c) => { const v = cardView(c.key, c.rarity, bySlug); return v ? <KnowledgeCard key={c.id} card={v} unlockedAt={c.unlockedAt} /> : null; })}
          </div>
        ) : <p className="mt-3 text-sm text-cream-mute">No cards yet.</p>}
      </section>

      {p.collections.length > 0 && (
        <section className="mt-12">
          <h2 className="text-2xl font-bold">Public collections</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">{p.collections.map((c) => <CollectionCard key={c.id} c={c} />)}</div>
        </section>
      )}

      {p.completedSeries.length > 0 && (
        <section className="mt-12">
          <h2 className="text-2xl font-bold">Completed</h2>
          <div className="mt-3 flex flex-wrap gap-2">{p.completedSeries.map((s) => <span key={s} className="chip">{bySlug[s]?.title ?? s}</span>)}</div>
        </section>
      )}
    </div>
  );
}
