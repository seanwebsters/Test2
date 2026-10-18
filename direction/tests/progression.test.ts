import { describe, expect, it } from "vitest";
import { requirePath } from "@/lib/content/paths";
import { canComplete, LEVEL_REQUIRED, nextMissions, pathProgress } from "@/lib/engine/progression";

const path = requirePath("creative-director");
const ids = (level: number, which: number[]) => which.map((i) => `cd-${level}-${i}`);

describe("path progression", () => {
  it("starts with only level 1 unlocked", () => {
    const p = pathProgress(path, []);
    expect(p.levels[0]!.status).toBe("available");
    expect(p.levels.slice(1).every((l) => l.status === "locked")).toBe(true);
    expect(p.currentLevel).toBe(1);
    expect(p.percent).toBe(0);
  });

  it("keeps the quest locked until three other missions are done", () => {
    const p = pathProgress(path, ids(1, [1, 2]));
    const quest = p.levels[0]!.missions.find((m) => m.mission.quest)!;
    expect(quest.available).toBe(false);
    expect(quest.lockedReason).toMatch(/Complete 3 missions/);
    const p2 = pathProgress(path, ids(1, [1, 2, 3]));
    expect(p2.levels[0]!.missions.find((m) => m.mission.quest)!.available).toBe(true);
  });

  it("does not unlock the next level from volume alone — the quest is required", () => {
    const p = pathProgress(path, ids(1, [1, 2, 3, 4]));
    expect(p.levels[0]!.status).toBe("available");
    expect(p.levels[1]!.status).toBe("locked");
  });

  it(`unlocks the next level after the quest + ${LEVEL_REQUIRED - 1} missions`, () => {
    const p = pathProgress(path, ids(1, [1, 2, 3, 5]));
    expect(p.levels[0]!.status).toBe("complete");
    expect(p.levels[1]!.status).toBe("available");
    expect(p.currentLevel).toBe(2);
    expect(p.completedLevels).toBe(1);
  });

  it("supports skipping beginner levels via placement", () => {
    const p = pathProgress(path, ["cd-3-5"], 3);
    expect(p.levels.slice(0, 3).every((l) => l.status === "skipped")).toBe(true);
    expect(p.levels[3]!.status).toBe("available");
    expect(p.currentLevel).toBe(4);
  });

  it("canComplete enforces locks, evidence and duplicates", () => {
    const p = pathProgress(path, ids(1, [1]));
    expect(canComplete(p, "cd-1-2")).toEqual({ ok: true });
    expect(canComplete(p, "cd-1-1")).toMatchObject({ ok: false, reason: expect.stringMatching(/already/) });
    expect(canComplete(p, "cd-2-1")).toMatchObject({ ok: false, reason: expect.stringMatching(/Finish level 1/) });
    const ready = pathProgress(path, ids(1, [1, 2, 3]));
    expect(canComplete(ready, "cd-1-5")).toMatchObject({ ok: false, reason: expect.stringMatching(/evidence/) });
    expect(canComplete(ready, "cd-1-5", { evidence: "I explained it to my friend Sam." })).toEqual({ ok: true });
  });

  it("placement only works for quests up to level 6 and needs evidence", () => {
    const p = pathProgress(path, []);
    expect(canComplete(p, "cd-3-5", { placement: true })).toMatchObject({ ok: false });
    expect(canComplete(p, "cd-3-5", { placement: true, evidence: "My portfolio poster" })).toEqual({ ok: true });
    expect(canComplete(p, "cd-3-1", { placement: true, evidence: "x" })).toMatchObject({ ok: false, reason: expect.stringMatching(/quests/) });
    expect(canComplete(p, "cd-8-5", { placement: true, evidence: "x" })).toMatchObject({ ok: false, reason: expect.stringMatching(/level 6/) });
  });

  it("nextMissions lists available incomplete missions in order", () => {
    const p = pathProgress(path, ids(1, [1, 2]));
    expect(nextMissions(p, 3).map((m) => m.id)).toEqual(["cd-1-3", "cd-1-4"]);
  });

  it("a fully completed path is finished at 100%", () => {
    const all = path.levels.flatMap((l) => l.missions.map((m) => m.id));
    const p = pathProgress(path, all);
    expect(p.finished).toBe(true);
    expect(p.percent).toBe(100);
  });
});
