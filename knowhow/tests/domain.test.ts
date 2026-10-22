import { describe, expect, it } from "vitest";
import { CATALOG, SERIES, getEpisode, getSeries } from "@/lib/catalog";
import { answerChallenge, recordProgress, saveInsight, touchStreak } from "@/lib/domain";
import { episodeAccess, DAILY_FREE_SECONDS } from "@/lib/entitlements";
import { levelFor, xpForLevel } from "@/lib/gamification";
import { newUser } from "@/lib/model";
import { buildUniverse } from "@/lib/universe";
import { applyPurchase } from "@/lib/billing";
import { mp3Duration } from "@/lib/ai/mp3";
import { matchDemoPlan } from "@/content/ai-demo";
import fs from "node:fs";

const now = new Date("2026-10-18T10:00:00Z");
const today = "2026-10-18";
const rome1 = getEpisode("the-fall-of-rome-1");
const rome3 = getEpisode("the-fall-of-rome-3");
const rome = getSeries("the-fall-of-rome");

describe("catalog", () => {
  it("has at least 30 series and every released episode is narrated", () => {
    expect(SERIES.length).toBeGreaterThanOrEqual(30);
    for (const s of SERIES) for (const e of s.episodes) if (e.status === "released") expect(e.hasAudio, e.id).toBe(true);
  });
});

describe("entitlements", () => {
  it("allows free episodes and locks premium ones", () => {
    const u = newUser("g_test1", "t1");
    expect(episodeAccess(u, rome, rome1, today, now)).toEqual({ ok: true, reason: "free" });
    expect(episodeAccess(u, rome, rome3, today, now)).toEqual({ ok: false, reason: "locked" });
    u.unlocked.push(rome3.id);
    expect(episodeAccess(u, rome, rome3, today, now).ok).toBe(true);
  });
  it("enforces the daily free limit for new episodes only", () => {
    const u = newUser("g_test2", "t2");
    u.days[today] = DAILY_FREE_SECONDS;
    expect(episodeAccess(u, rome, rome1, today, now)).toEqual({ ok: false, reason: "daily_limit" });
    u.progress[rome1.id] = { position: 10, duration: 100, completed: false, updatedAt: now.toISOString(), listened: 10 };
    expect(episodeAccess(u, rome, rome1, today, now).ok).toBe(true);
  });
  it("Plus unlocks everything released", () => {
    const u = newUser("g_test3", "t3");
    applyPurchase(u, "plus_monthly", "simulated", "ref1");
    expect(episodeAccess(u, rome, rome3, today, now)).toEqual({ ok: true, reason: "plus" });
    expect(episodeAccess(u, rome, rome.episodes[10], today, now)).toEqual({ ok: false, reason: "upcoming" });
  });
  it("purchases are idempotent", () => {
    const u = newUser("g_test4", "t4");
    applyPurchase(u, "credits_10", "simulated", "same");
    applyPurchase(u, "credits_10", "simulated", "same");
    expect(u.credits).toBe(15);
  });
});

describe("progress & XP", () => {
  it("bounds listening time by wall-clock and awards completion once", () => {
    const u = newUser("g_test5", "t5");
    recordProgress(u, CATALOG, rome1, { position: 5 }, now, today, 10);
    const later = new Date(now.getTime() + 10_000);
    recordProgress(u, CATALOG, rome1, { position: 140 }, later, today, 10);
    expect(u.progress[rome1.id].listened).toBeLessThanOrEqual(5 + 10 * 2.05 + 1 + 1);
    const done = new Date(now.getTime() + 200_000);
    const events = recordProgress(u, CATALOG, rome1, { position: rome1.duration!, completed: true }, done, today, 10);
    expect(events.some((e) => e.type === "xp" && e.amount === 50)).toBe(true);
    expect(u.cards.map((c) => c.key)).toContain("category:history");
    const again = recordProgress(u, CATALOG, rome1, { position: rome1.duration!, completed: true }, done, today, 10);
    expect(again.filter((e) => e.type === "xp" && e.amount === 50)).toHaveLength(0);
  });
  it("won't complete an episode that wasn't reached", () => {
    const u = newUser("g_test6", "t6");
    recordProgress(u, CATALOG, rome1, { position: 30, completed: true }, now, today, 10);
    expect(u.progress[rome1.id].completed).toBe(false);
  });
  it("completing every released episode grants the rare series card", () => {
    const u = newUser("g_test7", "t7");
    for (const e of rome.episodes.filter((x) => x.status === "released")) recordProgress(u, CATALOG, e, { position: e.duration!, completed: true }, now, today, 10);
    expect(u.cards.find((c) => c.key === "series:the-fall-of-rome")?.rarity).toBe("rare");
    expect(u.completedSeries).toContain("the-fall-of-rome");
  });
  it("streaks count consecutive days", () => {
    const u = newUser("g_test8", "t8");
    touchStreak(u, "2026-10-16", now, []);
    touchStreak(u, "2026-10-17", now, []);
    touchStreak(u, "2026-10-17", now, []);
    expect(u.streak.current).toBe(2);
    touchStreak(u, "2026-10-19", now, []);
    expect(u.streak).toMatchObject({ current: 1, longest: 2 });
  });
  it("challenge: one scored attempt", () => {
    const u = newUser("g_test9", "t9");
    expect(answerChallenge(u, rome1.id, false, now)).toHaveLength(0);
    expect(answerChallenge(u, rome1.id, true, now)).toHaveLength(0);
    const v = newUser("g_test10", "t10");
    expect(answerChallenge(v, rome1.id, true, now)[0]).toMatchObject({ type: "xp", amount: 25 });
  });
  it("insights dedupe", () => {
    const u = newUser("g_test11", "t11");
    saveInsight(u, rome1.id, "A fact", now);
    saveInsight(u, rome1.id, "A fact", now);
    expect(u.insights).toHaveLength(1);
  });
  it("levels are monotonic", () => {
    expect(levelFor(0)).toBe(1);
    expect(levelFor(xpForLevel(5))).toBe(5);
    expect(levelFor(xpForLevel(10) - 1)).toBe(9);
  });
});

describe("universe", () => {
  it("lights only topics covered by completed episodes, plus the path to them", () => {
    const u = buildUniverse(SERIES, ["the-fall-of-rome-2"]);
    expect(u.litTopics.sort()).toEqual(["modern-cities", "roman-architecture", "roman-engineering"]);
    const anc = u.nodes.find((n) => n.id === "ancient-rome");
    expect(anc?.state).toBe("path");
    expect(u.nodes.find((n) => n.id === "cat:history")?.state).toBe("category-lit");
    expect(u.nodes.find((n) => n.id === "cat:space")?.state).toBe("category-dim");
  });
  it("starts empty", () => {
    expect(buildUniverse(SERIES, []).litTopics).toHaveLength(0);
  });
});

describe("ai helpers", () => {
  it("matches demo prompts by keyword", () => {
    expect(matchDemoPlan("How does Formula 1 actually work?")?.key).toBe("f1");
    expect(matchDemoPlan("teach me knitting")).toBeNull();
  });
  it("measures mp3 duration from frames", () => {
    const d = mp3Duration(fs.readFileSync("content-audio/rabbit-holes-2.mp3"));
    expect(Math.abs(d - getEpisode("rabbit-holes-2").duration!)).toBeLessThan(1.5);
  });
});
