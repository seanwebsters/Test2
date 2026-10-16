import Link from "next/link";
import { getDb } from "@/lib/db";
import { getTeamState } from "@/lib/studio/team";
import { providerStatus } from "@/lib/studio/providers";
import { AGENT_BY_KEY } from "@/lib/studio/agents";
import { TeamRoom } from "@/components/studio/TeamRoom";
import { AdminAction } from "@/components/admin/AdminAction";
import { cx, formatCents, relativeTime } from "@/lib/util";
import { isStaff } from "@/app/admin/staff";

export const metadata = { title: "Studio Overview" };

export default async function StudioOverview() {
  if (!(await isStaff())) return null;
  const db = getDb();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const [projects, runs, usage, events, reviews, team] = await Promise.all([
    db.list("series_projects", { orderBy: { column: "created_at", ascending: false } }),
    db.list("workflow_runs", { orderBy: { column: "updated_at", ascending: false }, limit: 30 }),
    db.list("usage_records"),
    db.list("workflow_events", { orderBy: { column: "created_at", ascending: false }, limit: 14 }),
    db.list("editorial_reviews", { where: { status: "pending" } }),
    getTeamState(),
  ]);
  const active = runs.filter((r) => ["running", "blocked", "awaiting_approval", "paused"].includes(r.status));
  const steps = active.length ? await db.list("workflow_steps", { where: { run_id: active.map((r) => r.id) } }) : [];
  const monthCost = usage.filter((u) => u.created_at >= monthStart).reduce((n, u) => n + u.cost_cents, 0);
  const greenlit = projects.filter((p) => p.status === "greenlit").length;
  const approvals = projects.filter((p) => p.status === "awaiting_greenlight").length + reviews.length;
  const providers = providerStatus();
  const missing = providers.filter((p) => !p.connected);
  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.35em] text-lavender">Network Executive</p>
          <h1 className="font-serif text-5xl text-white">Studio Overview</h1>
        </div>
        <div className="ml-auto flex gap-2">
          <AdminAction endpoint="/api/admin/scheduler" label="Run heartbeat" pendingLabel="Running…" className="btn-ghost btn-sm" />
          <Link href="/studio/series/new" className="btn-primary btn-sm">+ New series</Link>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-5" aria-label="Studio at a glance">
        {[
          ["Greenlit series", greenlit, `${projects.filter((p) => p.status === "developing").length} in development`],
          ["Episodes in production", active.filter((r) => r.kind === "episode_production").length, `${steps.filter((s) => s.status === "running").length} steps running now`],
          ["Waiting for you", approvals, approvals ? "Open approvals" : "All clear"],
          ["Spend this month", formatCents(monthCost), `${usage.filter((u) => u.created_at >= monthStart).length} provider calls`],
          ["Active workflows", active.length, `${active.filter((r) => r.status === "blocked").length} blocked`],
        ].map(([label, value, hint]) => (
          <div key={String(label)} className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-xs uppercase tracking-wider text-mist">{label}</div>
            <div className="mt-1 font-serif text-4xl text-white">{value}</div>
            <div className="text-xs text-mist">{hint}</div>
          </div>
        ))}
      </section>

      {missing.length > 0 && (
        <section className="rounded-3xl border border-amber-300/30 bg-amber-300/[0.05] p-5">
          <h2 className="font-serif text-2xl text-white">Connect your providers</h2>
          <p className="text-sm text-mist">Agents that need these will stop and raise a hand until they are connected. Add keys as server environment variables, restart, then press Resume on any blocked workflow.</p>
          <ul className="mt-3 grid gap-2 md:grid-cols-2">
            {missing.map((p) => (
              <li key={p.key} className="rounded-2xl bg-black/20 p-3 text-sm">
                <code className="text-amber-200">{p.key}</code> <span className="text-white">· {p.name}</span>
                <div className="text-xs text-mist">{p.role}</div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-serif text-3xl text-white">The team right now</h2>
          <Link href="/studio/team" className="text-sm text-lavender">Open the AI Team room →</Link>
        </div>
        <TeamRoom initial={team} compact />
      </section>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section>
          <h2 className="font-serif text-3xl text-white">In production</h2>
          <ul className="mt-4 space-y-3">
            {active.map((r) => {
              const rs = steps.filter((s) => s.run_id === r.id);
              const done = rs.filter((s) => s.status === "succeeded" || s.status === "skipped").length;
              const now = rs.filter((s) => s.status === "running").map((s) => `${AGENT_BY_KEY[s.agent].name}: ${s.label}`);
              const blocked = rs.find((s) => s.status === "blocked");
              return (
                <li key={r.id} className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <Link href={`/studio/pipeline?run=${r.id}`} className="min-w-0 flex-1">
                      <div className="font-serif text-xl text-white">{r.title}</div>
                      <div className="text-xs text-mist">{done}/{rs.length} steps · {formatCents(r.cost_cents)} of {formatCents(r.budget_cents)} · updated {relativeTime(r.updated_at)}</div>
                    </Link>
                    <span className={cx("rounded-full px-2.5 py-1 text-xs", r.status === "running" ? "bg-lavender/15 text-lavender" : r.status === "awaiting_approval" ? "bg-amber-300/15 text-amber-200" : r.status === "blocked" ? "bg-amber-300/15 text-amber-200" : "bg-white/5 text-mist")}>{r.status.replace("_", " ")}</span>
                    {r.status === "blocked" && <AdminAction endpoint={`/api/studio/runs/${r.id}`} body={{ action: "resume" }} label="Resume" className="btn-ghost btn-sm" />}
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-gradient-to-r from-periwinkle to-lavender" style={{ width: `${rs.length ? (done / rs.length) * 100 : 0}%` }} /></div>
                  {now.length > 0 && <p className="mt-2 text-xs text-white/80">Now: {now.join(" · ")}</p>}
                  {blocked && <p className="mt-2 text-xs text-amber-200">Blocked: {blocked.error}</p>}
                </li>
              );
            })}
            {!active.length && <li className="text-sm text-mist">Nothing in production. <Link className="text-lavender" href="/studio/series/new">Brief the team on a new series.</Link></li>}
          </ul>
        </section>
        <section>
          <h2 className="font-serif text-3xl text-white">Studio activity</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {events.map((e) => (
              <li key={e.id} className="rounded-2xl bg-white/[0.03] px-3 py-2">
                <div className="flex justify-between gap-2 text-xs text-mist">
                  <span>{e.agent ? AGENT_BY_KEY[e.agent].name : "Studio"}{e.to_agent ? ` → ${AGENT_BY_KEY[e.to_agent].name}` : ""}</span>
                  <span>{relativeTime(e.created_at)}</span>
                </div>
                <p className={cx("line-clamp-2", e.level === "error" ? "text-rose-300" : e.level === "warn" ? "text-amber-200" : "text-white/90")}>{e.message}</p>
              </li>
            ))}
            {!events.length && <li className="text-mist">No activity yet.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
