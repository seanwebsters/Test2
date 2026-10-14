import { describe, expect, it } from "vitest";
import "@/lib/jobs/workflows";
import { runJob } from "@/lib/jobs/runner";
import { startProductionNow } from "@/lib/production/engine";
import { releaseDueEpisodes, runScheduledProduction, upcomingSlots } from "@/lib/production/scheduler";
import { decideReview } from "@/lib/services/editorial";
import { isEpisodePublic } from "@/lib/auth/policy";
import { executeTool } from "@/lib/storymaker/execute";
import { freshDb, viewerFor } from "./helpers";

describe("Journey D: automated production → review → scheduled release", () => {
  it("produces an episode with every agent, holds it for approval and releases it on time", async () => {
    const db = freshDb();
    const wf = (await db.findOne("production_workflows", { series_id: "ser_the-moonlit-kingdom" }))!;
    await db.update("production_workflows", wf.id, { target_duration_minutes: 10 });
    const { job } = await startProductionNow(wf.id, "usr_calm-editor");
    await runJob(job.id);
    const done = (await db.get("ai_production_jobs", job.id))!;
    expect(done.status, done.error ?? "").toBe("succeeded");
    expect(done.steps).toHaveLength(13);
    expect(new Set(done.steps.map((s) => s.agent))).toEqual(new Set(["showrunner", "writer", "continuity", "sleep_editor", "voice_director", "audio_producer", "publishing"]));
    const ep = (await db.get("episodes", done.episode_id!))!;
    const series = (await db.get("series", ep.series_id))!;
    expect(ep.status).toBe("in_review");
    expect(isEpisodePublic(ep, series)).toBe(false);
    const mix = (await db.get("audio_assets", ep.audio_asset_id!))!;
    expect(mix.kind).toBe("mix");
    expect(mix.qa?.clipped_samples).toBe(0);

    const review = (await db.findOne("editorial_reviews", { episode_id: ep.id }))!;
    const releaseAt = new Date(Date.now() + 3600_000).toISOString();
    await decideReview(review.id, "usr_calm-editor", { decision: "approve", release_at: releaseAt });
    const approved = (await db.get("episodes", ep.id))!;
    expect(approved.status).toBe("approved");
    expect(isEpisodePublic(approved, series)).toBe(false); // not before release time
    expect(isEpisodePublic(approved, series, new Date(Date.now() + 2 * 3600_000))).toBe(true);
    expect(await releaseDueEpisodes(new Date(Date.now() + 2 * 3600_000))).toBeGreaterThanOrEqual(1);
    expect((await db.get("episodes", ep.id))!.status).toBe("published");
    const notes = await db.list("notifications", { where: { user_id: "usr_maya", kind: "new_episode" } });
    expect(notes.some((n) => n.link === `/listen/${ep.id}`)).toBe(true);
  });

  it("schedules production idempotently for each release slot", async () => {
    const db = freshDb();
    const wf = (await db.findOne("production_workflows", { series_id: "ser_the-moonlit-kingdom" }))!;
    await db.update("production_workflows", wf.id, { status: "active" });
    const first = await runScheduledProduction();
    const second = await runScheduledProduction();
    expect(first.length).toBe(upcomingSlots({ ...wf, status: "active" }, new Date()).length);
    expect(second).toHaveLength(0);
  });
});

describe("Journey E: community publishing", () => {
  it("keeps community episodes private until an editor approves them", async () => {
    const db = freshDb();
    const iris = await viewerFor(db, "usr_iris-vale");
    const seriesId = "ser_the-orchard-of-small-hours";
    const ctx = { viewer: iris, seriesId, conversationId: null, confirmed: true };
    const ep = (await db.findOne("episodes", { series_id: seriesId }))!;
    await executeTool("write_episode", { episode_id: ep.id, settings: { duration_minutes: 5 } }, ctx);
    await executeTool("approve_script", { episode_id: ep.id }, ctx);
    const narr = await executeTool("generate_narration", { episode_id: ep.id }, ctx);
    const jobId = narr.status === "executed" ? (narr.result.data as { job_id: string }).job_id : "";
    await runJob(jobId);
    expect((await db.get("episodes", ep.id))!.audio_asset_id).toBeTruthy();
    await expect(executeTool("submit_for_review", { episode_id: ep.id }, ctx)).rejects.toThrow(/rights declaration/);
    await executeTool("save_rights_declaration", { original_work: true, ai_assisted: true, voice_consent: true }, ctx);
    const pending = await executeTool("submit_for_review", { episode_id: ep.id }, { ...ctx, confirmed: false });
    expect(pending.status).toBe("pending_confirmation"); // publishing needs explicit confirmation
    await executeTool("submit_for_review", { episode_id: ep.id }, ctx);
    const series = (await db.get("series", seriesId))!;
    expect(isEpisodePublic((await db.get("episodes", ep.id))!, series)).toBe(false);
    const review = (await db.findOne("editorial_reviews", { episode_id: ep.id }))!;
    expect(review.checks.find((c) => c.name === "rights")!.status).toBe("pass");
    await decideReview(review.id, "usr_calm-editor", { decision: "approve", release_at: new Date(Date.now() - 1000).toISOString() });
    const live = (await db.get("episodes", ep.id))!;
    expect(live.status).toBe("published");
    expect((await db.get("series", seriesId))!.status).toBe("published");
    const note = await db.list("notifications", { where: { user_id: "usr_iris-vale", kind: "review" } });
    expect(note.length).toBeGreaterThan(0);
  });
});
