import Link from "next/link";
import { getDb } from "@/lib/db";
import { AGENT_BY_KEY } from "@/lib/studio/agents";
import { pipelineStages } from "@/lib/studio/pipeline-view";
import type { WorkflowStep } from "@/lib/studio/types";
import { PipelineStrip } from "@/components/studio/PipelineStrip";
import { RunControls } from "@/components/studio/RunControls";
import { AutoRefresh } from "@/components/admin/AdminAction";
import { cx, formatCents, relativeTime } from "@/lib/util";
import { isStaff } from "@/app/admin/staff";

export const metadata = { title: "Production Pipeline" };

const STATUS: Record<string, string> = {
  succeeded: "border-emerald-300/40",
  running: "border-lavender shadow-glow",
  waiting: "border-lavender/50",
  pending: "border-white/10 opacity-70",
  blocked: "border-amber-300/60",
  awaiting_approval: "border-amber-300/60",
  failed: "border-rose-400/60",
  skipped: "border-white/10 opacity-60",
  cancelled: "border-white/10 opacity-40",
};

function levels(steps: WorkflowStep[]): WorkflowStep[][] {
  const byKey = new Map(steps.map((s) => [s.key, s]));
  const memo = new Map<string, number>();
  const level = (s: WorkflowStep): number => {
    if (memo.has(s.key)) return memo.get(s.key)!;
    const l = s.deps.length ? 1 + Math.max(...s.deps.map((d) => (byKey.get(d) ? level(byKey.get(d)!) : 0))) : 0;
    memo.set(s.key, l);
    return l;
  };
  const cols: WorkflowStep[][] = [];
  for (const s of [...steps].sort((a, b) => (a.created_at < b.created_at ? -1 : 1))) (cols[level(s)] ??= []).push(s);
  return cols.filter(Boolean);
}

export default async function PipelinePage({ searchParams }: { searchParams: Promise<{ run?: string }> }) {
  if (!(await isStaff())) return null;
  const { run: sel } = await searchParams;
  const db = getDb();
  const runs = await db.list("workflow_runs", { orderBy: { column: "created_at", ascending: false }, limit: 40 });
  const run = runs.find((r) => r.id === sel) ?? runs.find((r) => ["running", "blocked", "awaiting_approval"].includes(r.status)) ?? runs[0];
  const steps = run ? await db.list("workflow_steps", { where: { run_id: run.id } }) : [];
  const events = run ? await db.list("workflow_events", { where: { run_id: run.id }, orderBy: { column: "created_at", ascending: false }, limit: 80 }) : [];
  return (
    <div className="grid gap-8 xl:grid-cols-[300px_minmax(0,1fr)]">
      <AutoRefresh active={run?.status === "running"} intervalMs={3000} />
      <aside>
        <h1 className="font-serif text-4xl text-white">Pipeline</h1>
        <ul className="mt-4 space-y-1.5">
          {runs.map((r) => (
            <li key={r.id}>
              <Link href={`?run=${r.id}`} className={cx("block rounded-2xl px-3 py-2 text-sm", r.id === run?.id ? "bg-white/10 text-white" : "text-mist hover:bg-white/5")}>
                <div className="truncate">{r.title}</div>
                <div className="text-[11px] text-mist">{r.status.replace("_", " ")} · {formatCents(r.cost_cents)} · {relativeTime(r.created_at)}</div>
              </Link>
            </li>
          ))}
          {!runs.length && <li className="text-sm text-mist">No workflows yet.</li>}
        </ul>
      </aside>
      {run ? (
        <div className="min-w-0 space-y-8">
          <header className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="font-serif text-3xl text-white">{run.title}</h2>
              <p className="text-sm text-mist">{run.status.replace("_", " ")} · {steps.filter((s) => s.status === "succeeded").length}/{steps.length} steps · {formatCents(run.cost_cents)} of {formatCents(run.budget_cents)} budget{run.error ? ` · ${run.error}` : ""}</p>
            </div>
            <RunControls run={run} steps={steps} />
          </header>
          <PipelineStrip stages={pipelineStages(run.kind, steps, run.status)} />
          <section>
            <h3 className="label">Step graph</h3>
            <div className="flex gap-4 overflow-x-auto pb-4">
              {levels(steps).map((col, i) => (
                <ol key={i} className="w-60 shrink-0 space-y-3">
                  {col.map((s) => {
                    const a = AGENT_BY_KEY[s.agent];
                    return (
                      <li key={s.id} className={cx("rounded-2xl border bg-[#0d1230] p-3 text-xs", STATUS[s.status])}>
                        <div className="flex items-center gap-2">
                          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px]" style={{ background: a.bedroom.blanket, color: a.bedroom.accent }}>{a.name.charAt(0)}</span>
                          <span className="truncate text-[13px] text-white">{s.label}</span>
                        </div>
                        <div className="mt-1 text-mist">{a.person} ({a.name}) · {s.status.replace("_", " ")}{s.attempts > 1 ? ` · ${s.attempts} tries` : ""}{s.cost_cents ? ` · ${formatCents(s.cost_cents)}` : ""}</div>
                        {s.summary && <p className="mt-1 line-clamp-3 text-white/80">{s.summary}</p>}
                        {s.error && <p className={cx("mt-1 line-clamp-3", s.status === "blocked" || s.status === "waiting" ? "text-amber-200" : "text-rose-300")}>{s.error}</p>}
                        {s.deliverable_ids.length > 0 && <p className="mt-1 text-lavender">{s.deliverable_ids.length} deliverable(s)</p>}
                      </li>
                    );
                  })}
                </ol>
              ))}
            </div>
          </section>
          <section>
            <h3 className="label">Handoffs and log</h3>
            <ol className="space-y-1.5 text-sm">
              {events.map((e) => (
                <li key={e.id} className="flex gap-3 rounded-xl px-2 py-1.5 hover:bg-white/[0.03]">
                  <span className="w-16 shrink-0 text-xs text-mist">{e.created_at.slice(11, 19)}</span>
                  <span className={cx("w-20 shrink-0 text-xs", e.kind === "handoff" ? "text-lavender" : e.kind === "approval" || e.kind === "blocked" ? "text-amber-200" : e.kind === "completed" ? "text-emerald-200" : "text-mist")}>{e.kind}</span>
                  <span className={cx("min-w-0", e.level === "error" ? "text-rose-300" : e.level === "warn" ? "text-amber-200" : "text-white/85")}>{e.agent && e.kind !== "handoff" ? <span className="text-mist">{AGENT_BY_KEY[e.agent].name}: </span> : null}{e.message}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      ) : (
        <p className="text-mist">Nothing has run yet.</p>
      )}
    </div>
  );
}
