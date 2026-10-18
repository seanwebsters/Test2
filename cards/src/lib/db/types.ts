import type { GenreId, Rarity, Universe, Variant } from "@/lib/content/types";
import type { EconomyConfig } from "@/lib/economy/config";
import type { PackTypeId } from "@/lib/economy/packs";

export type Role = "user" | "admin";

export interface NotificationPrefs {
  dailyReady: boolean;
  newEpisodes: boolean;
  newCards: boolean;
  completions: boolean;
  seasonLaunches: boolean;
  events: boolean;
  /** Future channels. Not delivered until a provider is configured. */
  email: boolean;
  push: boolean;
}

export interface UserSettings {
  sound: boolean;
  haptics: boolean;
  reducedMotion: boolean;
  notifications: NotificationPrefs;
}

export interface User {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  avatarSeed: number;
  role: Role;
  isGuest: boolean;
  /** Seeded demo collector (excluded from real analytics by default). */
  isDemo?: boolean;
  email?: string;
  passwordHash?: string;
  createdAt: string;
  lastSeenAt: string;
  onboardedAt?: string;
  genres: GenreId[];
  settings: UserSettings;
  showcase: string[];
  collectorPassUntil?: string;
  starterClaimed: boolean;
}

export interface Wallet {
  shards: number;
  stardust: number;
  /** Pack tokens earned from milestones, by pack type. */
  tokens: Partial<Record<PackTypeId, number>>;
}

export interface OwnedCard {
  count: number;
  variants: Partial<Record<Variant, number>>;
  firstAt: string;
  lastAt: string;
}

export interface PackOpeningItem {
  slot: number;
  cardId: string;
  rarity: Rarity;
  variant: Variant;
  isNew: boolean;
  /** Count owned after this item was added. */
  ownedAfter: number;
  dust: number;
}

export interface PackOpening {
  id: string;
  userId: string;
  packType: PackTypeId;
  universeId: string;
  episodeId?: string;
  idempotencyKey: string;
  createdAt: string;
  items: PackOpeningItem[];
  cost: { shards: number; token?: PackTypeId };
  /** Snapshot of the odds config used (for audit). */
  oddsVersion: string;
}

export interface DailyClaim {
  userId: string;
  /** UTC date YYYY-MM-DD */
  day: string;
  kind: "daily" | "pass-daily";
  openingId: string;
  /** Position on the seven-day track (0–6) for "daily" claims. */
  trackIndex: number;
  at: string;
}

export interface StoryProgress {
  userId: string;
  episodeId: string;
  unlockedAt?: string;
  unlockMethod?: "free" | "collect" | "shards" | "pass";
  completedAt?: string;
  rewardPackOpeningId?: string;
}

export interface Notification {
  id: string;
  userId: string;
  kind: "daily-ready" | "new-episode" | "new-cards" | "completion" | "season-launch" | "event" | "achievement" | "social" | "system";
  title: string;
  body: string;
  href?: string;
  createdAt: string;
  readAt?: string;
  /** Dedupe key: one notification per user per key. */
  key: string;
}

export interface AnalyticsEvent {
  id: string;
  userId?: string;
  name: string;
  universeId?: string;
  props?: Record<string, string | number | boolean>;
  at: string;
}

export interface EconomyTransaction {
  id: string;
  userId: string;
  currency: "shards" | "stardust" | "token";
  amount: number;
  reason: string;
  ref?: string;
  at: string;
}

export interface Achievement {
  userId: string;
  key: string;
  at: string;
}

export type JobStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";
export type ApprovalState = "pending" | "approved" | "rejected";

export interface GenerationStepRun {
  version: number;
  status: JobStatus;
  startedAt?: string;
  finishedAt?: string;
  attempts: number;
  error?: string;
  output?: unknown;
  provider: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  costUsd: number;
  approval: ApprovalState;
  notes?: string;
}

export interface GenerationJob {
  id: string;
  brief: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  status: "draft" | "generating" | "review" | "approved" | "published" | "failed";
  /** stepKey -> runs (version history) */
  steps: Record<string, GenerationStepRun[]>;
  universeId?: string;
  totalCostUsd: number;
}

export interface AuditEntry {
  id: string;
  actorId: string;
  action: string;
  target?: string;
  detail?: string;
  at: string;
}

export interface ContentOverride {
  status?: Universe["status"];
  featured?: boolean;
  /** episodeId -> release offset days (relative to platform epoch) */
  episodeRelease?: Record<string, number>;
  /** cardId -> partial patch */
  cards?: Record<string, { rarity?: Rarity; imageUrl?: string; name?: string; description?: string }>;
  heroImageUrl?: string;
}

export interface OpportunityWeights {
  growth: number;
  retention: number;
  depth: number;
  story: number;
  follows: number;
  sharing: number;
}

export interface DbState {
  version: 1;
  /** Platform epoch: release offsets are relative to this instant. */
  seededAt: string;
  users: Record<string, User>;
  wallets: Record<string, Wallet>;
  inventory: Record<string, Record<string, OwnedCard>>;
  openings: PackOpening[];
  dailyClaims: DailyClaim[];
  follows: { userId: string; universeId: string; at: string }[];
  userFollows: { followerId: string; followeeId: string; at: string }[];
  favourites: { userId: string; cardId: string; at: string }[];
  storyProgress: StoryProgress[];
  notifications: Notification[];
  achievements: Achievement[];
  events: AnalyticsEvent[];
  transactions: EconomyTransaction[];
  searches: { userId?: string; q: string; at: string }[];
  /** Universes created in NEXARA Studio */
  universes: Universe[];
  overrides: Record<string, ContentOverride>;
  jobs: GenerationJob[];
  economy: EconomyConfig;
  opportunityWeights: OpportunityWeights;
  audit: AuditEntry[];
}
