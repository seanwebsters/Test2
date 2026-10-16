import "server-only";
import { getDb } from "@/lib/db";
import type { Viewer } from "@/lib/auth/policy";
import { canUseLibrary, canViewSeries, isEpisodePublic, isEditor } from "@/lib/auth/policy";
import type { ArtworkSpec, CreatorProfile, Episode, Genre, ListeningProgress, Season, Series } from "@/lib/types";
import { GENRES } from "@/lib/types";
import { recommendSeries } from "./recommendations";

const DAY = 86400000;

export interface SeriesCard {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  genre: Genre;
  artwork: ArtworkSpec;
  creator_name: string;
  creator_username: string;
  is_official: boolean;
  episode_count: number;
  first_episode_id: string | null;
  latest_release_at: string | null;
  trending_score: number;
  popularity: number;
  published_at: string | null;
}

export interface EpisodeCard {
  id: string;
  title: string;
  number: number;
  season_number: number;
  series_id: string;
  series_slug: string;
  series_title: string;
  artwork: ArtworkSpec;
  duration_seconds: number;
  release_at: string | null;
  progress: { position_seconds: number; duration_seconds: number; completed: boolean } | null;
}

export type Shelf =
  | { id: string; title: string; subtitle?: string; kind: "series"; items: SeriesCard[] }
  | { id: string; title: string; subtitle?: string; kind: "episodes"; items: EpisodeCard[] };

interface CatalogIndex {
  series: Series[];
  episodes: Episode[]; // public only
  seasons: Season[];
  creators: Map<string, CreatorProfile>;
  cards: Map<string, SeriesCard>;
}

export async function loadCatalog(now = new Date()): Promise<CatalogIndex> {
  const db = getDb();
  const [series, episodes, seasons, creators] = await Promise.all([
    db.list("series", { where: { status: "published" } }),
    db.list("episodes", { where: { status: ["published", "approved"] } }),
    db.list("seasons"),
    db.list("creator_profiles"),
  ]);
  const seriesById = new Map(series.map((s) => [s.id, s]));
  const publicEpisodes = episodes
    .filter((e) => {
      const s = seriesById.get(e.series_id);
      return s ? isEpisodePublic(e, s, now) : false;
    })
    .sort((a, b) => episodeOrder(a, b, seasons));
  const creatorByUser = new Map(creators.map((c) => [c.user_id, c]));
  const cards = new Map<string, SeriesCard>();
  for (const s of series) {
    const eps = publicEpisodes.filter((e) => e.series_id === s.id);
    const creator = creatorByUser.get(s.creator_id);
    cards.set(s.id, {
      id: s.id,
      slug: s.slug,
      title: s.title,
      tagline: s.tagline,
      genre: s.genre,
      artwork: s.artwork,
      creator_name: creator?.display_name ?? "Unknown creator",
      creator_username: creator?.username ?? "",
      is_official: s.is_official,
      episode_count: eps.length,
      first_episode_id: eps[0]?.id ?? null,
      latest_release_at: eps.reduce<string | null>((acc, e) => (e.release_at && (!acc || e.release_at > acc) ? e.release_at : acc), null),
      trending_score: s.trending_score,
      popularity: s.popularity,
      published_at: s.published_at,
    });
  }
  return { series, episodes: publicEpisodes, seasons, creators: creatorByUser, cards };
}

export function episodeOrder(a: Episode, b: Episode, seasons: Season[]): number {
  if (a.series_id !== b.series_id) return a.series_id < b.series_id ? -1 : 1;
  const sa = seasons.find((s) => s.id === a.season_id)?.number ?? 0;
  const sb = seasons.find((s) => s.id === b.season_id)?.number ?? 0;
  if (sa !== sb) return sa - sb;
  return a.number - b.number;
}

function toEpisodeCard(e: Episode, idx: CatalogIndex, progress?: ListeningProgress): EpisodeCard {
  const s = idx.series.find((x) => x.id === e.series_id)!;
  const season = idx.seasons.find((x) => x.id === e.season_id);
  return {
    id: e.id,
    title: e.title,
    number: e.number,
    season_number: season?.number ?? 1,
    series_id: s.id,
    series_slug: s.slug,
    series_title: s.title,
    artwork: s.artwork,
    duration_seconds: e.duration_seconds,
    release_at: e.release_at,
    progress: progress
      ? { position_seconds: progress.position_seconds, duration_seconds: progress.duration_seconds, completed: progress.completed }
      : null,
  };
}

export async function getContinueListening(viewer: Viewer, idx?: CatalogIndex): Promise<EpisodeCard[]> {
  if (!viewer.user) return [];
  const catalog = idx ?? (await loadCatalog());
  const progress = await getDb().list("listening_progress", { where: { user_id: viewer.user.id } });
  progress.sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
  const out: EpisodeCard[] = [];
  const seenSeries = new Set<string>();
  for (const p of progress) {
    if (seenSeries.has(p.series_id)) continue;
    let ep = catalog.episodes.find((e) => e.id === p.episode_id);
    let prog: ListeningProgress | undefined = p;
    if (ep && p.completed) {
      // Offer the next episode in the series instead of a finished one.
      const eps = catalog.episodes.filter((e) => e.series_id === p.series_id);
      const next = eps[eps.findIndex((e) => e.id === p.episode_id) + 1];
      ep = next;
      prog = undefined;
    }
    if (!ep) continue;
    seenSeries.add(p.series_id);
    out.push(toEpisodeCard(ep, catalog, prog));
  }
  return out.slice(0, 12);
}

export async function getHomeShelves(viewer: Viewer, now = new Date()): Promise<Shelf[]> {
  const idx = await loadCatalog(now);
  const all = [...idx.cards.values()].filter((c) => c.episode_count > 0);
  const byTrending = [...all].sort((a, b) => b.trending_score - a.trending_score);
  const byPopular = [...all].sort((a, b) => b.popularity - a.popularity);
  const genre = (g: Genre) => byPopular.filter((c) => c.genre === g);

  const weekAgo = now.getTime() - 7 * DAY;
  const newEpisodes = idx.episodes
    .filter((e) => e.release_at && new Date(e.release_at).getTime() >= weekAgo)
    .sort((a, b) => ((a.release_at ?? "") < (b.release_at ?? "") ? 1 : -1))
    .map((e) => toEpisodeCard(e, idx));

  const firstSeriesByCreator = new Map<string, string>();
  for (const s of [...idx.series].sort((a, b) => ((a.published_at ?? "") < (b.published_at ?? "") ? -1 : 1))) {
    if (!firstSeriesByCreator.has(s.creator_id)) firstSeriesByCreator.set(s.creator_id, s.published_at ?? "");
  }
  const rising = all
    .filter((c) => !c.is_official)
    .filter((c) => {
      const s = idx.series.find((x) => x.id === c.id)!;
      const first = firstSeriesByCreator.get(s.creator_id) ?? "";
      return first && now.getTime() - new Date(first).getTime() < 35 * DAY;
    })
    .sort((a, b) => b.trending_score - a.trending_score);

  const shelves: Shelf[] = [];
  const continueItems = await getContinueListening(viewer, idx);
  if (continueItems.length) shelves.push({ id: "continue", title: "Continue Listening", kind: "episodes", items: continueItems });
  shelves.push({ id: "trending", title: "Trending Sleep Stories", kind: "series", items: byTrending.slice(0, 12) });
  shelves.push({ id: "popular", title: "Popular Series", kind: "series", items: byPopular.slice(0, 12) });
  if (newEpisodes.length)
    shelves.push({ id: "new-episodes", title: "New Episodes This Week", kind: "episodes", items: newEpisodes.slice(0, 14) });
  shelves.push({ id: "romantasy", title: "Sleep Romantasy", kind: "series", items: genre("Sleep Romantasy").concat(genre("Coastal Romance")) });
  shelves.push({ id: "mysteries", title: "Cosy Mysteries", kind: "series", items: genre("Cosy Mystery") });
  shelves.push({ id: "magical", title: "Magical Worlds", kind: "series", items: genre("Magical Worlds") });
  shelves.push({ id: "scifi", title: "Sci-Fi & Space", kind: "series", items: genre("Sci-Fi & Space") });
  shelves.push({
    id: "creator-originals",
    title: "Creator Originals",
    subtitle: "Series from independent storytellers, reviewed by Calm",
    kind: "series",
    items: byPopular.filter((c) => !c.is_official),
  });
  if (rising.length)
    shelves.push({ id: "rising", title: "New & Rising Creators", kind: "series", items: rising });
  const recs = await recommendSeries(viewer, idx);
  shelves.push({
    id: "recommended",
    title: viewer.user ? "Recommended For You" : "Recommended To Start",
    subtitle: viewer.user ? "Based on the genres you listen to and the series you follow" : undefined,
    kind: "series",
    items: recs.slice(0, 12),
  });
  return shelves.filter((s) => s.items.length > 0);
}

export async function getFeatured(now = new Date()): Promise<SeriesCard | null> {
  const idx = await loadCatalog(now);
  return [...idx.cards.values()].sort((a, b) => b.trending_score - a.trending_score)[0] ?? null;
}

export async function searchCatalog(query: string, genre: string | null, now = new Date()) {
  const idx = await loadCatalog(now);
  const q = query.trim().toLowerCase();
  const results = [...idx.cards.values()].filter((c) => {
    if (c.episode_count === 0) return false;
    if (genre && c.genre !== genre) return false;
    if (!q) return true;
    const s = idx.series.find((x) => x.id === c.id)!;
    const haystack = [s.title, s.tagline, s.description, s.genre, c.creator_name, ...s.tags].join(" ").toLowerCase();
    return q.split(/\s+/).every((term) => haystack.includes(term));
  });
  const episodes = q
    ? idx.episodes
        .filter((e) => `${e.title} ${e.summary}`.toLowerCase().includes(q))
        .slice(0, 12)
        .map((e) => toEpisodeCard(e, idx))
    : [];
  return { series: results.sort((a, b) => b.popularity - a.popularity), episodes, genres: GENRES };
}

/* ------------------------------------------------------------------ */
/* Series detail                                                       */
/* ------------------------------------------------------------------ */

export interface SeriesDetail {
  series: Series;
  creator: CreatorProfile | null;
  seasons: (Season & { episodes: (Episode & { progress: ListeningProgress | null; is_public: boolean })[] })[];
  resume: { episode_id: string; position_seconds: number; label: string } | null;
  saved: boolean;
  following: boolean;
  following_creator: boolean;
  follower_count: number;
  related: SeriesCard[];
  is_public: boolean;
}

export async function getSeriesDetail(slug: string, viewer: Viewer, now = new Date()): Promise<SeriesDetail | null> {
  const db = getDb();
  const series = await db.findOne("series", { slug });
  if (!series || !canViewSeries(viewer, series)) return null;
  const privileged = isEditor(viewer);
  const [seasons, episodes, creator, progress] = await Promise.all([
    db.list("seasons", { where: { series_id: series.id }, orderBy: { column: "number" } }),
    db.list("episodes", { where: { series_id: series.id } }),
    db.findOne("creator_profiles", { user_id: series.creator_id }),
    viewer.user ? db.list("listening_progress", { where: { user_id: viewer.user.id, series_id: series.id } }) : Promise.resolve([]),
  ]);
  const visible = episodes
    .map((e) => ({ ...e, is_public: isEpisodePublic(e, series, now) }))
    .filter((e) => e.is_public || privileged)
    .sort((a, b) => episodeOrder(a, b, seasons));
  const progressById = new Map(progress.map((p) => [p.episode_id, p]));

  const seasonsOut = seasons
    .map((s) => ({
      ...s,
      episodes: visible.filter((e) => e.season_id === s.id).map((e) => ({ ...e, progress: progressById.get(e.id) ?? null })),
    }))
    .filter((s) => s.episodes.length > 0 || privileged);

  // Resume: most recent unfinished; else next after the last completed.
  let resume: SeriesDetail["resume"] = null;
  const publicEps = visible.filter((e) => e.is_public);
  const sortedProgress = [...progress].sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
  const latest = sortedProgress[0];
  if (latest) {
    const ep = publicEps.find((e) => e.id === latest.episode_id);
    if (ep && !latest.completed) {
      resume = { episode_id: ep.id, position_seconds: latest.position_seconds, label: `Continue Episode ${ep.number}` };
    } else if (ep) {
      const next = publicEps[publicEps.findIndex((e) => e.id === ep.id) + 1];
      if (next) resume = { episode_id: next.id, position_seconds: 0, label: `Play Episode ${next.number}` };
    }
  }

  let saved = false;
  let following = false;
  let followingCreator = false;
  if (viewer.user && canUseLibrary(viewer)) {
    [saved, following, followingCreator] = await Promise.all([
      db.findOne("user_libraries", { user_id: viewer.user.id, series_id: series.id }).then(Boolean),
      db.findOne("series_follows", { user_id: viewer.user.id, series_id: series.id }).then(Boolean),
      db.findOne("creator_follows", { user_id: viewer.user.id, creator_id: series.creator_id }).then(Boolean),
    ]);
  }
  const followerCount = await db.count("series_follows", { series_id: series.id });

  const idx = await loadCatalog(now);
  const related = [...idx.cards.values()]
    .filter((c) => c.id !== series.id && c.episode_count > 0)
    .map((c) => ({ c, score: (c.genre === series.genre ? 100 : 0) + c.popularity }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((x) => x.c);

  return {
    series,
    creator,
    seasons: seasonsOut,
    resume,
    saved,
    following,
    following_creator: followingCreator,
    follower_count: followerCount,
    related,
    is_public: series.status === "published",
  };
}

/* ------------------------------------------------------------------ */
/* Episode (for the player)                                            */
/* ------------------------------------------------------------------ */

export interface PlayableEpisode {
  id: string;
  title: string;
  number: number;
  season_number: number;
  summary: string;
  series_id: string;
  series_slug: string;
  series_title: string;
  creator_name: string;
  artwork: ArtworkSpec;
  duration_seconds: number;
  is_preview: boolean;
  is_public: boolean;
  has_audio: boolean;
  audio_is_sample: boolean;
  prev_id: string | null;
  next_id: string | null;
}

export async function getPlayableEpisode(id: string, viewer: Viewer, now = new Date()): Promise<PlayableEpisode | null> {
  const db = getDb();
  const ep = await db.get("episodes", id);
  if (!ep) return null;
  const series = await db.get("series", ep.series_id);
  if (!series) return null;
  const isPublic = isEpisodePublic(ep, series, now);
  const privileged = isEditor(viewer);
  if (!isPublic && !privileged) return null;
  const [seasons, siblings, creator, asset] = await Promise.all([
    db.list("seasons", { where: { series_id: series.id } }),
    db.list("episodes", { where: { series_id: series.id } }),
    db.findOne("creator_profiles", { user_id: series.creator_id }),
    ep.audio_asset_id ? db.get("audio_assets", ep.audio_asset_id) : Promise.resolve(null),
  ]);
  const ordered = siblings
    .filter((e) => (privileged ? true : isEpisodePublic(e, series, now)))
    .sort((a, b) => episodeOrder(a, b, seasons));
  const i = ordered.findIndex((e) => e.id === ep.id);
  return {
    id: ep.id,
    title: ep.title,
    number: ep.number,
    season_number: seasons.find((s) => s.id === ep.season_id)?.number ?? 1,
    summary: ep.summary,
    series_id: series.id,
    series_slug: series.slug,
    series_title: series.title,
    creator_name: creator?.display_name ?? "",
    artwork: series.artwork,
    duration_seconds: ep.duration_seconds,
    is_preview: ep.is_preview,
    is_public: isPublic,
    has_audio: Boolean(asset),
    audio_is_sample: asset?.kind === "sample",
    prev_id: i > 0 ? (ordered[i - 1]?.id ?? null) : null,
    next_id: i >= 0 ? (ordered[i + 1]?.id ?? null) : null,
  };
}
