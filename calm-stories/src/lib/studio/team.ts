import "server-only";
import { getDb } from "@/lib/db";
import { AGENTS, AGENT_BY_KEY } from "./agents";
import type { AgentActivity, AgentKey, Deliverable, WorkflowStep } from "./types";

export interface AgentState {
  key: AgentKey;
  activity: AgentActivity;
  task: { label: string; run_id: string; run_title: string; step_key: string } | null;
  needs: string | null;
  last_output: string | null;
  next: { agent: AgentKey; label: string }[];
}

const HANDOFF_MS = 12_000;
const CELEBRATE_MS = 25_000;

/**
 * What each agent is doing right now, derived only from persisted workflow
 * state: running steps, approval gates, blocked steps and recent events.
 */
export async function getTeamState(now = new Date()): Promise<AgentState[]> {
  const db = getDb();
  const runs = await db.list("workflow_runs", { where: { status: ["running", "blocked", "awaiting_approval", "paused"] } });
  const runIds = runs.map((r) => r.id);
  const steps = runIds.length ? await db.list("workflow_steps", { where: { run_id: runIds } }) : [];
  const since = new Date(now.getTime() - CELEBRATE_MS).toISOString();
  const events = (await db.list("workflow_events", { orderBy: { column: "created_at", ascending: false }, limit: 200 })).filter((e) => e.created_at >= since);
  const lastDone = new Map<AgentKey, Deliverable>();
  for (const d of await db.list("deliverables", { orderBy: { column: "created_at", ascending: false }, limit: 300 })) if (!lastDone.has(d.agent)) lastDone.set(d.agent, d);
  const runTitle = (id: string) => runs.find((r) => r.id === id)?.title ?? "";

  return AGENTS.map((a) => {
    const mine = steps.filter((s) => s.agent === a.key);
    const running = mine.find((s) => s.status === "running");
    const waiting = mine.find((s) => s.status === "waiting");
    const gate = mine.find((s) => s.status === "awaiting_approval");
    const blocked = mine.find((s) => s.status === "blocked");
    const handoff = events.find((e) => e.kind === "handoff" && e.agent === a.key && now.getTime() - new Date(e.created_at).getTime() < HANDOFF_MS);
    const completed = events.find((e) => e.kind === "completed" && e.agent === a.key);
    let activity: AgentActivity = "sleeping";
    let current: WorkflowStep | undefined;
    if (blocked) {
      activity = "asking_for_help";
      current = blocked;
    } else if (gate) {
      activity = "asking_for_help";
      current = gate;
    } else if (running) {
      activity = running.activity;
      current = running;
    } else if (handoff) activity = "handing_off";
    else if (waiting) {
      activity = "thinking";
      current = waiting;
    } else if (completed) activity = "celebrating";
    const next = current
      ? steps.filter((s) => s.run_id === current!.run_id && s.status === "pending" && s.deps.includes(current!.key)).map((s) => ({ agent: s.agent, label: s.label }))
      : [];
    return {
      key: a.key,
      activity,
      task: current ? { label: current.label, run_id: current.run_id, run_title: runTitle(current.run_id), step_key: current.key } : null,
      needs: blocked?.needs ?? (gate ? "your decision" : null),
      last_output: lastDone.get(a.key)?.reasoning || lastDone.get(a.key)?.title || null,
      next,
    };
  });
}

/** Everything shown when you click an agent. */
export async function getAgentDetail(key: AgentKey) {
  const db = getDb();
  const def = AGENT_BY_KEY[key];
  const [state] = (await getTeamState()).filter((s) => s.key === key);
  const history = (await db.list("workflow_steps", { where: { agent: key }, orderBy: { column: "updated_at", ascending: false }, limit: 20 })).map((s) => ({
    run_id: s.run_id,
    key: s.key,
    label: s.label,
    status: s.status,
    summary: s.summary,
    error: s.error,
    cost_cents: s.cost_cents,
    at: s.finished_at ?? s.started_at ?? s.updated_at,
  }));
  const outputs = (await db.list("deliverables", { where: { agent: key }, orderBy: { column: "created_at", ascending: false }, limit: 10 })).map((d) => ({
    id: d.id,
    title: d.title,
    kind: d.kind,
    version: d.version,
    reasoning: d.reasoning,
    series_id: d.series_id,
    episode_id: d.episode_id,
    created_at: d.created_at,
  }));
  // Feedback: editorial deliverables written by others in the agent's latest run.
  const latestRun = history[0]?.run_id;
  const feedback = latestRun
    ? (await db.list("deliverables", { where: { run_id: latestRun, status: "current" } }))
        .filter((d) => d.agent !== key && ["review", "revision_brief", "qc_report", "bible_check", "image_review", "concept_critique"].includes(d.kind))
        .map((d) => ({ id: d.id, title: d.title, agent: d.agent, summary: d.reasoning }))
    : [];
  return { agent: { key: def.key, name: def.name, title: def.title, human: Boolean(def.human) }, state, history, outputs, feedback };
}
