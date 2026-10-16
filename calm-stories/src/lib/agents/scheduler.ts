import "server-only";
import { getDb } from "@/lib/db";
import { log } from "@/lib/log";
import type { ProductionWorkflow } from "@/lib/types";
import { enqueueProduction } from "./runner";

/** Upcoming release slots for a workflow (UTC), up to `episodes_per_week` per 7 days. */
export function upcomingSlots(wf: Pick<ProductionWorkflow, "release_days" | "release_hour_utc" | "episodes_per_week">, from: Date, days = 7): Date[] {
  const out: Date[] = [];
  for (let d = 0; d <= days; d++) {
    const day = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate() + d, wf.release_hour_utc, 0, 0));
    if (!wf.release_days.includes(day.getUTCDay())) continue;
    if (day.getTime() <= from.getTime() + 12 * 3600_000) continue; // leave time for production + review
    out.push(day);
  }
  return out.slice(0, Math.max(1, wf.episodes_per_week));
}

/**
 * For every active workflow, make sure each upcoming release slot has an
 * episode in production. Idempotent: the slot is the idempotency key.
 */
export async function runScheduledProduction(now = new Date()) {
  const db = getDb();
  const workflows = await db.list("production_workflows", { where: { status: "active" } });
  const created: { series_id: string; release_at: string; job_id: string }[] = [];
  for (const wf of workflows) {
    for (const slot of upcomingSlots(wf, now)) {
      try {
        const { job, created: isNew } = await enqueueProduction({
          series_id: wf.series_id,
          workflow_id: wf.id,
          release_at: slot.toISOString(),
          idempotency_key: `prod:${wf.series_id}:${slot.toISOString()}`,
          budget_cents: wf.budget_cents,
        });
        if (isNew) created.push({ series_id: wf.series_id, release_at: slot.toISOString(), job_id: job.id });
      } catch (err) {
        log.error("agents", "Failed to schedule production", { workflow: wf.id, error: String(err) });
      }
    }
  }
  return created;
}
