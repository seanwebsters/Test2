import { afterEach, describe, expect, it } from "vitest";
import { drain, runScheduledProduction, resumeRun } from "@/lib/studio";
import { createRun } from "@/lib/studio/engine";
import { RateLimitedError } from "@/lib/studio/errors";
import { setClaudeTransport, type TransportRequest } from "@/lib/studio/llm";
import { newId, nowIso } from "@/lib/util";
import { freshDb } from "./helpers";
import { fakeClaude } from "./studio-fakes";

afterEach(() => setClaudeTransport(null));

const proposalsRun = (budget = 100) =>
  createRun({ kind: "series_development", title: "Proposals", budget_cents: budget, created_by: "usr_calm-editor", steps: [{ key: "proposals", type: "program.proposals", agent: "program_director", label: "Propose", activity: "thinking", deps: [] }] });

describe("workflow engine guarantees", () => {
  it("waits out provider rate limits without spending an attempt, then continues", async () => {
    const db = freshDb();
    const fake = fakeClaude({ calls: [], synthesisRounds: 0 });
    let calls = 0;
    setClaudeTransport(async (req: TransportRequest) => {
      if (calls++ === 0) throw new RateLimitedError("Anthropic", 60_000);
      return fake(req);
    });
    const { run } = await proposalsRun();
    await drain();
    let step = (await db.findOne("workflow_steps", { run_id: run.id, key: "proposals" }))!;
    expect(step.status).toBe("waiting");
    expect(step.attempts).toBe(0);
    await drain({ now: new Date(Date.now() + 61_000) });
    step = (await db.findOne("workflow_steps", { run_id: run.id, key: "proposals" }))!;
    expect(step.status).toBe("succeeded");
    // Audience-informed: the Program Director saw the catalogue data.
    const d = (await db.findOne("deliverables", { key: "program_proposals" }))!;
    expect(d.agent).toBe("program_director");
  });

  it("blocks on budget instead of overspending, and resumes with a higher budget", async () => {
    const db = freshDb();
    setClaudeTransport(fakeClaude({ calls: [], synthesisRounds: 0 }));
    const { run } = await proposalsRun(1);
    await drain();
    const step = (await db.findOne("workflow_steps", { run_id: run.id, key: "proposals" }))!;
    expect(step.status).toBe("blocked");
    expect(step.needs).toBe("budget");
    expect(await db.count("usage_records")).toBe(0);
    await resumeRun(run.id, { budget_cents: 500 });
    await drain();
    expect((await db.get("workflow_runs", run.id))!.status).toBe("succeeded");
  });

  it("commissions one episode per release slot for greenlit series only, idempotently", async () => {
    const db = freshDb();
    const sid = "ser_the-moonlit-kingdom";
    await db.insert("production_workflows", { id: "wf1", series_id: sid, status: "active", episodes_per_week: 2, release_days: [0, 1, 2, 3, 4, 5, 6], release_hour_utc: 20, target_minutes: 20, budget_cents: 1500, created_at: nowIso(), updated_at: nowIso() });
    expect(await runScheduledProduction()).toHaveLength(0); // not a greenlit studio series
    await db.insert("series_projects", { id: newId("prj"), brief: "b", status: "greenlit", series_id: sid, run_id: null, created_by: "usr_calm-editor", decision_by: "usr_calm-editor", decision_notes: "", decided_at: nowIso(), created_at: nowIso(), updated_at: nowIso() });
    const first = await runScheduledProduction();
    expect(first).toHaveLength(2);
    expect(await runScheduledProduction()).toHaveLength(0);
    const runs = await db.list("workflow_runs", { where: { kind: "episode_production" } });
    expect(runs.every((r) => r.idempotency_key?.startsWith("sched:") && r.params.release_at)).toBe(true);
  });
});

describe("autopilot", () => {
  it("commissions and develops a new series without a brief, one at a time, and schedules greenlit series", async () => {
    const { runAutopilot, resolveGate } = await import("@/lib/studio");
    const db = freshDb();
    setClaudeTransport(fakeClaude({ calls: [], synthesisRounds: 0 }));
    const run = await runAutopilot();
    expect(run).not.toBeNull();
    expect(await runAutopilot()).toBeNull(); // one in flight at a time
    await drain({ maxTicks: 6 });
    const st = (await db.findOne("workflow_steps", { run_id: run!.id, key: "commission" }))!;
    expect(st.status, st.error ?? "").toBe("succeeded");
    const projects = await db.list("series_projects");
    expect(projects).toHaveLength(1);
    expect(projects[0]!.brief.length).toBeGreaterThan(5);
    expect(await runAutopilot()).toBeNull(); // 10 a day → next one in ~2.4h
    expect(await runAutopilot(new Date(Date.now() + 2.5 * 3600_000))).not.toBeNull();
    // Greenlight → automatic release schedule.
    const dev = (await db.get("workflow_runs", projects[0]!.run_id!))!;
    await db.update("series_projects", projects[0]!.id, { series_id: "ser_the-moonlit-kingdom" });
    await db.insert("workflow_steps", { id: "gs", run_id: dev.id, key: "greenlight", type: "series.greenlight", agent: "network_executive", label: "Greenlight", activity: "reading", deps: [], params: {}, status: "awaiting_approval", attempts: 1, not_before: null, started_at: null, finished_at: null, summary: null, error: null, needs: null, deliverable_ids: [], cost_cents: 0, created_at: nowIso(), updated_at: nowIso() });
    await resolveGate(dev.id, "greenlight", { approved: true, userId: "usr_calm-editor", notes: "" });
    const wf = await db.findOne("production_workflows", { series_id: "ser_the-moonlit-kingdom" });
    expect(wf?.status).toBe("active");
    expect(wf?.episodes_per_week).toBe(2);
  });
});

describe("fal.ai as the Nano Banana provider", () => {
  it("generates artwork through fal (text-to-image and /edit with reference images) when only FAL_KEY is set", async () => {
    const { vi } = await import("vitest");
    const sharp = (await import("sharp")).default;
    const { env } = await import("@/lib/env");
    const { generateArtwork } = await import("@/lib/studio/art");
    freshDb();
    const keys = env as { geminiApiKey?: string; falKey?: string };
    keys.geminiApiKey = undefined;
    keys.falKey = "test-fal";
    const png = await sharp({ create: { width: 64, height: 96, channels: 3, background: "#123" } }).png().toBuffer();
    const calls: { url: string; body?: Record<string, unknown> }[] = [];
    vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
      calls.push({ url: String(url), body: init?.body ? JSON.parse(String(init.body)) : undefined });
      if (String(url).startsWith("https://fal.run/")) {
        expect((init!.headers as Record<string, string>).authorization).toBe("Key test-fal");
        return Response.json({ images: [{ url: "https://cdn.fal.media/x.png", content_type: "image/png" }] });
      }
      return new Response(new Uint8Array(png), { headers: { "content-type": "image/png" } });
    });
    const meta = { runId: null, stepId: null, seriesId: "ser_the-moonlit-kingdom" };
    const a = await generateArtwork({ meta, seriesId: "ser_the-moonlit-kingdom", kind: "poster", prompt: "p", aspectRatio: "2:3" });
    await generateArtwork({ meta, seriesId: "ser_the-moonlit-kingdom", kind: "episode_cover", prompt: "p", aspectRatio: "16:9", references: [{ mimeType: "image/png", data: png }] });
    expect(calls[0]!.url).toBe("https://fal.run/fal-ai/nano-banana");
    expect(calls[0]!.body!.aspect_ratio).toBe("2:3");
    expect(calls[2]!.url).toBe("https://fal.run/fal-ai/nano-banana/edit");
    expect(String((calls[2]!.body!.image_urls as string[])[0])).toMatch(/^data:image\/png;base64,/);
    expect(a.asset.provider).toBe("fal");
    keys.falKey = undefined;
    vi.unstubAllGlobals();
  });
});
