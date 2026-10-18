import "server-only";
import crypto from "node:crypto";
import { getCareer } from "@/lib/content/careers";
import { findMission, getPath } from "@/lib/content/paths";
import { ACHIEVEMENTS } from "@/lib/content/achievements";
import { ALL_STATIC_OPPORTUNITIES, type Opportunity } from "@/lib/content/opportunities";
import { computeStats, newlyUnlocked } from "@/lib/engine/achievements";
import { CHALLENGE_DAYS, challengeDay, challengeUnlockedDay } from "@/lib/engine/challenge";
import { bonusMission, generateDailyPlan } from "@/lib/engine/daily";
import { dayKey } from "@/lib/engine/dates";
import { canActivateAnotherPath, coachRemaining, entitlementsFor } from "@/lib/engine/entitlements";
import { feedbackFromRatings, rankCareers } from "@/lib/engine/matching";
import {
  DEFAULT_PRIVACY,
  EMPTY_STREAK,
  type Bookmark,
  type BookmarkStatus,
  type Completion,
  type OnboardingAnswers,
  type PassportItem,
  type PrivacySettings,
  type Profile,
  type UserPath,
  type UserState,
} from "@/lib/engine/model";
import { canComplete, pathProgress } from "@/lib/engine/progression";
import { recordActivity, type StreakEvent } from "@/lib/engine/streak";
import { rankForXp, xpForMission } from "@/lib/engine/xp";
import { localStore, storeFor, type Viewer } from "./context";
import { backend } from "./env";
import { HttpError } from "./http";
import type { Store } from "./store/types";

export const nowIso = () => new Date().toISOString();
export const todayFor = (p: Pick<Profile, "timezone">) => dayKey(new Date(), p.timezone);

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 16) || "explorer";
}

export function newHandle(name: string): string {
  return `${slugify(name)}${crypto.randomInt(1000, 9999)}`;
}

export function defaultProfile(viewer: Viewer, name?: string): Profile {
  const displayName = name || viewer.email?.split("@")[0] || "Explorer";
  return {
    id: viewer.userId,
    email: viewer.email,
    displayName,
    handle: newHandle(displayName),
    createdAt: nowIso(),
    onboarding: null,
    onboardedAt: null,
    matches: [],
    timezone: "Europe/London",
    plan: "free",
    planSource: "none",
    planRenewsAt: null,
    stripeCustomerId: null,
    streak: { ...EMPTY_STREAK },
    privacy: { ...DEFAULT_PRIVACY },
    challenge: null,
    isDemo: viewer.userId.startsWith("demo-"),
  };
}

export async function ensureProfile(store: Store, viewer: Viewer): Promise<Profile> {
  const existing = await store.getProfile(viewer.userId);
  if (existing) return existing;
  const p = defaultProfile(viewer);
  await store.saveProfile(p);
  return p;
}

export async function loadState(viewer: Viewer, store = storeFor(viewer)): Promise<UserState> {
  const profile = await ensureProfile(store, viewer);
  const [paths, completions, achievements, bookmarks, careerViews, passport, coach] = await Promise.all([
    store.listPaths(viewer.userId),
    store.listCompletions(viewer.userId),
    store.listAchievements(viewer.userId),
    store.listBookmarks(viewer.userId),
    store.listCareerViews(viewer.userId),
    store.listPassport(viewer.userId),
    store.listCoachMessages(viewer.userId, 500),
  ]);
  // A "conversation" is a run of messages separated by 6+ hours of quiet.
  let conversations = 0;
  let last = 0;
  for (const m of coach) {
    const t = Date.parse(m.createdAt);
    if (m.role === "user" && t - last > 6 * 3600_000) conversations++;
    last = t;
  }
  return {
    profile,
    paths,
    completions,
    achievements,
    bookmarks,
    careerViews,
    passport,
    coachMessageCount: coach.length,
    coachConversations: conversations,
  };
}

// ───────────────────────── Onboarding ─────────────────────────

export async function saveOnboarding(viewer: Viewer, answers: OnboardingAnswers, timezone?: string) {
  const store = storeFor(viewer);
  const profile = await ensureProfile(store, viewer);
  const completions = await store.listCompletions(viewer.userId);
  const matches = rankCareers(answers, feedbackFromRatings(completions)).slice(0, 12);
  const next: Profile = {
    ...profile,
    onboarding: answers,
    onboardedAt: profile.onboardedAt ?? nowIso(),
    matches,
    displayName: answers.name.trim() || profile.displayName,
    timezone: timezone && isValidTz(timezone) ? timezone : profile.timezone,
  };
  if (!profile.onboarding && answers.name.trim()) next.handle = newHandle(answers.name);
  await store.saveProfile(next);
  return next;
}

function isValidTz(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

// ───────────────────────── Paths ─────────────────────────

export async function startPath(viewer: Viewer, careerSlug: string, opts: { switchFrom?: string | null } = {}) {
  if (!getCareer(careerSlug)) throw new HttpError(404, "We couldn't find that career.");
  const store = storeFor(viewer);
  const profile = await ensureProfile(store, viewer);
  const paths = await store.listPaths(viewer.userId);
  const existing = paths.find((p) => p.careerSlug === careerSlug);
  if (existing?.status === "active") return existing;
  const active = paths.filter((p) => p.status === "active");

  if (opts.switchFrom) {
    const from = active.find((p) => p.careerSlug === opts.switchFrom);
    if (from) {
      // Switching never deletes progress: the old path is paused and can be resumed any time.
      await store.savePath(viewer.userId, { ...from, status: "paused" });
      active.splice(active.indexOf(from), 1);
    }
  }
  if (!canActivateAnotherPath(profile.plan, active.length)) {
    throw new HttpError(
      402,
      profile.plan === "free"
        ? "Direction Free includes one active path. Switch paths (your progress is saved) or upgrade to Plus for more."
        : "You've reached the maximum number of active paths.",
      "path_limit",
    );
  }
  const now = nowIso();
  const path: UserPath = existing
    ? { ...existing, status: "active", lastActiveAt: now }
    : { careerSlug, status: "active", startedAt: now, skippedThrough: 0, lastActiveAt: now };
  await store.savePath(viewer.userId, path);
  // Today's plan should reflect the new direction.
  const today = todayFor(profile);
  const plan = await store.getDailyPlan(viewer.userId, today);
  if (plan) {
    const state = await loadState(viewer, store);
    const regenerated = generateDailyPlan(state, today);
    const doneIds = new Set(state.completions.map((c) => c.missionId));
    const keep = plan.missionIds.filter((id) => doneIds.has(id));
    await store.saveDailyPlan(viewer.userId, { ...plan, missionIds: [...new Set([...keep, ...regenerated])] });
  }
  return path;
}

export async function pausePath(viewer: Viewer, careerSlug: string) {
  const store = storeFor(viewer);
  const p = (await store.listPaths(viewer.userId)).find((x) => x.careerSlug === careerSlug);
  if (!p) throw new HttpError(404, "Path not found.");
  await store.savePath(viewer.userId, { ...p, status: "paused" });
}

// ───────────────────────── Daily plan ─────────────────────────

export async function getTodayPlan(viewer: Viewer, state?: UserState) {
  const store = storeFor(viewer);
  const s = state ?? (await loadState(viewer, store));
  const today = todayFor(s.profile);
  let plan = await store.getDailyPlan(viewer.userId, today);
  if (!plan || plan.missionIds.length === 0) {
    const ids = generateDailyPlan(s, today);
    plan = { day: today, missionIds: ids, createdAt: nowIso() };
    if (ids.length) await store.saveDailyPlan(viewer.userId, plan);
  }
  return plan;
}

export async function addBonusMission(viewer: Viewer) {
  const store = storeFor(viewer);
  const state = await loadState(viewer, store);
  const plan = await getTodayPlan(viewer, state);
  const id = bonusMission(state, plan.missionIds);
  if (!id) throw new HttpError(404, "You've done everything available right now. Amazing work!");
  const next = { ...plan, missionIds: [...plan.missionIds, id] };
  await store.saveDailyPlan(viewer.userId, next);
  return next;
}

// ───────────────────────── Missions ─────────────────────────

export interface CompleteInput {
  missionId: string;
  evidence?: string | null;
  reflection?: string | null;
  rating?: -1 | 0 | 1 | null;
  placement?: boolean;
  challengeDay?: number | null;
}

export interface CompleteResult {
  completion: Completion;
  xp: number;
  totalXp: number;
  rankUp: number | null;
  streak: StreakEvent;
  newAchievements: { id: string; name: string; emoji: string; xp: number }[];
  levelCompleted: { careerSlug: string; level: number; title: string; milestone: string } | null;
  pathFinished: boolean;
  challengeFinished: boolean;
}

export async function completeMission(viewer: Viewer, input: CompleteInput): Promise<CompleteResult> {
  const store = storeFor(viewer);
  const state = await loadState(viewer, store);
  const ref = findMission(input.missionId);
  if (!ref) throw new HttpError(404, "That mission doesn't exist.");
  const { mission, level, path } = ref;
  const slug = path.careerSlug;
  if (state.completions.some((c) => c.missionId === mission.id)) throw new HttpError(409, "You've already completed this mission.");

  const evidence = input.evidence?.trim() || null;
  const reflection = input.reflection?.trim() || null;
  const today = todayFor(state.profile);
  const plan = await store.getDailyPlan(viewer.userId, today);
  const inDaily = !!plan?.missionIds.includes(mission.id);
  let userPath = state.paths.find((p) => p.careerSlug === slug);
  let source: Completion["source"] = input.placement ? "placement" : inDaily ? "daily" : "path";

  // Discovery Challenge: tasters from any career, verified against the day's mission.
  let challengeDayDone: number | null = null;
  const ch = state.profile.challenge;
  if (input.challengeDay && ch && !ch.finishedAt) {
    const n = input.challengeDay;
    if (n < 1 || n > challengeUnlockedDay(ch, today)) throw new HttpError(403, "That challenge day isn't unlocked yet.");
    if (ch.completed[String(n)]) throw new HttpError(409, "You've already done that day.");
    if (challengeDay(ch.careers, n).mission.id !== mission.id) throw new HttpError(400, "That mission isn't part of this challenge day.");
    challengeDayDone = n;
    source = "challenge";
  }

  const doneForPath = state.completions.filter((c) => c.careerSlug === slug).map((c) => c.missionId);
  const before = pathProgress(path, doneForPath, userPath?.skippedThrough ?? 0);

  if (source !== "challenge") {
    if (!userPath) {
      // Curiosity missions: anyone can try level 1 of any career without committing.
      if (level.n !== 1 || input.placement) throw new HttpError(403, "Start this path to unlock its missions.");
    } else if (userPath.status === "paused" && level.n > 1 && !inDaily) {
      throw new HttpError(403, "This path is paused. Resume it to keep going — your progress is saved.");
    }
    const check = canComplete(before, mission.id, { placement: input.placement, evidence });
    if (!check.ok) throw new HttpError(400, check.reason);
  }

  const now = nowIso();
  const xp = xpForMission({ mission, hasEvidence: !!evidence, hasReflection: !!reflection, daily: inDaily });
  const completion: Completion = {
    id: crypto.randomUUID(),
    missionId: mission.id,
    careerSlug: slug,
    completedAt: now,
    day: today,
    evidence,
    reflection,
    rating: input.rating ?? null,
    xp,
    skillPoints: mission.skills,
    source,
  };
  await store.addCompletion(viewer.userId, completion);

  // Keep a record of the path (paused if the user hasn't committed to it).
  userPath = userPath
    ? { ...userPath, lastActiveAt: now }
    : { careerSlug: slug, status: "paused", startedAt: now, skippedThrough: 0, lastActiveAt: now };
  if (input.placement) userPath.skippedThrough = Math.max(userPath.skippedThrough, level.n);
  await store.savePath(viewer.userId, userPath);

  // Streak, challenge, and adaptive recommendations live on the profile.
  const streak = recordActivity(state.profile.streak, today);
  const profile: Profile = { ...state.profile, streak: streak.state };
  let challengeFinished = false;
  if (challengeDayDone && profile.challenge) {
    profile.challenge = { ...profile.challenge, completed: { ...profile.challenge.completed, [String(challengeDayDone)]: mission.id } };
    if (Object.keys(profile.challenge.completed).length >= CHALLENGE_DAYS) {
      profile.challenge.finishedAt = now;
      challengeFinished = true;
    }
  }
  const nextState: UserState = {
    ...state,
    profile,
    completions: [...state.completions, completion],
    paths: [...state.paths.filter((p) => p.careerSlug !== slug), userPath],
  };
  if (input.rating !== undefined && input.rating !== null && profile.onboarding) {
    profile.matches = rankCareers(profile.onboarding, feedbackFromRatings(nextState.completions)).slice(0, 12);
  }
  await store.saveProfile(profile);

  // Achievements.
  const unlocked = newlyUnlocked(computeStats(nextState), new Set(state.achievements.map((a) => a.achievementId)));
  if (unlocked.length) await store.addAchievements(viewer.userId, unlocked.map((a) => ({ achievementId: a.id, unlockedAt: now })));

  const after = pathProgress(path, [...doneForPath, mission.id], userPath.skippedThrough);
  let levelCompleted: CompleteResult["levelCompleted"] = null;
  for (const lp of after.levels) {
    const was = before.levels.find((l) => l.level.n === lp.level.n);
    if ((lp.status === "complete" || lp.status === "skipped") && was?.status !== "complete" && was?.status !== "skipped") {
      levelCompleted = { careerSlug: slug, level: lp.level.n, title: lp.level.title, milestone: lp.level.milestone };
    }
  }

  const xpBefore = state.completions.reduce((n, c) => n + c.xp, 0) + sumAchievementXp(state.achievements.map((a) => a.achievementId));
  const totalXp = xpBefore + xp + unlocked.reduce((n, a) => n + a.xp, 0);
  const rb = rankForXp(xpBefore).rank;
  const ra = rankForXp(totalXp).rank;

  return {
    completion,
    xp,
    totalXp,
    rankUp: ra > rb ? ra : null,
    streak,
    newAchievements: unlocked.map((a) => ({ id: a.id, name: a.name, emoji: a.emoji, xp: a.xp })),
    levelCompleted,
    pathFinished: after.finished && !before.finished,
    challengeFinished,
  };
}

function sumAchievementXp(ids: string[]) {
  return ids.reduce((n, id) => n + (ACHIEVEMENTS.find((a) => a.id === id)?.xp ?? 0), 0);
}

// ───────────────────────── Discovery challenge ─────────────────────────

export async function startChallenge(viewer: Viewer, careers?: string[]) {
  const store = storeFor(viewer);
  const profile = await ensureProfile(store, viewer);
  const picks = (careers?.length ? careers : profile.matches.slice(0, 3).map((m) => m.careerSlug)).filter((c) => !!getCareer(c)).slice(0, 3);
  if (picks.length === 0) throw new HttpError(400, "Finish onboarding first so we know which directions to explore.");
  const now = nowIso();
  profile.challenge = { startedAt: now, startDay: todayFor(profile), careers: picks, completed: {} };
  await store.saveProfile(profile);
  // Regenerate today's plan so the challenge mission appears straight away.
  const state = await loadState(viewer, store);
  const today = todayFor(profile);
  await store.saveDailyPlan(viewer.userId, { day: today, missionIds: generateDailyPlan(state, today), createdAt: now });
  return profile.challenge;
}

export async function finishChallenge(viewer: Viewer, verdict: string) {
  const store = storeFor(viewer);
  const profile = await ensureProfile(store, viewer);
  if (!profile.challenge) throw new HttpError(400, "No challenge in progress.");
  profile.challenge = { ...profile.challenge, verdict, finishedAt: profile.challenge.finishedAt ?? nowIso() };
  await store.saveProfile(profile);
  return profile.challenge;
}

export async function stopChallenge(viewer: Viewer) {
  const store = storeFor(viewer);
  const profile = await ensureProfile(store, viewer);
  profile.challenge = null;
  await store.saveProfile(profile);
}

// ───────────────────────── Careers & opportunities ─────────────────────────

export async function recordCareerView(viewer: Viewer, slug: string) {
  if (!getCareer(slug)) return;
  const store = storeFor(viewer);
  const state = await loadState(viewer, store);
  await store.addCareerView(viewer.userId, slug, nowIso());
  const next = { ...state, careerViews: [...state.careerViews.filter((v) => v.careerSlug !== slug), { careerSlug: slug, viewedAt: nowIso() }] };
  const unlocked = newlyUnlocked(computeStats(next), new Set(state.achievements.map((a) => a.achievementId)));
  if (unlocked.length) await store.addAchievements(viewer.userId, unlocked.map((a) => ({ achievementId: a.id, unlockedAt: nowIso() })));
  return unlocked;
}

export async function saveBookmark(viewer: Viewer, opportunityId: string, status: BookmarkStatus, notes = "", snapshot: Opportunity | null = null) {
  const known = ALL_STATIC_OPPORTUNITIES.some((o) => o.id === opportunityId);
  if (!known && !snapshot) throw new HttpError(404, "Opportunity not found.");
  const store = storeFor(viewer);
  const state = await loadState(viewer, store);
  const bm: Bookmark = { opportunityId, status, notes: notes.slice(0, 2000), updatedAt: nowIso(), snapshot: known ? null : snapshot };
  await store.saveBookmark(viewer.userId, bm);
  const next = { ...state, bookmarks: [...state.bookmarks.filter((b) => b.opportunityId !== opportunityId), bm] };
  const unlocked = newlyUnlocked(computeStats(next), new Set(state.achievements.map((a) => a.achievementId)));
  if (unlocked.length) await store.addAchievements(viewer.userId, unlocked.map((a) => ({ achievementId: a.id, unlockedAt: nowIso() })));
  if (status !== "saved") {
    const streak = recordActivity(state.profile.streak, todayFor(state.profile));
    await store.saveProfile({ ...state.profile, streak: streak.state });
  }
  return { bookmark: bm, newAchievements: unlocked.map((a) => ({ id: a.id, name: a.name, emoji: a.emoji, xp: a.xp })) };
}

export async function removeBookmark(viewer: Viewer, opportunityId: string) {
  await storeFor(viewer).deleteBookmark(viewer.userId, opportunityId);
}

// ───────────────────────── Passport & privacy ─────────────────────────

export async function savePassportItem(viewer: Viewer, item: Omit<PassportItem, "id" | "createdAt"> & { id?: string }) {
  const store = storeFor(viewer);
  const existing = item.id ? (await store.listPassport(viewer.userId)).find((p) => p.id === item.id) : undefined;
  const full: PassportItem = { ...item, id: existing?.id ?? crypto.randomUUID(), createdAt: existing?.createdAt ?? nowIso() };
  await store.savePassportItem(viewer.userId, full);
  return full;
}

export async function deletePassportItem(viewer: Viewer, id: string) {
  await storeFor(viewer).deletePassportItem(viewer.userId, id);
}

export async function updateProfileSettings(
  viewer: Viewer,
  patch: { displayName?: string; handle?: string; privacy?: Partial<PrivacySettings>; minutesPerDay?: number; timezone?: string },
) {
  const store = storeFor(viewer);
  const profile = await ensureProfile(store, viewer);
  if (patch.displayName !== undefined) profile.displayName = patch.displayName.trim().slice(0, 40) || profile.displayName;
  if (patch.handle !== undefined) {
    const h = patch.handle.toLowerCase();
    if (!/^[a-z0-9_]{3,24}$/.test(h)) throw new HttpError(400, "Handles are 3–24 letters, numbers or underscores.");
    if (backend() === "local" && (await localStore().handleTaken(h, viewer.userId))) throw new HttpError(409, "That handle is taken.");
    profile.handle = h;
  }
  if (patch.privacy) profile.privacy = { ...profile.privacy, ...patch.privacy };
  if (patch.minutesPerDay && profile.onboarding) profile.onboarding = { ...profile.onboarding, minutesPerDay: patch.minutesPerDay };
  if (patch.timezone && isValidTz(patch.timezone)) profile.timezone = patch.timezone;
  try {
    await store.saveProfile(profile);
  } catch (e) {
    if (String(e).includes("duplicate")) throw new HttpError(409, "That handle is taken.");
    throw e;
  }
  return profile;
}

export async function exportData(viewer: Viewer) {
  const store = storeFor(viewer);
  const state = await loadState(viewer, store);
  const coach = await store.listCoachMessages(viewer.userId, 500);
  return { exportedAt: nowIso(), ...state, coachMessages: coach };
}

export async function deleteAccount(viewer: Viewer) {
  await storeFor(viewer).deleteUser(viewer.userId);
}

// ───────────────────────── Coach limits ─────────────────────────

export async function coachUsage(viewer: Viewer, profile: Profile) {
  const store = storeFor(viewer);
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  const used = await store.countCoachMessagesSince(viewer.userId, since.toISOString());
  return { used, remaining: coachRemaining(profile.plan, used), limit: entitlementsFor(profile.plan).coachMessagesPerDay };
}

export { getPath };
