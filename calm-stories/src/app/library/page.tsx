import Link from "next/link";
import type { Metadata } from "next";
import { getViewer } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getLibrary } from "@/lib/services/listener";
import { getHomeShelves, getSeriesCards } from "@/lib/services/catalog";
import { formatMinutes, relativeTime } from "@/lib/util";
import { SeriesCard } from "@/components/SeriesCard";
import { Shelf } from "@/components/Shelf";
import { Avatar } from "@/components/Avatar";
import { FollowButton } from "@/components/actions";
import { SignInPrompt } from "@/components/SignInPrompt";

export const metadata: Metadata = { title: "My Library" };

export default async function LibraryPage() {
  const viewer = await getViewer();
  if (!viewer.user) return <SignInPrompt title="Your library lives here" body="Sign in to save series, follow creators and pick up exactly where you left off." />;
  const lib = await getLibrary(viewer);
  const db = getDb();
  const [saved, followed, { shelves }] = await Promise.all([
    getSeriesCards(viewer, lib.saved.map((s) => s.series_id)),
    getSeriesCards(viewer, lib.follows.map((s) => s.series_id)),
    getHomeShelves(viewer),
  ]);
  const cont = shelves.find((s) => s.key === "continue");
  const creators = await Promise.all(lib.creatorFollows.map((c) => db.findOne("creator_profiles", { user_id: c.creator_id })));
  const recent = await Promise.all(
    lib.progress.slice(0, 12).map(async (p) => ({ p, ep: await db.get("episodes", p.episode_id), s: await db.get("series", p.series_id) })),
  );
  const totalListened = lib.progress.reduce((a, p) => a + p.position_seconds, 0);

  return (
    <div className="mx-auto max-w-screen-2xl space-y-14 pt-10">
      <header className="px-4 sm:px-6 lg:px-10">
        <h1 className="font-serif text-5xl font-semibold">My Library</h1>
        <p className="mt-2 text-mist">
          {lib.saved.length} saved · {lib.follows.length} followed series · {lib.creatorFollows.length} creators · about {formatMinutes(totalListened)} listened
        </p>
      </header>

      {cont && cont.items.length > 0 && (
        <Shelf title="Continue Listening">
          {cont.items.map((c) => (
            <SeriesCard key={c.id} card={c} signedIn />
          ))}
        </Shelf>
      )}

      <Shelf title="Saved series">
        {saved.length ? saved.map((c) => <SeriesCard key={c.id} card={c} signedIn />) : <Empty text="Save a series with the bookmark button and it will appear here." />}
      </Shelf>

      <Shelf title="Following" subtitle="You'll be told when new episodes arrive (if updates are on in Settings).">
        {followed.length ? followed.map((c) => <SeriesCard key={c.id} card={c} signedIn />) : <Empty text="Follow a series to hear about new episodes." />}
      </Shelf>

      <section className="px-4 sm:px-6 lg:px-10" aria-labelledby="creators-h">
        <h2 id="creators-h" className="font-serif text-2xl font-semibold">Creators you follow</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {creators.filter((c): c is NonNullable<typeof c> => !!c).map((c) => (
            <div key={c.id} className="card-surface flex items-center gap-3 px-4 py-3">
              <Avatar name={c.display_name} hue={Number(/hsl\((\d+)/.exec(c.avatar.palette[0])?.[1] ?? 240)} size={36} />
              <Link href={`/profile/${c.username}`} className="text-sm font-medium hover:text-lavender">
                {c.display_name}
              </Link>
              <FollowButton type="creator" id={c.user_id} initial signedIn size="sm" />
            </div>
          ))}
          {!creators.length && <p className="text-sm text-mist">Discover creators from any series page.</p>}
        </div>
      </section>

      <section className="px-4 sm:px-6 lg:px-10" aria-labelledby="history-h">
        <h2 id="history-h" className="font-serif text-2xl font-semibold">Listening history</h2>
        <ul className="mt-4 divide-y divide-white/5 rounded-3xl border border-white/10">
          {recent.map(({ p, ep, s }) =>
            ep && s ? (
              <li key={p.id} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                <Link href={`/listen/${ep.id}`} className="min-w-0 hover:text-lavender">
                  <span className="block truncate">{ep.title}</span>
                  <span className="block truncate text-xs text-mist">{s.title} · Episode {ep.number}</span>
                </Link>
                <span className="shrink-0 text-xs text-mist">{p.completed ? "Finished" : `${Math.round((p.position_seconds / Math.max(1, p.duration_seconds)) * 100)}%`} · {relativeTime(p.updated_at)}</span>
              </li>
            ) : null,
          )}
          {!recent.length && <li className="px-5 py-4 text-sm text-mist">Nothing yet — press play on any story.</li>}
        </ul>
      </section>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-2xl border border-dashed border-white/15 px-6 py-10 text-sm text-mist">{text}</p>;
}
