import { describe, expect, it } from "vitest";
import { RARITIES } from "@/lib/content/types";
import { DEFAULT_RARE_PLUS_SLOT, DEFAULT_STANDARD_SLOT, DEFAULT_VARIANTS, rarityTableSchema, variantTableSchema, rarityRank } from "@/lib/economy/config";
import { pickWeighted, seededRng } from "@/lib/economy/rng";
import { craftCardTx, drawCards, openPackTx, poolFor } from "@/lib/services/packs";
import { freshState, T0, withGuest } from "./helpers";

describe("odds configuration", () => {
  it("default tables sum to exactly 10,000 basis points", () => {
    expect(rarityTableSchema.safeParse(DEFAULT_STANDARD_SLOT).success).toBe(true);
    expect(rarityTableSchema.safeParse(DEFAULT_RARE_PLUS_SLOT).success).toBe(true);
    expect(variantTableSchema.safeParse(DEFAULT_VARIANTS).success).toBe(true);
    expect(rarityTableSchema.safeParse({ ...DEFAULT_STANDARD_SLOT, mythic: 21 }).success).toBe(false);
  });

  it("weighted picks match the published odds within tolerance", () => {
    const rng = seededRng(42);
    const n = 200_000;
    const counts = Object.fromEntries(RARITIES.map((r) => [r, 0])) as Record<string, number>;
    for (let i = 0; i < n; i++) counts[pickWeighted(DEFAULT_STANDARD_SLOT, rng)]!++;
    for (const r of RARITIES) {
      const expected = DEFAULT_STANDARD_SLOT[r] / 10_000;
      const observed = counts[r]! / n;
      // 5 standard errors
      const tol = 5 * Math.sqrt((expected * (1 - expected)) / n);
      expect(Math.abs(observed - expected)).toBeLessThanOrEqual(tol);
    }
  });

  it("guaranteed slots never produce Common or Uncommon", () => {
    const s = freshState();
    const pool = poolFor(s, "afterlight", T0);
    const rng = seededRng(7);
    for (let i = 0; i < 2000; i++) {
      const card = drawCards(s, ["rarePlus"], pool, rng, T0)[0]!.card;
      expect(rarityRank(card.rarity)).toBeGreaterThanOrEqual(rarityRank("rare"));
    }
  });

  it("only draws released cards from live universes", () => {
    const s = freshState();
    const pool = poolFor(s, "afterlight", T0);
    expect(pool.length).toBeGreaterThan(15);
    expect(pool.every((c) => c.releaseOffsetDays <= 0)).toBe(true);
    expect(pool.some((c) => c.season === 2)).toBe(false);
  });
});

describe("opening packs", () => {
  it("starter pack: 5 cards, saved to inventory, only once", () => {
    const s = freshState();
    const u = withGuest(s);
    const { opening } = openPackTx(s, u, { packType: "starter", universeId: "afterlight", idempotencyKey: "starter-key-1" }, seededRng(1), T0);
    expect(opening.items).toHaveLength(5);
    expect(rarityRank(opening.items[4]!.rarity)).toBeGreaterThanOrEqual(rarityRank("rare"));
    const owned = Object.values(s.inventory[u]!).reduce((a, o) => a + o.count, 0);
    expect(owned).toBe(5);
    expect(() => openPackTx(s, u, { packType: "starter", universeId: "afterlight", idempotencyKey: "starter-key-2" }, seededRng(2), T0)).toThrow(/already/);
  });

  it("is idempotent: replaying the same key returns the same result without new rewards", () => {
    const s = freshState();
    const u = withGuest(s);
    const input = { packType: "daily" as const, universeId: "deep-blue", idempotencyKey: "daily-key-abc" };
    const first = openPackTx(s, u, input, seededRng(3), T0);
    const shards = s.wallets[u]!.shards;
    const copies = Object.values(s.inventory[u]!).reduce((a, o) => a + o.count, 0);
    const again = openPackTx(s, u, input, seededRng(999), T0);
    expect(again.replayed).toBe(true);
    expect(again.opening.id).toBe(first.opening.id);
    expect(again.opening.items).toEqual(first.opening.items);
    expect(s.wallets[u]!.shards).toBe(shards);
    expect(Object.values(s.inventory[u]!).reduce((a, o) => a + o.count, 0)).toBe(copies);
    expect(s.openings.filter((o) => o.userId === u)).toHaveLength(1);
  });

  it("rejects reusing a key for a different pack type", () => {
    const s = freshState();
    const u = withGuest(s);
    openPackTx(s, u, { packType: "daily", universeId: "deep-blue", idempotencyKey: "shared-key-1" }, seededRng(3), T0);
    expect(() => openPackTx(s, u, { packType: "starter", universeId: "deep-blue", idempotencyKey: "shared-key-1" }, seededRng(3), T0)).toThrow(/different pack/);
  });

  it("tracks duplicates and awards Stardust only for duplicates", () => {
    const s = freshState();
    const u = withGuest(s);
    s.wallets[u]!.shards = 100_000;
    let dupes = 0;
    let dust = 0;
    for (let i = 0; i < 40; i++) {
      const { opening } = openPackTx(s, u, { packType: "standard", universeId: "tiny-titans", idempotencyKey: `std-${i}-xxxxxx` }, seededRng(100 + i), T0);
      for (const it of opening.items) {
        if (!it.isNew) {
          dupes++;
          expect(it.dust).toBeGreaterThan(0);
        } else expect(it.dust).toBe(0);
        dust += it.dust;
      }
    }
    expect(dupes).toBeGreaterThan(0);
    expect(s.wallets[u]!.stardust).toBe(dust);
    const inv = s.inventory[u]!;
    const total = Object.values(inv).reduce((a, o) => a + o.count, 0);
    expect(total).toBe(200);
    for (const o of Object.values(inv)) expect(Object.values(o.variants).reduce((a, b) => a + (b ?? 0), 0)).toBe(o.count);
  });

  it("charges Shards for paid packs and refuses when the balance is too low", () => {
    const s = freshState();
    const u = withGuest(s);
    s.wallets[u]!.shards = 150;
    openPackTx(s, u, { packType: "standard", universeId: "crownless", idempotencyKey: "pay-1-xxxx" }, seededRng(1), T0);
    const bonuses = s.transactions.filter((t) => t.userId === u && t.reason.startsWith("achievement")).reduce((a, t) => a + t.amount, 0);
    expect(s.wallets[u]!.shards).toBe(50 + bonuses);
    s.wallets[u]!.shards = 50;
    expect(() => openPackTx(s, u, { packType: "standard", universeId: "crownless", idempotencyKey: "pay-2-xxxx" }, seededRng(1), T0)).toThrow(/Not enough/);
    expect(s.wallets[u]!.shards).toBe(50);
    expect(s.transactions.filter((t) => t.userId === u && t.reason === "pack:standard")).toHaveLength(1);
  });

  it("refuses unreleased universes and episodes", () => {
    const s = freshState();
    const u = withGuest(s);
    expect(() => openPackTx(s, u, { packType: "daily", universeId: "nope", idempotencyKey: "nope-key-1" }, seededRng(1), T0)).toThrow(/isn't live/);
  });

  it("crafting lets free players complete sets, and only for missing cards", () => {
    const s = freshState();
    const u = withGuest(s);
    s.wallets[u]!.stardust = 50;
    craftCardTx(s, u, "afterlight-s1-004", T0);
    expect(s.inventory[u]!["afterlight-s1-004"]!.count).toBe(1);
    expect(s.wallets[u]!.stardust).toBe(10);
    expect(() => craftCardTx(s, u, "afterlight-s1-004", T0)).toThrow(/already own/);
    expect(() => craftCardTx(s, u, "afterlight-s1-020", T0)).toThrow(/Not enough/);
    expect(() => craftCardTx(s, u, "afterlight-s2-001", T0)).toThrow(/not available/);
  });
});
