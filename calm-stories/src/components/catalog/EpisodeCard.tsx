import Link from "next/link";
import { SceneArt } from "@/components/art/SceneArt";
import type { EpisodeCard as Card } from "@/lib/services/catalog";
import { formatMinutes, relativeTime } from "@/lib/util";
import { PlayButton } from "./PlayButton";

export function EpisodeCard({ card, showRelease = false }: { card: Card; showRelease?: boolean }) {
  const pct = card.progress && card.progress.duration_seconds ? Math.min(100, (card.progress.position_seconds / card.progress.duration_seconds) * 100) : 0;
  return (
    <article className="group relative w-[300px] shrink-0 snap-start">
      <Link href={`/listen/${card.id}`} className="block">
        <div className="relative aspect-video overflow-hidden rounded-3xl ring-1 ring-white/10 transition group-hover:ring-lavender/40">
          <SceneArt spec={card.artwork} className="h-full w-full transition duration-700 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-night/90 via-night/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-4 pr-16">
            <div className="text-[11px] uppercase tracking-wider text-lavender">
              {card.series_title} · S{card.season_number} E{card.number}
            </div>
            <h3 className="mt-0.5 line-clamp-2 font-serif text-xl font-semibold leading-tight">{card.title}</h3>
          </div>
          {pct > 0 && (
            <div className="absolute inset-x-4 bottom-2 h-1 overflow-hidden rounded-full bg-white/15">
              <div className="h-full bg-lavender" style={{ width: `${pct}%` }} />
            </div>
          )}
        </div>
      </Link>
      <div className="absolute bottom-5 right-4">
        <PlayButton episodeId={card.id} startAt={card.progress && !card.progress.completed ? card.progress.position_seconds : undefined} className="h-10 w-10" />
      </div>
      <div className="mt-2 text-xs text-mist">
        {formatMinutes(card.duration_seconds)}
        {showRelease && card.release_at && <> · Released {relativeTime(card.release_at)}</>}
        {pct > 0 && <> · {Math.round(pct)}% listened</>}
      </div>
    </article>
  );
}
