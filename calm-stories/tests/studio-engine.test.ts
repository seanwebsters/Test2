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
  it("fills the development slate at once without a brief, within the daily limit, and schedules greenlit series", async () => {
    const { runAutopilot, resolveGate } = await import("@/lib/studio");
    const { getStudioSettings } = await import("@/lib/studio/settings");
    const db = freshDb();
    const calls: TransportRequest[] = [];
    setClaudeTransport(fakeClaude({ calls, synthesisRounds: 0 }));
    await getStudioSettings();
    await db.update("studio_settings", "global", { autopilot_pipeline: 3, autopilot_series_per_day: 3 });
    const runs = await runAutopilot();
    expect(runs).toHaveLength(3); // all at once
    expect(await runAutopilot()).toHaveLength(0); // slate full
    await drain({ maxTicks: 6 });
    for (const run of runs) {
      const st = (await db.findOne("workflow_steps", { run_id: run.id, key: "commission" }))!;
      expect(st.status, st.error ?? "").toBe("succeeded");
    }
    const projects = await db.list("series_projects");
    expect(projects).toHaveLength(3);
    expect(projects[0]!.brief.length).toBeGreaterThan(5);
    // Each parallel commission was steered in a different direction.
    const directions = new Set(calls.filter((c) => c.agent === "program_director" && !c.webSearch).map((c) => (c.content.find((x) => x.type === "text") as { text: string }).text.match(/explore this direction: ([^.]+)/)?.[1]).filter(Boolean));
    expect(directions.size).toBe(3);
    // A failed development frees its place and doesn't count towards today's limit.
    const failedDev = await db.get("workflow_runs", projects[1]!.run_id!);
    await db.update("workflow_runs", failedDev!.id, { status: "failed" });
    await db.update("workflow_runs", runs[0]!.id, { status: "failed" });
    await db.update("workflow_runs", runs[1]!.id, { status: "failed" });
    // Parallel developments don't trample each other's work.
    expect((await db.list("workflow_steps")).filter((s) => s.status === "failed")).toHaveLength(0);
    expect(await runAutopilot()).toHaveLength(1); // one place freed; failed commissions don't use up the allowance
    expect((await db.get("series_projects", projects[1]!.id))!.status).toBe("failed");
    // Three failed commissions in a row: back off instead of retrying every heartbeat.
    for (const r of await db.list("workflow_runs", { where: { kind: "series_development" } })) if (r.idempotency_key?.startsWith("autopilot:")) await db.update("workflow_runs", r.id, { status: "failed" });
    await db.update("series_projects", projects[0]!.id, { status: "rejected" });
    expect(await runAutopilot()).toHaveLength(0);
    for (const r of await db.list("workflow_runs", { where: { kind: "series_development" } })) if (r.idempotency_key?.startsWith("autopilot:")) await db.update("workflow_runs", r.id, { status: "succeeded" });
    // Daily limit: even with free places, no more today.
    for (const p of projects) await db.update("series_projects", p.id, { status: "rejected" });
    expect(await runAutopilot()).toHaveLength(0);
    expect(await runAutopilot(new Date(Date.now() + 25 * 3600_000))).toHaveLength(3);
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

describe("narrator casting", () => {
  it("falls back to the calmest voices when Claude's narrator picks aren't in the account", async () => {
    const { calmNarratorCandidates } = await import("@/lib/studio/workflows/audio-steps");
    const v = (id: string, description: string, labels: Record<string, string> = {}) => ({ voice_id: id, name: id, category: "premade", description, labels, preview_url: null });
    const picks = calmNarratorCandidates([
      v("hype", "energetic upbeat announcer"),
      v("news", "clear news presenter", { use_case: "news" }),
      v("sleepy", "soft, calm and soothing", { use_case: "meditation" }),
      v("warm", "warm audiobook storyteller", { use_case: "narration" }),
    ], 2);
    expect(picks.map((p) => p.voice_id).sort()).toEqual(["sleepy", "warm"]);
  });
});

describe("runUntil", () => {
  it("advances chained stages in one call, starting each as soon as its inputs finish", async () => {
    const db = freshDb();
    const { registerHandler } = await import("@/lib/studio/engine");
    const { runUntil } = await import("@/lib/studio");
    const order: string[] = [];
    registerHandler("test.step", async (ctx) => {
      await new Promise((r) => setTimeout(r, ctx.step.key === "slow" ? 60 : 5));
      order.push(ctx.step.key);
      return { summary: ctx.step.key };
    });
    const step = (key: string, deps: string[]) => ({ key, type: "test.step", agent: "program_director" as const, label: key, activity: "thinking" as const, deps });
    // a → b → c is a chain; "slow" runs alongside it and must not hold it up.
    const { run } = await createRun({ kind: "series_development", title: "Chain", budget_cents: 100, created_by: "usr_calm-editor", steps: [step("a", []), step("slow", []), step("b", ["a"]), step("c", ["b"])] });
    const started = await runUntil(Date.now() + 5_000);
    expect(started).toBe(4);
    expect((await db.get("workflow_runs", run.id))!.status).toBe("succeeded");
    expect(order.indexOf("c")).toBeLessThan(order.indexOf("slow"));
  });
});

describe("Claude request options per model", () => {
  it("only sends refusal fallbacks and the newer web search tool to models that accept them", async () => {
    const { supportsServerFallback, webSearchToolType } = await import("@/lib/studio/llm");
    expect(supportsServerFallback("claude-haiku-5-5")).toBe(false);
    expect(supportsServerFallback("claude-sonnet-5-5")).toBe(true);
    expect(supportsServerFallback("claude-opus-5-5")).toBe(true);
    expect(webSearchToolType("claude-haiku-5-5")).toBe("web_search_20250305");
    expect(webSearchToolType("claude-sonnet-5-5")).toBe("web_search_20260209");
  });
});

describe("house narrator voice", () => {
  it("finds the narrator by name however ElevenLabs formats it", async () => {
    const { findVoiceByName } = await import("@/lib/studio/workflows/audio-steps");
    const v = (voice_id: string, name: string) => ({ voice_id, name, category: "professional", description: null, labels: {}, preview_url: null });
    const voices = [v("a", "Theodora - Bright"), v("b", "Theo – Silky & Slow"), v("c", "Calm Clara")];
    expect(findVoiceByName(voices, "Theo Silk Slow")?.voice_id).toBe("b");
    expect(findVoiceByName(voices, "theo silky slow")?.voice_id).toBe("b");
    expect(findVoiceByName([v("x", "Theo"), ...voices], "Theo Silk Slow")?.voice_id).toBe("b");
    expect(findVoiceByName(voices, "Nobody")).toBeNull();
  });
});

describe("provider blocks clear themselves", () => {
  it("retries a step blocked on a provider key a few minutes later, without Resume", async () => {
    const db = freshDb();
    const { registerHandler } = await import("@/lib/studio/engine");
    const { BlockedError } = await import("@/lib/studio/errors");
    let keyFixed = false;
    registerHandler("test.voice", async () => {
      if (!keyFixed) throw new BlockedError("ELEVENLABS_API_KEY", "missing permission");
      return { summary: "narrated" };
    });
    const { run } = await createRun({ kind: "series_development", title: "Voice", budget_cents: 100, created_by: "usr_calm-editor", steps: [{ key: "voice", type: "test.voice", agent: "audio_producer", label: "Narrate", activity: "typing", deps: [] }] });
    await drain();
    expect((await db.findOne("workflow_steps", { run_id: run.id, key: "voice" }))!.status).toBe("blocked");
    keyFixed = true; // the key is fixed in the host's settings
    await drain(); // too soon: still blocked
    expect((await db.findOne("workflow_steps", { run_id: run.id, key: "voice" }))!.status).toBe("blocked");
    await drain({ now: new Date(Date.now() + 6 * 60_000) });
    expect((await db.findOne("workflow_steps", { run_id: run.id, key: "voice" }))!.status).toBe("succeeded");
    expect((await db.get("workflow_runs", run.id))!.status).toBe("succeeded");
  });
});

describe("sample catalogue", () => {
  it("removes the seeded sample series but keeps studio-produced ones and accounts", async () => {
    const db = freshDb();
    const { removeDemoCatalogue } = await import("@/lib/services/demo-catalogue");
    const before = await db.list("series");
    expect(before.length).toBeGreaterThan(5);
    const studio = await db.insert("series", { ...before[0]!, id: "ser_studio-original", slug: "studio-original", title: "A Studio Original" });
    await db.insert("episodes", { ...(await db.list("episodes"))[0]!, id: "ep_studio_1", series_id: studio.id });
    expect(await removeDemoCatalogue()).toBeGreaterThan(0);
    expect((await db.list("series")).map((s) => s.id)).toEqual(["ser_studio-original"]);
    expect((await db.list("episodes")).map((e) => e.id)).toEqual(["ep_studio_1"]);
    expect(await db.count("user_roles")).toBeGreaterThan(0); // sign-ins and roles untouched
    expect(await db.count("listening_events")).toBe(0);
  });
});
