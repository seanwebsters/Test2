import { describe, expect, it } from "vitest";
import { connect, createSky, isSkyComplete, nextEdge, remainingDegree, segmentsCross, validateConstellationLevel } from "@/lib/engine/constellation";
import { starStories } from "@/lib/seeds";

const level = starStories.levels[0];

describe("constellation", () => {
  it("validates seed levels", () => {
    for (const l of starStories.levels) expect(validateConstellationLevel(l)).toEqual([]);
  });

  it("detects crossings, splits and crowding", () => {
    expect(segmentsCross({ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }, { x: 1, y: 0 })).toBe(true);
    expect(segmentsCross({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 })).toBe(false);
    const crossing = { ...level, stars: [{ id: "a", x: 0.1, y: 0.1, mag: 1 }, { id: "b", x: 0.9, y: 0.9, mag: 1 }, { id: "c", x: 0.1, y: 0.9, mag: 1 }, { id: "d", x: 0.9, y: 0.1, mag: 1 }], edges: [["a", "b"], ["c", "d"], ["a", "c"]] };
    expect(validateConstellationLevel(crossing)).toContainEqual(expect.stringContaining("cross"));
    const split = { ...crossing, edges: [["a", "c"], ["b", "d"], ["a", "c"]] };
    expect(validateConstellationLevel(split).join()).toMatch(/duplicates/);
    const crowded = { ...level, stars: [...level.stars, { id: "zz", x: level.stars[0].x + 0.01, y: level.stars[0].y, mag: 3 }] };
    expect(validateConstellationLevel(crowded)).toContainEqual(expect.stringContaining("too close"));
  });

  it("accepts correct lines in either direction and fades wrong ones without penalty", () => {
    let s = createSky();
    let r = connect(s, level, "b", "a");
    expect(r.result).toBe("correct");
    s = r.state;
    expect(connect(s, level, "a", "b").result).toBe("duplicate");
    r = connect(s, level, "a", "g");
    expect(r.result).toBe("incorrect");
    expect(r.state.drawn).toEqual(s.drawn);
    expect(remainingDegree(s, level, "c")).toBe(3);
  });

  it("completes when every edge is drawn", () => {
    let s = createSky();
    for (let e = nextEdge(s, level); e; e = nextEdge(s, level)) s = connect(s, level, e[0], e[1]).state;
    expect(isSkyComplete(s, level)).toBe(true);
  });
});
