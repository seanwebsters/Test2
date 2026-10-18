import { ACHIEVEMENTS } from "../content/achievements";
import { getCareer } from "../content/careers";
import { findMission, getPath } from "../content/paths";
import { skillName } from "../content/skills";
import { achievementXp, computeStats } from "./achievements";
import { addDays, weekStart } from "./dates";
import type { UserState } from "./model";
import { nextMissions, pathProgress, type PathProgress } from "./progression";
import { skillPoints, summariseSkills, type SkillSummary } from "./skills";
import { streakStatus } from "./streak";
import { rankForXp, rankTitle } from "./xp";

export interface PathSummary {
  careerSlug: string;
  title: string;
  status: "active" | "paused";
  progress: PathProgress;
  nextMissionId: string | null;
}

export interface Overview {
  totalXp: number;
  rank: number;
  rankTitle: string;
  rankProgress: number;
  xpToNext: number;
  streak: ReturnType<typeof streakStatus> & { longest: number; freezes: number };
  paths: PathSummary[];
  primary: PathSummary | null;
  skills: SkillSummary[];
  achievementsUnlocked: number;
  achievementsTotal: number;
}

export function overview(state: UserState, today: string): Overview {
  const missionXp = state.completions.reduce((n, c) => n + c.xp, 0);
  const totalXp = missionXp + achievementXp(state.achievements.map((a) => a.achievementId));
  const r = rankForXp(totalXp);
  const paths: PathSummary[] = state.paths
    .slice()
    .sort((a, b) => (a.status === b.status ? b.lastActiveAt.localeCompare(a.lastActiveAt) : a.status === "active" ? -1 : 1))
    .flatMap((p) => {
      const path = getPath(p.careerSlug);
      if (!path) return [];
      const progress = pathProgress(path, state.completions.filter((c) => c.careerSlug === p.careerSlug).map((c) => c.missionId), p.skippedThrough);
      return [{ careerSlug: p.careerSlug, title: path.title, status: p.status, progress, nextMissionId: nextMissions(progress, 1)[0]?.id ?? null }];
    });
  return {
    totalXp,
    rank: r.rank,
    rankTitle: rankTitle(r.rank),
    rankProgress: r.progress,
    xpToNext: r.next - totalXp,
    streak: { ...streakStatus(state.profile.streak, today), longest: state.profile.streak.longest, freezes: state.profile.streak.freezes },
    paths,
    primary: paths.find((p) => p.status === "active") ?? null,
    skills: summariseSkills(skillPoints(state.completions, state.profile.onboarding?.skills ?? [])),
    achievementsUnlocked: state.achievements.length,
    achievementsTotal: ACHIEVEMENTS.length,
  };
}

export interface WeeklyRecap {
  weekOf: string;
  missions: number;
  xp: number;
  lastWeekMissions: number;
  activeDays: number;
  skillsGained: { id: string; name: string; points: number }[];
  highlights: string[];
  achievements: string[];
  nextSteps: string[];
  careersExplored: string[];
}

/** A celebratory, honest recap of the current week (Monday–Sunday). */
export function weeklyRecap(state: UserState, today: string): WeeklyRecap {
  const start = weekStart(today);
  const prevStart = addDays(start, -7);
  const thisWeek = state.completions.filter((c) => c.day >= start && c.day <= today);
  const lastWeek = state.completions.filter((c) => c.day >= prevStart && c.day < start);
  const gained = new Map<string, number>();
  for (const c of thisWeek) for (const s of c.skillPoints) gained.set(s.id, (gained.get(s.id) ?? 0) + s.points);
  const skillsGained = [...gained.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, points]) => ({ id, name: skillName(id), points }));
  const highlights = thisWeek
    .map((c) => findMission(c.missionId)?.mission)
    .filter((m) => !!m && (m.quest || m.kind === "create" || m.kind === "connect"))
    .slice(0, 3)
    .map((m) => (m!.quest ? `Completed a level quest: ${m!.title.replace(/^Quest: /, "")}` : m!.title));
  const achievements = state.achievements
    .filter((a) => a.unlockedAt.slice(0, 10) >= start)
    .map((a) => ACHIEVEMENTS.find((x) => x.id === a.achievementId)?.name ?? a.achievementId);
  const ov = overview(state, today);
  const nextSteps: string[] = [];
  if (ov.primary?.nextMissionId) {
    const m = findMission(ov.primary.nextMissionId)?.mission;
    if (m) nextSteps.push(`Next on your ${ov.primary.title} path: ${m.title}`);
  }
  const weakest = ov.primary ? getCareer(ov.primary.careerSlug)?.skills.find((s) => !gained.has(s)) : undefined;
  if (weakest) nextSteps.push(`Give ${skillName(weakest).toLowerCase()} some love — it's key for your direction.`);
  if (!ov.streak.doneToday) nextSteps.push("Do one small mission today to keep your momentum.");
  const stats = computeStats(state);
  if (stats.connections === 0) nextSteps.push("Try a 'connect' mission — one friendly message can open doors.");
  return {
    weekOf: start,
    missions: thisWeek.length,
    xp: thisWeek.reduce((n, c) => n + c.xp, 0),
    lastWeekMissions: lastWeek.length,
    activeDays: new Set(thisWeek.map((c) => c.day)).size,
    skillsGained,
    highlights,
    achievements,
    nextSteps: nextSteps.slice(0, 3),
    careersExplored: [...new Set(thisWeek.map((c) => c.careerSlug))],
  };
}
