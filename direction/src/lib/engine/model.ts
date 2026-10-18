import type { StatusId } from "../content/onboarding";
import type { Opportunity } from "../content/opportunities";
import type { ValueKey } from "../content/types";

/** Everything the user tells us during onboarding. */
export interface OnboardingAnswers {
  name: string;
  status: StatusId;
  /** Swipe deck: card id → reaction. */
  swipes: Record<string, "no" | "yes" | "love">;
  thisOrThat: Record<string, "a" | "b">;
  interests: string[];
  subjects: string[];
  /** 0 = independent, 1 = collaborative. */
  social: number;
  lifestyle: string | null;
  /** Ten points distributed across five values. */
  values: Record<ValueKey, number>;
  skills: string[];
  considered: string[];
  country: string;
  city: string;
  minutesPerDay: number;
}

export interface MatchReason {
  kind: "interest" | "swipe" | "mode" | "value" | "social" | "skill" | "considered" | "feedback";
  text: string;
}

export interface MatchResult {
  careerSlug: string;
  percent: number;
  reasons: MatchReason[];
}

export interface StreakState {
  current: number;
  longest: number;
  /** YYYY-MM-DD in the user's timezone. */
  lastActiveDay: string | null;
  freezes: number;
  /** Days on which a freeze protected the streak. */
  frozenDays: string[];
}

export interface PrivacySettings {
  /** Public passport at /p/<handle>. */
  passportPublic: boolean;
  showDirection: boolean;
  showSkills: boolean;
  showAchievements: boolean;
  showProjects: boolean;
  showTimeline: boolean;
  /** Explicit opt-in to anonymised research. Never sold. Off by default. */
  researchConsent: boolean;
}

export interface ChallengeState {
  startedAt: string;
  startDay: string;
  careers: string[];
  /** Day number (1–30) → mission id completed for that day. */
  completed: Record<string, string>;
  finishedAt?: string;
  verdict?: string;
}

export type Plan = "free" | "plus";

export interface Profile {
  id: string;
  email: string | null;
  displayName: string;
  handle: string;
  createdAt: string;
  onboarding: OnboardingAnswers | null;
  onboardedAt: string | null;
  matches: MatchResult[];
  timezone: string;
  plan: Plan;
  planSource: "none" | "mock" | "stripe";
  planRenewsAt: string | null;
  stripeCustomerId: string | null;
  streak: StreakState;
  privacy: PrivacySettings;
  challenge: ChallengeState | null;
  isDemo: boolean;
}

export interface UserPath {
  careerSlug: string;
  status: "active" | "paused";
  startedAt: string;
  /** Levels at or below this were skipped via a placement quest. */
  skippedThrough: number;
  lastActiveAt: string;
}

export interface Completion {
  id: string;
  missionId: string;
  careerSlug: string;
  completedAt: string;
  day: string;
  evidence: string | null;
  reflection: string | null;
  /** How did it feel? Used to personalise future recommendations. */
  rating: -1 | 0 | 1 | null;
  xp: number;
  skillPoints: { id: string; points: number }[];
  source: "path" | "daily" | "challenge" | "placement";
}

export interface UnlockedAchievement {
  achievementId: string;
  unlockedAt: string;
}

export interface DailyPlan {
  day: string;
  missionIds: string[];
  createdAt: string;
}

export interface CoachMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  provider: "anthropic" | "offline" | null;
}

export type BookmarkStatus = "saved" | "applied" | "interviewing" | "secured" | "closed";

export interface Bookmark {
  opportunityId: string;
  status: BookmarkStatus;
  notes: string;
  updatedAt: string;
  /** Copy of externally sourced listings, so bookmarks survive the feed changing. */
  snapshot: Opportunity | null;
}

export interface CareerView {
  careerSlug: string;
  viewedAt: string;
}

export interface PassportItem {
  id: string;
  kind: "experience" | "certification" | "project" | "education";
  title: string;
  organisation: string;
  startDate: string | null;
  endDate: string | null;
  description: string;
  url: string | null;
  isPublic: boolean;
  createdAt: string;
}

/** The full private state for one user. */
export interface UserState {
  profile: Profile;
  paths: UserPath[];
  completions: Completion[];
  achievements: UnlockedAchievement[];
  bookmarks: Bookmark[];
  careerViews: CareerView[];
  passport: PassportItem[];
  coachMessageCount: number;
  coachConversations: number;
}

export const DEFAULT_PRIVACY: PrivacySettings = {
  passportPublic: false,
  showDirection: true,
  showSkills: true,
  showAchievements: true,
  showProjects: true,
  showTimeline: false,
  researchConsent: false,
};

export const EMPTY_STREAK: StreakState = { current: 0, longest: 0, lastActiveDay: null, freezes: 0, frozenDays: [] };
