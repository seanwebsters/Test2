import Link from "next/link";
import { getViewer } from "@/lib/auth/session";
import { canUseLibrary } from "@/lib/auth/policy";
import { getLibrary } from "@/lib/services/library";
import { getDb } from "@/lib/db";
import { SeriesCard } from "@/components/catalog/SeriesCard";
import { EpisodeCard } from "@/components/catalog/EpisodeCard";
import { ShelfScroller } from "@/components/catalog/Shelf";
import { relativeTime } from "@/lib/util";
import { MarkRead } from "./MarkRead";

export const metadata = { title: "My Library" };

export default async function LibraryPage() {
  const viewer = await getViewer();
  if (!viewer.user || !canUseLibrary(viewer)) {
    return (
      <div className="mx-auto max-w-2xl px-4 pb-16 pt-32 text-center sm:px-8">
        <h1 className="headline text-5xl">Your library</h1>
        <p className="mt-4 text-mist">
          Save series, follow your favourite worlds and creators, and pick up exactly where you drifted off. Your library is included with Calm Premium.
        </p>
        <Link href="/sign-in?reason=premium&next=/library" className="btn-accent mt-8">
          Sign in to Premium
        </Link>
      </div>
    );
  }
  const lib = await getLibrary(viewer);
  const notifications = await getDb().list("notifications", { where: { user_id: viewer.user.id }, orderBy: { column: "created_at", ascending: false }, limit: 12 });
  const savedIds = new Set(lib.collections.flatMap((c) => c.items.map((i) => i.id)));
  return (
    <div className="pb-16 pt-28">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-8">
        <h1 className="headline text-5xl">My Library</h1>
        <p className="mt-2 text-mist">Everything you&rsquo;ve saved, followed and started.</p>
      </div>
      <div className="mt-10 space-y-14">
        {lib.continue_listening.length > 0 && (
          <ShelfScroller id="lib-continue" title="Continue Listening">
            {lib.continue_listening.map((c) => (
              <div role="listitem" key={c.id}>
                <EpisodeCard card={c} />
              </div>
            ))}
          </ShelfScroller>
        )}
        {lib.collections.map((col) => (
          <ShelfScroller key={col.name} id={`col-${col.name}`} title={col.name} subtitle={`${col.items.length} series`}>
            {col.items.map((c) => (
              <div role="listitem" key={c.id}>
                <SeriesCard card={c} canSave saved />
              </div>
            ))}
          </ShelfScroller>
        ))}
        {lib.collections.length === 0 && (
          <p className="mx-auto max-w-[1400px] px-4 text-mist sm:px-8">
            Nothing saved yet. Tap <strong className="text-white">+</strong> on any series to save it here.
          </p>
        )}
        {lib.following.length > 0 && (
          <ShelfScroller id="lib-following" title="Series you follow" subtitle="You'll get an update when new episodes are released.">
            {lib.following.map((c) => (
              <div role="listitem" key={c.id}>
                <SeriesCard card={c} canSave saved={savedIds.has(c.id)} />
              </div>
            ))}
          </ShelfScroller>
        )}
        <div className="mx-auto grid max-w-[1400px] gap-8 px-4 sm:px-8 lg:grid-cols-2">
          <section aria-labelledby="creators-h" className="card p-6">
            <h2 id="creators-h" className="headline text-2xl">Creators you follow</h2>
            {lib.creators.length === 0 ? (
              <p className="mt-3 text-sm text-mist">Follow creators from their series pages.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {lib.creators.map((c) => (
                  <li key={c.user_id}>
                    <Link href={`/profile/${c.username}`} className="flex items-center justify-between rounded-2xl px-3 py-2 hover:bg-white/5">
                      <span>{c.display_name}</span>
                      <span className="chip">{c.is_official ? "Calm Originals" : "Creator"}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section id="updates" aria-labelledby="updates-h" className="card p-6">
            <div className="flex items-center justify-between">
              <h2 id="updates-h" className="headline text-2xl">Updates</h2>
              <MarkRead />
            </div>
            {notifications.length === 0 ? (
              <p className="mt-3 text-sm text-mist">No updates yet.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {notifications.map((n) => (
                  <li key={n.id} className="rounded-2xl bg-white/[0.03] p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">
                          {!n.read && <span className="mr-2 inline-block h-2 w-2 rounded-full bg-lavender" aria-label="unread" />}
                          {n.link ? <Link href={n.link} className="hover:underline">{n.title}</Link> : n.title}
                        </p>
                        <p className="mt-0.5 text-sm text-mist">{n.body}</p>
                      </div>
                      <span className="shrink-0 text-xs text-mist">{relativeTime(n.created_at)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
        {lib.history.length > 0 && (
          <section className="mx-auto max-w-[1400px] px-4 sm:px-8" aria-labelledby="history-h">
            <h2 id="history-h" className="headline text-3xl">Listening history</h2>
            <ul className="mt-4 divide-y divide-white/5 rounded-3xl border border-white/10">
              {lib.history.map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-3 p-4 text-sm">
                  <Link href={`/listen/${h.id}`} className="hover:underline">
                    <span className="text-mist">{h.series_title} · </span>
                    {h.title}
                  </Link>
                  <span className="text-xs text-mist">{h.progress?.completed ? "Finished" : `${Math.round(((h.progress?.position_seconds ?? 0) / Math.max(1, h.progress?.duration_seconds ?? 1)) * 100)}%`}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
