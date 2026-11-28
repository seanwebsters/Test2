import type { Criterion } from "@/content/types";

// Offline prompt scoring. Runs instantly in the browser, so every lesson works
// with or without an AI connection; live coaching adds to it when available.

export interface ScoreResult {
  score: number;
  words: number;
  passed: Criterion[];
  missed: Criterion[];
}

export function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

export function passes(c: Criterion, prompt: string): boolean {
  const words = wordCount(prompt);
  if (c.minWords && words < c.minWords) return false;
  if (c.any && c.any.length) return c.any.some((src) => new RegExp(src, "i").test(prompt));
  return true;
}

export function scorePrompt(prompt: string, criteria: Criterion[]): ScoreResult {
  const words = wordCount(prompt);
  const passed = criteria.filter((c) => passes(c, prompt));
  const missed = criteria.filter((c) => !passes(c, prompt));
  const base = criteria.length ? (passed.length / criteria.length) * 88 : 60;
  const lengthBonus = Math.min(12, Math.max(0, (words - 8) / 3));
  const score = words < 4 ? Math.min(15, Math.round(base / 3)) : Math.round(Math.min(100, base + lengthBonus));
  return { score, words, passed, missed };
}

export function scoreLabel(score: number): { label: string; tone: "great" | "good" | "ok" | "weak" } {
  if (score >= 85) return { label: "Brilliant prompt!", tone: "great" };
  if (score >= 65) return { label: "Strong prompt", tone: "good" };
  if (score >= 40) return { label: "Good start", tone: "ok" };
  return { label: "Needs more detail", tone: "weak" };
}
