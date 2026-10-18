import { z } from "zod";
import { catalog } from "@/lib/catalog";
import { DAY_MS } from "@/lib/clock";
import { hashString, seedUniverses } from "@/lib/content/build";
import { ART_STYLES, CARD_KINDS, DISPLAY_FONTS, GENRES, RARITIES, type Universe } from "@/lib/content/types";
import type { DbState, OpportunityWeights } from "@/lib/db/types";
import { rarityTableSchema, variantTableSchema } from "@/lib/economy/config";
import { audit, iso, notify, requireAdminUser, ServiceError } from "@/lib/services/core";

/** Admin content operations. Seeded universes are code-managed and edited through overrides. */

const genreIds = GENRES.map((g) => g.id) as [string, ...string[]];
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);

function studioUniverse(draft: DbState, id: string) {
  const u = draft.universes.find((x) => x.id === id);
  if (!u) throw new ServiceError("seed_universe", "Launch universes are code-managed. You can change their status, schedule, rarities, artwork and featuring here; edit their content in src/lib/content.", 409);
  return u;
}

export const newUniverseInput = z.object({
  title: z.string().trim().min(2).max(60),
  tagline: z.string().trim().min(2).max(140),
  premise: z.string().trim().min(10).max(800),
  genres: z.array(z.enum(genreIds)).min(1).max(3),
  artStyle: z.enum(ART_STYLES),
  displayFont: z.enum(DISPLAY_FONTS),
});

export function createUniverseTx(draft: DbState, actorId: string, input: z.infer<typeof newUniverseInput>, at: number): Universe {
  requireAdminUser(draft, actorId);
  const idx = catalog(draft);
  let slug = slugify(input.title) || "universe";
  while (idx.bySlug.has(slug)) slug = `${slugify(input.title)}-${Math.floor(Math.random() * 900 + 100)}`;
  const ref = seedUniverses().find((u) => u.style.artStyle === input.artStyle) ?? seedUniverses()[0]!;
  const launch = Math.floor((at - idx.epoch) / DAY_MS);
  const u: Universe = {
    id: slug,
    slug,
    title: input.title,
    tagline: input.tagline,
    premise: input.premise,
    synopsis: input.premise,
    genres: input.genres as Universe["genres"],
    audience: "",
    differentiation: "",
    style: { ...ref.style, artStyle: input.artStyle, displayFont: input.displayFont, keyArtPrompt: `${input.title}: ${input.tagline}` },
    world: { history: "", geography: "", rules: [], culture: "", mythology: "", conflicts: [], locations: [], secrets: [] },
    factions: [{ id: "main", name: "Main Faction", motto: "", description: "", color: ref.style.palette.accent }],
    characters: [],
    seasons: [{ number: 1, title: "Season 1", synopsis: "", releaseOffsetDays: launch, plannedEpisodes: 10 }],
    episodes: [],
    sets: [{ id: `${slug}-s1`, universeId: slug, season: 1, name: "Season 1", code: slug.replace(/-/g, "").slice(0, 3).toUpperCase(), description: "Season 1 core set." }],
    cards: [],
    extras: [],
    launchOffsetDays: launch,
    status: "draft",
    editorial: {},
    demoMetrics: { followers: 0, collectors: 0, packsOpened: 0, growth: 0, rating: 0 },
    source: "studio",
    createdAt: iso(at),
    updatedAt: iso(at),
  };
  draft.universes.push(u);
  audit(draft, actorId, "universe:create", at, slug);
  return u;
}

export const detailsInput = z.object({
  universeId: z.string(),
  title: z.string().trim().min(2).max(60),
  tagline: z.string().trim().max(140),
  premise: z.string().trim().max(800),
  synopsis: z.string().trim().max(1200),
  genres: z.array(z.enum(genreIds)).min(1).max(3),
  history: z.string().max(2000),
  geography: z.string().max(2000),
  mythology: z.string().max(2000),
});

export function updateDetailsTx(draft: DbState, actorId: string, input: z.infer<typeof detailsInput>, at: number) {
  requireAdminUser(draft, actorId);
  const u = studioUniverse(draft, input.universeId);
  Object.assign(u, { title: input.title, tagline: input.tagline, premise: input.premise, synopsis: input.synopsis, genres: input.genres, updatedAt: iso(at) });
  Object.assign(u.world, { history: input.history, geography: input.geography, mythology: input.mythology });
  audit(draft, actorId, "universe:edit", at, u.id);
}

export const characterInput = z.object({
  universeId: z.string(),
  name: z.string().trim().min(1).max(60),
  title: z.string().trim().max(80),
  role: z.enum(["lead", "supporting", "antagonist", "mystery"]),
  factionId: z.string(),
  bio: z.string().trim().max(800),
  visual: z.string().trim().max(400),
});

export function addCharacterTx(draft: DbState, actorId: string, input: z.infer<typeof characterInput>, at: number) {
  requireAdminUser(draft, actorId);
  const u = studioUniverse(draft, input.universeId);
  let id = slugify(input.name) || "character";
  while (u.characters.some((c) => c.id === id)) id = `${id}-2`;
  if (!u.factions.some((f) => f.id === input.factionId)) throw new ServiceError("bad_faction", "Unknown faction");
  u.characters.push({ id, name: input.name, title: input.title, role: input.role, factionId: input.factionId, bio: input.bio, visual: input.visual, personality: "", motivation: "", arc: "", relationships: [] });
  u.updatedAt = iso(at);
  audit(draft, actorId, "character:add", at, `${u.id}:${id}`);
  return id;
}

export const cardInput = z.object({
  universeId: z.string(),
  name: z.string().trim().min(1).max(60),
  kind: z.enum(CARD_KINDS),
  rarity: z.enum(RARITIES),
  factionId: z.string().optional(),
  characterId: z.string().optional(),
  episodeId: z.string().optional(),
  description: z.string().trim().min(1).max(200),
  lore: z.string().trim().max(800),
});

export function addCardTx(draft: DbState, actorId: string, input: z.infer<typeof cardInput>, at: number) {
  requireAdminUser(draft, actorId);
  const u = studioUniverse(draft, input.universeId);
  const set = u.sets[0]!;
  const n = u.cards.filter((c) => c.setId === set.id).length + 1;
  const id = `${u.id}-s1-${String(n).padStart(3, "0")}`;
  const ep = input.episodeId ? u.episodes.find((e) => e.id === input.episodeId) : undefined;
  u.cards.push({
    id,
    universeId: u.id,
    setId: set.id,
    season: 1,
    number: n,
    name: input.name,
    kind: input.kind,
    rarity: input.rarity,
    factionId: input.factionId || undefined,
    characterId: input.characterId || undefined,
    episodeId: ep?.id,
    description: input.description,
    lore: input.lore,
    artPrompt: `${input.name} — ${u.style.keyArtPrompt}`,
    artSeed: hashString(id),
    releaseOffsetDays: ep?.releaseOffsetDays ?? u.launchOffsetDays,
  });
  if (ep) ep.cardIds.push(id);
  u.updatedAt = iso(at);
  audit(draft, actorId, "card:add", at, id);
  return id;
}

export const cardPatchInput = z.object({ cardId: z.string(), rarity: z.enum(RARITIES).optional(), name: z.string().trim().min(1).max(60).optional(), description: z.string().trim().min(1).max(200).optional() });

export function patchCardTx(draft: DbState, actorId: string, input: z.infer<typeof cardPatchInput>, at: number) {
  requireAdminUser(draft, actorId);
  const card = catalog(draft).cards.get(input.cardId);
  if (!card) throw new ServiceError("not_found", "Card not found", 404);
  const patch = { ...(input.rarity && { rarity: input.rarity }), ...(input.name && { name: input.name }), ...(input.description && { description: input.description }) };
  const studio = draft.universes.find((u) => u.id === card.universeId);
  if (studio) {
    Object.assign(studio.cards.find((c) => c.id === card.id)!, patch);
    studio.updatedAt = iso(at);
  } else {
    const o = (draft.overrides[card.universeId] ??= {});
    o.cards = { ...o.cards, [card.id]: { ...o.cards?.[card.id], ...patch } };
  }
  audit(draft, actorId, "card:edit", at, card.id, JSON.stringify(patch));
}

export const episodeInput = z.object({
  universeId: z.string(),
  title: z.string().trim().min(1).max(80),
  synopsis: z.string().trim().max(300),
  body: z.string().trim().min(20).max(20000),
  access: z.enum(["free", "collect", "shards"]),
  releaseAt: z.string().optional(),
});

export function addEpisodeTx(draft: DbState, actorId: string, input: z.infer<typeof episodeInput>, at: number) {
  requireAdminUser(draft, actorId);
  const u = studioUniverse(draft, input.universeId);
  const idx = catalog(draft);
  const n = u.episodes.filter((e) => e.season === 1).length + 1;
  const when = input.releaseAt ? Date.parse(input.releaseAt) : at;
  if (Number.isNaN(when)) throw new ServiceError("bad_date", "Invalid release date");
  const body = input.body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  u.episodes.push({
    id: `${u.id}-s1e${n}`,
    universeId: u.id,
    season: 1,
    number: n,
    title: input.title,
    synopsis: input.synopsis,
    minutes: Math.max(2, Math.round(body.join(" ").split(/\s+/).length / 180)),
    body,
    characterIds: [],
    cardIds: [],
    access: input.access === "collect" ? { type: "collect", cards: 5 } : input.access === "shards" ? { type: "shards", cost: 40 } : { type: "free" },
    releaseOffsetDays: (when - idx.epoch) / DAY_MS,
  });
  u.updatedAt = iso(at);
  audit(draft, actorId, "episode:add", at, `${u.id}-s1e${n}`);
}

/** Reschedules an episode (and the cards it introduces). "now" releases immediately and notifies followers. */
export function scheduleEpisodeTx(draft: DbState, actorId: string, episodeId: string, releaseAt: number, at: number) {
  requireAdminUser(draft, actorId);
  const idx = catalog(draft);
  const ep = idx.episodes.get(episodeId);
  if (!ep) throw new ServiceError("not_found", "Episode not found", 404);
  const offset = (releaseAt - idx.epoch) / DAY_MS;
  const studio = draft.universes.find((u) => u.id === ep.universeId);
  if (studio) {
    const e = studio.episodes.find((x) => x.id === episodeId)!;
    e.releaseOffsetDays = offset;
    for (const c of studio.cards) if (c.episodeId === episodeId) c.releaseOffsetDays = Math.max(offset, studio.launchOffsetDays);
    studio.updatedAt = iso(at);
  } else {
    const o = (draft.overrides[ep.universeId] ??= {});
    o.episodeRelease = { ...o.episodeRelease, [episodeId]: offset };
  }
  audit(draft, actorId, "release:schedule", at, episodeId, new Date(releaseAt).toISOString());
  if (releaseAt <= at) {
    const u = idx.byId.get(ep.universeId)!;
    for (const f of draft.follows.filter((x) => x.universeId === ep.universeId)) {
      const user = draft.users[f.userId];
      if (!user || user.isDemo || !user.settings.notifications.newEpisodes) continue;
      notify(draft, { userId: f.userId, kind: "new-episode", title: `New episode: ${ep.title}`, body: `${u.title} · S${ep.season} E${ep.number}. ${ep.synopsis}`, href: `/stories/${ep.id}`, key: `ep:${ep.id}` }, at);
    }
  }
}

export function setFeaturedTx(draft: DbState, actorId: string, universeId: string, featured: boolean, at: number) {
  requireAdminUser(draft, actorId);
  const studio = draft.universes.find((u) => u.id === universeId);
  if (studio) {
    studio.editorial.featured = featured;
    studio.updatedAt = iso(at);
  } else (draft.overrides[universeId] ??= {}).featured = featured;
  audit(draft, actorId, featured ? "universe:feature" : "universe:unfeature", at, universeId);
}

export function setArtworkTx(draft: DbState, actorId: string, target: { universeId: string; cardId?: string }, url: string, at: number) {
  requireAdminUser(draft, actorId);
  const studio = draft.universes.find((u) => u.id === target.universeId);
  if (target.cardId) {
    if (studio) {
      const c = studio.cards.find((x) => x.id === target.cardId);
      if (!c) throw new ServiceError("not_found", "Card not found", 404);
      c.imageUrl = url;
      studio.updatedAt = iso(at);
    } else {
      const o = (draft.overrides[target.universeId] ??= {});
      o.cards = { ...o.cards, [target.cardId]: { ...o.cards?.[target.cardId], imageUrl: url } };
    }
  } else (draft.overrides[target.universeId] ??= {}).heroImageUrl = url;
  audit(draft, actorId, "asset:attach", at, target.cardId ?? target.universeId, url);
}

export const economyInput = z.object({ standardSlot: rarityTableSchema, rarePlusSlot: rarityTableSchema, variants: variantTableSchema });

export function updateEconomyTx(draft: DbState, actorId: string, input: z.infer<typeof economyInput>, at: number) {
  requireAdminUser(draft, actorId);
  if (input.rarePlusSlot.common || input.rarePlusSlot.uncommon) throw new ServiceError("bad_odds", "The guaranteed slot can't include Common or Uncommon.");
  const before = JSON.stringify({ s: draft.economy.standardSlot, r: draft.economy.rarePlusSlot, v: draft.economy.variants });
  Object.assign(draft.economy, input, { updatedAt: iso(at), updatedBy: actorId });
  audit(draft, actorId, "economy:odds", at, "economy", `before ${before}`);
}

export const weightsInput = z.object({ growth: z.number().min(0).max(100), retention: z.number().min(0).max(100), depth: z.number().min(0).max(100), story: z.number().min(0).max(100), follows: z.number().min(0).max(100), sharing: z.number().min(0).max(100) });

export function updateWeightsTx(draft: DbState, actorId: string, w: OpportunityWeights, at: number) {
  requireAdminUser(draft, actorId);
  draft.opportunityWeights = w;
  audit(draft, actorId, "analytics:weights", at, undefined, JSON.stringify(w));
}
