import { z } from "zod";
import { catalog, isLive, isReleased, releasedCards } from "@/lib/catalog";
import { DAY_MS, utcDay } from "@/lib/clock";
import { RARITIES, type Card, type Rarity, type Variant } from "@/lib/content/types";
import type { DbState, PackOpening, PackOpeningItem } from "@/lib/db/types";
import { rarityRank } from "@/lib/economy/config";
import { EPISODE_PACK_REPEAT_COST, PACK_TYPES, slotTable, type PackTypeId, type SlotKind } from "@/lib/economy/packs";
import { pickWeighted, type Rng } from "@/lib/economy/rng";
import { evaluateAchievements } from "./achievements";
import { credit, iso, newId, requireUser, ServiceError, track, wallet } from "./core";

export const openPackInput = z.object({
  packType: z.enum(["starter", "daily", "pass-daily", "standard", "premium", "episode"]),
  universeId: z.string().min(1).max(80),
  episodeId: z.string().max(120).optional(),
  /** Client-generated per open intent. Replays return the original result. */
  idempotencyKey: z.string().min(8).max(100),
  useToken: z.boolean().optional(),
});
export type OpenPackInput = z.infer<typeof openPackInput>;

export interface OpenPackResult {
  opening: PackOpening;
  replayed: boolean;
}

export function oddsVersion(draft: DbState) {
  return draft.economy.updatedAt;
}

/** Rarities from the rolled one downwards, then upwards — used when a pool lacks a rarity. */
function fallbackOrder(r: Rarity): Rarity[] {
  const i = rarityRank(r);
  const down = RARITIES.slice(0, i + 1).reverse();
  const up = RARITIES.slice(i + 1);
  return [...down, ...up];
}

export function poolFor(draft: DbState, universeId: string, at: number, episodeId?: string): Card[] {
  const idx = catalog(draft);
  const u = idx.byId.get(universeId);
  if (!u || !isLive(idx, u, at)) throw new ServiceError("universe_unavailable", "That universe isn't live", 404);
  const released = releasedCards(idx, u, at);
  if (!episodeId) return released;
  const ep = idx.episodes.get(episodeId);
  if (!ep || ep.universeId !== u.id || !isReleased(idx, ep.releaseOffsetDays, at)) throw new ServiceError("episode_unavailable", "That episode isn't available", 404);
  const set = new Set(ep.cardIds);
  return released.filter((c) => set.has(c.id));
}

/** Draws cards for each slot. Pure apart from the RNG. */
export function drawCards(draft: DbState, slots: SlotKind[], pool: Card[], rng: Rng, at: number) {
  if (!pool.length) throw new ServiceError("empty_pool", "No cards available in this pack yet", 409);
  const byRarity = new Map<Rarity, Card[]>();
  for (const c of pool) byRarity.set(c.rarity, [...(byRarity.get(c.rarity) ?? []), c]);
  const idx = catalog(draft);
  return slots.map((slot) => {
    const rolled = pickWeighted(slotTable(slot, draft.economy), rng);
    // Guaranteed slots never fall below the guarantee.
    const order = fallbackOrder(rolled).filter((r) => slot !== "rarePlus" || rarityRank(r) >= rarityRank("rare"));
    const rarity = order.find((r) => byRarity.get(r)?.length) ?? fallbackOrder(rolled).find((r) => byRarity.get(r)?.length)!;
    const options = byRarity.get(rarity)!;
    const card = options[rng(options.length)]!;
    let variant = pickWeighted(draft.economy.variants, rng) as Variant;
    if (variant === "first-edition" && at - (idx.epoch + card.releaseOffsetDays * DAY_MS) > 30 * DAY_MS) variant = "standard";
    return { card, variant };
  });
}

/**
 * Opens a pack inside a transaction. Validates eligibility and cost,
 * draws cards server-side, writes inventory, currency and claims, and
 * records an idempotency key so repeated requests return the same result.
 */
export function openPackTx(draft: DbState, userId: string, input: OpenPackInput, rng: Rng, at: number): OpenPackResult {
  const user = requireUser(draft, userId);
  const prior = draft.openings.find((o) => o.userId === userId && o.idempotencyKey === input.idempotencyKey);
  if (prior) {
    if (prior.packType !== input.packType) throw new ServiceError("idempotency_conflict", "That request key was already used for a different pack", 409);
    return { opening: prior, replayed: true };
  }

  const type = PACK_TYPES[input.packType as PackTypeId];
  const today = utcDay(at);
  const openingId = newId("po");
  const cost: PackOpening["cost"] = { shards: 0 };
  const w = wallet(draft, userId);

  if (input.packType === "episode" && !input.episodeId) throw new ServiceError("bad_request", "Episode packs need an episode");
  const pool = poolFor(draft, input.universeId, at, input.packType === "episode" ? input.episodeId : undefined);

  switch (type.cost.type) {
    case "starter":
      if (user.starterClaimed) throw new ServiceError("already_claimed", "You've already opened your starter pack", 409);
      user.starterClaimed = true;
      credit(draft, userId, "shards", draft.economy.starterShards, "starter-bonus", at, openingId);
      break;
    case "daily": {
      if (draft.dailyClaims.some((c) => c.userId === userId && c.day === today && c.kind === "daily"))
        throw new ServiceError("already_claimed", "Today's drop is already claimed. Next drop at 00:00 UTC.", 409);
      const trackIndex = draft.dailyClaims.filter((c) => c.userId === userId && c.kind === "daily").length % 7;
      draft.dailyClaims.push({ userId, day: today, kind: "daily", openingId, trackIndex, at: iso(at) });
      credit(draft, userId, "shards", draft.economy.dailyTrack[trackIndex] ?? 50, `daily-track:${trackIndex + 1}`, at, openingId);
      if (trackIndex === 6) {
        w.tokens.premium = (w.tokens.premium ?? 0) + 1;
        draft.transactions.push({ id: newId("tx"), userId, currency: "token", amount: 1, reason: "daily-track:7:premium-token", ref: openingId, at: iso(at) });
      }
      break;
    }
    case "pass-daily":
      if (!user.collectorPassUntil || Date.parse(user.collectorPassUntil) < at) throw new ServiceError("no_pass", "Collector Pass (demo) required", 403);
      if (draft.dailyClaims.some((c) => c.userId === userId && c.day === today && c.kind === "pass-daily"))
        throw new ServiceError("already_claimed", "Pass bonus already claimed today", 409);
      draft.dailyClaims.push({ userId, day: today, kind: "pass-daily", openingId, trackIndex: -1, at: iso(at) });
      break;
    case "shards":
      if (type.cost.tokenAlternative && input.useToken) {
        if (!(w.tokens[type.id]! > 0)) throw new ServiceError("no_token", "No pack tokens left", 402);
        w.tokens[type.id]! -= 1;
        cost.token = type.id;
        draft.transactions.push({ id: newId("tx"), userId, currency: "token", amount: -1, reason: `pack:${type.id}`, ref: openingId, at: iso(at) });
      } else {
        credit(draft, userId, "shards", -type.cost.amount, `pack:${type.id}`, at, openingId);
        cost.shards = type.cost.amount;
      }
      break;
    case "episode": {
      const progress = draft.storyProgress.find((p) => p.userId === userId && p.episodeId === input.episodeId);
      if (!progress?.completedAt) throw new ServiceError("episode_not_finished", "Finish the episode to open its pack", 403);
      if (!progress.rewardPackOpeningId) progress.rewardPackOpeningId = openingId;
      else {
        credit(draft, userId, "shards", -EPISODE_PACK_REPEAT_COST, "pack:episode", at, openingId);
        cost.shards = EPISODE_PACK_REPEAT_COST;
      }
      break;
    }
  }

  const drawn = drawCards(draft, type.slots, pool, rng, at);
  const inv = (draft.inventory[userId] ??= {});
  const items: PackOpeningItem[] = drawn.map(({ card, variant }, slot) => {
    const owned = (inv[card.id] ??= { count: 0, variants: {}, firstAt: iso(at), lastAt: iso(at) });
    const isNew = owned.count === 0;
    owned.count += 1;
    owned.variants[variant] = (owned.variants[variant] ?? 0) + 1;
    owned.lastAt = iso(at);
    const dust = isNew ? 0 : draft.economy.duplicateDust[card.rarity];
    if (dust) credit(draft, userId, "stardust", dust, "duplicate", at, openingId);
    return { slot, cardId: card.id, rarity: card.rarity, variant, isNew, ownedAfter: owned.count, dust };
  });

  const opening: PackOpening = {
    id: openingId,
    userId,
    packType: type.id,
    universeId: input.universeId,
    episodeId: input.episodeId,
    idempotencyKey: input.idempotencyKey,
    createdAt: iso(at),
    items,
    cost,
    oddsVersion: oddsVersion(draft),
  };
  draft.openings.push(opening);
  track(draft, "pack_opened", at, { userId, universeId: input.universeId, props: { packType: type.id, newCards: items.filter((i) => i.isNew).length } });
  for (const i of items) if (rarityRank(i.rarity) >= rarityRank("legendary")) track(draft, "rare_pull", at, { userId, universeId: input.universeId, props: { cardId: i.cardId, rarity: i.rarity } });
  evaluateAchievements(draft, userId, at);
  return { opening, replayed: false };
}

/** Craft a specific missing card with Stardust, so collections are always completable for free. */
export function craftCardTx(draft: DbState, userId: string, cardId: string, at: number) {
  requireUser(draft, userId);
  const idx = catalog(draft);
  const card = idx.cards.get(cardId);
  const u = card && idx.byId.get(card.universeId);
  if (!card || !u || !isLive(idx, u, at) || !isReleased(idx, card.releaseOffsetDays, at)) throw new ServiceError("not_found", "Card not available", 404);
  const inv = (draft.inventory[userId] ??= {});
  if (inv[cardId]?.count) throw new ServiceError("already_owned", "You already own this card", 409);
  const price = draft.economy.craftCost[card.rarity];
  credit(draft, userId, "stardust", -price, "craft", at, cardId);
  inv[cardId] = { count: 1, variants: { standard: 1 }, firstAt: iso(at), lastAt: iso(at) };
  track(draft, "card_crafted", at, { userId, universeId: card.universeId, props: { cardId, rarity: card.rarity } });
  evaluateAchievements(draft, userId, at);
  return { cardId, price };
}
