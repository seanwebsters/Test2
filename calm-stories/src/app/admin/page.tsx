import { isStaff } from "./staff";
import Link from "next/link";
import { getDb } from "@/lib/db";
import { SceneArt } from "@/components/art/SceneArt";
import { StatTile } from "@/components/admin/Charts";
import { AdminAction } from "@/components/admin/AdminAction";
import { formatDateTime } from "@/lib/util";

export default async function AdminOverview() {
  if (!(await isStaff())) return null;
  const db = getDb();
  const [series, episodes, reviews, reports, events, workflows, jobs] = await Promise.all([
    db.list("series", { orderBy: { column: "popularity", ascending: false } }),
    db.list("episodes"),
    db.list("editorial_reviews", { where: { status: "pending" } }),
    db.list("content_reports", { where: { status: "open" } }),
    db.list("listening_events"),
    db.list("production_workflows"),
    db.list("production_jobs", { where: { status: ["queued", "running"] } }),
  ]);
  const now = new Date();
  const scheduled = episodes.filter((e) => e.status === "approved" && e.release_at && new Date(e.release_at) > now);
  const hours = Math.round(events.reduce((n, e) => n + (e.kind === "play" ? 0 : e.listened_seconds), 0) / 360) / 10;
  const sample = events.some((e) => e.is_sample);
  return (
    <div className="space-y-10">
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Overview">
        <StatTile label="Live series" value={series.filter((s) => s.status === "published").length} />
        <StatTile label="Published episodes" value={episodes.filter((e) => e.status === "published").length} />
        <StatTile label="Awaiting review" value={reviews.length} hint={reviews.length ? "Open the review queue" : undefined} />
        <StatTile label="Scheduled releases" value={scheduled.length} />
        <StatTile label="In production" value={jobs.length} hint={`${workflows.filter((w) => w.status === "active").length} series on an agent schedule`} />
        <StatTile label="Open reports" value={reports.length} />
        <StatTile label="Listening hours" value={hours.toLocaleString()} sample={sample} />
      </section>

      <section aria-labelledby="cat-h">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="cat-h" className="headline text-3xl">Catalogue</h2>
            <p className="text-sm text-mist">Every series, its agent schedule and next release.</p>
          </div>
          <div className="flex gap-2">
            <AdminAction endpoint="/api/admin/scheduler" label="Run scheduler now" pendingLabel="Running…" />
            <Link href="/admin/episodes/new" className="btn-accent btn-sm">Add episode</Link>
          </div>
        </div>
        <div className="mt-5 overflow-x-auto rounded-3xl border border-white/10">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-wider text-mist">
              <tr><th className="px-4 py-3">Series</th><th className="px-4 py-3">Agents</th><th className="px-4 py-3">Episodes</th><th className="px-4 py-3">Next release</th><th className="px-4 py-3"><span className="sr-only">Actions</span></th></tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {series.map((s) => {
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
                    <td className="px-4 py-3 text-mist">
                      {(() => {
                        const wf = workflows.find((w) => w.series_id === s.id);
                        const busy = jobs.some((j) => j.series_id === s.id);
                        return busy ? <span className="text-lavender">Producing…</span> : wf?.status === "active" ? `${wf.episodes_per_week}/week` : "Off";
                      })()}
                    </td>
                    <td className="px-4 py-3 text-mist">{eps.filter((e) => e.status === "published").length} live · {eps.filter((e) => e.status === "in_review").length} in review</td>
                    <td className="px-4 py-3 text-mist">{next?.release_at ? formatDateTime(next.release_at) : "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/admin/series/${s.id}`} className="btn-ghost btn-sm">Production</Link>
                        <Link href={`/admin/episodes/new?series=${s.id}`} className="btn-ghost btn-sm">Upload</Link>
                        {s.status === "published" && <Link href={`/series/${s.slug}`} className="btn-ghost btn-sm">View</Link>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
