import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getViewer } from "@/lib/auth/session";
import { canEditSeries } from "@/lib/auth/policy";
import { getDb } from "@/lib/db";
import { creatorMetrics } from "@/lib/services/analytics";
import { episodeOrder } from "@/lib/services/catalog";
import { SceneArt } from "@/components/art/SceneArt";
import { StatTile } from "@/components/studio/Charts";
import { StatusPill } from "@/components/storymaker/SectionPanels";
import { formatDateTime, formatMinutes } from "@/lib/util";

export const metadata = { title: "Series management" };

export default async function StudioSeriesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getViewer();
  if (!viewer.user) redirect(`/sign-in?next=/studio/series/${id}`);
  const db = getDb();
  const series = await db.get("series", id);
  if (!series || !canEditSeries(viewer, series)) notFound();
  const [seasons, episodes, reviews, metrics] = await Promise.all([
    db.list("seasons", { where: { series_id: id } }),
    db.list("episodes", { where: { series_id: id } }),
    db.list("editorial_reviews", { where: { series_id: id }, orderBy: { column: "created_at", ascending: false } }),
    creatorMetrics([id]),
  ]);
  episodes.sort((a, b) => episodeOrder(a, b, seasons));
  const scripts = await db.list("scripts", { where: { series_id: id } });
  const hasScript = new Set(scripts.filter((s) => s.current_version_id).map((s) => s.episode_id));
  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-16 pt-28 sm:px-8">
      <nav aria-label="Breadcrumb" className="text-xs text-mist"><Link href="/studio" className="hover:text-white">Studio</Link> › {series.title}</nav>
      <div className="mt-4 flex flex-wrap items-center gap-6">
        <span className="h-40 w-28 overflow-hidden rounded-3xl ring-1 ring-white/10"><SceneArt spec={series.artwork} className="h-full w-full" /></span>
        <div className="min-w-0 flex-1">
          <StatusPill status={series.status} />
          <h1 className="headline mt-2 text-5xl">{series.title}</h1>
          <p className="mt-1 font-serif text-xl italic text-white/80">{series.tagline}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={`/create?series=${series.id}`} className="btn-accent btn-sm">Open in Storymaker</Link>
            <Link href={`/create?series=${series.id}&section=world`} className="btn-ghost btn-sm">Story Bible</Link>
            <Link href={`/create?series=${series.id}&section=publishing`} className="btn-ghost btn-sm">Publishing</Link>
            {series.status === "published" && <Link href={`/series/${series.slug}`} className="btn-ghost btn-sm">Public page</Link>}
          </div>
        </div>
      </div>
      <section className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Listens" value={metrics.total_listens} sample={metrics.includes_sample_data} />
        <StatTile label="Hours" value={metrics.listening_hours} sample={metrics.includes_sample_data} />
        <StatTile label="Completion" value={`${metrics.completion_rate}%`} sample={metrics.includes_sample_data} />
        <StatTile label="Followers" value={metrics.followers} sample={metrics.includes_sample_data} />
      </section>
      <section className="mt-10">
        <h2 className="headline text-3xl">Episodes</h2>
        <div className="mt-4 overflow-x-auto rounded-3xl border border-white/10">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-wider text-mist">
              <tr><th className="px-4 py-3">Episode</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Length</th><th className="px-4 py-3">Release</th><th className="px-4 py-3">Listens</th><th className="px-4 py-3"><span className="sr-only">Actions</span></th></tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {episodes.map((e) => {
                const m = metrics.per_episode.find((x) => x.episode_id === e.id);
                const review = reviews.find((r) => r.episode_id === e.id);
                return (
                  <tr key={e.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium">S{seasons.find((s) => s.id === e.season_id)?.number}E{e.number} · {e.title}</div>
                      {review?.status === "changes_requested" && <div className="text-xs text-rose-200">Changes requested: {review.notes}</div>}
                    </td>
                    <td className="px-4 py-3"><StatusPill status={e.status} /></td>
                    <td className="px-4 py-3 text-mist">{formatMinutes(e.duration_seconds)}</td>
                    <td className="px-4 py-3 text-mist">{e.release_at ? formatDateTime(e.release_at) : "—"}</td>
                    <td className="px-4 py-3 text-mist">{m ? `${m.listens} · ${m.completion_rate}%` : "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {hasScript.has(e.id) || !["published"].includes(e.status) ? <Link className="btn-ghost btn-sm" href={`/studio/series/${id}/episodes/${e.id}`}>Script</Link> : null}
                        {hasScript.has(e.id) && <Link className="btn-ghost btn-sm" href={`/studio/production?episode=${e.id}`}>Audio</Link>}
                        {e.audio_asset_id && <Link className="btn-ghost btn-sm" href={`/listen/${e.id}`}>Listen</Link>}
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
