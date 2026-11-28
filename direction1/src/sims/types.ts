import type { GlyphName, SkillId, WorldId } from '../data/types';

export type Answers = Record<string, unknown>;

export interface Opt {
  id: string;
  label: string;
  detail?: string;
  glyph?: GlyphName;
  /** 0–3: how strong a professional choice this is */
  score: number;
  feedback: string;
  skills?: SkillId[];
  /** bonus/penalty when combined with an earlier choice */
  combo?: { step: string; options: string[]; delta: number; note: string }[];
  cost?: number;
  tags?: string[];
}

interface Base { id: string; title: string; prompt: string; scout?: string; plus?: boolean }

export type Step =
  | (Base & { kind: 'choice'; options: Opt[] })
  | (Base & { kind: 'multi'; pick: number; options: Opt[] })
  | (Base & { kind: 'allocate'; total: number; channels: { id: string; label: string; glyph: GlyphName; detail: string }[] })
  | (Base & { kind: 'slider'; unit: string; range: (a: Answers) => { min: number; max: number; step: number; initial: number; hint?: string }; judge: (v: number, a: Answers) => { score: number; feedback: string } })
  | (Base & { kind: 'spot'; pick: number; evidence: { label: string; text: string; glyph: GlyphName }[]; items: { id: string; text: string; flaw: boolean; explain: string }[] })
  | (Base & { kind: 'ask'; maxAsk: number; questions: { id: string; q: string; a: string; useful: boolean }[] })
  | (Base & { kind: 'floorplan' })
  | (Base & { kind: 'code' });

export interface StepResult { score: number; feedback: string[]; skills: SkillId[] }

export interface Outcome {
  headline: string;
  lines: string[];
  /** optional bars to chart, e.g. weekly sales */
  chart?: { label: string; value: number }[];
  chartLabel?: string;
  bonus?: number; // 0..1 overall adjustment
}

export interface Sim {
  id: string;
  title: string;
  role: string;
  careerId: string;
  world: WorldId;
  minutes: number;
  glyph: GlyphName;
  client: string;
  brief: string;
  preview?: 'poster' | 'scene' | 'app' | 'none';
  steps: Step[];
  evaluate?: (a: Answers, results: Record<string, StepResult>) => Outcome;
  disclaimer?: string;
}
