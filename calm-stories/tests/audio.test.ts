import { beforeEach, describe, expect, it } from "vitest";
import { freshDb, viewers } from "./helpers";
import type { LocalDatabase } from "@/lib/db/local";
import { DEFAULT_AI_SETTINGS } from "@/lib/seed/agents";
import { generateNarration, getProduction, mixAndMaster, previewVoice, updateProductionSettings } from "@/lib/audio/production";
import { splitScript } from "@/lib/audio/sections";
import { mixEpisode } from "@/lib/audio/mix";
import { analyseAudio, riskyNames } from "@/lib/audio/qa";
import { mockSpeech } from "@/lib/audio/voice";
import { listenAccess } from "@/lib/auth/policy";
import { writeEpisode, addEpisode } from "@/lib/storymaker/service";
import { dispatchTool } from "@/lib/storymaker/tools";

let db: LocalDatabase;
const EP = "ep-the-lighthouse-bakery-1";
beforeEach(async () => {
  db = freshDb();
  await db.upsert("ai_settings", { ...DEFAULT_AI_SETTINGS, writing_provider: "mock", voice_provider: "mock", updated_at: new Date().toISOString() });
});

describe("sections", () => {
  it("splits on paragraphs and keeps every word", () => {
    const paras = Array.from({ length: 12 }, (_, i) => `Paragraph ${i} ` + "soft words drift slowly ".repeat(15));
    const sections = splitScript(paras.join("\n\n"));
    expect(sections.length).toBeGreaterThan(2);
    expect(sections.join(" ").split(/\s+/).filter(Boolean).length).toBe(paras.join(" ").split(/\s+/).filter(Boolean).length);
  });
});

describe("mixing and QA", () => {
  it("masters under -1 dBFS with ambience below the voice", () => {
    const voice = { id: "v", tone: "Warm" };
    const sections = [0, 1, 2].map((i) => ({ samples: mockSpeech(`Section ${i}. The lamps glow softly over the quiet harbour, and the evening settles.`, voice, { speed: 0.9, stability: 0.75, warmth: 0.7 }), sampleRate: 22050 }));
    const r = mixEpisode({ sections, ambience: [{ kind: "rain", gain: 0.8 }], ambienceVolume: 0.35, musicVolume: 0.15, seed: 1, outroSeconds: 5 });
    const qa = analyseAudio({ ...r, expectedSections: 3, presentSections: 3, words: 39, layers: [{ kind: "rain", gain: 0.8 }], script: "", properNouns: [] });
    expect(qa.clipped_samples).toBe(0);
    expect(qa.peak_dbfs).toBeLessThanOrEqual(-0.9);
    expect(qa.issues.find((i) => i.check === "background_level")?.severity).toBe("pass");
    expect(qa.issues.find((i) => i.check === "missing_segments")?.severity).toBe("pass");
    expect(qa.passed).toBe(true);
  });

  it("flags missing sections and risky names", () => {
    const sections = [{ samples: mockSpeech("Hello there, quiet friend.", { id: "v", tone: "Deep" }, { speed: 1, stability: 0.7, warmth: 0.5 }), sampleRate: 22050 }];
    const r = mixEpisode({ sections, ambience: [], ambienceVolume: 0.3, musicVolume: 0, seed: 2, outroSeconds: 2 });
    const qa = analyseAudio({ ...r, expectedSections: 2, presentSections: 1, words: 4, layers: [], script: "", properNouns: ["Aelwyn Thistlewick"] });
    expect(qa.passed).toBe(false);
    expect(qa.issues.find((i) => i.check === "missing_segments")?.severity).toBe("fail");
    expect(riskyNames(["Aelwyn Thistlewick", "The Lake"])).toEqual(["Aelwyn", "Thistlewick"]);
  });
});

describe("episode production", () => {
  it("narrates, regenerates one section, mixes and lets the creator stream the draft", async () => {
    const creator = await viewers.creator();
    // A longer script so there are several sections.
    const ep = await addEpisode(creator, "series-the-lighthouse-bakery", { title: "The Recipe Tin", summary: "The baker finds an old recipe tin." });
    await writeEpisode(creator, ep.id, { settings: { duration_minutes: 15 } });

    let view = await getProduction(creator, ep.id);
    expect(view.sections.length).toBeGreaterThan(1);
    expect(view.voiceProvider.simulated).toBe(true);
    expect(view.sections.every((s) => !s.asset)).toBe(true);

    const first = await generateNarration(creator, ep.id);
    expect(first.generated).toBe(view.sections.length);
    expect(first.simulated).toBe(true);
    view = await getProduction(creator, ep.id);
    const before = view.sections.map((s) => s.asset?.id);
    // Regenerate a single section.
    await generateNarration(creator, ep.id, { sectionIndex: 1 });
    view = await getProduction(creator, ep.id);
    const after = view.sections.map((s) => s.asset?.id);
    expect(after[0]).toBe(before[0]);
    expect(after[1]).not.toBe(before[1]);

    // Changing delivery marks sections out of date; generating again only redoes stale ones.
    await updateProductionSettings(creator, ep.id, { speed: 0.8 });
    view = await getProduction(creator, ep.id);
    expect(view.sections.every((s) => s.stale)).toBe(true);
    await generateNarration(creator, ep.id);

    const { asset, qa } = await mixAndMaster(creator, ep.id);
    expect(asset.kind).toBe("mix");
    expect(asset.simulated).toBe(true);
    expect(qa.peak_dbfs).toBeLessThanOrEqual(-0.9);
    expect(qa.issues).toHaveLength(10);
    const updated = await db.get("episodes", ep.id);
    expect(updated?.audio_asset_id).toBe(asset.id);
    expect(updated?.status).toBe("audio_ready");
    const series = (await db.get("series", "series-the-lighthouse-bakery"))!;
    expect(listenAccess(creator, series, updated!)).toBe("full");
    expect(listenAccess(await viewers.listener(), series, updated!)).toBe("hidden");

    const costs = await db.list("production_costs", { where: { episode_id: ep.id, category: "tts" } });
    expect(costs.length).toBeGreaterThan(0);
    expect(costs.every((c) => c.simulated && c.cost_cents === 0)).toBe(true);
  }, 60000);

  it("only approved voices, and other creators can't produce this episode", async () => {
    const creator = await viewers.creator();
    await expect(updateProductionSettings(creator, EP, { voice_id: "voice-nobody" })).rejects.toThrow(/approved/);
    const a = await previewVoice(creator, "voice-orion");
    expect(a.kind).toBe("voice_preview");
    expect(a.simulated).toBe(true);
    const other = await viewers.otherCreator();
    const r = await dispatchTool("generate_narration", { episode_id: EP }, { viewer: other, seriesId: null, conversationId: null });
    expect(r.status).toBe("failed");
  });
});
