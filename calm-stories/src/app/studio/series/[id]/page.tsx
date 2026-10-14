import Link from "next/link";
import { notFound } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { studioSeries } from "@/lib/studio";
import { formatCents, formatDateTime } from "@/lib/util";
import { Artwork } from "@/components/Artwork";
import { SampleBadge, Stat, TrendChart } from "@/components/studio/charts";
import { StatusPill } from "@/components/storymaker/ui";

async function load(id: string) {
  try {
    return await studioSeries(await getViewer(), id);
  } catch (e) {
    if ((e as { status?: number }).status === 404 || (e as { status?: number }).status === 403) notFound();
    throw e;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: (await load(id)).series.title };
}

export default async function StudioSeriesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = await load(id);
  const s = d.series;
  return (
    <div className="space-y-8">
      <nav aria-label="Breadcrumb" className="text-sm text-mist"><Link href="/studio" className="hover:text-white">My series</Link> / {s.title}</nav>
      <header className="flex flex-col gap-5 sm:flex-row">
        <div className="w-32 shrink-0 overflow-hidden rounded-2xl"><Artwork spec={s.artwork} variant="card" title={s.title} /></div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-serif text-4xl font-semibold">{s.title}</h1>
            <StatusPill status={s.status} />
          </div>
          <p className="mt-1 text-sm text-mist">{s.tagline}</p>
          <p className="mt-1 text-xs text-mist">{s.genre} · {d.seasons.length} season{d.seasons.length === 1 ? "" : "s"} · {d.followers} followers</p>
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <Link href={`/create?series=${s.id}`} className="rounded-full bg-white px-4 py-2 font-semibold text-night">Edit in Storymaker</Link>
            {s.status === "published" && <Link href={`/series/${s.slug}`} className="rounded-full border border-white/15 px-4 py-2 hover:border-lavender/60">View public page</Link>}
          </div>
        </div>
      </header>

      <section aria-labelledby="stats">
        <div className="flex items-center gap-2">
          <h2 id="stats" className="font-serif text-2xl font-semibold">Listening</h2>
          <SampleBadge show={d.stats.includesSample} />
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Plays" value={d.stats.plays.toLocaleString()} />
          <Stat label="Listeners" value={d.stats.listeners.toLocaleString()} />
          <Stat label="Hours listened" value={d.stats.listenedHours.toFixed(1)} />
          <Stat label="Completion" value={`${Math.round(d.stats.completionRate * 100)}%`} />
        </dl>
        <div className="card-surface mt-3 p-4"><TrendChart data={d.trend} label={`Daily plays of ${s.title}, last 28 days`} /></div>
      </section>

      <section aria-labelledby="eps">
        <h2 id="eps" className="font-serif text-2xl font-semibold">Episodes</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[46rem] text-left text-sm">
            <thead className="text-xs text-mist">
              <tr>
                <th className="py-2 pr-3 font-normal">#</th>
                <th className="py-2 pr-3 font-normal">Episode</th>
                <th className="py-2 pr-3 font-normal">Status</th>
                <th className="py-2 pr-3 font-normal">Release</th>
                <th className="py-2 pr-3 font-normal">Script</th>
                <th className="py-2 pr-3 font-normal">Plays</th>
                <th className="py-2 font-normal">Completion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {d.rows.map(({ episode: e, review, stats, hasScript, words }) => (
                <tr key={e.id} className="align-top">
                  <td className="py-2.5 pr-3 text-mist">{e.number}</td>
                  <td className="py-2.5 pr-3">
                    <Link href={`/studio/series/${s.id}/episodes/${e.id}`} className="font-medium hover:text-lavender">{e.title}</Link>
                    {review && review.status !== "pending" && review.status !== "approved" && review.notes && <p className="mt-0.5 text-xs text-rose-200">Editor: “{review.notes}”</p>}
                  </td>
                  <td className="py-2.5 pr-3"><StatusPill status={e.status} /></td>
                  <td className="py-2.5 pr-3 text-xs text-mist">{e.published_at ? formatDateTime(e.published_at) : e.release_at ? formatDateTime(e.release_at) : "Not scheduled"}</td>
                  <td className="py-2.5 pr-3 text-xs text-mist">{hasScript ? `${words.toLocaleString()} words` : "No script"}</td>
                  <td className="py-2.5 pr-3">{stats.plays.toLocaleString()}</td>
                  <td className="py-2.5">{stats.plays ? `${Math.round(stats.completionRate * 100)}%` : "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!d.rows.length && <p className="py-3 text-sm text-mist">No episodes yet. Plan a season in Storymaker.</p>}
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="card-surface p-5" aria-labelledby="rights">
          <h2 id="rights" className="font-serif text-xl font-semibold">Rights and disclosure</h2>
          {d.rights ? (
            <ul className="mt-2 space-y-1 text-sm text-mist">
              <li>{d.rights.original_work ? "Declared as your original work" : "Not declared original"}</li>
              <li>{d.rights.ai_assisted ? "AI-assisted: listeners see a disclosure" : "Not AI-assisted"}</li>
              <li>Third-party material: {d.rights.third_party_material || "none"}</li>
              <li>Terms version {d.rights.accepted_terms_version}</li>
            </ul>
          ) : (
            <p className="mt-2 text-sm text-mist">You’ll declare rights when you first submit an episode for review.</p>
          )}
        </section>
        <section className="card-surface p-5" aria-labelledby="ai">
          <h2 id="ai" className="font-serif text-xl font-semibold">AI usage</h2>
          <p className="mt-2 text-sm">{formatCents(d.aiCostCents)} estimated provider cost</p>
          <p className="text-xs text-mist">{d.simulatedCalls} simulated generations at no cost.</p>
        </section>
      </div>
    </div>
  );
}
