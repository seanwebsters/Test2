import "server-only";
import { getDb } from "@/lib/db";
import type { Viewer } from "@/lib/auth";
import { canViewSeries, listenAccess, requireUser } from "@/lib/auth/policy";
import type { ListeningEvent, UserSettings } from "@/lib/types";
import { newId, nowIso } from "@/lib/util";
import { track } from "@/lib/analytics";

export async function setSaved(viewer: Viewer, seriesId: string, saved: boolean) {
  requireUser(viewer);
  const db = getDb();
  const series = await db.get("series", seriesId);
  if (!series || !canViewSeries(viewer, series)) throw new Error("Series not found");
  const existing = await db.findOne("user_libraries", { user_id: viewer.user.id, series_id: seriesId });
  if (saved && !existing) {
    await db.insert("user_libraries", { id: newId("lib"), user_id: viewer.user.id, series_id: seriesId, collection: "Saved", created_at: nowIso() });
  } else if (!saved && existing) {
    await db.remove("user_libraries", existing.id);
  }
  return { saved };
}

export async function setFollowSeries(viewer: Viewer, seriesId: string, follow: boolean) {
  requireUser(viewer);
  const db = getDb();
  const series = await db.get("series", seriesId);
  if (!series || !canViewSeries(viewer, series)) throw new Error("Series not found");
  const existing = await db.findOne("series_follows", { user_id: viewer.user.id, series_id: seriesId });
  if (follow && !existing) await db.insert("series_follows", { id: newId("sf"), user_id: viewer.user.id, series_id: seriesId, created_at: nowIso() });
  if (!follow && existing) await db.remove("series_follows", existing.id);
  return { following: follow };
}

export async function setFollowCreator(viewer: Viewer, creatorUserId: string, follow: boolean) {
  requireUser(viewer);
  if (creatorUserId === viewer.user.id) throw new Error("You can't follow yourself");
  const db = getDb();
  const profile = await db.findOne("creator_profiles", { user_id: creatorUserId });
  if (!profile) throw new Error("Creator not found");
  const existing = await db.findOne("creator_follows", { user_id: viewer.user.id, creator_id: creatorUserId });
  if (follow && !existing) await db.insert("creator_follows", { id: newId("cf"), user_id: viewer.user.id, creator_id: creatorUserId, created_at: nowIso() });
  if (!follow && existing) await db.remove("creator_follows", existing.id);
  return { following: follow };
}

export interface ProgressInput {
  episodeId: string;
  position: number;
  duration: number;
  event?: ListeningEvent["kind"];
  listened?: number;
  anonymousId?: string | null;
}

/** Persists playback position (signed-in users) and records a listening event. */
export async function recordProgress(viewer: Viewer, input: ProgressInput) {
  const db = getDb();
  const ep = await db.get("episodes", input.episodeId);
  if (!ep) throw new Error("Episode not found");
  const series = await db.get("series", ep.series_id);
  if (!series) throw new Error("Series not found");
  const access = listenAccess(viewer, series, ep);
  if (access === "hidden" || access === "locked") throw new Error("Not playable");

  const position = Math.max(0, input.position);
  const duration = Math.max(0, input.duration);
  const completed = input.event === "complete" || (duration > 0 && position >= duration - 5);

  if (viewer.user) {
    const settings = await db.get("user_settings", viewer.user.id);
    const id = `${viewer.user.id}:${ep.id}`;
    await db.upsert("listening_progress", {
      id,
      user_id: viewer.user.id,
      episode_id: ep.id,
      series_id: ep.series_id,
      position_seconds: completed ? duration : position,
      duration_seconds: duration,
      completed,
      updated_at: nowIso(),
    });
    if (settings?.private_listening_history) return { completed };
  }

  if (input.event && input.event !== "progress") {
    const evt: ListeningEvent = {
      id: newId("le"),
      user_id: viewer.user?.id ?? null,
      anonymous_id: viewer.user ? null : (input.anonymousId ?? null),
      episode_id: ep.id,
      series_id: ep.series_id,
      kind: input.event,
      position_seconds: position,
      listened_seconds: Math.max(0, input.listened ?? 0),
      is_sample: false,
      created_at: nowIso(),
    };
    await db.insert("listening_events", evt);
    track(viewer.user?.id ?? input.anonymousId ?? "anonymous", `listen_${input.event}`, { episode_id: ep.id, series_id: ep.series_id, position });
  }
  return { completed };
}

export async function getLibrary(viewer: Viewer) {
  requireUser(viewer);
  const db = getDb();
  const uid = viewer.user.id;
  const [saved, follows, creatorFollows, progress] = await Promise.all([
    db.list("user_libraries", { where: { user_id: uid }, orderBy: { column: "created_at", ascending: false } }),
    db.list("series_follows", { where: { user_id: uid } }),
    db.list("creator_follows", { where: { user_id: uid } }),
    db.list("listening_progress", { where: { user_id: uid }, orderBy: { column: "updated_at", ascending: false } }),
  ]);
  return { saved, follows, creatorFollows, progress };
}

export async function getSettings(viewer: Viewer): Promise<UserSettings> {
  requireUser(viewer);
  const db = getDb();
  const existing = await db.get("user_settings", viewer.user.id);
  if (existing) return existing;
  const row: UserSettings = {
    id: viewer.user.id,
    autoplay_next: true,
    autoplay_limit: 3,
    default_speed: 1,
    default_sleep_timer_minutes: null,
    new_episode_updates: true,
    private_listening_history: false,
    updated_at: nowIso(),
  };
  return db.insert("user_settings", row);
}

export async function updateSettings(viewer: Viewer, patch: Partial<Omit<UserSettings, "id" | "updated_at">>) {
  const current = await getSettings(viewer);
  return getDb().update("user_settings", current.id, { ...patch, updated_at: nowIso() });
}
