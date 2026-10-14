import { describe, expect, it } from "vitest";
import { enqueueJob, pauseJob, registerWorkflow, rerunJob, resumeJob, runJob } from "@/lib/jobs/runner";
import { freshDb } from "./helpers";

let flaky = 0;
registerWorkflow({
  kind: "mix",
  steps: (payload) => [
    { id: "a", label: "Step A", agent: "showrunner", run: async (ctx) => { ctx.state.a = true; return { preview: "a done" }; } },
    {
      id: "b",
      label: "Step B",
      agent: "writer",
      run: async (ctx) => {
        if (payload.failTimes && flaky < (payload.failTimes as number)) {
          flaky++;
          throw new Error("transient provider error");
        }
        if (payload.spend) {
          ctx.ensureBudget(payload.spend as number);
          await ctx.addCost({ category: "llm", provider: "test", model: "m", units: 1, unit_label: "call", cost_cents: payload.spend as number, simulated: false });
        }
        return { preview: `saw a=${String(ctx.state.a)}` };
      },
    },
  ],
});

describe("job runner", () => {
  it("retries transient failures and persists state between steps", async () => {
    const db = freshDb();
    flaky = 0;
    const { job } = await enqueueJob({ kind: "mix", payload: { failTimes: 1 } });
    await runJob(job.id);
    const done = (await db.get("ai_production_jobs", job.id))!;
    expect(done.status).toBe("succeeded");
    expect(done.steps.find((s) => s.id === "b")!.attempts).toBe(2);
    expect(done.steps.find((s) => s.id === "b")!.output_preview).toBe("saw a=true");
  });

  it("is idempotent by key", async () => {
    freshDb();
    const a = await enqueueJob({ kind: "mix", payload: {}, idempotency_key: "slot-1" });
    const b = await enqueueJob({ kind: "mix", payload: {}, idempotency_key: "slot-1" });
    expect(b.created).toBe(false);
    expect(b.job.id).toBe(a.job.id);
  });

  it("enforces the job budget and records costs", async () => {
    const db = freshDb();
    const { job } = await enqueueJob({ kind: "mix", payload: { spend: 500 }, budget_cents: 100 });
    await runJob(job.id);
    const failed = (await db.get("ai_production_jobs", job.id))!;
    expect(failed.status).toBe("failed");
    expect(failed.error).toMatch(/Budget exceeded/);
    const ok = await enqueueJob({ kind: "mix", payload: { spend: 50 }, budget_cents: 100 });
    await runJob(ok.job.id);
    expect((await db.get("ai_production_jobs", ok.job.id))!.cost_cents).toBe(50);
    expect(await db.count("production_costs", { job_id: ok.job.id })).toBe(1);
  });

  it("supports pause, resume and rerun from the failed step", async () => {
    const db = freshDb();
    flaky = 0;
    const { job } = await enqueueJob({ kind: "mix", payload: { failTimes: 10 } });
    await runJob(job.id);
    expect((await db.get("ai_production_jobs", job.id))!.status).toBe("failed");
    flaky = 100; // provider recovered
    await rerunJob(job.id);
    await runJob(job.id);
    const j = (await db.get("ai_production_jobs", job.id))!;
    expect(j.status).toBe("succeeded");
    expect(j.steps.find((s) => s.id === "a")!.attempts).toBe(1); // step A not repeated

    const second = await enqueueJob({ kind: "mix", payload: {} });
    await pauseJob(second.job.id);
    await runJob(second.job.id);
    expect((await db.get("ai_production_jobs", second.job.id))!.status).toBe("paused");
    await resumeJob(second.job.id);
    await runJob(second.job.id);
    expect((await db.get("ai_production_jobs", second.job.id))!.status).toBe("succeeded");
  });
});
