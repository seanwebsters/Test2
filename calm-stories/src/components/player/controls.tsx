"use client";

import { useEffect, useRef, useState } from "react";
import { formatDuration } from "@/lib/util";
import { BackIcon, ForwardIcon, MoonIcon, NextIcon, PauseIcon, PlayIcon, PrevIcon, VolumeIcon } from "@/components/icons";
import { usePlayer } from "./PlayerProvider";

export function Scrubber({ compact = false }: { compact?: boolean }) {
  const p = usePlayer();
  const [drag, setDrag] = useState<number | null>(null);
  const max = p.duration || 0;
  const value = drag ?? p.currentTime;
  const pct = max ? (value / max) * 100 : 0;
  return (
    <div className={compact ? "w-full" : "w-full space-y-1.5"}>
      <input
        type="range"
        min={0}
        max={max || 1}
        step={1}
        value={Math.min(value, max || 1)}
        disabled={!max}
        aria-label="Seek"
        aria-valuetext={`${formatDuration(value)} of ${formatDuration(max)}`}
        onChange={(e) => setDrag(Number(e.target.value))}
        onPointerUp={() => {
          if (drag !== null) p.seek(drag);
          setDrag(null);
        }}
        onKeyUp={() => {
          if (drag !== null) p.seek(drag);
          setDrag(null);
        }}
        className="range w-full"
        style={{ ["--pct" as string]: `${pct}%` }}
      />
      {!compact && (
        <div className="flex justify-between text-xs tabular-nums text-mist">
          <span>{formatDuration(value)}</span>
          <span>-{formatDuration(Math.max(0, max - value))}</span>
        </div>
      )}
    </div>
  );
}

export function Transport({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const p = usePlayer();
  const big = size === "lg";
  const playSize = big ? 30 : size === "md" ? 22 : 18;
  const btn = "rounded-full p-2 text-white/85 transition hover:bg-white/10 hover:text-white disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender";
  return (
    <div className={`flex items-center ${big ? "gap-5" : "gap-1.5"}`}>
      {size !== "sm" && (
        <button type="button" className={btn} onClick={p.prev} disabled={!p.track} aria-label="Previous episode">
          <PrevIcon size={big ? 24 : 18} />
        </button>
      )}
      <button type="button" className={btn} onClick={() => p.skip(-15)} disabled={!p.track?.src} aria-label="Back 15 seconds">
        <BackIcon size={big ? 30 : 22} />
      </button>
      <button
        type="button"
        onClick={p.toggle}
        disabled={!p.track?.src}
        aria-label={p.playing ? "Pause" : "Play"}
        className={`grid place-items-center rounded-full bg-white text-night shadow-glow transition hover:scale-105 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender focus-visible:ring-offset-2 focus-visible:ring-offset-night motion-reduce:transition-none ${big ? "h-16 w-16" : size === "md" ? "h-11 w-11" : "h-9 w-9"}`}
      >
        {p.loading && p.playing ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-night/30 border-t-night motion-reduce:animate-none" /> : p.playing ? <PauseIcon size={playSize} /> : <PlayIcon size={playSize} />}
      </button>
      <button type="button" className={btn} onClick={() => p.skip(30)} disabled={!p.track?.src} aria-label="Forward 30 seconds">
        <ForwardIcon size={big ? 30 : 22} />
      </button>
      {size !== "sm" && (
        <button type="button" className={btn} onClick={p.next} disabled={!p.track?.nextEpisodeId} aria-label="Next episode">
          <NextIcon size={big ? 24 : 18} />
        </button>
      )}
    </div>
  );
}

const SPEEDS = [0.75, 0.85, 1, 1.1, 1.25];

export function SpeedMenu() {
  const p = usePlayer();
  return (
    <label className="flex items-center gap-2 text-xs text-mist">
      <span className="sr-only">Playback speed</span>
      <select value={p.speed} onChange={(e) => p.setSpeed(Number(e.target.value))} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-lavender">
        {SPEEDS.map((s) => (
          <option key={s} value={s} className="bg-night">
            {s}×
          </option>
        ))}
      </select>
    </label>
  );
}

const SLEEP_OPTIONS: { label: string; value: number | "episode" | null }[] = [
  { label: "Off", value: null },
  { label: "10 minutes", value: 10 },
  { label: "20 minutes", value: 20 },
  { label: "30 minutes", value: 30 },
  { label: "45 minutes", value: 45 },
  { label: "1 hour", value: 60 },
  { label: "End of episode", value: "episode" },
];

export function SleepMenu({ align = "right" }: { align?: "left" | "right" }) {
  const p = usePlayer();
  const [open, setOpen] = useState(false);
  const [, force] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!p.sleep?.endsAt) return;
    const id = window.setInterval(() => force((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [p.sleep]);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  const remaining = p.sleep?.endsAt ? Math.max(0, (p.sleep.endsAt - Date.now()) / 1000) : null;
  const label = !p.sleep ? "Sleep timer" : p.sleep.mode === "episode" ? "End of episode" : formatDuration(remaining ?? 0);
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender ${p.sleep ? "border-lavender/50 bg-lavender/15 text-lavender" : "border-white/10 bg-white/5 text-mist hover:text-white"}`}
      >
        <MoonIcon size={14} />
        <span className="tabular-nums">{label}</span>
      </button>
      {open && (
        <div role="menu" className={`absolute bottom-full z-50 mb-2 w-44 overflow-hidden rounded-2xl border border-white/10 bg-night-2/95 p-1 shadow-card backdrop-blur ${align === "right" ? "right-0" : "left-0"}`}>
          {SLEEP_OPTIONS.map((o) => (
            <button
              key={o.label}
              role="menuitem"
              type="button"
              onClick={() => {
                p.setSleepTimer(o.value);
                setOpen(false);
              }}
              className="block w-full rounded-xl px-3 py-2 text-left text-sm text-white/90 hover:bg-white/10"
            >
              {o.label}
            </button>
          ))}
          <p className="px-3 pb-2 pt-1 text-[11px] leading-snug text-mist">Audio fades out gently before stopping.</p>
        </div>
      )}
    </div>
  );
}

export function VolumeSlider() {
  const p = usePlayer();
  return (
    <label className="flex items-center gap-2 text-mist">
      <VolumeIcon size={16} />
      <span className="sr-only">Volume</span>
      <input type="range" min={0} max={1} step={0.01} value={p.volume} onChange={(e) => p.setVolume(Number(e.target.value))} className="range w-24" style={{ ["--pct" as string]: `${p.volume * 100}%` }} />
    </label>
  );
}

export function AutoplayToggle() {
  const p = usePlayer();
  return (
    <label className="flex cursor-pointer items-center gap-2 text-xs text-mist">
      <input type="checkbox" className="peer sr-only" checked={p.autoplay} onChange={(e) => p.setAutoplay(e.target.checked)} />
      <span className="relative h-5 w-9 rounded-full bg-white/15 transition peer-checked:bg-lavender/70 peer-focus-visible:ring-2 peer-focus-visible:ring-lavender after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-4 motion-reduce:after:transition-none" />
      Autoplay next
    </label>
  );
}
