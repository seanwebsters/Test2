import { DAY_MS } from "@/lib/clock";
import { seedUniverses } from "@/lib/content/build";
import type { Card, Character, Episode, Universe } from "@/lib/content/types";
import type { DbState } from "@/lib/db/types";

export interface CatalogIndex {
  epoch: number;
  universes: Universe[];
  bySlug: Map<string, Universe>;
  byId: Map<string, Universe>;
  cards: Map<string, Card>;
  episodes: Map<string, Episode>;
  characters: Map<string, { character: Character; universe: Universe }>;
}

const cache = new WeakMap<DbState, CatalogIndex>();

/** All universes (any status) with Studio overrides applied. Memoised per committed state. */
export function catalog(state: DbState): CatalogIndex {
  const hit = cache.get(state);
  if (hit) return hit;
  const epoch = Date.parse(state.seededAt);
  const universes = [...seedUniverses(), ...state.universes].map((u) => applyOverride(u, state));
  const idx: CatalogIndex = {
    epoch,
    universes,
    bySlug: new Map(universes.map((u) => [u.slug, u])),
    byId: new Map(universes.map((u) => [u.id, u])),
    cards: new Map(universes.flatMap((u) => u.cards.map((c) => [c.id, c] as const))),
    episodes: new Map(universes.flatMap((u) => u.episodes.map((e) => [e.id, e] as const))),
    characters: new Map(universes.flatMap((u) => u.characters.map((c) => [`${u.id}:${c.id}`, { character: c, universe: u }] as const))),
  };
  cache.set(state, idx);
  return idx;
}

function applyOverride(u: Universe, state: DbState): Universe {
  const o = state.overrides[u.id];
  if (!o) return u;
  return {
    ...u,
    status: o.status ?? u.status,
    editorial: { ...u.editorial, featured: o.featured ?? u.editorial.featured },
    episodes: o.episodeRelease
      ? u.episodes.map((e) => (o.episodeRelease![e.id] !== undefined ? { ...e, releaseOffsetDays: o.episodeRelease![e.id]! } : e))
      : u.episodes,
    cards: o.cards || o.episodeRelease
      ? u.cards.map((c) => {
          const patch = o.cards?.[c.id];
          const epOffset = c.episodeId ? o.episodeRelease?.[c.episodeId] : undefined;
          return {
            ...c,
            ...(patch ?? {}),
            releaseOffsetDays: epOffset !== undefined ? Math.max(epOffset, u.launchOffsetDays) : c.releaseOffsetDays,
          };
        })
      : u.cards,
  };
}

export const releaseTime = (idx: CatalogIndex, offsetDays: number) => idx.epoch + offsetDays * DAY_MS;
export const isReleased = (idx: CatalogIndex, offsetDays: number, at: number) => releaseTime(idx, offsetDays) <= at;

export function isLive(idx: CatalogIndex, u: Universe, at: number) {
  return u.status === "published" && isReleased(idx, u.launchOffsetDays, at);
}

export function liveUniverses(state: DbState, at: number): Universe[] {
  const idx = catalog(state);
  return idx.universes.filter((u) => isLive(idx, u, at));
}

export function releasedCards(idx: CatalogIndex, u: Universe, at: number): Card[] {
  return u.cards.filter((c) => isReleased(idx, c.releaseOffsetDays, at));
}

export function releasedEpisodes(idx: CatalogIndex, u: Universe, at: number): Episode[] {
  return u.episodes.filter((e) => isReleased(idx, e.releaseOffsetDays, at));
}

export function currentSeason(idx: CatalogIndex, u: Universe, at: number) {
  const live = u.seasons.filter((s) => isReleased(idx, s.releaseOffsetDays, at));
  return live[live.length - 1] ?? u.seasons[0]!;
}

export function characterOf(idx: CatalogIndex, universeId: string, characterId?: string) {
  if (!characterId) return undefined;
  return idx.characters.get(`${universeId}:${characterId}`)?.character;
}
