import { describe, expect, it } from "vitest";
import { catalog, releasedCards } from "@/lib/catalog";
import { seededRng } from "@/lib/economy/rng";
import { SET_COMPLETION_REWARD, evaluateAchievements } from "@/lib/services/achievements";
import { openPackTx } from "@/lib/services/packs";
import { completeEpisodeTx, episodeAccess, extraUnlocked, unlockEpisodeTx } from "@/lib/services/story";
import { freshState, T0, withGuest } from "./helpers";

describe("collection completion", () => {
  it("awards the set bonus exactly once when every released Season 1 card is owned", () => {
    const s = freshState();
    const u = withGuest(s);
    const idx = catalog(s);
    const set = releasedCards(idx, idx.byId.get("the-greenhouse")!, T0).filter((c) => c.season === 1);
    s.inventory[u] = {};
    for (const c of set.slice(0, -1)) s.inventory[u]![c.id] = { count: 1, variants: { standard: 1 }, firstAt: "", lastAt: "" };
    evaluateAchievements(s, u, T0);
    expect(s.achievements.some((a) => a.key === "complete:the-greenhouse:s1")).toBe(false);
    s.inventory[u]![set.at(-1)!.id] = { count: 1, variants: { standard: 1 }, firstAt: "", lastAt: "" };
    const before = s.wallets[u]!.shards;
    evaluateAchievements(s, u, T0);
    evaluateAchievements(s, u, T0);
    expect(s.achievements.filter((a) => a.key === "complete:the-greenhouse:s1")).toHaveLength(1);
    expect(s.wallets[u]!.shards - before).toBe(SET_COMPLETION_REWARD);
    expect(s.notifications.some((n) => n.userId === u && n.kind === "completion")).toBe(true);
  });
});

describe("story progression", () => {
  it("collect-gated episodes unlock from collection progress; shards-gated cost Shards", () => {
    const s = freshState();
    const u = withGuest(s);
    const idx = catalog(s);
    const ep3 = idx.episodes.get("afterlight-s1e3")!;
    const ep4 = idx.episodes.get("afterlight-s1e4")!;
    expect(episodeAccess(s, u, ep3, T0).unlocked).toBe(false);
    s.wallets[u]!.shards = 1000;
    for (let i = 0; i < 3; i++) openPackTx(s, u, { packType: "standard", universeId: "afterlight", idempotencyKey: `story-${i}-xxxx` }, seededRng(i + 10), T0);
    expect(episodeAccess(s, u, ep3, T0).unlocked).toBe(true);
    expect(episodeAccess(s, u, ep4, T0).unlocked).toBe(false);
    const before = s.wallets[u]!.shards;
    unlockEpisodeTx(s, u, ep4.id, T0);
    expect(s.wallets[u]!.shards).toBe(before - 40);
    expect(episodeAccess(s, u, ep4, T0).unlocked).toBe(true);
  });

  it("completing an episode rewards once and grants exactly one free episode pack", () => {
    const s = freshState();
    const u = withGuest(s);
    const ep = "tiny-titans-s1e1";
    expect(() => openPackTx(s, u, { packType: "episode", universeId: "tiny-titans", episodeId: ep, idempotencyKey: "ep-0-xxxxxx" }, seededRng(1), T0)).toThrow(/Finish the episode/);
    expect(completeEpisodeTx(s, u, ep, T0).first).toBe(true);
    expect(completeEpisodeTx(s, u, ep, T0).first).toBe(false);
    expect(s.transactions.filter((t) => t.userId === u && t.reason === "episode-complete")).toHaveLength(1);
    const { opening } = openPackTx(s, u, { packType: "episode", universeId: "tiny-titans", episodeId: ep, idempotencyKey: "ep-1-xxxxxx" }, seededRng(1), T0);
    const epCards = new Set(catalog(s).episodes.get(ep)!.cardIds);
    expect(opening.items.every((i) => epCards.has(i.cardId))).toBe(true);
    expect(opening.cost.shards).toBe(0);
    s.wallets[u]!.shards = 100;
    const second = openPackTx(s, u, { packType: "episode", universeId: "tiny-titans", episodeId: ep, idempotencyKey: "ep-2-xxxxxx" }, seededRng(2), T0);
    expect(second.opening.cost.shards).toBe(60);
  });

  it("unreleased episodes cannot be read", () => {
    const s = freshState();
    const u = withGuest(s);
    expect(() => completeEpisodeTx(s, u, "afterlight-s1e6", T0)).toThrow();
  });

  it("extras unlock from collection milestones", () => {
    const s = freshState();
    const u = withGuest(s);
    const uni = catalog(s).byId.get("afterlight")!;
    const diary = uni.extras.find((x) => x.kind === "diary")!;
    expect(extraUnlocked(s, u, diary, uni)).toBe(false);
    s.inventory[u] = { "afterlight-s1-001": { count: 1, variants: { standard: 1 }, firstAt: "", lastAt: "" } };
    expect(extraUnlocked(s, u, diary, uni)).toBe(true);
  });
});
