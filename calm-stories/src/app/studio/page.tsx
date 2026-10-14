import Link from "next/link";
import { getViewer } from "@/lib/auth";
import { studioOverview } from "@/lib/studio";
import { relativeTime } from "@/lib/util";
import { Artwork } from "@/components/Artwork";
import { SampleBadge, Stat, TrendChart } from "@/components/studio/charts";
import { Empty, StatusPill } from "@/components/storymaker/ui";

export const metadata = { title: "My series" };

export default async function StudioHome() {
  const viewer = await getViewer();
  const o = await studioOverview(viewer);
  const t = o.totals;
  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl font-semibold">Creator Studio</h1>
          <p className="mt-1 text-sm text-mist">Your series, editorial feedback and how listeners are finding your stories.</p>
        </div>
        <Link href="/create" className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-night">New series</Link>
      </header>

      <section aria-labelledby="perf">
        <div className="flex items-center gap-2">
          <h2 id="perf" className="font-serif text-2xl font-semibold">Listening</h2>
          <SampleBadge show={t.includesSample} />
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-5">
          <Stat label="Plays" value={t.plays.toLocaleString()} />
          <Stat label="Listeners" value={t.listeners.toLocaleString()} />
          <Stat label="Hours listened" value={t.listenedHours.toFixed(1)} />
          <Stat label="Completion" value={`${Math.round(t.completionRate * 100)}%`} sub="Plays that reached the end" />
          <Stat label="Followers" value={o.creatorFollowers.toLocaleString()} sub={`${o.seriesFollowers} series follows`} />
        </dl>
        <div className="card-surface mt-3 p-4">
          <TrendChart data={o.trend} label="Daily plays, last 28 days" />
        </div>
        {t.includesSample && <p className="mt-2 text-xs text-mist">Some figures include generated sample listening so the prototype has something to show. Real listening is counted the same way.</p>}
      </section>

      <section aria-labelledby="mine">
        <h2 id="mine" className="font-serif text-2xl font-semibold">Your series</h2>
        {o.rows.length ? (
          <ul className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {o.rows.map((r) => (
              <li key={r.series.id} className="card-surface flex gap-4 p-4">
                <div className="w-20 shrink-0 overflow-hidden rounded-xl">
                  <Artwork spec={r.series.artwork} variant="card" title={r.series.title} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/studio/series/${r.series.id}`} className="font-serif text-xl font-semibold hover:text-lavender">{r.series.title}</Link>
                    <StatusPill status={r.series.status} />
                  </div>
                  <p className="text-xs text-mist">{r.episodes} episodes · {r.published} published{r.inReview ? ` · ${r.inReview} in review` : ""}</p>
                  {r.needsChanges > 0 && <p className="mt-1 text-xs text-rose-200">{r.needsChanges} episode{r.needsChanges > 1 ? "s" : ""} need changes</p>}
                  <p className="mt-2 text-xs text-mist">{r.stats.plays.toLocaleString()} plays · {r.followers} followers</p>
                  <div className="mt-2 flex gap-3 text-sm">
                    <Link href={`/studio/series/${r.series.id}`} className="text-lavender">Details</Link>
                    <Link href={`/create?series=${r.series.id}`} className="text-mist hover:text-white">Edit in Storymaker</Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-3"><Empty>You haven’t started a series yet. <Link href="/create" className="text-lavender">Open Storymaker</Link> to begin.</Empty></div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="fb" className="card-surface p-5">
          <h2 id="fb" className="font-serif text-2xl font-semibold">Editorial feedback</h2>
          <ul className="mt-3 divide-y divide-white/5 text-sm">
            {o.feedback.map(({ review, episode, series }) => (
              <li key={review.id} className="py-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  {series && episode ? <Link href={`/studio/series/${series.id}/episodes/${episode.id}`} className="font-medium hover:text-lavender">{episode.title}</Link> : <span>Episode</span>}
                  <span className="text-xs text-mist">{series?.title}</span>
                  <span className="ml-auto"><StatusPill status={review.status} /></span>
                </div>
                {review.notes && review.status !== "pending" && <p className="mt-1 text-xs text-mist">“{review.notes}”</p>}
                <p className="text-[11px] text-mist">{review.status === "pending" ? `Submitted ${relativeTime(review.created_at)}` : `Decided ${relativeTime(review.decided_at ?? review.created_at)}`}</p>
              </li>
            ))}
            {!o.feedback.length && <li className="py-2 text-mist">Nothing submitted yet. Every episode is reviewed by Calm’s editors before it’s released.</li>}
          </ul>
        </section>
        <section aria-labelledby="nt" className="card-surface p-5">
          <div className="flex items-center justify-between">
            <h2 id="nt" className="font-serif text-2xl font-semibold">Notifications</h2>
            <Link href="/notifications" className="text-sm text-lavender">All</Link>
          </div>
          <ul className="mt-3 divide-y divide-white/5 text-sm">
            {o.notifications.map((n) => (
              <li key={n.id} className="py-2.5">
                {n.link ? <Link href={n.link} className={n.read ? "" : "font-medium"}>{n.title}</Link> : <span className={n.read ? "" : "font-medium"}>{n.title}</span>}
                {n.body && <p className="text-xs text-mist">{n.body}</p>}
                <p className="text-[11px] text-mist">{relativeTime(n.created_at)}</p>
              </li>
            ))}
            {!o.notifications.length && <li className="py-2 text-mist">You’re all caught up.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
