import Link from "next/link";
import { SceneArt } from "@/components/art/SceneArt";
import type { SeriesCard as Card } from "@/lib/services/catalog";
import { PlayButton } from "./PlayButton";
import { ToggleAction } from "./ToggleAction";

export function SeriesCard({ card, canSave, saved = false }: { card: Card; canSave: boolean; saved?: boolean }) {
  return (
    <article className="group relative w-[200px] shrink-0 snap-start sm:w-[220px]">
      <Link href={`/series/${card.slug}`} className="block focus-visible:outline-none" aria-label={`${card.title} – ${card.genre}`}>
        <div className="relative aspect-[3/4] overflow-hidden rounded-3xl ring-1 ring-white/10 transition duration-500 group-hover:-translate-y-1 group-hover:ring-lavender/40 group-focus-visible:ring-2 group-focus-visible:ring-lavender">
          <SceneArt spec={card.artwork} className="h-full w-full transition duration-700 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-night via-night/30 to-transparent" />
          <div className="absolute left-3 top-3 flex gap-1.5">
            {card.is_official ? (
              <span className="rounded-full bg-night/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-lavender backdrop-blur">Calm Original</span>
            ) : (
              <span className="rounded-full bg-night/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-mist backdrop-blur">Creator Original</span>
            )}
          </div>
          <div className="absolute inset-x-0 bottom-0 p-4">
            <h3 className="headline text-[1.45rem] leading-[1.05] text-white drop-shadow">{card.title}</h3>
          </div>
        </div>
      </Link>
      <div className="mt-3 flex items-start justify-between gap-2">
        <div className="min-w-0 text-xs text-mist">
          <div className="truncate text-white/90">{card.genre}</div>
          <div className="truncate">
            {card.episode_count} episodes · <Link href={`/profile/${card.creator_username}`} className="hover:text-white">{card.creator_name}</Link>
          </div>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <ToggleAction
            endpoint="/api/library/save"
            payload={{ series_id: card.id }}
            initial={saved}
            onLabel="Saved to library"
            offLabel="Save to library"
            icon="plus"
            compact
            allowed={canSave}
          />
          <PlayButton episodeId={card.first_episode_id} className="h-9 w-9" />
        </div>
      </div>
    </article>
  );
}
