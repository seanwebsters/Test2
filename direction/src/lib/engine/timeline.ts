import { ACHIEVEMENTS } from "../content/achievements";
import { getCareer } from "../content/careers";
import { findMission, getPath } from "../content/paths";
import type { UserState } from "./model";
import { pathProgress } from "./progression";

export interface TimelineEvent {
  at: string;
  kind: "start" | "path" | "level" | "achievement" | "project" | "passport";
  title: string;
  detail?: string;
  emoji: string;
}

/** A chronological story of the user's journey, newest first. */
export function buildTimeline(state: UserState): TimelineEvent[] {
  const ev: TimelineEvent[] = [];
  if (state.profile.onboardedAt) ev.push({ at: state.profile.onboardedAt, kind: "start", title: "Discovered their direction", emoji: "🧭" });
  for (const p of state.paths) {
    ev.push({ at: p.startedAt, kind: "path", title: `Started the ${getCareer(p.careerSlug)?.title ?? p.careerSlug} path`, emoji: "🛤️" });
  }
  // Replay completions per path to find when each level was completed.
  for (const p of state.paths) {
    const path = getPath(p.careerSlug);
    if (!path) continue;
    const list = state.completions.filter((c) => c.careerSlug === p.careerSlug).sort((a, b) => a.completedAt.localeCompare(b.completedAt));
    const done: string[] = [];
    let completed = 0;
    for (const c of list) {
      done.push(c.missionId);
      const prog = pathProgress(path, done, p.skippedThrough);
      const n = prog.levels.filter((l) => l.status === "complete").length;
      if (n > completed) {
        const lvl = prog.levels.filter((l) => l.status === "complete").at(-1)!;
        ev.push({ at: c.completedAt, kind: "level", title: `Completed ${path.title} level ${lvl.level.n}: ${lvl.level.title}`, detail: lvl.level.milestone, emoji: "⛰️" });
        completed = n;
      }
    }
  }
  for (const c of state.completions) {
    const m = findMission(c.missionId)?.mission;
    if (m?.tags?.includes("project") && c.evidence) ev.push({ at: c.completedAt, kind: "project", title: m.title.replace(/^Quest: /, ""), detail: c.evidence.slice(0, 140), emoji: "🛠️" });
  }
  for (const a of state.achievements) {
    const def = ACHIEVEMENTS.find((x) => x.id === a.achievementId);
    if (def) ev.push({ at: a.unlockedAt, kind: "achievement", title: `Earned "${def.name}"`, detail: def.description, emoji: def.emoji });
  }
  for (const i of state.passport) {
    ev.push({ at: i.startDate ? `${i.startDate}T00:00:00.000Z` : i.createdAt, kind: "passport", title: `${i.title}${i.organisation ? ` · ${i.organisation}` : ""}`, detail: i.description, emoji: i.kind === "education" ? "🎓" : i.kind === "certification" ? "📜" : "💼" });
  }
  return ev.sort((a, b) => b.at.localeCompare(a.at));
}
