import { ok, route } from "@/lib/http";
import { repo } from "@/lib/store";
import type { GameSummary } from "@/lib/types";

export const GET = route(async () => {
  const store = await repo();
  // In-progress and playable games first, then failures, then unbuilt concepts.
  const rank = { generating: 0, ready: 1, failed: 2, concept: 3 } as const;
  const games = (await store.listGames()).sort((a, b) => rank[a.status] - rank[b.status] || b.updatedAt.localeCompare(a.updatedAt));
  const summaries: GameSummary[] = await Promise.all(
    games.map(async (g) => {
      const v = g.currentVersion ? await store.getVersion(g.id, g.currentVersion) : null;
      const b = v?.build;
      const cover = b?.mode === "template" ? { sky: b.config.theme.sky, accent: b.config.theme.accent, archetype: b.config.archetype } : b ? { sky: ["#E7E2F4", "#B9AEDC"], accent: "#14213D", archetype: "freeform" } : undefined;
      return { ...g, cover, qa: v?.qa ? (v.qa.passed ? "passed" : v.qa.ran ? "failed" : "untested") : "untested", versionCount: g.latestVersion };
    }),
  );
  return ok({ games: summaries });
});
