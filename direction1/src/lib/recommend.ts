import { CAREERS, CAREER_BY_ID } from '../data/careers';
import { WORLDS, WORLD_BY_ID } from '../data/worlds';
import { TRAITS, TRAIT_LABEL, type Career, type Trait, type TraitVector, type World, type WorldId } from '../data/types';
import { QUESTIONS } from '../data/onboarding';

export interface RecState {
  traits: Record<Trait, number>;
  worldAff: Partial<Record<WorldId, number>>;
  saved: string[];
  activities: { careerId?: string; world: WorldId; enjoy: number | null; ref: string; kind: string }[];
}

const norm = (v: TraitVector) => {
  const m = Math.sqrt(Object.values(v).reduce((s, x) => s + (x ?? 0) ** 2, 0)) || 1;
  return (t: Trait) => (v[t] ?? 0) / m;
};

export function careerScore(c: Career, s: RecState) {
  const n = norm(c.traits);
  let score = 0;
  for (const t of TRAITS) score += s.traits[t] * n(t);
  score += (s.worldAff[c.world] ?? 0) * 0.9;
  if (s.saved.includes(c.id)) score += 1.2;
  const enjoyed = s.activities.filter((a) => a.careerId === c.id && a.enjoy !== null);
  for (const a of enjoyed) score += a.enjoy === 3 ? 1.5 : a.enjoy === 1 ? -1.5 : 0.2;
  return score;
}

export function worldScore(w: World, s: RecState) {
  const n = norm(w.traits);
  let score = 0;
  for (const t of TRAITS) score += s.traits[t] * n(t);
  return score + (s.worldAff[w.id] ?? 0) * 1.1;
}

export const rankCareers = (s: RecState) => [...CAREERS].map((c) => ({ c, score: careerScore(c, s) })).sort((a, b) => b.score - a.score);
export const rankWorlds = (s: RecState) => [...WORLDS].map((w) => ({ w, score: worldScore(w, s) })).sort((a, b) => b.score - a.score);

/** A soft "match" figure. Deliberately capped so it never reads as a verdict. */
export function matchPct(c: Career, s: RecState) {
  const all = rankCareers(s);
  const max = all[0]?.score ?? 1;
  const min = all[all.length - 1]?.score ?? 0;
  const sc = careerScore(c, s);
  const t = max === min ? 0.5 : (sc - min) / (max - min);
  return Math.round(52 + t * 42);
}

export function topTraits(s: RecState, n = 3) {
  return [...TRAITS].map((t) => ({ t, v: s.traits[t] })).sort((a, b) => b.v - a.v).slice(0, n).filter((x) => x.v > 0);
}

export const TRAIT_BLURB: Record<Trait, string> = {
  creative: 'You see possibilities others miss and love making ideas real.',
  analytical: 'You enjoy figuring out how things work and solving puzzles.',
  caring: 'People trust you. You notice how others feel and want to help.',
  leading: 'You get things moving and people tend to follow your energy.',
  hands: 'You learn by doing and love seeing tangible results.',
  tech: 'You’re at home with technology and enjoy bending it to your will.',
  nature: 'You feel most alive outdoors and care about the living world.',
  active: 'You’ve got energy to burn and hate sitting still for long.',
  risk: 'You’re up for a challenge and not scared of the unknown.',
  wealth: 'You’re ambitious and want your work to pay off.',
  impact: 'You want your work to mean something bigger than you.',
  explore: 'You’re curious about everything and hungry for new experiences.',
};

export function reasonFor(c: Career, s: RecState): string {
  const enjoyed = s.activities.find((a) => a.careerId === c.id && a.enjoy === 3);
  if (enjoyed) return `You loved the ${c.title} activity`;
  const enjoyedWorld = s.activities.find((a) => a.world === c.world && a.enjoy === 3);
  if (enjoyedWorld) return `You enjoyed exploring ${WORLD_BY_ID[c.world].short}`;
  if (s.saved.includes(c.id)) return 'You saved this one';
  const n = norm(c.traits);
  const best = [...TRAITS].map((t) => ({ t, v: s.traits[t] * n(t) })).sort((a, b) => b.v - a.v)[0];
  return best && best.v > 0 ? `Fits your ${TRAIT_LABEL[best.t].toLowerCase()} side` : 'Something new to try';
}

/** Build the starting trait + world vectors from onboarding answers. */
export function seedFromAnswers(answers: Record<string, string[]>) {
  const traits = Object.fromEntries(TRAITS.map((t) => [t, 0])) as Record<Trait, number>;
  const worlds: Partial<Record<WorldId, number>> = {};
  for (const q of QUESTIONS) {
    const picked = answers[q.id] ?? [];
    if (q.id === 'curious') { picked.forEach((w) => (worlds[w as WorldId] = (worlds[w as WorldId] ?? 0) + 2)); continue; }
    for (const o of q.options ?? []) {
      if (!picked.includes(o.id)) continue;
      for (const [t, v] of Object.entries(o.traits ?? {})) traits[t as Trait] += v as number;
      for (const [w, v] of Object.entries(o.worlds ?? {})) worlds[w as WorldId] = (worlds[w as WorldId] ?? 0) + (v as number);
    }
  }
  // keep scale gentle so activities can meaningfully reshape it later
  for (const t of TRAITS) traits[t] = Math.round(traits[t] * 0.6 * 10) / 10;
  for (const w of Object.keys(worlds) as WorldId[]) worlds[w] = Math.round((worlds[w] ?? 0) * 0.5 * 10) / 10;
  return { traits, worlds };
}

export const careerById = (id: string) => CAREER_BY_ID[id];
