import { ACHIEVEMENTS, type Achievement, type AchievementStats } from "../content/achievements";
import { findMission, getPath } from "../content/paths";
import { challengeCompletedCount } from "./challenge";
import type { UserState } from "./model";
import { pathProgress } from "./progression";
import { skillPoints } from "./skills";

export function computeStats(state: UserState): AchievementStats {
  const tagCount = (tag: string) =>
    state.completions.filter((c) => findMission(c.missionId)?.mission.tags?.includes(tag)).length;
  const projects = state.completions.filter((c) => {
    const m = findMission(c.missionId)?.mission;
    return m?.tags?.includes("project") && !!c.evidence;
  }).length;
  const quests = state.completions.filter((c) => findMission(c.missionId)?.mission.quest).length;
  const levelsCompleted = state.paths.reduce((n, p) => {
    const path = getPath(p.careerSlug);
    if (!path) return n;
    const done = state.completions.filter((c) => c.careerSlug === p.careerSlug).map((c) => c.missionId);
    // Skipped levels aren't "completed" for achievement purposes: they weren't earned here.
    return n + pathProgress(path, done, p.skippedThrough).levels.filter((l) => l.status === "complete").length;
  }, 0);
  const careersTried = new Set([...state.paths.map((p) => p.careerSlug), ...state.completions.map((c) => c.careerSlug)]);
  const pts = skillPoints(state.completions, state.profile.onboarding?.skills ?? []);
  return {
    missionsCompleted: state.completions.length,
    careersViewed: new Set(state.careerViews.map((v) => v.careerSlug)).size,
    projectsCompleted: projects,
    connections: tagCount("connection"),
    portfolioPieces: tagCount("portfolio"),
    interviewPrep: tagCount("interview"),
    applications: state.bookmarks.filter((b) => ["applied", "interviewing", "secured"].includes(b.status)).length,
    opportunitiesSecured: state.bookmarks.filter((b) => b.status === "secured").length,
    longestStreak: state.profile.streak.longest,
    levelsCompleted,
    pathsStarted: careersTried.size,
    coachConversations: state.coachConversations,
    challengeDays: challengeCompletedCount(state.profile.challenge),
    questsCompleted: quests,
    skillsAtCapable: [...pts.values()].filter((p) => p >= 70).length,
    reflections: state.completions.filter((c) => !!c.reflection?.trim()).length,
  };
}

/** Achievements whose progress reached 1 and aren't unlocked yet. */
export function newlyUnlocked(stats: AchievementStats, unlocked: Set<string>): Achievement[] {
  return ACHIEVEMENTS.filter((a) => !unlocked.has(a.id) && a.progress(stats) >= 1);
}

export function achievementXp(ids: Iterable<string>): number {
  let xp = 0;
  for (const id of ids) xp += ACHIEVEMENTS.find((a) => a.id === id)?.xp ?? 0;
  return xp;
}
