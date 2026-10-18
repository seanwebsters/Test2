import { catalog, isLive, liveUniverses, releaseTime } from "@/lib/catalog";
import { DAY_MS } from "@/lib/clock";
import { GENRES, type GenreId, type Universe } from "@/lib/content/types";
import type { DbState } from "@/lib/db/types";
import { inventoryOf } from "./core";

/* ------------------------------------------------------------------ */
/* Popularity                                                           */
/* ------------------------------------------------------------------ */

export interface UniverseStats {
  /** Real platform activity */
  live: { follows: number; collectors: number; packs: number; packs7d: number; packsPrev7d: number; episodesCompleted: number };
  /** Seeded demo baseline (clearly labelled in the UI) */
  demo: Universe["demoMetrics"];
  /** Combined figures shown to consumers, labelled "includes demo data" */
  shown: { followers: number; collectors: number; packsOpened: number; growth: number };
}

const statsCache = new WeakMap<DbState, { key: string; stats: Map<string, UniverseStats> }>();

export function universeStats(state: DbState, at: number): Map<string, UniverseStats> {
  const key = `${state.openings.length}|${state.follows.length}|${state.storyProgress.length}|${state.universes.length}|${Math.floor(at / 60_000)}`;
  const hit = statsCache.get(state);
  if (hit && hit.key === key) return hit.stats;
  const idx = catalog(state);
  const out = new Map<string, UniverseStats>();
  const weekAgo = at - 7 * DAY_MS;
  const twoWeeks = at - 14 * DAY_MS;
  for (const u of idx.universes) {
    const follows = state.follows.filter((f) => f.universeId === u.id).length;
    const opens = state.openings.filter((o) => o.universeId === u.id);
    const collectors = new Set(opens.map((o) => o.userId)).size;
    const packs7d = opens.filter((o) => Date.parse(o.createdAt) >= weekAgo).length;
    const packsPrev7d = opens.filter((o) => Date.parse(o.createdAt) >= twoWeeks && Date.parse(o.createdAt) < weekAgo).length;
    const epIds = new Set(u.episodes.map((e) => e.id));
    const episodesCompleted = state.storyProgress.filter((p) => p.completedAt && epIds.has(p.episodeId)).length;
    const liveGrowth = packsPrev7d ? (packs7d - packsPrev7d) / packsPrev7d : packs7d ? 1 : 0;
    out.set(u.id, {
      live: { follows, collectors, packs: opens.length, packs7d, packsPrev7d, episodesCompleted },
      demo: u.demoMetrics,
      shown: {
        followers: u.demoMetrics.followers + follows,
        collectors: u.demoMetrics.collectors + collectors,
        packsOpened: u.demoMetrics.packsOpened + opens.length,
        growth: u.source === "seed" ? u.demoMetrics.growth : liveGrowth,
      },
    });
  }
  statsCache.set(state, { key, stats: out });
  return out;
}

/* ------------------------------------------------------------------ */
/* Recommendations                                                      */
/* ------------------------------------------------------------------ */

export interface RecContext {
  state: DbState;
  userId?: string;
  at: number;
}

export interface Recommendation {
  universe: Universe;
  score: number;
  reasons: string[];
}

/**
 * Pluggable recommender. The baseline below is deterministic and fully
 * explainable; a learned model can implement the same interface and be
 * swapped in via `setRecommender`.
 */
export interface Recommender {
  id: string;
  recommend(ctx: RecContext): Recommendation[];
}

const genreLabel = (g: GenreId) => GENRES.find((x) => x.id === g)?.label ?? g;

export const baselineRecommender: Recommender = {
  id: "baseline-v1",
  recommend({ state, userId, at }) {
    const idx = catalog(state);
    const live = liveUniverses(state, at);
    const stats = universeStats(state, at);
    const user = userId ? state.users[userId] : undefined;
    const followed = new Set(userId ? state.follows.filter((f) => f.userId === userId).map((f) => f.universeId) : []);
    const inv = userId ? inventoryOf(state, userId) : {};
    const collectedGenres = new Map<GenreId, number>();
    const collectedUniverses = new Set<string>();
    for (const cid of Object.keys(inv)) {
      const u = idx.byId.get(idx.cards.get(cid)?.universeId ?? "");
      if (!u) continue;
      collectedUniverses.add(u.id);
      for (const g of u.genres) collectedGenres.set(g, (collectedGenres.get(g) ?? 0) + 1);
    }
    const storyGenres = new Map<GenreId, number>();
    for (const p of state.storyProgress.filter((x) => x.userId === userId && x.completedAt)) {
      const u = idx.byId.get(idx.episodes.get(p.episodeId)?.universeId ?? "");
      for (const g of u?.genres ?? []) storyGenres.set(g, (storyGenres.get(g) ?? 0) + 1);
    }
    const maxFollowers = Math.max(1, ...live.map((u) => stats.get(u.id)!.shown.followers));

    return live
      .map((u) => {
        const reasons: string[] = [];
        let score = 0;
        const prefMatch = u.genres.filter((g) => user?.genres.includes(g));
        if (prefMatch.length) {
          score += 3 * prefMatch.length;
          reasons.push(`You like ${prefMatch.map(genreLabel).join(" & ")}`);
        }
        const collectAffinity = u.genres.reduce((s, g) => s + Math.min(3, collectedGenres.get(g) ?? 0), 0);
        if (collectAffinity && !collectedUniverses.has(u.id)) {
          score += 0.4 * collectAffinity;
          reasons.push("Similar to worlds you collect");
        }
        const storyAffinity = u.genres.reduce((s, g) => s + (storyGenres.get(g) ?? 0), 0);
        if (storyAffinity) score += 0.5 * Math.min(4, storyAffinity);
        const ageDays = (at - releaseTime(idx, u.launchOffsetDays)) / DAY_MS;
        if (ageDays < 21) {
          score += 2;
          reasons.push("New this month");
        }
        score += 1.5 * Math.log10(1 + (9 * stats.get(u.id)!.shown.followers) / maxFollowers);
        if (u.editorial.staffPick) {
          score += 1;
          reasons.push("Staff pick");
        }
        if (u.editorial.featured) score += 0.5;
        if (followed.has(u.id)) score -= 4;
        if (!reasons.length) reasons.push("Popular on NEXARA");
        return { universe: u, score: Math.round(score * 100) / 100, reasons };
      })
      .sort((a, b) => b.score - a.score || a.universe.slug.localeCompare(b.universe.slug));
  },
};

let active: Recommender = baselineRecommender;
export const setRecommender = (r: Recommender) => (active = r);
export const recommend = (ctx: RecContext) => active.recommend(ctx);

export function becauseYouCollected(state: DbState, userId: string | undefined, at: number) {
  if (!userId) return undefined;
  const idx = catalog(state);
  const inv = inventoryOf(state, userId);
  const recent = Object.entries(inv).sort((a, b) => b[1].lastAt.localeCompare(a[1].lastAt))[0];
  if (!recent) return undefined;
  const card = idx.cards.get(recent[0]);
  const source = card && idx.byId.get(card.universeId);
  if (!card || !source) return undefined;
  const similar = liveUniverses(state, at)
    .filter((u) => u.id !== source.id)
    .map((u) => ({ u, overlap: u.genres.filter((g) => source.genres.includes(g)).length }))
    .filter((x) => x.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap || a.u.slug.localeCompare(b.u.slug))
    .map((x) => x.u);
  return { card, source, similar };
}

/* ------------------------------------------------------------------ */
/* Search                                                               */
/* ------------------------------------------------------------------ */

export type SearchKind = "universe" | "character" | "card" | "episode" | "genre" | "collector";

export interface SearchHit {
  kind: SearchKind;
  id: string;
  title: string;
  subtitle: string;
  href: string;
  universeId?: string;
  score: number;
}

function scoreText(q: string, text: string): number {
  const t = text.toLowerCase();
  if (t === q) return 10;
  if (t.startsWith(q)) return 7;
  if (t.split(/[\s'’\-]+/).some((w) => w.startsWith(q))) return 5;
  if (t.includes(q)) return 3;
  return 0;
}

export function search(state: DbState, rawQ: string, at: number, kinds?: SearchKind[], limit = 40): SearchHit[] {
  const q = rawQ.trim().toLowerCase().slice(0, 80);
  if (q.length < 1) return [];
  const idx = catalog(state);
  const want = (k: SearchKind) => !kinds?.length || kinds.includes(k);
  const hits: SearchHit[] = [];
  const live = liveUniverses(state, at);
  const liveIds = new Set(live.map((u) => u.id));

  if (want("genre"))
    for (const g of GENRES) {
      const s = scoreText(q, g.label);
      if (s) hits.push({ kind: "genre", id: g.id, title: g.label, subtitle: "Genre", href: `/discover?genre=${g.id}`, score: s + 1 });
    }
  for (const u of live) {
    if (want("universe")) {
      const s = Math.max(scoreText(q, u.title) * 1.5, scoreText(q, u.tagline) * 0.5, u.genres.some((g) => genreLabel(g).toLowerCase().includes(q)) ? 2 : 0);
      if (s) hits.push({ kind: "universe", id: u.id, title: u.title, subtitle: u.tagline, href: `/universes/${u.slug}`, universeId: u.id, score: s + 2 });
    }
    if (want("character"))
      for (const c of u.characters) {
        const s = Math.max(scoreText(q, c.name), scoreText(q, c.title) * 0.6);
        if (s) hits.push({ kind: "character", id: `${u.id}:${c.id}`, title: c.name, subtitle: `${c.title} · ${u.title}`, href: `/universes/${u.slug}/characters#${c.id}`, universeId: u.id, score: s + 1 });
      }
    if (want("episode"))
      for (const e of u.episodes) {
        if (releaseTime(idx, e.releaseOffsetDays) > at) continue;
        const s = Math.max(scoreText(q, e.title), scoreText(q, e.synopsis) * 0.4);
        if (s) hits.push({ kind: "episode", id: e.id, title: e.title, subtitle: `${u.title} · S${e.season} E${e.number}`, href: `/stories/${e.id}`, universeId: u.id, score: s });
      }
  }
  if (want("card"))
    for (const c of idx.cards.values()) {
      if (!liveIds.has(c.universeId) || releaseTime(idx, c.releaseOffsetDays) > at) continue;
      const s = Math.max(scoreText(q, c.name), scoreText(q, c.description) * 0.4);
      if (s) hits.push({ kind: "card", id: c.id, title: c.name, subtitle: `${c.rarity[0]!.toUpperCase()}${c.rarity.slice(1)} · ${idx.byId.get(c.universeId)?.title}`, href: `/cards/${c.id}`, universeId: c.universeId, score: s });
    }
  if (want("collector"))
    for (const u of Object.values(state.users)) {
      if (u.isGuest || u.role === "admin") continue;
      const s = Math.max(scoreText(q, u.username), scoreText(q, u.displayName));
      if (s) hits.push({ kind: "collector", id: u.id, title: u.displayName, subtitle: `@${u.username}`, href: `/profile/${u.username}`, score: s });
    }
  return hits.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title)).slice(0, limit);
}

export function trendingSearches(state: DbState, at: number): string[] {
  const recent = state.searches.filter((s) => Date.parse(s.at) > at - 7 * DAY_MS);
  const counts = new Map<string, number>();
  for (const s of recent) counts.set(s.q.toLowerCase(), (counts.get(s.q.toLowerCase()) ?? 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([q]) => q);
  const editorial = ["Mythic", "Ila Marrow", "Ghost Signal", "Cosy", "Lumen", "Room 404"];
  return [...new Set([...top, ...editorial])].slice(0, 8);
}

export function isUniverseLive(state: DbState, universeId: string, at: number) {
  const idx = catalog(state);
  const u = idx.byId.get(universeId);
  return !!u && isLive(idx, u, at);
}
