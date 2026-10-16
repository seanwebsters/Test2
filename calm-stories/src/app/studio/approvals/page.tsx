import Link from "next/link";
import { getDb } from "@/lib/db";
import { AdminAction } from "@/components/admin/AdminAction";
import { GateDecision } from "@/components/studio/GateDecision";
import { SceneArt } from "@/components/art/SceneArt";
import { ReviewDecision } from "@/app/admin/review/ReviewDecision";
import { cx, formatDuration, relativeTime } from "@/lib/util";
import { isStaff } from "@/app/admin/staff";

export const metadata = { title: "Approvals" };

export default async function Approvals() {
  if (!(await isStaff())) return null;
  const db = getDb();
  const [projects, reviews, art, blocked] = await Promise.all([
    db.list("series_projects", { where: { status: "awaiting_greenlight" } }),
    db.list("editorial_reviews", { where: { status: "pending" }, orderBy: { column: "created_at" } }),
    db.list("artwork_assets", { where: { status: "selected" } }),
    db.list("workflow_runs", { where: { status: "blocked" } }),
  ]);
  const blockedSteps = blocked.length ? await db.list("workflow_steps", { where: { run_id: blocked.map((r) => r.id), status: "blocked" } }) : [];
  const series = await db.list("series");
  const episodes = reviews.length ? await db.list("episodes", { where: { id: reviews.map((r) => r.episode_id) } }) : [];
  const empty = !projects.length && !reviews.length && !art.length && !blocked.length;
  return (
    <div className="space-y-12">
      <header>
        <p className="text-[11px] uppercase tracking-[0.35em] text-lavender">Network Executive</p>
        <h1 className="font-serif text-5xl text-white">Approvals</h1>
        <p className="mt-2 max-w-3xl text-mist">Agents never greenlight or publish on their own. Everything that needs your decision waits here.</p>
      </header>
      {empty && <p className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center text-mist">All clear – nothing is waiting for you.</p>}

      {projects.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-serif text-3xl text-white">Series greenlights</h2>
          {projects.map((p) => {
            const s = series.find((x) => x.id === p.series_id);
            return (
              <article key={p.id} className="grid gap-5 rounded-3xl border border-amber-300/30 bg-amber-200/[0.04] p-5 md:grid-cols-[180px_minmax(0,1fr)]">
                {s && <div className="overflow-hidden rounded-2xl"><div className="aspect-[2/3]"><SceneArt spec={s.artwork} className="h-full w-full" /></div></div>}
                <div>
                  <h3 className="font-serif text-3xl text-white">{s?.title}</h3>
                  <p className="font-serif text-lg italic text-white/80">{s?.tagline}</p>
                  <p className="mt-2 text-sm text-white/90">{s?.description}</p>
                  <Link href={`/studio/projects/${p.id}`} className="mt-2 inline-block text-sm text-lavender">Review the full development package →</Link>
                  <div className="mt-4"><GateDecision runId={p.run_id!} stepKey="greenlight" /></div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {reviews.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-serif text-3xl text-white">Episodes ready to publish</h2>
          {reviews.map((r) => {
            const ep = episodes.find((e) => e.id === r.episode_id);
            const s = series.find((x) => x.id === r.series_id);
            if (!ep || !s) return null;
            return (
              <article key={r.id} className="grid gap-5 rounded-3xl border border-white/10 bg-white/[0.03] p-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div>
                  <div className="flex gap-4">
                    <div className="w-48 shrink-0 overflow-hidden rounded-2xl"><div className="aspect-video"><SceneArt spec={ep.artwork_url ? { ...s.artwork, image_url: ep.artwork_url } : s.artwork} className="h-full w-full" /></div></div>
                    <div className="min-w-0">
                      <p className="text-xs text-mist">{s.title} · Episode {ep.number} · {r.source === "agents" ? "produced by the studio" : "uploaded"} · {relativeTime(r.created_at)}</p>
                      <h3 className="font-serif text-3xl text-white">{ep.title}</h3>
                      <p className="text-sm text-white/85">{ep.summary}</p>
                      {r.source === "agents" && <Link href={`/studio/writers-room/${ep.id}`} className="mt-1 inline-block text-sm text-lavender">Read the script and critiques →</Link>}
                    </div>
                  </div>
                  {ep.audio_asset_id && <audio controls preload="none" src={`/api/admin/audio/${ep.audio_asset_id}`} className="mt-4 w-full" aria-label="Episode audio" />}
                  <p className="mt-1 text-xs text-mist">{formatDuration(ep.duration_seconds)}</p>
                  <ul className="mt-3 grid gap-2 md:grid-cols-2">
                    {r.checks.map((c, i) => (
                      <li key={i} className={cx("rounded-xl px-3 py-2 text-xs", c.status === "fail" ? "bg-rose-400/10" : c.status === "warn" ? "bg-amber-300/10" : "bg-emerald-300/5")}>
                        <span className="text-white">{c.name.replace("_", " ")}</span> <span className="uppercase text-mist">{c.status}</span>
                        <p className="text-mist">{c.detail}</p>
                      </li>
                    ))}
                  </ul>
                </div>
                <ReviewDecision reviewId={r.id} requested={r.requested_release_at} hasAudio={Boolean(ep.audio_asset_id)} />
              </article>
            );
          })}
        </section>
      )}

      {art.length > 0 && (
        <section>
          <h2 className="font-serif text-3xl text-white">Artwork picked by the Art Director</h2>
          <p className="text-sm text-mist">Approve to sign off, or open the Art Studio to choose a different concept.</p>
          <ul className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
            {art.map((a) => (
              <li key={a.id} className="overflow-hidden rounded-2xl border border-white/10">
                <img src={a.variants.titled ?? a.variants["400w"] ?? a.url} alt={a.kind} className="aspect-square w-full object-cover" loading="lazy" />
                <div className="flex items-center justify-between gap-1 p-2 text-[11px]">
                  <span className="text-mist">{a.kind.replace("_", " ")}</span>
                  <AdminAction endpoint={`/api/studio/artwork/${a.id}`} body={{ action: "approve" }} label="Approve" className="btn-ghost btn-sm" />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {blocked.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-serif text-3xl text-white">Blocked workflows</h2>
          {blocked.map((r) => {
            const bs = blockedSteps.filter((s) => s.run_id === r.id);
            return (
              <article key={r.id} className="flex flex-wrap items-center gap-3 rounded-3xl border border-amber-300/30 bg-amber-300/[0.04] p-4">
                <div className="min-w-0 flex-1">
                  <Link href={`/studio/pipeline?run=${r.id}`} className="font-serif text-xl text-white">{r.title}</Link>
                  {bs.map((s) => <p key={s.id} className="text-sm text-amber-100">{s.label}: {s.error}</p>)}
                </div>
                <AdminAction endpoint={`/api/studio/runs/${r.id}`} body={{ action: "resume" }} label="Resume" className="btn-primary btn-sm" />
                {bs.some((s) => s.needs === "budget") && <AdminAction endpoint={`/api/studio/runs/${r.id}`} body={{ action: "resume", budget_cents: r.budget_cents * 2 }} label="Double budget & resume" className="btn-ghost btn-sm" />}
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
