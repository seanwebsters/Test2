import type { Asset, ConceptBatch, Game, GameVersion, Job, PlayEvent, Settings, UsageRecord } from "../types";

/** Persistence contract. Both the local JSON store and Supabase implement it. */
export interface Repo {
  readonly kind: "local" | "supabase";
  listGames(): Promise<Game[]>;
  getGame(id: string): Promise<Game | null>;
  putGame(game: Game): Promise<void>;
  deleteGame(id: string): Promise<void>;

  listVersions(gameId: string): Promise<GameVersion[]>;
  getVersion(gameId: string, n: number): Promise<GameVersion | null>;
  putVersion(v: GameVersion): Promise<void>;

  getThumbnail(gameId: string): Promise<Buffer | null>;
  putThumbnail(gameId: string, png: Buffer): Promise<void>;

  listJobs(limit?: number): Promise<Job[]>;
  getJob(id: string): Promise<Job | null>;
  putJob(job: Job): Promise<void>;

  addEvents(events: PlayEvent[]): Promise<void>;
  listEvents(gameId?: string): Promise<PlayEvent[]>;

  addUsage(u: UsageRecord): Promise<void>;
  listUsage(): Promise<UsageRecord[]>;

  listAssets(): Promise<Asset[]>;
  putAsset(a: Asset): Promise<void>;
  deleteAsset(id: string): Promise<void>;

  listConceptBatches(): Promise<ConceptBatch[]>;
  putConceptBatch(b: ConceptBatch): Promise<void>;

  getSettings(): Promise<Settings | null>;
  putSettings(s: Settings): Promise<void>;
}
