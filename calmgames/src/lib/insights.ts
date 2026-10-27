import "server-only";
import { repo } from "./store";
import type { PlayEvent } from "./types";
import type { PlayStats } from "./agents";

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

export function summarise(events: PlayEvent[]): PlayStats {
  const sessions = new Set(events.filter((e) => e.name === "session_start").map((e) => e.sessionId));
  const levels = new Map<number, { starts: Set<string>; completes: Set<string>; seconds: number[] }>();
  const level = (n: number) => {
    if (!levels.has(n)) levels.set(n, { starts: new Set(), completes: new Set(), seconds: [] });
    return levels.get(n)!;
  };
  for (const e of events) {
    if (e.level === undefined) continue;
    if (e.name === "level_start") level(e.level).starts.add(e.sessionId);
    if (e.name === "level_complete") {
      level(e.level).completes.add(e.sessionId);
      const ms = Number(e.data?.ms);
      if (Number.isFinite(ms)) level(e.level).seconds.push(Math.round(ms / 1000));
    }
  }
  return {
    sessions: sessions.size,
    completions: new Set(events.filter((e) => e.name === "game_complete").map((e) => e.sessionId)).size,
    levels: [...levels.entries()].sort(([a], [b]) => a - b).map(([n, l]) => ({ level: n + 1, starts: l.starts.size, completes: l.completes.size, medianSeconds: median(l.seconds) })),
    restarts: events.filter((e) => e.name === "restart").length,
    errors: events.filter((e) => e.name === "error").length,
  };
}

/** Real, locally recorded play sessions for a game (optionally one version). */
export async function playStats(gameId: string, version?: number): Promise<PlayStats> {
  const events = await (await repo()).listEvents(gameId);
  return summarise(version === undefined ? events : events.filter((e) => e.version === version));
}

/** Where players stop: the first level whose completions fall well below its starts. */
export function dropOff(stats: PlayStats): string | null {
  for (const l of stats.levels) {
    if (l.starts >= 3 && l.completes / l.starts < 0.6) return `Level ${l.level}: ${l.starts - l.completes} of ${l.starts} sessions that started it did not finish it.`;
  }
  return null;
}
