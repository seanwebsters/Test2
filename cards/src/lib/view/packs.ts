import { utcDay } from "@/lib/clock";
import { hashString } from "@/lib/content/build";
import type { Universe } from "@/lib/content/types";
import type { DbState, User } from "@/lib/db/types";
import { EPISODE_PACK_REPEAT_COST, PACK_TYPES, type PackTypeId } from "@/lib/economy/packs";
import { hasPass } from "@/lib/services/users";
import type { PackUniverse } from "@/components/packs/PackOpener";

export function packUniverse(u: Universe): PackUniverse {
  return { id: u.id, slug: u.slug, title: u.title, font: u.style.displayFont, palette: u.style.palette, style: u.style.artStyle, seed: hashString(u.id) };
}

export interface Availability {
  blocked?: string;
  costLabel: string;
  useToken?: boolean;
}

export function packAvailability(state: DbState, user: User, type: PackTypeId, at: number, opts: { episodeId?: string; useToken?: boolean } = {}): Availability {
  const w = state.wallets[user.id] ?? { shards: 0, stardust: 0, tokens: {} };
  const day = utcDay(at);
  switch (type) {
    case "starter":
      return user.starterClaimed ? { blocked: "You've already opened your starter pack. Your daily drop is free every day.", costLabel: "Free" } : { costLabel: "Free · one per collector" };
    case "daily":
      return state.dailyClaims.some((c) => c.userId === user.id && c.day === day && c.kind === "daily")
        ? { blocked: "Today's drop is claimed. The next one arrives at 00:00 UTC.", costLabel: "Free daily" }
        : { costLabel: "Free daily" };
    case "pass-daily":
      if (!hasPass(user, at)) return { blocked: "This bonus pack is part of the Collector Pass (demo). Activate it from the Packs page.", costLabel: "Collector Pass" };
      return state.dailyClaims.some((c) => c.userId === user.id && c.day === day && c.kind === "pass-daily")
        ? { blocked: "Pass bonus claimed today. Back at 00:00 UTC.", costLabel: "Collector Pass" }
        : { costLabel: "Collector Pass bonus" };
    case "standard":
    case "premium": {
      const cost = PACK_TYPES[type].cost;
      const amount = cost.type === "shards" ? cost.amount : 0;
      if (type === "premium" && opts.useToken) {
        return (w.tokens.premium ?? 0) > 0 ? { costLabel: "1 Premium token", useToken: true } : { blocked: "No Premium tokens left. Earn one on day 7 of your daily track.", costLabel: "Token" };
      }
      return w.shards >= amount ? { costLabel: `${amount} Shards` } : { blocked: `You need ${amount} Shards (you have ${w.shards}). Earn Shards free from daily drops, reading episodes and challenges.`, costLabel: `${amount} Shards` };
    }
    case "episode": {
      const p = state.storyProgress.find((x) => x.userId === user.id && x.episodeId === opts.episodeId);
      if (!opts.episodeId || !p?.completedAt) return { blocked: "Finish this episode to unlock its pack.", costLabel: "Episode reward" };
      if (!p.rewardPackOpeningId) return { costLabel: "Free · episode reward" };
      return w.shards >= EPISODE_PACK_REPEAT_COST ? { costLabel: `${EPISODE_PACK_REPEAT_COST} Shards` } : { blocked: `Episode packs cost ${EPISODE_PACK_REPEAT_COST} Shards after the free one.`, costLabel: `${EPISODE_PACK_REPEAT_COST} Shards` };
    }
  }
}
