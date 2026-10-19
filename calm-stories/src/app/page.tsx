import Link from "next/link";
import { listApprovedStories } from "@/lib/services/public-stories";
import { SceneArt } from "@/components/art/SceneArt";
import { PlayButton } from "@/components/catalog/PlayButton";
import { StoryCard } from "@/components/catalog/StoryCard";
import type { ArtworkSpec } from "@/lib/types";

export const dynamic = "force-dynamic";

const HERO_ART: ArtworkSpec = { scene: "kingdom", palette: ["#06102b", "#24306e", "#c9b8ff", "#fff3d6"], seed: 20261014, moon_x: 0.8 };

export default async function HomePage() {
  // Only stories a human approved and that have been released (same as the public feed).
  const stories = await listApprovedStories("");

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
              <PlayButton episodeId={stories[0]?.id ?? null} label="Start Listening" variant="accent" className="px-7 py-3 text-base" />
              <Link href="#stories" className="btn-ghost px-7 py-3 text-base">
                Browse Stories
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="stories" className="relative z-10 mx-auto -mt-10 w-full max-w-[1400px] px-4 pb-24 sm:px-8" aria-labelledby="stories-h">
        <h2 id="stories-h" className="headline text-4xl">Stories</h2>
        {stories.length ? (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {stories.map((s) => <StoryCard key={s.id} story={s} />)}
          </div>
        ) : (
          <p className="mt-4 text-mist">New stories are on their way. Check back soon.</p>
        )}
      </section>
    </>
  );
}
