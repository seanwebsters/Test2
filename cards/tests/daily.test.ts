import { describe, expect, it } from "vitest";
import { seededRng } from "@/lib/economy/rng";
import { challenges, claimChallengeTx, dailyStatus } from "@/lib/services/daily";
import { openPackTx } from "@/lib/services/packs";
import { setDemoCollectorPassTx } from "@/lib/services/users";
import { days, freshState, T0, withGuest } from "./helpers";

describe("daily drops", () => {
  it("allows one daily claim per UTC day", () => {
    const s = freshState();
    const u = withGuest(s);
    openPackTx(s, u, { packType: "daily", universeId: "afterlight", idempotencyKey: "d1-xxxxxxx" }, seededRng(1), T0);
    expect(() => openPackTx(s, u, { packType: "daily", universeId: "afterlight", idempotencyKey: "d2-xxxxxxx" }, seededRng(1), T0 + 3600_000)).toThrow(/already claimed/);
    // 23:59 UTC same day still blocked; 00:00 next day allowed
    const endOfDay = Date.UTC(2026, 9, 17, 23, 59, 59);
    expect(() => openPackTx(s, u, { packType: "daily", universeId: "afterlight", idempotencyKey: "d3-xxxxxxx" }, seededRng(1), endOfDay)).toThrow();
    openPackTx(s, u, { packType: "daily", universeId: "afterlight", idempotencyKey: "d4-xxxxxxx" }, seededRng(1), Date.UTC(2026, 9, 18, 0, 0, 1));
    expect(s.dailyClaims.filter((c) => c.userId === u)).toHaveLength(2);
  });

  it("advances the seven-day track per claim without punishing missed days", () => {
    const s = freshState();
    const u = withGuest(s);
    const track = s.economy.dailyTrack;
    let expected = 0;
    // Claim on days 0,1, skip 2-4, claim 5..9 → 7 claims total
    const claimDays = [0, 1, 5, 6, 7, 8, 9];
    claimDays.forEach((d, i) => {
      const before = s.wallets[u]!.shards;
      openPackTx(s, u, { packType: "daily", universeId: "afterlight", idempotencyKey: `track-${d}-xxxx` }, seededRng(d), T0 + days(d));
      expected = track[i % 7]!;
      // shards gained include the track reward (achievements may add more on the first claim)
      expect(s.wallets[u]!.shards - before).toBeGreaterThanOrEqual(expected);
    });
    expect(s.dailyClaims.map((c) => c.trackIndex)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(s.wallets[u]!.tokens.premium).toBe(1);
    const status = dailyStatus(s, u, T0 + days(10));
    expect(status.claimed).toBe(false);
    expect(status.nextTrackIndex).toBe(0);
  });

  it("pass bonus requires an active (demo) pass and is once per day", () => {
    const s = freshState();
    const u = withGuest(s);
    expect(() => openPackTx(s, u, { packType: "pass-daily", universeId: "afterlight", idempotencyKey: "p1-xxxxxxx" }, seededRng(1), T0)).toThrow(/Collector Pass/);
    setDemoCollectorPassTx(s, u, true, T0);
    const { opening } = openPackTx(s, u, { packType: "pass-daily", universeId: "afterlight", idempotencyKey: "p2-xxxxxxx" }, seededRng(1), T0);
    expect(opening.items).toHaveLength(3);
    expect(() => openPackTx(s, u, { packType: "pass-daily", universeId: "afterlight", idempotencyKey: "p3-xxxxxxx" }, seededRng(1), T0)).toThrow(/already claimed/);
    expect(() => openPackTx(s, u, { packType: "pass-daily", universeId: "afterlight", idempotencyKey: "p4-xxxxxxx" }, seededRng(1), T0 + days(31))).toThrow(/Collector Pass/);
  });

  it("challenges can be claimed once when complete", () => {
    const s = freshState();
    const u = withGuest(s);
    const open = challenges(s, u, T0).find((c) => c.title === "Open any pack")!;
    expect(() => claimChallengeTx(s, u, open.key, T0)).toThrow(/Not complete/);
    openPackTx(s, u, { packType: "daily", universeId: "afterlight", idempotencyKey: "c1-xxxxxxx" }, seededRng(1), T0);
    const reward = claimChallengeTx(s, u, open.key, T0);
    expect(reward).toBe(open.reward);
    expect(() => claimChallengeTx(s, u, open.key, T0)).toThrow(/Already claimed/);
  });
});
