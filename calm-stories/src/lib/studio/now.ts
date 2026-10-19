import "server-only";
import { getDb } from "@/lib/db";
import { AGENT_BY_KEY } from "./agents";
import type { WorkflowRun, WorkflowStep } from "./types";

export type Lane = "working" | "needs_you" | "stuck" | "queued" | "paused" | "done";

export interface BoardItem {
  runId: string;
  title: string;
  kind: WorkflowRun["kind"];
  lane: Lane;
  /** What is happening (or not) right now, in plain words. */
  headline: string;
  /** Who is on it, for "working". */
  agents: string[];
  /** Why it's stuck / what it's waiting for. */
  reason: string | null;
  progress: { done: number; total: number };
  costCents: number;
  budgetCents: number;
  updatedAt: string;
}

const DONE = ["succeeded", "skipped"];

/** Sort one workflow into exactly one lane, with a plain-English line about it. */
export function classifyRun(run: WorkflowRun, steps: WorkflowStep[]): BoardItem {
  const by = (st: string) => steps.filter((s) => s.status === st);
  const done = steps.filter((s) => DONE.includes(s.status)).length;
  const base = { runId: run.id, title: run.title, kind: run.kind, progress: { done, total: steps.length }, costCents: run.cost_cents, budgetCents: run.budget_cents, updatedAt: run.updated_at, agents: [] as string[], reason: null as string | null };
  const name = (s: WorkflowStep) => AGENT_BY_KEY[s.agent]?.name ?? s.agent;
  const running = by("running");
  const approval = by("awaiting_approval");
  const blocked = by("blocked");
  const failed = by("failed");
  const waiting = by("waiting");
  if (run.status === "succeeded" || run.status === "cancelled") return { ...base, lane: "done", headline: run.status === "succeeded" ? "Finished" : "Cancelled" };
  if (run.status === "paused") return { ...base, lane: "paused", headline: "Paused – press Resume to continue" };
  if (running.length) {
    return { ...base, lane: "working", headline: running.map((s) => `${name(s)}: ${s.label}`).join(" · "), agents: [...new Set(running.map(name))] };
  }
  if (approval.length) {
    const s = approval[0]!;
    return { ...base, lane: "needs_you", headline: s.type === "series.greenlight" ? "Ready for your greenlight" : s.type === "ep.approval" ? "Finished – ready for you to listen and approve" : s.label, reason: null };
  }
  if (blocked.length || failed.length) {
    const s = blocked[0] ?? failed[0]!;
    const why = s.needs === "budget" ? "Budget reached – raise the episode budget in Settings, then Resume" : s.needs?.includes("API_KEY") ? `Missing or rejected key: ${s.needs}` : s.error ?? s.needs ?? "Stopped";
    return { ...base, lane: "stuck", headline: `${name(s)}: ${s.label}`, reason: why };
  }
  if (waiting.length) {
    const s = waiting[0]!;
    return { ...base, lane: "stuck", headline: `${name(s)}: ${s.label} (retrying)`, reason: s.error ?? "Waiting to retry" };
  }
  const next = steps.find((s) => s.status === "pending");
  return { ...base, lane: "queued", headline: next ? `Next: ${name(next)} – ${next.label}` : "Waiting for a free slot", reason: "Waiting for a free slot (other work is running)" };
}

/** The whole studio as a board: every active workflow plus today's finished ones. */
export async function studioBoard(now = new Date()): Promise<Record<Lane, BoardItem[]>> {
  const db = getDb();
  const since = new Date(now.getTime() - 24 * 3600_000).toISOString();
  const runs = (await db.list("workflow_runs")).filter((r) => !["succeeded", "cancelled", "failed"].includes(r.status) || r.updated_at >= since);
  const board: Record<Lane, BoardItem[]> = { working: [], needs_you: [], stuck: [], queued: [], paused: [], done: [] };
  for (const run of runs) {
    const steps = await db.list("workflow_steps", { where: { run_id: run.id } });
    const item = run.status === "failed" ? { ...classifyRun({ ...run, status: "running" }, steps), lane: "stuck" as Lane } : classifyRun(run, steps);
    board[item.lane].push(item);
  }
  for (const lane of Object.keys(board) as Lane[]) board[lane].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  return board;
}
