/**
 * Production jobs engine: durable job state, step-by-step execution with
 * retries, idempotent enqueueing, per-job budgets, concurrency limits and
 * pause / resume / cancel / retry / rerun controls.
 *
 * Driver: "inline" runs jobs in this server process (development, single
 * instance). "trigger" hands each job to Trigger.dev, which calls back
 * /api/jobs/run so long jobs survive request limits. See docs/INTEGRATIONS.md.
 */
import "server-only";
import { getAiSettings, withGenerationScope } from "@/lib/ai";
import { HttpError } from "@/lib/api";
import { loadViewer } from "@/lib/auth";
import { requireAdmin } from "@/lib/auth/policy";
import type { Viewer } from "@/lib/auth/viewer";
import { getDb } from "@/lib/db";
import { env } from "@/lib/env";
import { log } from "@/lib/log";
import type { AgentConfiguration, AiProductionJob, JobStepState, ProductionWorkflow } from "@/lib/types";
import { newId, nowIso } from "@/lib/util";
import { nextReleaseSlot, PIPELINE, StepHalt, type StepContext } from "./pipeline";

const g = globalThis as unknown as { __calmJobs?: Set<string>; __calmJobBackoffMs?: number };
const running = (g.__calmJobs ??= new Set<string>());

/** Test hook: retry backoff base in ms. */
export function setRetryBackoff(ms: number) {
  g.__calmJobBackoffMs = ms;
}

const STALE_MS = 10 * 60_000;

function freshSteps(): JobStepState[] {
  return PIPELINE.map((s) => ({ id: s.id, label: s.label, agent: s.agent, status: "pending", attempts: 0, started_at: null, finished_at: null, output_preview: null, error: null, cost_cents: 0 }));
}

export interface EnqueueInput {
  seriesId: string;
  episodeId?: string | null;
  workflowId?: string | null;
  requestedBy: string;
  budgetCents?: number | null;
  idempotencyKey?: string | null;
  payload?: Record<string, unknown>;
}

export async function enqueueProduction(input: EnqueueInput): Promise<{ job: AiProductionJob; created: boolean }> {
  const db = getDb();
  const series = await db.get("series", input.seriesId);
  if (!series) throw new HttpError(404, "Series not found");
  if (input.idempotencyKey) {
    const existing = await db.findOne("ai_production_jobs", { idempotency_key: input.idempotencyKey });
    if (existing && existing.status !== "cancelled" && existing.status !== "failed") return { job: existing, created: false };
  }
  if (input.episodeId) {
    const active = (await db.list("ai_production_jobs", { where: { episode_id: input.episodeId, status: ["queued", "running", "paused"] } }))[0];
    if (active) return { job: active, created: false };
  }
  const settings = await getAiSettings();
  const now = nowIso();
  const job: AiProductionJob = {
    id: newId("job"),
    kind: "episode_production",
    series_id: input.seriesId,
    episode_id: input.episodeId ?? null,
    workflow_id: input.workflowId ?? null,
    status: "queued",
    current_step: null,
    steps: freshSteps(),
    logs: [{ at: now, level: "info", step: null, message: "Queued." }],
    payload: { ...(input.payload ?? {}), results: {} },
    attempts: 0,
    max_attempts: settings.retry_limit + 1,
    idempotency_key: input.idempotencyKey ?? null,
    cost_cents: 0,
    budget_cents: input.budgetCents ?? settings.per_job_cost_limit_cents,
    error: null,
    simulated: false,
    requested_by: input.requestedBy,
    created_at: now,
    started_at: null,
    finished_at: null,
    updated_at: now,
  };
  await db.insert("ai_production_jobs", job);
  await dispatch(job.id);
  return { job, created: true };
}

/* ------------------------------------------------------------------ driver */

async function dispatch(jobId: string) {
  if (env.jobDriver === "trigger" && env.triggerSecretKey) {
    try {
      const res = await fetch(`${env.triggerApiUrl}/api/v1/tasks/calm-production-job/trigger`, {
        method: "POST",
        headers: { authorization: `Bearer ${env.triggerSecretKey}`, "content-type": "application/json" },
        body: JSON.stringify({ payload: { jobId }, options: { idempotencyKey: jobId, concurrencyKey: "calm-production" } }),
      });
      if (res.ok) return;
      log.warn("jobs", `Trigger.dev dispatch failed (${res.status}); running inline`);
    } catch (err) {
      log.warn("jobs", "Trigger.dev unreachable; running inline", err);
    }
  }
  if (process.env.CALM_JOBS_MANUAL === "1") return; // tests drive jobs explicitly
  void tick();
}

/** Starts queued jobs up to the concurrency limit. Returns started job ids. */
export async function tick(): Promise<string[]> {
  const db = getDb();
  const settings = await getAiSettings();
  const now = Date.now();
  // Recover jobs whose worker vanished (process restart).
  for (const j of await db.list("ai_production_jobs", { where: { status: "running" } })) {
    if (!running.has(j.id) && now - new Date(j.updated_at).getTime() > STALE_MS) {
      await appendLog(j.id, "warn", null, "Worker stopped responding; re-queued.");
      await db.update("ai_production_jobs", j.id, { status: "queued", updated_at: nowIso() });
    }
  }
  const active = (await db.list("ai_production_jobs", { where: { status: "running" } })).length;
  const slots = Math.max(0, settings.max_concurrent_jobs - Math.max(active, running.size));
  const queued = await db.list("ai_production_jobs", { where: { status: "queued" }, orderBy: { column: "created_at" } });
  const started: string[] = [];
  for (const j of queued.slice(0, slots)) {
    started.push(j.id);
    void runJob(j.id).catch((err) => log.error("jobs", `job ${j.id} crashed`, err));
  }
  return started;
}

/* ------------------------------------------------------------------ runner */

async function appendLog(jobId: string, level: "info" | "warn" | "error", step: string | null, message: string) {
  const db = getDb();
  const j = await db.get("ai_production_jobs", jobId);
  if (!j) return;
  await db.update("ai_production_jobs", jobId, { logs: [...j.logs, { at: nowIso(), level, step, message }].slice(-300), updated_at: nowIso() });
}

async function jobCost(jobId: string): Promise<{ cents: number; simulated: boolean }> {
  const rows = await getDb().list("production_costs", { where: { job_id: jobId } });
  return { cents: rows.reduce((a, r) => a + r.cost_cents, 0), simulated: rows.some((r) => r.simulated) };
}

async function patchStep(jobId: string, stepId: string, patch: Partial<JobStepState>, jobPatch: Partial<AiProductionJob> = {}) {
  const db = getDb();
  const j = await db.get("ai_production_jobs", jobId);
  if (!j) return;
  await db.update("ai_production_jobs", jobId, { ...jobPatch, steps: j.steps.map((s) => (s.id === stepId ? { ...s, ...patch } : s)), updated_at: nowIso() });
}

/**
 * Runs a job to completion, pause, cancellation or failure. Completed steps
 * are skipped, so this is safe to call again after a retry or restart.
 */
export async function runJob(jobId: string): Promise<AiProductionJob | null> {
  if (running.has(jobId)) return getDb().get("ai_production_jobs", jobId);
  running.add(jobId);
  const db = getDb();
  try {
    let job = await db.get("ai_production_jobs", jobId);
    if (!job || job.status !== "queued") return job;
    job = await db.update("ai_production_jobs", jobId, { status: "running", started_at: job.started_at ?? nowIso(), attempts: job.attempts + 1, error: null, updated_at: nowIso() });
    await appendLog(jobId, "info", null, job.attempts > 1 ? `Resumed (run ${job.attempts}).` : "Started.");
    const viewer = await loadViewer(job.requested_by);
    if (!viewer.user) throw new StepHalt("The requesting account no longer exists.");
    const workflow = job.workflow_id ? await db.get("production_workflows", job.workflow_id) : null;
    const agents = new Map((await db.list("agent_configurations")).map((a) => [a.agent, a] as const));

    for (const def of PIPELINE) {
      job = (await db.get("ai_production_jobs", jobId)) as AiProductionJob;
      const state = job.steps.find((s) => s.id === def.id);
      if (!state || state.status === "succeeded" || state.status === "skipped") continue;
      if (job.status === "paused" || job.status === "cancelled") {
        await appendLog(jobId, "info", null, job.status === "paused" ? "Paused before the next step." : "Cancelled.");
        return db.get("ai_production_jobs", jobId);
      }
      if (job.budget_cents !== null && job.cost_cents >= job.budget_cents) throw new StepHalt(`Budget of $${(job.budget_cents / 100).toFixed(2)} reached.`);
      const agent = agents.get(def.agent) as AgentConfiguration | undefined;
      if (agent && !agent.enabled) {
        await patchStep(jobId, def.id, { status: "failed", error: `${agent.name} agent is disabled.` });
        throw new StepHalt(`${agent.name} agent is disabled. Enable it in Agents, then retry.`);
      }
      const maxAttempts = (agent?.retry_limit ?? 2) + 1;
      const costBefore = (await jobCost(jobId)).cents;
      let attempt = state.attempts;
      for (;;) {
        attempt++;
        await patchStep(jobId, def.id, { status: "running", attempts: attempt, started_at: nowIso(), error: null }, { current_step: def.id });
        await appendLog(jobId, "info", def.id, `${def.label}${attempt > 1 ? ` (attempt ${attempt})` : ""}…`);
        try {
          const fresh = (await db.get("ai_production_jobs", jobId)) as AiProductionJob;
          const results = (fresh.payload.results as Record<string, unknown> | undefined) ?? {};
          const ctx: StepContext = {
            job: fresh,
            viewer,
            workflow,
            results,
            log: (m, level = "info") => appendLog(jobId, level, def.id, m),
            setEpisode: async (id) => {
              await db.update("ai_production_jobs", jobId, { episode_id: id, updated_at: nowIso() });
              ctx.job = { ...ctx.job, episode_id: id };
            },
          };
          const textAgent = agent && def.agent !== "audio_producer";
          const output = await withGenerationScope(
            { jobId, userId: viewer.user.id, provider: textAgent && agent.provider !== "auto" ? agent.provider : undefined, model: textAgent ? agent.model : undefined },
            () => def.run(ctx),
          );
          const { cents, simulated } = await jobCost(jobId);
          const latest = (await db.get("ai_production_jobs", jobId)) as AiProductionJob;
          await db.update("ai_production_jobs", jobId, { payload: { ...latest.payload, results: ctx.results } });
          await patchStep(jobId, def.id, { status: "succeeded", finished_at: nowIso(), output_preview: output.slice(0, 400), cost_cents: cents - costBefore }, { cost_cents: cents, simulated: latest.simulated || simulated });
          if (agent && cents - costBefore > agent.max_cost_cents_per_job) await appendLog(jobId, "warn", def.id, `${agent.name} spent $${((cents - costBefore) / 100).toFixed(2)}, above its $${(agent.max_cost_cents_per_job / 100).toFixed(2)} limit.`);
          await appendLog(jobId, "info", def.id, `✓ ${output.slice(0, 200)}`);
          break;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          const halt = err instanceof StepHalt || (err instanceof Error && "status" in err && [400, 402, 403, 404, 409].includes((err as { status: number }).status));
          if (!halt && attempt < maxAttempts) {
            await patchStep(jobId, def.id, { error: message });
            await appendLog(jobId, "warn", def.id, `Attempt ${attempt} failed: ${message}. Retrying.`);
            await new Promise((r) => setTimeout(r, (g.__calmJobBackoffMs ?? 1000) * 2 ** (attempt - 1)));
            continue;
          }
          await patchStep(jobId, def.id, { status: "failed", finished_at: nowIso(), error: message });
          throw err instanceof StepHalt ? err : new StepHalt(message);
        }
      }
    }
    const done = await db.update("ai_production_jobs", jobId, { status: "succeeded", current_step: null, finished_at: nowIso(), updated_at: nowIso() });
    await appendLog(jobId, "info", null, "Finished. The episode is waiting for editorial approval.");
    return done;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!(err instanceof StepHalt)) log.error("jobs", `job ${jobId} failed`, err);
    const j = await db.get("ai_production_jobs", jobId);
    if (j && j.status === "running") {
      await db.update("ai_production_jobs", jobId, { status: "failed", error: message, finished_at: nowIso(), updated_at: nowIso() });
      await appendLog(jobId, "error", j.current_step, message);
    }
    return db.get("ai_production_jobs", jobId);
  } finally {
    running.delete(jobId);
    if (process.env.CALM_JOBS_MANUAL !== "1") void tick();
  }
}

/* ------------------------------------------------------------------ controls */

async function adminJob(viewer: Viewer, jobId: string) {
  requireAdmin(viewer);
  const j = await getDb().get("ai_production_jobs", jobId);
  if (!j) throw new HttpError(404, "Job not found");
  return j;
}

export async function pauseJob(viewer: Viewer, jobId: string) {
  const j = await adminJob(viewer, jobId);
  if (j.status !== "queued" && j.status !== "running") throw new HttpError(409, `Can't pause a ${j.status} job.`);
  await appendLog(j.id, "info", null, `Pause requested by ${viewer.user?.display_name}.`);
  return getDb().update("ai_production_jobs", j.id, { status: "paused", updated_at: nowIso() });
}

export async function resumeJob(viewer: Viewer, jobId: string) {
  const j = await adminJob(viewer, jobId);
  if (j.status !== "paused") throw new HttpError(409, `Can't resume a ${j.status} job.`);
  // A step interrupted mid-run is re-run from its start.
  const steps = j.steps.map((s) => (s.status === "running" ? { ...s, status: "pending" as const } : s));
  const out = await getDb().update("ai_production_jobs", j.id, { status: "queued", steps, updated_at: nowIso() });
  await dispatch(j.id);
  return out;
}

export async function cancelJob(viewer: Viewer, jobId: string) {
  const j = await adminJob(viewer, jobId);
  if (!["queued", "running", "paused"].includes(j.status)) throw new HttpError(409, `Can't cancel a ${j.status} job.`);
  await appendLog(j.id, "info", null, `Cancelled by ${viewer.user?.display_name}.`);
  return getDb().update("ai_production_jobs", j.id, { status: "cancelled", finished_at: nowIso(), updated_at: nowIso() });
}

/** Retries a failed or cancelled job from the step that stopped it. */
export async function retryJob(viewer: Viewer, jobId: string) {
  const j = await adminJob(viewer, jobId);
  if (j.status !== "failed" && j.status !== "cancelled") throw new HttpError(409, `Only failed or cancelled jobs can be retried.`);
  const steps = j.steps.map((s) => (s.status === "succeeded" || s.status === "skipped" ? s : { ...s, status: "pending" as const, attempts: 0, error: null }));
  const out = await getDb().update("ai_production_jobs", j.id, { status: "queued", steps, error: null, finished_at: null, updated_at: nowIso() });
  await appendLog(j.id, "info", null, `Retry requested by ${viewer.user?.display_name}.`);
  await dispatch(j.id);
  return out;
}

/** Starts a fresh job with the same target (a new idempotency key). */
export async function rerunJob(viewer: Viewer, jobId: string) {
  const j = await adminJob(viewer, jobId);
  if (["queued", "running", "paused"].includes(j.status)) throw new HttpError(409, "This job is still active.");
  const ep = j.episode_id ? await getDb().get("episodes", j.episode_id) : null;
  const reuseEpisode = ep && !["in_review", "approved", "published"].includes(ep.status) ? ep.id : null;
  return enqueueProduction({
    seriesId: j.series_id as string,
    episodeId: reuseEpisode,
    workflowId: j.workflow_id,
    requestedBy: viewer.user!.id,
    budgetCents: j.budget_cents,
    idempotencyKey: `${j.idempotency_key ?? j.id}:rerun:${Date.now().toString(36)}`,
    payload: { release_at: j.payload.release_at },
  });
}

/* ------------------------------------------------------------------ workflows */

export type WorkflowInput = Partial<Omit<ProductionWorkflow, "id" | "series_id" | "approval_required" | "created_at" | "updated_at">>;

export async function upsertWorkflow(viewer: Viewer, seriesId: string, patch: WorkflowInput): Promise<ProductionWorkflow> {
  requireAdmin(viewer);
  const db = getDb();
  const series = await db.get("series", seriesId);
  if (!series) throw new HttpError(404, "Series not found");
  const prev = await db.findOne("production_workflows", { series_id: seriesId });
  const now = nowIso();
  const next: ProductionWorkflow = {
    id: prev?.id ?? `wf-${series.slug}`,
    series_id: seriesId,
    episodes_per_week: 2,
    target_duration_minutes: 30,
    writing_provider: "auto",
    writing_model: "claude-opus-5-5",
    narrator_voice_id: series.narrator_voice_id,
    soundscape_id: series.soundscape_id,
    release_days: [2, 5],
    release_hour_utc: 19,
    max_budget_cents: 2500,
    status: "paused",
    created_at: now,
    ...prev,
    ...patch,
    approval_required: true,
    updated_at: now,
  };
  next.episodes_per_week = Math.min(7, Math.max(1, next.episodes_per_week));
  next.release_days = [...new Set(next.release_days.filter((d) => d >= 0 && d <= 6))].sort();
  next.release_hour_utc = Math.min(23, Math.max(0, next.release_hour_utc));
  return db.upsert("production_workflows", next);
}

/**
 * For each active workflow, makes sure every release slot in the next week
 * has an episode in production. Idempotent per slot.
 */
export async function runWorkflows(now = new Date()): Promise<string[]> {
  const db = getDb();
  const enqueued: string[] = [];
  for (const wf of await db.list("production_workflows", { where: { status: "active" } })) {
    const series = await db.get("series", wf.series_id);
    if (!series) continue;
    const horizon = new Date(now.getTime() + 7 * 24 * 3600_000);
    let cursor = new Date(now.getTime() + 24 * 3600_000);
    let count = 0;
    while (count < wf.episodes_per_week) {
      const slot = await nextReleaseSlot(wf, cursor);
      if (!slot || new Date(slot) > horizon) break;
      cursor = new Date(slot);
      count++;
      const { job, created } = await enqueueProduction({
        seriesId: wf.series_id,
        workflowId: wf.id,
        requestedBy: series.creator_id,
        budgetCents: wf.max_budget_cents,
        idempotencyKey: `wf:${wf.id}:${slot}`,
        payload: { release_at: slot },
      });
      if (created) enqueued.push(job.id);
    }
  }
  return enqueued;
}

/* ------------------------------------------------------------------ dashboards */

export async function monthCosts(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const rows = (await getDb().list("production_costs")).filter((r) => new Date(r.created_at) >= start);
  const real = rows.filter((r) => !r.simulated);
  const by = (key: (r: (typeof rows)[number]) => string) => {
    const m = new Map<string, number>();
    for (const r of real) m.set(key(r), (m.get(key(r)) ?? 0) + r.cost_cents);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  return { totalCents: real.reduce((a, r) => a + r.cost_cents, 0), simulatedCalls: rows.length - real.length, calls: rows.length, byCategory: by((r) => r.category), byProvider: by((r) => `${r.provider} · ${r.model}`) };
}
