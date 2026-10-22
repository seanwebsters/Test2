import type { EpisodeMeta, Series } from "./types";
import type { UserRecord } from "./model";

/** Free listeners get this much full-episode listening per day. Discover previews don't count. */
export const DAILY_FREE_SECONDS = 45 * 60;
/** Credits needed to unlock one premium episode without subscribing. */
export const UNLOCK_COST = 3;
export const PLUS_PRICE_PENCE = 999;
/** AI personalised series per month. */
export const AI_ALLOWANCE = { free: 1, plus: 5 } as const;

export type Access =
  | { ok: true; reason: "free" | "plus" | "unlocked" }
  | { ok: false; reason: "upcoming" | "locked" | "daily_limit" | "no_audio" };

export function isPlus(user: Pick<UserRecord, "subscription">, now = new Date()): boolean {
  const s = user.subscription;
  if (s.status === "active") return true;
  if (s.status === "canceled" && s.renewsAt) return new Date(s.renewsAt) > now;
  return false;
}

export function isFreeEpisode(series: Series, ep: EpisodeMeta) {
  return ep.n <= series.freeEpisodes;
}

export function episodeAccess(user: UserRecord, series: Series, ep: EpisodeMeta, today: string, now = new Date()): Access {
  if (ep.status !== "released") return { ok: false, reason: "upcoming" };
  if (!ep.hasAudio) return { ok: false, reason: "no_audio" };
  const plus = isPlus(user, now);
  if (plus) return { ok: true, reason: "plus" };
  if (user.unlocked.includes(ep.id)) return { ok: true, reason: "unlocked" };
  if (!isFreeEpisode(series, ep)) return { ok: false, reason: "locked" };
  const listenedToday = user.days[today] ?? 0;
  const startedToday = user.progress[ep.id]?.updatedAt?.slice(0, 10) === today;
  if (listenedToday >= DAILY_FREE_SECONDS && !startedToday) return { ok: false, reason: "daily_limit" };
  return { ok: true, reason: "free" };
}

export function aiAllowance(user: UserRecord, month: string) {
  const limit = isPlus(user) ? AI_ALLOWANCE.plus : AI_ALLOWANCE.free;
  const used = user.aiGenerationsThisMonth.month === month ? user.aiGenerationsThisMonth.count : 0;
  return { limit, used, remaining: Math.max(0, limit - used) };
}
