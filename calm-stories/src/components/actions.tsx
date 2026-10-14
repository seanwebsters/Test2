"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cx } from "@/lib/util";
import { BookmarkIcon, CheckIcon, LockIcon, PauseIcon, PlayIcon, PlusIcon } from "./icons";
import { usePlayer } from "./player/PlayerProvider";

async function post(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Request failed");
  return res.json();
}

/** Plays (or resumes) an episode in the persistent player. */
export function PlayButton({
  episodeId,
  label,
  variant = "primary",
  fromStart,
  locked,
  className,
}: {
  episodeId: string | null;
  label?: string;
  variant?: "primary" | "ghost" | "icon";
  fromStart?: boolean;
  locked?: boolean;
  className?: string;
}) {
  const p = usePlayer();
  const router = useRouter();
  if (!episodeId) return null;
  const isCurrent = p.track?.episodeId === episodeId;
  const showPause = isCurrent && p.playing;
  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (locked) return router.push("/settings#subscription");
    if (showPause) return p.toggle();
    void p.playEpisode(episodeId, { fromStart });
  };
  if (variant === "icon") {
    return (
      <button type="button" onClick={onClick} aria-label={locked ? "Included with Calm Premium" : showPause ? "Pause" : label ?? "Play"} className={cx("grid h-11 w-11 place-items-center rounded-full bg-white text-night shadow-glow transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender motion-reduce:transition-none", className)}>
        {locked ? <LockIcon size={18} /> : showPause ? <PauseIcon size={18} /> : <PlayIcon size={18} />}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender focus-visible:ring-offset-2 focus-visible:ring-offset-night motion-reduce:transition-none",
        variant === "primary" ? "bg-white text-night shadow-glow hover:bg-lavender" : "border border-white/20 bg-white/5 text-white hover:bg-white/10",
        className,
      )}
    >
      {locked ? <LockIcon size={16} /> : showPause ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
      {locked ? "Included with Calm Premium" : showPause ? "Pause" : label ?? "Play"}
    </button>
  );
}

function useSignedInAction() {
  const router = useRouter();
  return (signedIn: boolean) => {
    if (!signedIn) {
      router.push("/library?signin=1");
      return false;
    }
    return true;
  };
}

export function SaveButton({ seriesId, initial, signedIn, compact }: { seriesId: string; initial: boolean; signedIn: boolean; compact?: boolean }) {
  const [saved, setSaved] = useState(initial);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const guard = useSignedInAction();
  const router = useRouter();
  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!guard(signedIn)) return;
    const next = !saved;
    setSaved(next);
    start(async () => {
      try {
        await post("/api/library", { seriesId, saved: next });
        setErr(null);
        router.refresh();
      } catch (er) {
        setSaved(!next);
        setErr(er instanceof Error ? er.message : "Failed");
      }
    });
  };
  if (compact)
    return (
      <button type="button" onClick={onClick} disabled={pending} aria-pressed={saved} aria-label={saved ? "Remove from library" : "Save to library"} title={err ?? undefined} className={cx("grid h-9 w-9 place-items-center rounded-full border backdrop-blur transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender", saved ? "border-lavender/60 bg-lavender/25 text-lavender" : "border-white/20 bg-night/50 text-white hover:bg-night/80")}>
        <BookmarkIcon size={16} filled={saved} />
      </button>
    );
  return (
    <button type="button" onClick={onClick} disabled={pending} aria-pressed={saved} className={cx("inline-flex items-center gap-2 rounded-full border px-5 py-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender", saved ? "border-lavender/50 bg-lavender/15 text-lavender" : "border-white/20 bg-white/5 text-white hover:bg-white/10")}>
      <BookmarkIcon size={16} filled={saved} />
      {saved ? "In your library" : "Save to library"}
      {err && <span className="sr-only">{err}</span>}
    </button>
  );
}

export function FollowButton({ type, id, initial, signedIn, label, size = "md" }: { type: "series" | "creator"; id: string; initial: boolean; signedIn: boolean; label?: string; size?: "sm" | "md" }) {
  const [following, setFollowing] = useState(initial);
  const [pending, start] = useTransition();
  const guard = useSignedInAction();
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={pending}
      aria-pressed={following}
      onClick={(e) => {
        e.preventDefault();
        if (!guard(signedIn)) return;
        const next = !following;
        setFollowing(next);
        start(async () => {
          try {
            await post("/api/follow", { type, id, follow: next });
            router.refresh();
          } catch {
            setFollowing(!next);
          }
        });
      }}
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full border font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender",
        size === "sm" ? "px-3 py-1.5 text-xs" : "px-5 py-3 text-sm",
        following ? "border-white/20 bg-white/10 text-white" : "border-white/20 bg-transparent text-white hover:bg-white/10",
      )}
    >
      {following ? <CheckIcon size={14} /> : <PlusIcon size={14} />}
      {following ? "Following" : (label ?? "Follow")}
    </button>
  );
}
