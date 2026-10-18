import type { CategoryId, Rarity } from "./types";

export type LearnStyle = "quick" | "deep" | "mix";

export interface ProgressRecord {
  /** seconds */
  position: number;
  duration: number;
  completed: boolean;
  completedAt?: string;
  updatedAt: string;
  /** seconds actually listened (bounded by wall-clock between pings) */
  listened: number;
}

export interface InsightRecord {
  id: string;
  episodeId: string;
  text: string;
  savedAt: string;
}

export interface CardRecord {
  id: string;
  key: string;
  rarity: Rarity;
  unlockedAt: string;
}

export interface XpEvent {
  at: string;
  amount: number;
  reason: string;
}

export interface ChallengeRecord {
  correct: boolean;
  firstTry: boolean;
  attempts: number;
  answeredAt: string;
}

export interface Transaction {
  id: string;
  at: string;
  kind: "credit_purchase" | "credit_spend" | "subscription" | "subscription_cancel" | "bonus";
  credits: number;
  amountPence?: number;
  description: string;
  provider: "simulated" | "stripe" | "system";
}

export interface Subscription {
  status: "none" | "active" | "canceled";
  plan?: "plus_monthly";
  provider?: "simulated" | "stripe";
  renewsAt?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}

export interface UserRecord {
  id: string;
  handle: string;
  displayName: string;
  email?: string;
  avatarHue: number;
  createdAt: string;
  onboarded: boolean;
  interests: CategoryId[];
  learnStyle: LearnStyle;
  bio: string;
  isPublic: boolean;
  progress: Record<string, ProgressRecord>;
  following: string[];
  favourites: string[];
  insights: InsightRecord[];
  cards: CardRecord[];
  xp: number;
  xpLog: XpEvent[];
  streak: { current: number; longest: number; lastDay?: string };
  /** listening seconds per day (yyyy-mm-dd) — used for streaks, daily limits and Wrapped */
  days: Record<string, number>;
  /** listening seconds per hour of day, for Wrapped's personality */
  hours: number[];
  challenges: Record<string, ChallengeRecord>;
  exploredCategories: CategoryId[];
  completedSeries: string[];
  credits: number;
  unlocked: string[];
  transactions: Transaction[];
  subscription: Subscription;
  followedCollections: string[];
  aiSeries: string[];
  aiGenerationsThisMonth: { month: string; count: number };
}

export interface CollectionRecord {
  id: string;
  ownerId: string;
  ownerHandle: string;
  ownerName: string;
  title: string;
  description: string;
  seriesSlugs: string[];
  isPublic: boolean;
  editorial: boolean;
  followers: number;
  createdAt: string;
  updatedAt: string;
  palette: [string, string];
}

export type JobStatus = "queued" | "running" | "done" | "failed";
export type StepStatus = "pending" | "running" | "done" | "skipped" | "failed";

export interface AiStep {
  key: string;
  label: string;
  status: StepStatus;
  detail?: string;
}

export interface AiEpisode {
  id: string;
  n: number;
  title: string;
  description: string;
  segments: { kind: import("./types").SegmentKind; text: string }[];
  insights: string[];
  challenge?: import("./types").Challenge;
  /** path served by /api/ai/audio/<id> when TTS produced a file */
  audio?: { key: string; duration: number; lines: import("./types").TranscriptLine[] };
  /** when true the player uses the browser's speech synthesis (labelled as a dev fallback) */
  browserTts: boolean;
}

export interface AiSeriesRecord {
  id: string;
  ownerId: string;
  prompt: string;
  mode: "live" | "demo";
  title: string;
  tagline: string;
  description: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  category: CategoryId;
  art: import("./types").Art;
  followUps: string[];
  episodes: AiEpisode[];
  createdAt: string;
  model?: string;
  ttsProvider?: string;
}

export interface AiJobRecord {
  id: string;
  ownerId: string;
  prompt: string;
  mode: "live" | "demo";
  status: JobStatus;
  steps: AiStep[];
  seriesId?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export function newUser(id: string, handle: string): UserRecord {
  return {
    id,
    handle,
    displayName: "Curious Mind",
    avatarHue: Math.floor(Math.random() * 360),
    createdAt: new Date().toISOString(),
    onboarded: false,
    interests: [],
    learnStyle: "mix",
    bio: "",
    isPublic: true,
    progress: {},
    following: [],
    favourites: [],
    insights: [],
    cards: [],
    xp: 0,
    xpLog: [],
    streak: { current: 0, longest: 0 },
    days: {},
    hours: Array(24).fill(0),
    challenges: {},
    exploredCategories: [],
    completedSeries: [],
    credits: 5,
    unlocked: [],
    transactions: [
      { id: "welcome", at: new Date().toISOString(), kind: "bonus", credits: 5, description: "Welcome credits", provider: "system" },
    ],
    subscription: { status: "none" },
    followedCollections: [],
    aiSeries: [],
    aiGenerationsThisMonth: { month: "", count: 0 },
  };
}
