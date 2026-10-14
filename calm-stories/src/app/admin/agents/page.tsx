import { getDb } from "@/lib/db";
import { AdminAction, AutoRefresh } from "@/components/admin/AdminAction";
import { formatCents, relativeTime } from "@/lib/util";
import { AgentCard } from "./AgentCard";

export const metadata = { title: "Agent control" };

export default async function AgentsPage() {
  const db = getDb();
  const [agents, jobs, series] = await Promise.all([
    db.list("agent_configurations"),
    db.list("ai_production_jobs", { orderBy: { column: "created_at", ascending: false }, limit: 40 }),
    db.list("series"),
  ]);
  const active = jobs.filter((j) => ["queued", "running"].includes(j.status));
  const title = (id: string | null) => series.find((s) => s.id === id)?.title ?? "—";
  return (
    <div className="space-y-10">
      <AutoRefresh active={active.length > 0} intervalMs={2000} />
      <section aria-labelledby="agents-h">
        <h2 id="agents-h" className="headline text-3xl">Specialist agents</h2>
        <p className="text-sm text-mist">All agents share one structured series database. None can publish – the Publishing agent only submits to editorial review.</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {agents.map((a) => {
            const steps = jobs.flatMap((j) => j.steps.filter((s) => s.agent === a.agent).map((s) => ({ s, j })));
            const current = steps.filter(({ s }) => s.status === "running");
            const lastOk = steps.filter(({ s }) => s.status === "succeeded").sort((x, y) => ((x.s.finished_at ?? "") < (y.s.finished_at ?? "") ? 1 : -1))[0];
            const errors = steps.filter(({ s }) => s.status === "failed" || s.error);
            const costed = steps.filter(({ s }) => s.status === "succeeded");
            const avgCost = costed.length ? costed.reduce((n, { s }) => n + s.cost_cents, 0) / costed.length : 0;
            return (
              <AgentCard
                key={a.id}
                agent={a}
                stats={{
                  current: current.map(({ s, j }) => `${title(j.series_id)}: ${s.label}`),
                  last_success: lastOk?.s.finished_at ?? null,
                  last_preview: lastOk?.s.output_preview ?? null,
                  errors: errors.slice(0, 3).map(({ s }) => s.error ?? "error"),
                  avg_cost: avgCost,
                  runs: costed.length,
                }}
              />
            );
          })}
        </div>
      </section>

      <section aria-labelledby="jobs-h">
        <h2 id="jobs-h" className="headline text-3xl">Production jobs</h2>
        <ul className="mt-4 space-y-3">
          {jobs.map((j) => {
            const done = j.steps.filter((s) => s.status === "succeeded").length;
            return (
              <li key={j.id} className="card p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{title(j.series_id)} <span className="text-mist">· {j.kind.replace("_", " ")}</span></div>
                    <div className="text-xs text-mist">
                      {j.id.slice(0, 16)} · {relativeTime(j.created_at)} · {formatCents(j.cost_cents)}{j.budget_cents !== null ? ` of ${formatCents(j.budget_cents)} budget` : ""} · attempt {j.attempts}{j.simulated ? " · simulated providers" : ""}
                    </div>
                  </div>
                  <span className={j.status === "failed" ? "text-rose-300" : j.status === "succeeded" ? "text-emerald-200" : j.status === "running" ? "text-lavender" : "text-mist"}>{j.status}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {["queued", "running"].includes(j.status) && <AdminAction endpoint={`/api/admin/jobs/${j.id}`} body={{ action: "pause" }} label="Pause" />}
                    {j.status === "paused" && <AdminAction endpoint={`/api/admin/jobs/${j.id}`} body={{ action: "resume" }} label="Resume" />}
                    {!["succeeded", "failed", "cancelled"].includes(j.status) && <AdminAction endpoint={`/api/admin/jobs/${j.id}`} body={{ action: "cancel" }} label="Cancel" confirmText="Cancel this job?" />}
                    {["failed", "cancelled"].includes(j.status) && <AdminAction endpoint={`/api/admin/jobs/${j.id}`} body={{ action: "rerun" }} label="Retry failed step" />}
                    {["failed", "cancelled", "succeeded"].includes(j.status) && <AdminAction endpoint={`/api/admin/jobs/${j.id}`} body={{ action: "restart" }} label="Rerun all" confirmText="Run every step again?" />}
                  </div>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-gradient-to-r from-periwinkle to-lavender" style={{ width: `${(done / Math.max(1, j.steps.length)) * 100}%` }} /></div>
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs text-mist">Steps & logs</summary>
                  <ol className="mt-2 grid gap-1.5 text-xs md:grid-cols-2">
                    {j.steps.map((s) => (
                      <li key={s.id} className="rounded-xl bg-white/[0.03] px-3 py-2">
                        <div className="flex justify-between gap-2">
                          <span>{s.status === "succeeded" ? "✓" : s.status === "running" ? "…" : s.status === "failed" ? "✗" : "○"} {s.label} <span className="text-mist">({s.agent.replace("_", " ")})</span></span>
                          <span className="text-mist">{s.attempts > 1 ? `${s.attempts} tries · ` : ""}{formatCents(s.cost_cents)}</span>
                        </div>
                        {s.output_preview && <p className="mt-1 line-clamp-3 text-mist">{s.output_preview}</p>}
                        {s.error && <p className="mt-1 text-rose-300">{s.error}</p>}
                      </li>
                    ))}
                  </ol>
                  <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap rounded-xl bg-night/70 p-3 text-[11px] text-mist">{j.logs.map((l) => `${l.at.slice(11, 19)} ${l.level.toUpperCase().padEnd(5)} ${l.step ? `[${l.step}] ` : ""}${l.message}`).join("\n")}</pre>
                </details>
              </li>
            );
          })}
          {jobs.length === 0 && <li className="text-sm text-mist">No jobs yet.</li>}
        </ul>
      </section>
    </div>
  );
}
