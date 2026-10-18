import { CAREERS } from "../content/careers";
import { INTERESTS, LIFESTYLES, SUBJECTS, SWIPE_CARDS, THIS_OR_THAT, VALUE_LABELS } from "../content/onboarding";
import { skillName } from "../content/skills";
import type { Career, ValueKey, WorkMode } from "../content/types";
import type { MatchReason, MatchResult, OnboardingAnswers } from "./model";

const MODES: WorkMode[] = ["create", "solve", "help", "lead"];
const VALUES: ValueKey[] = ["money", "creativity", "stability", "flexibility", "impact"];

export interface UserVector {
  interests: Map<string, number>;
  modes: Record<WorkMode, number>;
  social: number;
  values: Record<ValueKey, number>;
}

/**
 * Turns onboarding answers into a profile vector. Every signal is traceable to
 * an answer so recommendations can be explained in the user's own words.
 */
export function buildUserVector(a: OnboardingAnswers): UserVector {
  const interests = new Map<string, number>();
  const add = (id: string, w: number) => interests.set(id, (interests.get(id) ?? 0) + w);
  for (const i of a.interests) add(i, 1);
  for (const s of a.subjects) for (const i of SUBJECTS.find((x) => x.id === s)?.interests ?? []) add(i, 0.5);

  const modes: Record<WorkMode, number> = { create: 0, solve: 0, help: 0, lead: 0 };
  for (const card of SWIPE_CARDS) {
    const r = a.swipes[card.id];
    if (!r) continue;
    const w = r === "love" ? 1.4 : r === "yes" ? 0.8 : -0.3;
    for (const i of card.interests) add(i, w);
    if (w > 0) for (const [m, v] of Object.entries(card.modes)) modes[m as WorkMode] += v * w;
  }

  let socialSignal = a.social;
  let socialCount = 1;
  const values: Record<ValueKey, number> = { money: 0, creativity: 0, stability: 0, flexibility: 0, impact: 0 };
  for (const k of VALUES) values[k] = (a.values[k] ?? 0) / 5;

  for (const q of THIS_OR_THAT) {
    const pick = a.thisOrThat[q.id];
    if (!pick) continue;
    const side = q[pick];
    for (const [m, v] of Object.entries(side.modes ?? {})) modes[m as WorkMode] += v;
    if (side.social !== undefined) {
      socialSignal += side.social;
      socialCount += 1;
    }
    for (const [k, v] of Object.entries(side.values ?? {})) values[k as ValueKey] += v * 0.3;
  }

  const life = LIFESTYLES.find((l) => l.id === a.lifestyle);
  if (life) {
    for (const [k, v] of Object.entries(life.values)) values[k as ValueKey] += v * 0.4;
    if (life.social !== undefined) {
      socialSignal += life.social;
      socialCount += 1;
    }
  }

  const maxMode = Math.max(...MODES.map((m) => modes[m]), 0.0001);
  for (const m of MODES) modes[m] = Math.max(0, modes[m]) / maxMode;
  const maxVal = Math.max(...VALUES.map((k) => values[k]), 0.0001);
  for (const k of VALUES) values[k] = values[k] / maxVal;

  return { interests, modes, social: socialSignal / socialCount, values };
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  if (na === 0 || nb === 0) return 0.5;
  return dot / Math.sqrt(na * nb);
}

export interface ScoreBreakdown {
  interest: number;
  mode: number;
  values: number;
  social: number;
  skill: number;
  bonus: number;
  raw: number;
}

export function scoreCareer(
  career: Career,
  v: UserVector,
  a: OnboardingAnswers,
  feedback: Record<string, number> = {},
): ScoreBreakdown {
  let interestRaw = 0;
  for (const i of career.interests) interestRaw += Math.max(0, v.interests.get(i) ?? 0);
  // Weight a career's first-listed interests a little more by dividing by a soft count.
  const interest = interestRaw / (interestRaw + 1.6);

  const t = career.traits;
  const mode = cosine(MODES.map((m) => v.modes[m]), [t.create, t.solve, t.help, t.lead]);
  const values = cosine(VALUES.map((k) => v.values[k]), [t.money, t.creativity, t.stability, t.flexibility, t.impact]);
  const social = 1 - Math.abs(v.social - t.social);
  const owned = career.skills.filter((s) => a.skills.includes(s)).length;
  const skill = career.skills.length ? owned / career.skills.length : 0;
  let bonus = a.considered.includes(career.slug) ? 0.06 : 0;
  bonus += (feedback[career.slug] ?? 0) * 0.08;

  const raw = 0.44 * interest + 0.22 * mode + 0.18 * values + 0.08 * social + 0.08 * skill + bonus;
  return { interest, mode, values, social, skill, bonus, raw };
}

/** Exploratory compatibility indicator, not a scientific aptitude score. */
export function toPercent(raw: number): number {
  const t = Math.max(0, Math.min(1, (raw - 0.3) / 0.65));
  return Math.max(30, Math.min(97, Math.round(30 + 67 * Math.pow(t, 1.3))));
}

const MODE_PHRASES: Record<WorkMode, string> = {
  create: "you light up when you get to make something new",
  solve: "you'd rather crack a hard problem than coast",
  help: "helping people matters a lot to you",
  lead: "you like being the one who sets the direction",
};

export function explain(career: Career, v: UserVector, a: OnboardingAnswers, b: ScoreBreakdown): MatchReason[] {
  const reasons: MatchReason[] = [];
  const loved = SWIPE_CARDS.filter((c) => (a.swipes[c.id] === "love" || a.swipes[c.id] === "yes") && c.interests.some((i) => career.interests.includes(i)));
  const lovedFirst = loved.sort((x, y) => (a.swipes[y.id] === "love" ? 1 : 0) - (a.swipes[x.id] === "love" ? 1 : 0));
  if (lovedFirst[0]) {
    const verb = a.swipes[lovedFirst[0].id] === "love" ? "loved" : "swiped right on";
    reasons.push({ kind: "swipe", text: `You ${verb} "${lovedFirst[0].title.toLowerCase()}".` });
  }
  const sharedInterests = a.interests.filter((i) => career.interests.includes(i));
  if (sharedInterests.length) {
    const labels = sharedInterests.slice(0, 2).map((i) => INTERESTS.find((x) => x.id === i)?.label.toLowerCase() ?? i);
    reasons.push({ kind: "interest", text: `You said you're into ${labels.join(" and ")}.` });
  }
  const topMode = (["create", "solve", "help", "lead"] as WorkMode[]).sort((x, y) => v.modes[y] - v.modes[x])[0]!;
  if (career.traits[topMode] >= 0.6 && v.modes[topMode] > 0) {
    reasons.push({ kind: "mode", text: `Your answers show ${MODE_PHRASES[topMode]}, which is at the heart of this job.` });
  }
  const topValue = VALUES.slice().sort((x, y) => v.values[y] - v.values[x])[0]!;
  if (career.traits[topValue] >= 0.6 && v.values[topValue] > 0.5) {
    reasons.push({ kind: "value", text: `${VALUE_LABELS[topValue].label} is one of your top values, and this career scores high on it.` });
  }
  if (b.social > 0.8) {
    reasons.push({
      kind: "social",
      text: v.social >= 0.5 ? "You like working with people, and this is a team-heavy role." : "You like focused independent work, and this role gives you plenty of it.",
    });
  }
  const owned = career.skills.filter((s) => a.skills.includes(s));
  if (owned.length) reasons.push({ kind: "skill", text: `You already have ${owned.slice(0, 2).map((s) => skillName(s).toLowerCase()).join(" and ")} skills to build on.` });
  if (a.considered.includes(career.slug)) reasons.push({ kind: "considered", text: "It's already on your radar — that curiosity counts." });
  return reasons.slice(0, 4);
}

export function rankCareers(a: OnboardingAnswers, feedback: Record<string, number> = {}, careers: Career[] = CAREERS): MatchResult[] {
  const v = buildUserVector(a);
  return careers
    .map((c) => {
      const b = scoreCareer(c, v, a, feedback);
      return { career: c, b };
    })
    .sort((x, y) => y.b.raw - x.b.raw)
    .map(({ career, b }) => ({ careerSlug: career.slug, percent: toPercent(b.raw), reasons: explain(career, v, a, b) }));
}

export function topDirections(a: OnboardingAnswers, feedback: Record<string, number> = {}, n = 3): MatchResult[] {
  return rankCareers(a, feedback).slice(0, n);
}

/** Converts mission ratings into a per-career feedback signal in −1..1. */
export function feedbackFromRatings(ratings: { careerSlug: string; rating: number | null }[]): Record<string, number> {
  const sums: Record<string, { s: number; n: number }> = {};
  for (const r of ratings) {
    if (r.rating === null) continue;
    const e = (sums[r.careerSlug] ??= { s: 0, n: 0 });
    e.s += r.rating;
    e.n += 1;
  }
  const out: Record<string, number> = {};
  for (const [k, { s, n }] of Object.entries(sums)) out[k] = s / Math.max(n, 2);
  return out;
}

export function emptyAnswers(): OnboardingAnswers {
  return {
    name: "",
    status: "exploring",
    swipes: {},
    thisOrThat: {},
    interests: [],
    subjects: [],
    social: 0.5,
    lifestyle: null,
    values: { money: 2, creativity: 2, stability: 2, flexibility: 2, impact: 2 },
    skills: [],
    considered: [],
    country: "United Kingdom",
    city: "",
    minutesPerDay: 15,
  };
}
