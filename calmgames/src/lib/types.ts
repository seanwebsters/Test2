import type { GameBuild } from "./engine/schemas";
import type { IdeationOutput, DesignOutput, ArtOutput, ReviewOutput, LabConcept } from "./agents/schemas";

export const CATEGORIES = ["Puzzle", "Gardening", "Breathing", "Colouring", "Exploration", "Sound", "Memory", "Creativity"] as const;
export type Category = (typeof CATEGORIES)[number];

export const AGENT_IDS = ["ideation", "design", "art", "development", "qa", "insights"] as const;
export type AgentId = (typeof AGENT_IDS)[number];

export type GameStatus = "concept" | "generating" | "ready" | "failed";

export interface Game {
  id: string;
  name: string;
  description: string;
  category: Category;
  prompt: string;
  status: GameStatus;
  origin: "seed" | "ai";
  currentVersion: number;
  /** Number of the newest version; versions are 1-based. 0 for concepts. */
  latestVersion: number;
  activeJobId?: string;
  hasThumbnail?: boolean;
  /** Short pitch for concepts that have no playable build yet. */
  concept?: { mechanic: string; emotionalGoal: string; visualDirection: string };
  createdAt: string;
  updatedAt: string;
}

export interface Asset {
  id: string;
  name: string;
  kind: "svg" | "image";
  mime: string;
  /** SVG markup, or a data: URL for raster images. */
  data: string;
  source: "art-director" | "imported" | "seed";
  approved: boolean;
  gameId?: string;
  createdAt: string;
}

export type CheckStatus = "pass" | "fail" | "warn" | "skipped";
export interface QACheck {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
}
export interface QAReport {
  ranAt: string;
  /** True only if the automated checks actually ran and every required one passed. */
  passed: boolean;
  ran: boolean;
  attempts: number;
  checks: QACheck[];
  consoleErrors: string[];
  durationMs: number;
}

export interface GameVersion {
  gameId: string;
  number: number;
  label?: string;
  saved: boolean;
  instruction?: string;
  jobId?: string;
  createdAt: string;
  build?: GameBuild;
  specs: { ideation?: IdeationOutput; design?: DesignOutput; art?: ArtOutput };
  assetIds: string[];
  qa?: QAReport;
  review?: ReviewOutput;
}

export type StepStatus = "waiting" | "working" | "complete" | "failed" | "skipped";
export interface JobStep {
  agent: AgentId;
  status: StepStatus;
  activity?: string;
  attempts: number;
  startedAt?: string;
  finishedAt?: string;
  output?: unknown;
  error?: string;
  costUsd?: number;
}

export type JobKind = "generate" | "refine" | "lab";
export type JobStatus = "queued" | "running" | "complete" | "failed" | "interrupted";

export interface GenerateInput {
  prompt: string;
  category?: Category;
  archetype?: "auto" | "tile-path" | "garden" | "constellation" | "freeform";
  /** Concept picked in the Creative Lab, used as the ideation starting point. */
  fromConcept?: LabConcept;
}
export interface RefineInput {
  instruction: string;
  baseVersion: number;
}
export interface LabInput {
  brief: string;
  count: number;
}

export interface Job {
  id: string;
  kind: JobKind;
  status: JobStatus;
  gameId?: string;
  versionNumber?: number;
  input: GenerateInput | RefineInput | LabInput;
  steps: JobStep[];
  error?: string;
  costUsd: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlayEvent {
  id: string;
  gameId: string;
  version: number;
  sessionId: string;
  name: string;
  level?: number;
  data?: Record<string, unknown>;
  at: string;
}

export interface UsageRecord {
  id: string;
  jobId?: string;
  agent: AgentId | "lab";
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  at: string;
}

export interface ConceptBatch {
  id: string;
  jobId: string;
  brief: string;
  concepts: LabConcept[];
  createdAt: string;
}

export type Effort = "low" | "medium" | "high";
export interface Settings {
  models: Record<AgentId, string>;
  effort: Effort;
  maxRepairs: number;
  qaEnabled: boolean;
}

export interface GameSummary extends Game {
  cover?: { sky: string[]; accent: string; archetype: string };
  qa: "passed" | "failed" | "untested";
  versionCount: number;
}
