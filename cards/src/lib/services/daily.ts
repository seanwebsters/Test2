import { hashString } from "@/lib/content/build";
import { catalog, liveUniverses } from "@/lib/catalog";
import { DAY_MS, nextUtcMidnight, utcDay } from "@/lib/clock";
import type { Universe } from "@/lib/content/types";
import type { DbState } from "@/lib/db/types";
import { credit, iso, notify, requireUser, ServiceError, track } from "./core";
import { hasPass } from "./users";

export function featuredOfDay(state: DbState, at: number): Universe | undefined {
  const live = liveUniverses(state, at);
  if (!live.length) return undefined;
  return live[hashString(utcDay(at)) % live.length];
}

export interface DailyStatus {
  day: string;
  claimed: boolean;
  nextResetAt: number;
  /** Index on the seven-day track the next claim will land on. */
  nextTrackIndex: number;
  track: { index: number; shards: number; bonus?: string; claimed: boolean }[];
  pass: "active-available" | "active-claimed" | "inactive";
  featured?: Universe;
  totalClaims: number;
}

export function dailyStatus(state: DbState, userId: string | undefined, at: number): DailyStatus {
  const day = utcDay(at);
  const claims = userId ? state.dailyClaims.filter((c) => c.userId === userId && c.kind === "daily") : [];
  const claimed = claims.some((c) => c.day === day);
  const completedInCycle = claims.length % 7;
  // When today is claimed, show the cycle that includes today's claim.
  const shownDone = claimed ? (completedInCycle === 0 ? 7 : completedInCycle) : completedInCycle;
  const user = userId ? state.users[userId] : undefined;
  const passClaimed = !!userId && state.dailyClaims.some((c) => c.userId === userId && c.day === day && c.kind === "pass-daily");
  return {
    day,
    claimed,
    nextResetAt: nextUtcMidnight(at),
    nextTrackIndex: completedInCycle,
    track: state.economy.dailyTrack.map((shards, index) => ({ index, shards, bonus: index === 6 ? "Premium Pack token" : undefined, claimed: index < shownDone })),
    pass: user && hasPass(user, at) ? (passClaimed ? "active-claimed" : "active-available") : "inactive",
    featured: featuredOfDay(state, at),
    totalClaims: claims.length,
  };
}

export interface Challenge {
  key: string;
  scope: "daily" | "weekly";
  title: string;
  progress: number;
  goal: number;
  reward: number;
  claimed: boolean;
}

function weekStart(at: number) {
  const d = new Date(at);
  const dow = (d.getUTCDay() + 6) % 7; // Monday = 0
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - dow);
}

export function challenges(state: DbState, userId: string | undefined, at: number): Challenge[] {
  const dayStart = Date.parse(`${utcDay(at)}T00:00:00.000Z`);
  const wk = weekStart(at);
  const mine = (from: number) =>
    userId ? state.events.filter((e) => e.userId === userId && Date.parse(e.at) >= from) : [];
  const today = mine(dayStart);
  const week = mine(wk);
  const newCards = (evs: typeof today) => evs.filter((e) => e.name === "pack_opened").reduce((s, e) => s + Number(e.props?.newCards ?? 0), 0);
  const dayKey = utcDay(at);
  const weekKey = utcDay(wk);
  const claimedKeys = new Set(userId ? state.transactions.filter((t) => t.userId === userId && t.reason.startsWith("challenge:")).map((t) => t.reason) : []);
  const defs: Omit<Challenge, "claimed">[] = [
    { key: `d:${dayKey}:open`, scope: "daily", title: "Open any pack", progress: today.filter((e) => e.name === "pack_opened").length, goal: 1, reward: 15 },
    { key: `d:${dayKey}:read`, scope: "daily", title: "Finish an episode", progress: today.filter((e) => e.name === "episode_completed").length, goal: 1, reward: 20 },
    { key: `d:${dayKey}:new3`, scope: "daily", title: "Discover 3 new cards", progress: newCards(today), goal: 3, reward: 20 },
    { key: `w:${weekKey}:packs5`, scope: "weekly", title: "Open 5 packs this week", progress: week.filter((e) => e.name === "pack_opened").length, goal: 5, reward: 75 },
    { key: `w:${weekKey}:new15`, scope: "weekly", title: "Discover 15 new cards this week", progress: newCards(week), goal: 15, reward: 100 },
    { key: `w:${weekKey}:read3`, scope: "weekly", title: "Finish 3 episodes this week", progress: week.filter((e) => e.name === "episode_completed").length, goal: 3, reward: 100 },
  ];
  return defs.map((d) => ({ ...d, progress: Math.min(d.progress, d.goal), claimed: claimedKeys.has(`challenge:${d.key}`) }));
}

export function claimChallengeTx(draft: DbState, userId: string, key: string, at: number) {
  requireUser(draft, userId);
  const c = challenges(draft, userId, at).find((x) => x.key === key);
  if (!c) throw new ServiceError("not_found", "That challenge isn't active", 404);
  if (c.claimed) throw new ServiceError("already_claimed", "Already claimed", 409);
  if (c.progress < c.goal) throw new ServiceError("incomplete", "Not complete yet", 409);
  credit(draft, userId, "shards", c.reward, `challenge:${c.key}`, at);
  track(draft, "challenge_claimed", at, { userId, props: { key } });
  return c.reward;
}

/**
 * Derives time-based notifications (daily pack ready, newly released
 * episodes and cards in followed universes, season launches). Idempotent
 * thanks to per-user dedupe keys; called when a collector visits.
 */
export function refreshNotificationsTx(draft: DbState, userId: string, at: number) {
  const user = requireUser(draft, userId);
  const prefs = user.settings.notifications;
  const idx = catalog(draft);
  const day = utcDay(at);
  if (prefs.dailyReady && !draft.dailyClaims.some((c) => c.userId === userId && c.day === day && c.kind === "daily")) {
    notify(draft, { userId, kind: "daily-ready", title: "Your daily pack is ready", body: "Five free cards are waiting in Daily Drops.", href: "/daily", key: `daily:${day}` }, at);
  }
  const since = Date.parse(user.createdAt) - 3 * DAY_MS;
  for (const f of draft.follows.filter((x) => x.userId === userId)) {
    const u = idx.byId.get(f.universeId);
    if (!u) continue;
    for (const ep of u.episodes) {
      const rel = idx.epoch + ep.releaseOffsetDays * DAY_MS;
      if (rel <= at && rel >= since && prefs.newEpisodes)
        notify(draft, { userId, kind: "new-episode", title: `New episode: ${ep.title}`, body: `${u.title} · S${ep.season} E${ep.number}. ${ep.synopsis}`, href: `/stories/${ep.id}`, key: `ep:${ep.id}`, createdAt: iso(Math.max(rel, Date.parse(f.at))) }, at);
      if (rel <= at && rel >= since && prefs.newCards && ep.cardIds.length)
        notify(draft, { userId, kind: "new-cards", title: `${ep.cardIds.length} new ${u.title} cards`, body: `Cards from "${ep.title}" are now in packs.`, href: `/universes/${u.slug}/cards`, key: `cards:${ep.id}`, createdAt: iso(Math.max(rel, Date.parse(f.at))) }, at);
    }
    for (const s of u.seasons) {
      const rel = idx.epoch + s.releaseOffsetDays * DAY_MS;
      if (prefs.seasonLaunches && rel > at && rel - at < 14 * DAY_MS)
        notify(draft, { userId, kind: "season-launch", title: `${u.title} Season ${s.number} is coming`, body: `"${s.title}" launches ${new Date(rel).toUTCString().slice(0, 16)}.`, href: `/universes/${u.slug}`, key: `season:${u.id}:${s.number}` }, at);
    }
  }
}
