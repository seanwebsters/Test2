import { beforeEach, describe, expect, it } from "vitest";
import { freshDb, viewers } from "./helpers";
import type { LocalDatabase } from "@/lib/db/local";
import { DEFAULT_AI_SETTINGS } from "@/lib/seed/agents";
import { chat, resolvePendingCall, runAction } from "@/lib/storymaker/agent";
import * as svc from "@/lib/storymaker/service";
import { dispatchTool, toolSpecs } from "@/lib/storymaker/tools";
import { analyseContinuity, analyseSleepSuitability } from "@/lib/ai/mock";
import { loadStoryContext } from "@/lib/storymaker/context";
import type { ConceptProposal } from "@/lib/types";

let db: LocalDatabase;
beforeEach(async () => {
  db = freshDb();
  // Force the offline writer so tests never call a paid API.
  await db.upsert("ai_settings", { ...DEFAULT_AI_SETTINGS, writing_provider: "mock", updated_at: new Date().toISOString() });
});

describe("tool registry", () => {
  it("exposes every Part 8 tool with a JSON schema", () => {
    const names = toolSpecs().map((t) => t.name);
    for (const n of [
      "create_series",
      "update_series",
      "generate_synopsis",
      "create_world",
      "update_world_bible",
      "create_character",
      "update_character",
      "generate_season_outline",
      "generate_episode_outline",
      "write_episode",
      "rewrite_script_section",
      "check_story_continuity",
      "generate_cover_art",
      "schedule_episode",
      "submit_for_review",
    ]) {
      expect(names).toContain(n);
    }
    for (const t of toolSpecs()) expect(t.input_schema.type).toBe("object");
  });

  it("rejects invalid input and other creators' series", async () => {
    const creator = await viewers.creator();
    await expect(dispatchTool("create_character", { count: 99 }, { viewer: creator, seriesId: "series-the-lighthouse-bakery", conversationId: null })).rejects.toThrow(/Invalid input/);
    const other = await viewers.otherCreator();
    const r = await dispatchTool("generate_cover_art", {}, { viewer: other, seriesId: "series-the-lighthouse-bakery", conversationId: null });
    expect(r.status).toBe("failed");
  });

  it("listeners cannot use Storymaker", async () => {
    await expect(chat(await viewers.listener(), { message: "A story about a lighthouse" })).rejects.toThrow(/Creator access/);
  });
});

describe("Journey B: creator builds a series in Storymaker", () => {
  it("goes from idea to a submitted episode, with confirmations", async () => {
    const creator = await viewers.creator();

    // 1. Idea → concept proposal (nothing saved yet).
    const before = await db.count("series");
    const first = await chat(creator, { message: "Create a Sleep Story romantasy set in a moonlit kingdom with a gentle prince and a royal gardener" });
    expect(first.simulated).toBe(true);
    const reply = first.conversation.messages.at(-1);
    const concept = reply?.cards?.find((c) => c.type === "concept");
    expect(concept?.type).toBe("concept");
    expect(await db.count("series")).toBe(before);
    const proposal = (concept as { proposal: ConceptProposal }).proposal;
    expect(proposal.genre).toBe("Sleep Romantasy");

    // 2. Accept → private draft series.
    const created = await runAction(creator, { tool: "create_series", input: proposal, conversationId: first.conversation.id });
    expect(created.result.status).toBe("executed");
    const seriesId = created.seriesId as string;
    const series = await db.get("series", seriesId);
    expect(series?.status).toBe("draft");
    expect(series?.creator_id).toBe(creator.user?.id);
    expect(series?.ai_disclosure).toBeTruthy();

    // 3. World, characters, season plan through the assistant.
    await chat(creator, { seriesId, message: "Build the world bible" });
    const bible = await db.findOne("story_bibles", { series_id: seriesId });
    expect(bible?.world_name).toBeTruthy();
    expect(bible?.creator_preferences.join(" ")).toContain("moonlit kingdom");
    await chat(creator, { seriesId, message: "Add a mentor character named Bram" });
    const chars = await db.list("characters", { where: { series_id: seriesId } });
    expect(chars.some((c) => c.name === "Bram")).toBe(true);
    await chat(creator, { seriesId, message: "Plan a season of 4 episodes" });
    const eps = await db.list("episodes", { where: { series_id: seriesId } });
    expect(eps).toHaveLength(4);

    // 4. Regenerating the world now needs confirmation.
    const again = await chat(creator, { seriesId, message: "Rebuild the world bible" });
    const confirm = again.conversation.messages.at(-1)?.cards?.find((c) => c.type === "confirmation");
    expect(confirm?.type).toBe("confirmation");

    // 5. Write episode 1 → version 1, memory recorded, continuity flagged not rewritten.
    await chat(creator, { seriesId, message: "Write episode 1" });
    const ep1 = (await db.list("episodes", { where: { series_id: seriesId } })).find((e) => e.number === 1);
    expect(ep1?.status).toBe("script_ready");
    const bundle = await svc.getScriptBundle(creator, ep1!.id);
    expect(bundle.current?.simulated).toBe(true);
    expect(bundle.current?.word_count).toBeGreaterThan(400);
    expect(await db.count("narrative_events", { episode_id: ep1!.id })).toBeGreaterThan(0);

    // 6. Edit, rewrite a passage, roll back.
    const original = bundle.current!.content;
    await svc.saveScript(creator, ep1!.id, original + "\n\nA final line, added by hand.");
    const passage = original.split("\n\n")[1] as string;
    await dispatchTool("rewrite_script_section", { episode_id: ep1!.id, passage, instruction: "Make it more relaxing" }, { viewer: creator, seriesId, conversationId: null });
    const afterRewrite = await svc.getScriptBundle(creator, ep1!.id);
    expect(afterRewrite.versions).toHaveLength(3);
    const v1 = afterRewrite.versions.find((v) => v.version === 1)!;
    await svc.restoreVersion(creator, ep1!.id, v1.id);
    const restored = await svc.getScriptBundle(creator, ep1!.id);
    expect(restored.current?.content).toBe(original);
    expect(restored.versions).toHaveLength(4);

    // 7. Submitting needs confirmation and a rights declaration; editors are notified.
    const ask = await chat(creator, { seriesId, message: "Submit episode 1 for review" });
    const card = ask.conversation.messages.at(-1)?.cards?.find((c) => c.type === "confirmation") as { tool_call_id: string } | undefined;
    expect(card).toBeTruthy();
    expect((await db.get("episodes", ep1!.id))?.status).toBe("script_ready");
    const noRights = await resolvePendingCall(creator, card!.tool_call_id, "confirm");
    expect(noRights.status).toBe("failed");
    await svc.declareRights(creator, seriesId, { original_work: true, ai_assisted: true, third_party_material: "", voice_consent: true });
    const r = await dispatchTool("submit_for_review", { episode_id: ep1!.id }, { viewer: creator, seriesId, conversationId: null }, { confirmed: true });
    expect(r.status).toBe("executed");
    expect((await db.get("episodes", ep1!.id))?.status).toBe("in_review");
    expect((await db.get("series", seriesId))?.status).toBe("in_review");
    const review = await db.findOne("editorial_reviews", { episode_id: ep1!.id });
    expect(review?.status).toBe("pending");
    expect(review?.checks.find((c) => c.name === "rights")?.status).toBe("pass");
    expect(await db.count("notifications", { user_id: "user-calm-editor", kind: "review" })).toBeGreaterThan(0);

    // Still private to the public.
    const visitor = await viewers.visitor();
    const { canViewSeries } = await import("@/lib/auth/policy");
    expect(canViewSeries(visitor, (await db.get("series", seriesId))!)).toBe(false);

    // Every generation is on the audit trail as simulated, at zero cost.
    const costs = await db.list("production_costs", { where: { series_id: seriesId } });
    expect(costs.length).toBeGreaterThan(0);
    expect(costs.every((c) => c.simulated && c.cost_cents === 0)).toBe(true);
  });
});

describe("Journey C: continuing a series with story memory", () => {
  it("proposes the next episode and adds it only when accepted", async () => {
    const creator = await viewers.creator();
    const seriesId = "series-the-lighthouse-bakery";
    const count = await db.count("episodes", { series_id: seriesId });
    const out = await chat(creator, { seriesId, message: "What happens next?" });
    const dir = out.conversation.messages.at(-1)?.cards?.find((c) => c.type === "direction");
    expect(dir?.type).toBe("direction");
    expect(await db.count("episodes", { series_id: seriesId })).toBe(count);
    const proposal = (dir as { proposal: { episode_title: string; summary: string; beats: string[]; threads_advanced: string[] } }).proposal;
    expect(proposal.threads_advanced[0]).toContain("recipe tin");
    await runAction(creator, { tool: "accept_direction", input: { ...proposal, episode_title: "The Recipe Tin" }, seriesId });
    const eps = await db.list("episodes", { where: { series_id: seriesId } });
    expect(eps).toHaveLength(count + 1);
    expect(eps.some((e) => e.title === "The Recipe Tin")).toBe(true);
  });

  it("flags lore contradictions without changing anything", async () => {
    const ctx = await loadStoryContext("series-the-moonlit-kingdom");
    const rule = "No blades are carried in the kingdom.";
    ctx.bible = { ...ctx.bible!, rules: [...ctx.bible!.rules, rule] };
    const report = analyseContinuity(ctx, 'Elara drew a sword from the wall. "Hello," says Mortimer.');
    expect(report.issues.some((i) => i.severity === "conflict" && i.message.includes(rule))).toBe(true);
    expect(report.issues.some((i) => i.message.includes("Mortimer"))).toBe(true);
  });

  it("scores sleep suitability", () => {
    const calm = analyseSleepSuitability("The lamps glow softly over the quiet harbour, and the evening settles slowly around the little bakery.\n\nEverything is still, and you drift towards rest and sleep.");
    const tense = analyseSleepSuitability("Suddenly a monster attacked! She screamed and ran. Blood everywhere!\n\nWhat would happen next?");
    expect(calm.score).toBeGreaterThan(85);
    expect(tense.score).toBeLessThan(50);
  });
});
