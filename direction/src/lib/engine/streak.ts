import { addDays, daysBetween } from "./dates";
import type { StreakState } from "./model";

export const MAX_FREEZES = 2;
export const FREEZE_EVERY = 7;

export interface StreakEvent {
  state: StreakState;
  /** What happened, for UI messages. */
  outcome: "same-day" | "extended" | "started" | "protected" | "restarted";
  freezesUsed: number;
  earnedFreeze: boolean;
}

/**
 * Records activity on `today`. Missing a day doesn't wipe progress outright:
 * freezes (earned every 7 days, max 2) cover missed days automatically, and
 * the longest streak is always kept.
 */
export function recordActivity(prev: StreakState, today: string): StreakEvent {
  const s: StreakState = { ...prev, frozenDays: [...prev.frozenDays] };
  if (s.lastActiveDay === today) return { state: s, outcome: "same-day", freezesUsed: 0, earnedFreeze: false };

  let outcome: StreakEvent["outcome"];
  let freezesUsed = 0;
  if (!s.lastActiveDay) {
    s.current = 1;
    outcome = "started";
  } else {
    const gap = daysBetween(s.lastActiveDay, today);
    if (gap <= 0) {
      // Clock skew or timezone change: treat as same day.
      return { state: s, outcome: "same-day", freezesUsed: 0, earnedFreeze: false };
    }
    const missed = gap - 1;
    if (missed === 0) {
      s.current += 1;
      outcome = "extended";
    } else if (missed <= s.freezes) {
      s.freezes -= missed;
      freezesUsed = missed;
      for (let i = 1; i <= missed; i++) s.frozenDays.push(addDays(s.lastActiveDay, i));
      s.current += 1;
      outcome = "protected";
    } else {
      s.current = 1;
      outcome = "restarted";
    }
  }

  let earnedFreeze = false;
  if (s.current > 0 && s.current % FREEZE_EVERY === 0 && s.freezes < MAX_FREEZES) {
    s.freezes += 1;
    earnedFreeze = true;
  }
  s.lastActiveDay = today;
  s.longest = Math.max(s.longest, s.current);
  s.frozenDays = s.frozenDays.slice(-30);
  return { state: s, outcome, freezesUsed, earnedFreeze };
}

/** The streak as it should be displayed today, without mutating anything. */
export function streakStatus(s: StreakState, today: string): { current: number; alive: boolean; atRisk: boolean; doneToday: boolean } {
  if (!s.lastActiveDay) return { current: 0, alive: false, atRisk: false, doneToday: false };
  const gap = daysBetween(s.lastActiveDay, today);
  if (gap <= 0) return { current: s.current, alive: true, atRisk: false, doneToday: true };
  const missed = gap - 1;
  if (missed <= s.freezes) return { current: s.current, alive: true, atRisk: true, doneToday: false };
  return { current: 0, alive: false, atRisk: false, doneToday: false };
}
