import { ok, route } from "@/lib/http";
import { repo } from "@/lib/store";
import { dropOff, summarise } from "@/lib/insights";

export const GET = route(async () => {
  const store = await repo();
  const [usage, games, events, jobs] = await Promise.all([store.listUsage(), store.listGames(), store.listEvents(), store.listJobs(300)]);
  const byAgent = new Map<string, { calls: number; input: number; output: number; usd: number }>();
  const byDay = new Map<string, number>();
  for (const u of usage) {
    const a = byAgent.get(u.agent) ?? { calls: 0, input: 0, output: 0, usd: 0 };
    byAgent.set(u.agent, { calls: a.calls + 1, input: a.input + u.inputTokens, output: a.output + u.outputTokens, usd: a.usd + u.costUsd });
    const day = u.at.slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + u.costUsd);
  }
  const perGame = games
    .filter((g) => g.status === "ready")
    .map((g) => {
      const stats = summarise(events.filter((e) => e.gameId === g.id));
      return { id: g.id, name: g.name, stats, dropOff: dropOff(stats) };
    });
  return ok({
    totals: {
      usd: usage.reduce((a, u) => a + u.costUsd, 0),
      calls: usage.length,
      inputTokens: usage.reduce((a, u) => a + u.inputTokens, 0),
      outputTokens: usage.reduce((a, u) => a + u.outputTokens, 0),
      jobs: jobs.filter((j) => j.kind !== "lab").length,
      jobsComplete: jobs.filter((j) => j.status === "complete").length,
      jobsFailed: jobs.filter((j) => j.status === "failed").length,
      sessions: new Set(events.filter((e) => e.name === "session_start").map((e) => e.sessionId)).size,
    },
    byAgent: [...byAgent.entries()].map(([agent, v]) => ({ agent, ...v })),
    byDay: [...byDay.entries()].sort().map(([day, usd]) => ({ day, usd })),
    perGame,
  });
});
