import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth/session";
import { canCreate } from "@/lib/auth/policy";
import { getDb } from "@/lib/db";
import { creatorMetrics } from "@/lib/services/analytics";
import { SceneArt } from "@/components/art/SceneArt";
import { BarChart, StatTile } from "@/components/studio/Charts";
import { StatusPill } from "@/components/storymaker/SectionPanels";
import { formatDateTime, relativeTime } from "@/lib/util";

export const metadata = { title: "Creator Studio" };

export default async function StudioPage() {
  const viewer = await getViewer();
  if (!viewer.user) redirect("/sign-in?next=/studio");
  if (!canCreate(viewer)) {
    return (
      <div className="mx-auto max-w-2xl px-4 pb-16 pt-32 text-center sm:px-8">
        <h1 className="headline text-5xl">Creator Studio</h1>
        <p className="mt-4 text-mist">The studio is for creator accounts. Switch to a creator persona to explore it.</p>
        <Link href="/sign-in?next=/studio" className="btn-primary mt-6">Switch account</Link>
      </div>
    );
  }
  const db = getDb();
  // Creators only ever see their own series here – never another creator's private work.
  const series = await db.list("series", { where: { creator_id: viewer.user.id }, orderBy: { column: "updated_at", ascending: false } });
  const ids = series.map((s) => s.id);
  const [episodes, metrics, notifications] = await Promise.all([
    ids.length ? db.list("episodes", { where: { series_id: ids } }) : Promise.resolve([]),
    creatorMetrics(ids),
    db.list("notifications", { where: { user_id: viewer.user.id }, orderBy: { column: "created_at", ascending: false }, limit: 6 }),
  ]);
  const drafts = episodes.filter((e) => ["planned", "draft", "script_ready", "audio_ready", "changes_requested"].includes(e.status));
  const inReview = episodes.filter((e) => e.status === "in_review");
  const published = episodes.filter((e) => e.status === "published" || (e.status === "approved" && e.release_at && new Date(e.release_at) <= new Date()));
  const scheduled = episodes.filter((e) => e.status === "approved" && e.release_at && new Date(e.release_at) > new Date());
  const title = (sid: string) => series.find((s) => s.id === sid)?.title ?? "";
  const sample = metrics.includes_sample_data;
  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-16 pt-28 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="chip mb-3">Creator Studio</p>
          <h1 className="headline text-5xl">Welcome back, {viewer.user.display_name.split(" ")[0]}</h1>
        </div>
        <Link href="/create" className="btn-accent">New series in Storymaker</Link>
      </div>
      {sample && (
        <p className="mt-6 rounded-2xl border border-amber-300/20 bg-amber-300/5 px-4 py-3 text-sm text-amber-100">
          Analytics include seeded <strong>sample data</strong> ({metrics.sample_share}% of rows) because live listening data is limited in this prototype.
        </p>
      )}
      <section className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Key metrics">
        <StatTile label="Followers" value={metrics.followers.toLocaleString()} sample={sample} />
        <StatTile label="Total listens" value={metrics.total_listens.toLocaleString()} sample={sample} />
        <StatTile label="Listening hours" value={metrics.listening_hours.toLocaleString()} sample={sample} />
        <StatTile label="Returning listeners" value={metrics.returning_listeners.toLocaleString()} hint={`of ${metrics.unique_listeners} unique`} sample={sample} />
        <StatTile label="Completion rate" value={`${metrics.completion_rate}%`} sample={sample} />
        <StatTile label="Draft episodes" value={drafts.length} />
        <StatTile label="In review" value={inReview.length} />
        <StatTile label="Scheduled" value={scheduled.length} />
      </section>
      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="text-sm font-medium">Audience growth · followers {sample && <span className="text-xs text-amber-200">(sample)</span>}</h2>
          <BarChart className="mt-3" label="Followers by week" data={metrics.growth.map((g) => ({ label: g.week, value: g.followers }))} />
        </div>
        <div className="card p-5">
          <h2 className="text-sm font-medium">Listens per week {sample && <span className="text-xs text-amber-200">(sample)</span>}</h2>
          <BarChart className="mt-3" label="Listens by week" data={metrics.growth.map((g) => ({ label: g.week, value: g.listens }))} />
        </div>
      </section>

      <section className="mt-12" aria-labelledby="my-series">
        <h2 id="my-series" className="headline text-3xl">My Series</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {series.map((s) => {
            const eps = episodes.filter((e) => e.series_id === s.id);
            const m = metrics.per_series.find((x) => x.series_id === s.id);
            return (
              <Link key={s.id} href={`/studio/series/${s.id}`} className="card group flex gap-4 p-4 transition hover:border-lavender/40">
                <span className="h-28 w-20 shrink-0 overflow-hidden rounded-2xl ring-1 ring-white/10"><SceneArt spec={s.artwork} className="h-full w-full transition group-hover:scale-105" /></span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2"><StatusPill status={s.status} /></span>
                  <span className="mt-1 block truncate font-serif text-2xl">{s.title}</span>
                  <span className="block text-xs text-mist">{s.genre} · {eps.length} episodes</span>
                  {m && <span className="mt-2 block text-xs text-mist">{m.listens} listens · {m.hours} h · {m.completion_rate}% complete</span>}
                  <span className="mt-1 block text-[11px] text-mist">Updated {relativeTime(s.updated_at)}</span>
                </span>
              </Link>
            );
          })}
          {series.length === 0 && <p className="text-mist">No series yet – start one in Storymaker.</p>}
        </div>
      </section>

      <section className="mt-12 grid gap-6 lg:grid-cols-3">
        <EpisodeList title="Draft Episodes" items={drafts.slice(0, 8).map((e) => ({ id: e.id, sid: e.series_id, label: `${title(e.series_id)} · Ep ${e.number}: ${e.title}`, status: e.status }))} />
        <EpisodeList title="Scheduled Releases" items={scheduled.map((e) => ({ id: e.id, sid: e.series_id, label: `${title(e.series_id)} · ${e.title}`, status: e.release_at ? formatDateTime(e.release_at) : "" }))} />
        <EpisodeList title="Published Episodes" items={published.slice(0, 8).map((e) => ({ id: e.id, sid: e.series_id, label: `${title(e.series_id)} · Ep ${e.number}: ${e.title}`, status: "published" }))} />
      </section>
      {notifications.length > 0 && (
        <section className="card mt-8 p-5">
          <h2 className="font-medium">Recent updates</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {notifications.map((n) => <li key={n.id} className="flex justify-between gap-3"><span>{n.title} – <span className="text-mist">{n.body}</span></span><span className="shrink-0 text-xs text-mist">{relativeTime(n.created_at)}</span></li>)}
          </ul>
        </section>
      )}
    </div>
  );
}

function EpisodeList({ title, items }: { title: string; items: { id: string; sid: string; label: string; status: string }[] }) {
  return (
    <div className="card p-5">
      <h2 className="font-medium">{title}</h2>
      <ul className="mt-3 space-y-2 text-sm">
        {items.map((i) => (
          <li key={i.id}>
            <Link href={`/studio/series/${i.sid}/episodes/${i.id}`} className="flex items-center justify-between gap-2 rounded-xl px-2 py-1.5 hover:bg-white/5">
              <span className="truncate">{i.label}</span>
              <span className="shrink-0 text-[11px] text-mist">{i.status.replace("_", " ")}</span>
            </Link>
          </li>
        ))}
        {items.length === 0 && <li className="text-xs text-mist">Nothing here.</li>}
      </ul>
    </div>
  );
}
