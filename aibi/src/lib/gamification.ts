import type { AppData } from "./store";
import { WORLDS } from "@/content/curriculum";

// ---------- Levels ----------
export const LEVEL_TITLES = [
  "Curious Beginner",
  "Prompt Apprentice",
  "AI Explorer",
  "Smart Asker",
  "Confident User",
  "AI Navigator",
  "Power User",
  "AI Pro",
  "AI Expert",
  "AI Master",
  "AI Legend",
];

/** Total XP needed to reach `level` (level 1 = 0 XP). */
export function xpForLevel(level: number): number {
  const n = level - 1;
  return 25 * n * n + 35 * n;
}

export function levelInfo(xp: number) {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level++;
  const base = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return {
    level,
    title: LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)],
    into: xp - base,
    span: next - base,
    pct: (xp - base) / (next - base),
    next,
  };
}

// ---------- World completion ----------
export function worldComplete(d: AppData, worldId: string): boolean {
  const w = WORLDS.find((x) => x.id === worldId);
  return !!w && w.lessons.every((l) => d.completed[l.id]);
}
export function worldProgress(d: AppData, worldId: string): number {
  const w = WORLDS.find((x) => x.id === worldId);
  if (!w) return 0;
  return w.lessons.filter((l) => d.completed[l.id]).length / w.lessons.length;
}
export function worldAccuracy(d: AppData, worldId: string): number {
  const w = WORLDS.find((x) => x.id === worldId);
  if (!w) return 0;
  const done = w.lessons.map((l) => d.completed[l.id]).filter(Boolean);
  if (!done.length) return 0;
  return done.reduce((s, c) => s + c!.accuracy, 0) / done.length;
}

// ---------- Achievements ----------
export interface Achievement {
  id: string;
  title: string;
  desc: string;
  icon: string;
  tint: string;
  test: (d: AppData) => boolean;
}

const lessonsDone = (d: AppData) => Object.keys(d.completed).length;

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first-steps", title: "First Steps", desc: "Complete your first lesson", icon: "👣", tint: "#7C4DFF", test: (d) => lessonsDone(d) >= 1 },
  { id: "on-a-roll", title: "On a Roll", desc: "Complete 5 lessons", icon: "🎯", tint: "#2696F0", test: (d) => lessonsDone(d) >= 5 },
  { id: "dedicated", title: "Dedicated", desc: "Complete 20 lessons", icon: "📚", tint: "#22A152", test: (d) => lessonsDone(d) >= 20 },
  { id: "streak-3", title: "Warming Up", desc: "Reach a 3-day streak", icon: "🔥", tint: "#F5A70B", test: (d) => d.streak.best >= 3 },
  { id: "streak-7", title: "Week Warrior", desc: "Reach a 7-day streak", icon: "⚡", tint: "#F5564A", test: (d) => d.streak.best >= 7 },
  { id: "streak-30", title: "Unstoppable", desc: "Reach a 30-day streak", icon: "🌋", tint: "#D93D32", test: (d) => d.streak.best >= 30 },
  { id: "perfect", title: "Flawless", desc: "Finish a lesson with no mistakes", icon: "💎", tint: "#4FB2FF", test: (d) => d.stats.perfectLessons >= 1 },
  { id: "prompt-pro", title: "Prompt Pro", desc: "Score 90+ on a written prompt", icon: "✍️", tint: "#7C4DFF", test: (d) => d.stats.bestPromptScore >= 90 },
  { id: "fact-checker", title: "Fact Checker", desc: "Master spotting hallucinations", icon: "🔍", tint: "#5726CC", test: (d) => !!d.completed["w1-l6"] },
  { id: "privacy", title: "Privacy Guardian", desc: "Learn what never to share", icon: "🛡️", tint: "#22A152", test: (d) => !!d.completed["w1-l7"] },
  { id: "world-1", title: "AI Aware", desc: "Complete World 1: Meet AI", icon: "👋", tint: "#8B5CF6", test: (d) => worldComplete(d, "w1") },
  { id: "world-2", title: "Prompt Whisperer", desc: "Complete World 2: Talk to AI", icon: "💬", tint: "#C084FC", test: (d) => worldComplete(d, "w2") },
  { id: "challenger", title: "Challenger", desc: "Complete a daily challenge", icon: "🏅", tint: "#F5A70B", test: (d) => Object.keys(d.challenges).length >= 1 },
  { id: "challenger-7", title: "Challenge Champion", desc: "Complete 7 daily challenges", icon: "🏆", tint: "#F5A70B", test: (d) => Object.keys(d.challenges).length >= 7 },
  { id: "artist", title: "Digital Artist", desc: "Generate your first image", icon: "🎨", tint: "#F0479A", test: (d) => d.stats.imagesMade >= 1 },
  { id: "tinkerer", title: "Tinkerer", desc: "Try 3 Playground modes", icon: "🧪", tint: "#2DBE63", test: (d) => d.stats.modesTried.length >= 3 },
  { id: "sharer", title: "Spread the Word", desc: "Share an achievement card", icon: "📣", tint: "#2696F0", test: (d) => d.stats.shares >= 1 },
  { id: "xp-500", title: "Rising Star", desc: "Earn 500 XP", icon: "⭐", tint: "#FFC53D", test: (d) => d.xp >= 500 },
  { id: "xp-2000", title: "Superstar", desc: "Earn 2,000 XP", icon: "🌟", tint: "#F5A70B", test: (d) => d.xp >= 2000 },
  { id: "plus", title: "Plus Member", desc: "Join AIBI Plus", icon: "👑", tint: "#F5A70B", test: (d) => d.plan === "plus" },
  { id: "master", title: "AI Master", desc: "Complete all 8 worlds", icon: "🏆", tint: "#5726CC", test: (d) => WORLDS.every((w) => worldComplete(d, w.id)) },
];

// ---------- Mascot accessories ----------
export type Slot = "head" | "face" | "neck";
export interface Accessory {
  id: string;
  name: string;
  slot: Slot;
  unlock: { type: "level"; level: number } | { type: "achievement"; id: string } | { type: "plus" } | { type: "free" };
}

export const ACCESSORIES: Accessory[] = [
  { id: "party-hat", name: "Party hat", slot: "head", unlock: { type: "achievement", id: "first-steps" } },
  { id: "headphones", name: "Headphones", slot: "head", unlock: { type: "level", level: 2 } },
  { id: "glasses", name: "Smart specs", slot: "face", unlock: { type: "level", level: 3 } },
  { id: "bowtie", name: "Bow tie", slot: "neck", unlock: { type: "achievement", id: "streak-3" } },
  { id: "flower", name: "Daisy", slot: "head", unlock: { type: "achievement", id: "challenger" } },
  { id: "scarf", name: "Cosy scarf", slot: "neck", unlock: { type: "level", level: 4 } },
  { id: "grad-cap", name: "Graduation cap", slot: "head", unlock: { type: "achievement", id: "world-1" } },
  { id: "crown", name: "Golden crown", slot: "head", unlock: { type: "achievement", id: "streak-7" } },
  { id: "sunglasses", name: "Cool shades", slot: "face", unlock: { type: "plus" } },
  { id: "beanie", name: "Plus beanie", slot: "head", unlock: { type: "plus" } },
  { id: "wizard", name: "Wizard hat", slot: "head", unlock: { type: "plus" } },
  { id: "medal", name: "Gold medal", slot: "neck", unlock: { type: "achievement", id: "prompt-pro" } },
];

export function accessoryUnlocked(a: Accessory, d: AppData): boolean {
  switch (a.unlock.type) {
    case "free":
      return true;
    case "plus":
      return d.plan === "plus";
    case "level":
      return levelInfo(d.xp).level >= a.unlock.level;
    case "achievement":
      return !!d.achievements[a.unlock.id];
  }
}

export function unlockLabel(a: Accessory): string {
  switch (a.unlock.type) {
    case "free":
      return "Free";
    case "plus":
      return "AIBI Plus";
    case "level":
      return `Reach level ${a.unlock.level}`;
    case "achievement": {
      const id = a.unlock.id;
      return ACHIEVEMENTS.find((x) => x.id === id)?.desc ?? "Achievement";
    }
  }
}
