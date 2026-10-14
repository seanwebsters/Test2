/** Serialisable view models shared by server pages and client components. */
import type { ArtworkSpec, Genre } from "@/lib/types";
import type { ListenAccess } from "@/lib/auth/policy";

export interface SeriesCardDTO {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  genre: Genre;
  artwork: ArtworkSpec;
  episodeCount: number;
  creatorName: string;
  creatorUsername: string;
  isOfficial: boolean;
  firstEpisodeId: string | null;
  saved: boolean;
  /** Present on "Continue Listening" cards. */
  resume?: { episodeId: string; episodeTitle: string; fraction: number } | null;
}

export interface ShelfDTO {
  key: string;
  title: string;
  subtitle?: string;
  items: SeriesCardDTO[];
  /** Ranking that is editorial or sample data rather than live analytics. */
  sampleData?: boolean;
}

export interface EpisodeRowDTO {
  id: string;
  number: number;
  title: string;
  summary: string;
  durationSeconds: number;
  publishedAt: string | null;
  releaseAt: string | null;
  status: string;
  access: ListenAccess;
  isPreview: boolean;
  progress: { position: number; duration: number; completed: boolean } | null;
}

export interface PlayerTrack {
  episodeId: string;
  seriesId: string;
  seriesSlug: string;
  seriesTitle: string;
  title: string;
  number: number;
  artwork: ArtworkSpec;
  src: string;
  /** True while the audio is placeholder ambience rather than produced narration. */
  isSampleAudio: boolean;
  access: ListenAccess;
  startAt: number;
  prevEpisodeId: string | null;
  nextEpisodeId: string | null;
}
