import "server-only";
import { getDb } from "@/lib/db";
import { log } from "@/lib/log";
import type { ProductionWorkflow } from "@/lib/types";
import { startEpisodeProduction } from "./workflows/episode";

/** Upcoming release slots for a schedule (UTC), up to `episodes_per_week` in the next 7 days. */
export function upcomingSlots(wf: Pick<ProductionWorkflow, "release_days" | "release_hour_utc" | "episodes_per_week">, from: Date, days = 7): Date[] {
  const out: Date[] = [];
  for (let d = 0; d <= days; d++) {
    const day = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate() + d, wf.release_hour_utc, 0, 0));
    if (!wf.release_days.includes(day.getUTCDay())) continue;
    if (day.getTime() <= from.getTime() + 36 * 3600_000) continue; // time for writing, production and your review
    out.push(day);
  }
  return out.slice(0, Math.max(1, wf.episodes_per_week));
}

/**
 * Active schedules (greenlit series only) commission one episode per upcoming
 * slot. Idempotent: the slot is the run's idempotency key. Episodes still need
 * your approval before they publish at the slot time.
 */
export async function runScheduledProduction(now = new Date()) {
  const db = getDb();
  const schedules = await db.list("production_workflows", { where: { status: "active" } });
  const created: string[] = [];
  for (const wf of schedules) {
    // Only series the studio developed (with a bible) and you greenlit.
    const project = await db.findOne("series_projects", { series_id: wf.series_id, status: "greenlit" });
    if (!project) continue;
    for (const slot of upcomingSlots(wf, now)) {
      try {
        const { run, created: isNew } = await startEpisodeProduction({ seriesId: wf.series_id, userId: null, releaseAt: slot.toISOString(), idempotencyKey: `sched:${wf.series_id}:${slot.toISOString()}` });
        if (isNew) created.push(run.id);
      } catch (err) {
        log.warn("studio", "scheduled production skipped", { series: wf.series_id, error: String(err) });
        break;
      }
    }
  }
  return created;
}
