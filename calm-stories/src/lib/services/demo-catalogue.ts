import "server-only";
import { getDb } from "@/lib/db";
import type { TableName } from "@/lib/db/types";
import { log } from "@/lib/log";
import { buildSeedSnapshot } from "@/lib/seed/build";

const g = globalThis as unknown as { __demoCatalogueRemoved?: boolean };

/**
 * Remove the sample catalogue the app ships with (seeded series, their seasons,
 * episodes, schedules and demo listening history, and saves/follows of them), so
 * listeners only see series the studio produced. Seed rows have fixed ids, so
 * nothing the studio made is touched. Idempotent; runs once per process.
 * Set KEEP_DEMO_CATALOGUE=1 to keep the samples.
 */
export async function removeDemoCatalogue(): Promise<number> {
  if (g.__demoCatalogueRemoved || process.env.KEEP_DEMO_CATALOGUE === "1") return 0;
  const db = getDb();
  const seed = buildSeedSnapshot(new Date());
  const seriesIds = new Set(seed.series.map((s) => s.id));
  const episodeIds = new Set(seed.episodes.map((e) => e.id));
  const linked = (row: Record<string, unknown>) =>
    seriesIds.has(String(row.series_id ?? "")) || episodeIds.has(String(row.episode_id ?? ""));
  let removed = 0;
  // Children first, so database foreign keys are never violated.
  const tables: TableName[] = ["listening_events", "listening_progress", "user_libraries", "series_follows", "publishing_schedules", "episodes", "seasons"];
  for (const table of tables) {
    for (const row of (await db.list(table)) as unknown as Record<string, unknown>[]) {
      if (linked(row)) {
        await db.remove(table, String(row.id));
        removed++;
      }
    }
  }
  for (const s of await db.list("series")) {
    if (seriesIds.has(s.id)) {
      await db.remove("series", s.id);
      removed++;
    }
  }
  g.__demoCatalogueRemoved = true;
  if (removed) log.info("catalog", "removed sample catalogue", { rows: removed });
  return removed;
}
