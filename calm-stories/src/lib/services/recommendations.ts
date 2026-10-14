import "server-only";
import type { Database } from "@/lib/db";
import type { Viewer } from "@/lib/auth";
import type { Series } from "@/lib/types";

/**
 * Recommendation strategy interface. v1 scores by genre affinity, followed
 * series/creators and listening history; a learned model can replace it later
 * without touching callers.
 */
export interface Recommender {
  rank(db: Database, viewer: Viewer, candidates: Series[]): Promise<Series[]>;
}

export const affinityRecommender: Recommender = {
  async rank(db, viewer, candidates) {
    if (!viewer.user) return [...candidates].sort((a, b) => b.popularity - a.popularity);
    const uid = viewer.user.id;
    const [follows, creatorFollows, progress, library] = await Promise.all([
      db.list("series_follows", { where: { user_id: uid } }),
      db.list("creator_follows", { where: { user_id: uid } }),
      db.list("listening_progress", { where: { user_id: uid } }),
      db.list("user_libraries", { where: { user_id: uid } }),
    ]);
    const engaged = new Set([...follows.map((f) => f.series_id), ...progress.map((p) => p.series_id), ...library.map((l) => l.series_id)]);
    const followedCreators = new Set(creatorFollows.map((c) => c.creator_id));
    const genreWeight = new Map<string, number>();
    const tagWeight = new Map<string, number>();
    for (const s of candidates) {
      if (!engaged.has(s.id)) continue;
      genreWeight.set(s.genre, (genreWeight.get(s.genre) ?? 0) + 1);
      for (const t of s.tags) tagWeight.set(t, (tagWeight.get(t) ?? 0) + 1);
    }
    const score = (s: Series) =>
      (genreWeight.get(s.genre) ?? 0) * 3 +
      s.tags.reduce((acc, t) => acc + (tagWeight.get(t) ?? 0), 0) +
      (followedCreators.has(s.creator_id) ? 4 : 0) +
      s.popularity / 50;
    return candidates.filter((s) => !engaged.has(s.id)).sort((a, b) => score(b) - score(a));
  },
};

export function recommendFor(db: Database, viewer: Viewer, candidates: Series[]) {
  return affinityRecommender.rank(db, viewer, candidates);
}
