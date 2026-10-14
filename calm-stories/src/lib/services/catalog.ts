import "server-only";
import { getDb, type Database } from "@/lib/db";
import type { Viewer } from "@/lib/auth";
import { canViewSeries, isEpisodePublic, listenAccess } from "@/lib/auth/policy";
import type { CreatorProfile, Episode, Genre, ListeningProgress, Series } from "@/lib/types";
import type { EpisodeRowDTO, PlayerTrack, SeriesCardDTO, ShelfDTO } from "./dto";
import { recommendFor } from "./recommendations";

const DAY = 86400000;

interface CatalogContext {
  db: Database;
  series: Series[];
  episodes: Episode[];
  creators: Map<string, CreatorProfile>;
  saved: Set<string>;
  now: Date;
}

async function loadCatalog(viewer: Viewer): Promise<CatalogContext> {
  const db = getDb();
  const now = new Date();
  const [series, episodes, creators, saved] = await Promise.all([
    db.list("series", { where: { status: "published" } }),
    db.list("episodes", { where: { status: "published" } }),
    db.list("creator_profiles"),
    viewer.user ? db.list("user_libraries", { where: { user_id: viewer.user.id } }) : Promise.resolve([]),
  ]);
  return {
    db,
    series,
    episodes: episodes.filter((e) => isEpisodePublic(e, now)),
    creators: new Map(creators.map((c) => [c.user_id, c])),
    saved: new Set(saved.map((s) => s.series_id)),
    now,
  };
}

function toCard(ctx: CatalogContext, s: Series): SeriesCardDTO {
  const eps = ctx.episodes.filter((e) => e.series_id === s.id).sort((a, b) => a.number - b.number);
  const creator = ctx.creators.get(s.creator_id);
  return {
    id: s.id,
    slug: s.slug,
    title: s.title,
    tagline: s.tagline,
    genre: s.genre,
    artwork: s.artwork,
    episodeCount: eps.length,
    creatorName: creator?.display_name ?? "Unknown creator",
    creatorUsername: creator?.username ?? "",
    isOfficial: s.is_official,
    firstEpisodeId: eps[0]?.id ?? null,
    saved: ctx.saved.has(s.id),
  };
}

export async function getHomeShelves(viewer: Viewer): Promise<{ hero: SeriesCardDTO | null; shelves: ShelfDTO[] }> {
  const ctx = await loadCatalog(viewer);
  const card = (s: Series) => toCard(ctx, s);
  const by = (fn: (s: Series) => number) => [...ctx.series].sort((a, b) => fn(b) - fn(a));
  const genre = (g: Genre) => ctx.series.filter((s) => s.genre === g).sort((a, b) => b.popularity - a.popularity);

  const shelves: ShelfDTO[] = [];

  if (viewer.user) {
    const cont = await continueListening(ctx, viewer.user.id);
    if (cont.length) shelves.push({ key: "continue", title: "Continue Listening", items: cont });
  }

  shelves.push({ key: "trending", title: "Trending Sleep Stories", items: by((s) => s.trending_score).slice(0, 12).map(card), sampleData: true });
  shelves.push({ key: "popular", title: "Popular Series", items: by((s) => s.popularity).slice(0, 12).map(card), sampleData: true });

  const weekAgo = ctx.now.getTime() - 7 * DAY;
  const freshSeriesIds = new Set(
    ctx.episodes.filter((e) => e.published_at && new Date(e.published_at).getTime() >= weekAgo).map((e) => e.series_id),
  );
  const fresh = ctx.series.filter((s) => freshSeriesIds.has(s.id));
  if (fresh.length) shelves.push({ key: "new-episodes", title: "New Episodes This Week", items: fresh.map(card) });

  shelves.push({ key: "romantasy", title: "Sleep Romantasy", items: genre("Sleep Romantasy").map(card) });
  shelves.push({ key: "cosy-mysteries", title: "Cosy Mysteries", items: genre("Cosy Mystery").map(card) });
  shelves.push({ key: "magical-worlds", title: "Magical Worlds", items: genre("Magical Worlds").map(card) });
  shelves.push({ key: "sci-fi", title: "Sci-Fi & Space", items: genre("Sci-Fi & Space").map(card) });
  shelves.push({ key: "creator-originals", title: "Creator Originals", subtitle: "Made by the Calm Stories community", items: ctx.series.filter((s) => !s.is_official).sort((a, b) => b.popularity - a.popularity).map(card) });

  const rising = ctx.series
    .filter((s) => !s.is_official && s.published_at && ctx.now.getTime() - new Date(s.published_at).getTime() < 21 * DAY)
    .sort((a, b) => b.trending_score - a.trending_score);
  if (rising.length) shelves.push({ key: "rising", title: "New & Rising Creators", items: rising.map(card) });

  const recs = await recommendFor(ctx.db, viewer, ctx.series);
  shelves.push({ key: "recommended", title: "Recommended For You", subtitle: viewer.user ? "Based on what you follow and listen to" : "Sign in for personal picks", items: recs.slice(0, 12).map(card) });

  const heroSeries = ctx.series.find((s) => s.slug === "the-moonlit-kingdom") ?? by((s) => s.trending_score)[0];
  return { hero: heroSeries ? card(heroSeries) : null, shelves: shelves.filter((s) => s.items.length > 0) };
}

async function continueListening(ctx: CatalogContext, userId: string): Promise<SeriesCardDTO[]> {
  const rows = await ctx.db.list("listening_progress", { where: { user_id: userId }, orderBy: { column: "updated_at", ascending: false } });
  const seen = new Set<string>();
  const out: SeriesCardDTO[] = [];
  for (const p of rows) {
    if (seen.has(p.series_id)) continue;
    seen.add(p.series_id);
    const s = ctx.series.find((x) => x.id === p.series_id);
    if (!s) continue;
    const resume = resumePoint(ctx.episodes.filter((e) => e.series_id === s.id), rows.filter((r) => r.series_id === s.id));
    if (!resume) continue;
    out.push({ ...toCard(ctx, s), resume });
  }
  return out;
}

/** The episode to resume: the latest unfinished one, else the next after the last completed. */
export function resumePoint(
  episodes: Episode[],
  progress: ListeningProgress[],
): { episodeId: string; episodeTitle: string; fraction: number } | null {
  const ordered = [...episodes].sort((a, b) => a.number - b.number);
  const latest = [...progress].sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];
  if (!latest) return null;
  const ep = ordered.find((e) => e.id === latest.episode_id);
  if (!ep) return null;
  if (!latest.completed) {
    return { episodeId: ep.id, episodeTitle: ep.title, fraction: latest.duration_seconds ? latest.position_seconds / latest.duration_seconds : 0 };
  }
  const next = ordered.find((e) => e.number > ep.number);
  return next ? { episodeId: next.id, episodeTitle: next.title, fraction: 0 } : null;
}

export async function getSeriesCards(viewer: Viewer, ids?: string[]): Promise<SeriesCardDTO[]> {
  const ctx = await loadCatalog(viewer);
  const list = ids ? ids.map((id) => ctx.series.find((s) => s.id === id)).filter((s): s is Series => !!s) : ctx.series;
  return list.map((s) => toCard(ctx, s));
}

export async function searchCatalog(viewer: Viewer, query: string, genre: string | null): Promise<SeriesCardDTO[]> {
  const ctx = await loadCatalog(viewer);
  const q = query.trim().toLowerCase();
  const results = ctx.series.filter((s) => {
    if (genre && s.genre !== genre) return false;
    if (!q) return true;
    const creator = ctx.creators.get(s.creator_id)?.display_name ?? "";
    const hay = [s.title, s.tagline, s.description, s.genre, creator, ...s.tags].join(" ").toLowerCase();
    return q.split(/\s+/).every((term) => hay.includes(term));
  });
  return results.sort((a, b) => b.popularity - a.popularity).map((s) => toCard(ctx, s));
}

export interface SeriesPageDTO {
  series: Series;
  creator: CreatorProfile | null;
  card: SeriesCardDTO;
  seasons: { id: string; number: number; title: string; synopsis: string; episodes: EpisodeRowDTO[] }[];
  resume: { episodeId: string; episodeTitle: string; fraction: number } | null;
  following: boolean;
  followingCreator: boolean;
  followers: number;
  related: SeriesCardDTO[];
  canEdit: boolean;
}

export async function getSeriesPage(viewer: Viewer, slug: string): Promise<SeriesPageDTO | null> {
  const db = getDb();
  const series = await db.findOne("series", { slug });
  if (!series || !canViewSeries(viewer, series)) return null;
  const ctx = await loadCatalog(viewer);
  if (!ctx.series.some((s) => s.id === series.id)) ctx.series.push(series);

  const [seasons, allEpisodes, creator, progress, follow, followCreator, followers] = await Promise.all([
    db.list("seasons", { where: { series_id: series.id }, orderBy: { column: "number" } }),
    db.list("episodes", { where: { series_id: series.id }, orderBy: { column: "number" } }),
    db.findOne("creator_profiles", { user_id: series.creator_id }),
    viewer.user ? db.list("listening_progress", { where: { user_id: viewer.user.id, series_id: series.id } }) : Promise.resolve([]),
    viewer.user ? db.findOne("series_follows", { user_id: viewer.user.id, series_id: series.id }) : Promise.resolve(null),
    viewer.user ? db.findOne("creator_follows", { user_id: viewer.user.id, creator_id: series.creator_id }) : Promise.resolve(null),
    db.count("series_follows", { series_id: series.id }),
  ]);

  const now = new Date();
  const visibleEpisodes = allEpisodes.filter((e) => listenAccess(viewer, series, e, now) !== "hidden" || (e.status === "approved" && e.release_at));
  const progressByEp = new Map(progress.map((p) => [p.episode_id, p]));

  const rows = (eps: Episode[]): EpisodeRowDTO[] =>
    eps
      .sort((a, b) => a.number - b.number)
      .map((e) => {
        const p = progressByEp.get(e.id);
        return {
          id: e.id,
          number: e.number,
          title: e.title,
          summary: e.summary,
          durationSeconds: e.duration_seconds,
          publishedAt: e.published_at,
          releaseAt: e.release_at,
          status: e.status,
          access: listenAccess(viewer, series, e, now),
          isPreview: e.is_preview,
          progress: p ? { position: p.position_seconds, duration: p.duration_seconds, completed: p.completed } : null,
        };
      });

  const related = ctx.series
    .filter((s) => s.id !== series.id && (s.genre === series.genre || s.tags.some((t) => series.tags.includes(t))))
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, 8)
    .map((s) => toCard(ctx, s));

  return {
    series,
    creator,
    card: toCard(ctx, series),
    seasons: seasons.map((s) => ({ id: s.id, number: s.number, title: s.title, synopsis: s.synopsis, episodes: rows(visibleEpisodes.filter((e) => e.season_id === s.id)) })),
    resume: resumePoint(allEpisodes.filter((e) => isEpisodePublic(e, now) || viewer.isAdmin), progress),
    following: !!follow,
    followingCreator: !!followCreator,
    followers,
    related,
    canEdit: !!viewer.user && (viewer.isAdmin || viewer.user.id === series.creator_id),
  };
}

/** Resolves an episode into a playable track, enforcing listening entitlements. */
export async function getPlayerTrack(viewer: Viewer, episodeId: string): Promise<PlayerTrack | null> {
  const db = getDb();
  const ep = await db.get("episodes", episodeId);
  if (!ep) return null;
  const series = await db.get("series", ep.series_id);
  if (!series) return null;
  const access = listenAccess(viewer, series, ep);
  if (access === "hidden") return null;

  const siblings = (await db.list("episodes", { where: { series_id: series.id }, orderBy: { column: "number" } })).filter(
    (e) => listenAccess(viewer, series, e) !== "hidden",
  );
  const idx = siblings.findIndex((e) => e.id === ep.id);
  const asset = ep.audio_asset_id ? await db.get("audio_assets", ep.audio_asset_id) : null;
  const progress = viewer.user ? await db.get("listening_progress", `${viewer.user.id}:${ep.id}`) : null;
  const playable = access === "full" || access === "preview";

  return {
    episodeId: ep.id,
    seriesId: series.id,
    seriesSlug: series.slug,
    seriesTitle: series.title,
    title: ep.title,
    number: ep.number,
    artwork: series.artwork,
    src: playable && asset ? `/api/stream/${ep.id}` : "",
    isSampleAudio: !asset || asset.kind === "sample",
    access,
    startAt: progress && !progress.completed ? progress.position_seconds : 0,
    prevEpisodeId: siblings[idx - 1]?.id ?? null,
    nextEpisodeId: siblings[idx + 1]?.id ?? null,
  };
}
