/**
 * Content types. Content (careers, paths, missions, achievements) is versioned
 * in code so it is fast, reviewable and identical across environments. User
 * data lives in the database and references content by stable ids.
 */

export type CategoryId =
  | "creative"
  | "business"
  | "tech"
  | "film"
  | "music"
  | "fashion"
  | "marketing"
  | "finance"
  | "healthcare"
  | "science"
  | "engineering"
  | "sports"
  | "law"
  | "education"
  | "hospitality"
  | "public";

export type WorkMode = "create" | "solve" | "help" | "lead";
export type ValueKey = "money" | "creativity" | "stability" | "flexibility" | "impact";

/** All trait values are 0–1. */
export interface Traits {
  create: number;
  solve: number;
  help: number;
  lead: number;
  /** 0 = deeply independent, 1 = constantly collaborative. */
  social: number;
  money: number;
  creativity: number;
  stability: number;
  flexibility: number;
  impact: number;
}

export type SkillFamily = "creative" | "technical" | "people" | "business" | "self";

export interface Skill {
  id: string;
  name: string;
  family: SkillFamily;
  description: string;
}

export type RouteId =
  | "degree"
  | "apprenticeship"
  | "self-taught"
  | "bootcamp"
  | "portfolio"
  | "graduate-scheme"
  | "vocational"
  | "entry-level"
  | "postgrad"
  | "freelance"
  | "start-up"
  | "training-contract"
  | "military";

export interface SalaryBands {
  /** Indicative annual UK salaries in GBP thousands. */
  entry: number;
  mid: number;
  senior: number;
  /** True when pay is typically self-employed / highly variable. */
  variable?: boolean;
}

export interface DaySlot {
  time: string;
  title: string;
  detail: string;
}

export interface Career {
  slug: string;
  title: string;
  category: CategoryId;
  tagline: string;
  summary: string;
  skills: string[];
  salary: SalaryBands;
  routes: RouteId[];
  qualifications: string[];
  progression: string[];
  related: string[];
  challenges: string[];
  dayInLife: DaySlot[];
  traits: Traits;
  /** Interest signals (onboarding) that should pull this career up. */
  interests: string[];
  /** "full" pathways are hand-written, "starter" pathways are generated from templates. */
  pathway: "full" | "starter";
  featured?: boolean;
}

export type MissionKind = "learn" | "research" | "create" | "connect" | "reflect" | "practice" | "quest";
export type EvidenceType = "none" | "text" | "link" | "reflection";

export interface Mission {
  id: string;
  title: string;
  objective: string;
  minutes: number;
  steps: string[];
  kind: MissionKind;
  evidence: EvidenceType;
  /** Skill points earned on completion. */
  skills: { id: string; points: number }[];
  /** A prompt the coach can use to help with this mission. */
  aiHelp?: string;
  /** Tags used by achievements (e.g. portfolio, interview, connection). */
  tags?: string[];
  /** A quest proves a level: it always requires evidence and gates the level. */
  quest?: boolean;
}

export interface Level {
  n: number;
  title: string;
  summary: string;
  /** What finishing this level demonstrates. */
  milestone: string;
  missions: Mission[];
}

export interface CareerPath {
  careerSlug: string;
  title: string;
  kind: "full" | "starter";
  levels: Level[];
}

export interface Category {
  id: CategoryId;
  name: string;
  blurb: string;
  /** Tailwind-friendly accent token. */
  accent: "teal" | "coral" | "lavender" | "sun" | "mint";
  emoji: string;
}
