import { describe, expect, it } from "vitest";
import { executeTool, resolveToolCall } from "@/lib/storymaker/execute";
import { handleMessage } from "@/lib/storymaker/assistant";
import { currentScriptText } from "@/lib/storymaker/scripts";
import { freshDb, viewerFor } from "./helpers";

describe("Storymaker (Journey B: creator)", () => {
  it("goes from idea to written, edited, continuity-checked script", async () => {
    const db = freshDb();
    const viewer = await viewerFor(db, "usr_iris-vale");
    const chat = await handleMessage({ viewer, seriesId: null }, "I want a romantic fantasy set in a magical forest, with two characters from rival kingdoms.");
    const concept = chat.messages.flatMap((m) => m.cards ?? []).find((c) => c.type === "concept");
    expect(concept && concept.type === "concept" && concept.proposal.scene).toBe("forest");
    expect(chat.engine.simulated).toBe(true);
    if (!concept || concept.type !== "concept") throw new Error("no concept");
    const { follow_up_questions: _q, ...input } = concept.proposal;
    const created = await executeTool("create_series", input, { viewer, seriesId: null, conversationId: null, confirmed: true });
    expect(created.status).toBe("executed");
    const seriesId = created.status === "executed" ? created.result.series_id! : "";
    const series = await db.get("series", seriesId);
    expect(series?.status).toBe("draft");
    expect(series?.creator_id).toBe("usr_iris-vale");

    for (const msg of ["Build the world", "Develop the characters", "Plan a 4-episode season", "Write episode 1, 10 minutes"]) {
      const r = await handleMessage({ viewer, seriesId }, msg);
      expect(r.messages.some((m) => m.cards?.some((c) => c.type === "error"))).toBe(false);
    }
    const bible = await db.findOne("story_bibles", { series_id: seriesId });
    expect(bible?.geography.length).toBeGreaterThan(20);
    expect((await db.list("characters", { where: { series_id: seriesId } })).every((c) => c.backstory.length > 0)).toBe(true);
    const eps = await db.list("episodes", { where: { series_id: seriesId } });
    expect(eps).toHaveLength(4);
    const ep1 = eps.find((e) => e.number === 1)!;
    const script = await currentScriptText(ep1.id);
    expect(script?.version.word_count).toBeGreaterThan(900);
    expect(script?.version.simulated).toBe(true);

    // Selection rewrite saves a new version; rollback restores the old text.
    const original = script!.version.content;
    const rw = await executeTool("rewrite_script_section", { episode_id: ep1.id, instruction: "ending" }, { viewer, seriesId, conversationId: null, confirmed: true });
    expect(rw.status).toBe("executed");
    const after = await currentScriptText(ep1.id);
    expect(after!.version.version).toBe(2);
    expect(after!.version.content).not.toBe(original);
    await executeTool("restore_script_version", { version_id: script!.version.id }, { viewer, seriesId, conversationId: null, confirmed: true });
    expect((await currentScriptText(ep1.id))!.version.content).toBe(original);

    const cont = await handleMessage({ viewer, seriesId }, "Check continuity");
    expect(cont.messages.flatMap((m) => m.cards ?? []).some((c) => c.type === "continuity")).toBe(true);
  });

  it("requires confirmation for destructive actions and honours cancel", async () => {
    const db = freshDb();
    const viewer = await viewerFor(db, "usr_iris-vale");
    const seriesId = "ser_the-lantern-keepers-daughter";
    const ash = await db.findOne("characters", { series_id: seriesId, name: "Ash" });
    const pending = await executeTool("delete_character", { character_id: ash!.id }, { viewer, seriesId, conversationId: null, confirmed: false });
    expect(pending.status).toBe("pending_confirmation");
    expect(await db.get("characters", ash!.id)).not.toBeNull();
    await resolveToolCall(pending.tool_call_id, "cancel", { viewer });
    expect(await db.get("characters", ash!.id)).not.toBeNull();
    const again = await executeTool("delete_character", { character_id: ash!.id }, { viewer, seriesId, conversationId: null, confirmed: false });
    const done = await resolveToolCall(again.tool_call_id, "confirm", { viewer });
    expect(done.status).toBe("executed");
    expect(await db.get("characters", ash!.id)).toBeNull();
    const audit = await db.list("ai_tool_calls", { where: { tool: "delete_character" } });
    expect(audit.map((a) => a.status).sort()).toEqual(["cancelled", "executed"]);
  });

  it("validates input and enforces ownership", async () => {
    const db = freshDb();
    const iris = await viewerFor(db, "usr_iris-vale");
    const maya = await viewerFor(db, "usr_maya");
    await expect(executeTool("update_series", { tagline: "mine now" }, { viewer: iris, seriesId: "ser_a-cabin-in-the-pines", conversationId: null, confirmed: true })).rejects.toThrow(/own series/);
    await expect(executeTool("create_episode", { title: "" }, { viewer: iris, seriesId: "ser_the-lantern-keepers-daughter", conversationId: null, confirmed: true })).rejects.toThrow(/Invalid input/);
    await expect(executeTool("generate_synopsis", { idea: "x" }, { viewer: maya, seriesId: null, conversationId: null, confirmed: true })).rejects.toThrow(/creator/);
  });

  it("Journey C: continues an existing series from its Story Bible", async () => {
    const db = freshDb();
    const viewer = await viewerFor(db, "usr_iris-vale");
    const seriesId = "ser_the-lantern-keepers-daughter";
    const r = await handleMessage({ viewer, seriesId }, "Continue this story");
    const dir = r.messages.flatMap((m) => m.cards ?? []).find((c) => c.type === "direction");
    expect(dir).toBeTruthy();
    if (!dir || dir.type !== "direction") return;
    const before = await db.count("episodes", { series_id: seriesId });
    const created = await executeTool("create_episode", { title: dir.proposal.episode_title, summary: dir.proposal.summary }, { viewer, seriesId, conversationId: null, confirmed: true });
    const ep = created.status === "executed" ? (created.result.data as { id: string }) : null;
    expect(await db.count("episodes", { series_id: seriesId })).toBe(before + 1);
    await executeTool("write_episode", { episode_id: ep!.id, settings: { duration_minutes: 5 } }, { viewer, seriesId, conversationId: null, confirmed: true });
    const check = await executeTool("check_story_continuity", { episode_id: ep!.id }, { viewer, seriesId, conversationId: null, confirmed: true });
    expect(check.status).toBe("executed");
    // Lore is never rewritten automatically.
    const bible = await db.findOne("story_bibles", { series_id: seriesId });
    expect(bible?.rules).toContain("Lanterns must be lit at dusk and extinguished at dawn.");
  });
});
