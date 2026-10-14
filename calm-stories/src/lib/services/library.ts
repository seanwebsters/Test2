import "server-only";
import { getDb } from "@/lib/db";
import type { Viewer } from "@/lib/auth/policy";
import { canUseLibrary, isEpisodePublic } from "@/lib/auth/policy";
import { forbidden, notFound, unauthorized } from "@/lib/errors";
import { newId, nowIso } from "@/lib/util";
import { track } from "@/lib/analytics";
import { loadCatalog, type SeriesCard, type EpisodeCard, getContinueListening } from "./catalog";

function requireLibrary(viewer: Viewer): string {
  if (!viewer.user) throw unauthorized();
  if (!canUseLibrary(viewer)) throw forbidden("Your library is included with Calm Premium.");
  return viewer.user.id;
}

async function requirePublicSeries(seriesId: string) {
  const s = await getDb().get("series", seriesId);
  if (!s || s.status !== "published") throw notFound("Series not found.");
  return s;
}

export async function setSaved(viewer: Viewer, seriesId: string, saved: boolean, collection = "Saved") {
  const uid = requireLibrary(viewer);
  await requirePublicSeries(seriesId);
  const db = getDb();
  const existing = await db.list("user_libraries", { where: { user_id: uid, series_id: seriesId } });
  if (saved) {
    if (!existing.some((e) => e.collection === collection)) {
      await db.insert("user_libraries", { id: newId("lib"), user_id: uid, series_id: seriesId, collection, created_at: nowIso() });
      await track("series_saved", uid, { series_id: seriesId, collection });
    }
  } else {
    for (const e of existing) await db.remove("user_libraries", e.id);
  }
  return { saved };
}

export async function setFollowSeries(viewer: Viewer, seriesId: string, follow: boolean) {
  const uid = requireLibrary(viewer);
  await requirePublicSeries(seriesId);
  const db = getDb();
  const existing = await db.findOne("series_follows", { user_id: uid, series_id: seriesId });
  if (follow && !existing) {
    await db.insert("series_follows", { id: newId("sf"), user_id: uid, series_id: seriesId, created_at: nowIso() });
    await track("series_followed", uid, { series_id: seriesId });
  }
  if (!follow && existing) await db.remove("series_follows", existing.id);
  return { following: follow };
}

export async function setFollowCreator(viewer: Viewer, creatorUserId: string, follow: boolean) {
  const uid = requireLibrary(viewer);
  const db = getDb();
  const profile = await db.findOne("creator_profiles", { user_id: creatorUserId });
  if (!profile) throw notFound("Creator not found.");
  if (creatorUserId === uid) throw forbidden("You can't follow yourself.");
  const existing = await db.findOne("creator_follows", { user_id: uid, creator_id: creatorUserId });
  if (follow && !existing) {
    await db.insert("creator_follows", { id: newId("cf"), user_id: uid, creator_id: creatorUserId, created_at: nowIso() });
    await track("creator_followed", uid, { creator_id: creatorUserId });
  }
  if (!follow && existing) await db.remove("creator_follows", existing.id);
  return { following: follow };
}

/** Persist playback position. Works for any signed-in user who can play the episode. */
export async function saveProgress(viewer: Viewer, episodeId: string, position: number, duration: number) {
  if (!viewer.user) throw unauthorized();
  const db = getDb();
  const ep = await db.get("episodes", episodeId);
  if (!ep) throw notFound();
  const series = await db.get("series", ep.series_id);
  if (!series) throw notFound();
  const id = `${viewer.user.id}:${episodeId}`;
  const completed = duration > 0 && position >= duration - 5;
  const existing = await db.get("listening_progress", id);
  const row = {
    id,
    user_id: viewer.user.id,
    episode_id: episodeId,
    series_id: ep.series_id,
    position_seconds: Math.max(0, Math.round(position)),
    duration_seconds: Math.round(duration),
    completed: completed || Boolean(existing?.completed && position < 5),
    updated_at: nowIso(),
  };
  await db.upsert("listening_progress", row);
  return { ...row, is_public: isEpisodePublic(ep, series) };
}

export async function getProgress(viewer: Viewer, episodeId: string) {
  if (!viewer.user) return null;
  return getDb().get("listening_progress", `${viewer.user.id}:${episodeId}`);
}

export interface LibraryView {
  collections: { name: string; items: SeriesCard[] }[];
  following: SeriesCard[];
  creators: { user_id: string; username: string; display_name: string; is_official: boolean }[];
  continue_listening: EpisodeCard[];
  history: EpisodeCard[];
}

export async function getLibrary(viewer: Viewer): Promise<LibraryView> {
  const uid = requireLibrary(viewer);
  const db = getDb();
  const idx = await loadCatalog();
  const [items, follows, creatorFollows, progress] = await Promise.all([
    db.list("user_libraries", { where: { user_id: uid }, orderBy: { column: "created_at", ascending: false } }),
    db.list("series_follows", { where: { user_id: uid } }),
    db.list("creator_follows", { where: { user_id: uid } }),
    db.list("listening_progress", { where: { user_id: uid }, orderBy: { column: "updated_at", ascending: false } }),
  ]);
  const byCollection = new Map<string, SeriesCard[]>();
  for (const it of items) {
    const card = idx.cards.get(it.series_id);
    if (!card) continue;
    const list = byCollection.get(it.collection) ?? [];
    list.push(card);
    byCollection.set(it.collection, list);
  }
  const creatorProfiles = await db.list("creator_profiles", { where: { user_id: creatorFollows.map((c) => c.creator_id) } });
  const history: EpisodeCard[] = [];
  for (const p of progress.slice(0, 20)) {
    const ep = idx.episodes.find((e) => e.id === p.episode_id);
    const s = ep && idx.series.find((x) => x.id === ep.series_id);
    if (!ep || !s) continue;
    history.push({
      id: ep.id,
      title: ep.title,
      number: ep.number,
      season_number: idx.seasons.find((x) => x.id === ep.season_id)?.number ?? 1,
      series_id: s.id,
      series_slug: s.slug,
      series_title: s.title,
      artwork: s.artwork,
      duration_seconds: ep.duration_seconds,
      release_at: ep.release_at,
      progress: { position_seconds: p.position_seconds, duration_seconds: p.duration_seconds, completed: p.completed },
    });
  }
  return {
    collections: [...byCollection.entries()].map(([name, list]) => ({ name, items: list })),
    following: follows.map((f) => idx.cards.get(f.series_id)).filter((c): c is SeriesCard => Boolean(c)),
    creators: creatorProfiles.map((c) => ({ user_id: c.user_id, username: c.username, display_name: c.display_name, is_official: c.is_official })),
    continue_listening: await getContinueListening(viewer, idx),
    history,
  };
}

export async function recordListeningEvent(
  viewer: Viewer,
  anonymousId: string | null,
  input: { episode_id: string; kind: "play" | "pause" | "complete" | "progress" | "seek" | "sleep_timer"; position_seconds: number; listened_seconds: number },
) {
  const db = getDb();
  const ep = await db.get("episodes", input.episode_id);
  if (!ep) throw notFound();
  await db.insert("listening_events", {
    id: newId("lev"),
    user_id: viewer.user?.id ?? null,
    anonymous_id: viewer.user ? null : anonymousId,
    episode_id: ep.id,
    series_id: ep.series_id,
    kind: input.kind,
    position_seconds: Math.round(input.position_seconds),
    listened_seconds: Math.max(0, Math.min(600, Math.round(input.listened_seconds))),
    is_sample: false,
    created_at: nowIso(),
  });
  const distinct = viewer.user?.id ?? anonymousId ?? "anonymous";
  const map = { play: "episode_play", pause: "episode_pause", complete: "episode_complete", sleep_timer: "sleep_timer_set" } as const;
  const name = map[input.kind as keyof typeof map];
  if (name) await track(name, distinct, { episode_id: ep.id, series_id: ep.series_id, position: input.position_seconds });
}
