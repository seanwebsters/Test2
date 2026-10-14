import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { creatorMetrics } from "@/lib/services/analytics";
import { SceneArt } from "@/components/art/SceneArt";
import { StatTile } from "@/components/studio/Charts";
import { AdminAction, AutoRefresh } from "@/components/admin/AdminAction";
import { formatCents, formatDateTime, relativeTime } from "@/lib/util";
import { WorkflowForm } from "./WorkflowForm";

export default async function AdminSeriesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const series = await db.get("series", id);
  if (!series) notFound();
  const [wf, voices, soundscapes, jobs, metrics, bible, episodes] = await Promise.all([
    db.findOne("production_workflows", { series_id: id }),
    db.list("voice_profiles", { where: { approved: true } }),
    db.list("soundscapes"),
    db.list("ai_production_jobs", { where: { series_id: id }, orderBy: { column: "created_at", ascending: false }, limit: 8 }),
    creatorMetrics([id]),
    db.findOne("story_bibles", { series_id: id }),
    db.list("episodes", { where: { series_id: id } }),
  ]);
  const active = jobs.some((j) => ["queued", "running"].includes(j.status));
  return (
    <div className="space-y-8">
      <AutoRefresh active={active} intervalMs={2500} />
      <div className="flex flex-wrap items-center gap-5">
        <span className="h-32 w-24 overflow-hidden rounded-3xl ring-1 ring-white/10"><SceneArt spec={series.artwork} className="h-full w-full" /></span>
        <div className="flex-1">
          <Link href="/admin" className="text-xs text-mist hover:text-white">← Series management</Link>
          <h2 className="headline mt-1 text-4xl">{series.title}</h2>
          <p className="text-sm text-mist">{series.genre} · {episodes.length} episodes · {series.is_official ? "Calm Original" : "Creator Original"}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href={`/create?series=${id}&section=world`} className="btn-ghost btn-sm">Edit Story Bible</Link>
            <Link href={`/studio/series/${id}`} className="btn-ghost btn-sm">Episodes</Link>
            {series.status === "published" && <Link href={`/series/${series.slug}`} className="btn-ghost btn-sm">Public page</Link>}
          </div>
        </div>
      </div>
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Listens" value={metrics.total_listens} sample={metrics.includes_sample_data} />
        <StatTile label="Hours" value={metrics.listening_hours} sample={metrics.includes_sample_data} />
        <StatTile label="Completion" value={`${metrics.completion_rate}%`} sample={metrics.includes_sample_data} />
        <StatTile label="Followers" value={metrics.followers} sample={metrics.includes_sample_data} />
      </section>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <section className="card p-6" aria-labelledby="wf-h">
          <h3 id="wf-h" className="headline text-2xl">Production workflow</h3>
          <p className="mt-1 text-sm text-mist">The engine reads the Story Bible, writes, checks, narrates, mixes and submits each episode for approval. Nothing publishes without editorial sign-off.</p>
          <WorkflowForm
            seriesId={id}
            initial={wf ?? null}
            voices={voices.map((v) => ({ id: v.id, name: v.name }))}
            soundscapes={soundscapes.map((s) => ({ id: s.id, name: s.name }))}
          />
          {wf && (
            <div className="mt-6 flex flex-wrap gap-2 border-t border-white/5 pt-5">
              <AdminAction endpoint={`/api/admin/workflows/${id}/start`} label="Start production now" pendingLabel="Starting…" className="btn-accent" />
              <AdminAction endpoint={`/api/admin/workflows/${id}`} method="PUT" body={{ status: wf.status === "active" ? "paused" : "active" }} label={wf.status === "active" ? "Pause schedule" : "Activate schedule"} />
            </div>
          )}
        </section>
        <aside className="space-y-4">
          <section className="card p-5">
            <h3 className="font-medium">Story Bible snapshot</h3>
            <p className="mt-1 text-sm text-mist">{bible?.world_name}</p>
            <ul className="mt-2 space-y-1 text-xs text-mist">
              {bible?.unresolved_threads.slice(0, 4).map((t) => <li key={t}>• {t}</li>)}
            </ul>
          </section>
          <section className="card p-5">
            <h3 className="font-medium">Recent jobs</h3>
            <ul className="mt-3 space-y-3 text-sm">
              {jobs.map((j) => {
                const done = j.steps.filter((x) => x.status === "succeeded").length;
                return (
                  <li key={j.id}>
                    <div className="flex justify-between"><span>{j.kind.replace("_", " ")}</span><span className="text-xs text-mist">{j.status}</span></div>
                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-lavender" style={{ width: `${(done / Math.max(1, j.steps.length)) * 100}%` }} /></div>
                    <div className="mt-1 text-[11px] text-mist">{j.current_step ?? "—"} · {formatCents(j.cost_cents)} · {relativeTime(j.created_at)}{j.payload.release_at ? ` · for ${formatDateTime(j.payload.release_at as string)}` : ""}</div>
                  </li>
                );
              })}
              {jobs.length === 0 && <li className="text-xs text-mist">No jobs yet.</li>}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
