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
    expect(calls[0]!.url).toBe("https://fal.run/fal-ai/nano-banana-2");
    expect(calls[0]!.body!.aspect_ratio).toBe("2:3");
    expect(calls[2]!.url).toBe("https://fal.run/fal-ai/nano-banana-2/edit");
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

describe("audio isn't capped by the run budget", () => {
  it("lets narration run past the budget while writing still stops at it, and frees budget-blocked audio steps", async () => {
    const db = freshDb();
    const { registerHandler } = await import("@/lib/studio/engine");
    registerHandler("audio.testnarrate", async (ctx) => { await ctx.ensureBudget(500); return { summary: "narrated" }; });
    registerHandler("ep.testwrite", async (ctx) => { await ctx.ensureBudget(500); return { summary: "written" }; });
    const step = (key: string, type: string) => ({ key, type, agent: "audio_producer" as const, label: key, activity: "typing" as const, deps: [] });
    const { run } = await createRun({ kind: "episode_production", title: "Budget", budget_cents: 100, created_by: "usr_calm-editor", steps: [step("narrate", "audio.testnarrate"), step("write", "ep.testwrite")] });
    // An audio step that was blocked on budget before this change:
    const narrate = (await db.findOne("workflow_steps", { run_id: run.id, key: "narrate" }))!;
    await db.update("workflow_steps", narrate.id, { status: "blocked", needs: "budget", error: "Run budget reached" });
    await drain();
    expect((await db.findOne("workflow_steps", { run_id: run.id, key: "narrate" }))!.status).toBe("succeeded");
    expect((await db.findOne("workflow_steps", { run_id: run.id, key: "write" }))!.needs).toBe("budget");
  });
});

describe("scene mix", () => {
  it("keeps the background sound clearly audible under the narration", async () => {
    const path = (await import("node:path")).default;
    const { mixScene, runFfmpeg, withTmp } = await import("@/lib/studio/mixing");
    await withTmp(async (dir) => {
      const voice = path.join(dir, "voice.wav");
      const rain = path.join(dir, "rain.wav");
      // A loud provider file for the bed and a normal voice, as ElevenLabs returns them.
      await runFfmpeg(["-f", "lavfi", "-i", "sine=frequency=1000:duration=8", "-af", "volume=-6dB", "-ar", "44100", "-ac", "1", voice]);
      await runFfmpeg(["-f", "lavfi", "-i", "sine=frequency=100:duration=4", "-ar", "44100", "-ac", "2", rain]);
      const out = path.join(dir, "mix.wav");
      await mixScene({ narration: voice, layers: [{ file: rain, gainDb: -24 }], music: null, intensity: 0.6, out });
      const band = async (filter: string) => Number((await runFfmpeg(["-ss", "3", "-t", "6", "-i", out, "-af", `${filter},volumedetect`, "-f", "null", "-"])).match(/mean_volume: (-?[\d.]+)/)![1]);
      const voiceDb = await band("highpass=f=600");
      const bedDb = await band("lowpass=f=200");
      const gap = voiceDb - bedDb;
      expect(gap).toBeGreaterThan(5); // under the voice…
      expect(gap).toBeLessThan(20); // …but you can hear it
    });
  });
});

describe("animated agents (test avatar)", () => {
  it("paints a still, films four looping clips through fal's queue, and stores them for the AI Team room", async () => {
    const { vi } = await import("vitest");
    const sharp = (await import("sharp")).default;
    const { env } = await import("@/lib/env");
    const { startAvatar, getAvatar, avatarClips, VIDEO_ENDPOINT } = await import("@/lib/studio/avatars");
    freshDb();
    (env as { falKey?: string }).falKey = "test-fal";
    const png = await sharp({ create: { width: 64, height: 48, channels: 3, background: "#123" } }).png().toBuffer();
    const submitted: { url: string; body: Record<string, unknown> }[] = [];
    vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
      const u = String(url);
      if (u.startsWith("https://fal.run/")) return Response.json({ images: [{ url: "https://cdn.fal/still.png" }] });
      if (u === "https://cdn.fal/still.png") return new Response(new Uint8Array(png), { headers: { "content-type": "image/png" } });
      if (u.startsWith("https://queue.fal.run/")) {
        submitted.push({ url: u, body: JSON.parse(String(init?.body)) });
        const id = submitted.length;
        return Response.json({ status_url: `https://queue.fal/${id}/status`, response_url: `https://queue.fal/${id}` });
      }
      if (u.endsWith("/status")) return Response.json({ status: "COMPLETED" });
      if (u.startsWith("https://queue.fal/")) return Response.json({ video: { url: `https://cdn.fal/clip-${u.split("/").pop()}.mp4` } });
      if (u.startsWith("https://cdn.fal/clip-")) return new Response(new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112]));
      throw new Error(`unexpected ${u}`);
    });
    try {
      await startAvatar("lead_writer");
      for (let i = 0; i < 200 && (await getAvatar("lead_writer"))?.status === "generating"; i++) await new Promise((r) => setTimeout(r, 10));
      const m = (await getAvatar("lead_writer"))!;
      expect(m.status, m.error ?? "").toBe("ready");
      expect(Object.keys(m.clips).sort()).toEqual(["needs_you", "resting", "thinking", "working"]);
      expect(submitted).toHaveLength(4);
      expect(submitted.every((s) => s.url === `https://queue.fal.run/${VIDEO_ENDPOINT}` && String(s.body.image_url).startsWith("data:image/") && s.body.duration === "5")).toBe(true);
      expect(String(submitted.find((s) => String(s.body.prompt).includes("asleep"))?.body.prompt)).toContain("breathing");
      const clips = await avatarClips();
      expect(clips.lead_writer?.working).toMatch(/^\/api\/studio\/avatars\/lead_writer\/working\.mp4\?v=/);
      expect(clips.worldbuilder).toBeUndefined(); // everyone else keeps the drawn bedroom
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("free up space", () => {
  it("deletes only unused old files and compresses older WAV/PNG while keeping records working", async () => {
    const fs = (await import("node:fs")).default;
    const path = (await import("node:path")).default;
    const sharp = (await import("sharp")).default;
    const { env } = await import("@/lib/env");
    const { getStorage } = await import("@/lib/storage");
    const { runFfmpeg, withTmp } = await import("@/lib/studio/mixing");
    const { freeUpSpace, diskUsage } = await import("@/lib/services/disk");
    const db = freshDb();
    const storage = getStorage();
    const root = path.resolve(process.cwd(), env.dataDir, "storage");
    const age = (key: string) => { const t = new Date(Date.now() - 5 * 3600_000); fs.utimesSync(path.join(root, key), t, t); };
    // A WAV narration still used by a scene render.
    const wav = await withTmp(async (dir) => { const f = path.join(dir, "n.wav"); await runFfmpeg(["-f", "lavfi", "-i", "sine=duration=2", "-ar", "44100", "-ac", "1", f]); return fs.readFileSync(f); });
    await storage.put("audio/s1/e1/scene-1/narration-1.wav", wav, "audio/wav");
    age("audio/s1/e1/scene-1/narration-1.wav");
    const render = await db.insert("scene_renders", { id: "srn_1", episode_id: "e1", series_id: "s1", scene_index: 1, version: 1, status: "current", narration_key: "audio/s1/e1/scene-1/narration-1.wav", ambience_keys: [], music_key: null, stem_key: null, duration_seconds: 2, qa: null, created_at: new Date().toISOString() } as never);
    // A PNG artwork original that's in use, and two orphans: one old (deleted), one fresh (kept – could be work in progress).
    const png = await sharp({ create: { width: 32, height: 32, channels: 3, background: "#456" } }).png().toBuffer();
    await storage.put("art/s1/art_1/original.png", png, "image/png");
    const art = await db.insert("artwork_assets", { id: "art_1", series_id: "s1", episode_id: null, run_id: null, kind: "poster", status: "selected", prompt: "p", provider: "fal", model: "m", storage_key: "art/s1/art_1/original.png", mime_type: "image/png", url: "/api/art/art_1", variants: {}, width: 32, height: 32, review: null, created_at: new Date().toISOString() } as never);
    await storage.put("audio/s1/old/stem-9.wav", wav, "audio/wav");
    age("audio/s1/old/stem-9.wav");
    await storage.put("audio/s1/new/stem-10.wav", wav, "audio/wav");
    await storage.put("avatars/lead_writer/working.mp4", Buffer.from([1, 2, 3]), "video/mp4");
    age("avatars/lead_writer/working.mp4");

    const res = await freeUpSpace();
    expect(res.deleted).toBe(1);
    expect(await storage.get("audio/s1/old/stem-9.wav")).toBeNull();
    expect(await storage.get("audio/s1/new/stem-10.wav")).not.toBeNull();
    expect(await storage.get("avatars/lead_writer/working.mp4")).not.toBeNull();
    const r = (await db.get("scene_renders", render.id))!;
    expect(r.narration_key).toBe("audio/s1/e1/scene-1/narration-1.mp3");
    expect(await storage.get(r.narration_key!)).not.toBeNull();
    expect(await storage.get("audio/s1/e1/scene-1/narration-1.wav")).toBeNull();
    const a = (await db.get("artwork_assets", art.id))!;
    expect([a.storage_key, a.mime_type]).toEqual(["art/s1/art_1/original.jpg", "image/jpeg"]);
    expect(await storage.get(a.storage_key)).not.toBeNull();
    expect(diskUsage()!.totalBytes).toBeGreaterThan(0);
  });
});

describe("Now board", () => {
  it("puts each workflow in exactly one lane with a plain reason", async () => {
    const { studioBoard } = await import("@/lib/studio/now");
    const db = freshDb();
    const mk = async (title: string, status: string, stepStatus: string, extra: Record<string, unknown> = {}) => {
      const { run } = await createRun({ kind: "episode_production", title, budget_cents: 100, created_by: "usr_calm-editor", steps: [{ key: "a", type: "ep.draft", agent: "lead_writer", label: "Write the first draft", activity: "typing", deps: [] }] });
      await db.update("workflow_runs", run.id, { status: status as never });
      const s = (await db.findOne("workflow_steps", { run_id: run.id, key: "a" }))!;
      await db.update("workflow_steps", s.id, { status: stepStatus as never, ...extra });
    };
    await mk("Working", "running", "running");
    await mk("Approve me", "awaiting_approval", "awaiting_approval");
    await mk("Over budget", "blocked", "blocked", { needs: "budget", error: "Run budget reached" });
    await mk("Bad key", "blocked", "blocked", { needs: "ELEVENLABS_API_KEY", error: "rejected" });
    await mk("In line", "running", "pending");
    await mk("On hold", "paused", "pending");
    await mk("Shipped", "succeeded", "succeeded");
    const b = await studioBoard();
    const titles = (lane: keyof typeof b) => b[lane].map((i) => i.title).sort();
    expect(titles("working")).toEqual(["Working"]);
    expect(b.working[0]!.headline).toBe("Lead Writer: Write the first draft");
    expect(titles("needs_you")).toEqual(["Approve me"]);
    expect(titles("stuck")).toEqual(["Bad key", "Over budget"]);
    expect(b.stuck.find((i) => i.title === "Over budget")!.reason).toMatch(/raise the episode budget/);
    expect(b.stuck.find((i) => i.title === "Bad key")!.reason).toMatch(/ELEVENLABS_API_KEY/);
    expect(titles("queued")).toEqual(["In line"]);
    expect(titles("paused")).toEqual(["On hold"]);
    expect(titles("done")).toEqual(["Shipped"]);
  });
});

describe("Quick fix", () => {
  it("explains common problems simply and picks the right fix", async () => {
    const { diagnose } = await import("@/lib/studio/quickfix");
    const d = (needs: string | null, error: string) => diagnose({ status: "blocked", needs, error, label: "x" });
    expect(d("budget", "Run budget reached ($1.45 of $1.00)")).toMatchObject({ title: "Out of budget", fix: "raise_budget" });
    expect(d(null, "ENOSPC: no space left on device, mkdir '/data/storage/audio'")).toMatchObject({ title: "Disk full", fix: "free_space" });
    expect(d("ELEVENLABS_API_KEY", 'ElevenLabs 401: {"message":"The API key you used is missing the permission pronunciation_dictionary_write"}')).toMatchObject({ title: "Key missing a permission" });
    expect(d("ELEVENLABS_API_KEY", 'ElevenLabs 401: {"status":"quota_exceeded"}')).toMatchObject({ title: "Out of credits" });
    expect(d("ANTHROPIC_API_KEY", "Connect an Anthropic API key")).toMatchObject({ title: "Key missing or wrong", fix: "retry" });
    expect(diagnose({ status: "failed", needs: null, error: "The model ran out of room before finishing.", label: "x" })).toMatchObject({ title: "Answer cut off", fix: "retry" });
  });

  it("raises the budget for a budget block, and re-queues failed steps", async () => {
    const { quickFix } = await import("@/lib/studio/quickfix");
    const db = freshDb();
    const one = async (title: string) => (await createRun({ kind: "episode_production", title, budget_cents: 100, created_by: "usr_calm-editor", steps: [{ key: "a", type: "ep.draft", agent: "lead_writer", label: "Write", activity: "typing", deps: [] }] })).run;
    const r1 = await one("Over budget");
    await db.update("workflow_runs", r1.id, { status: "blocked", cost_cents: 145 });
    const s1 = (await db.findOne("workflow_steps", { run_id: r1.id, key: "a" }))!;
    await db.update("workflow_steps", s1.id, { status: "blocked", needs: "budget", error: "Run budget reached" });
    expect((await quickFix(r1.id)).did).toMatch(/Raised the budget to \$3\.00/);
    expect((await db.get("workflow_runs", r1.id))!.budget_cents).toBe(300);
    expect((await db.findOne("workflow_steps", { run_id: r1.id, key: "a" }))!.status).toBe("pending");
    const r2 = await one("Broke");
    await db.update("workflow_runs", r2.id, { status: "failed" });
    const s2 = (await db.findOne("workflow_steps", { run_id: r2.id, key: "a" }))!;
    await db.update("workflow_steps", s2.id, { status: "failed", error: "The model ran out of room before finishing." });
    await quickFix(r2.id);
    expect((await db.findOne("workflow_steps", { run_id: r2.id, key: "a" }))!.status).toBe("pending");
    expect((await db.get("workflow_runs", r2.id))!.status).toBe("running");
  });
});

describe("Ask the studio", () => {
  it("answers from a live snapshot that includes the real disk size and current errors", async () => {
    const { askStudio } = await import("@/lib/studio/ask");
    const db = freshDb();
    const { run } = await createRun({ kind: "episode_production", title: "Full disk ep", budget_cents: 300, created_by: "usr_calm-editor", steps: [{ key: "a", type: "audio.scene", agent: "audio_producer", label: "Narrate and mix scene 5", activity: "typing", deps: [] }] });
    const s = (await db.findOne("workflow_steps", { run_id: run.id, key: "a" }))!;
    await db.update("workflow_steps", s.id, { status: "failed", error: "ENOSPC: no space left on device, mkdir '/data/storage/audio/x'" });
    let seen = "";
    setClaudeTransport(async (req: TransportRequest) => {
      seen = req.system.map((b) => b.text).join("\n") + "\n" + JSON.stringify(req.content);
      return { text: "Your volume is full.", model: req.model, usage: { input_tokens: 10, output_tokens: 5, cache_read_tokens: 0, cache_write_tokens: 0, web_searches: 0 } };
    });
    const res = await askStudio("Why does it say the disk is full?");
    expect(res.answer).toBe("Your volume is full.");
    expect(seen).toMatch(/Disk the app sees: [\d.]+ GB total/);
    expect(seen).toContain("ENOSPC: no space left on device");
    expect(seen).toContain("Why does it say the disk is full?");
    expect(seen).toContain("Disk full"); // the Quick fix diagnosis is included too
  });
});
