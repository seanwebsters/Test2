import type { CategoryId, Rarity } from "./types";

export const XP = {
  episode: 50,
  seriesComplete: 200,
  challengeFirstTry: 25,
  newCategory: 75,
  streakDay: 10,
  insight: 5,
} as const;

export function xpForLevel(level: number): number {
  return level <= 1 ? 0 : Math.round(60 * Math.pow(level - 1, 1.6));
}

export function levelFor(xp: number): number {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  return level;
}

const TITLES: [number, string][] = [
  [50, "Know-it-all"],
  [35, "Oracle"],
  [20, "Polymath"],
  [15, "Scholar-ish"],
  [10, "Thinker"],
  [8, "Deep Diver"],
  [5, "Explorer"],
  [3, "Nosy"],
  [1, "Curious"],
];

export function levelTitle(level: number): string {
  return TITLES.find(([min]) => level >= min)![1];
}

export function levelProgress(xp: number) {
  const level = levelFor(xp);
  const floor = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return { level, title: levelTitle(level), floor, next, into: xp - floor, span: next - floor, pct: (xp - floor) / (next - floor) };
}

export const RARITY_ORDER: Rarity[] = ["common", "uncommon", "rare", "epic", "legendary"];

export const RARITY_STYLE: Record<Rarity, { label: string; color: string; glow: string }> = {
  common: { label: "Common", color: "#F7F4E9", glow: "rgba(247,244,233,0.25)" },
  uncommon: { label: "Uncommon", color: "#7CF2A6", glow: "rgba(124,242,166,0.35)" },
  rare: { label: "Rare", color: "#587BFF", glow: "rgba(88,123,255,0.45)" },
  epic: { label: "Epic", color: "#B6A1FF", glow: "rgba(182,161,255,0.5)" },
  legendary: { label: "Legendary", color: "#DFFF57", glow: "rgba(223,255,87,0.55)" },
};

/** Milestone cards that aren't tied to a single series or category. */
export const MILESTONE_CARDS: Record<string, { title: string; rarity: Rarity; how: string; fact: string; glyph: string }> = {
  "streak-7": { title: "Seven Day Mind", rarity: "epic", how: "Listened seven days in a row.", fact: "In one UCL study, new habits took an average of 66 days to feel automatic. You're a week in.", glyph: "7" },
  "streak-30": { title: "Month of Mind", rarity: "legendary", how: "Kept a 30-day listening streak.", fact: "Thirty straight days. Most streaks die within the first week.", glyph: "30" },
  "insights-10": { title: "Insight Hoarder", rarity: "uncommon", how: "Saved ten insights.", fact: "Writing things down — or saving them — is one of the simplest ways to remember them.", glyph: "✦" },
  "recall-5": { title: "Perfect Recall", rarity: "uncommon", how: "Answered five recall challenges right first time.", fact: "Testing yourself (retrieval practice) is one of the best-evidenced ways to remember.", glyph: "✓" },
  "tri-universe": { title: "Three Universes", rarity: "epic", how: "Completed series in three different categories.", fact: "Learning across fields builds more connections for new ideas to hook into.", glyph: "△" },
  polymath: { title: "Polymath", rarity: "legendary", how: "Finished episodes in all ten categories.", fact: "History, science, money, mind, space and more. Your universe has no dark corners left.", glyph: "∞" },
  "night-owl": { title: "Night Owl", rarity: "uncommon", how: "Finished an episode between midnight and 4am.", fact: "Most vivid dreams happen in REM sleep — which you're currently not getting.", glyph: "☾" },
};

export type CardKey = `series:${string}` | `category:${CategoryId}` | keyof typeof MILESTONE_CARDS;

export function seriesCardRarity(releasedCount: number): Rarity {
  if (releasedCount >= 3) return "rare";
  if (releasedCount === 2) return "uncommon";
  return "common";
}
