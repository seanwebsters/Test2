"use client";

import Link from "next/link";
import { useEffect } from "react";
import type { PlayerTrack } from "@/lib/services/dto";
import { Artwork } from "@/components/Artwork";
import { ChevronDown } from "@/components/icons";
import { usePlayer } from "./PlayerProvider";
import { AutoplayToggle, Scrubber, SleepMenu, SpeedMenu, Transport, VolumeSlider } from "./controls";

export function ListenView({
  track,
  summary,
  nextTitle,
  isPremium,
  draftStatus = null,
  extra,
}: {
  track: PlayerTrack;
  summary: string;
  nextTitle: string | null;
  isPremium: boolean;
  /** Set when the owner or an editor previews an unpublished episode. */
  draftStatus?: string | null;
  extra?: React.ReactNode;
}) {
  const p = usePlayer();
  const isCurrent = p.track?.episodeId === track.episodeId;

  // Load this episode into the persistent player (without forcing playback).
  useEffect(() => {
    if (!isCurrent) void p.playEpisode(track.episodeId, { autoplay: p.playing });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track.episodeId]);

  const t = isCurrent && p.track ? p.track : track;

  return (
    <div className="relative isolate -mt-16 min-h-[calc(100vh-4rem)] overflow-hidden pt-16">
      <div className="absolute inset-0 -z-10 scale-110 opacity-50 blur-2xl">
        <Artwork spec={t.artwork} variant="hero" />
      </div>
      <div className="absolute inset-0 -z-10 bg-night/70" />
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-10 px-4 py-10 sm:px-6 md:flex-row md:items-center md:gap-14 md:py-16">
        <div className="w-full max-w-sm shrink-0">
          <div className="aspect-square overflow-hidden rounded-[2rem] shadow-card ring-1 ring-white/15">
            <Artwork spec={t.artwork} variant="square" title={t.seriesTitle} />
          </div>
        </div>
        <div className="w-full min-w-0 flex-1">
          <Link href={`/series/${t.seriesSlug}`} className="inline-flex items-center gap-1 text-sm text-lavender hover:underline">
            <ChevronDown size={14} className="rotate-90" /> {t.seriesTitle}
          </Link>
          {draftStatus && (
            <p role="note" className="mt-4 rounded-2xl border border-amber-200/30 bg-amber-200/10 px-4 py-2 text-sm text-amber-100">
              Draft preview ({draftStatus.replace(/_/g, " ")}). Only you and Calm’s editors can hear this until it’s approved and released.
            </p>
          )}
          <p className="mt-4 text-xs uppercase tracking-[0.2em] text-mist">Episode {t.number}</p>
          <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight sm:text-5xl">{t.title}</h1>
          <p className="mt-4 text-white/75">{summary}</p>
          {extra && <div className="mt-3">{extra}</div>}

          {t.access === "locked" ? (
            <div className="card-surface mt-8 p-6">
              <p className="font-serif text-2xl">This episode is included with Calm Premium.</p>
              <p className="mt-2 text-sm text-mist">The first episode of every series is free to preview. Calm Stories has no coins or per-episode purchases.</p>
              <Link href="/settings#subscription" className="mt-4 inline-block rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-night">
                {isPremium ? "Manage subscription" : "See Calm Premium"}
              </Link>
            </div>
          ) : (
            <div className="mt-8 space-y-5">
              <Scrubber />
              <div className="flex justify-center md:justify-start">
                <Transport size="lg" />
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 md:justify-start">
                <SpeedMenu />
                <SleepMenu align="left" />
                <VolumeSlider />
                <AutoplayToggle />
              </div>
              {p.autoplayLimitReached && <p className="text-xs text-mist">Autoplay paused after a few episodes in a row — a gentle nudge to rest. Press play to continue.</p>}
              {p.error && isCurrent && <p className="text-sm text-lavender">{p.error}</p>}
              {t.isSampleAudio && (
                <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs leading-relaxed text-mist">
                  <span className="font-semibold text-white/80">Sample audio.</span> This prototype episode plays the series&apos; procedurally generated ambience bed. Narrated audio appears
                  here once an episode is produced in Storymaker or the Production Studio.
                </p>
              )}
              {nextTitle && <p className="text-sm text-mist">Up next: <span className="text-white">{nextTitle}</span></p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
