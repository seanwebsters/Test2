/**
 * Domain model for Calm Stories.
 *
 * Field names are snake_case on purpose: every interface maps 1:1 onto a
 * PostgreSQL table in `supabase/migrations`, so the same records flow through
 * the local JSON store and the Supabase adapter without a mapping layer.
 */

export type ID = string;
export type ISODate = string;

/* ------------------------------------------------------------------ */
/* Identity, roles and entitlements                                    */
/* ------------------------------------------------------------------ */

export interface User {
  id: ID;
  username: string;
  display_name: string;
  email: string;
  avatar_hue: number;
  created_at: ISODate;
}

export type Role = "admin" | "editor";

export interface UserRole {
  id: ID;
  user_id: ID;
  role: Role;
  created_at: ISODate;
}

export type Plan = "free" | "premium";

export interface SubscriptionEntitlement {
  id: ID;
  user_id: ID;
  plan: Plan;
  status: "active" | "expired" | "cancelled";
  /** "mock" for the prototype; "calm" once Calm's subscription service is connected. */
  source: "mock" | "calm";
  expires_at: ISODate | null;
  created_at: ISODate;
}

export interface CreatorProfile {
  id: ID;
  user_id: ID;
  username: string;
  display_name: string;
  bio: string;
  /** Official Calm Originals team vs. a community creator. */
  is_official: boolean;
  avatar: ArtworkSpec;
  created_at: ISODate;
}

/* ------------------------------------------------------------------ */
/* Artwork                                                             */
/* ------------------------------------------------------------------ */

export type SceneKind =
  | "kingdom"
  | "forest"
  | "cabin"
  | "space"
  | "ocean"
  | "garden"
  | "library"
  | "village"
  | "coast"
  | "desert"
  | "aurora"
  | "city"
  | "lake"
  | "portrait";

export interface ArtworkSpec {
  scene: SceneKind;
  /** [sky top, sky bottom, accent, glow] */
  palette: [string, string, string, string];
  seed: number;
  /** Optional uploaded / generated image URL that overrides the procedural scene. */
  image_url?: string | null;
  /** Optional moon position (0–1 across the frame) for compositions with text overlays. */
  moon_x?: number;
}

/* ------------------------------------------------------------------ */
/* Catalogue                                                           */
/* ------------------------------------------------------------------ */

export type Genre =
  | "Sleep Romantasy"
  | "Cosy Mystery"
  | "Magical Worlds"
  | "Sci-Fi & Space"
  | "Nature & Journeys"
  | "Gentle Adventure"
  | "Coastal Romance";

export const GENRES: Genre[] = [
  "Sleep Romantasy",
  "Cosy Mystery",
  "Magical Worlds",
  "Sci-Fi & Space",
  "Nature & Journeys",
  "Gentle Adventure",
  "Coastal Romance",
];

export type SeriesStatus = "draft" | "in_review" | "published" | "archived" | "removed";

export interface Series {
  id: ID;
  slug: string;
  creator_id: ID; // users.id
  title: string;
  tagline: string;
  description: string;
  genre: Genre;
  tags: string[];
  status: SeriesStatus;
  is_official: boolean;
  artwork: ArtworkSpec;
  soundscape_id: ID | null;
  content_rating: "all-ages" | "teen";
  ai_disclosure: string | null;
  /** Editorial ranking signals; replaced by real analytics in production. */
  trending_score: number;
  popularity: number;
  created_at: ISODate;
  updated_at: ISODate;
  published_at: ISODate | null;
}

export interface Season {
  id: ID;
  series_id: ID;
  number: number;
  title: string;
  synopsis: string;
  arc: string;
  created_at: ISODate;
}

export type EpisodeStatus = "draft" | "in_review" | "changes_requested" | "approved" | "published" | "rejected";

export interface Episode {
  id: ID;
  series_id: ID;
  season_id: ID;
  number: number;
  title: string;
  summary: string;
  /** Intended runtime of the finished episode. */
  duration_seconds: number;
  status: EpisodeStatus;
  release_at: ISODate | null;
  published_at: ISODate | null;
  audio_asset_id: ID | null;
  /** Episode artwork made by the art director agent; falls back to the series key art. */
  artwork_url: string | null;
  /** Free preview for visitors without Calm Premium. */
  is_preview: boolean;
  created_at: ISODate;
  updated_at: ISODate;
}

/* ------------------------------------------------------------------ */
/* Audio                                                               */
/* ------------------------------------------------------------------ */

export interface AudioAsset {
  id: ID;
  owner_id: ID | null;
  series_id: ID | null;
  episode_id: ID | null;
  kind: "upload" | "sample" | "produced";
  storage_key: string;
  url: string;
  mime_type: string;
  duration_seconds: number;
  /** "calm-synth" for seeded ambience samples, "upload" for editor uploads, "elevenlabs"/"simulated" for agent-produced mixes. */
  provider: string;
  meta: Record<string, unknown>;
  created_at: ISODate;
}

export interface SoundLayer {
  kind: "rain" | "forest" | "ocean" | "fire" | "thunder" | "space" | "wind" | "village" | "stream" | "pad";
  gain: number;
}

export interface Soundscape {
  id: ID;
  slug: string;
  name: string;
  description: string;
  layers: SoundLayer[];
  licence: string;
  sample_url: string;
  created_at: ISODate;
}

/* ------------------------------------------------------------------ */
/* Publishing & editorial                                              */
/* ------------------------------------------------------------------ */

export interface PublishingSchedule {
  id: ID;
  episode_id: ID;
  series_id: ID;
  release_at: ISODate;
  status: "scheduled" | "released" | "cancelled";
  created_by: ID;
  created_at: ISODate;
  updated_at: ISODate;
}

export interface ReviewCheck {
  name: "audio" | "metadata" | "release" | "series" | "script" | "audio_qa" | "artwork";
  status: "pass" | "warn" | "fail" | "not_run";
  detail: string;
}

export interface EditorialReview {
  id: ID;
  episode_id: ID;
  series_id: ID;
  submitted_by: ID;
  source: "upload" | "agents";
  status: "pending" | "approved" | "rejected" | "changes_requested";
  checks: ReviewCheck[];
  requested_release_at: ISODate | null;
  reviewer_id: ID | null;
  notes: string;
  created_at: ISODate;
  decided_at: ISODate | null;
}

export interface ContentReport {
  id: ID;
  reporter_id: ID | null;
  target_type: "series" | "episode" | "creator";
  target_id: ID;
  reason: "copyright" | "inappropriate" | "not_sleep_friendly" | "impersonation" | "other";
  details: string;
  status: "open" | "actioned" | "dismissed";
  resolution: string | null;
  created_at: ISODate;
  resolved_at: ISODate | null;
}

/* ------------------------------------------------------------------ */
/* Listener                                                            */
/* ------------------------------------------------------------------ */

export interface UserLibraryItem {
  id: ID;
  user_id: ID;
  series_id: ID;
  collection: string;
  created_at: ISODate;
}

export interface SeriesFollow {
  id: ID;
  user_id: ID;
  series_id: ID;
  created_at: ISODate;
}

export interface CreatorFollow {
  id: ID;
  user_id: ID;
  creator_id: ID; // users.id
  created_at: ISODate;
}

export interface ListeningProgress {
  id: ID; // `${user_id}:${episode_id}`
  user_id: ID;
  episode_id: ID;
  series_id: ID;
  position_seconds: number;
  duration_seconds: number;
  completed: boolean;
  updated_at: ISODate;
}

export interface ListeningEvent {
  id: ID;
  user_id: ID | null;
  anonymous_id: string | null;
  episode_id: ID | null;
  series_id: ID | null;
  kind: "play" | "pause" | "complete" | "progress" | "seek" | "sleep_timer";
  position_seconds: number;
  listened_seconds: number;
  is_sample: boolean;
  created_at: ISODate;
}

export interface Notification {
  id: ID;
  user_id: ID;
  kind: "new_episode" | "review" | "production" | "system";
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  created_at: ISODate;
}

export interface UserSettings {
  id: ID; // = user id
  autoplay_next: boolean;
  /** Stops automatic continuation after N episodes in a row (wellbeing guard). */
  autoplay_limit: number;
  default_speed: number;
  default_sleep_timer_minutes: number | null;
  new_episode_updates: boolean;
  private_listening_history: boolean;
  updated_at: ISODate;
}

/* ------------------------------------------------------------------ */
/* Agent production                                                    */
/* ------------------------------------------------------------------ */

export interface ProductionWorkflow {
  id: ID;
  series_id: ID;
  status: "active" | "paused";
  episodes_per_week: number;
  /** 0 = Sunday … 6 = Saturday (UTC). */
  release_days: number[];
  release_hour_utc: number;
  target_minutes: number;
  budget_cents: number;
  created_at: ISODate;
  updated_at: ISODate;
}

export interface EpisodeScript {
  id: ID;
  episode_id: ID;
  series_id: ID;
  /** Final approved script text (scenes joined with section breaks). */
  content: string;
  scenes: { index: number; title: string; text: string }[];
  word_count: number;
  version: number;
  provider: string;
  model: string;
  notes: string[];
  created_at: ISODate;
  updated_at: ISODate;
}

export type ArtworkKind = "poster" | "episode_cover" | "character_portrait" | "environment" | "promo" | "social";

export interface ArtworkAsset {
  id: ID;
  series_id: ID;
  episode_id: ID | null;
  character_id: ID | null;
  run_id: ID | null;
  kind: ArtworkKind;
  /** concept → selected (by the Art Director's review) → approved/rejected (by a human). */
  status: "concept" | "selected" | "approved" | "rejected";
  storage_key: string;
  url: string;
  mime_type: string;
  width: number | null;
  height: number | null;
  /** Delivery renditions, e.g. { "1600w": "/api/art/…?v=1600w", "titled": … }. */
  variants: Record<string, string>;
  provider: string;
  model: string;
  prompt: string;
  review: { strengths: string[]; issues: { issue: string; suggestion: string }[]; consistency: string } | null;
  created_at: ISODate;
}

export interface AudioQaIssue {
  check: "clipping" | "loudness" | "peaks" | "silence" | "transitions" | "missing_segments" | "pronunciation" | "unwanted_sfx" | "background_level" | "pacing";
  severity: "pass" | "warn" | "fail";
  message: string;
}

export interface AudioQaReport {
  peak_dbfs: number;
  rms_dbfs: number;
  integrated_loudness_approx_lufs: number;
  clipped_samples: number;
  longest_silence_seconds: number;
  duration_seconds: number;
  words_per_minute: number | null;
  issues: AudioQaIssue[];
  passed: boolean;
}
