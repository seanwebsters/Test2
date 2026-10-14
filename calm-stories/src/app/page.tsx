import Link from "next/link";
import { getViewer } from "@/lib/auth";
import { getHomeShelves } from "@/lib/services/catalog";
import { Artwork } from "@/components/Artwork";
import { PlayButton } from "@/components/actions";
import { SeriesCard } from "@/components/SeriesCard";
import { Shelf } from "@/components/Shelf";

export default async function HomePage() {
  const viewer = await getViewer();
  const { hero, shelves } = await getHomeShelves(viewer);
  const signedIn = !!viewer.user;
  const startId = shelves.find((s) => s.key === "continue")?.items[0]?.resume?.episodeId ?? hero?.firstEpisodeId ?? null;

  return (
    <>
      <section className="relative isolate -mt-16 overflow-hidden pt-16" aria-label="Featured">
        <div className="absolute inset-0 -z-10">
          {hero && <Artwork spec={hero.artwork} variant="hero" />}
          <div className="absolute inset-0 bg-gradient-to-r from-night via-night/70 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-night to-transparent" />
        </div>
        <div className="mx-auto flex min-h-[78vh] max-w-screen-2xl flex-col justify-end px-4 pb-16 pt-24 sm:px-6 lg:px-10">
          <div className="max-w-2xl animate-fade-up">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-lavender">Calm Stories</p>
            <h1 className="mt-4 font-serif text-5xl font-semibold leading-[1.02] text-white sm:text-6xl lg:text-7xl">Home of the world&apos;s most immersive Sleep Stories.</h1>
            <p className="mt-6 max-w-xl text-lg text-white/80">Original series. New episodes. Peaceful worlds. All included with Calm.</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <PlayButton episodeId={startId} label="Start Listening" />
              <Link href="/discover" className="inline-flex items-center rounded-full border border-white/25 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10">
                Explore Series
              </Link>
            </div>
            {hero && (
              <p className="mt-10 text-sm text-mist">
                Now featuring{" "}
                <Link href={`/series/${hero.slug}`} className="font-serif text-base italic text-white underline decoration-lavender/40 underline-offset-4 hover:decoration-lavender">
                  {hero.title}
                </Link>{" "}
                — {hero.tagline}
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-screen-2xl space-y-12 pt-4">
        {shelves.map((shelf, i) => (
          <Shelf key={shelf.key} title={shelf.title} subtitle={shelf.subtitle} badge={shelf.sampleData ? "Sample ranking" : undefined}>
            {shelf.items.map((card) => (
              <SeriesCard key={`${shelf.key}-${card.id}`} card={card} signedIn={signedIn} priority={i < 2} />
            ))}
          </Shelf>
        ))}
      </div>
    </>
  );
}
