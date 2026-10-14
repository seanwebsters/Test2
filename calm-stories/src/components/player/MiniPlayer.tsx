"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Artwork } from "@/components/Artwork";
import { CloseIcon, ExpandIcon } from "@/components/icons";
import { usePlayer } from "./PlayerProvider";
import { AutoplayToggle, Scrubber, SleepMenu, SpeedMenu, Transport, VolumeSlider } from "./controls";

/** Persistent bottom bar. Hidden on the full-screen listen page, which shows its own controls. */
export function MiniPlayer() {
  const p = usePlayer();
  const pathname = usePathname();
  if (!p.track || pathname.startsWith("/listen/")) return null;
  const t = p.track;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-night/90 backdrop-blur-xl" role="region" aria-label="Audio player">
      <div className="absolute inset-x-0 top-0 -translate-y-1/2">
        <Scrubber compact />
      </div>
      <div className="mx-auto flex max-w-screen-2xl items-center gap-3 px-3 py-2.5 sm:gap-4 sm:px-6">
        <Link href={`/listen/${t.episodeId}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender" aria-label={`Open player: ${t.title}`}>
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg shadow-card">
            <Artwork spec={t.artwork} variant="square" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{t.title}</p>
            <p className="truncate text-xs text-mist">
              {t.seriesTitle} · Episode {t.number}
              {p.error ? <span className="text-lavender"> · {p.error}</span> : null}
            </p>
          </div>
          <ExpandIcon size={16} className="hidden shrink-0 text-mist sm:block" />
        </Link>
        <Transport size="sm" />
        <div className="hidden items-center gap-3 lg:flex">
          <SpeedMenu />
          <SleepMenu />
          <VolumeSlider />
          <AutoplayToggle />
        </div>
        <div className="lg:hidden">
          <SleepMenu />
        </div>
        <button type="button" onClick={p.close} className="rounded-full p-2 text-mist hover:bg-white/10 hover:text-white" aria-label="Close player">
          <CloseIcon size={16} />
        </button>
      </div>
    </div>
  );
}
