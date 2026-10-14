import "server-only";
import { getDb } from "@/lib/db";
import { env } from "@/lib/env";
import { log } from "@/lib/log";
import type { AgentKind, AiProductionJob, JobLog, JobStepState, ProductionCost } from "@/lib/types";
import { newId, nowIso } from "@/lib/util";
import { getAiSettings } from "@/lib/ai";

/* ------------------------------------------------------------------ */
/* Workflow definitions                                                */
/* ------------------------------------------------------------------ */

export interface JobContext {
  job: AiProductionJob;
  /** Shared, persisted scratch state between steps. */
  state: Record<string, unknown>;
  log: (message: string, level?: JobLog["level"]) => Promise<void>;
  addCost: (c: Omit<ProductionCost, "id" | "job_id" | "created_at" | "series_id" | "episode_id">) => Promise<void>;
  /** Throws BudgetExceededError if spending `cents` more would exceed the job budget. */
  ensureBudget: (cents: number) => void;
}

export interface StepDef {
  id: string;
  label: string;
  agent: AgentKind;
  run: (ctx: JobContext) => Promise<{ preview?: string } | void>;
}

export interface WorkflowDef {
  kind: AiProductionJob["kind"];
  steps: (payload: Record<string, unknown>) => StepDef[];
}

const workflows = new Map<string, WorkflowDef>();
export function registerWorkflow(def: WorkflowDef) {
  workflows.set(def.kind, def);
}

export class BudgetExceededError extends Error {}
class JobInterrupted extends Error {}

/* ------------------------------------------------------------------ */
/* Enqueue                                                             */
/* ------------------------------------------------------------------ */

export async function enqueueJob(input: {
  kind: AiProductionJob["kind"];
  payload: Record<string, unknown>;
  series_id?: string | null;
  episode_id?: string | null;
  workflow_id?: string | null;
  idempotency_key?: string | null;
  requested_by?: string | null;
  budget_cents?: number | null;
  simulated?: boolean;
}): Promise<{ job: AiProductionJob; created: boolean }> {
  const db = getDb();
  const wf = workflows.get(input.kind);
  if (!wf) throw new Error(`No workflow registered for ${input.kind}`);
  if (input.idempotency_key) {
    const existing = await db.findOne("ai_production_jobs", { idempotency_key: input.idempotency_key });
    // Same key → same job, unless the earlier one was cancelled.
    if (existing && existing.status !== "cancelled") return { job: existing, created: false };
  }
  const settings = await getAiSettings();
  const now = nowIso();
  const steps: JobStepState[] = wf.steps(input.payload).map((s) => ({
    id: s.id,
    label: s.label,
    agent: s.agent,
    status: "pending",
    attempts: 0,
    started_at: null,
    finished_at: null,
    output_preview: null,
    error: null,
    cost_cents: 0,
  }));
  const job: AiProductionJob = {
    id: newId("job"),
    kind: input.kind,
    series_id: input.series_id ?? null,
    episode_id: input.episode_id ?? null,
    workflow_id: input.workflow_id ?? null,
    status: "queued",
    current_step: null,
    steps,
    logs: [{ at: now, level: "info", step: null, message: "Job queued." }],
    payload: { ...input.payload, state: {} },
    attempts: 0,
    max_attempts: settings.retry_limit + 1,
    idempotency_key: input.idempotency_key ?? null,
    cost_cents: 0,
    budget_cents: input.budget_cents ?? settings.per_job_cost_limit_cents,
    error: null,
    simulated: input.simulated ?? false,
    requested_by: input.requested_by ?? null,
    created_at: now,
    started_at: null,
    finished_at: null,
    updated_at: now,
  };
  await db.insert("ai_production_jobs", job);
  await dispatch(job.id);
  return { job, created: true };
}

/* ------------------------------------------------------------------ */
/* Drivers                                                             */
/* ------------------------------------------------------------------ */

const g = globalThis as unknown as { __calmRunning?: Set<string>; __calmTimer?: NodeJS.Timeout | null };
const running = (g.__calmRunning ??= new Set<string>());

/**
 * inline:  run in this Node process (development, single server).
 * trigger: hand the job to Trigger.dev, whose task calls runJob(jobId).
 */
async function dispatch(jobId: string) {
  if (env.jobDriver === "trigger" && env.triggerSecretKey) {
    const res = await fetch(`${env.triggerApiUrl}/api/v1/tasks/calm-run-job/trigger`, {
      method: "POST",
      headers: { authorization: `Bearer ${env.triggerSecretKey}`, "content-type": "application/json" },
      body: JSON.stringify({ payload: { jobId }, options: { idempotencyKey: jobId } }),
    });
    if (!res.ok) log.error("jobs", "Trigger.dev dispatch failed", { jobId, status: res.status });
    return;
  }
  kick();
}

export function kick() {
  if (process.env.NODE_ENV === "test" && !process.env.CALM_JOBS_IN_TESTS) return;
  if (g.__calmTimer) return;
  g.__calmTimer = setTimeout(() => {
    g.__calmTimer = null;
    void processQueue().catch((e) => log.error("jobs", "processQueue failed", { error: String(e) }));
  }, 10);
}

/** Start queued jobs up to the concurrency limit (max one per series). */
export async function processQueue(opts: { wait?: boolean } = {}): Promise<number> {
  const db = getDb();
  const settings = await getAiSettings();
  const jobs = await db.list("ai_production_jobs", { where: { status: ["queued", "running"] }, orderBy: { column: "created_at" } });
  // Recover jobs orphaned by a restarted process.
  for (const j of jobs) {
    if (j.status === "running" && !running.has(j.id) && Date.now() - new Date(j.updated_at).getTime() > 10 * 60_000) {
      await db.update("ai_production_jobs", j.id, { status: "queued", updated_at: nowIso() });
      j.status = "queued";
    }
  }
  const active = jobs.filter((j) => j.status === "running");
  const busySeries = new Set(active.map((j) => j.series_id).filter(Boolean));
  let slots = Math.max(0, settings.max_concurrent_jobs - active.length);
  const started: Promise<void>[] = [];
  for (const j of jobs.filter((x) => x.status === "queued")) {
    if (slots <= 0) break;
    if (j.series_id && busySeries.has(j.series_id)) continue;
    if (running.has(j.id)) continue;
    slots--;
    if (j.series_id) busySeries.add(j.series_id);
    started.push(runJob(j.id));
  }
  if (opts.wait) await Promise.all(started);
  return started.length;
}

/* ------------------------------------------------------------------ */
/* Execution                                                           */
/* ------------------------------------------------------------------ */

async function patchJob(id: string, patch: Partial<AiProductionJob>) {
  return getDb().update("ai_production_jobs", id, { ...patch, updated_at: nowIso() });
}

async function appendLog(id: string, entry: JobLog) {
  const db = getDb();
  const j = await db.get("ai_production_jobs", id);
  if (!j) return;
  await patchJob(id, { logs: [...j.logs, entry].slice(-300) });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function runJob(jobId: string): Promise<void> {
  if (running.has(jobId)) return;
  running.add(jobId);
  const db = getDb();
  try {
    let job = await db.get("ai_production_jobs", jobId);
    if (!job || !["queued", "running"].includes(job.status)) return;
    const wf = workflows.get(job.kind);
    if (!wf) throw new Error(`Unknown workflow ${job.kind}`);
    const defs = wf.steps(job.payload);
    job = await patchJob(jobId, { status: "running", started_at: job.started_at ?? nowIso(), attempts: job.attempts + 1 });
    const state = (job.payload.state as Record<string, unknown>) ?? {};
    let spent = job.cost_cents;

    for (const def of defs) {
      job = (await db.get("ai_production_jobs", jobId))!;
      const step = job.steps.find((s) => s.id === def.id);
      if (!step || step.status === "succeeded" || step.status === "skipped") continue;
      if (job.status === "paused" || job.status === "cancelled") throw new JobInterrupted(job.status);

      const ctx: JobContext = {
        job,
        state,
        log: (message, level = "info") => appendLog(jobId, { at: nowIso(), level, step: def.id, message }),
        addCost: async (c) => {
          spent += c.cost_cents;
          const cur = (await db.get("ai_production_jobs", jobId))!;
          await db.insert("production_costs", { ...c, id: newId("cost"), job_id: jobId, series_id: cur.series_id, episode_id: cur.episode_id, created_at: nowIso() });
          await patchJob(jobId, {
            cost_cents: Math.round((cur.cost_cents + c.cost_cents) * 100) / 100,
            steps: cur.steps.map((s) => (s.id === def.id ? { ...s, cost_cents: Math.round((s.cost_cents + c.cost_cents) * 100) / 100 } : s)),
          });
        },
        ensureBudget: (cents) => {
          if (job!.budget_cents !== null && spent + cents > job!.budget_cents) {
            throw new BudgetExceededError(`Budget exceeded: this step needs ~${cents.toFixed(0)}¢ but only ${(job!.budget_cents - spent).toFixed(0)}¢ remain.`);
          }
        },
      };

      let attempt = step.attempts;
      for (;;) {
        attempt++;
        const fresh = (await db.get("ai_production_jobs", jobId))!;
        await patchJob(jobId, {
          current_step: def.id,
          steps: fresh.steps.map((s) => (s.id === def.id ? { ...s, status: "running", attempts: attempt, started_at: s.started_at ?? nowIso(), error: null } : s)),
        });
        try {
          const out = await def.run({ ...ctx, job: fresh });
          const done = (await db.get("ai_production_jobs", jobId))!;
          await patchJob(jobId, {
            payload: { ...done.payload, state },
            steps: done.steps.map((s) => (s.id === def.id ? { ...s, status: "succeeded", finished_at: nowIso(), output_preview: out?.preview?.slice(0, 600) ?? s.output_preview } : s)),
          });
          await ctx.log(`✓ ${def.label}${out?.preview ? ` – ${out.preview.slice(0, 140)}` : ""}`);
          break;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          const failed = (await db.get("ai_production_jobs", jobId))!;
          const retryable = !(err instanceof BudgetExceededError) && attempt < failed.max_attempts;
          await patchJob(jobId, {
            payload: { ...failed.payload, state },
            steps: failed.steps.map((s) => (s.id === def.id ? { ...s, status: retryable ? "running" : "failed", error: message, finished_at: retryable ? null : nowIso() } : s)),
          });
          await ctx.log(`${retryable ? "Retrying" : "Failed"} ${def.label}: ${message}`, retryable ? "warn" : "error");
          if (!retryable) throw err;
          await sleep(Math.min(8000, 300 * 2 ** attempt));
        }
      }
    }
    await patchJob(jobId, { status: "succeeded", current_step: null, finished_at: nowIso(), error: null });
    await appendLog(jobId, { at: nowIso(), level: "info", step: null, message: "Job completed." });
  } catch (err) {
    if (err instanceof JobInterrupted) {
      await appendLog(jobId, { at: nowIso(), level: "warn", step: null, message: `Job ${err.message}.` });
    } else {
      const message = err instanceof Error ? err.message : String(err);
      log.error("jobs", "Job failed", { jobId, error: message });
      await patchJob(jobId, { status: "failed", error: message, finished_at: nowIso() });
    }
  } finally {
    running.delete(jobId);
    kick();
  }
}

/* ------------------------------------------------------------------ */
/* Controls                                                            */
/* ------------------------------------------------------------------ */

export async function pauseJob(id: string) {
  const j = await getDb().get("ai_production_jobs", id);
  if (!j || !["queued", "running"].includes(j.status)) throw new Error("Only queued or running jobs can be paused.");
  await patchJob(id, { status: "paused" });
  await appendLog(id, { at: nowIso(), level: "info", step: null, message: "Paused by administrator (takes effect after the current step)." });
}

export async function resumeJob(id: string) {
  const j = await getDb().get("ai_production_jobs", id);
  if (!j || j.status !== "paused") throw new Error("Only paused jobs can be resumed.");
  await patchJob(id, { status: "queued", steps: j.steps.map((s) => (s.status === "running" ? { ...s, status: "pending" } : s)) });
  await appendLog(id, { at: nowIso(), level: "info", step: null, message: "Resumed." });
  await dispatch(id);
}

export async function cancelJob(id: string) {
  const j = await getDb().get("ai_production_jobs", id);
  if (!j || ["succeeded", "failed", "cancelled"].includes(j.status)) throw new Error("This job has already finished.");
  await patchJob(id, { status: "cancelled", finished_at: nowIso() });
  await appendLog(id, { at: nowIso(), level: "warn", step: null, message: "Cancelled by administrator." });
}

/** Re-run a failed or cancelled job from the step that stopped it. */
export async function rerunJob(id: string, opts: { fromStart?: boolean } = {}) {
  const j = await getDb().get("ai_production_jobs", id);
  if (!j || !["failed", "cancelled", "succeeded"].includes(j.status)) throw new Error("Only finished jobs can be re-run.");
  const steps = j.steps.map((s) =>
    opts.fromStart || s.status !== "succeeded" ? { ...s, status: "pending" as const, attempts: 0, error: null, started_at: null, finished_at: null } : s,
  );
  await patchJob(id, { status: "queued", steps, error: null, finished_at: null, ...(opts.fromStart ? { payload: { ...j.payload, state: {} } } : {}) });
  await appendLog(id, { at: nowIso(), level: "info", step: null, message: opts.fromStart ? "Re-running from the start." : "Re-running from the failed step." });
  await dispatch(id);
}

export function jobProgress(j: AiProductionJob): number {
  const done = j.steps.filter((s) => s.status === "succeeded" || s.status === "skipped").length;
  return j.steps.length ? Math.round((done / j.steps.length) * 100) : 0;
}
