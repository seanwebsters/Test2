import { catalog, isReleased, releaseTime } from "@/lib/catalog";
import type { Episode, Extra, Universe } from "@/lib/content/types";
import type { DbState } from "@/lib/db/types";
import { evaluateAchievements } from "./achievements";
import { credit, inventoryOf, iso, requireUser, ServiceError, track } from "./core";
import { hasPass } from "./users";

export interface EpisodeAccessInfo {
  released: boolean;
  releaseAt: number;
  unlocked: boolean;
  completed: boolean;
  rewardAvailable: boolean;
  /** Human-readable requirement, when locked */
  requirement?: string;
  /** Progress towards a collect requirement */
  progress?: { have: number; need: number };
  canUnlockWithShards?: number;
}

export function ownedInUniverse(state: DbState, userId: string | undefined, universeId: string) {
  if (!userId) return 0;
  const inv = inventoryOf(state, userId);
  const idx = catalog(state);
  return Object.keys(inv).filter((id) => idx.cards.get(id)?.universeId === universeId).length;
}

export function episodeAccess(state: DbState, userId: string | undefined, ep: Episode, at: number): EpisodeAccessInfo {
  const idx = catalog(state);
  const releaseAt = releaseTime(idx, ep.releaseOffsetDays);
  const released = isReleased(idx, ep.releaseOffsetDays, at);
  const p = userId ? state.storyProgress.find((x) => x.userId === userId && x.episodeId === ep.id) : undefined;
  const base = { released, releaseAt, completed: !!p?.completedAt, rewardAvailable: !!p?.completedAt && !p.rewardPackOpeningId };
  if (!released) return { ...base, unlocked: false, requirement: "Not released yet" };
  if (p?.unlockedAt) return { ...base, unlocked: true };
  switch (ep.access.type) {
    case "free":
      return { ...base, unlocked: true };
    case "collect": {
      const have = ownedInUniverse(state, userId, ep.universeId);
      const need = ep.access.cards;
      return have >= need
        ? { ...base, unlocked: true, progress: { have, need } }
        : { ...base, unlocked: false, requirement: `Collect ${need} cards from this universe`, progress: { have, need } };
    }
    case "shards":
      return { ...base, unlocked: false, requirement: `Unlock for ${ep.access.cost} Shards (earned free from daily drops and reading)`, canUnlockWithShards: ep.access.cost };
    case "pass": {
      const u = userId ? state.users[userId] : undefined;
      return u && hasPass(u, at) ? { ...base, unlocked: true } : { ...base, unlocked: false, requirement: "Early access for Collector Pass holders (demo). Free for everyone after release week." };
    }
  }
}

export function unlockEpisodeTx(draft: DbState, userId: string, episodeId: string, at: number) {
  requireUser(draft, userId);
  const ep = catalog(draft).episodes.get(episodeId);
  if (!ep) throw new ServiceError("not_found", "Unknown episode", 404);
  const access = episodeAccess(draft, userId, ep, at);
  if (!access.released) throw new ServiceError("not_released", "This episode hasn't been released yet", 403);
  if (access.unlocked) return { already: true };
  if (ep.access.type !== "shards") throw new ServiceError("locked", access.requirement ?? "Locked", 403);
  credit(draft, userId, "shards", -ep.access.cost, "episode-unlock", at, episodeId);
  upsertProgress(draft, userId, episodeId).unlockedAt = iso(at);
  upsertProgress(draft, userId, episodeId).unlockMethod = "shards";
  track(draft, "episode_unlocked", at, { userId, universeId: ep.universeId, props: { episodeId, method: "shards" } });
  return { already: false };
}

function upsertProgress(draft: DbState, userId: string, episodeId: string) {
  let p = draft.storyProgress.find((x) => x.userId === userId && x.episodeId === episodeId);
  if (!p) {
    p = { userId, episodeId };
    draft.storyProgress.push(p);
  }
  return p;
}

export function startEpisodeTx(draft: DbState, userId: string, episodeId: string, at: number) {
  const ep = catalog(draft).episodes.get(episodeId);
  if (!ep) throw new ServiceError("not_found", "Unknown episode", 404);
  track(draft, "episode_started", at, { userId, universeId: ep.universeId, props: { episodeId } });
}

/** Marks an episode finished. First completion grants Shards and a free episode pack. */
export function completeEpisodeTx(draft: DbState, userId: string, episodeId: string, at: number) {
  requireUser(draft, userId);
  const ep = catalog(draft).episodes.get(episodeId);
  if (!ep) throw new ServiceError("not_found", "Unknown episode", 404);
  const access = episodeAccess(draft, userId, ep, at);
  if (!access.unlocked) throw new ServiceError("locked", access.requirement ?? "Locked", 403);
  const p = upsertProgress(draft, userId, episodeId);
  if (p.completedAt) return { first: false };
  p.completedAt = iso(at);
  p.unlockedAt ??= iso(at);
  credit(draft, userId, "shards", draft.economy.episodeCompletionShards, "episode-complete", at, episodeId);
  track(draft, "episode_completed", at, { userId, universeId: ep.universeId, props: { episodeId } });
  evaluateAchievements(draft, userId, at);
  return { first: true };
}

export function extraUnlocked(state: DbState, userId: string | undefined, x: Extra, u: Universe): boolean {
  if (!userId) return false;
  const inv = inventoryOf(state, userId);
  switch (x.requirement.type) {
    case "own-card":
      return !!inv[x.requirement.cardId]?.count;
    case "own-count":
      return ownedInUniverse(state, userId, u.id) >= x.requirement.count;
    case "faction-complete": {
      const fid = x.requirement.factionId;
      const cards = u.cards.filter((c) => c.factionId === fid && c.season === 1);
      return cards.length > 0 && cards.every((c) => inv[c.id]?.count);
    }
  }
}

export function describeRequirement(x: Extra, u: Universe): string {
  switch (x.requirement.type) {
    case "own-card": {
      const id = x.requirement.cardId;
      return `Collect ${u.cards.find((c) => c.id === id)?.name ?? "a specific card"}`;
    }
    case "own-count":
      return `Collect ${x.requirement.count} ${u.title} cards`;
    case "faction-complete": {
      const fid = x.requirement.factionId;
      return `Collect every ${u.factions.find((f) => f.id === fid)?.name ?? "faction"} card`;
    }
  }
}
