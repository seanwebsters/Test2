import type * as T from "@/lib/types";

/** Every persisted table and the record type stored in it. */
export interface Tables {
  users: T.User;
  user_roles: T.UserRole;
  subscription_entitlements: T.SubscriptionEntitlement;
  creator_profiles: T.CreatorProfile;
  series: T.Series;
  seasons: T.Season;
  episodes: T.Episode;
  scripts: T.Script;
  script_versions: T.ScriptVersion;
  story_bibles: T.StoryBible;
  characters: T.Character;
  character_relationships: T.CharacterRelationship;
  locations: T.Location;
  narrative_events: T.NarrativeEvent;
  ai_conversations: T.AiConversation;
  ai_tool_calls: T.AiToolCall;
  ai_production_jobs: T.AiProductionJob;
  agent_configurations: T.AgentConfiguration;
  production_workflows: T.ProductionWorkflow;
  audio_assets: T.AudioAsset;
  voice_profiles: T.VoiceProfile;
  soundscapes: T.Soundscape;
  episode_productions: T.EpisodeProduction;
  artwork_assets: T.ArtworkAsset;
  publishing_schedules: T.PublishingSchedule;
  editorial_reviews: T.EditorialReview;
  rights_declarations: T.RightsDeclaration;
  content_reports: T.ContentReport;
  user_libraries: T.UserLibraryItem;
  series_follows: T.SeriesFollow;
  creator_follows: T.CreatorFollow;
  listening_progress: T.ListeningProgress;
  listening_events: T.ListeningEvent;
  production_costs: T.ProductionCost;
  notifications: T.Notification;
  user_settings: T.UserSettings;
  ai_settings: T.AiSettings;
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
  "scripts",
  "script_versions",
  "story_bibles",
  "characters",
  "character_relationships",
  "locations",
  "narrative_events",
  "ai_conversations",
  "ai_tool_calls",
  "ai_production_jobs",
  "agent_configurations",
  "production_workflows",
  "audio_assets",
  "voice_profiles",
  "soundscapes",
  "episode_productions",
  "artwork_assets",
  "publishing_schedules",
  "editorial_reviews",
  "rights_declarations",
  "content_reports",
  "user_libraries",
  "series_follows",
  "creator_follows",
  "listening_progress",
  "listening_events",
  "production_costs",
  "notifications",
  "user_settings",
  "ai_settings",
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
