import type * as T from "@/lib/types";
import type * as S from "@/lib/studio/types";

/** Every persisted table and the record type stored in it. */
export interface Tables {
  users: T.User;
  user_roles: T.UserRole;
  subscription_entitlements: T.SubscriptionEntitlement;
  creator_profiles: T.CreatorProfile;
  series: T.Series;
  seasons: T.Season;
  episodes: T.Episode;
  audio_assets: T.AudioAsset;
  soundscapes: T.Soundscape;
  publishing_schedules: T.PublishingSchedule;
  editorial_reviews: T.EditorialReview;
  content_reports: T.ContentReport;
  user_libraries: T.UserLibraryItem;
  series_follows: T.SeriesFollow;
  creator_follows: T.CreatorFollow;
  listening_progress: T.ListeningProgress;
  listening_events: T.ListeningEvent;
  notifications: T.Notification;
  user_settings: T.UserSettings;
  production_workflows: T.ProductionWorkflow;
  episode_scripts: T.EpisodeScript;
  artwork_assets: T.ArtworkAsset;
  series_projects: S.SeriesProject;
  series_bibles: S.BibleRecord;
  bible_versions: S.BibleVersion;
  characters: S.StudioCharacter;
  relationships: S.StudioRelationship;
  season_plans: S.SeasonPlan;
  workflow_runs: S.WorkflowRun;
  workflow_steps: S.WorkflowStep;
  workflow_events: S.WorkflowEvent;
  deliverables: S.Deliverable;
  usage_records: S.UsageRecord;
  agent_profiles: S.AgentProfile;
  writing_guidelines: S.WritingGuidelines;
  studio_settings: S.StudioSettings;
  voice_auditions: S.VoiceAudition;
  pronunciations: S.PronunciationEntry;
  scene_renders: S.SceneRender;
}

export type TableName = keyof Tables;

export const TABLE_NAMES: TableName[] = [
  "users",
  "user_roles",
  "subscription_entitlements",
  "creator_profiles",
  "series",
  "seasons",
  "episodes",
  "audio_assets",
  "soundscapes",
  "publishing_schedules",
  "editorial_reviews",
  "content_reports",
  "user_libraries",
  "series_follows",
  "creator_follows",
  "listening_progress",
  "listening_events",
  "notifications",
  "user_settings",
  "production_workflows",
  "episode_scripts",
  "artwork_assets",
  "series_projects",
  "series_bibles",
  "bible_versions",
  "characters",
  "relationships",
  "season_plans",
  "workflow_runs",
  "workflow_steps",
  "workflow_events",
  "deliverables",
  "usage_records",
  "agent_profiles",
  "writing_guidelines",
  "studio_settings",
  "voice_auditions",
  "pronunciations",
  "scene_renders",
];

/**
 * Equality filter. A value that is an array means "column IN (...)".
 */
export type Where<R> = { [K in keyof R]?: R[K] | R[K][] };

export interface ListOptions<R> {
  where?: Where<R>;
  orderBy?: { column: keyof R & string; ascending?: boolean };
  limit?: number;
}

/**
 * Storage-agnostic data access. Implemented by the local JSON store
 * (development / tests) and by the Supabase PostgreSQL adapter.
 *
 * Authorisation is NOT the job of this layer – services call the policy
 * module before reading or writing. Supabase RLS acts as defence in depth.
 */
export interface Database {
  readonly backend: "local" | "supabase";
  list<K extends TableName>(table: K, opts?: ListOptions<Tables[K]>): Promise<Tables[K][]>;
  get<K extends TableName>(table: K, id: string): Promise<Tables[K] | null>;
  findOne<K extends TableName>(table: K, where: Where<Tables[K]>): Promise<Tables[K] | null>;
  insert<K extends TableName>(table: K, row: Tables[K]): Promise<Tables[K]>;
  upsert<K extends TableName>(table: K, row: Tables[K]): Promise<Tables[K]>;
  update<K extends TableName>(table: K, id: string, patch: Partial<Tables[K]>): Promise<Tables[K]>;
  remove<K extends TableName>(table: K, id: string): Promise<void>;
  count<K extends TableName>(table: K, where?: Where<Tables[K]>): Promise<number>;
}

export function matches<R>(row: R, where: Where<R> | undefined): boolean {
  if (!where) return true;
  for (const key of Object.keys(where) as (keyof R)[]) {
    const expected = where[key];
    if (expected === undefined) continue;
    const actual = row[key];
    if (Array.isArray(expected)) {
      if (!(expected as unknown[]).includes(actual)) return false;
    } else if (actual !== expected) {
      return false;
    }
  }
  return true;
}
