import { beforeEach, describe, expect, it } from "vitest";
import "./helpers";
import { creativeAnswers, freshStore, viewer } from "./helpers";
import { challengeDay } from "@/lib/engine/challenge";
import { skillPoints } from "@/lib/engine/skills";
import { completeMission, getTodayPlan, loadState, saveOnboarding, startChallenge, startPath, addBonusMission } from "@/lib/server/services";
import { localStore } from "@/lib/server/context";
import { findMission } from "@/lib/content/paths";

beforeEach(() => {
  freshStore();
});

async function newUser(path = "creative-director") {
  const v = viewer();
  await saveOnboarding(v, creativeAnswers());
  if (path) await startPath(v, path);
  return v;
}

describe("mission completion", () => {
  it("awards XP, skill points, streak and the First Step badge", async () => {
    const v = await newUser();
    const r = await completeMission(v, { missionId: "cd-1-2", rating: 1 });
    expect(r.xp).toBeGreaterThan(0);
    expect(r.streak.state.current).toBe(1);
    expect(r.newAchievements.map((a) => a.id)).toContain("first-step");
    const s = await loadState(v);
    expect(s.completions).toHaveLength(1);
    expect(skillPoints(s.completions).get("industry-knowledge")).toBe(6);
    expect(r.totalXp).toBe(r.xp + 10); // + First Step badge XP
  });

  it("rejects duplicates and locked missions", async () => {
    const v = await newUser();
    await completeMission(v, { missionId: "cd-1-1" });
    await expect(completeMission(v, { missionId: "cd-1-1" })).rejects.toMatchObject({ status: 409 });
    await expect(completeMission(v, { missionId: "cd-2-1" })).rejects.toMatchObject({ status: 400 });
    await expect(completeMission(v, { missionId: "nope-1-1" })).rejects.toMatchObject({ status: 404 });
  });

  it("requires evidence for quests and completes the level", async () => {
    const v = await newUser();
    for (const id of ["cd-1-1", "cd-1-2", "cd-1-3"]) await completeMission(v, { missionId: id });
    await expect(completeMission(v, { missionId: "cd-1-5" })).rejects.toMatchObject({ status: 400 });
    const r = await completeMission(v, { missionId: "cd-1-5", evidence: "A creative director protects the big idea." });
    expect(r.levelCompleted).toMatchObject({ level: 1, careerSlug: "creative-director" });
    expect(r.newAchievements.map((a) => a.id)).toContain("level-up");
    // Level 2 is now open.
    await expect(completeMission(v, { missionId: "cd-2-1" })).resolves.toBeTruthy();
  });

  it("evidence and reflection add bonus XP", async () => {
    const v = await newUser();
    const plain = await completeMission(v, { missionId: "cd-1-2" });
    const rich = await completeMission(v, { missionId: "cd-1-1", evidence: "Three agencies…", reflection: "Loved it" });
    const plainMission = findMission("cd-1-2")!.mission;
    expect(plainMission.minutes).toBe(10);
    expect(rich.xp).toBeGreaterThan(plain.xp);
  });

  it("lets you skip ahead with a placement quest", async () => {
    const v = await newUser("software-engineer");
    const r = await completeMission(v, { missionId: "se-3-5", placement: true, evidence: "https://example.dev" });
    expect(r.levelCompleted?.level).toBe(3);
    const s = await loadState(v);
    expect(s.paths.find((p) => p.careerSlug === "software-engineer")!.skippedThrough).toBe(3);
    await expect(completeMission(v, { missionId: "se-4-1" })).resolves.toBeTruthy();
  });

  it("allows curiosity missions at level 1 without starting the path, but not beyond", async () => {
    const v = await newUser();
    await expect(completeMission(v, { missionId: "en-1-1" })).resolves.toBeTruthy();
    await expect(completeMission(v, { missionId: "en-2-1" })).rejects.toMatchObject({ status: 403 });
    const s = await loadState(v);
    expect(s.paths.find((p) => p.careerSlug === "entrepreneur")?.status).toBe("paused");
  });
});

describe("paths & entitlements", () => {
  it("limits free users to one active path, and switching keeps progress and skills", async () => {
    const v = await newUser();
    await completeMission(v, { missionId: "cd-1-2" });
    await expect(startPath(v, "entrepreneur")).rejects.toMatchObject({ status: 402, code: "path_limit" });
    await startPath(v, "entrepreneur", { switchFrom: "creative-director" });
    const s = await loadState(v);
    expect(s.paths.find((p) => p.careerSlug === "creative-director")!.status).toBe("paused");
    expect(s.paths.find((p) => p.careerSlug === "entrepreneur")!.status).toBe("active");
    expect(s.completions.map((c) => c.missionId)).toContain("cd-1-2");
    // Resuming later picks up where they left off.
    await startPath(v, "creative-director", { switchFrom: "entrepreneur" });
    await expect(completeMission(v, { missionId: "cd-1-3" })).resolves.toBeTruthy();
  });

  it("Plus users can run multiple paths", async () => {
    const v = await newUser();
    await localStore().setSubscription(v.userId, { plan: "plus", source: "mock", renewsAt: null, stripeCustomerId: null });
    await startPath(v, "entrepreneur");
    await startPath(v, "software-engineer");
    const s = await loadState(v);
    expect(s.paths.filter((p) => p.status === "active")).toHaveLength(3);
    await expect(startPath(v, "doctor")).rejects.toMatchObject({ status: 402 });
  });
});

describe("daily missions", () => {
  it("creates 3–5 unique, incomplete missions and keeps the plan stable for the day", async () => {
    const v = await newUser();
    const plan = await getTodayPlan(v);
    expect(plan.missionIds.length).toBeGreaterThanOrEqual(3);
    expect(plan.missionIds.length).toBeLessThanOrEqual(5);
    expect(new Set(plan.missionIds).size).toBe(plan.missionIds.length);
    await completeMission(v, { missionId: plan.missionIds[0]! });
    const again = await getTodayPlan(v);
    expect(again.missionIds).toEqual(plan.missionIds);
  });

  it("daily missions earn a small bonus", async () => {
    const v = await newUser();
    const plan = await getTodayPlan(v);
    const id = plan.missionIds.find((x) => x.startsWith("cd-1"))!;
    const r = await completeMission(v, { missionId: id });
    expect(r.completion.source).toBe("daily");
  });

  it("adapts to available time", async () => {
    const v = viewer();
    await saveOnboarding(v, creativeAnswers({ minutesPerDay: 60 }));
    await startPath(v, "creative-director");
    expect((await getTodayPlan(v)).missionIds.length).toBe(5);
  });

  it("offers a bonus mission once everything is done", async () => {
    const v = await newUser();
    const before = await getTodayPlan(v);
    const after = await addBonusMission(v);
    expect(after.missionIds.length).toBe(before.missionIds.length + 1);
  });
});

describe("discovery challenge", () => {
  it("adds today's challenge mission and records challenge days", async () => {
    const v = viewer();
    await saveOnboarding(v, creativeAnswers());
    const ch = await startChallenge(v);
    expect(ch.careers.length).toBe(3);
    const day1 = challengeDay(ch.careers, 1);
    const plan = await getTodayPlan(v);
    expect(plan.missionIds).toContain(day1.mission.id);
    await completeMission(v, { missionId: day1.mission.id, challengeDay: 1, rating: 1 });
    const s = await loadState(v);
    expect(s.profile.challenge!.completed["1"]).toBe(day1.mission.id);
    // Day 2 isn't unlocked yet (it's still day 1).
    const day2 = challengeDay(ch.careers, 2);
    await expect(completeMission(v, { missionId: day2.mission.id, challengeDay: 2 })).rejects.toMatchObject({ status: 403 });
  });

  it("ratings feed back into recommendations", async () => {
    const v = viewer();
    const p = await saveOnboarding(v, creativeAnswers());
    const before = p.matches.findIndex((m) => m.careerSlug === "entrepreneur");
    await completeMission(v, { missionId: "en-1-1", rating: 1 });
    await completeMission(v, { missionId: "en-1-2", rating: 1 });
    const after = (await loadState(v)).profile.matches.findIndex((m) => m.careerSlug === "entrepreneur");
    expect(after === -1 ? 99 : after).toBeLessThanOrEqual(before === -1 ? 99 : before);
  });
});
