"use client";

import { Icon } from "@/components/ui/Icon";
import { usePlayer } from "@/components/player/PlayerProvider";
import { cx } from "@/lib/util";

/** Starts (or toggles) an episode in the persistent player. */
export function PlayButton({
  episodeId,
  startAt,
  label,
  variant = "icon",
  className,
}: {
  episodeId: string | null;
  startAt?: number;
  label?: string;
  variant?: "icon" | "primary" | "accent" | "ghost";
  className?: string;
}) {
  const p = usePlayer();
  const isCurrent = episodeId !== null && p.episode?.id === episodeId;
  const playing = isCurrent && p.playing;
  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!episodeId) return;
    if (isCurrent) p.toggle();
    else void p.playEpisode(episodeId, { startAt });
  };
  const text = playing ? "Pause" : label ?? "Play";
  if (variant === "icon") {
    return (
      <button
        onClick={onClick}
        disabled={!episodeId}
        aria-label={`${text}${label ? "" : " episode"}`}
        className={cx(
          "flex h-11 w-11 items-center justify-center rounded-full bg-white text-night shadow-glow transition hover:scale-105 disabled:opacity-40",
          className,
        )}
      >
        <Icon name={playing ? "pause" : "play"} size={18} />
      </button>
    );
  }
  const cls = variant === "accent" ? "btn-accent" : variant === "ghost" ? "btn-ghost" : "btn-primary";
  return (
    <button onClick={onClick} disabled={!episodeId} className={cx(cls, className)}>
      <Icon name={playing ? "pause" : "play"} size={16} />
      {text}
    </button>
  );
}
