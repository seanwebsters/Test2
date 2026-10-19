import "server-only";
import { getDb } from "@/lib/db";
import { nowIso } from "@/lib/util";
import { freeUpSpace } from "@/lib/services/disk";
import { kick, resumeRun, retryStep } from "./engine";
import { getStudioSettings } from "./settings";
import type { WorkflowRun, WorkflowStep } from "./types";

export type FixKind = "raise_budget" | "free_space" | "retry";

export interface Diagnosis {
  /** Short, plain title, e.g. "Out of budget". */
  title: string;
  /** One or two sentences anyone can follow. */
  explain: string;
  /** What the Quick fix button does. */
  fix: FixKind;
  fixLabel: string;
  /** Something only you can do first (e.g. change a key in Railway). */
  youFirst: string | null;
}

/** Turn a stuck step's technical error into a simple reason and the right fix. */
export function diagnose(step: Pick<WorkflowStep, "status" | "needs" | "error" | "label">): Diagnosis {
  const e = `${step.needs ?? ""} ${step.error ?? ""}`;
  if (step.needs === "budget" || /budget reached/i.test(e))
    return { title: "Out of budget", explain: "This episode used up its spending cap before finishing, so it paused instead of overspending.", fix: "raise_budget", fixLabel: "Raise budget & continue", youFirst: null };
  if (/ENOSPC|no space left/i.test(e))
    return { title: "Disk full", explain: "The studio's storage (your Railway volume) is full, so it couldn't save the file.", fix: "free_space", fixLabel: "Free up space & retry", youFirst: "If it keeps happening, make the volume bigger in Railway." };
  if (/quota|credits|insufficient|payment/i.test(e))
    return { title: "Out of credits", explain: `The provider says your account has run out of credits (${/eleven/i.test(e) ? "ElevenLabs" : /fal/i.test(e) ? "fal" : /anthropic|claude/i.test(e) ? "Anthropic" : "provider"}).`, fix: "retry", fixLabel: "Retry now", youFirst: "Top up or upgrade that account first." };
  const perm = e.match(/missing (?:the )?permission[s]? ([a-z_]+)/i);
  if (perm)
    return { title: "Key missing a permission", explain: `Your ElevenLabs key isn't allowed to use "${perm[1]!.replace(/_/g, " ")}".`, fix: "retry", fixLabel: "Retry now", youFirst: "In ElevenLabs → API Keys, switch that permission on (or create a key with full access) and paste it into Railway → Variables." };
  if (/voices/i.test(e) && /ELEVENLABS/i.test(e))
    return { title: "Can't see your voices", explain: "ElevenLabs refused to list your voices, so no narrator could be chosen.", fix: "retry", fixLabel: "Retry now", youFirst: "Give the ElevenLabs key the Voices permission and add Theo Silk Slow to My Voices." };
  const key = e.match(/(ANTHROPIC|ELEVENLABS|FAL|GEMINI)_?(API_)?KEY/i);
  if (key)
    return { title: "Key missing or wrong", explain: `The ${key[1]!.toLowerCase().replace(/^./, (c) => c.toUpperCase())} key is missing or was rejected.`, fix: "retry", fixLabel: "Retry now", youFirst: `Check ${key[0]!.toUpperCase()} in Railway → Variables.` };
  if (/narrator/i.test(e)) return { title: "No narrator", explain: "No narrator voice has been chosen for this series yet.", fix: "retry", fixLabel: "Retry now", youFirst: "Add Theo Silk Slow to My Voices in ElevenLabs." };
  if (/ran out of room/i.test(e)) return { title: "Answer cut off", explain: "The AI's answer was too long and got cut off.", fix: "retry", fixLabel: "Try again", youFirst: null };
  if (/429|rate/i.test(e)) return { title: "Provider busy", explain: "The provider asked us to slow down; it will retry by itself.", fix: "retry", fixLabel: "Retry now", youFirst: null };
  if (/5\d\d|timed out|ECONN|fetch failed|overloaded/i.test(e)) return { title: "Provider hiccup", explain: "The provider had a temporary problem.", fix: "retry", fixLabel: "Try again", youFirst: null };
  return { title: step.status === "waiting" ? "Retrying" : "Something went wrong", explain: (step.error ?? "It stopped without a clear reason.").slice(0, 200), fix: "retry", fixLabel: "Try again", youFirst: null };
}

/** The first stuck step of a workflow (blocked, failed or waiting to retry), if any. */
export function stuckStep(steps: WorkflowStep[]): WorkflowStep | null {
  return steps.find((s) => s.status === "blocked") ?? steps.find((s) => s.status === "failed") ?? steps.find((s) => s.status === "waiting" && s.error) ?? null;
}

/** Apply the right fix for whatever is stopping a workflow, and get it moving again. */
export async function quickFix(runId: string): Promise<{ did: string }> {
  const db = getDb();
  const run = (await db.get("workflow_runs", runId)) as WorkflowRun | null;
  if (!run) throw new Error("Workflow not found.");
  const steps = await db.list("workflow_steps", { where: { run_id: runId } });
  const stuck = stuckStep(steps);
  const d = stuck ? diagnose(stuck) : null;
  let did = "Restarted it.";
  if (d?.fix === "free_space") {
    const r = await freeUpSpace();
    did = `Freed ${(r.freedBytes / 1e6).toFixed(0)} MB and retried.`;
  }
  if (d?.fix === "raise_budget") {
    const settings = await getStudioSettings();
    const cap = run.kind === "episode_production" ? settings.default_episode_budget_cents : settings.default_series_budget_cents;
    const budget = Math.max(cap, Math.ceil(run.cost_cents + 150), Math.ceil(run.budget_cents * 1.5));
    await resumeRun(runId, { budget_cents: budget });
    return { did: `Raised the budget to $${(budget / 100).toFixed(2)} and continued.` };
  }
  // Retry: unblock everything, re-queue failed steps and bring waiting retries forward.
  if (run.status === "paused" || steps.some((s) => s.status === "blocked")) await resumeRun(runId);
  for (const s of steps.filter((x) => x.status === "failed")) await retryStep(runId, s.key);
  for (const s of steps.filter((x) => x.status === "waiting")) await db.update("workflow_steps", s.id, { not_before: null, updated_at: nowIso() });
  kick();
  return { did };
}
