import { describe, expect, it } from "vitest";
import { catalog, isLive } from "@/lib/catalog";
import { ADMIN_USER_ID } from "@/lib/db/seed";
import { seededRng } from "@/lib/economy/rng";
import { openPackTx } from "@/lib/services/packs";
import type { GenerationProvider } from "@/lib/studio/providers";
import { assembleUniverseTx, createJobTx, executeStep, latestRun, queueStepTx, setApprovalTx, setUniverseStatusTx, STEPS, type StepKey } from "@/lib/studio/engine";
import { seededStore, T0, withGuest } from "./helpers";

const BRIEF = "Create a universe about tiny creatures living inside an abandoned shopping mall, with a warm, nostalgic visual style and a mystery-driven narrative.";

async function runAll(store: ReturnType<typeof seededStore>, jobId: string, provider?: GenerationProvider) {
  for (const s of STEPS) {
    await store.transact((d) => queueStepTx(d, ADMIN_USER_ID, jobId, s.key, provider ? provider.id : "template", T0));
    await executeStep(store, jobId, s.key, provider, { backoffMs: 1, now: () => T0 });
    const run = latestRun(store.read().jobs.find((j) => j.id === jobId)!, s.key)!;
    expect(run.status, `${s.key}: ${run.error}`).toBe("succeeded");
    await store.transact((d) => setApprovalTx(d, ADMIN_USER_ID, jobId, s.key, run.version, "approved", T0));
  }
}

describe("NEXARA Studio pipeline (offline template provider)", () => {
  it("drafts, reviews, assembles and publishes a universe into the live catalogue", async () => {
    const store = seededStore();
    const job = await store.transact((d) => createJobTx(d, ADMIN_USER_ID, BRIEF, T0));
    await runAll(store, job.id);
    const review = latestRun(store.read().jobs[0]!, "review")!.output as { passed: boolean };
    expect(review.passed).toBe(true);
    const u = await store.transact((d) => assembleUniverseTx(d, ADMIN_USER_ID, job.id, T0));
    expect(u.status).toBe("review");
    expect(u.cards).toHaveLength(24);
    expect(isLive(catalog(store.read()), catalog(store.read()).byId.get(u.id)!, T0)).toBe(false);
    await store.transact((d) => setUniverseStatusTx(d, ADMIN_USER_ID, u.id, "published", T0));
    const idx = catalog(store.read());
    expect(isLive(idx, idx.byId.get(u.id)!, T0)).toBe(true);
    // Collectors can open packs from it immediately.
    const guest = await store.transact((d) => withGuest(d, "usr_gstudioguest1", T0));
    const { opening } = await store.transact((d) => openPackTx(d, guest, { packType: "daily", universeId: u.id, idempotencyKey: "studio-daily-1" }, seededRng(5), T0));
    expect(opening.items).toHaveLength(5);
    // Unpublish removes it again.
    await store.transact((d) => setUniverseStatusTx(d, ADMIN_USER_ID, u.id, "unpublished", T0));
    const idx2 = catalog(store.read());
    expect(isLive(idx2, idx2.byId.get(u.id)!, T0)).toBe(false);
  });

  it("enforces step order and keeps version history", async () => {
    const store = seededStore();
    const job = await store.transact((d) => createJobTx(d, ADMIN_USER_ID, BRIEF, T0));
    await expect(store.transact((d) => queueStepTx(d, ADMIN_USER_ID, job.id, "world", "template", T0))).rejects.toThrow(/Approve "Concept"/);
    for (let v = 0; v < 2; v++) {
      await store.transact((d) => queueStepTx(d, ADMIN_USER_ID, job.id, "concept", "template", T0));
      await executeStep(store, job.id, "concept", undefined, { backoffMs: 1 });
    }
    expect(store.read().jobs[0]!.steps.concept).toHaveLength(2);
  });

  it("retries failed provider calls, logs cost, and fails cleanly after the last attempt", async () => {
    const store = seededStore();
    const job = await store.transact((d) => createJobTx(d, ADMIN_USER_ID, BRIEF, T0));
    let calls = 0;
    const flaky: GenerationProvider = {
      id: "fake",
      label: "Fake",
      isAI: true,
      async generate(req) {
        calls++;
        if (calls < 2) throw new Error("overloaded");
        return { output: { title: "Mallow Hollow", tagline: "t", premise: "p", synopsis: "s", genres: ["cosy"], audience: "a", differentiation: "d" } as never, provider: "fake", model: "fake-1", inputTokens: 1000, outputTokens: 500, costUsd: 0.014, _req: req } as never;
      },
    };
    await store.transact((d) => queueStepTx(d, ADMIN_USER_ID, job.id, "concept", "fake", T0));
    await executeStep(store, job.id, "concept", flaky, { backoffMs: 1 });
    const run = latestRun(store.read().jobs[0]!, "concept")!;
    expect(run.status).toBe("succeeded");
    expect(run.attempts).toBe(2);
    expect(store.read().jobs[0]!.totalCostUsd).toBeCloseTo(0.014);

    const broken: GenerationProvider = { id: "broken", label: "Broken", isAI: true, generate: async () => { throw new Error("down"); } };
    await store.transact((d) => queueStepTx(d, ADMIN_USER_ID, job.id, "concept", "broken", T0));
    await executeStep(store, job.id, "concept", broken, { backoffMs: 1, retries: 3 });
    const failed = latestRun(store.read().jobs[0]!, "concept")!;
    expect(failed.status).toBe("failed");
    expect(failed.attempts).toBe(3);
    expect(failed.error).toMatch(/down/);
  });

  it("rejects schema-invalid model output", async () => {
    const store = seededStore();
    const job = await store.transact((d) => createJobTx(d, ADMIN_USER_ID, BRIEF, T0));
    const bad: GenerationProvider = { id: "bad", label: "Bad", isAI: true, generate: async () => ({ output: { title: 3 } as never, provider: "bad", costUsd: 0 }) };
    await store.transact((d) => queueStepTx(d, ADMIN_USER_ID, job.id, "concept", "bad", T0));
    await executeStep(store, job.id, "concept", bad, { backoffMs: 1, retries: 1 });
    expect(latestRun(store.read().jobs[0]!, "concept")!.status).toBe("failed");
  });
});

describe("admin permissions", () => {
  it("non-admins cannot run any Studio mutation", async () => {
    const store = seededStore();
    const guest = await store.transact((d) => withGuest(d, "usr_gnotadmin0001", T0));
    await expect(store.transact((d) => createJobTx(d, guest, BRIEF, T0))).rejects.toThrow(/Administrator/);
    const job = await store.transact((d) => createJobTx(d, ADMIN_USER_ID, BRIEF, T0));
    await expect(store.transact((d) => queueStepTx(d, guest, job.id, "concept" as StepKey, "template", T0))).rejects.toThrow(/Administrator/);
    await expect(store.transact((d) => setUniverseStatusTx(d, guest, "afterlight", "unpublished", T0))).rejects.toThrow(/Administrator/);
    await expect(store.transact((d) => assembleUniverseTx(d, guest, job.id, T0))).rejects.toThrow(/Administrator/);
  });

  it("demo collectors cannot sign in and the admin password is hashed", async () => {
    const { authenticate } = await import("@/lib/services/users");
    const store = seededStore();
    const s = store.read();
    expect(s.users[ADMIN_USER_ID]!.passwordHash).toMatch(/^scrypt:/);
    expect(authenticate(s, "studio", "test-admin-pw")?.id).toBe(ADMIN_USER_ID);
    expect(authenticate(s, "studio", "wrong")).toBeUndefined();
    expect(authenticate(s, "lanternlily", "")).toBeUndefined();
  });
});
