import "server-only";
import { getDb } from "@/lib/db";
import type { ListeningEvent } from "@/lib/types";

const DAY = 86400000;

export interface CreatorMetrics {
  followers: number;
  total_listens: number;
  listening_hours: number;
  returning_listeners: number;
  unique_listeners: number;
  completion_rate: number;
  growth: { week: string; followers: number; listens: number }[];
  per_series: { series_id: string; listens: number; hours: number; completion_rate: number; followers: number }[];
  per_episode: { episode_id: string; listens: number; hours: number; completion_rate: number }[];
  includes_sample_data: boolean;
  sample_share: number;
}

/** A "listen" is a play start, or one aggregated sample session. */
function isListen(e: ListeningEvent) {
  return e.kind === "play" || (e.is_sample && (e.kind === "progress" || e.kind === "complete"));
}

/**
 * Creator analytics computed from our own listening_events table. Rows
 * seeded for the prototype carry `is_sample = true` and the UI labels any
 * figure that includes them.
 */
export async function creatorMetrics(seriesIds: string[], now = new Date()): Promise<CreatorMetrics> {
  const db = getDb();
  if (!seriesIds.length) {
    return { followers: 0, total_listens: 0, listening_hours: 0, returning_listeners: 0, unique_listeners: 0, completion_rate: 0, growth: [], per_series: [], per_episode: [], includes_sample_data: false, sample_share: 0 };
  }
  const [events, follows] = await Promise.all([
    db.list("listening_events", { where: { series_id: seriesIds } }),
    db.list("series_follows", { where: { series_id: seriesIds } }),
  ]);
  const listens = events.filter(isListen);
  const completes = events.filter((e) => e.kind === "complete");
  const seconds = events.reduce((n, e) => n + (e.kind === "play" ? 0 : e.listened_seconds), 0);
  const days = new Map<string, Set<string>>();
  for (const e of events) {
    const who = e.user_id ?? e.anonymous_id;
    if (!who) continue;
    const d = e.created_at.slice(0, 10);
    const set = days.get(who) ?? new Set();
    set.add(d);
    days.set(who, set);
  }
  const growth = Array.from({ length: 6 }, (_, i) => {
    const end = now.getTime() - (5 - i) * 7 * DAY;
    const start = end - 7 * DAY;
    return {
      week: new Date(start).toISOString().slice(5, 10),
      followers: follows.filter((f) => new Date(f.created_at).getTime() <= end).length,
      listens: listens.filter((e) => {
        const t = new Date(e.created_at).getTime();
        return t > start && t <= end;
      }).length,
    };
  });
  const by = <K extends "series_id" | "episode_id">(key: K) => {
    const ids = [...new Set(events.map((e) => e[key]).filter((x): x is string => Boolean(x)))];
    return ids.map((id) => {
      const ev = events.filter((e) => e[key] === id);
      const l = ev.filter(isListen).length;
      return {
        id,
        listens: l,
        hours: Math.round((ev.reduce((n, e) => n + (e.kind === "play" ? 0 : e.listened_seconds), 0) / 3600) * 10) / 10,
        completion_rate: l ? Math.round((ev.filter((e) => e.kind === "complete").length / l) * 100) : 0,
      };
    });
  };
  const sampleRows = events.filter((e) => e.is_sample).length + follows.filter((f) => f.user_id.startsWith("usr_sample_")).length;
  const totalRows = events.length + follows.length;
  return {
    followers: follows.length,
    total_listens: listens.length,
    listening_hours: Math.round((seconds / 3600) * 10) / 10,
    returning_listeners: [...days.values()].filter((s) => s.size > 1).length,
    unique_listeners: days.size,
    completion_rate: listens.length ? Math.round((completes.length / listens.length) * 100) : 0,
    growth,
    per_series: by("series_id").map((x) => ({ series_id: x.id, listens: x.listens, hours: x.hours, completion_rate: x.completion_rate, followers: follows.filter((f) => f.series_id === x.id).length })),
    per_episode: by("episode_id").map((x) => ({ episode_id: x.id, listens: x.listens, hours: x.hours, completion_rate: x.completion_rate })),
    includes_sample_data: sampleRows > 0,
    sample_share: totalRows ? Math.round((sampleRows / totalRows) * 100) : 0,
  };
}

export async function platformListeningHours(): Promise<{ hours: number; includes_sample_data: boolean }> {
  const events = await getDb().list("listening_events");
  const s = events.reduce((n, e) => n + (e.kind === "play" ? 0 : e.listened_seconds), 0);
  return { hours: Math.round(s / 360) / 10, includes_sample_data: events.some((e) => e.is_sample) };
}
