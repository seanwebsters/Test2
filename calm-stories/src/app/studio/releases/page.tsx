import Link from "next/link";
import { getDb } from "@/lib/db";
import { isStaff } from "@/app/admin/staff";
import { ReviewDecision } from "@/app/admin/review/ReviewDecision";
import { formatDuration, relativeTime } from "@/lib/util";
import type { Episode } from "@/lib/types";
import { ReleaseTime } from "./ReleaseTime";

export const metadata = { title: "Releases" };
export const dynamic = "force-dynamic";

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "not set");

export default async function ReleasesPage() {
  if (!(await isStaff())) return null;
  const db = getDb();
  const [episodes, series, reviews, assets] = await Promise.all([db.list("episodes"), db.list("series"), db.list("editorial_reviews", { where: { status: "pending" } }), db.list("audio_assets")]);
  const seriesTitle = (id: string) => series.find((s) => s.id === id)?.title ?? "";
  const duration = (ep: Episode) => assets.find((a) => a.id === ep.audio_asset_id)?.duration_seconds ?? 0;
  const finished = episodes.filter((e) => e.status === "in_review").sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
  const approved = episodes.filter((e) => e.status === "approved").sort((a, b) => ((a.release_at ?? "") < (b.release_at ?? "") ? -1 : 1));
  const published = episodes.filter((e) => e.status === "published" && e.audio_asset_id).sort((a, b) => ((a.published_at ?? "") < (b.published_at ?? "") ? 1 : -1)).slice(0, 20);

  const Row = ({ ep, children }: { ep: Episode; children?: React.ReactNode }) => (
    <li className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <div className="font-serif text-xl text-white">{seriesTitle(ep.series_id)} · Episode {ep.number}: {ep.title}</div>
        <div className="text-xs text-mist">{duration(ep) ? formatDuration(duration(ep)) : ""}</div>
      </div>
      {ep.audio_asset_id && <audio controls preload="none" src={`/api/admin/audio/${ep.audio_asset_id}`} className="mt-2 w-full" aria-label="Episode audio" />}
      {children && <div className="mt-3">{children}</div>}
    </li>
  );

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-serif text-5xl text-white">Releases</h1>
        <p className="text-sm text-mist">Finished episodes to listen to and approve, approved episodes with their release times (change them any time before they go out), and what&rsquo;s already live.</p>
      </header>

      <section>
        <h2 className="font-serif text-3xl text-white">Finished – waiting for you ({finished.length})</h2>
        <p className="text-xs text-mist">Listen, pick a release time, then approve – or send back with notes (as many times as you like).</p>
        <ul className="mt-3 space-y-3">
          {finished.map((ep) => {
            const r = reviews.find((x) => x.episode_id === ep.id);
            return <Row key={ep.id} ep={ep}>{r ? <ReviewDecision reviewId={r.id} requested={r.requested_release_at} hasAudio={Boolean(ep.audio_asset_id)} /> : <span className="text-sm text-mist">No open review.</span>}</Row>;
          })}
          {!finished.length && <li className="text-sm text-mist">Nothing waiting. New finished episodes appear here.</li>}
        </ul>
      </section>

      <section>
        <h2 className="font-serif text-3xl text-white">Approved – scheduled ({approved.length})</h2>
        <ul className="mt-3 space-y-3">
          {approved.map((ep) => (
            <Row key={ep.id} ep={ep}>
              <div className="mb-2 text-sm text-white/90">Goes live: <b>{when(ep.release_at)}</b> <span className="text-mist">({ep.release_at ? relativeTime(ep.release_at) : "no time set"})</span></div>
              <ReleaseTime episodeId={ep.id} releaseAt={ep.release_at} />
            </Row>
          ))}
          {!approved.length && <li className="text-sm text-mist">Nothing scheduled.</li>}
        </ul>
      </section>

      <section>
        <h2 className="font-serif text-3xl text-white">Live ({published.length})</h2>
        <ul className="mt-3 space-y-3">
          {published.map((ep) => (
            <Row key={ep.id} ep={ep}>
              <div className="text-sm text-mist">Released {when(ep.published_at)} · <Link className="text-lavender" href={`/series/${series.find((s) => s.id === ep.series_id)?.slug ?? ""}`}>View in the listener app</Link></div>
            </Row>
          ))}
          {!published.length && <li className="text-sm text-mist">Nothing live yet.</li>}
        </ul>
      </section>
    </div>
  );
}
