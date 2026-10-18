import type { CareerPath, Level, Mission } from "../content/types";

/** A level is complete when its quest is done and 4 of its 5 missions are done. */
export const LEVEL_REQUIRED = 4;
/** Placement ("skip ahead") quests are offered up to this level. */
export const MAX_PLACEMENT_LEVEL = 6;

export type LevelStatus = "locked" | "available" | "complete" | "skipped";

export interface MissionProgress {
  mission: Mission;
  done: boolean;
  available: boolean;
  /** Why a mission isn't available yet. */
  lockedReason: string | null;
}

export interface LevelProgress {
  level: Level;
  status: LevelStatus;
  done: number;
  required: number;
  questDone: boolean;
  questUnlocked: boolean;
  missions: MissionProgress[];
}

export interface PathProgress {
  path: CareerPath;
  levels: LevelProgress[];
  /** The level the user should work on now (1-based). */
  currentLevel: number;
  completedLevels: number;
  percent: number;
  finished: boolean;
}

function questOf(level: Level): Mission | undefined {
  return level.missions.find((m) => m.quest);
}

export function levelProgress(level: Level, done: Set<string>, unlocked: boolean, skipped: boolean): LevelProgress {
  const quest = questOf(level);
  const nonQuestDone = level.missions.filter((m) => !m.quest && done.has(m.id)).length;
  const questDone = quest ? done.has(quest.id) : true;
  const doneCount = level.missions.filter((m) => done.has(m.id)).length;
  const questUnlocked = unlocked && nonQuestDone >= LEVEL_REQUIRED - 1;
  const complete = questDone && doneCount >= LEVEL_REQUIRED;

  const missions: MissionProgress[] = level.missions.map((m) => {
    const isDone = done.has(m.id);
    let available = unlocked;
    let lockedReason: string | null = unlocked ? null : `Finish level ${level.n - 1} to unlock`;
    if (unlocked && m.quest && !questUnlocked && !isDone) {
      available = false;
      lockedReason = `Complete ${LEVEL_REQUIRED - 1} missions in this level to unlock the quest`;
    }
    return { mission: m, done: isDone, available: available || isDone, lockedReason: isDone ? null : lockedReason };
  });

  let status: LevelStatus = "locked";
  if (skipped) status = "skipped";
  else if (complete) status = "complete";
  else if (unlocked) status = "available";
  return { level, status, done: doneCount, required: LEVEL_REQUIRED, questDone, questUnlocked, missions };
}

/**
 * Levels unlock on demonstrated progress — finishing the previous level's quest —
 * never on XP alone. Skipped levels (via placement) count as complete.
 */
export function pathProgress(path: CareerPath, completedIds: Iterable<string>, skippedThrough = 0): PathProgress {
  const done = new Set(completedIds);
  const levels: LevelProgress[] = [];
  let prevComplete = true;
  for (const level of path.levels) {
    const skipped = level.n <= skippedThrough;
    const unlocked = skipped || prevComplete;
    const lp = levelProgress(level, done, unlocked, skipped);
    levels.push(lp);
    prevComplete = lp.status === "complete" || lp.status === "skipped";
  }
  const completedLevels = levels.filter((l) => l.status === "complete" || l.status === "skipped").length;
  const current = levels.find((l) => l.status === "available");
  const totalMissions = path.levels.reduce((n, l) => n + l.missions.length, 0);
  const doneMissions = path.levels.reduce((n, l) => n + l.missions.filter((m) => done.has(m.id)).length, 0);
  const levelPct = completedLevels / path.levels.length;
  const missionPct = doneMissions / totalMissions;
  return {
    path,
    levels,
    currentLevel: current ? current.level.n : path.levels.length,
    completedLevels,
    percent: Math.round(Math.max(levelPct, missionPct * 0.9) * 100),
    finished: completedLevels === path.levels.length,
  };
}

export type CompletionCheck = { ok: true } | { ok: false; reason: string };

export function canComplete(
  progress: PathProgress,
  missionId: string,
  opts: { placement?: boolean; evidence?: string | null } = {},
): CompletionCheck {
  for (const lp of progress.levels) {
    const mp = lp.missions.find((m) => m.mission.id === missionId);
    if (!mp) continue;
    if (mp.done) return { ok: false, reason: "You've already completed this mission." };
    const needsEvidence = mp.mission.evidence !== "none" && (mp.mission.quest || opts.placement);
    if (needsEvidence && !opts.evidence?.trim()) return { ok: false, reason: "This mission needs evidence of what you did." };
    if (opts.placement) {
      if (!mp.mission.quest) return { ok: false, reason: "Only level quests can be used to skip ahead." };
      if (lp.level.n > MAX_PLACEMENT_LEVEL) return { ok: false, reason: `You can skip ahead to level ${MAX_PLACEMENT_LEVEL} at most.` };
      if (lp.status !== "locked" && lp.status !== "available") return { ok: false, reason: "This level is already complete." };
      return { ok: true };
    }
    if (!mp.available) return { ok: false, reason: mp.lockedReason ?? "This mission is locked." };
    return { ok: true };
  }
  return { ok: false, reason: "That mission isn't part of this path." };
}

/** Next incomplete, available missions in path order (current level first). */
export function nextMissions(progress: PathProgress, limit = 5): Mission[] {
  const out: Mission[] = [];
  for (const lp of progress.levels) {
    if (lp.status === "locked") break;
    for (const mp of lp.missions) {
      if (!mp.done && mp.available) out.push(mp.mission);
      if (out.length >= limit) return out;
    }
  }
  return out;
}
