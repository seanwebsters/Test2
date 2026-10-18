import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { LocalStore } from "@/lib/db/store";
import { seededRng } from "@/lib/economy/rng";
import { openPackTx } from "@/lib/services/packs";
import { freshState, T0, withGuest } from "./helpers";

describe("transactional store", () => {
  it("rolls back every change when a transaction throws", async () => {
    const s = freshState();
    const u = withGuest(s);
    s.wallets[u]!.shards = 120;
    const store = new LocalStore(s);
    await expect(
      store.transact((d) => {
        d.wallets[u]!.shards -= 100;
        d.inventory[u] = { "afterlight-s1-001": { count: 1, variants: { standard: 1 }, firstAt: "", lastAt: "" } };
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect(store.read().wallets[u]!.shards).toBe(120);
    expect(store.read().inventory[u]).toBeUndefined();
  });

  it("serialises concurrent pack openings: each paid exactly once, duplicates by key collapse", async () => {
    const s = freshState();
    const u = withGuest(s);
    s.wallets[u]!.shards = 1000;
    const store = new LocalStore(s);
    const keys = ["k-a-xxxxxxxx", "k-b-xxxxxxxx", "k-a-xxxxxxxx", "k-c-xxxxxxxx", "k-b-xxxxxxxx"];
    const results = await Promise.allSettled(keys.map((k, i) => store.transact((d) => openPackTx(d, u, { packType: "standard", universeId: "moon-market", idempotencyKey: k }, seededRng(i), T0))));
    expect(results.every((r) => r.status === "fulfilled")).toBe(true);
    const state = store.read();
    expect(state.openings.filter((o) => o.userId === u)).toHaveLength(3);
    expect(state.wallets[u]!.shards).toBe(1000 - 3 * 100 + state.transactions.filter((t) => t.userId === u && t.reason.startsWith("achievement")).reduce((a, t) => a + t.amount, 0));
  });

  it("persists atomically and reloads", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nx-store-"));
    const file = path.join(dir, "db.json");
    const store = LocalStore.open(file, () => freshState());
    await store.transact((d) => {
      d.searches.push({ q: "lumen", at: new Date(T0).toISOString() });
    });
    const again = LocalStore.open(file, () => freshState());
    expect(again.read().searches[0]!.q).toBe("lumen");
    expect(fs.readdirSync(dir).filter((f) => f.endsWith(".tmp"))).toHaveLength(0);
  });
});
