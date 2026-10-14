import Link from "next/link";
import { getDb } from "@/lib/db";
import { platformListeningHours } from "@/lib/services/analytics";
import { SceneArt } from "@/components/art/SceneArt";
import { StatTile } from "@/components/studio/Charts";
import { AdminAction, AutoRefresh } from "@/components/admin/AdminAction";
import { formatCents, formatDateTime } from "@/lib/util";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function AdminOverview() {
  const db = getDb();
  const [series, episodes, jobs, reviews, costs, workflows, listening] = await Promise.all([
    db.list("series"),
    db.list("episodes"),
    db.list("ai_production_jobs", { orderBy: { column: "created_at", ascending: false } }),
    db.list("editorial_reviews", { where: { status: "pending" } }),
    db.list("production_costs"),
    db.list("production_workflows"),
    platformListeningHours(),
  ]);
  const now = new Date();
  const active = jobs.filter((j) => ["queued", "running"].includes(j.status));
  const failed = jobs.filter((j) => j.status === "failed");
  const scheduled = episodes.filter((e) => e.status === "approved" && e.release_at && new Date(e.release_at) > now);
  const realCost = costs.filter((c) => !c.simulated).reduce((n, c) => n + c.cost_cents, 0);
  const simulatedCost = costs.filter((c) => c.simulated).length;
  const official = series.filter((s) => s.is_official && s.status !== "removed");
  return (
    <div className="space-y-10">
      <AutoRefresh active={active.length > 0} intervalMs={3000} />
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Production overview">
        <StatTile label="Active series" value={series.filter((s) => s.status === "published").length} hint={`${workflows.filter((w) => w.status === "active").length} with automated production`} />
        <StatTile label="In production" value={active.length} hint="queued or running jobs" />
        <StatTile label="Completed episodes" value={episodes.filter((e) => e.status === "published").length} />
        <StatTile label="Awaiting review" value={reviews.length} />
        <StatTile label="Scheduled releases" value={scheduled.length} />
        <StatTile label="Failed jobs" value={failed.length} />
        <StatTile label="Production costs" value={formatCents(realCost)} hint={`billed providers · ${simulatedCost} simulated operations at $0`} />
        <StatTile label="Listening hours" value={listening.hours.toLocaleString()} sample={listening.includes_sample_data} />
      </section>

      <section aria-labelledby="sm-h">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="sm-h" className="headline text-3xl">Series management</h2>
            <p className="text-sm text-mist">Calm Originals and their automated production workflows.</p>
          </div>
          <div className="flex gap-2">
            <AdminAction endpoint="/api/admin/scheduler" label="Run scheduler now" pendingLabel="Scheduling…" />
            <Link href="/create" className="btn-accent btn-sm">New franchise in Storymaker</Link>
          </div>
        </div>
        <div className="mt-5 overflow-x-auto rounded-3xl border border-white/10">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-wider text-mist">
              <tr><th className="px-4 py-3">Series</th><th className="px-4 py-3">Episodes</th><th className="px-4 py-3">Workflow</th><th className="px-4 py-3">Schedule</th><th className="px-4 py-3">Next release</th><th className="px-4 py-3"><span className="sr-only">Actions</span></th></tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {official.map((s) => {
                const wf = workflows.find((w) => w.series_id === s.id);
                const eps = episodes.filter((e) => e.series_id === s.id);
                const next = eps.filter((e) => e.status === "approved" && e.release_at && new Date(e.release_at) > now).sort((a, b) => (a.release_at! < b.release_at! ? -1 : 1))[0];
                return (
                  <tr key={s.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="h-12 w-9 overflow-hidden rounded-lg"><SceneArt spec={s.artwork} className="h-full w-full" /></span>
                        <div><div className="font-medium">{s.title}</div><div className="text-xs text-mist">{s.genre} · {s.status}</div></div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-mist">{eps.filter((e) => e.status === "published").length} live · {eps.filter((e) => e.status === "in_review").length} in review</td>
                    <td className="px-4 py-3">{wf ? <span className={wf.status === "active" ? "text-emerald-200" : "text-mist"}>{wf.status}</span> : <span className="text-mist">none</span>}</td>
                    <td className="px-4 py-3 text-mist">{wf ? `${wf.episodes_per_week}/week · ${wf.release_days.map((d) => DAYS[d]).join(", ")} ${String(wf.release_hour_utc).padStart(2, "0")}:00 UTC` : "—"}</td>
                    <td className="px-4 py-3 text-mist">{next?.release_at ? formatDateTime(next.release_at) : "—"}</td>
                    <td className="px-4 py-3 text-right"><Link href={`/admin/series/${s.id}`} className="btn-ghost btn-sm">Configure</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="jobs-h">
        <div className="flex items-center justify-between">
          <h2 id="jobs-h" className="headline text-3xl">Recent production jobs</h2>
          <Link href="/admin/agents" className="text-sm text-lavender hover:underline">Agent control →</Link>
        </div>
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {jobs.slice(0, 6).map((j) => {
            const s = series.find((x) => x.id === j.series_id);
            const done = j.steps.filter((x) => x.status === "succeeded").length;
            return (
              <li key={j.id} className="card p-4 text-sm">
                <div className="flex justify-between gap-2"><span className="font-medium">{s?.title ?? "—"} · {j.kind.replace("_", " ")}</span><span className="text-xs text-mist">{j.status}</span></div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-lavender" style={{ width: `${(done / Math.max(1, j.steps.length)) * 100}%` }} /></div>
                <div className="mt-1 text-xs text-mist">{done}/{j.steps.length} steps · {formatCents(j.cost_cents)}{j.simulated ? " · simulated" : ""}{j.error ? ` · ${j.error}` : ""}</div>
              </li>
            );
          })}
          {jobs.length === 0 && <li className="text-sm text-mist">No jobs yet. Configure a series workflow and start production.</li>}
        </ul>
      </section>
    </div>
  );
}
