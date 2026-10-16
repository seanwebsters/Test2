import { afterEach, describe, expect, it, vi } from "vitest";
import { enqueueProduction, runJob } from "@/lib/agents";
import { setWriter } from "@/lib/agents/config";
import { sleepChecks, splitSections } from "@/lib/agents/pipeline";
import { decideReview } from "@/lib/services/editorial";
import { env } from "@/lib/env";
import type { LlmProvider } from "@/lib/ai/provider";
import { freshDb } from "./helpers";

const SERIES = "ser_the-moonlit-kingdom";
const mutableEnv = env as { elevenLabsApiKey?: string; geminiApiKey?: string };

afterEach(() => {
  setWriter(undefined);
  mutableEnv.elevenLabsApiKey = undefined;
  mutableEnv.geminiApiKey = undefined;
  vi.unstubAllGlobals();
});

describe("agent production pipeline", () => {
  it("produces an episode end to end with offline stand-ins and files it for review", async () => {
    const db = freshDb();
    setWriter(null);
    const { job } = await enqueueProduction({ series_id: SERIES, workflow_id: "wf_the-moonlit-kingdom", target_minutes: 1, requested_by: "usr_calm-editor" });
    await runJob(job.id);
    const done = (await db.get("production_jobs", job.id))!;
    expect(done.status, JSON.stringify(done.logs.slice(-3))).toBe("succeeded");
    expect(done.steps.map((s) => s.status)).toEqual(["succeeded", "succeeded", "succeeded", "succeeded", "succeeded", "succeeded", "skipped", "succeeded"]);
    expect(done.steps.find((s) => s.id === "narrate")?.simulated).toBe(true);

    const ep = (await db.get("episodes", done.episode_id!))!;
    expect(ep.status).toBe("in_review");
    const asset = (await db.get("audio_assets", ep.audio_asset_id!))!;
    expect(asset.kind).toBe("produced");
    expect(asset.meta.simulated).toBe(true);
    expect(asset.duration_seconds).toBeGreaterThan(20);
    const review = (await db.findOne("editorial_reviews", { episode_id: ep.id }))!;
    expect(review.source).toBe("agents");
    expect(review.checks.find((c) => c.name === "audio_qa")?.status).toBe("warn"); // placeholder voice is flagged

    // Agents never publish: it stays private until an editor approves.
    await decideReview(review.id, "usr_calm-editor", { decision: "approve", release_at: new Date(Date.now() - 1000).toISOString() });
    expect((await db.get("episodes", ep.id))!.status).toBe("published");
  });

  it("uses Claude, ElevenLabs and Nano Banana when they are connected", async () => {
    const db = freshDb();
    const writer: LlmProvider = {
      name: "test",
      async json<T>(input: { schema: { parse: (v: unknown) => T } }) {
        return {
          data: input.schema.parse({ title: "The Lantern Fair", summary: "The kingdom gathers for a hushed lantern fair by the lake.", beats: ["Dusk", "Lanterns", "Home"], ambience_prompt: "lake at night", art_prompt: "lanterns on a lake" }),
          usage: { input_tokens: 1000, output_tokens: 500 },
          model: "claude-opus-5-5",
        };
      },
      async text() {
        return { data: Array.from({ length: 6 }, (_, i) => `Section ${i + 1}. The lanterns drift slowly across the still water, and everything is quiet.`).join("\n\n---\n\n"), usage: { input_tokens: 2000, output_tokens: 3000 }, model: "claude-opus-5-5" };
      },
    } as LlmProvider;
    setWriter(writer);
    mutableEnv.elevenLabsApiKey = "el-test";
    mutableEnv.geminiApiKey = "gm-test";
    const calls: string[] = [];
    const pcm = Buffer.alloc(22050 * 2 * 3); // 3 s of silence-ish PCM
    for (let i = 0; i < pcm.length / 2; i++) pcm.writeInt16LE(Math.round(Math.sin(i / 20) * 3000), i * 2);
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push(String(url));
      if (String(url).includes("api.elevenlabs.io")) {
        expect((init.headers as Record<string, string>)["xi-api-key"]).toBe("el-test");
        return new Response(pcm);
      }
      if (String(url).includes("generativelanguage.googleapis.com")) {
        expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe("gm-test");
        const body = JSON.parse(String(init.body));
        expect(body.generationConfig.responseModalities).toEqual(["IMAGE"]);
        return Response.json({ candidates: [{ content: { parts: [{ inlineData: { mimeType: "image/png", data: Buffer.from("png").toString("base64") } }] } }] });
      }
      throw new Error(`unexpected fetch ${url}`);
    });
    const { job } = await enqueueProduction({ series_id: SERIES, target_minutes: 1 });
    await runJob(job.id);
    const done = (await db.get("production_jobs", job.id))!;
    expect(done.status, JSON.stringify(done.logs.slice(-3))).toBe("succeeded");
    expect(done.steps.every((s) => !s.simulated && s.status === "succeeded")).toBe(true);
    expect(calls.filter((u) => u.includes("/text-to-speech/")).length).toBe(6);
    expect(calls.filter((u) => u.includes("/sound-generation")).length).toBe(1);
    expect(calls.filter((u) => u.includes(":generateContent")).length).toBe(2); // episode art + missing series cover
    const ep = (await db.get("episodes", done.episode_id!))!;
    expect(ep.title).toBe("The Lantern Fair");
    expect(ep.artwork_url).toMatch(/^\/api\/art\//);
    expect((await db.get("series", SERIES))!.artwork.image_url).toMatch(/^\/api\/art\//);
    expect(done.cost_cents).toBeGreaterThan(0);
  });

  it("is idempotent per release slot and resumes without repeating paid work", async () => {
    const db = freshDb();
    setWriter(null);
    const a = await enqueueProduction({ series_id: SERIES, idempotency_key: "prod:x:slot1", target_minutes: 1 });
    const b = await enqueueProduction({ series_id: SERIES, idempotency_key: "prod:x:slot1", target_minutes: 1 });
    expect(b.created).toBe(false);
    expect(b.job.id).toBe(a.job.id);
    expect((await db.list("production_jobs")).length).toBe(1);
  });

  it("checks scripts for bedtime suitability", () => {
    expect(sleepChecks("A soft walk. ".repeat(60), 120)).toEqual([]);
    expect(sleepChecks("He screamed and the monster attacked! ".repeat(10), 120).join(" ")).toMatch(/unsettling/);
    expect(splitSections("a\n\n---\n\nb\n\n---\n\nc")).toEqual(["a", "b", "c"]);
  });
});
