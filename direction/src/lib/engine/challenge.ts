import { CAREERS, getCareer } from "../content/careers";
import { requirePath } from "../content/paths";
import type { Mission } from "../content/types";
import { daysBetween } from "./dates";
import type { ChallengeState } from "./model";

export const CHALLENGE_DAYS = 30;

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** A wildcard career from a category the user isn't already exploring. */
function wildcard(careers: string[], day: number): string {
  const cats = new Set(careers.map((c) => getCareer(c)?.category));
  const pool = CAREERS.filter((c) => !cats.has(c.category));
  return pool[hash(`${careers.join(",")}:${day}`) % pool.length]!.slug;
}

/**
 * Day n of the challenge. Days rotate through the user's top directions with a
 * wildcard every fifth day, drawing small missions from levels 1–2.
 */
export function challengeDay(careers: string[], day: number): { careerSlug: string; mission: Mission; wildcard: boolean } {
  const isWild = day % 5 === 0;
  const careerSlug = isWild ? wildcard(careers, day) : careers[(day - 1) % careers.length]!;
  const path = requirePath(careerSlug);
  const pool = path.levels.slice(0, 2).flatMap((l) => l.missions.filter((m) => !m.quest || l.n === 1));
  let appearance = 0;
  if (!isWild) {
    for (let d = 1; d < day; d++) if (d % 5 !== 0 && careers[(d - 1) % careers.length] === careerSlug) appearance++;
  }
  const mission = pool[appearance % pool.length]!;
  return { careerSlug, mission, wildcard: isWild };
}

export function challengeUnlockedDay(c: ChallengeState, today: string): number {
  return Math.max(1, Math.min(CHALLENGE_DAYS, daysBetween(c.startDay, today) + 1));
}

export function challengeCompletedCount(c: ChallengeState | null): number {
  return c ? Object.keys(c.completed).length : 0;
}

/** The earliest unlocked day not yet done (lets people catch up on missed days). */
export function nextChallengeDay(c: ChallengeState, today: string): number | null {
  const unlocked = challengeUnlockedDay(c, today);
  for (let d = 1; d <= unlocked; d++) if (!c.completed[String(d)]) return d;
  return null;
}
