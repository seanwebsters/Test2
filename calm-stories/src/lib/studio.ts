/**
 * Creator Studio: a creator's own series, episodes, editorial feedback,
 * listening analytics and AI usage. Analytics that include seeded sample
 * listening events are flagged so the UI can label them.
 */
import "server-only";
import { HttpError } from "@/lib/api";
import { requireCreator } from "@/lib/auth/policy";
import type { Viewer } from "@/lib/auth/viewer";
import { getDb } from "@/lib/db";
import { editableEpisode, editableSeries, listMySeries } from "@/lib/storymaker/service";
import type { EditorialReview, Episode, ListeningEvent, Series } from "@/lib/types";

export interface Stats {
  plays: number;
  completions: number;
  completionRate: number;
  listenedHours: number;
  listeners: number;
  /** True when any counted event is seeded sample data rather than real listening. */
  includesSample: boolean;
}

export function statsFor(events: ListeningEvent[]): Stats {
  const plays = events.filter((e) => e.kind === "play").length;
  const completions = events.filter((e) => e.kind === "complete").length;
  return {
    plays,
    completions,
    completionRate: plays ? Math.min(1, completions / plays) : 0,
    listenedHours: events.reduce((a, e) => a + e.listened_seconds, 0) / 3600,
    listeners: new Set(events.map((e) => e.user_id ?? e.anonymous_id).filter(Boolean)).size,
    includesSample: events.some((e) => e.is_sample),
  };
}

/** Plays per day for the last `days` days (oldest first), in UTC. */
export function playsByDay(events: ListeningEvent[], days = 28, now = new Date()): { date: string; plays: number }[] {
  const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - (days - 1) * 86400_000;
  const out = Array.from({ length: days }, (_, i) => ({ date: new Date(start + i * 86400_000).toISOString().slice(0, 10), plays: 0 }));
  for (const e of events) {
    if (e.kind !== "play") continue;
    const i = Math.floor((new Date(e.created_at).getTime() - start) / 86400_000);
    if (i >= 0 && i < days) out[i]!.plays++;
  }
  return out;
}

export interface StudioSeriesRow {
  series: Series;
  episodes: number;
  published: number;
  inReview: number;
  needsChanges: number;
  followers: number;
  stats: Stats;
}

export async function studioOverview(viewer: Viewer) {
  requireCreator(viewer);
  const db = getDb();
  const mine = (await listMySeries(viewer)).filter((s) => s.creator_id === viewer.user.id);
  const ids = mine.map((s) => s.id);
  const [episodes, events, follows, reviews, notifications, creatorFollows] = await Promise.all([
    db.list("episodes", { where: { series_id: ids } }),
    db.list("listening_events", { where: { series_id: ids } }),
    db.list("series_follows", { where: { series_id: ids } }),
    db.list("editorial_reviews", { where: { series_id: ids }, orderBy: { column: "created_at", ascending: false } }),
    db.list("notifications", { where: { user_id: viewer.user.id }, orderBy: { column: "created_at", ascending: false }, limit: 8 }),
    db.list("creator_follows", { where: { creator_id: viewer.user.id } }),
  ]);
  const rows: StudioSeriesRow[] = mine.map((s) => {
    const eps = episodes.filter((e) => e.series_id === s.id);
    return {
      series: s,
      episodes: eps.length,
      published: eps.filter((e) => e.status === "published").length,
      inReview: eps.filter((e) => e.status === "in_review").length,
      needsChanges: eps.filter((e) => e.status === "changes_requested" || e.status === "rejected").length,
      followers: follows.filter((f) => f.series_id === s.id).length,
      stats: statsFor(events.filter((e) => e.series_id === s.id)),
    };
  });
  const epById = new Map(episodes.map((e) => [e.id, e]));
  const feedback = reviews
    .slice(0, 8)
    .map((r) => ({ review: r, episode: epById.get(r.episode_id) ?? null, series: mine.find((s) => s.id === r.series_id) ?? null }));
  return {
    rows,
    totals: statsFor(events),
    trend: playsByDay(events),
    seriesFollowers: follows.length,
    creatorFollowers: creatorFollows.length,
    feedback,
    notifications,
  };
}

export interface StudioEpisodeRow {
  episode: Episode;
  review: EditorialReview | null;
  stats: Stats;
  hasScript: boolean;
  words: number;
}

export async function studioSeries(viewer: Viewer, seriesId: string) {
  const { series } = await editableSeries(viewer, seriesId);
  const db = getDb();
  const [episodes, events, follows, reviews, scripts, seasons, rights, costs] = await Promise.all([
    db.list("episodes", { where: { series_id: seriesId }, orderBy: { column: "number" } }),
    db.list("listening_events", { where: { series_id: seriesId } }),
    db.count("series_follows", { series_id: seriesId }),
    db.list("editorial_reviews", { where: { series_id: seriesId }, orderBy: { column: "created_at", ascending: false } }),
    db.list("scripts", { where: { series_id: seriesId } }),
    db.list("seasons", { where: { series_id: seriesId }, orderBy: { column: "number" } }),
    db.findOne("rights_declarations", { series_id: seriesId }),
    db.list("production_costs", { where: { series_id: seriesId } }),
  ]);
  const versionIds = scripts.map((s) => s.current_version_id).filter((x): x is string => !!x);
  const versions = versionIds.length ? await db.list("script_versions", { where: { id: versionIds } }) : [];
  const rows: StudioEpisodeRow[] = episodes.map((e) => {
    const script = scripts.find((s) => s.episode_id === e.id);
    const v = versions.find((x) => x.id === script?.current_version_id);
    return { episode: e, review: reviews.find((r) => r.episode_id === e.id) ?? null, stats: statsFor(events.filter((x) => x.episode_id === e.id)), hasScript: !!v, words: v?.word_count ?? 0 };
  });
  return {
    series,
    seasons,
    rows,
    followers: follows,
    stats: statsFor(events),
    trend: playsByDay(events),
    rights,
    aiCostCents: costs.filter((c) => !c.simulated).reduce((a, c) => a + c.cost_cents, 0),
    simulatedCalls: costs.filter((c) => c.simulated).length,
  };
}

export async function studioEpisode(viewer: Viewer, seriesId: string, episodeId: string) {
  const { ep, series } = await editableEpisode(viewer, episodeId);
  if (ep.series_id !== seriesId) throw new HttpError(404, "Episode not found");
  const db = getDb();
  const script = await db.findOne("scripts", { episode_id: ep.id });
  const [versions, reviews, events, schedule, asset, sections] = await Promise.all([
    script ? db.list("script_versions", { where: { script_id: script.id }, orderBy: { column: "version", ascending: false } }) : Promise.resolve([]),
    db.list("editorial_reviews", { where: { episode_id: ep.id }, orderBy: { column: "created_at", ascending: false } }),
    db.list("listening_events", { where: { episode_id: ep.id } }),
    db.findOne("publishing_schedules", { episode_id: ep.id, status: "scheduled" }),
    ep.audio_asset_id ? db.get("audio_assets", ep.audio_asset_id) : Promise.resolve(null),
    db.list("audio_assets", { where: { episode_id: ep.id, kind: "narration_section" } }),
  ]);
  // How far listeners get: the furthest point each listener reached
  // (pause, seek, sleep timer or completion), as a share of everyone who pressed play.
  const dur = Math.max(1, asset?.duration_seconds ?? ep.duration_seconds);
  const who = (e: ListeningEvent) => e.user_id ?? e.anonymous_id ?? e.id;
  const players = new Set(events.filter((e) => e.kind === "play").map(who));
  const furthest = new Map<string, number>();
  for (const e of events) {
    if (e.kind === "play" || e.kind === "progress") continue;
    const pos = e.kind === "complete" ? dur : e.position_seconds;
    furthest.set(who(e), Math.max(furthest.get(who(e)) ?? 0, pos));
  }
  const retention = [0.25, 0.5, 0.75, 1].map((q) => ({
    at: q,
    share: players.size ? [...players].filter((p) => (furthest.get(p) ?? 0) >= dur * q * 0.98).length / players.size : 0,
  }));
  return {
    series,
    episode: ep,
    versions: versions.map((v) => ({ id: v.id, version: v.version, words: v.word_count, source: v.source, simulated: v.simulated, provider: v.provider, model: v.model, note: v.note, createdAt: v.created_at, current: v.id === script?.current_version_id })),
    reviews,
    stats: statsFor(events),
    retention,
    releaseAt: schedule?.release_at ?? null,
    audio: asset ? { id: asset.id, duration: asset.duration_seconds, simulated: asset.simulated, qa: asset.qa } : null,
    sections: sections.length,
  };
}

/** The creator's AI usage, by series and category. */
export async function studioProduction(viewer: Viewer) {
  requireCreator(viewer);
  const db = getDb();
  const mine = (await listMySeries(viewer)).filter((s) => s.creator_id === viewer.user.id);
  const ids = mine.map((s) => s.id);
  const [costs, calls, assets] = await Promise.all([
    db.list("production_costs", { where: { series_id: ids }, orderBy: { column: "created_at", ascending: false } }),
    db.list("ai_tool_calls", { where: { user_id: viewer.user.id }, orderBy: { column: "created_at", ascending: false }, limit: 30 }),
    db.list("audio_assets", { where: { series_id: ids, kind: "mix" } }),
  ]);
  const titleOf = new Map(mine.map((s) => [s.id, s.title]));
  const bySeries = mine.map((s) => {
    const rows = costs.filter((c) => c.series_id === s.id);
    return {
      id: s.id,
      title: s.title,
      calls: rows.length,
      simulated: rows.filter((r) => r.simulated).length,
      costCents: rows.filter((r) => !r.simulated).reduce((a, r) => a + r.cost_cents, 0),
      byCategory: (["llm", "tts", "image", "audio_processing"] as const).map((k) => ({ category: k, count: rows.filter((r) => r.category === k).length })),
      mixes: assets.filter((a) => a.series_id === s.id).length,
    };
  });
  return {
    bySeries,
    recent: costs.slice(0, 20).map((c) => ({ ...c, seriesTitle: c.series_id ? (titleOf.get(c.series_id) ?? "") : "" })),
    calls: calls.filter((c) => !c.tool.startsWith("admin:")),
    totalCents: costs.filter((c) => !c.simulated).reduce((a, c) => a + c.cost_cents, 0),
  };
}
