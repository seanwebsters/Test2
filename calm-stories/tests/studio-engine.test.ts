import { afterEach, describe, expect, it } from "vitest";
import { drain, runScheduledProduction, resumeRun } from "@/lib/studio";
import { createRun } from "@/lib/studio/engine";
import { RateLimitedError } from "@/lib/studio/errors";
import { setClaudeTransport, type TransportRequest } from "@/lib/studio/llm";
import { newId, nowIso } from "@/lib/util";
import { freshDb } from "./helpers";
import { fakeClaude } from "./studio-fakes";

afterEach(() => setClaudeTransport(null));

const proposalsRun = (budget = 100) =>
  createRun({ kind: "series_development", title: "Proposals", budget_cents: budget, created_by: "usr_calm-editor", steps: [{ key: "proposals", type: "program.proposals", agent: "program_director", label: "Propose", activity: "thinking", deps: [] }] });

describe("workflow engine guarantees", () => {
  it("waits out provider rate limits without spending an attempt, then continues", async () => {
    const db = freshDb();
    const fake = fakeClaude({ calls: [], synthesisRounds: 0 });
    let calls = 0;
    setClaudeTransport(async (req: TransportRequest) => {
      if (calls++ === 0) throw new RateLimitedError("Anthropic", 60_000);
      return fake(req);
    });
    const { run } = await proposalsRun();
    await drain();
    let step = (await db.findOne("workflow_steps", { run_id: run.id, key: "proposals" }))!;
    expect(step.status).toBe("waiting");
    expect(step.attempts).toBe(0);
    await drain({ now: new Date(Date.now() + 61_000) });
    step = (await db.findOne("workflow_steps", { run_id: run.id, key: "proposals" }))!;
    expect(step.status).toBe("succeeded");
    // Audience-informed: the Program Director saw the catalogue data.
    const d = (await db.findOne("deliverables", { key: "program_proposals" }))!;
    expect(d.agent).toBe("program_director");
  });

  it("blocks on budget instead of overspending, and resumes with a higher budget", async () => {
    const db = freshDb();
    setClaudeTransport(fakeClaude({ calls: [], synthesisRounds: 0 }));
    const { run } = await proposalsRun(1);
    await drain();
    const step = (await db.findOne("workflow_steps", { run_id: run.id, key: "proposals" }))!;
    expect(step.status).toBe("blocked");
    expect(step.needs).toBe("budget");
    expect(await db.count("usage_records")).toBe(0);
    await resumeRun(run.id, { budget_cents: 500 });
    await drain();
    expect((await db.get("workflow_runs", run.id))!.status).toBe("succeeded");
  });

  it("commissions one episode per release slot for greenlit series only, idempotently", async () => {
    const db = freshDb();
    const sid = "ser_the-moonlit-kingdom";
    await db.insert("production_workflows", { id: "wf1", series_id: sid, status: "active", episodes_per_week: 2, release_days: [0, 1, 2, 3, 4, 5, 6], release_hour_utc: 20, target_minutes: 20, budget_cents: 1500, created_at: nowIso(), updated_at: nowIso() });
    expect(await runScheduledProduction()).toHaveLength(0); // not a greenlit studio series
    await db.insert("series_projects", { id: newId("prj"), brief: "b", status: "greenlit", series_id: sid, run_id: null, created_by: "usr_calm-editor", decision_by: "usr_calm-editor", decision_notes: "", decided_at: nowIso(), created_at: nowIso(), updated_at: nowIso() });
    const first = await runScheduledProduction();
    expect(first).toHaveLength(2);
    expect(await runScheduledProduction()).toHaveLength(0);
    const runs = await db.list("workflow_runs", { where: { kind: "episode_production" } });
    expect(runs.every((r) => r.idempotency_key?.startsWith("sched:") && r.params.release_at)).toBe(true);
  });
});
