import type { ApprovedStory } from "@/lib/services/public-stories";
import { formatMinutes } from "@/lib/util";
import { PlayButton } from "./PlayButton";

/** One approved story on the listener home page: cover, title, series, description, length, play. */
export function StoryCard({ story }: { story: ApprovedStory }) {
  return (
    <article className="group relative overflow-hidden rounded-3xl bg-white/[0.03] ring-1 ring-white/10 transition hover:ring-lavender/40">
      <div className="relative aspect-[2/3] overflow-hidden bg-gradient-to-b from-[#1b1f4a] to-night">
        {story.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={story.coverUrl} alt="" loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-night via-night/10 to-transparent" />
        <div className="absolute bottom-4 right-4">
          <PlayButton episodeId={story.id} className="h-12 w-12" />
        </div>
      </div>
      <div className="p-4">
        <div className="text-[11px] uppercase tracking-wider text-lavender">{story.seriesTitle}</div>
        <h3 className="mt-0.5 font-serif text-xl font-semibold leading-tight text-white">{story.title}</h3>
        <p className="mt-1 line-clamp-3 text-sm text-mist">{story.description}</p>
        <div className="mt-2 text-xs text-mist">{story.durationSeconds ? formatMinutes(story.durationSeconds) : ""}</div>
      </div>
    </article>
  );
}
