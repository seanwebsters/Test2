import Link from "next/link";
import type { SeriesCardDTO } from "@/lib/services/dto";
import { Artwork } from "./Artwork";
import { PlayButton, SaveButton } from "./actions";

export function SeriesCard({ card, signedIn, priority }: { card: SeriesCardDTO; signedIn: boolean; priority?: boolean }) {
  const playId = card.resume?.episodeId ?? card.firstEpisodeId;
  return (
    <article className="group relative w-[11.5rem] shrink-0 snap-start sm:w-[13.5rem]" data-priority={priority ? "1" : undefined}>
      <Link href={`/series/${card.slug}`} className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender focus-visible:ring-offset-2 focus-visible:ring-offset-night">
        <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-night-2 shadow-card ring-1 ring-white/10 transition duration-500 group-hover:-translate-y-1 group-hover:ring-lavender/40 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0">
          <Artwork spec={card.artwork} className="transition duration-700 group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100" />
          <div className="absolute inset-x-0 bottom-0 p-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">{card.isOfficial ? "Calm Original" : "Creator Original"}</p>
            <h3 className="mt-1 font-serif text-xl font-semibold leading-tight text-white drop-shadow">{card.title}</h3>
          </div>
          {card.resume && (
            <div className="absolute inset-x-3 bottom-2 h-1 overflow-hidden rounded-full bg-white/20" aria-label={`${Math.round(card.resume.fraction * 100)}% listened`}>
              <div className="h-full bg-lavender" style={{ width: `${Math.max(4, card.resume.fraction * 100)}%` }} />
            </div>
          )}
        </div>
        <div className="mt-3 space-y-0.5 px-0.5">
          <p className="truncate text-xs text-mist">
            {card.genre} · {card.episodeCount} episode{card.episodeCount === 1 ? "" : "s"}
          </p>
          <p className="truncate text-xs text-mist/80">{card.resume ? `Resume: ${card.resume.episodeTitle}` : `by ${card.creatorName}`}</p>
        </div>
      </Link>
      <div className="absolute right-2.5 top-2.5 flex gap-2 opacity-100 transition sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
        <SaveButton seriesId={card.id} initial={card.saved} signedIn={signedIn} compact />
      </div>
      <div className="absolute bottom-[4.4rem] right-3 opacity-100 transition sm:translate-y-1 sm:opacity-0 sm:group-focus-within:translate-y-0 sm:group-focus-within:opacity-100 sm:group-hover:translate-y-0 sm:group-hover:opacity-100 motion-reduce:transition-none">
        <PlayButton episodeId={playId} variant="icon" label={`Play ${card.title}`} />
      </div>
    </article>
  );
}
