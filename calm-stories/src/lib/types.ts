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

export type Role = "creator" | "admin" | "editor";

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

export interface ArtworkAsset {
  id: ID;
  owner_id: ID;
  series_id: ID | null;
  episode_id: ID | null;
  character_id: ID | null;
  kind: "cover" | "episode" | "portrait" | "banner";
  source: "procedural" | "upload" | "generated";
  spec: ArtworkSpec;
  prompt: string | null;
  provider: string | null;
  simulated: boolean;
  created_at: ISODate;
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
  narrator_voice_id: ID | null;
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

export type EpisodeStatus =
  | "planned"
  | "draft"
  | "script_ready"
  | "audio_ready"
  | "in_review"
  | "changes_requested"
  | "approved"
  | "published"
  | "rejected";

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
  /** Free preview for visitors without Calm Premium. */
  is_preview: boolean;
  created_at: ISODate;
  updated_at: ISODate;
}

/* ------------------------------------------------------------------ */
/* Scripts                                                             */
/* ------------------------------------------------------------------ */

export interface ScriptSettings {
  duration_minutes: number;
  mood: "dreamy" | "cosy" | "wistful" | "wonder" | "tender";
  perspective: "third" | "first" | "second";
  style: "lyrical" | "storybook" | "literary" | "minimal";
  dialogue: "none" | "light" | "moderate";
  romance: "none" | "gentle" | "warm";
  pacing: "very-slow" | "slow" | "gentle";
}

export const DEFAULT_SCRIPT_SETTINGS: ScriptSettings = {
  duration_minutes: 30,
  mood: "dreamy",
  perspective: "third",
  style: "lyrical",
  dialogue: "light",
  romance: "gentle",
  pacing: "slow",
};

export interface Script {
  id: ID;
  episode_id: ID;
  series_id: ID;
  current_version_id: ID | null;
  settings: ScriptSettings;
  created_at: ISODate;
  updated_at: ISODate;
}

export interface ScriptVersion {
  id: ID;
  script_id: ID;
  version: number;
  content: string;
  word_count: number;
  source: "ai" | "human" | "ai_rewrite" | "agent";
  provider: string | null;
  model: string | null;
  simulated: boolean;
  note: string;
  created_by: ID | null;
  created_at: ISODate;
}

/* ------------------------------------------------------------------ */
/* Story Bible / memory                                                */
/* ------------------------------------------------------------------ */

export interface StoryBible {
  id: ID;
  series_id: ID;
  world_name: string;
  geography: string;
  culture: string;
  history: string;
  atmosphere: string;
  rules: string[];
  themes: string[];
  established_facts: string[];
  unresolved_threads: string[];
  creator_preferences: string[];
  updated_at: ISODate;
}

export interface Character {
  id: ID;
  series_id: ID;
  name: string;
  age_range: string;
  personality: string;
  backstory: string;
  motivations: string;
  narrative_role: string;
  voice_profile: string;
  arc: string;
  portrait: ArtworkSpec;
  created_at: ISODate;
  updated_at: ISODate;
}

export interface CharacterRelationship {
  id: ID;
  series_id: ID;
  character_a_id: ID;
  character_b_id: ID;
  kind: string;
  description: string;
  created_at: ISODate;
}

export interface Location {
  id: ID;
  series_id: ID;
  name: string;
  description: string;
  recurring: boolean;
  created_at: ISODate;
}

export interface NarrativeEvent {
  id: ID;
  series_id: ID;
  episode_id: ID | null;
  kind: "event" | "fact" | "thread_opened" | "thread_resolved";
  summary: string;
  character_ids: ID[];
  created_at: ISODate;
}

/* ------------------------------------------------------------------ */
/* AI conversations, tool calls, jobs                                  */
/* ------------------------------------------------------------------ */

export interface ConversationMessage {
  id: ID;
  role: "user" | "assistant" | "tool";
  content: string;
  /** Structured UI cards (concept proposals, tool results, confirmations). */
  cards?: AssistantCard[];
  tool_call_ids?: ID[];
  created_at: ISODate;
}

export type AssistantCard =
  | { type: "concept"; proposal: ConceptProposal }
  | { type: "tool_result"; tool: string; summary: string; tool_call_id: ID }
  | { type: "confirmation"; tool: string; summary: string; tool_call_id: ID; reason: string }
  | { type: "continuity"; report: ContinuityReport }
  | { type: "direction"; proposal: DirectionProposal }
  | { type: "error"; message: string }
  | { type: "suggestions"; items: string[] };

export interface AiConversation {
  id: ID;
  user_id: ID;
  series_id: ID | null;
  messages: ConversationMessage[];
  created_at: ISODate;
  updated_at: ISODate;
}

export interface AiToolCall {
  id: ID;
  conversation_id: ID | null;
  user_id: ID;
  series_id: ID | null;
  tool: string;
  input: unknown;
  output: unknown;
  status: "pending_confirmation" | "executed" | "failed" | "cancelled";
  confirmation_reason: string | null;
  error: string | null;
  created_at: ISODate;
  executed_at: ISODate | null;
}

export type JobStatus = "queued" | "running" | "paused" | "succeeded" | "failed" | "cancelled";
export type StepStatus = "pending" | "running" | "succeeded" | "failed" | "skipped";

export type AgentKind =
  | "showrunner"
  | "writer"
  | "continuity"
  | "sleep_editor"
  | "voice_director"
  | "audio_producer"
  | "publishing";

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
}

export interface JobLog {
  at: ISODate;
  level: "info" | "warn" | "error";
  step: string | null;
  message: string;
}

export interface AiProductionJob {
  id: ID;
  kind: "episode_production" | "narration" | "mix" | "section_narration";
  series_id: ID | null;
  episode_id: ID | null;
  workflow_id: ID | null;
  status: JobStatus;
  current_step: string | null;
  steps: JobStepState[];
  logs: JobLog[];
  payload: Record<string, unknown>;
  attempts: number;
  max_attempts: number;
  idempotency_key: string | null;
  cost_cents: number;
  budget_cents: number | null;
  error: string | null;
  simulated: boolean;
  requested_by: ID | null;
  created_at: ISODate;
  started_at: ISODate | null;
  finished_at: ISODate | null;
  updated_at: ISODate;
}

export interface AgentConfiguration {
  id: ID;
  agent: AgentKind;
  name: string;
  description: string;
  provider: "auto" | "anthropic" | "openai" | "mock";
  model: string;
  prompt_template: string;
  temperature: number;
  max_cost_cents_per_job: number;
  retry_limit: number;
  enabled: boolean;
  updated_at: ISODate;
}

export interface ProductionWorkflow {
  id: ID;
  series_id: ID;
  episodes_per_week: number;
  target_duration_minutes: number;
  writing_provider: "auto" | "anthropic" | "openai" | "mock";
  writing_model: string;
  narrator_voice_id: ID | null;
  soundscape_id: ID | null;
  /** 0 = Sunday … 6 = Saturday */
  release_days: number[];
  release_hour_utc: number;
  max_budget_cents: number;
  /** Always true for public release – kept as a field for audit trails. */
  approval_required: true;
  status: "active" | "paused";
  created_at: ISODate;
  updated_at: ISODate;
}

/* ------------------------------------------------------------------ */
/* Audio                                                               */
/* ------------------------------------------------------------------ */

export interface AudioQaIssue {
  check:
    | "clipping"
    | "loudness"
    | "peaks"
    | "silence"
    | "transitions"
    | "missing_segments"
    | "pronunciation"
    | "unwanted_sfx"
    | "background_level"
    | "pacing";
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

export interface AudioAsset {
  id: ID;
  owner_id: ID | null;
  series_id: ID | null;
  episode_id: ID | null;
  kind: "narration_section" | "narration" | "ambience" | "mix" | "sample" | "voice_preview";
  section_index: number | null;
  storage_key: string;
  url: string;
  mime_type: string;
  duration_seconds: number;
  provider: string;
  simulated: boolean;
  qa: AudioQaReport | null;
  meta: Record<string, unknown>;
  created_at: ISODate;
}

export interface VoiceProfile {
  id: ID;
  name: string;
  description: string;
  provider: "elevenlabs" | "openai" | "mock";
  provider_voice_id: string;
  accent: string;
  tone: string;
  /** Only voices with documented consent / licence are selectable. */
  approved: boolean;
  consent_record: string;
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

export interface ProductionSettings {
  voice_id: ID | null;
  speed: number; // 0.7 – 1.1
  warmth: number; // 0 – 1
  stability: number; // 0 – 1
  soundscape_id: ID | null;
  extra_layers: SoundLayer[];
  ambience_volume: number; // 0 – 1
  music_volume: number; // 0 – 1
}

export const DEFAULT_PRODUCTION_SETTINGS: ProductionSettings = {
  voice_id: null,
  speed: 0.9,
  warmth: 0.7,
  stability: 0.75,
  soundscape_id: null,
  extra_layers: [],
  ambience_volume: 0.35,
  music_volume: 0.15,
};

export interface EpisodeProduction {
  id: ID; // = episode id
  episode_id: ID;
  series_id: ID;
  settings: ProductionSettings;
  section_asset_ids: (ID | null)[];
  mix_asset_id: ID | null;
  updated_at: ISODate;
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
  name: "content_safety" | "rights" | "sleep_suitability" | "continuity" | "audio_quality" | "metadata" | "ai_disclosure";
  status: "pass" | "warn" | "fail" | "not_run";
  detail: string;
}

export interface EditorialReview {
  id: ID;
  episode_id: ID;
  series_id: ID;
  submitted_by: ID;
  source: "creator" | "production_engine";
  status: "pending" | "approved" | "rejected" | "changes_requested";
  checks: ReviewCheck[];
  requested_release_at: ISODate | null;
  reviewer_id: ID | null;
  notes: string;
  created_at: ISODate;
  decided_at: ISODate | null;
}

export interface RightsDeclaration {
  id: ID;
  series_id: ID;
  user_id: ID;
  original_work: boolean;
  ai_assisted: boolean;
  third_party_material: string;
  voice_consent: boolean;
  accepted_terms_version: string;
  created_at: ISODate;
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

export interface ProductionCost {
  id: ID;
  job_id: ID | null;
  series_id: ID | null;
  episode_id: ID | null;
  category: "llm" | "tts" | "image" | "audio_processing";
  provider: string;
  model: string;
  units: number;
  unit_label: string;
  cost_cents: number;
  simulated: boolean;
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

export interface AiSettings {
  id: "global";
  writing_provider: "auto" | "anthropic" | "openai" | "mock";
  writing_model_anthropic: string;
  writing_model_openai: string;
  voice_provider: "auto" | "elevenlabs" | "mock";
  image_provider: "auto" | "openai" | "procedural";
  sound_provider: "library" | "generative";
  task_models: Record<string, string>;
  prompt_templates: Record<string, string>;
  monthly_cost_limit_cents: number;
  per_job_cost_limit_cents: number;
  retry_limit: number;
  /** Creator content always needs editorial approval; this toggles extra gates. */
  approval_policy: "all_content" | "community_and_engine";
  max_concurrent_jobs: number;
  updated_at: ISODate;
}

/* ------------------------------------------------------------------ */
/* AI artefacts                                                         */
/* ------------------------------------------------------------------ */

export interface ConceptProposal {
  title: string;
  tagline: string;
  synopsis: string;
  genre: Genre;
  tags: string[];
  narrative_arc: string;
  characters: { name: string; role: string; sketch: string }[];
  scene: SceneKind;
  follow_up_questions: string[];
  original_idea: string;
}

export interface DirectionProposal {
  episode_title: string;
  summary: string;
  beats: string[];
  threads_advanced: string[];
}

export interface ContinuityIssue {
  severity: "info" | "warn" | "conflict";
  message: string;
  evidence: string;
}

export interface ContinuityReport {
  checked_at: ISODate;
  issues: ContinuityIssue[];
  summary: string;
  simulated: boolean;
}

export interface GenerationMeta {
  provider: string;
  model: string;
  simulated: boolean;
  cost_cents: number;
  input_tokens?: number;
  output_tokens?: number;
}
