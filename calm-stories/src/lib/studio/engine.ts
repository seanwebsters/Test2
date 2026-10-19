import "server-only";
import { getDb } from "@/lib/db";
import { log as syslog } from "@/lib/log";
import { newId, nowIso } from "@/lib/util";
import { AGENT_BY_KEY } from "./agents";
import { saveDeliverable } from "./bible";
import { BlockedError, BudgetError, RateLimitedError, StepFailure } from "./errors";
import { callClaude, type CallMeta, type ClaudeCall, type ClaudeResult } from "./llm";
import { getStudioSettings } from "./settings";
import type { AgentKey, Deliverable, WorkflowEvent, WorkflowRun, WorkflowStep } from "./types";

/**
 * Durable DAG workflow engine. Runs and steps are persisted rows; the
 * engine is stateless between ticks, so a restart (or a different worker)
 * picks up exactly where things stopped.
 *
 *  - dependencies: a step starts when every dep has succeeded or been skipped
 *  - parallelism: independent ready steps run concurrently (bounded)
 *  - retries: transient failures back off exponentially (max 3 attempts)
 *  - rate limits: the step waits for the provider's retry-after, attempts unchanged
 *  - blocked: missing credentials/budget park the step until someone resumes it
 *  - gates: human approval steps park the run as "awaiting approval"
 *  - dynamic graphs: a step may add steps (revision rounds, per-scene work)
 */

export interface NewStep {
  key: string;
  type: string;
  agent: AgentKey;
  label: string;
  activity: WorkflowStep["activity"];
  deps: string[];
  params?: Record<string, unknown>;
}

export interface StepResult {
  summary: string;
  addSteps?: NewStep[];
  awaitApproval?: boolean;
  skipped?: boolean;
}

export interface StepContext {
  run: WorkflowRun;
  step: WorkflowStep;
  meta: CallMeta;
  log: (message: string, level?: WorkflowEvent["level"]) => Promise<void>;
  claude: <T = string>(call: Omit<ClaudeCall<T>, "meta" | "agent"> & { agent?: AgentKey }) => Promise<ClaudeResult<T>>;
  addCost: (cents: number) => Promise<void>;
  ensureBudget: (estimateCents: number) => Promise<void>;
  deliver: (d: { kind: string; key: string; title: string; data: unknown; reasoning: string; model: string; agent?: AgentKey }) => Promise<Deliverable>;
  /** Steps of this run, by key. */
  stepByKey: (key: string) => Promise<WorkflowStep | null>;
}

export type StepHandler = (ctx: StepContext) => Promise<StepResult>;

const handlers = new Map<string, StepHandler>();
export function registerHandler(type: string, h: StepHandler) {
  handlers.set(type, h);
}

/** Called when a human resolves an approval gate. */
export type GateHook = (run: WorkflowRun, step: WorkflowStep, decision: { approved: boolean; userId: string; notes: string }) => Promise<NewStep[] | void>;
const gateHooks = new Map<string, GateHook>();
export function registerGateHook(type: string, h: GateHook) {
  gateHooks.set(type, h);
}

const MAX_ATTEMPTS = 3;
const TERMINAL: WorkflowStep["status"][] = ["succeeded", "failed", "skipped", "cancelled"];

/* ------------------------------------------------------------------ */
/* Events                                                              */
/* ------------------------------------------------------------------ */

export async function emit(e: Omit<WorkflowEvent, "id" | "created_at" | "to_agent" | "level"> & { to_agent?: AgentKey | null; level?: WorkflowEvent["level"] }) {
  await getDb().insert("workflow_events", { level: "info", to_agent: null, ...e, id: newId("evt"), created_at: nowIso() });
}

/* ------------------------------------------------------------------ */
/* Creating runs                                                       */
/* ------------------------------------------------------------------ */

export async function createRun(input: {
  kind: WorkflowRun["kind"];
  title: string;
  series_id?: string | null;
  project_id?: string | null;
  episode_id?: string | null;
  params?: Record<string, unknown>;
  steps: NewStep[];
  budget_cents: number;
  idempotency_key?: string | null;
  created_by?: string | null;
}): Promise<{ run: WorkflowRun; created: boolean }> {
  const db = getDb();
  if (input.idempotency_key) {
    const existing = await db.findOne("workflow_runs", { idempotency_key: input.idempotency_key });
    if (existing && existing.status !== "cancelled") return { run: existing, created: false };
  }
  const now = nowIso();
  const run = await db.insert("workflow_runs", {
    id: newId("run"),
    kind: input.kind,
    status: "running",
    series_id: input.series_id ?? null,
    project_id: input.project_id ?? null,
    episode_id: input.episode_id ?? null,
    title: input.title,
    params: input.params ?? {},
    cost_cents: 0,
    budget_cents: input.budget_cents,
    idempotency_key: input.idempotency_key ?? null,
    created_by: input.created_by ?? null,
    error: null,
    created_at: now,
    updated_at: now,
    finished_at: null,
  });
  await addSteps(run.id, input.steps);
  await emit({ run_id: run.id, step_key: null, agent: "network_executive", kind: "log", message: `Started: ${input.title}` });
  kick();
  return { run, created: true };
}

async function addSteps(runId: string, steps: NewStep[]) {
  const db = getDb();
  const existing = new Set((await db.list("workflow_steps", { where: { run_id: runId } })).map((s) => s.key));
  const now = nowIso();
  for (const s of steps) {
    if (existing.has(s.key)) throw new Error(`Duplicate step key ${s.key}`);
    existing.add(s.key);
    await db.insert("workflow_steps", {
      id: newId("stp"),
      run_id: runId,
      key: s.key,
      type: s.type,
      agent: s.agent,
      label: s.label,
      activity: s.activity,
      deps: s.deps,
      params: s.params ?? {},
      status: "pending",
      attempts: 0,
      not_before: null,
      started_at: null,
      finished_at: null,
      summary: null,
      error: null,
      needs: null,
      deliverable_ids: [],
      cost_cents: 0,
      created_at: now,
      updated_at: now,
    });
  }
}

/* ------------------------------------------------------------------ */
/* Ticking                                                             */
/* ------------------------------------------------------------------ */

const PROVIDER_NEEDS = /(_API_KEY|^FAL_KEY|^elevenlabs:|^casting$)/;
const PROVIDER_RETRY_MS = 5 * 60_000;

const g = globalThis as unknown as { __studioRunning?: Set<string>; __studioTimer?: NodeJS.Timeout | null; __studioLocks?: Map<string, Promise<unknown>> };
const running = (g.__studioRunning ??= new Set<string>());
const locks = (g.__studioLocks ??= new Map());

/** Serialise read-modify-write updates to one run row within this process. */
async function withRunLock<T>(runId: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(runId) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  locks.set(runId, next.catch(() => undefined));
  return next;
}

export function kick() {
  if (process.env.NODE_ENV === "test") return;
  if (g.__studioTimer) return;
  g.__studioTimer = setTimeout(() => {
    g.__studioTimer = null;
    void tick().catch((e) => syslog.error("studio", "tick failed", { error: String(e) }));
  }, 20);
}

/**
 * Start every ready step (within limits). Returns the promises of started
 * steps; pass `{ wait: true }` to await them (cron, tests).
 */
export async function tick(opts: { wait?: boolean; now?: Date } = {}): Promise<number> {
  const started = await startReadySteps(opts.now ?? new Date());
  if (opts.wait) await Promise.all(started);
  return started.length;
}

/**
 * Keep the studio moving until `deadline`: whenever any step finishes, start
 * whatever it unblocked straight away instead of waiting for the next tick.
 * Serverless cron uses this so one invocation advances many stages.
 * Returns the number of steps started.
 */
export async function runUntil(deadline: number): Promise<number> {
  const inflight = new Set<Promise<void>>();
  let total = 0;
  while (Date.now() < deadline) {
    const started = await startReadySteps(new Date());
    total += started.length;
    for (const p of started) {
      inflight.add(p);
      void p.catch(() => undefined).finally(() => inflight.delete(p));
    }
    if (!inflight.size) break;
    // Wake when a step finishes (or every 15 s, for rate-limit waits that come due).
    await Promise.race([...[...inflight].map((p) => p.catch(() => undefined)), new Promise((r) => setTimeout(r, 15_000))]);
  }
  await Promise.allSettled(inflight);
  return total;
}

async function startReadySteps(now: Date): Promise<Promise<void>[]> {
  const db = getDb();
  const settings = await getStudioSettings();
  const runs = await db.list("workflow_runs", { where: { status: ["running", "awaiting_approval", "blocked"] }, orderBy: { column: "created_at" } });
  const started: Promise<void>[] = [];
  let activeRuns = 0;
  for (const run of runs) {
    const steps = await db.list("workflow_steps", { where: { run_id: run.id } });
    // Recover steps orphaned by a restart.
    for (const s of steps) {
      if (s.status === "running" && !running.has(s.id) && s.started_at && now.getTime() - new Date(s.started_at).getTime() > 20 * 60_000) {
        await db.update("workflow_steps", s.id, { status: "pending", updated_at: nowIso() });
        s.status = "pending";
      }
      // Steps blocked on a provider (missing key, missing permission, no voice yet) retry by
      // themselves every few minutes, so fixing the key in the host is enough – no Resume needed.
      // Budget blocks still wait for a human.
      if (s.status === "blocked" && s.needs && PROVIDER_NEEDS.test(s.needs) && now.getTime() - new Date(s.updated_at).getTime() > PROVIDER_RETRY_MS) {
        await db.update("workflow_steps", s.id, { status: "pending", updated_at: nowIso() });
        s.status = "pending";
      }
    }
    await refreshRunStatus(run.id);
    const fresh = (await db.get("workflow_runs", run.id))!;
    if (fresh.status !== "running") continue;
    const inFlight = steps.filter((s) => s.status === "running").length;
    if (inFlight > 0 || steps.some((s) => s.status === "pending" || s.status === "waiting")) activeRuns++;
    if (activeRuns > settings.max_concurrent_runs && inFlight === 0) continue;
    const done = new Set(steps.filter((s) => s.status === "succeeded" || s.status === "skipped").map((s) => s.key));
    let slots = settings.max_parallel_steps - inFlight;
    for (const s of steps) {
      if (slots <= 0) break;
      if (!(s.status === "pending" || s.status === "waiting")) continue;
      if (s.not_before && new Date(s.not_before) > now) continue;
      if (!s.deps.every((d) => done.has(d))) continue;
      if (running.has(s.id)) continue;
      slots--;
      started.push(executeStep(fresh, s));
    }
  }
  return started;
}

/** Run ticks until nothing is ready (tests and cron). */
export async function drain(opts: { maxTicks?: number; now?: Date } = {}) {
  for (let i = 0; i < (opts.maxTicks ?? 200); i++) {
    const n = await tick({ wait: true, now: opts.now });
    if (n === 0) return;
  }
}

async function patchRun(runId: string, patch: Partial<WorkflowRun>) {
  return withRunLock(runId, () => getDb().update("workflow_runs", runId, { ...patch, updated_at: nowIso() }));
}

async function executeStep(run: WorkflowRun, step: WorkflowStep) {
  const db = getDb();
  running.add(step.id);
  const meta: CallMeta = { runId: run.id, stepId: step.key, seriesId: run.series_id };
  let stepCost = step.cost_cents;
  const addCost = async (cents: number) => {
    if (!cents) return;
    stepCost = Math.round((stepCost + cents) * 100) / 100;
    await db.update("workflow_steps", step.id, { cost_cents: stepCost, updated_at: nowIso() });
    await withRunLock(run.id, async () => {
      const cur = (await db.get("workflow_runs", run.id))!;
      await db.update("workflow_runs", run.id, { cost_cents: Math.round((cur.cost_cents + cents) * 100) / 100, updated_at: nowIso() });
    });
  };
  const ensureBudget = async (estimate: number) => {
    const cur = (await db.get("workflow_runs", run.id))!;
    if (cur.cost_cents + estimate > cur.budget_cents) {
      throw new BudgetError(`Run budget reached ($${(cur.cost_cents / 100).toFixed(2)} of $${(cur.budget_cents / 100).toFixed(2)}). Raise the budget and resume.`);
    }
  };
  const deliverableIds: string[] = [...step.deliverable_ids];
  const ctx: StepContext = {
    run,
    step,
    meta,
    log: (message, level = "info") => emit({ run_id: run.id, step_key: step.key, agent: step.agent, kind: "log", level, message }),
    claude: async (call) => {
      await ensureBudget(5);
      const res = await callClaude({ ...call, agent: call.agent ?? step.agent, meta });
      await addCost(res.cost_cents);
      return res;
    },
    addCost,
    ensureBudget,
    deliver: async (d) => {
      const dl = await saveDeliverable({ ...d, agent: d.agent ?? step.agent, run_id: run.id, step_id: step.key, series_id: run.series_id, episode_id: run.episode_id });
      deliverableIds.push(dl.id);
      await db.update("workflow_steps", step.id, { deliverable_ids: deliverableIds, updated_at: nowIso() });
      return dl;
    },
    stepByKey: (key) => db.findOne("workflow_steps", { run_id: run.id, key }),
  };
  try {
    await db.update("workflow_steps", step.id, { status: "running", attempts: step.attempts + 1, started_at: nowIso(), error: null, needs: null, updated_at: nowIso() });
    const handler = handlers.get(step.type);
    if (!handler) throw new StepFailure(`No handler registered for step type “${step.type}”.`);
    const res = await handler(ctx);
    if (res.addSteps?.length) await addSteps(run.id, res.addSteps);
    if (res.awaitApproval) {
      await db.update("workflow_steps", step.id, { status: "awaiting_approval", summary: res.summary, updated_at: nowIso() });
      await emit({ run_id: run.id, step_key: step.key, agent: step.agent, to_agent: "network_executive", kind: "approval", message: res.summary });
    } else {
      await db.update("workflow_steps", step.id, { status: res.skipped ? "skipped" : "succeeded", summary: res.summary, finished_at: nowIso(), updated_at: nowIso() });
      await emit({ run_id: run.id, step_key: step.key, agent: step.agent, kind: "completed", message: res.summary });
      await announceHandoffs(run.id, step);
    }
  } catch (err) {
    await handleFailure(run, step, err);
  } finally {
    running.delete(step.id);
    await refreshRunStatus(run.id);
    kick();
  }
}

/** Record "passing a letter" handoffs to agents whose steps this one unblocked. */
async function announceHandoffs(runId: string, step: WorkflowStep) {
  const db = getDb();
  const steps = await db.list("workflow_steps", { where: { run_id: runId } });
  const done = new Set(steps.filter((s) => s.status === "succeeded" || s.status === "skipped").map((s) => s.key));
  const receivers = steps.filter((s) => s.status === "pending" && s.deps.includes(step.key) && s.deps.every((d) => done.has(d)));
  for (const r of receivers) {
    if (r.agent === step.agent) continue;
    await emit({ run_id: runId, step_key: r.key, agent: step.agent, to_agent: r.agent, kind: "handoff", message: `${AGENT_BY_KEY[step.agent].name} → ${AGENT_BY_KEY[r.agent].name}: ${r.label}` });
  }
}

async function handleFailure(run: WorkflowRun, step: WorkflowStep, err: unknown) {
  const db = getDb();
  const message = err instanceof Error ? err.message : String(err);
  const attempts = step.attempts + 1;
  if (err instanceof BlockedError) {
    await db.update("workflow_steps", step.id, { status: "blocked", needs: err.needs, error: message, updated_at: nowIso() });
    await emit({ run_id: run.id, step_key: step.key, agent: step.agent, to_agent: "network_executive", kind: "blocked", level: "warn", message });
    return;
  }
  if (err instanceof RateLimitedError) {
    await db.update("workflow_steps", step.id, { status: "waiting", attempts: step.attempts, not_before: new Date(Date.now() + err.retryAfterMs).toISOString(), error: message, updated_at: nowIso() });
    await emit({ run_id: run.id, step_key: step.key, agent: step.agent, kind: "log", level: "warn", message });
    return;
  }
  const retryable = !(err instanceof StepFailure) || err.retryable;
  if (retryable && attempts < MAX_ATTEMPTS) {
    const backoff = process.env.NODE_ENV === "test" ? 0 : Math.min(120_000, 2000 * 4 ** (attempts - 1));
    await db.update("workflow_steps", step.id, { status: "waiting", not_before: new Date(Date.now() + backoff).toISOString(), error: message, updated_at: nowIso() });
    await emit({ run_id: run.id, step_key: step.key, agent: step.agent, kind: "log", level: "warn", message: `Retrying ${step.label}: ${message}` });
    return;
  }
  syslog.error("studio", "step failed", { run: run.id, step: step.key, error: message });
  await db.update("workflow_steps", step.id, { status: "failed", error: message, finished_at: nowIso(), updated_at: nowIso() });
  await emit({ run_id: run.id, step_key: step.key, agent: step.agent, kind: "log", level: "error", message: `${step.label} failed: ${message}` });
}

/** Derive the run status from its steps. */
export async function refreshRunStatus(runId: string) {
  const db = getDb();
  const run = await db.get("workflow_runs", runId);
  if (!run || ["paused", "cancelled", "succeeded", "failed"].includes(run.status)) return run;
  const steps = await db.list("workflow_steps", { where: { run_id: runId } });
  let status: WorkflowRun["status"] = "running";
  let error: string | null = null;
  const failed = steps.find((s) => s.status === "failed");
  if (failed) {
    status = "failed";
    error = `${failed.label}: ${failed.error}`;
  } else if (steps.length && steps.every((s) => TERMINAL.includes(s.status))) status = "succeeded";
  else if (!steps.some((s) => s.status === "running" || s.status === "pending" || s.status === "waiting")) {
    if (steps.some((s) => s.status === "awaiting_approval")) status = "awaiting_approval";
    else if (steps.some((s) => s.status === "blocked")) status = "blocked";
  } else if (steps.some((s) => s.status === "blocked") && !steps.some((s) => s.status === "running")) {
    // Blocked work, and nothing else can move until it is unblocked.
    const done = new Set(steps.filter((s) => s.status === "succeeded" || s.status === "skipped").map((s) => s.key));
    const movable = steps.some((s) => (s.status === "pending" || s.status === "waiting") && s.deps.every((d) => done.has(d)));
    if (!movable) status = "blocked";
  }
  if (status !== run.status || error !== run.error) {
    return patchRun(runId, { status, error, finished_at: status === "succeeded" || status === "failed" ? nowIso() : null });
  }
  return run;
}

/* ------------------------------------------------------------------ */
/* Controls                                                            */
/* ------------------------------------------------------------------ */

export async function pauseRun(runId: string) {
  await patchRun(runId, { status: "paused" });
  await emit({ run_id: runId, step_key: null, agent: "network_executive", kind: "log", message: "Paused. Steps already running will finish." });
}

/** Resume a paused or blocked run; blocked steps are retried (e.g. after a key was connected or the budget raised). */
export async function resumeRun(runId: string, opts: { budget_cents?: number } = {}) {
  const db = getDb();
  const steps = await db.list("workflow_steps", { where: { run_id: runId } });
  for (const s of steps.filter((x) => x.status === "blocked")) await db.update("workflow_steps", s.id, { status: "pending", needs: null, error: null, updated_at: nowIso() });
  // Plain Resume lifts the cap to the current Settings budget if that's higher, so raising it once in Settings is enough.
  const run = await db.get("workflow_runs", runId);
  const settings = await getStudioSettings();
  const settingsBudget = run?.kind === "episode_production" ? settings.default_episode_budget_cents : settings.default_series_budget_cents;
  const budget = opts.budget_cents ?? (run && settingsBudget > run.budget_cents ? settingsBudget : undefined);
  await patchRun(runId, { status: "running", error: null, ...(budget ? { budget_cents: budget } : {}) });
  await emit({ run_id: runId, step_key: null, agent: "network_executive", kind: "log", message: budget ? `Resumed with a $${(budget / 100).toFixed(2)} budget.` : "Resumed." });
  kick();
}

export async function cancelRun(runId: string) {
  const db = getDb();
  for (const s of await db.list("workflow_steps", { where: { run_id: runId } })) {
    if (!TERMINAL.includes(s.status) && s.status !== "running") await db.update("workflow_steps", s.id, { status: "cancelled", updated_at: nowIso() });
  }
  await patchRun(runId, { status: "cancelled", finished_at: nowIso() });
  await emit({ run_id: runId, step_key: null, agent: "network_executive", kind: "log", level: "warn", message: "Cancelled." });
}

/** Retry a failed step (and un-fail the run). */
export async function retryStep(runId: string, stepKey: string) {
  const db = getDb();
  const s = await db.findOne("workflow_steps", { run_id: runId, key: stepKey });
  if (!s || !["failed", "blocked", "cancelled"].includes(s.status)) throw new StepFailure("Only failed, blocked or cancelled steps can be retried.");
  await db.update("workflow_steps", s.id, { status: "pending", attempts: 0, error: null, needs: null, not_before: null, updated_at: nowIso() });
  for (const c of await db.list("workflow_steps", { where: { run_id: runId, status: "cancelled" } })) await db.update("workflow_steps", c.id, { status: "pending", updated_at: nowIso() });
  await patchRun(runId, { status: "running", error: null, finished_at: null });
  kick();
}

/** Human decision on an approval gate. */
export async function resolveGate(runId: string, stepKey: string, decision: { approved: boolean; userId: string; notes: string }) {
  const db = getDb();
  const run = await db.get("workflow_runs", runId);
  const step = await db.findOne("workflow_steps", { run_id: runId, key: stepKey });
  if (!run || !step) throw new StepFailure("Not found.");
  if (step.status !== "awaiting_approval") throw new StepFailure("This step isn't waiting for a decision.");
  const hook = gateHooks.get(step.type);
  const extra = hook ? await hook(run, step, decision) : undefined;
  if (decision.approved) {
    await db.update("workflow_steps", step.id, { status: "succeeded", summary: `Approved${decision.notes ? `: ${decision.notes}` : ""}`, finished_at: nowIso(), updated_at: nowIso() });
    if (extra?.length) await addSteps(runId, extra);
  } else {
    await db.update("workflow_steps", step.id, { status: "succeeded", summary: `Rejected${decision.notes ? `: ${decision.notes}` : ""}`, finished_at: nowIso(), updated_at: nowIso() });
    // Rejection ends the run unless the hook queued revision work.
    if (extra?.length) await addSteps(runId, extra);
    else {
      for (const s of await db.list("workflow_steps", { where: { run_id: runId } })) {
        if (!TERMINAL.includes(s.status)) await db.update("workflow_steps", s.id, { status: "cancelled", updated_at: nowIso() });
      }
    }
  }
  await emit({ run_id: runId, step_key: stepKey, agent: "network_executive", kind: "approval", message: `${decision.approved ? "Approved" : "Rejected"}: ${step.label}${decision.notes ? ` – ${decision.notes}` : ""}` });
  await patchRun(runId, { status: "running" });
  await refreshRunStatus(runId);
  kick();
}
