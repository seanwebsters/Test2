import { AdminAction } from "@/components/admin/AdminAction";
import type { WorkflowRun, WorkflowStep } from "@/lib/studio/types";

/** Pause / resume / cancel / retry for a workflow run. */
export function RunControls({ run, steps }: { run: WorkflowRun; steps: WorkflowStep[] }) {
  const failed = steps.filter((s) => s.status === "failed");
  return (
    <div className="flex flex-wrap gap-2">
      {run.status === "running" && <AdminAction endpoint={`/api/studio/runs/${run.id}`} body={{ action: "pause" }} label="Pause" className="btn-ghost btn-sm" />}
      {(run.status === "paused" || run.status === "blocked") && <AdminAction endpoint={`/api/studio/runs/${run.id}`} body={{ action: "resume" }} label="Resume" className="btn-primary btn-sm" />}
      {run.status === "blocked" && steps.some((s) => s.needs === "budget") && (
        <AdminAction endpoint={`/api/studio/runs/${run.id}`} body={{ action: "resume", budget_cents: run.budget_cents * 2 }} label={`Double budget & resume`} className="btn-ghost btn-sm" />
      )}
      {failed.map((s) => (
        <AdminAction key={s.key} endpoint={`/api/studio/runs/${run.id}`} body={{ action: "retry_step", step_key: s.key }} label={`Retry “${s.label}”`} className="btn-ghost btn-sm" />
      ))}
      {!["succeeded", "failed", "cancelled"].includes(run.status) && <AdminAction endpoint={`/api/studio/runs/${run.id}`} body={{ action: "cancel" }} label="Cancel" confirmText="Cancel this workflow?" className="btn-ghost btn-sm" />}
    </div>
  );
}
