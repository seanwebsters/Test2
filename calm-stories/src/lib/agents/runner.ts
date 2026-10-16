import "server-only";
import { getDb } from "@/lib/db";
import { log } from "@/lib/log";
import type { AgentKind, JobLog, JobStepState, ProductionJob } from "@/lib/types";
import { newId, nowIso } from "@/lib/util";
import { getAgentSettings } from "./config";

/**
 * Persisted, resumable job runner for the production agents: step state and
 * logs are saved after every step, failed steps retry with backoff, budgets
 * are enforced before paid calls, and jobs can be paused, resumed, cancelled
 * or re-run from the step that failed. Runs in-process (heartbeat + cron).
 */
export interface StepResult {
  preview?: string;
  simulated?: boolean;
  skipped?: boolean;
}

export interface JobContext {
  job: ProductionJob;
  /** Shared state persisted between steps (and across retries / restarts). */
  state: Record<string, unknown>;
  log: (message: string, level?: JobLog["level"]) => Promise<void>;
  addCost: (cents: number) => Promise<void>;
  /** Throws if spending `cents` more would exceed the job budget. */
  ensureBudget: (cents: number) => void;
  setEpisode: (episodeId: string) => Promise<void>;
}

export interface StepDef {
  id: string;
  label: string;
  agent: AgentKind;
  run: (ctx: JobContext) => Promise<StepResult | void>;
}

export class BudgetExceededError extends Error {}
class JobInterrupted extends Error {}

let STEPS: StepDef[] = [];
export function registerSteps(steps: StepDef[]) {
  STEPS = steps;
}

export async function enqueueProduction(input: {
  series_id: string;
  workflow_id?: string | null;
  release_at?: string | null;
  idempotency_key?: string | null;
  requested_by?: string | null;
  budget_cents?: number | null;
  /** Override the workflow's target length (minutes). */
  target_minutes?: number | null;
}): Promise<{ job: ProductionJob; created: boolean }> {
  const db = getDb();
  if (input.idempotency_key) {
    const existing = await db.findOne("production_jobs", { idempotency_key: input.idempotency_key });
    if (existing && existing.status !== "cancelled") return { job: existing, created: false };
  }
  const settings = await getAgentSettings();
  const now = nowIso();
  const steps: JobStepState[] = STEPS.map((s) => ({
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
    simulated: false,
  }));
  const job = await db.insert("production_jobs", {
    id: newId("job"),
    series_id: input.series_id,
    episode_id: null,
    workflow_id: input.workflow_id ?? null,
    status: "queued",
    current_step: null,
    steps,
    logs: [{ at: now, level: "info", step: null, message: "Queued for production." }],
    payload: { release_at: input.release_at ?? null, ...(input.target_minutes ? { target_minutes: input.target_minutes } : {}), state: {} },
    attempts: 0,
    max_attempts: 3,
    idempotency_key: input.idempotency_key ?? null,
    cost_cents: 0,
    budget_cents: input.budget_cents ?? settings.per_job_budget_cents,
    error: null,
    requested_by: input.requested_by ?? null,
    created_at: now,
    started_at: null,
    finished_at: null,
    updated_at: now,
  });
  kick();
  return { job, created: true };
}

const g = globalThis as unknown as { __calmRunning?: Set<string>; __calmTimer?: NodeJS.Timeout | null };
const running = (g.__calmRunning ??= new Set<string>());

export function kick() {
  if (process.env.NODE_ENV === "test") return;
  if (g.__calmTimer) return;
  g.__calmTimer = setTimeout(() => {
    g.__calmTimer = null;
    void processQueue().catch((e) => log.error("agents", "processQueue failed", { error: String(e) }));
  }, 10);
}

/** Start queued jobs up to the concurrency limit (one per series at a time). */
export async function processQueue(opts: { wait?: boolean } = {}): Promise<number> {
  const db = getDb();
  const settings = await getAgentSettings();
  const jobs = await db.list("production_jobs", { where: { status: ["queued", "running"] }, orderBy: { column: "created_at" } });
  for (const j of jobs) {
    // Recover jobs orphaned by a restarted process.
    if (j.status === "running" && !running.has(j.id) && Date.now() - new Date(j.updated_at).getTime() > 10 * 60_000) {
      await db.update("production_jobs", j.id, { status: "queued", updated_at: nowIso() });
      j.status = "queued";
    }
  }
  const active = jobs.filter((j) => j.status === "running");
  const busy = new Set(active.map((j) => j.series_id));
  let slots = Math.max(0, settings.max_concurrent_jobs - active.length);
  const started: Promise<void>[] = [];
  for (const j of jobs.filter((x) => x.status === "queued")) {
    if (slots <= 0) break;
    if (busy.has(j.series_id) || running.has(j.id)) continue;
    slots--;
    busy.add(j.series_id);
    started.push(runJob(j.id));
  }
  if (opts.wait) await Promise.all(started);
  return started.length;
}

const patch = (id: string, p: Partial<ProductionJob>) => getDb().update("production_jobs", id, { ...p, updated_at: nowIso() });

async function appendLog(id: string, entry: JobLog) {
  const j = await getDb().get("production_jobs", id);
  if (j) await patch(id, { logs: [...j.logs, entry].slice(-300) });
}

async function patchStep(id: string, stepId: string, p: Partial<JobStepState>, extra: Partial<ProductionJob> = {}) {
  const j = (await getDb().get("production_jobs", id))!;
  return patch(id, { ...extra, steps: j.steps.map((s) => (s.id === stepId ? { ...s, ...p } : s)) });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function runJob(jobId: string): Promise<void> {
  if (running.has(jobId)) return;
  running.add(jobId);
  const db = getDb();
  try {
    let job = await db.get("production_jobs", jobId);
    if (!job || !["queued", "running"].includes(job.status)) return;
    job = await patch(jobId, { status: "running", started_at: job.started_at ?? nowIso(), attempts: job.attempts + 1 });
    const state = (job.payload.state as Record<string, unknown>) ?? {};
    let spent = job.cost_cents;

    for (const def of STEPS) {
      job = (await db.get("production_jobs", jobId))!;
      const step = job.steps.find((s) => s.id === def.id);
      if (!step || step.status === "succeeded" || step.status === "skipped") continue;
      if (job.status === "paused" || job.status === "cancelled") throw new JobInterrupted(job.status);

      const ctx: JobContext = {
        job,
        state,
        log: (message, level = "info") => appendLog(jobId, { at: nowIso(), level, step: def.id, message }),
        addCost: async (cents) => {
          spent += cents;
          const cur = (await db.get("production_jobs", jobId))!;
          await patch(jobId, {
            cost_cents: Math.round((cur.cost_cents + cents) * 100) / 100,
            steps: cur.steps.map((s) => (s.id === def.id ? { ...s, cost_cents: Math.round((s.cost_cents + cents) * 100) / 100 } : s)),
          });
        },
        ensureBudget: (cents) => {
          if (job!.budget_cents !== null && spent + cents > job!.budget_cents) {
            throw new BudgetExceededError(`Budget reached: this needs about ${cents.toFixed(0)}¢ but only ${Math.max(0, job!.budget_cents - spent).toFixed(0)}¢ remain.`);
          }
        },
        setEpisode: async (episodeId) => {
          await patch(jobId, { episode_id: episodeId });
        },
      };

      let attempt = step.attempts;
      for (;;) {
        attempt++;
        await patchStep(jobId, def.id, { status: "running", attempts: attempt, started_at: step.started_at ?? nowIso(), error: null }, { current_step: def.id });
        try {
          const out = (await def.run({ ...ctx, job: (await db.get("production_jobs", jobId))! })) ?? {};
          const done = (await db.get("production_jobs", jobId))!;
          await patchStep(
            jobId,
            def.id,
            { status: out.skipped ? "skipped" : "succeeded", finished_at: nowIso(), output_preview: out.preview?.slice(0, 600) ?? null, simulated: Boolean(out.simulated) },
            { payload: { ...done.payload, state } },
          );
          await ctx.log(`${out.skipped ? "Skipped" : "✓"} ${def.label}${out.preview ? ` – ${out.preview.slice(0, 160)}` : ""}`);
          break;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          const failed = (await db.get("production_jobs", jobId))!;
          const retryable = !(err instanceof BudgetExceededError) && attempt < failed.max_attempts;
          await patchStep(
            jobId,
            def.id,
            { status: retryable ? "running" : "failed", error: message, finished_at: retryable ? null : nowIso() },
            { payload: { ...failed.payload, state } },
          );
          await ctx.log(`${retryable ? "Retrying" : "Failed"} ${def.label}: ${message}`, retryable ? "warn" : "error");
          if (!retryable) throw err;
          await sleep(process.env.NODE_ENV === "test" ? 1 : Math.min(8000, 400 * 2 ** attempt));
        }
      }
    }
    await patch(jobId, { status: "succeeded", current_step: null, finished_at: nowIso(), error: null });
    await appendLog(jobId, { at: nowIso(), level: "info", step: null, message: "Episode produced and sent to the review queue." });
  } catch (err) {
    if (err instanceof JobInterrupted) {
      await appendLog(jobId, { at: nowIso(), level: "warn", step: null, message: `Job ${err.message}.` });
    } else {
      const message = err instanceof Error ? err.message : String(err);
      log.error("agents", "Production job failed", { jobId, error: message });
      await patch(jobId, { status: "failed", error: message, finished_at: nowIso() });
    }
  } finally {
    running.delete(jobId);
    kick();
  }
}

export async function pauseJob(id: string) {
  const j = await getDb().get("production_jobs", id);
  if (!j || !["queued", "running"].includes(j.status)) throw new Error("Only queued or running jobs can be paused.");
  await patch(id, { status: "paused" });
  await appendLog(id, { at: nowIso(), level: "info", step: null, message: "Paused (takes effect after the current step)." });
}

export async function resumeJob(id: string) {
  const j = await getDb().get("production_jobs", id);
  if (!j || j.status !== "paused") throw new Error("Only paused jobs can be resumed.");
  await patch(id, { status: "queued", steps: j.steps.map((s) => (s.status === "running" ? { ...s, status: "pending" } : s)) });
  await appendLog(id, { at: nowIso(), level: "info", step: null, message: "Resumed." });
  kick();
}

export async function cancelJob(id: string) {
  const j = await getDb().get("production_jobs", id);
  if (!j || ["succeeded", "failed", "cancelled"].includes(j.status)) throw new Error("This job has already finished.");
  await patch(id, { status: "cancelled", finished_at: nowIso() });
  await appendLog(id, { at: nowIso(), level: "warn", step: null, message: "Cancelled." });
}

/** Re-run a failed or cancelled job from the step that stopped it. */
export async function retryJob(id: string) {
  const j = await getDb().get("production_jobs", id);
  if (!j || !["failed", "cancelled"].includes(j.status)) throw new Error("Only failed or cancelled jobs can be retried.");
  const steps = j.steps.map((s) => (s.status === "succeeded" || s.status === "skipped" ? s : { ...s, status: "pending" as const, attempts: 0, error: null, started_at: null, finished_at: null }));
  await patch(id, { status: "queued", steps, error: null, finished_at: null });
  await appendLog(id, { at: nowIso(), level: "info", step: null, message: "Retrying from the step that stopped." });
  kick();
}

export function jobProgress(j: ProductionJob): number {
  const done = j.steps.filter((s) => s.status === "succeeded" || s.status === "skipped").length;
  return j.steps.length ? Math.round((done / j.steps.length) * 100) : 0;
}
