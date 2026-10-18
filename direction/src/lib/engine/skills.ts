import { SKILLS, skillTier } from "../content/skills";
import type { Completion } from "./model";

/** Self-declared skills from onboarding start at "Curious"; everything else is earned. */
export const DECLARED_SKILL_POINTS = 10;

export function skillPoints(completions: Completion[], declared: string[] = []): Map<string, number> {
  const pts = new Map<string, number>();
  for (const id of declared) pts.set(id, DECLARED_SKILL_POINTS);
  for (const c of completions) for (const s of c.skillPoints) pts.set(s.id, (pts.get(s.id) ?? 0) + s.points);
  return pts;
}

export interface SkillSummary {
  id: string;
  name: string;
  family: string;
  points: number;
  tier: number;
  tierName: string;
  progress: number;
}

export function summariseSkills(points: Map<string, number>): SkillSummary[] {
  return SKILLS.map((s) => {
    const p = points.get(s.id) ?? 0;
    const t = skillTier(p);
    return { id: s.id, name: s.name, family: s.family, points: p, tier: t.tier, tierName: t.name, progress: t.progress };
  })
    .filter((s) => s.points > 0)
    .sort((a, b) => b.points - a.points);
}

/**
 * How ready someone is for a career, from transferable skills. Progress on any
 * path counts towards every career that uses the same skills.
 */
export function careerReadiness(careerSkills: string[], points: Map<string, number>): number {
  if (!careerSkills.length) return 0;
  const target = 70; // "Capable"
  const sum = careerSkills.reduce((n, s) => n + Math.min(1, (points.get(s) ?? 0) / target), 0);
  return Math.round((sum / careerSkills.length) * 100);
}
