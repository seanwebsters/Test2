"use client";

import Link from "next/link";
import { useState } from "react";
import { PlayButton } from "@/components/catalog/PlayButton";
import { cx, formatDateTime, formatMinutes } from "@/lib/util";

interface Ep {
  id: string;
  number: number;
  title: string;
  summary: string;
  duration_seconds: number;
  is_preview: boolean;
  is_public: boolean;
  status: string;
  release_at: string | null;
  progress: { position: number; duration: number; completed: boolean } | null;
}

export function SeasonEpisodes({
  seasons,
  premium,
}: {
  seasons: { id: string; number: number; title: string; synopsis: string; episodes: Ep[] }[];
  premium: boolean;
}) {
  const [active, setActive] = useState(0);
  const season = seasons[active];
  if (!season) return <p className="text-mist">No episodes have been released yet.</p>;
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="headline text-3xl">Episodes</h2>
          <p className="mt-1 text-sm text-mist">{season.synopsis}</p>
        </div>
        {seasons.length > 1 && (
          <div role="tablist" aria-label="Seasons" className="flex gap-1 rounded-full border border-white/10 bg-white/5 p-1">
            {seasons.map((s, i) => (
              <button
                key={s.id}
                role="tab"
                aria-selected={i === active}
                onClick={() => setActive(i)}
                className={cx("rounded-full px-4 py-1.5 text-sm transition", i === active ? "bg-white text-night" : "text-mist hover:text-white")}
              >
                Season {s.number}
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="mt-6 text-xs uppercase tracking-wider text-mist">
        Season {season.number} · {season.title}
      </p>
      <ol className="mt-3 divide-y divide-white/5 overflow-hidden rounded-3xl border border-white/10 bg-night-2/60">
        {season.episodes.map((e) => {
          const pct = e.progress && e.progress.duration ? Math.min(100, (e.progress.position / e.progress.duration) * 100) : 0;
          const locked = !premium && !e.is_preview;
          return (
            <li key={e.id} className="group flex items-center gap-4 p-4 transition hover:bg-white/[0.03] sm:p-5">
              <span className="w-8 text-center font-serif text-2xl text-mist">{e.number}</span>
              <div className="min-w-0 flex-1">
                <Link href={`/listen/${e.id}`} className="font-medium hover:underline">
                  {e.title}
                </Link>
                <p className="mt-0.5 line-clamp-2 text-sm text-mist">{e.summary}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-mist">
                  <span>{formatMinutes(e.duration_seconds)}</span>
                  {e.is_preview && <span className="chip normal-case tracking-normal">Free preview</span>}
                  {locked && <span className="chip normal-case tracking-normal">Premium</span>}
                  {!e.is_public && (
                    <span className="chip border-amber-300/30 normal-case tracking-normal text-amber-200">
                      {e.status === "approved" && e.release_at ? `Scheduled ${formatDateTime(e.release_at)}` : e.status.replace("_", " ")}
                    </span>
                  )}
                  {e.progress?.completed && <span className="text-lavender">✓ Listened</span>}
                  {pct > 0 && !e.progress?.completed && (
                    <span className="flex items-center gap-2">
                      <span className="h-1 w-24 overflow-hidden rounded-full bg-white/10">
                        <span className="block h-full bg-lavender" style={{ width: `${pct}%` }} />
                      </span>
                      {Math.round(pct)}%
                    </span>
                  )}
                </div>
              </div>
              <PlayButton
                episodeId={e.id}
                startAt={e.progress && !e.progress.completed ? e.progress.position : 0}
                className="h-10 w-10 shrink-0"
              />
            </li>
          );
        })}
      </ol>
    </div>
  );
}
