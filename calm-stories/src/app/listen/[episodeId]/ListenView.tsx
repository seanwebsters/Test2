"use client";

import Link from "next/link";
import { usePlayer } from "@/components/player/PlayerProvider";
import { AutoplayToggle, SeekBar, SleepTimerControl, SpeedControl, TransportButtons, VolumeControl } from "@/components/player/PlayerControls";
import { formatDuration } from "@/lib/util";

export function ListenView({
  episodeId,
  allowed,
  hasAudio,
  isSample,
  resumeAt,
  isPublic,
}: {
  episodeId: string;
  allowed: boolean;
  hasAudio: boolean;
  isSample: boolean;
  resumeAt: number | null;
  isPublic: boolean;
}) {
  const p = usePlayer();
  const isCurrent = p.episode?.id === episodeId;

  if (!hasAudio) {
    return <p className="mt-8 rounded-2xl bg-white/5 p-4 text-sm text-mist">Audio for this episode hasn&rsquo;t been produced yet.</p>;
  }
  if (!allowed) {
    return (
      <div className="mt-8 rounded-3xl border border-lavender/30 bg-lavender/10 p-6">
        <p className="font-medium">This episode is included with Calm Premium.</p>
        <p className="mt-1 text-sm text-mist">Every series and episode is part of your subscription – no coins or per-episode purchases.</p>
        <Link href={`/sign-in?reason=premium&next=/listen/${episodeId}`} className="btn-accent mt-4">
          Sign in to listen
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8">
      {!isPublic && <p className="mb-4 text-xs text-amber-200">Private preview – this episode isn&rsquo;t public yet.</p>}
      {!isCurrent ? (
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => p.playEpisode(episodeId, resumeAt !== null ? { startAt: resumeAt } : {})} className="btn-accent px-8 py-3 text-base">
            {resumeAt ? `Resume from ${formatDuration(resumeAt)}` : "Play episode"}
          </button>
          {resumeAt !== null && (
            <button onClick={() => p.playEpisode(episodeId, { startAt: 0 })} className="btn-ghost">
              Start over
            </button>
          )}
        </div>
      ) : (
        <div className="card p-6">
          <SeekBar />
          <div className="mt-5 flex justify-center">
            <TransportButtons size="lg" />
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
            <AutoplayToggle />
            <div className="flex items-center gap-1">
              <SpeedControl />
              <SleepTimerControl />
              <VolumeControl />
            </div>
          </div>
          {p.fading && <p className="mt-3 text-center text-xs text-lavender">Fading out gently…</p>}
        </div>
      )}
      {isSample && (
        <p className="mt-4 text-xs text-mist">
          Prototype sample: this plays a synthesised ambience bed for the series. Narrated episodes are added by the Calm Stories team in the admin.
        </p>
      )}
    </div>
  );
}
