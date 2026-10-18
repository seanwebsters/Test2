import { catalog, isLive, releasedCards } from "@/lib/catalog";
import { DAY_MS, utcDay } from "@/lib/clock";
import type { DbState, OpportunityWeights } from "@/lib/db/types";

/**
 * Studio analytics computed from real platform data. Seeded demo collectors
 * are excluded unless `includeDemo` is set, and nothing here is invented.
 */

function realUsers(state: DbState, includeDemo: boolean) {
  return new Set(Object.values(state.users).filter((u) => u.role !== "admin" && (includeDemo || !u.isDemo)).map((u) => u.id));
}

export function dashboardMetrics(state: DbState, at: number, includeDemo = false) {
  const users = realUsers(state, includeDemo);
  const has = (id?: string) => !!id && users.has(id);
  const events = state.events.filter((e) => has(e.userId));
  const openings = state.openings.filter((o) => has(o.userId));
  const day = utcDay(at);
  const activeOn = (d: string) => new Set(events.filter((e) => e.at.startsWith(d)).map((e) => e.userId)).size;
  const series = Array.from({ length: 14 }, (_, i) => {
    const d = utcDay(at - (13 - i) * DAY_MS);
    return { day: d, active: activeOn(d), packs: openings.filter((o) => o.createdAt.startsWith(d)).length };
  });
  const started = events.filter((e) => e.name === "episode_started").length;
  const completed = state.storyProgress.filter((p) => has(p.userId) && p.completedAt).length;
  const userList = [...users].map((id) => state.users[id]!);
  const eligible = userList.filter((u) => at - Date.parse(u.createdAt) >= DAY_MS);
  const returned = eligible.filter((u) => events.some((e) => e.userId === u.id && Date.parse(e.at) - Date.parse(u.createdAt) >= DAY_MS));
  const eligible7 = userList.filter((u) => at - Date.parse(u.createdAt) >= 7 * DAY_MS);
  const returned7 = eligible7.filter((u) => events.some((e) => e.userId === u.id && Date.parse(e.at) - Date.parse(u.createdAt) >= 7 * DAY_MS));
  const idx = catalog(state);
  const live = idx.universes.filter((u) => isLive(idx, u, at));
  // Collection completion: average share of each released set owned, over (collector, universe) pairs with ≥1 card.
  let pairs = 0;
  let share = 0;
  for (const uid of users) {
    const inv = state.inventory[uid] ?? {};
    for (const u of live) {
      const rc = releasedCards(idx, u, at);
      const own = rc.filter((c) => inv[c.id]).length;
      if (own) {
        pairs++;
        share += own / rc.length;
      }
    }
  }
  const top = live
    .map((u) => ({ id: u.id, slug: u.slug, title: u.title, packs: openings.filter((o) => o.universeId === u.id).length, follows: state.follows.filter((f) => f.universeId === u.id && has(f.userId)).length }))
    .sort((a, b) => b.packs - a.packs)
    .slice(0, 8);
  return {
    totalUsers: users.size,
    registered: userList.filter((u) => !u.isGuest).length,
    dau: activeOn(day),
    wau: new Set(events.filter((e) => Date.parse(e.at) >= at - 7 * DAY_MS).map((e) => e.userId)).size,
    packsOpened: openings.length,
    packsToday: openings.filter((o) => o.createdAt.startsWith(day)).length,
    cardsCollected: openings.reduce((s, o) => s + o.items.length, 0),
    storyCompletion: started ? completed / started : undefined,
    episodesCompleted: completed,
    collectionCompletion: pairs ? share / pairs : undefined,
    d1Retention: eligible.length ? returned.length / eligible.length : undefined,
    d1Base: eligible.length,
    d7Retention: eligible7.length ? returned7.length / eligible7.length : undefined,
    d7Base: eligible7.length,
    series,
    top,
    revenue: null as null,
  };
}

export interface IPRow {
  id: string;
  slug: string;
  title: string;
  source: string;
  status: string;
  collectors: number;
  follows: number;
  followGrowth: number;
  views: number;
  firstPackConversion?: number;
  repeatCollecting?: number;
  retention?: number;
  depth?: number;
  storyCompletion?: number;
  shares: number;
  returnFrequency?: number;
  score: number;
  signals: string[];
  /** Too little data to score responsibly */
  lowData: boolean;
}

export const METRIC_LABELS: Record<keyof OpportunityWeights, string> = {
  growth: "Follow growth (7d vs prior 7d)",
  retention: "Collectors returning on 2+ days",
  depth: "Average share of the set owned",
  story: "Episode completion rate",
  follows: "Follows per collector",
  sharing: "Card shares per collector",
};

export function ipPerformance(state: DbState, at: number, includeDemo = false): IPRow[] {
  const users = realUsers(state, includeDemo);
  const has = (id?: string) => !!id && users.has(id);
  const idx = catalog(state);
  const live = idx.universes.filter((u) => isLive(idx, u, at));
  const rows = live.map((u) => {
    const opens = state.openings.filter((o) => o.universeId === u.id && has(o.userId));
    const collectorIds = [...new Set(opens.map((o) => o.userId))];
    const collectors = collectorIds.length;
    const follows = state.follows.filter((f) => f.universeId === u.id && has(f.userId));
    const f7 = follows.filter((f) => Date.parse(f.at) >= at - 7 * DAY_MS).length;
    const fPrev = follows.filter((f) => Date.parse(f.at) >= at - 14 * DAY_MS && Date.parse(f.at) < at - 7 * DAY_MS).length;
    const evs = state.events.filter((e) => e.universeId === u.id && has(e.userId));
    const viewers = new Set(evs.filter((e) => e.name === "universe_viewed").map((e) => e.userId));
    const days = (uid: string) => new Set(opens.filter((o) => o.userId === uid).map((o) => o.createdAt.slice(0, 10))).size;
    const rc = releasedCards(idx, u, at);
    const epIds = new Set(u.episodes.map((e) => e.id));
    const started = evs.filter((e) => e.name === "episode_started").length;
    const completed = state.storyProgress.filter((p) => has(p.userId) && p.completedAt && epIds.has(p.episodeId)).length;
    const shares = evs.filter((e) => e.name === "card_shared").length;
    const r = (n: number, d: number) => (d ? n / d : undefined);
    return {
      id: u.id,
      slug: u.slug,
      title: u.title,
      source: u.source,
      status: u.status,
      collectors,
      follows: follows.length,
      followGrowth: fPrev ? (f7 - fPrev) / fPrev : f7 ? 1 : 0,
      views: viewers.size,
      firstPackConversion: viewers.size ? Math.min(1, [...viewers].filter((v) => collectorIds.includes(v!)).length / viewers.size) : undefined,
      repeatCollecting: r(collectorIds.filter((c) => opens.filter((o) => o.userId === c).length >= 2).length, collectors),
      retention: r(collectorIds.filter((c) => days(c) >= 2).length, collectors),
      depth: collectors ? collectorIds.reduce((s, c) => s + rc.filter((k) => state.inventory[c]?.[k.id]).length / rc.length, 0) / collectors : undefined,
      storyCompletion: started ? Math.min(1, completed / started) : undefined,
      shares,
      returnFrequency: collectors ? collectorIds.reduce((s, c) => s + days(c), 0) / collectors : undefined,
      score: 0,
      signals: [] as string[],
      lowData: collectors < 3,
    };
  });
  const w = state.opportunityWeights;
  const metric: Record<keyof OpportunityWeights, (x: (typeof rows)[number]) => number> = {
    growth: (x) => x.followGrowth,
    retention: (x) => x.retention ?? 0,
    depth: (x) => x.depth ?? 0,
    story: (x) => x.storyCompletion ?? 0,
    follows: (x) => (x.collectors ? x.follows / x.collectors : 0),
    sharing: (x) => (x.collectors ? x.shares / x.collectors : 0),
  };
  const keys = Object.keys(metric) as (keyof OpportunityWeights)[];
  const total = keys.reduce((s, k) => s + w[k], 0) || 1;
  const ranges = Object.fromEntries(keys.map((k) => {
    const vals = rows.map(metric[k]);
    return [k, [Math.min(...vals), Math.max(...vals)]];
  })) as Record<keyof OpportunityWeights, [number, number]>;
  const norm = (k: keyof OpportunityWeights, v: number) => {
    const [lo, hi] = ranges[k];
    return hi > lo ? (v - lo) / (hi - lo) : 0;
  };
  for (const row of rows) {
    row.score = Math.round((keys.reduce((s, k) => s + w[k] * norm(k, metric[k](row)), 0) / total) * 100);
    if (row.lowData) continue;
    if (row.score >= 60 && norm("story", metric.story(row)) >= 0.5) row.signals.push("Second-season candidate");
    if (norm("depth", metric.depth(row)) >= 0.6 && norm("follows", metric.follows(row)) >= 0.5) row.signals.push("Merchandise signal");
    if (norm("story", metric.story(row)) >= 0.6 && norm("retention", metric.retention(row)) >= 0.6) row.signals.push("Animation signal");
  }
  return rows.sort((a, b) => b.score - a.score);
}
