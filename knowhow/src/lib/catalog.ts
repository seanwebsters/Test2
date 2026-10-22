import "server-only";
import type { EpisodeMeta, Series, TranscriptLine } from "./types";
import { SERIES_SEED } from "@/content/series-data";
import { SCRIPTS } from "@/content/scripts";
import manifestJson from "@/content/audio-manifest.json";

interface ManifestEntry {
  duration: number;
  lines: TranscriptLine[];
  preview: { duration: number; lines: TranscriptLine[] };
}
const MANIFEST = manifestJson as unknown as Record<string, ManifestEntry>;

export const SERIES: Series[] = SERIES_SEED.map((seed) => {
  const { released, episodes, ...rest } = seed;
  const eps: EpisodeMeta[] = episodes.map(([title, description, minutes, topics], i) => {
    const id = `${seed.slug}-${i + 1}`;
    const m = MANIFEST[id];
    const isReleased = i < released;
    return {
      id,
      seriesSlug: seed.slug,
      n: i + 1,
      title,
      description,
      minutes: m ? Math.max(1, Math.round(m.duration / 60)) : minutes,
      status: isReleased ? "released" : "upcoming",
      topics: topics ?? seed.topics.slice(0, 1),
      scripted: Boolean(SCRIPTS[id]),
      duration: m?.duration,
      hasAudio: Boolean(m) && isReleased,
    };
  });
  return { ...rest, episodes: eps };
});

export const SERIES_BY_SLUG: Record<string, Series> = Object.fromEntries(SERIES.map((s) => [s.slug, s]));
export const EPISODE_BY_ID: Record<string, EpisodeMeta> = Object.fromEntries(SERIES.flatMap((s) => s.episodes.map((e) => [e.id, e])));

export const getSeries = (slug: string) => SERIES_BY_SLUG[slug];
export const getEpisode = (id: string) => EPISODE_BY_ID[id];

export function releasedEpisodes(series: Series) {
  return series.episodes.filter((e) => e.status === "released");
}

/** Full timed transcript. Callers must check entitlement first. */
export function transcriptFor(episodeId: string): TranscriptLine[] | null {
  return MANIFEST[episodeId]?.lines ?? null;
}

/** Free hook-only preview used by Discover. */
export function previewFor(episodeId: string) {
  const m = MANIFEST[episodeId];
  return m ? m.preview : null;
}

export function scriptFor(episodeId: string) {
  return SCRIPTS[episodeId] ?? null;
}

export function demoAudio(id: string) {
  return MANIFEST[id] ?? null;
}

export const CATALOG = { bySlug: SERIES_BY_SLUG, byEpisode: EPISODE_BY_ID };
