import "server-only";
import { getDb } from "@/lib/db";
import type { Viewer } from "@/lib/auth/policy";
import type { SeriesCard } from "./catalog";
import type { Series } from "@/lib/types";

/**
 * Recommendation strategy interface. v1 is a transparent content-based
 * scorer (genres from listening history, follows and saves, then popularity).
 * A collaborative or embedding-based strategy can implement the same shape.
 */
export interface RecommendationStrategy {
  name: string;
  score(input: { card: SeriesCard; series: Series; affinity: Map<string, number>; tagAffinity: Map<string, number> }): number;
}

export const contentBasedStrategy: RecommendationStrategy = {
  name: "content-v1",
  score({ card, series, affinity, tagAffinity }) {
    const genre = affinity.get(card.genre) ?? 0;
    const tags = series.tags.reduce((acc, t) => acc + (tagAffinity.get(t) ?? 0), 0);
    return genre * 40 + tags * 8 + card.popularity * 0.5 + card.trending_score * 0.2;
  },
};

export async function recommendSeries(
  viewer: Viewer,
  idx: { series: Series[]; cards: Map<string, SeriesCard> },
  strategy: RecommendationStrategy = contentBasedStrategy,
): Promise<SeriesCard[]> {
  const affinity = new Map<string, number>();
  const tagAffinity = new Map<string, number>();
  const engaged = new Set<string>();

  const prefs = viewer.user ? await getDb().get("user_settings", viewer.user.id) : null;
  if (viewer.user && !prefs?.private_listening_history) {
    const db = getDb();
    const uid = viewer.user.id;
    const [progress, library, follows] = await Promise.all([
      db.list("listening_progress", { where: { user_id: uid } }),
      db.list("user_libraries", { where: { user_id: uid } }),
      db.list("series_follows", { where: { user_id: uid } }),
    ]);
    const bump = (seriesId: string, w: number) => {
      const s = idx.series.find((x) => x.id === seriesId);
      if (!s) return;
      engaged.add(seriesId);
      affinity.set(s.genre, (affinity.get(s.genre) ?? 0) + w);
      for (const t of s.tags) tagAffinity.set(t, (tagAffinity.get(t) ?? 0) + w);
    };
    progress.forEach((p) => bump(p.series_id, p.completed ? 1 : 0.6));
    library.forEach((l) => bump(l.series_id, 1.2));
    follows.forEach((f) => bump(f.series_id, 1.5));
    // Normalise so heavy listeners don't drown out popularity entirely.
    const max = Math.max(1, ...affinity.values());
    for (const [k, v] of affinity) affinity.set(k, v / max);
    const tmax = Math.max(1, ...tagAffinity.values());
    for (const [k, v] of tagAffinity) tagAffinity.set(k, v / tmax);
  }

  return [...idx.cards.values()]
    .filter((c) => c.episode_count > 0 && !engaged.has(c.id))
    .map((card) => ({ card, score: strategy.score({ card, series: idx.series.find((s) => s.id === card.id)!, affinity, tagAffinity }) }))
    .sort((a, b) => b.score - a.score)
    .map((x) => x.card);
}
