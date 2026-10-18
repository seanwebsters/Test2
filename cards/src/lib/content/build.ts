import type { Card, CardSet, Episode, Extra, Universe, UniverseSource } from "./types";
import { afterlight } from "./universes/afterlight";
import { tinyTitans } from "./universes/tiny-titans";
import { neonRunners } from "./universes/neon-runners";
import { lastHotel } from "./universes/last-hotel";
import { oddlyAlive } from "./universes/oddly-alive";
import { deepBlue } from "./universes/deep-blue";
import { heartbreakHighway } from "./universes/heartbreak-highway";
import { ghostSignal } from "./universes/ghost-signal";
import { greenhouse } from "./universes/greenhouse";
import { moonMarket } from "./universes/moon-market";
import { zeroGravityClub } from "./universes/zero-gravity-club";
import { crownless } from "./universes/crownless";

export const SEED_SOURCES: UniverseSource[] = [
  afterlight,
  ghostSignal,
  tinyTitans,
  neonRunners,
  lastHotel,
  moonMarket,
  deepBlue,
  crownless,
  oddlyAlive,
  heartbreakHighway,
  greenhouse,
  zeroGravityClub,
];

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const pad3 = (n: number) => String(n).padStart(3, "0");
export const cardId = (slug: string, season: number, n: number) => `${slug}-s${season}-${pad3(n)}`;
export const episodeId = (slug: string, season: number, n: number) => `${slug}-s${season}e${n}`;

/** Expands a hand-authored universe into the canonical model. */
export function buildUniverse(src: UniverseSource): Universe {
  const id = src.slug;
  const set1: CardSet = {
    id: `${id}-s1`,
    universeId: id,
    season: 1,
    name: src.setName,
    code: src.setCode,
    description: `Season 1 core set — ${src.cards.length} cards.`,
  };
  const sets: CardSet[] = [set1];

  const episodes: Episode[] = src.episodes.map((e, i) => ({
    id: episodeId(id, 1, i + 1),
    universeId: id,
    season: 1,
    number: i + 1,
    title: e.title,
    synopsis: e.synopsis,
    minutes: e.minutes ?? Math.max(2, Math.round(e.body.join(" ").split(/\s+/).length / 180)),
    body: e.body,
    characterIds: e.characterIds,
    cardIds: e.cards.map((n) => cardId(id, 1, n)),
    access: e.access ?? { type: "free" },
    releaseOffsetDays: e.releaseOffsetDays,
    cliffhanger: e.cliffhanger,
  }));

  const cardEpisode = new Map<string, Episode>();
  for (const ep of episodes) for (const c of ep.cardIds) if (!cardEpisode.has(c)) cardEpisode.set(c, ep);

  const cards: Card[] = src.cards.map(([name, kind, rarity, factionId, description, lore, characterId], i) => {
    const cid = cardId(id, 1, i + 1);
    const ep = cardEpisode.get(cid);
    return {
      id: cid,
      universeId: id,
      setId: set1.id,
      season: 1,
      number: i + 1,
      name,
      kind,
      rarity,
      factionId: factionId || undefined,
      characterId,
      episodeId: ep?.id,
      description,
      lore,
      artPrompt: `${src.style.keyArtPrompt.split(",")[0]} — ${name}: ${description} Style: ${src.style.lighting}`,
      artSeed: hashString(cid),
      releaseOffsetDays: Math.max(ep?.releaseOffsetDays ?? src.launchOffsetDays, src.launchOffsetDays),
    };
  });

  if (src.upcoming?.length) {
    const s2 = src.seasons.find((s) => s.number === 2);
    const set2: CardSet = {
      id: `${id}-s2`,
      universeId: id,
      season: 2,
      name: s2?.title ?? "Season 2",
      code: `${src.setCode}2`,
      description: "Season 2 — announced cards. More to be revealed.",
    };
    sets.push(set2);
    src.upcoming.forEach((u, i) => {
      const cid = cardId(id, 2, i + 1);
      cards.push({
        id: cid,
        universeId: id,
        setId: set2.id,
        season: 2,
        number: i + 1,
        name: u.name,
        kind: u.kind,
        rarity: u.rarity,
        description: u.description,
        lore: "Arrives with Season 2. Follow the universe to be notified.",
        artPrompt: `${src.style.keyArtPrompt.split(",")[0]} — ${u.name}`,
        artSeed: hashString(cid),
        releaseOffsetDays: u.releaseOffsetDays,
      });
    });
  }

  const extras: Extra[] = src.extras.map((x, i) => ({ ...x, id: `${id}-x${i + 1}`, universeId: id }));

  return {
    id,
    slug: src.slug,
    title: src.title,
    tagline: src.tagline,
    premise: src.premise,
    synopsis: src.synopsis,
    genres: src.genres,
    audience: src.audience,
    differentiation: src.differentiation,
    style: src.style,
    world: src.world,
    factions: src.factions,
    characters: src.characters,
    seasons: src.seasons,
    episodes,
    sets,
    cards,
    extras,
    launchOffsetDays: src.launchOffsetDays,
    status: "published",
    editorial: src.editorial ?? {},
    demoMetrics: src.demoMetrics,
    source: "seed",
  };
}

let seedCache: Universe[] | undefined;
export function seedUniverses(): Universe[] {
  if (!seedCache) seedCache = SEED_SOURCES.map(buildUniverse);
  return seedCache;
}
