"use client";

import Link from "next/link";
import { useEffect } from "react";
import { SceneArt } from "@/components/art/SceneArt";
import { Icon } from "@/components/ui/Icon";
import { usePlayer } from "./PlayerProvider";
import { AutoplayToggle, SeekBar, SleepTimerControl, SpeedControl, TransportButtons, VolumeControl } from "./PlayerControls";

export function PlayerBar() {
  const p = usePlayer();
  const visible = Boolean(p.episode);

  useEffect(() => {
    document.documentElement.style.setProperty("--player-h", visible ? "112px" : "0px");
  }, [visible]);

  return (
    <>
      <PremiumGate />
      {p.error && (
        <div role="alert" className="fixed bottom-32 left-1/2 z-50 -translate-x-1/2 rounded-full bg-rose-500/90 px-4 py-2 text-sm text-white shadow-lg">
          {p.error}
        </div>
      )}
      {visible && p.episode && (
        <section
          aria-label="Audio player"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-night-2/90 backdrop-blur-xl"
        >
          <div className="mx-auto flex max-w-[1400px] flex-col gap-2 px-4 py-3 sm:px-8 lg:flex-row lg:items-center lg:gap-6">
            <div className="flex min-w-0 items-center gap-3 lg:w-80">
              <Link href={`/listen/${p.episode.id}`} className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl" aria-label="Open full player">
                <SceneArt spec={p.episode.artwork} className="h-full w-full" />
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={`/listen/${p.episode.id}`} className="block truncate text-sm font-medium hover:underline">
                  {p.episode.title}
                </Link>
                <Link href={`/series/${p.episode.series_slug}`} className="block truncate text-xs text-mist hover:text-white">
                  {p.episode.series_title} · S{p.episode.season_number} E{p.episode.number}
                </Link>
              </div>
              <div className="lg:hidden">
                <TransportButtons />
              </div>
            </div>
            <div className="hidden flex-1 flex-col items-center gap-1 lg:flex">
              <TransportButtons />
              <SeekBar className="w-full max-w-2xl" />
            </div>
            <SeekBar className="lg:hidden" />
            <div className="hidden items-center gap-1 lg:flex">
              {(p.episode.audio_is_sample || p.episode.audio_simulated) && (
                <span className="chip mr-2 normal-case tracking-normal" title="Ambience-only sample audio. Real narration is generated in the Production Studio.">
                  Sample audio
                </span>
              )}
              <SpeedControl />
              <SleepTimerControl />
              <VolumeControl />
              <Link href={`/listen/${p.episode.id}`} className="ml-1 rounded-full p-2 text-mist hover:text-white" aria-label="Expand player">
                <Icon name="expand" size={18} />
              </Link>
            </div>
            <div className="flex items-center justify-between lg:hidden">
              <AutoplayToggle />
              <div className="flex items-center">
                <SpeedControl />
                <SleepTimerControl />
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  );
}

function PremiumGate() {
  const p = usePlayer();
  if (!p.gate) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-night/70 p-4 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-labelledby="gate-title">
      <div className="card w-full max-w-md overflow-hidden animate-fade-up">
        <div className="relative h-36">
          <SceneArt spec={p.gate.artwork} className="h-full w-full" />
          <div className="absolute inset-0 bg-gradient-to-t from-night-2 to-transparent" />
        </div>
        <div className="p-6">
          <p className="chip mb-3">Calm Premium</p>
          <h2 id="gate-title" className="headline text-2xl">
            Keep listening to {p.gate.series_title}
          </h2>
          <p className="mt-2 text-sm text-mist">
            Every series and every episode on Calm Stories is included with Calm Premium. No coins, no per-episode purchases. Episode 1 of every series is free to preview.
          </p>
          <p className="mt-3 rounded-xl bg-white/5 p-3 text-xs text-mist">
            Prototype note: subscriptions are mocked. Sign in as the demo Premium listener to hear everything.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/sign-in?next=/" onClick={p.dismissGate} className="btn-accent">
              Sign in to Premium
            </Link>
            <button onClick={p.dismissGate} className="btn-ghost">
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
