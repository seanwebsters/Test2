import { afterEach, describe, expect, it, vi } from "vitest";
import { drain, startSeriesDevelopment, resolveGate, resumeRun } from "@/lib/studio";
import { setClaudeTransport, type TransportRequest } from "@/lib/studio/llm";
import { scenePlanProblems } from "@/lib/studio/workflows/episode";
import { splitPerformance } from "@/lib/studio/workflows/audio-steps";
import { decideReview } from "@/lib/services/editorial";
import { getStorage } from "@/lib/storage";
import { env } from "@/lib/env";
import { freshDb } from "./helpers";
import { fakeClaude, fakeProviderFetch } from "./studio-fakes";

const keys = env as { anthropicApiKey?: string; geminiApiKey?: string; elevenLabsApiKey?: string };

afterEach(() => {
  setClaudeTransport(null);
  keys.geminiApiKey = undefined;
  keys.elevenLabsApiKey = undefined;
  keys.anthropicApiKey = undefined;
  vi.unstubAllGlobals();
});

describe("Sleep Stories Studio – end to end", () => {
  it("develops a series from a brief, waits for greenlight, then writes, illustrates, narrates, masters and QCs an episode that publishes only after human approval", async () => {
    const db = freshDb();
    const script = { calls: [] as TransportRequest[], synthesisRounds: 0 };
    setClaudeTransport(fakeClaude(script));
    keys.geminiApiKey = "test-gemini";
    keys.elevenLabsApiKey = "test-eleven";
    const providers = await fakeProviderFetch();
    vi.stubGlobal("fetch", providers.fn);

    const { project, run } = await startSeriesDevelopment({ brief: "A premium adult romantasy series about an enchanted sleeper train travelling between magical kingdoms. Slow burn.", userId: "usr_calm-editor" });
    await drain();

    // Stops at the human greenlight gate – nothing is produced past it.
    let r = (await db.get("workflow_runs", run.id))!;
    const steps = await db.list("workflow_steps", { where: { run_id: run.id } });
    expect(r.status, JSON.stringify(steps.filter((s) => s.error).map((s) => [s.key, s.error]))).toBe("awaiting_approval");
    expect((await db.get("series_projects", project.id))!.status).toBe("awaiting_greenlight");
    const done = steps.filter((s) => s.status === "succeeded").map((s) => s.key);
    for (const k of ["research", "concepts", "critique", "identity", "world", "characters", "romance", "season", "continuity", "visual_identity", "portraits", "posters", "poster_review"]) expect(done).toContain(k);

    const seriesId = r.series_id!;
    const series = (await db.get("series", seriesId))!;
    expect(series.status).toBe("draft"); // invisible to listeners
    expect(series.title).toBe("The Night Train to Ossery");
    expect(series.artwork.image_url).toMatch(/^\/api\/art\//);
    const bible = (await db.get("series_bibles", seriesId))!;
    expect(bible.data.identity?.target_minutes).toBe(3);
    expect(bible.data.world).not.toBeNull();
    expect(bible.data.visual_identity?.palette.length).toBeGreaterThan(0);
    expect((await db.list("bible_versions", { where: { series_id: seriesId } })).length).toBeGreaterThan(3);
    expect((await db.list("characters", { where: { series_id: seriesId } })).map((c) => c.name)).toEqual(["Wren Alder", "Ilan Mere"]);
    // Posters reference the character portraits for consistency, and get a typeset title.
    expect(providers.counts.imagesWithRefs).toBeGreaterThanOrEqual(3);
    const poster = (await db.list("artwork_assets", { where: { series_id: seriesId, kind: "poster", status: "selected" } }))[0]!;
    expect(poster.variants.titled).toBeTruthy();
    expect(await getStorage().get(`art/${seriesId}/${poster.id}/titled.png`)).not.toBeNull();
    // Web research was used and the bible context is cached in the system prompt.
    expect(script.calls.some((c) => c.webSearch && c.agent === "program_director")).toBe(true);
    expect(script.calls.filter((c) => c.agent === "lead_writer").length).toBe(0);
    expect(script.calls.find((c) => c.agent === "worldbuilder")!.system[1]!.cache_control).toEqual({ type: "ephemeral" });

    // Greenlight → casting, pronunciation, and episode one starts.
    await resolveGate(run.id, "greenlight", { approved: true, userId: "usr_calm-editor", notes: "Lovely." });
    await drain();
    r = (await db.get("workflow_runs", run.id))!;
    expect(r.status).toBe("succeeded");
    expect((await db.get("series_projects", project.id))!.status).toBe("greenlit");
    expect((await db.list("voice_auditions", { where: { series_id: seriesId } })).length).toBeGreaterThanOrEqual(3);
    expect(providers.counts.dictionaries).toBe(1);
    // Every series gets exactly one selected narrator.
    expect((await db.list("voice_auditions", { where: { series_id: seriesId, character_id: null, selected: true } })).length).toBe(1);

    const epRun = (await db.list("workflow_runs", { where: { kind: "episode_production", series_id: seriesId } }))[0]!;
    expect(epRun.status, JSON.stringify((await db.list("workflow_steps", { where: { run_id: epRun.id } })).filter((s) => s.error).map((s) => [s.key, s.error]))).toBe("awaiting_approval");
    const epSteps = await db.list("workflow_steps", { where: { run_id: epRun.id } });
    const keysDone = epSteps.filter((s) => s.status === "succeeded").map((s) => s.key);
    // Multi-stage writing with one real revision round.
    for (const k of ["outline", "scene_plan", "draft", "review_character_r1", "review_romance_r1", "review_dialogue_r1", "review_continuity_r1", "review_sleep_r1", "review_critic_r1", "synthesis_r1", "rewrite_r1", "review_critic_r2", "synthesis_r2", "finalize", "cover_concepts", "cover_review", "audio_direction", "audio_master", "qc"]) {
      expect(keysDone).toContain(k);
    }
    expect(script.synthesisRounds).toBe(2);
    // Scenes are written one call at a time, never one-shot.
    expect(script.calls.filter((c) => c.agent === "lead_writer" && !c.jsonSchema).length).toBeGreaterThanOrEqual(6);
    const versions = await db.list("deliverables", { where: { episode_id: epRun.episode_id!, key: "script" } });
    expect(versions.map((v) => v.version).sort()).toEqual([1, 2]);

    const ep = (await db.get("episodes", epRun.episode_id!))!;
    expect(ep.status).toBe("in_review");
    expect(ep.artwork_url).toMatch(/^\/api\/art\//);
    const master = (await db.get("audio_assets", ep.audio_asset_id!))!;
    expect(master.kind).toBe("produced");
    expect(master.duration_seconds).toBeGreaterThan(10);
    const loud = master.meta.loudness as { integrated_lufs: number; true_peak_dbtp: number };
    expect(loud.integrated_lufs).toBeGreaterThan(-30);
    expect(loud.true_peak_dbtp).toBeLessThanOrEqual(-1);
    expect((await db.list("scene_renders", { where: { episode_id: ep.id } })).length).toBe(5);
    expect(providers.counts.tts).toBeGreaterThanOrEqual(5);
    // Budget mode: the same ambience prompt is generated once and reused from the series library; music is off by default.
    expect(providers.counts.sfx).toBe(1);
    expect(providers.counts.music).toBe(0);
    expect((await db.get("workflow_runs", epRun.id))!.cost_cents).toBeLessThanOrEqual(100);
    expect((await db.get("series_bibles", seriesId))!.data.timeline.length).toBe(1);
    const usage = await db.list("usage_records");
    expect(usage.some((u) => u.provider === "anthropic") && usage.some((u) => u.provider === "gemini") && usage.some((u) => u.provider === "elevenlabs")).toBe(true);

    // Never published without a human.
    const review = (await db.findOne("editorial_reviews", { episode_id: ep.id }))!;
    expect(review.source).toBe("agents");
    await decideReview(review.id, "usr_calm-editor", { decision: "approve", release_at: new Date(Date.now() - 1000).toISOString() });
    expect((await db.get("episodes", ep.id))!.status).toBe("published");
    expect((await db.get("series", seriesId))!.status).toBe("published");
    expect((await db.get("workflow_runs", epRun.id))!.status).toBe("succeeded");
    // Handoffs were recorded for the AI Team room.
    expect((await db.list("workflow_events", { where: { kind: "handoff" } })).length).toBeGreaterThan(5);
  }, 240_000);

  it("parks a step as blocked when a provider key is missing, then resumes once it is connected", async () => {
    const db = freshDb();
    setClaudeTransport(null); // real transport, no ANTHROPIC_API_KEY
    const { run } = await startSeriesDevelopment({ brief: "A gentle coastal romance between a lighthouse keeper and a cartographer.", userId: "usr_calm-editor" });
    await drain();
    const step = (await db.findOne("workflow_steps", { run_id: run.id, key: "research" }))!;
    expect(step.status).toBe("blocked");
    expect(step.needs).toBe("ANTHROPIC_API_KEY");
    expect((await db.get("workflow_runs", run.id))!.status).toBe("blocked");
    expect(await db.count("deliverables")).toBe(0); // nothing fabricated

    setClaudeTransport(fakeClaude({ calls: [], synthesisRounds: 0 }));
    await resumeRun(run.id);
    await drain({ maxTicks: 3 });
    expect((await db.findOne("workflow_steps", { run_id: run.id, key: "research" }))!.status).toBe("succeeded");
  });

  it("rejects scene plans that rise in intensity late or end loud, and splits dialogue for multi-voice narration", () => {
    const base = { title: "t", location: "l", characters: [], purpose: "p", emotional_beat: "b", sensory_anchors: [], dialogue_notes: "" };
    const bad = { scenes: [0.6, 0.7, 0.4, 0.6, 0.5].map((intensity, i) => ({ ...base, index: i + 1, intensity, target_words: 100 })) };
    const problems = scenePlanProblems(bad, 500);
    expect(problems.join(" ")).toMatch(/raises intensity after the midpoint/);
    expect(problems.join(" ")).toMatch(/final scene should be the calmest/);
    expect(splitPerformance("She smiled. “Stay,” he said. “Just tonight.”").map((p) => p.kind)).toEqual(["narration", "quote", "narration", "quote"]);
  });
});
