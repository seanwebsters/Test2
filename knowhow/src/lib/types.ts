export type CategoryId =
  | "history"
  | "psychology"
  | "science"
  | "finance"
  | "business"
  | "technology"
  | "culture"
  | "philosophy"
  | "space"
  | "creativity";

export type Motif =
  | "sun"
  | "columns"
  | "orbit"
  | "blob"
  | "grid"
  | "glyph"
  | "waves"
  | "checker"
  | "rays"
  | "stack"
  | "eye"
  | "spiral"
  | "bars"
  | "halftone";

export interface Art {
  motif: Motif;
  /** [background, primary, secondary, ink] */
  palette: [string, string, string, string];
  glyph?: string;
}

export interface Category {
  id: CategoryId;
  label: string;
  blurb: string;
  color: string;
  color2: string;
  deep: string;
  glyph: string;
}

export interface Topic {
  id: string;
  label: string;
  category: CategoryId;
  /** parent topic id; undefined for the category root */
  parent?: string;
  /** cross links to topics in other branches */
  related?: string[];
}

export type SegmentKind = "hook" | "story" | "fact" | "insight" | "outro";

export interface ScriptSegment {
  kind: SegmentKind;
  text: string;
}

export interface Challenge {
  question: string;
  options: string[];
  answer: number;
  explain: string;
}

export interface EpisodeScript {
  segments: ScriptSegment[];
  insights: string[];
  challenge?: Challenge;
}

export interface EpisodeMeta {
  id: string;
  seriesSlug: string;
  n: number;
  title: string;
  description: string;
  minutes: number;
  status: "released" | "upcoming";
  topics: string[];
  /** true when a written script exists for this episode */
  scripted: boolean;
  /** seconds, from the rendered audio manifest */
  duration?: number;
  hasAudio: boolean;
}

export interface Creator {
  name: string;
  handle: string;
  bio: string;
  voice: string;
}

export interface Series {
  slug: string;
  title: string;
  tagline: string;
  description: string;
  hook: string;
  category: CategoryId;
  topics: string[];
  creator: Creator;
  rating: number;
  ratingCount: number;
  freeEpisodes: number;
  art: Art;
  trending?: number;
  format: "quick" | "deep";
  releaseNote?: string;
  cardFact: string;
  episodes: EpisodeMeta[];
}

/** Transcript line with timings, from the rendered audio manifest. */
export interface TranscriptLine {
  t0: number;
  t1: number;
  text: string;
  kind: SegmentKind;
}

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";
