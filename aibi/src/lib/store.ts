"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Profile } from "@/content/profile";
import { goalXpFor } from "@/content/profile";
import type { SkillId } from "@/content/types";
import { ALL_LESSONS, WORLDS, getLesson } from "@/content/curriculum";
import { dayKey, daysBetween, weekKey } from "./date";
import { ACHIEVEMENTS, levelInfo } from "./gamification";

// All persistent learner state. Kept as plain JSON so it can later be synced to
// a server (see src/lib/repository.ts) without reshaping.
export interface AppData {
  version: 1;
  onboarded: boolean;
  profile: Profile | null;
  xp: number;
  xpByDay: Record<string, number>;
  weekly: { week: string; xp: number };
  skillXp: Partial<Record<SkillId, number>>;
  completed: Record<string, { accuracy: number; xp: number; at: string; plays: number }>;
  unlockedWorlds: string[];
  streak: { count: number; best: number; lastDay: string | null; freezes: number };
  hearts: { count: number; updatedAt: number };
  plan: "free" | "plus";
  planPeriod: "monthly" | "yearly" | null;
  planSince: string | null;
  achievements: Record<string, string>;
  equipped: { head?: string; face?: string; neck?: string };
  challenges: Record<string, { id: string; prompt: string; score: number; at: string }>;
  playground: { day: string; used: number };
  stats: {
    correct: number;
    answered: number;
    perfectLessons: number;
    promptsWritten: number;
    bestPromptScore: number;
    imagesMade: number;
    modesTried: string[];
    shares: number;
  };
  settings: { sound: boolean; haptics: boolean };
  celebrations: Celebration[];
}

export type Celebration =
  | { type: "level"; level: number }
  | { type: "achievement"; id: string }
  | { type: "world"; worldId: string };

export const MAX_HEARTS = 5;
export const HEART_REGEN_MS = 30 * 60 * 1000;
export const PLAYGROUND_LIMIT = { free: 10, plus: 100 } as const;

const initial = (): AppData => ({
  version: 1,
  onboarded: false,
  profile: null,
  xp: 0,
  xpByDay: {},
  weekly: { week: weekKey(), xp: 0 },
  skillXp: {},
  completed: {},
  unlockedWorlds: ["w1"],
  streak: { count: 0, best: 0, lastDay: null, freezes: 1 },
  hearts: { count: MAX_HEARTS, updatedAt: Date.now() },
  plan: "free",
  planPeriod: null,
  planSince: null,
  achievements: {},
  equipped: {},
  challenges: {},
  playground: { day: dayKey(), used: 0 },
  stats: { correct: 0, answered: 0, perfectLessons: 0, promptsWritten: 0, bestPromptScore: 0, imagesMade: 0, modesTried: [], shares: 0 },
  settings: { sound: true, haptics: true },
  celebrations: [],
});

interface Actions {
  completeOnboarding: (p: Omit<Profile, "createdAt">) => void;
  updateProfile: (p: Partial<Profile>) => void;
  /** Adds XP and returns nothing; also updates streak, daily and weekly totals. */
  awardXp: (amount: number, skill?: SkillId) => void;
  finishLesson: (lessonId: string, r: { correct: number; total: number; xp: number; jump?: boolean }) => void;
  recordAnswer: (correct: boolean) => void;
  loseHeart: () => void;
  refillHearts: () => void;
  recordPrompt: (score: number) => void;
  recordImage: () => void;
  recordMode: (mode: string) => void;
  recordShare: () => void;
  completeChallenge: (id: string, prompt: string, score: number) => void;
  usePlayground: () => boolean;
  subscribe: (period: "monthly" | "yearly") => void;
  cancelPlan: () => void;
  equip: (slot: "head" | "face" | "neck", id: string | undefined) => void;
  setSetting: (k: keyof AppData["settings"], v: boolean) => void;
  shiftCelebration: () => void;
  reset: () => void;
}

export type Store = AppData & Actions;

function evaluate(d: AppData): Partial<AppData> {
  const achievements = { ...d.achievements };
  const celebrations = [...d.celebrations];
  for (const a of ACHIEVEMENTS) {
    if (!achievements[a.id] && a.test(d)) {
      achievements[a.id] = new Date().toISOString();
      celebrations.push({ type: "achievement", id: a.id });
    }
  }
  return { achievements, celebrations };
}

function touchStreak(s: AppData["streak"]): AppData["streak"] {
  const today = dayKey();
  if (s.lastDay === today) return s;
  let { count, freezes } = s;
  if (!s.lastDay) count = 1;
  else {
    const gap = daysBetween(s.lastDay, today);
    if (gap === 1) count += 1;
    else if (gap === 2 && freezes > 0) {
      freezes -= 1;
      count += 1;
    } else count = 1;
  }
  return { count, best: Math.max(s.best, count), lastDay: today, freezes };
}

export const useStore = create<Store>()(
  persist(
    (set, get) => {
      const apply = (fn: (d: AppData) => Partial<AppData>) =>
        set((s) => {
          const next = { ...s, ...fn(s) } as AppData;
          return { ...fn(s), ...evaluate(next) };
        });

      return {
        ...initial(),

        completeOnboarding: (p) =>
          apply((s) => ({
            onboarded: true,
            profile: { ...p, createdAt: new Date().toISOString() },
            unlockedWorlds: p.familiarity === "beginner" || p.familiarity === "familiar" ? s.unlockedWorlds : Array.from(new Set([...s.unlockedWorlds, "w2"])),
          })),

        updateProfile: (p) => set((s) => (s.profile ? { profile: { ...s.profile, ...p } } : {})),

        awardXp: (amount, skill) =>
          apply((s) => {
            const today = dayKey();
            const wk = weekKey();
            const before = levelInfo(s.xp).level;
            const xp = s.xp + amount;
            const after = levelInfo(xp).level;
            const celebrations = after > before ? [...s.celebrations, { type: "level" as const, level: after }] : s.celebrations;
            return {
              xp,
              xpByDay: { ...s.xpByDay, [today]: (s.xpByDay[today] ?? 0) + amount },
              weekly: s.weekly.week === wk ? { week: wk, xp: s.weekly.xp + amount } : { week: wk, xp: amount },
              skillXp: skill ? { ...s.skillXp, [skill]: (s.skillXp[skill] ?? 0) + amount } : s.skillXp,
              streak: touchStreak(s.streak),
              celebrations,
            };
          }),

        finishLesson: (lessonId, r) => {
          const lesson = getLesson(lessonId);
          if (!lesson) return;
          const accuracy = r.total ? r.correct / r.total : 1;
          if (r.jump) {
            if (accuracy >= 0.8) {
              apply((s) => ({ unlockedWorlds: Array.from(new Set([...s.unlockedWorlds, lesson.worldId])) }));
            }
            get().awardXp(r.xp, lesson.skill);
            return;
          }
          const wasWorldDone = WORLDS.find((w) => w.id === lesson.worldId)!.lessons.every((l) => get().completed[l.id]);
          apply((s) => {
            const prev = s.completed[lessonId];
            return {
              completed: {
                ...s.completed,
                [lessonId]: {
                  accuracy: Math.max(prev?.accuracy ?? 0, accuracy),
                  xp: (prev?.xp ?? 0) + r.xp,
                  at: new Date().toISOString(),
                  plays: (prev?.plays ?? 0) + 1,
                },
              },
              stats: { ...s.stats, perfectLessons: s.stats.perfectLessons + (accuracy === 1 && r.total > 0 ? 1 : 0) },
            };
          });
          get().awardXp(r.xp, lesson.skill);
          const world = WORLDS.find((w) => w.id === lesson.worldId)!;
          const nowDone = world.lessons.every((l) => get().completed[l.id]);
          if (nowDone && !wasWorldDone) {
            const nextWorld = WORLDS.find((w) => w.n === world.n + 1);
            apply((s) => ({
              celebrations: [...s.celebrations, { type: "world", worldId: world.id }],
              unlockedWorlds: nextWorld ? Array.from(new Set([...s.unlockedWorlds, nextWorld.id])) : s.unlockedWorlds,
            }));
          }
        },

        recordAnswer: (correct) =>
          set((s) => ({ stats: { ...s.stats, answered: s.stats.answered + 1, correct: s.stats.correct + (correct ? 1 : 0) } })),

        loseHeart: () =>
          set((s) => {
            if (s.plan === "plus") return {};
            const cur = currentHearts(s);
            return { hearts: { count: Math.max(0, cur - 1), updatedAt: cur >= MAX_HEARTS ? Date.now() : s.hearts.updatedAt } };
          }),

        refillHearts: () => set({ hearts: { count: MAX_HEARTS, updatedAt: Date.now() } }),

        recordPrompt: (score) =>
          apply((s) => ({ stats: { ...s.stats, promptsWritten: s.stats.promptsWritten + 1, bestPromptScore: Math.max(s.stats.bestPromptScore, score) } })),
        recordImage: () => apply((s) => ({ stats: { ...s.stats, imagesMade: s.stats.imagesMade + 1 } })),
        recordMode: (mode) =>
          apply((s) => ({ stats: { ...s.stats, modesTried: Array.from(new Set([...s.stats.modesTried, mode])) } })),
        recordShare: () => apply((s) => ({ stats: { ...s.stats, shares: s.stats.shares + 1 } })),

        completeChallenge: (id, prompt, score) => {
          const today = dayKey();
          if (get().challenges[today]) return;
          apply((s) => ({ challenges: { ...s.challenges, [today]: { id, prompt, score, at: new Date().toISOString() } } }));
          get().awardXp(30, "everyday");
        },

        usePlayground: () => {
          const s = get();
          const today = dayKey();
          const used = s.playground.day === today ? s.playground.used : 0;
          if (used >= PLAYGROUND_LIMIT[s.plan]) return false;
          set({ playground: { day: today, used: used + 1 } });
          return true;
        },

        subscribe: (period) =>
          apply(() => ({ plan: "plus", planPeriod: period, planSince: new Date().toISOString(), hearts: { count: MAX_HEARTS, updatedAt: Date.now() } })),
        cancelPlan: () =>
          set((s) => {
            const equipped = { ...s.equipped };
            for (const slot of ["head", "face"] as const) {
              if (["sunglasses", "beanie", "wizard"].includes(equipped[slot] ?? "")) delete equipped[slot];
            }
            return { plan: "free", planPeriod: null, planSince: null, equipped };
          }),

        equip: (slot, id) => set((s) => ({ equipped: { ...s.equipped, [slot]: id } })),
        setSetting: (k, v) => set((s) => ({ settings: { ...s.settings, [k]: v } })),
        shiftCelebration: () => set((s) => ({ celebrations: s.celebrations.slice(1) })),
        reset: () => set(initial()),
      };
    },
    {
      name: "aibi-v1",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(s)) if (typeof v !== "function") out[k] = v;
        return out as unknown as Store;
      },
    },
  ),
);

// ---------- Derived selectors ----------
export function currentHearts(s: Pick<AppData, "hearts" | "plan">, now = Date.now()): number {
  if (s.plan === "plus") return Infinity;
  if (s.hearts.count >= MAX_HEARTS) return MAX_HEARTS;
  const regen = Math.floor((now - s.hearts.updatedAt) / HEART_REGEN_MS);
  return Math.min(MAX_HEARTS, s.hearts.count + regen);
}

export function nextHeartIn(s: Pick<AppData, "hearts" | "plan">, now = Date.now()): number {
  if (currentHearts(s, now) >= MAX_HEARTS) return 0;
  const elapsed = (now - s.hearts.updatedAt) % HEART_REGEN_MS;
  return HEART_REGEN_MS - elapsed;
}

export function liveStreak(s: Pick<AppData, "streak">): number {
  if (!s.streak.lastDay) return 0;
  const gap = daysBetween(s.streak.lastDay, dayKey());
  if (gap <= 1) return s.streak.count;
  if (gap === 2 && s.streak.freezes > 0) return s.streak.count;
  return 0;
}

export function activeToday(s: Pick<AppData, "streak">): boolean {
  return s.streak.lastDay === dayKey();
}

export function todayXp(s: Pick<AppData, "xpByDay">): number {
  return s.xpByDay[dayKey()] ?? 0;
}

export function dailyGoal(s: Pick<AppData, "profile">): number {
  return goalXpFor(s.profile?.minutes ?? 5);
}

export function weeklyXp(s: Pick<AppData, "weekly">): number {
  return s.weekly.week === weekKey() ? s.weekly.xp : 0;
}

export function isWorldUnlocked(s: AppData, worldId: string): boolean {
  const w = WORLDS.find((x) => x.id === worldId);
  if (!w) return false;
  if (w.n === 1 || s.unlockedWorlds.includes(worldId)) return true;
  const prev = WORLDS.find((x) => x.n === w.n - 1);
  return !!prev && prev.lessons.every((l) => s.completed[l.id]);
}

export type LessonState = "done" | "current" | "open" | "locked";

export function lessonState(s: AppData, lessonId: string): LessonState {
  const lesson = getLesson(lessonId);
  if (!lesson) return "locked";
  if (s.completed[lessonId]) return "done";
  if (!isWorldUnlocked(s, lesson.worldId)) return "locked";
  const world = WORLDS.find((w) => w.id === lesson.worldId)!;
  const prev = world.lessons[lesson.index - 2];
  if (prev && !s.completed[prev.id]) return "locked";
  return "open";
}

/** The next lesson the learner should play. */
export function nextLesson(s: AppData) {
  for (const l of ALL_LESSONS) {
    const st = lessonState(s, l.id);
    if (st === "open") {
      const world = WORLDS.find((w) => w.id === l.worldId)!;
      if (world.plus && s.plan !== "plus") continue;
      return l;
    }
  }
  return ALL_LESSONS.find((l) => lessonState(s, l.id) === "open") ?? null;
}

export function playgroundLeft(s: AppData): number {
  const used = s.playground.day === dayKey() ? s.playground.used : 0;
  return Math.max(0, PLAYGROUND_LIMIT[s.plan] - used);
}
