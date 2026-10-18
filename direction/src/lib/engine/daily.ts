import { getCareer } from "../content/careers";
import { findMission, getPath } from "../content/paths";
import type { Mission } from "../content/types";
import { challengeDay, nextChallengeDay } from "./challenge";
import type { UserState } from "./model";
import { nextMissions, pathProgress } from "./progression";
import { skillPoints } from "./skills";

function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

export function targetCount(minutesPerDay: number): number {
  if (minutesPerDay >= 60) return 5;
  if (minutesPerDay >= 30) return 4;
  return 3;
}

interface Candidate {
  mission: Mission;
  careerSlug: string;
  score: number;
  reason: string;
}

/**
 * Builds today's 3–5 missions. The plan is stored once per day so it stays
 * stable as missions are completed.
 *
 * - Leads with the next real steps on the user's active path(s).
 * - Favours skills they're weakest in, and varies the kind of activity.
 * - Respects their daily time budget, with at most one "stretch" mission.
 * - Adds today's Discovery Challenge mission and a curiosity mission from a
 *   related career, so exploring never stops.
 * - Never repeats completed missions.
 */
export function generateDailyPlan(state: UserState, day: string): string[] {
  const rnd = seeded(`${state.profile.id}:${day}`);
  const minutes = state.profile.onboarding?.minutesPerDay ?? 15;
  const target = targetCount(minutes);
  const done = new Set(state.completions.map((c) => c.missionId));
  const pts = skillPoints(state.completions, state.profile.onboarding?.skills ?? []);
  const recentKinds = state.completions
    .slice()
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
    .slice(0, 4)
    .map((c) => findMission(c.missionId)?.mission.kind);
  const budget = Math.max(20, minutes * 1.5);

  const scoreMission = (m: Mission, base: number): number => {
    let s = base;
    // Weak skills first: the lower the points, the bigger the boost.
    const weakness = m.skills.reduce((n, sk) => n + 1 / (1 + (pts.get(sk.id) ?? 0) / 20), 0) / Math.max(1, m.skills.length);
    s += weakness * 2;
    if (recentKinds.includes(m.kind)) s -= 0.8;
    if (m.minutes > budget) s -= 2;
    return s + rnd() * 0.5;
  };

  const picked: Candidate[] = [];
  const has = (id: string) => picked.some((p) => p.mission.id === id);

  // Challenge mission comes first if the challenge is running.
  const ch = state.profile.challenge;
  if (ch && !ch.finishedAt) {
    const n = nextChallengeDay(ch, day);
    if (n !== null) {
      const cd = challengeDay(ch.careers, n);
      if (!done.has(cd.mission.id)) picked.push({ mission: cd.mission, careerSlug: cd.careerSlug, score: 99, reason: `Discovery Challenge · Day ${n}` });
    }
  }

  const active = state.paths
    .filter((p) => p.status === "active")
    .sort((a, b) => b.lastActiveAt.localeCompare(a.lastActiveAt));

  active.forEach((up, index) => {
    const path = getPath(up.careerSlug);
    if (!path) return;
    const prog = pathProgress(path, state.completions.filter((c) => c.careerSlug === up.careerSlug).map((c) => c.missionId), up.skippedThrough);
    const cands = nextMissions(prog, 8)
      .filter((m) => !done.has(m.id))
      .map((m, i) => ({ mission: m, careerSlug: up.careerSlug, score: scoreMission(m, 10 - i * 0.6 - index * 2), reason: `${path.title} · Level ${prog.currentLevel}` }))
      .sort((a, b) => b.score - a.score);
    const quota = index === 0 ? Math.max(2, target - 1) : 1;
    let stretch = picked.some((p) => p.mission.minutes > budget);
    for (const c of cands) {
      if (picked.length >= target || picked.filter((p) => p.careerSlug === up.careerSlug).length >= quota) break;
      if (has(c.mission.id)) continue;
      if (c.mission.minutes > budget) {
        if (stretch) continue;
        stretch = true;
      }
      picked.push(c);
    }
  });

  // Curiosity: a level-1 mission from a related career or a top match not yet started.
  if (picked.length < target) {
    const exploring = new Set(active.map((p) => p.careerSlug));
    const primary = active[0] ? getCareer(active[0].careerSlug) : undefined;
    const pool = [...(primary?.related ?? []), ...state.profile.matches.map((m) => m.careerSlug)].filter((s) => !exploring.has(s));
    const unique = [...new Set(pool)];
    for (let i = 0; i < unique.length && picked.length < target; i++) {
      const slug = unique[Math.floor(rnd() * unique.length)]!;
      const path = getPath(slug);
      const m = path?.levels[0]?.missions.find((x) => !x.quest && !done.has(x.id) && !has(x.id));
      if (m && m.minutes <= budget) {
        picked.push({ mission: m, careerSlug: slug, score: 1, reason: `Curious about ${path!.title}?` });
        break;
      }
    }
  }

  // Still short (e.g. no active path yet): fill from top matches.
  for (const m of state.profile.matches) {
    if (picked.length >= target) break;
    const path = getPath(m.careerSlug);
    const mission = path?.levels[0]?.missions.find((x) => !x.quest && !done.has(x.id) && !has(x.id));
    if (mission) picked.push({ mission, careerSlug: m.careerSlug, score: 0, reason: `Explore ${path!.title}` });
  }

  return picked.slice(0, target).map((p) => p.mission.id);
}

/** One extra mission for people who finish everything and want more. */
export function bonusMission(state: UserState, existing: string[]): string | null {
  const done = new Set([...state.completions.map((c) => c.missionId), ...existing]);
  for (const up of state.paths.filter((p) => p.status === "active")) {
    const path = getPath(up.careerSlug);
    if (!path) continue;
    const prog = pathProgress(path, state.completions.filter((c) => c.careerSlug === up.careerSlug).map((c) => c.missionId), up.skippedThrough);
    const m = nextMissions(prog, 10).find((x) => !done.has(x.id));
    if (m) return m.id;
  }
  return null;
}
