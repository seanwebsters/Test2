import type { Mission } from "../content/types";

/**
 * XP rewards effort and evidence, not clicking. Longer missions earn more, but
 * with diminishing returns so nobody is pushed towards grinding.
 */
export function baseXp(minutes: number): number {
  if (minutes <= 10) return 10;
  if (minutes <= 20) return 20;
  if (minutes <= 45) return 35;
  if (minutes <= 120) return 60;
  return 100;
}

export interface XpInput {
  mission: Pick<Mission, "minutes" | "quest" | "evidence">;
  hasEvidence: boolean;
  hasReflection: boolean;
  daily: boolean;
}

export function xpForMission({ mission, hasEvidence, hasReflection, daily }: XpInput): number {
  let xp = baseXp(mission.minutes);
  if (mission.quest) xp = Math.round(xp * 1.5);
  if (hasEvidence && mission.evidence !== "none") xp += 10;
  if (hasReflection) xp += 5;
  if (daily) xp += 5;
  return xp;
}

/** Overall rank: XP needed to reach rank n is 50·n·(n−1). */
export function rankForXp(xp: number): { rank: number; floor: number; next: number; progress: number } {
  let rank = 1;
  while (50 * (rank + 1) * rank <= xp) rank++;
  const floor = 50 * rank * (rank - 1);
  const next = 50 * (rank + 1) * rank;
  return { rank, floor, next, progress: (xp - floor) / (next - floor) };
}

export const RANK_TITLES = [
  "Wanderer",
  "Explorer",
  "Pathfinder",
  "Trailblazer",
  "Navigator",
  "Voyager",
  "Pioneer",
  "Trailmaster",
  "Northstar",
  "Legend",
];

export function rankTitle(rank: number): string {
  return RANK_TITLES[Math.min(rank, RANK_TITLES.length) - 1] ?? "Legend";
}
