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

export type AgentKind = "showrunner" | "writer" | "sleep_editor" | "narrator" | "sound_designer" | "mixer" | "art_director" | "publisher";

export const AGENTS: { kind: AgentKind; name: string; role: string; provider: string }[] = [
  { kind: "showrunner", name: "Showrunner", role: "Reads the story so far and plans the next episode.", provider: "Claude" },
  { kind: "writer", name: "Writer", role: "Writes the full Sleep Story script.", provider: "Claude" },
  { kind: "sleep_editor", name: "Sleep Editor", role: "Checks length, pacing and calm; softens anything jarring.", provider: "Rules + Claude" },
  { kind: "narrator", name: "Narrator", role: "Voices the script section by section.", provider: "ElevenLabs" },
  { kind: "sound_designer", name: "Sound Designer", role: "Creates a looping ambience bed for the episode.", provider: "ElevenLabs Sound Effects" },
  { kind: "mixer", name: "Mixer", role: "Mixes voice and ambience, masters and runs audio QA.", provider: "In-house + FFmpeg" },
  { kind: "art_director", name: "Art Director", role: "Paints the episode artwork (and series cover if missing).", provider: "Nano Banana (Gemini)" },
  { kind: "publisher", name: "Publisher", role: "Files the episode in the review queue with checks.", provider: "Calm Stories" },
];

export interface ProductionWorkflow {
  id: ID;
  series_id: ID;
  status: "active" | "paused";
  episodes_per_week: number;
  /** 0 = Sunday … 6 = Saturday (UTC). */
  release_days: number[];
  release_hour_utc: number;
  target_minutes: number;
  /** ElevenLabs voice ID; falls back to the global default. */
  voice_id: string | null;
  art_style: string;
  /** Direction for the showrunner: tone, recurring characters, where the story is heading. */
  story_notes: string;
  budget_cents: number;
  created_at: ISODate;
  updated_at: ISODate;
}

export type StepStatus = "pending" | "running" | "succeeded" | "failed" | "skipped";

export interface JobStepState {
  id: string;
  label: string;
  agent: AgentKind;
  status: StepStatus;
  attempts: number;
  started_at: ISODate | null;
  finished_at: ISODate | null;
  output_preview: string | null;
  error: string | null;
  cost_cents: number;
  simulated: boolean;
}

export interface JobLog {
  at: ISODate;
  level: "info" | "warn" | "error";
  step: string | null;
  message: string;
}

export interface ProductionJob {
  id: ID;
  series_id: ID;
  episode_id: ID | null;
  workflow_id: ID | null;
  status: "queued" | "running" | "paused" | "succeeded" | "failed" | "cancelled";
  current_step: string | null;
  steps: JobStepState[];
  logs: JobLog[];
  /** Inputs plus persisted scratch state shared between steps. */
  payload: Record<string, unknown>;
  attempts: number;
  max_attempts: number;
  idempotency_key: string | null;
  cost_cents: number;
  budget_cents: number | null;
  error: string | null;
  requested_by: ID | null;
  created_at: ISODate;
  started_at: ISODate | null;
  finished_at: ISODate | null;
  updated_at: ISODate;
}

export interface EpisodeScript {
  id: ID;
  episode_id: ID;
  series_id: ID;
  content: string;
  word_count: number;
  provider: string;
  model: string;
  simulated: boolean;
  notes: string[];
  created_at: ISODate;
  updated_at: ISODate;
}

export interface ArtworkAsset {
  id: ID;
  series_id: ID;
  episode_id: ID | null;
  kind: "cover" | "episode";
  storage_key: string;
  url: string;
  mime_type: string;
  provider: string;
  model: string;
  prompt: string;
  created_at: ISODate;
}

export interface AgentSettings {
  id: "global";
  writer_model: string;
  tts_model: string;
  default_voice_id: string;
  sfx_model: string;
  image_model: string;
  per_job_budget_cents: number;
  max_concurrent_jobs: number;
  updated_at: ISODate;
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
