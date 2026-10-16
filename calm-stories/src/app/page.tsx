import Link from "next/link";
import { getViewer } from "@/lib/auth/session";
import { canUseLibrary } from "@/lib/auth/policy";
import { getDb } from "@/lib/db";
import { getFeatured, getHomeShelves } from "@/lib/services/catalog";
import { SceneArt } from "@/components/art/SceneArt";
import { PlayButton } from "@/components/catalog/PlayButton";
import { SeriesCard } from "@/components/catalog/SeriesCard";
import { EpisodeCard } from "@/components/catalog/EpisodeCard";
import { ShelfScroller } from "@/components/catalog/Shelf";
import type { ArtworkSpec } from "@/lib/types";

const HERO_ART: ArtworkSpec = { scene: "kingdom", palette: ["#06102b", "#24306e", "#c9b8ff", "#fff3d6"], seed: 20261014, moon_x: 0.8 };

export default async function HomePage() {
  const viewer = await getViewer();
  const [shelves, featured] = await Promise.all([getHomeShelves(viewer), getFeatured()]);
  const canSave = canUseLibrary(viewer);
  const savedIds = viewer.user
    ? new Set((await getDb().list("user_libraries", { where: { user_id: viewer.user.id } })).map((l) => l.series_id))
    : new Set<string>();

  return (
    <>
      <section className="relative isolate flex min-h-[88vh] items-end overflow-hidden pb-20 pt-32 sm:pb-28">
        <SceneArt spec={HERO_ART} className="absolute inset-0 -z-10 h-full w-full" title="A moonlit kingdom above a misty valley" priority />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-night via-night/50 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-56 bg-gradient-to-t from-night to-transparent" />
        <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-8">
          <div className="max-w-2xl animate-fade-up">
            <p className="chip mb-6 border-lavender/30 text-lavender">Included with Calm Premium</p>
            <h1 className="headline text-5xl leading-[0.95] sm:text-7xl">Home of the world&rsquo;s most immersive Sleep Stories.</h1>
            <p className="mt-6 max-w-xl text-lg text-mist">Original series. New episodes. Peaceful worlds. All included with Calm.</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <PlayButton episodeId={featured?.first_episode_id ?? null} label="Start Listening" variant="accent" className="px-7 py-3 text-base" />
              <Link href="/discover" className="btn-ghost px-7 py-3 text-base">
                Explore Series
              </Link>
            </div>
            {featured && (
              <p className="mt-8 text-sm text-mist">
                Now trending: <Link href={`/series/${featured.slug}`} className="text-white underline-offset-4 hover:underline">{featured.title}</Link>
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="relative z-10 -mt-10 space-y-14">
        {shelves.map((shelf) => (
          <ShelfScroller key={shelf.id} id={shelf.id} title={shelf.title} subtitle={shelf.subtitle}>
            {shelf.kind === "series"
              ? shelf.items.map((card) => (
                  <div role="listitem" key={card.id}>
                    <SeriesCard card={card} canSave={canSave} saved={savedIds.has(card.id)} />
                  </div>
                ))
              : shelf.items.map((card) => (
                  <div role="listitem" key={card.id}>
                    <EpisodeCard card={card} showRelease={shelf.id === "new-episodes"} />
                  </div>
                ))}
          </ShelfScroller>
        ))}
      </div>

    </>
  );
}
