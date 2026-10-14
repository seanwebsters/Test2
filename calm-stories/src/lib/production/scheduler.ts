import "server-only";
import { getDb } from "@/lib/db";
import { log } from "@/lib/log";
import { track } from "@/lib/analytics";
import type { ProductionWorkflow } from "@/lib/types";
import { newId, nowIso } from "@/lib/util";
import { enqueueJob } from "@/lib/jobs/runner";

const DAY = 86400000;

/** Upcoming release slots for a workflow (UTC), up to `episodes_per_week` per 7 days. */
export function upcomingSlots(wf: ProductionWorkflow, from: Date, days = 7): Date[] {
  const out: Date[] = [];
  const days_ = [...wf.release_days].sort();
  for (let d = 0; d <= days; d++) {
    const day = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate() + d, wf.release_hour_utc, 0, 0));
    if (!days_.includes(day.getUTCDay())) continue;
    if (day.getTime() <= from.getTime() + 12 * 3600_000) continue; // leave time for production + review
    out.push(day);
  }
  return out.slice(0, Math.max(1, wf.episodes_per_week));
}

/**
 * For every active production workflow, make sure each upcoming release slot
 * has an episode in production. Idempotent: the slot is the idempotency key.
 */
export async function runScheduledProduction(now = new Date()) {
  const db = getDb();
  const workflows = await db.list("production_workflows", { where: { status: "active" } });
  const created: { series_id: string; release_at: string; job_id: string }[] = [];
  for (const wf of workflows) {
    for (const slot of upcomingSlots(wf, now)) {
      const key = `prod:${wf.series_id}:${slot.toISOString()}`;
      try {
        const { job, created: isNew } = await enqueueJob({
          kind: "episode_production",
          payload: { workflow_id: wf.id, release_at: slot.toISOString() },
          series_id: wf.series_id,
          workflow_id: wf.id,
          idempotency_key: key,
          budget_cents: wf.max_budget_cents,
        });
        if (isNew) created.push({ series_id: wf.series_id, release_at: slot.toISOString(), job_id: job.id });
      } catch (err) {
        log.error("scheduler", "Failed to enqueue production", { workflow: wf.id, error: String(err) });
      }
    }
  }
  return created;
}

/** Publish approved episodes whose release time has arrived, and notify followers. */
export async function releaseDueEpisodes(now = new Date()): Promise<number> {
  const db = getDb();
  const due = (await db.list("episodes", { where: { status: "approved" } })).filter((e) => e.release_at && new Date(e.release_at) <= now);
  for (const ep of due) {
    await db.update("episodes", ep.id, { status: "published", published_at: ep.release_at, updated_at: nowIso() });
    const sched = await db.findOne("publishing_schedules", { episode_id: ep.id, status: "scheduled" });
    if (sched) await db.update("publishing_schedules", sched.id, { status: "released", updated_at: nowIso() });
    const series = await db.get("series", ep.series_id);
    if (series && series.status !== "published") await db.update("series", series.id, { status: "published", published_at: series.published_at ?? nowIso(), updated_at: nowIso() });
    // Gentle, opt-out-able update for followers. No nudges, no streaks.
    const followers = await db.list("series_follows", { where: { series_id: ep.series_id } });
    for (const f of followers) {
      if (f.user_id.startsWith("usr_sample_")) continue;
      const prefs = await db.get("user_settings", f.user_id);
      if (prefs && !prefs.new_episode_updates) continue;
      await db.insert("notifications", {
        id: newId("ntf"),
        user_id: f.user_id,
        kind: "new_episode",
        title: `New episode of ${series?.title ?? "a series you follow"}`,
        body: `Episode ${ep.number}: ${ep.title}`,
        link: `/listen/${ep.id}`,
        read: false,
        created_at: nowIso(),
      });
    }
    await track("episode_approved", "system", { episode_id: ep.id, released: true });
  }
  return due.length;
}

export { DAY };
