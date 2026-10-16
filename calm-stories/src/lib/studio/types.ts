/**
 * Sleep Stories Studio – persisted records for the AI production company.
 * snake_case = Postgres columns (see supabase/migrations).
 */
type ID = string;
type ISODate = string;

export type AgentKey =
  | "network_executive"
  | "program_director"
  | "creative_director"
  | "romance_architect"
  | "worldbuilder"
  | "character_psychologist"
  | "series_architect"
  | "lead_writer"
  | "dialogue_editor"
  | "sleep_editor"
  | "continuity_editor"
  | "story_critic"
  | "art_director"
  | "audio_director"
  | "audio_producer"
  | "quality_controller";

/** What an agent is visibly doing in the AI Team room – always derived from real workflow state. */
export type AgentActivity = "sleeping" | "reading" | "typing" | "thinking" | "handing_off" | "celebrating" | "asking_for_help";

/* ------------------------------------------------------------------ */
/* Series development                                                  */
/* ------------------------------------------------------------------ */

export interface SeriesProject {
  id: ID;
  brief: string;
  status: "developing" | "awaiting_greenlight" | "greenlit" | "rejected" | "failed";
  series_id: ID | null;
  run_id: ID | null;
  created_by: ID;
  decision_by: ID | null;
  decision_notes: string;
  decided_at: ISODate | null;
  created_at: ISODate;
  updated_at: ISODate;
}

export interface SeriesBible {
  identity: {
    title: string;
    tagline: string;
    logline: string;
    premise: string;
    tone: string;
    themes: string[];
    narrative_voice: string;
    point_of_view: string;
    tense: string;
    style_rules: string[];
    sensory_palette: string[];
    romance_heat: string;
    content_boundaries: string[];
    episode_shape: string;
    target_minutes: number;
  } | null;
  world: {
    name: string;
    overview: string;
    geography: { name: string; description: string }[];
    cultures: { name: string; customs: string; values: string }[];
    magic: { principles: string; costs: string; limits: string };
    history: string[];
    atmosphere: string;
    recurring_locations: { name: string; description: string; sensory_details: string[] }[];
    rules: string[];
  } | null;
  timeline: { episode: string | null; summary: string }[];
  established_facts: string[];
  open_threads: string[];
  resolved_threads: string[];
  visual_identity: {
    palette: { name: string; hex: string; usage: string }[];
    lighting: string;
    mood: string;
    composition_rules: string[];
    typography: { title_direction: string; pairing: string; treatment: string };
    poster_brief: string;
  } | null;
}

export interface BibleRecord {
  id: ID; // = series_id
  series_id: ID;
  version: number;
  data: SeriesBible;
  updated_at: ISODate;
}

export interface BibleVersion {
  id: ID;
  series_id: ID;
  version: number;
  data: SeriesBible;
  reason: string;
  agent: AgentKey | "human";
  run_id: ID | null;
  created_at: ISODate;
}

export interface StudioCharacter {
  id: ID;
  series_id: ID;
  name: string;
  role: "lead" | "love_interest" | "supporting" | "narrator";
  age: string;
  pronouns: string;
  appearance: string;
  /** Persistent, art-ready description reused in every image prompt. */
  visual_description: string;
  personality: string;
  desires: string;
  fears: string;
  flaws: string;
  history: string;
  motivations: string;
  speech_style: string;
  arc: string;
  voice_id: string | null;
  voice_name: string | null;
  portrait_asset_id: ID | null;
  created_at: ISODate;
  updated_at: ISODate;
}

export interface StudioRelationship {
  id: ID;
  series_id: ID;
  a_name: string;
  b_name: string;
  kind: string;
  dynamic: string;
  chemistry: string;
  obstacles: string[];
  milestones: { when: string; beat: string }[];
  pacing: string;
  current_state: string;
  updated_at: ISODate;
}

export interface SeasonPlan {
  id: ID;
  series_id: ID;
  season_number: number;
  title: string;
  arc: string;
  episodes: {
    number: number;
    title: string;
    premise: string;
    romance_beat: string;
    character_focus: string;
    threads: string[];
    sleep_landing: string;
  }[];
  updated_at: ISODate;
}

/* ------------------------------------------------------------------ */
/* Workflows                                                           */
/* ------------------------------------------------------------------ */

export type StepStatus = "pending" | "running" | "waiting" | "succeeded" | "failed" | "skipped" | "blocked" | "awaiting_approval" | "cancelled";

export interface WorkflowStep {
  id: ID;
  run_id: ID;
  /** Unique within the run; dependencies refer to keys. */
  key: string;
  /** Handler key in the step registry. */
  type: string;
  agent: AgentKey;
  label: string;
  activity: "thinking" | "typing" | "reading";
  deps: string[];
  params: Record<string, unknown>;
  status: StepStatus;
  attempts: number;
  /** Earliest time to (re)try – rate limits and backoff. */
  not_before: ISODate | null;
  started_at: ISODate | null;
  finished_at: ISODate | null;
  summary: string | null;
  error: string | null;
  /** Credential or decision this step is waiting on. */
  needs: string | null;
  deliverable_ids: ID[];
  cost_cents: number;
  created_at: ISODate;
  updated_at: ISODate;
}

export interface WorkflowRun {
  id: ID;
  kind: "series_development" | "episode_production";
  status: "running" | "paused" | "blocked" | "awaiting_approval" | "succeeded" | "failed" | "cancelled";
  series_id: ID | null;
  project_id: ID | null;
  episode_id: ID | null;
  title: string;
  params: Record<string, unknown>;
  cost_cents: number;
  budget_cents: number;
  idempotency_key: string | null;
  created_by: ID | null;
  error: string | null;
  created_at: ISODate;
  updated_at: ISODate;
  finished_at: ISODate | null;
}

/** Append-only activity: logs, handoffs between agents, approvals. Powers job history and the AI Team animations. */
export interface WorkflowEvent {
  id: ID;
  run_id: ID;
  step_key: string | null;
  agent: AgentKey | null;
  /** For handoffs: who receives the work. */
  to_agent: AgentKey | null;
  kind: "log" | "handoff" | "approval" | "completed" | "blocked";
  level: "info" | "warn" | "error";
  message: string;
  created_at: ISODate;
}

export interface Deliverable {
  id: ID;
  run_id: ID | null;
  step_id: string | null;
  series_id: ID | null;
  episode_id: ID | null;
  agent: AgentKey;
  /** Schema name, e.g. "concepts", "scene_plan", "script", "review". */
  kind: string;
  /** Logical slot that versions accumulate under, e.g. "script" or "review:romance". */
  key: string;
  version: number;
  title: string;
  data: unknown;
  /** Short summary of the agent's reasoning, shown when you click the agent. */
  reasoning: string;
  model: string;
  status: "current" | "superseded" | "approved" | "rejected";
  /** Human edits to a deliverable create a new version with agent "network_executive". */
  edited_by: ID | null;
  created_at: ISODate;
}

export interface UsageRecord {
  id: ID;
  run_id: ID | null;
  step_id: string | null;
  series_id: ID | null;
  agent: AgentKey;
  provider: "anthropic" | "gemini" | "elevenlabs";
  operation: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  characters: number;
  seconds: number;
  images: number;
  cost_cents: number;
  created_at: ISODate;
}

export interface AgentProfile {
  id: AgentKey;
  instructions: string;
  model: string;
  effort: "low" | "medium" | "high" | "xhigh";
  enabled: boolean;
  updated_at: ISODate;
}

export interface WritingGuidelines {
  id: ID; // "global" or a series id
  content: string;
  benchmarks: { title: string; excerpt: string; why: string }[];
  updated_at: ISODate;
}

export interface StudioSettings {
  id: "global";
  default_model: string;
  image_model: string;
  /** Optional Gemini imageConfig.imageSize ("1K" | "2K" | "4K") for models that support it. */
  image_size: "" | "1K" | "2K" | "4K";
  /** fal.ai endpoint for Nano Banana when using FAL_KEY instead of a Gemini key. */
  fal_image_endpoint: string;
  tts_model: string;
  sfx_model: string;
  music_model: string;
  max_revision_rounds: number;
  max_parallel_steps: number;
  max_concurrent_runs: number;
  default_episode_budget_cents: number;
  default_series_budget_cents: number;
  web_research: boolean;
  /** Only these roles may press "Publish". Never the agents. */
  publish_roles: ("admin" | "editor")[];
  /** Autopilot: the Program Director invents and develops new series without a brief. */
  autopilot: boolean;
  /** Keep this many studio series in development / awaiting greenlight at once. */
  autopilot_pipeline: number;
  /** How many new series the Program Director commissions per day. */
  autopilot_series_per_day: number;
  /** Episodes per week scheduled automatically for every greenlit series (0 = don't schedule). */
  autopilot_episodes_per_week: number;
  updated_at: ISODate;
}

/* ------------------------------------------------------------------ */
/* Audio                                                               */
/* ------------------------------------------------------------------ */

export interface VoiceAudition {
  id: ID;
  series_id: ID;
  character_id: ID | null; // null = narrator
  voice_id: string;
  voice_name: string;
  rationale: string;
  sample_key: string | null;
  selected: boolean;
  created_at: ISODate;
}

export interface PronunciationEntry {
  id: ID;
  series_id: ID;
  term: string;
  alias: string;
  notes: string;
  created_at: ISODate;
}

export interface SceneRender {
  id: ID;
  episode_id: ID;
  series_id: ID;
  scene_index: number;
  version: number;
  status: "current" | "superseded";
  narration_key: string | null;
  ambience_keys: string[];
  music_key: string | null;
  stem_key: string | null;
  duration_seconds: number;
  plan: unknown;
  qa: unknown;
  created_at: ISODate;
}
