import { describe, expect, it } from "vitest";
import { checkUnknownNames, checkWorldRules, sleepSuitability } from "@/lib/story/checks";
import { mockScript } from "@/lib/ai/mock-writer";
import { DEFAULT_SCRIPT_SETTINGS } from "@/lib/types";

describe("continuity checks", () => {
  it("flags sentences that contradict a 'never' world rule", () => {
    const issues = checkWorldRules("Seraphine watched as the moon set behind the hills. Everything was quiet.", ["The moon never fully sets over Aurelune."]);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.severity).toBe("conflict");
  });
  it("does not flag sentences that respect the rule", () => {
    expect(checkWorldRules("The moon never sets here, and she was glad of it.", ["The moon never fully sets over Aurelune."])).toHaveLength(0);
  });
  it("notices recurring names missing from the Story Bible", () => {
    const issues = checkUnknownNames("Later, Bartholomew smiled. She thanked Bartholomew quietly.", ["Seraphine", "Corin"]);
    expect(issues.map((i) => i.evidence)).toContain("Bartholomew");
  });
});

describe("sleep suitability", () => {
  it("scores calm scripts highly and stimulating ones lower", () => {
    const calm = mockScript({ seriesTitle: "T", episodeTitle: "E", summary: "A quiet walk.", scene: "forest", characters: [{ name: "Wren", personality: "" }], worldName: "W", settings: { ...DEFAULT_SCRIPT_SETTINGS, duration_minutes: 5 } });
    const loud = "She screamed! The monster attacked suddenly! Blood everywhere! Run!";
    expect(sleepSuitability(calm).score).toBeGreaterThanOrEqual(80);
    expect(sleepSuitability(loud).score).toBeLessThan(60);
  });
});

describe("simulated writer", () => {
  it("hits roughly the requested length and is deterministic", () => {
    const input = { seriesTitle: "S", episodeTitle: "The Lantern Hour", summary: "Wren lights the lanterns.", scene: "forest" as const, characters: [{ name: "Wren", personality: "" }, { name: "Ash", personality: "" }], worldName: "Thornwood", settings: { ...DEFAULT_SCRIPT_SETTINGS, duration_minutes: 10 } };
    const a = mockScript(input);
    const b = mockScript(input);
    expect(a).toBe(b);
    const words = a.split(/\s+/).length;
    expect(words).toBeGreaterThan(1000);
    expect(words).toBeLessThan(1300);
  });
});
