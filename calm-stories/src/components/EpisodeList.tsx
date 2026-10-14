"use client";

import Link from "next/link";
import { useState } from "react";
import type { EpisodeRowDTO } from "@/lib/services/dto";
import { cx, formatDateTime, formatMinutes } from "@/lib/util";
import { CheckIcon, LockIcon, PauseIcon, PlayIcon } from "./icons";
import { usePlayer } from "./player/PlayerProvider";

interface SeasonDTO {
  id: string;
  number: number;
  title: string;
  synopsis: string;
  episodes: EpisodeRowDTO[];
}

export function EpisodeList({ seasons }: { seasons: SeasonDTO[]; seriesTitle: string }) {
  const [active, setActive] = useState(seasons[0]?.id ?? "");
  const season = seasons.find((s) => s.id === active) ?? seasons[0];
  const p = usePlayer();
  if (!season) return <p className="text-mist">No episodes yet.</p>;
  return (
    <section aria-labelledby="episodes-heading">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 id="episodes-heading" className="font-serif text-3xl font-semibold">
          Episodes
        </h2>
        {seasons.length > 1 ? (
          <label className="text-sm text-mist">
            <span className="sr-only">Season</span>
            <select value={active} onChange={(e) => setActive(e.target.value)} className="rounded-full border border-white/10 bg-night-2 px-4 py-2 text-white">
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>
                  Season {s.number}: {s.title}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <span className="rounded-full border border-white/10 px-4 py-2 text-sm text-mist">{season.title}</span>
        )}
      </div>
      <p className="mt-2 text-sm text-mist">{season.synopsis}</p>
      <ol className="mt-6 divide-y divide-white/5 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02]">
        {season.episodes.map((ep) => {
          const isCurrent = p.track?.episodeId === ep.id;
          const playable = ep.access === "full" || ep.access === "preview";
          const upcoming = ep.access === "hidden";
          const pct = ep.progress ? (ep.progress.completed ? 100 : (ep.progress.position / Math.max(1, ep.progress.duration)) * 100) : 0;
          return (
            <li key={ep.id} className={cx("group flex gap-4 p-4 sm:p-5", isCurrent && "bg-lavender/[0.06]")}>
              <button
                type="button"
                disabled={!playable && !(ep.access === "locked")}
                onClick={() => {
                  if (ep.access === "locked") return (window.location.href = "/settings#subscription");
                  if (isCurrent) return p.toggle();
                  void p.playEpisode(ep.id);
                }}
                aria-label={upcoming ? `Episode ${ep.number} coming soon` : ep.access === "locked" ? `Episode ${ep.number} is included with Calm Premium` : isCurrent && p.playing ? `Pause episode ${ep.number}` : `Play episode ${ep.number}: ${ep.title}`}
                className={cx(
                  "mt-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender",
                  playable ? "border-white/20 text-white hover:border-white hover:bg-white hover:text-night" : "border-white/10 text-mist",
                )}
              >
                {upcoming ? <span className="text-[10px]">Soon</span> : ep.access === "locked" ? <LockIcon size={16} /> : isCurrent && p.playing ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h3 className="font-medium text-white">
                    <span className="mr-2 text-mist">{ep.number}.</span>
                    {playable ? (
                      <Link href={`/listen/${ep.id}`} className="hover:text-lavender">
                        {ep.title}
                      </Link>
                    ) : (
                      ep.title
                    )}
                  </h3>
                  {ep.isPreview && !upcoming && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-mist">Free preview</span>}
                  {ep.progress?.completed && (
                    <span className="flex items-center gap-1 text-xs text-lavender">
                      <CheckIcon size={12} /> Listened
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-mist">{ep.summary}</p>
                <p className="mt-2 text-xs text-mist/80">
                  {upcoming && ep.releaseAt ? `Releases ${formatDateTime(ep.releaseAt)}` : formatMinutes(ep.durationSeconds)}
                </p>
                {pct > 0 && !ep.progress?.completed && (
                  <div className="mt-2 h-1 w-40 overflow-hidden rounded-full bg-white/10" aria-label={`${Math.round(pct)}% listened`}>
                    <div className="h-full bg-lavender" style={{ width: `${pct}%` }} />
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
