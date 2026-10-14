import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { freshDb, viewers } from "./helpers";
import type { LocalDatabase } from "@/lib/db/local";
import { DEFAULT_AI_SETTINGS } from "@/lib/seed/agents";
import { cancelJob, enqueueProduction, pauseJob, resumeJob, retryJob, runJob, runWorkflows, setRetryBackoff, upsertWorkflow } from "@/lib/jobs/engine";
import { PIPELINE } from "@/lib/jobs/pipeline";
import { decideReview, releaseDue } from "@/lib/publishing";
import { listenAccess } from "@/lib/auth/policy";

const SERIES = "series-the-moonlit-kingdom";
let db: LocalDatabase;

beforeAll(() => {
  process.env.CALM_JOBS_MANUAL = "1";
  setRetryBackoff(0);
});
beforeEach(async () => {
  db = freshDb();
  await db.upsert("ai_settings", { ...DEFAULT_AI_SETTINGS, writing_provider: "mock", voice_provider: "mock", updated_at: new Date().toISOString() });
});

describe("Journey D: internal production", () => {
  it("runs all 13 steps and stops at editorial review", async () => {
    expect(PIPELINE).toHaveLength(13);
    const admin = await viewers.admin();
    const { job } = await enqueueProduction({ seriesId: SERIES, requestedBy: admin.user!.id, idempotencyKey: "test-1", payload: { duration_minutes: 10 } });
    const done = await runJob(job.id);
    expect(done?.status).toBe("succeeded");
    expect(done?.steps.every((s) => s.status === "succeeded")).toBe(true);
    expect(done?.simulated).toBe(true);
    const ep = (await db.get("episodes", done!.episode_id!))!;
    expect(ep.status).toBe("in_review");
    expect(ep.audio_asset_id).toBeTruthy();
    const review = await db.findOne("editorial_reviews", { episode_id: ep.id });
    expect(review?.source).toBe("production_engine");
    // Not public: listeners can't see it.
    const series = (await db.get("series", SERIES))!;
    expect(listenAccess(await viewers.listener(), series, ep)).toBe("hidden");
    // Costs are attributed to the job.
    expect(await db.count("production_costs", { job_id: job.id })).toBeGreaterThan(5);

    // Idempotent enqueue returns the same job.
    const again = await enqueueProduction({ seriesId: SERIES, requestedBy: admin.user!.id, idempotencyKey: "test-1" });
    expect(again.created).toBe(false);
    expect(again.job.id).toBe(job.id);
  }, 120000);

  it("pauses, resumes, cancels and retries from the failed step", async () => {
    const admin = await viewers.admin();
    const a = (await enqueueProduction({ seriesId: SERIES, requestedBy: admin.user!.id })).job;
    await pauseJob(admin, a.id);
    expect((await runJob(a.id))?.status).toBe("paused");
    await resumeJob(admin, a.id);
    await cancelJob(admin, a.id);
    expect((await runJob(a.id))?.status).toBe("cancelled");

    // Disable the Writer: the job fails at the write step.
    const writer = (await db.findOne("agent_configurations", { agent: "writer" }))!;
    await db.update("agent_configurations", writer.id, { enabled: false });
    const b = (await enqueueProduction({ seriesId: SERIES, requestedBy: admin.user!.id, payload: { duration_minutes: 10 } })).job;
    const failed = (await runJob(b.id))!;
    expect(failed.status).toBe("failed");
    expect(failed.error).toMatch(/Writer agent is disabled/);
    expect(failed.steps.find((s) => s.id === "outline")?.status).toBe("succeeded");
    await db.update("agent_configurations", writer.id, { enabled: true });
    await retryJob(admin, b.id);
    const retried = (await runJob(b.id))!;
    expect(retried.status).toBe("succeeded");
    expect(retried.steps.find((s) => s.id === "select_episode")?.attempts).toBe(1);

    // Listeners can't control jobs.
    await expect(pauseJob(await viewers.creator(), b.id)).rejects.toThrow(/Administrator/);
  }, 120000);

  it("halts when the job budget is spent", async () => {
    const admin = await viewers.admin();
    const j = (await enqueueProduction({ seriesId: SERIES, requestedBy: admin.user!.id, budgetCents: 0 })).job;
    const out = await runJob(j.id);
    expect(out?.status).toBe("failed");
    expect(out?.error).toMatch(/Budget/);
  });
});

describe("Journey E: scheduling and publishing", () => {
  it("fills release slots, waits for approval and releases on time", async () => {
    const admin = await viewers.admin();
    await upsertWorkflow(admin, SERIES, { status: "active", episodes_per_week: 2, release_days: [1, 4], release_hour_utc: 20, target_duration_minutes: 10 });
    const now = new Date();
    const created = await runWorkflows(now);
    expect(created).toHaveLength(2);
    expect(await runWorkflows(now)).toHaveLength(0); // idempotent per slot

    const job = (await db.get("ai_production_jobs", created[0]!))!;
    const done = (await runJob(job.id))!;
    expect(done.status).toBe("succeeded");
    const ep = (await db.get("episodes", done.episode_id!))!;
    const slot = job.payload.release_at as string;
    expect(ep.release_at).toBe(slot);
    expect(new Date(slot).getUTCHours()).toBe(20);

    // Not approved: nothing is released even after the slot passes.
    const later = new Date(new Date(slot).getTime() + 60_000);
    expect(await releaseDue(later)).not.toContain(ep.id);

    const review = (await db.findOne("editorial_reviews", { episode_id: ep.id }))!;
    await decideReview(admin, review.id, "approved");
    expect((await db.get("episodes", ep.id))?.status).toBe("approved");
    expect(await releaseDue(now)).not.toContain(ep.id); // before its time
    expect(await releaseDue(later)).toEqual([ep.id]);
    const published = (await db.get("episodes", ep.id))!;
    expect(published.status).toBe("published");
    expect(published.published_at).toBe(slot);
    expect(await releaseDue(later)).toEqual([]); // released once
    expect(await db.count("notifications", { user_id: "user-ada", kind: "new_episode" })).toBeGreaterThan(0);
  }, 120000);

  it("editors can request changes, which unlocks the script", async () => {
    const admin = await viewers.admin();
    const { job } = await enqueueProduction({ seriesId: SERIES, requestedBy: admin.user!.id, payload: { duration_minutes: 10 } });
    const done = (await runJob(job.id))!;
    const review = (await db.findOne("editorial_reviews", { episode_id: done.episode_id! }))!;
    await expect(decideReview(admin, review.id, "changes_requested")).rejects.toThrow(/note/);
    await decideReview(admin, review.id, "changes_requested", { notes: "Soften the ending." });
    expect((await db.get("episodes", done.episode_id!))?.status).toBe("changes_requested");
    await expect(decideReview(await viewers.creator(), review.id, "approved")).rejects.toThrow();
  }, 120000);
});
