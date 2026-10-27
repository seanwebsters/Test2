import "server-only";
import { repo } from "./store";
import { newId, nowIso } from "./ids";
import { describeError } from "./ai/client";
import * as agents from "./agents";
import type { ArtOutput, DesignOutput, IdeationOutput, LabConcept, ReviewOutput } from "./agents/schemas";
import { compileGame } from "./engine/compile";
import type { GameBuild, GameConfig } from "./engine/schemas";
import { validateConfig } from "./engine/validate";
import { runQA } from "./qa/run";
import { sanitizeSvg } from "./svg";
import { defaultSettings } from "./settings";
import { playStats } from "./insights";
import type { AgentId, Asset, Game, GameVersion, GenerateInput, Job, JobStep, LabInput, QAReport, RefineInput, Settings } from "./types";

const PIPELINE: AgentId[] = ["ideation", "design", "art", "development", "qa", "insights"];
const COST_CAP = () => Number(process.env.JOB_COST_CAP_USD || 3);

const g = globalThis as unknown as { __calmRunning?: Set<string> };
const running = (g.__calmRunning ??= new Set());
export const isRunningHere = (id: string) => running.has(id);

const steps = (ids: AgentId[]): JobStep[] => ids.map((agent) => ({ agent, status: "waiting", attempts: 0 }));

async function settings(): Promise<Settings> {
  return (await (await repo()).getSettings()) ?? defaultSettings();
}

// ── Job creation ───────────────────────────────────────────────────────

export async function startGeneration(input: GenerateInput): Promise<{ job: Job; game: Game }> {
  const store = await repo();
  const now = nowIso();
  const game: Game = {
    id: newId("game"),
    name: input.fromConcept?.name ?? "Untitled game",
    description: input.fromConcept?.description ?? input.prompt,
    category: input.category ?? input.fromConcept?.category ?? "Puzzle",
    prompt: input.prompt,
    status: "generating",
    origin: "ai",
    currentVersion: 0,
    latestVersion: 0,
    createdAt: now,
    updatedAt: now,
  };
  const job: Job = { id: newId("job"), kind: "generate", status: "queued", gameId: game.id, input, steps: steps(PIPELINE), costUsd: 0, createdAt: now, updatedAt: now };
  game.activeJobId = job.id;
  await store.putGame(game);
  await store.putJob(job);
  void runJob(job.id);
  return { job, game };
}

export async function startRefinement(gameId: string, instruction: string, baseVersion?: number): Promise<Job> {
  const store = await repo();
  const game = await store.getGame(gameId);
  if (!game) throw new Error("Game not found");
  if (game.activeJobId) {
    const active = await store.getJob(game.activeJobId);
    if (active && (active.status === "running" || active.status === "queued")) throw new Error("This game is already being worked on. Wait for the current run to finish.");
  }
  const base = baseVersion ?? game.currentVersion;
  if (!(await store.getVersion(gameId, base))?.build) throw new Error("There is no playable version to refine yet.");
  const now = nowIso();
  const input: RefineInput = { instruction, baseVersion: base };
  const job: Job = { id: newId("job"), kind: "refine", status: "queued", gameId, input, steps: steps(PIPELINE), costUsd: 0, createdAt: now, updatedAt: now };
  await store.putJob(job);
  await store.putGame({ ...game, activeJobId: job.id, updatedAt: now });
  void runJob(job.id);
  return job;
}

export async function startLab(input: LabInput): Promise<Job> {
  const store = await repo();
  const now = nowIso();
  const job: Job = { id: newId("job"), kind: "lab", status: "queued", input, steps: steps(["ideation", "design"]), costUsd: 0, createdAt: now, updatedAt: now };
  await store.putJob(job);
  void runJob(job.id);
  return job;
}

/** Continue a failed or interrupted job from its first unfinished step. */
export async function resumeJob(id: string): Promise<Job> {
  const store = await repo();
  const job = await store.getJob(id);
  if (!job) throw new Error("Job not found");
  if (running.has(id)) return job;
  if (job.status === "complete") return job;
  job.steps = job.steps.map((s) => (s.status === "failed" || s.status === "working" ? { ...s, status: "waiting", error: undefined, activity: undefined } : s));
  job.status = "queued";
  job.error = undefined;
  job.updatedAt = nowIso();
  await store.putJob(job);
  if (job.gameId) {
    const game = await store.getGame(job.gameId);
    if (game) await store.putGame({ ...game, activeJobId: job.id, status: game.latestVersion ? game.status : "generating", updatedAt: nowIso() });
  }
  void runJob(id);
  return job;
}

/** A job marked running that no live process owns was cut off by a restart. */
export async function reconcile(job: Job): Promise<Job> {
  if ((job.status === "running" || job.status === "queued") && !running.has(job.id) && Date.now() - Date.parse(job.updatedAt) > 45_000) {
    job.status = "interrupted";
    job.error = "The server stopped while this job was running. Resume to continue from the last finished agent.";
    job.steps = job.steps.map((s) => (s.status === "working" ? { ...s, status: "failed", error: "Interrupted" } : s));
    await (await repo()).putJob(job);
  }
  return job;
}

// ── Execution ──────────────────────────────────────────────────────────

interface Carry {
  ideation?: IdeationOutput;
  design?: DesignOutput;
  art?: ArtOutput;
  build?: GameBuild;
  qa?: QAReport;
  screenshot?: Buffer;
  review?: ReviewOutput;
  refine?: agents.RefineContext;
}

async function runJob(id: string) {
  if (running.has(id)) return;
  running.add(id);
  const store = await repo();
  let job = (await store.getJob(id))!;
  const save = async () => {
    job.updatedAt = nowIso();
    await store.putJob(job);
  };
  try {
    job.status = "running";
    await save();
    const cfg = await settings();
    const carry: Carry = {};
    // Rebuild context from steps that already finished (resume).
    for (const s of job.steps) if (s.status === "complete" || s.status === "skipped") Object.assign(carry, restore(s));
    if (job.kind === "refine") carry.refine = await refineContext(job);

    for (const step of job.steps) {
      if (step.status === "complete" || step.status === "skipped") continue;
      if (job.costUsd > COST_CAP()) throw new Error(`This job reached its cost cap of $${COST_CAP().toFixed(2)} (JOB_COST_CAP_USD).`);
      step.status = "working";
      step.startedAt = nowIso();
      step.attempts += 1;
      step.activity = "Starting";
      await save();
      const ctx: agents.AgentContext = {
        settings: cfg,
        jobId: job.id,
        onActivity: async (text) => {
          step.activity = text;
          await save();
        },
      };
      try {
        const { output, cost, status } = await runStep(job, step.agent, ctx, carry);
        step.output = output;
        step.costUsd = (step.costUsd ?? 0) + cost;
        job.costUsd += cost;
        step.status = status ?? "complete";
        step.activity = undefined;
        step.finishedAt = nowIso();
        if (status === "failed") step.error = (output as { summary?: string }).summary;
        await save();
      } catch (e) {
        step.status = "failed";
        step.error = describeError(e);
        step.activity = undefined;
        step.finishedAt = nowIso();
        const usage = (await store.listUsage()).filter((u) => u.jobId === job.id);
        job.costUsd = usage.reduce((a, u) => a + u.costUsd, 0);
        throw e;
      }
    }
    await finish(job, carry);
    job.status = "complete";
    await save();
  } catch (e) {
    job.status = "failed";
    job.error = describeError(e);
    await save();
    if (job.gameId) {
      const game = await store.getGame(job.gameId);
      if (game) await store.putGame({ ...game, status: game.latestVersion ? game.status : "failed", activeJobId: undefined, updatedAt: nowIso() });
    }
  } finally {
    running.delete(id);
  }
}

function restore(s: JobStep): Partial<Carry> {
  const o = s.output as Record<string, unknown> | undefined;
  if (!o) return {};
  switch (s.agent) {
    case "ideation":
      return { ideation: o as unknown as IdeationOutput };
    case "design":
      return { design: o as unknown as DesignOutput };
    case "art":
      return { art: o as unknown as ArtOutput };
    case "development":
      return { build: o.build as GameBuild };
    case "qa":
      return { qa: o.qa as QAReport, build: o.build as GameBuild };
    case "insights":
      return { review: o as unknown as ReviewOutput };
    default:
      return {};
  }
}

async function refineContext(job: Job): Promise<agents.RefineContext> {
  const store = await repo();
  const input = job.input as RefineInput;
  const base = (await store.getVersion(job.gameId!, input.baseVersion))!;
  return {
    instruction: input.instruction,
    previous: {
      ...base.specs,
      config: base.build?.mode === "template" ? base.build.config : undefined,
      freeform: base.build?.mode === "freeform" ? { title: base.build.title, engine: base.build.engine, html: base.build.html, controls: "" } : undefined,
    },
  };
}

type StepResult = { output: unknown; cost: number; status?: "complete" | "failed" | "skipped" };

async function runStep(job: Job, agent: AgentId, ctx: agents.AgentContext, carry: Carry): Promise<StepResult> {
  if (job.kind === "lab") return runLabStep(job, agent, ctx);
  const input = job.input as GenerateInput & RefineInput;
  switch (agent) {
    case "ideation": {
      const r = await agents.ideate(ctx, { prompt: job.kind === "refine" ? `Refine the existing game: ${input.instruction}` : input.prompt, category: input.category, archetype: input.archetype, concept: input.fromConcept }, carry.refine);
      carry.ideation = r.data;
      return { output: r.data, cost: r.costUsd };
    }
    case "design": {
      const r = await agents.design(ctx, carry.ideation!, carry.refine);
      carry.design = r.data;
      return { output: r.data, cost: r.costUsd };
    }
    case "art": {
      const r = await agents.artDirect(ctx, carry.ideation!, carry.design!, carry.refine);
      r.data.assets = r.data.assets.map((a) => ({ ...a, svg: sanitizeSvg(a.svg) ?? "" })).filter((a) => a.svg);
      carry.art = r.data;
      return { output: r.data, cost: r.costUsd };
    }
    case "development": {
      const specs = { ideation: carry.ideation!, design: carry.design!, art: carry.art! };
      if (specs.ideation.archetype === "freeform") {
        const r = await agents.developFreeform(ctx, specs, carry.refine);
        carry.build = { mode: "freeform", title: r.data.title, engine: r.data.engine, html: r.data.html };
        return { output: { build: carry.build, controls: r.data.controls }, cost: r.costUsd };
      }
      const r = await agents.develop(ctx, specs, carry.refine);
      carry.build = { mode: "template", config: r.data };
      return { output: { build: carry.build }, cost: r.costUsd };
    }
    case "qa":
      return runQAStep(job, ctx, carry);
    case "insights": {
      const prior = job.kind === "refine" ? await playStats(job.gameId!, input.baseVersion) : undefined;
      const r = await agents.review(ctx, { ideation: carry.ideation, design: carry.design, config: carry.build?.mode === "template" ? carry.build.config : undefined, freeform: carry.build?.mode === "freeform", qa: carry.qa, stats: prior });
      carry.review = r.data;
      return { output: r.data, cost: r.costUsd };
    }
  }
}

const emblemOf = (carry: Carry) => carry.art?.assets[0]?.svg;

/** QA engineer: test in a real browser and send failures back to Development, up to the repair limit. */
async function runQAStep(job: Job, ctx: agents.AgentContext, carry: Carry): Promise<StepResult> {
  let build = carry.build!;
  let cost = 0;
  if (!ctx.settings.qaEnabled) {
    carry.qa = { ranAt: nowIso(), passed: false, ran: false, attempts: 0, checks: [{ id: "disabled", label: "Automated QA", status: "skipped", detail: "QA is turned off in Settings. This build has not been tested." }], consoleErrors: [], durationMs: 0 };
    return { output: { qa: carry.qa, build }, cost: 0, status: "skipped" };
  }
  const maxRepairs = ctx.settings.maxRepairs;
  for (let attempt = 1; ; attempt++) {
    await ctx.onActivity(`Testing in headless Chromium${attempt > 1 ? ` · after repair ${attempt - 1}` : ""}`);
    const warnings = build.mode === "template" ? validateConfig(build.config).warnings : [];
    const { report, screenshot } = await runQA(compileGame(build, { emblemSvg: emblemOf(carry) }), { mode: build.mode, warnings, attempt });
    carry.qa = report;
    if (screenshot) carry.screenshot = screenshot;
    carry.build = build;
    const failing = report.checks.filter((c) => c.status === "fail");
    if (report.passed || !report.ran || attempt > maxRepairs) {
      const summary = report.passed
        ? `All checks passed${attempt > 1 ? ` after ${attempt - 1} repair${attempt > 2 ? "s" : ""}` : ""}.`
        : !report.ran
          ? "QA could not run, so this build is untested."
          : `${failing.length} check(s) still failing after ${maxRepairs} repair attempt(s).`;
      return { output: { qa: report, build, repairs: attempt - 1, summary }, cost, status: report.passed ? "complete" : "failed" };
    }
    await ctx.onActivity(`${failing.length} check(s) failed · requesting repair ${attempt} of ${maxRepairs} from Development`);
    if (build.mode === "template") {
      const r = await agents.repair(ctx, build.config, report, { design: carry.design });
      cost += r.costUsd;
      build = { mode: "template", config: r.data };
    } else {
      const failures = failing.map((c) => `- ${c.label}: ${c.detail}`).join("\n");
      const r = await agents.developFreeform(ctx, { ideation: carry.ideation!, design: carry.design!, art: carry.art! }, carry.refine, failures);
      cost += r.costUsd;
      build = { mode: "freeform", title: r.data.title, engine: r.data.engine, html: r.data.html };
    }
  }
}

async function runLabStep(job: Job, agent: AgentId, ctx: agents.AgentContext): Promise<StepResult> {
  const input = job.input as LabInput;
  if (agent === "ideation") {
    const r = await agents.labIdeas(ctx, input.brief, input.count);
    return { output: r.data, cost: r.costUsd };
  }
  const ideas = (job.steps[0].output as { concepts: LabConcept[] }).concepts;
  const r = await agents.labAssess(ctx, ideas);
  return { output: r.data, cost: r.costUsd };
}

/** Persist the result: a new version (generate/refine) or a concept batch (lab). */
async function finish(job: Job, carry: Carry) {
  const store = await repo();
  if (job.kind === "lab") {
    const ideas = (job.steps[0].output as { concepts: LabConcept[] }).concepts;
    const { assessments } = job.steps[1].output as { assessments: (Partial<LabConcept> & { name: string })[] };
    const concepts: LabConcept[] = ideas.map((c) => ({ ...c, ...(assessments.find((a) => a.name === c.name) ?? {}), name: c.name }));
    await store.putConceptBatch({ id: newId("lab"), jobId: job.id, brief: (job.input as LabInput).brief, concepts, createdAt: nowIso() });
    return;
  }
  const game = (await store.getGame(job.gameId!))!;
  const number = game.latestVersion + 1;
  const assetIds: string[] = [];
  // The first Art Director motif is the emblem, so order is preserved.
  for (const a of carry.art?.assets ?? []) {
    const asset: Asset = { id: newId("asset"), name: a.name, kind: "svg", mime: "image/svg+xml", data: a.svg, source: "art-director", approved: false, gameId: game.id, createdAt: nowIso() };
    await store.putAsset(asset);
    assetIds.push(asset.id);
  }
  const version: GameVersion = {
    gameId: game.id,
    number,
    saved: false,
    instruction: job.kind === "refine" ? (job.input as RefineInput).instruction : undefined,
    jobId: job.id,
    createdAt: nowIso(),
    build: carry.build,
    specs: { ideation: carry.ideation, design: carry.design, art: carry.art },
    assetIds,
    qa: carry.qa,
    review: carry.review,
  };
  await store.putVersion(version);
  if (carry.screenshot) await store.putThumbnail(game.id, carry.screenshot);
  const title = carry.build?.mode === "template" ? carry.build.config.title : carry.build?.title;
  await store.putGame({
    ...game,
    name: job.kind === "generate" ? (title ?? carry.ideation?.title ?? game.name) : game.name,
    description: job.kind === "generate" ? (carry.ideation?.logline ?? game.description) : game.description,
    status: "ready",
    currentVersion: number,
    latestVersion: number,
    hasThumbnail: game.hasThumbnail || !!carry.screenshot,
    activeJobId: undefined,
    updatedAt: nowIso(),
  });
}

/** Run QA on demand for an existing version (e.g. the hand-authored seeds). */
export async function testVersion(gameId: string, n: number): Promise<QAReport> {
  const store = await repo();
  const version = await store.getVersion(gameId, n);
  if (!version?.build) throw new Error("This version has no playable build.");
  const emblem = (await store.listAssets()).find((a) => a.id === version.assetIds[0])?.data;
  const warnings = version.build.mode === "template" ? validateConfig(version.build.config).warnings : [];
  const { report, screenshot } = await runQA(compileGame(version.build, { emblemSvg: emblem }), { mode: version.build.mode, warnings });
  await store.putVersion({ ...version, qa: report });
  if (screenshot) {
    await store.putThumbnail(gameId, screenshot);
    const game = await store.getGame(gameId);
    if (game) await store.putGame({ ...game, hasThumbnail: true });
  }
  return report;
}

export type { GameConfig };
