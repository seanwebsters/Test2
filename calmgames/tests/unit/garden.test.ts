import { describe, expect, it } from "vitest";
import { applyTool, createGarden, flowingChannels, harmonyPairs, isMoist, naturallyMoist, planGarden, progress, tick, validateGardenLevel } from "@/lib/engine/garden";
import { tidalGarden } from "@/lib/seeds";
import type { GardenLevel } from "@/lib/engine/schemas";

const level: GardenLevel = tidalGarden.levels[0];

describe("garden", () => {
  it("validates seed levels", () => {
    for (const l of tidalGarden.levels) expect(validateGardenLevel(l)).toEqual([]);
  });

  it("rejects impossible goals and bad layouts", () => {
    expect(validateGardenLevel({ ...level, layout: ["...", "...", "..."] })).toContainEqual(expect.stringContaining("spring"));
    expect(validateGardenLevel({ ...level, layout: ["..~", "....", "..."] })).toContainEqual(expect.stringContaining("row 1"));
    expect(validateGardenLevel({ ...level, goalBlooms: 24 })).toContainEqual(expect.stringContaining("soil"));
    expect(validateGardenLevel({ ...level, companions: [["sea-thrift", "orchid"]] })).toContainEqual(expect.stringContaining("unknown"));
  });

  it("keeps soil beside springs and flowing channels moist", () => {
    let s = createGarden(level);
    const nearSpring = 7; // row 1, col 2 sits under the spring
    expect(naturallyMoist(s).has(nearSpring)).toBe(true);
    const far = 22; // row 4, col 2
    expect(naturallyMoist(s).has(far)).toBe(false);
    s = applyTool(s, nearSpring, { kind: "channel" }).state;
    expect(flowingChannels(s).has(nearSpring)).toBe(true);
    expect(s.channelsLeft).toBe(level.channelBudget - 1);
    // Filling a channel back in refunds it: nothing is ever lost.
    s = applyTool(s, nearSpring, { kind: "channel" }).state;
    expect(s.channelsLeft).toBe(level.channelBudget);
  });

  it("grows moist plants, leaves dry ones waiting, and never wilts", () => {
    let s = createGarden(level);
    s = applyTool(s, 7, { kind: "plant", species: "lavender" }).state;
    s = applyTool(s, 22, { kind: "plant", species: "lavender" }).state;
    for (let i = 0; i < 5; i++) s = tick(s).state;
    expect(s.plants[7]!.stage).toBe(level.growthStages);
    expect(s.plants[22]!.stage).toBe(0);
    s = applyTool(s, 22, { kind: "water" }).state;
    expect(isMoist(s, 22)).toBe(true);
    s = tick(s).state;
    s = tick(s).state;
    expect(s.plants[22]!.stage).toBe(2);
    s = tick(s).state;
    expect(s.plants[22]!.stage).toBe(2);
  });

  it("counts companion harmonies between adjacent blooms", () => {
    let s = createGarden(level);
    s = applyTool(s, 7, { kind: "plant", species: "lavender" }).state;
    s = applyTool(s, 6, { kind: "plant", species: "sea-thrift" }).state; // beside 7, but dry
    for (let i = 0; i < 4; i++) {
      s = applyTool(s, 6, { kind: "water" }).state;
      s = tick(s).state;
    }
    expect(harmonyPairs(s, level.companions)).toEqual([[6, 7]]);
  });

  it("produces a winning plan for every seed level", () => {
    for (const l of tidalGarden.levels) {
      const plan = planGarden(l)!;
      let s = createGarden(l);
      for (const c of plan.cells) s = applyTool(s, c.index, { kind: "plant", species: c.species }).state;
      for (let t = 0; t < 30 && !progress(s, l).complete; t++) {
        for (const c of plan.cells) if (!isMoist(s, c.index)) s = applyTool(s, c.index, { kind: "water" }).state;
        s = tick(s).state;
      }
      expect(progress(s, l).complete).toBe(true);
    }
  });
});
