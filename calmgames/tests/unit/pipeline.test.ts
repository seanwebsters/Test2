/**
 * End-to-end orchestration test. A local HTTP server stands in for the
 * Anthropic API (test-only; the app itself never simulates agents), so this
 * exercises the real SDK streaming path, schema validation, the correction
 * loop, real Playwright QA, versioning, refinement and export.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import http from "node:http";
import type { AddressInfo } from "node:net";
import JSZip from "jszip";

const requests: { system: string; prompt: string }[] = [];
let devCalls = 0;

const stars = [
  { id: "a", x: 0.2, y: 0.7, mag: 2 },
  { id: "b", x: 0.4, y: 0.5, mag: 1 },
  { id: "c", x: 0.6, y: 0.4, mag: 2 },
  { id: "d", x: 0.8, y: 0.25, mag: 1 },
  { id: "e", x: 0.6, y: 0.75, mag: 3 },
];
const level = (name: string) => ({ name, story: "A lantern drifts over the bay.", stars, edges: [["a", "b"], ["b", "c"], ["c", "d"], ["c", "e"]], hint: "both", note: "Start with the brightest star." });

function reply(system: string, prompt: string): unknown {
  if (system.includes("Creative Director"))
    return {
      title: "Lantern Bay",
      logline: "Draw the old lantern constellations back into the sky.",
      concept: "A quiet harbour at night; the player traces constellations that guided fishing boats home.",
      emotionalGoal: "Settled, unhurried attention before sleep.",
      playerObjective: "Complete each figure to hear its story.",
      interactionModel: "Drag between stars.",
      archetype: "constellation",
      archetypeRationale: "Connecting stars suits a slow evening ritual.",
      setting: "A sleeping harbour.",
      visualDirection: "Deep navy, lamplight gold.",
      variations: ["Dawn version", "Winter sky"],
      adultSuitability: "Reflective storytelling with no pressure.",
    };
  if (system.includes("Senior Game Designer"))
    return {
      coreLoop: "Find a star, draw a line, watch the figure glow.",
      rules: ["Lines join two stars", "Wrong lines fade"],
      controls: { pointer: "Drag", touch: "Drag", keyboard: "Arrows and Enter" },
      progression: [{ level: "One", focus: "Learn", difficulty: 1 }],
      winCondition: "Every line drawn.",
      feedback: ["Glow", "Chime"],
      rewards: ["Story"],
      stressSafeguards: ["No timer", "No penalty"],
      sessionLengthSeconds: 90,
      levelDesignNotes: "Five stars, four lines.",
    };
  if (system.includes("Art Director"))
    return {
      paletteName: "Harbour Night",
      palette: { sky: ["#0F1833", "#2B3463"], ground: "#1A2245", surface: "#2A3563", accent: "#F1D99B", accentSoft: "#B9AEDC", ink: "#F4EFE4", glow: "#DCE3FF" },
      environment: "Night harbour",
      visualElements: ["Stars", "Lantern light"],
      particles: "stars",
      particleDensity: 0.5,
      motionTempo: 0.8,
      transitions: ["Slow dissolve"],
      sound: { scale: "lydian", root: 261.63, mood: "Soft bells" },
      typographyNote: "Serif titles",
      accessibilityNotes: ["High contrast ink"],
      assets: [{ name: "Lantern", purpose: "Emblem", svg: '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="12" fill="#F1D99B"/></svg>' }],
    };
  if (system.includes("Senior Game Developer")) {
    devCalls++;
    const refining = prompt.includes("REFINEMENT");
    const base = { archetype: "constellation", title: "Lantern Bay", subtitle: "Night constellations", intro: "Drag between stars.", completion: "The bay is lit.", levels: [level("The Lantern")] };
    // First attempt has crossing lines: the validator must reject it and ask for a correction.
    if (devCalls === 1) return { ...base, levels: [{ ...level("The Lantern"), edges: [["a", "c"], ["b", "e"], ["c", "d"]] }] };
    return refining ? { ...base, levels: [level("The Lantern"), level("The Boat")] } : base;
  }
  if (system.includes("Product Analyst"))
    return { qualityScore: 8, summary: "Calm and clear.", strengths: ["Readable"], risks: [], recommendations: [{ title: "Add a third figure", detail: "More variety.", basis: "hypothesis" }], nextConcepts: [] };
  throw new Error("unexpected agent");
}

function sse(text: string) {
  const ev = (type: string, data: unknown) => `event: ${type}\ndata: ${JSON.stringify({ type, ...(data as object) })}\n\n`;
  return [
    ev("message_start", { message: { id: "msg_test", type: "message", role: "assistant", model: "claude-opus-5-5", content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 1000, output_tokens: 1 } } }),
    ev("content_block_start", { index: 0, content_block: { type: "text", text: "" } }),
    ev("content_block_delta", { index: 0, delta: { type: "text_delta", text } }),
    ev("content_block_stop", { index: 0 }),
    ev("message_delta", { delta: { stop_reason: "end_turn", stop_sequence: null }, usage: { output_tokens: 800 } }),
    ev("message_stop", {}),
  ].join("");
}

let server: http.Server;
beforeAll(async () => {
  server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const json = JSON.parse(body);
      const system = typeof json.system === "string" ? json.system : "";
      const prompt = json.messages[0].content as string;
      requests.push({ system, prompt });
      res.writeHead(200, { "content-type": "text/event-stream" });
      res.end(sse(JSON.stringify(reply(system, prompt))));
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  process.env.ANTHROPIC_API_KEY = "test-key";
  process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => server.close());

async function waitFor(jobId: string) {
  const { repo } = await import("@/lib/store");
  for (let i = 0; i < 600; i++) {
    const job = await (await repo()).getJob(jobId);
    if (job && (job.status === "complete" || job.status === "failed")) return job;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("job timed out");
}

describe("generation pipeline", () => {
  it("runs six agents in order, self-corrects, tests in a browser, and versions on refinement", async () => {
    const { startGeneration, startRefinement } = await import("@/lib/orchestrator");
    const { repo } = await import("@/lib/store");
    const { exportBundle } = await import("@/lib/exporter");
    const store = await repo();

    const { job, game } = await startGeneration({ prompt: "A calm night-sky game about lanterns", archetype: "auto" });
    const done = await waitFor(job.id);
    expect(done.error).toBeUndefined();
    expect(done.status).toBe("complete");
    expect(done.steps.map((s) => [s.agent, s.status])).toEqual([["ideation", "complete"], ["design", "complete"], ["art", "complete"], ["development", "complete"], ["qa", "complete"], ["insights", "complete"]]);
    // Agents ran in sequence, and each received the previous agent's output.
    expect(requests.map((r) => r.system.match(/You are the studio's ([A-Za-z ]+?) \(|You are the studio's ([A-Za-z ]+?)\./)?.slice(1).find(Boolean))).toEqual(["Creative Director", "Senior Game Designer", "Art Director", "Senior Game Developer", "Senior Game Developer", "Product Analyst"]);
    expect(requests[1].prompt).toContain("Lantern Bay");
    expect(requests[4].prompt).toContain("cross"); // the correction request quoted the validator
    expect(done.costUsd).toBeGreaterThan(0);

    const v1 = (await store.getVersion(game.id, 1))!;
    expect(v1.build?.mode).toBe("template");
    expect(v1.qa?.ran).toBe(true);
    expect(v1.qa?.passed).toBe(true);
    expect(v1.review?.qualityScore).toBe(8);
    expect(await store.getThumbnail(game.id)).not.toBeNull();
    const g1 = (await store.getGame(game.id))!;
    expect(g1).toMatchObject({ name: "Lantern Bay", status: "ready", currentVersion: 1, latestVersion: 1 });

    const refine = await startRefinement(game.id, "Add more levels.");
    const r = await waitFor(refine.id);
    expect(r.status).toBe("complete");
    const versions = await store.listVersions(game.id);
    expect(versions.map((v) => v.number)).toEqual([1, 2]);
    expect(versions[1].instruction).toBe("Add more levels.");
    expect(versions[1].build?.mode === "template" && versions[1].build.config.levels.length).toBe(2);
    expect(versions[0].build?.mode === "template" && versions[0].build.config.levels.length).toBe(1);
    expect(requests.at(-2)!.prompt).toContain("REFINEMENT");

    const zip = await JSZip.loadAsync(await exportBundle((await store.getGame(game.id))!, versions[1], await store.listAssets()));
    const html = await zip.file("lantern-bay/index.html")!.async("string");
    expect(html).toContain("connect-src 'none'");
    expect(html).toContain("The Boat");
    expect(Object.keys(zip.files)).toContain("lantern-bay/assets/lantern.svg");

    expect((await store.listUsage()).length).toBe(requests.length);
  }, 240000);
});
