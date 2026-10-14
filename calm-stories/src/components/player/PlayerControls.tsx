"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cx, formatDuration } from "@/lib/util";
import { SPEEDS, usePlayer } from "./PlayerProvider";

export function SeekBar({ className }: { className?: string }) {
  const p = usePlayer();
  const [drag, setDrag] = useState<number | null>(null);
  const duration = p.duration || 0;
  const value = drag ?? p.position;
  const pct = duration ? (value / duration) * 100 : 0;
  return (
    <div className={cx("flex items-center gap-3", className)}>
      <span className="w-12 text-right text-xs tabular-nums text-mist">{formatDuration(value)}</span>
      <div className="relative flex-1">
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-periwinkle to-lavender" style={{ width: `${pct}%` }} />
        </div>
        <input
          type="range"
          min={0}
          max={duration || 1}
          step={1}
          value={value}
          disabled={!duration}
          aria-label="Seek"
          aria-valuetext={`${formatDuration(value)} of ${formatDuration(duration)}`}
          onChange={(e) => setDrag(Number(e.target.value))}
          onMouseUp={() => {
            if (drag !== null) p.seek(drag);
            setDrag(null);
          }}
          onTouchEnd={() => {
            if (drag !== null) p.seek(drag);
            setDrag(null);
          }}
          onKeyUp={() => {
            if (drag !== null) p.seek(drag);
            setDrag(null);
          }}
          className="absolute inset-0 h-1.5 w-full cursor-pointer opacity-0"
        />
      </div>
      <span className="w-12 text-xs tabular-nums text-mist">{formatDuration(duration)}</span>
    </div>
  );
}

export function TransportButtons({ size = "md" }: { size?: "md" | "lg" }) {
  const p = usePlayer();
  const big = size === "lg";
  return (
    <div className={cx("flex items-center", big ? "gap-6" : "gap-2 sm:gap-3")}>
      <button onClick={p.prev} disabled={!p.episode} aria-label="Previous episode" className="rounded-full p-2 text-mist hover:text-white disabled:opacity-40">
        <Icon name="prev" size={big ? 24 : 18} />
      </button>
      <button onClick={() => p.skip(-15)} disabled={!p.episode} aria-label="Back 15 seconds" className="rounded-full p-2 text-mist hover:text-white disabled:opacity-40">
        <Icon name="back15" size={big ? 30 : 22} />
      </button>
      <button
        onClick={p.toggle}
        disabled={!p.episode || p.loading}
        aria-label={p.playing ? "Pause" : "Play"}
        className={cx(
          "flex items-center justify-center rounded-full bg-white text-night shadow-glow transition hover:scale-105 disabled:opacity-60",
          big ? "h-20 w-20" : "h-11 w-11",
        )}
      >
        {p.loading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-night/30 border-t-night" />
        ) : (
          <Icon name={p.playing ? "pause" : "play"} size={big ? 32 : 20} />
        )}
      </button>
      <button onClick={() => p.skip(30)} disabled={!p.episode} aria-label="Forward 30 seconds" className="rounded-full p-2 text-mist hover:text-white disabled:opacity-40">
        <Icon name="fwd30" size={big ? 30 : 22} />
      </button>
      <button onClick={p.next} disabled={!p.episode?.next_id} aria-label="Next episode" className="rounded-full p-2 text-mist hover:text-white disabled:opacity-40">
        <Icon name="next" size={big ? 24 : 18} />
      </button>
    </div>
  );
}

function Popover({ label, children, button }: { label: string; children: (close: () => void) => React.ReactNode; button: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <button aria-label={label} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="rounded-full px-2 py-1.5 text-mist hover:bg-white/5 hover:text-white">
        {button}
      </button>
      {open && (
        <div role="dialog" aria-label={label} className="card absolute bottom-full right-0 z-50 mb-3 w-60 p-3 text-sm animate-fade-up">
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export function SleepTimerControl() {
  const p = usePlayer();
  const active = p.sleepTimer !== null;
  const label = p.sleepTimer?.kind === "episode" ? "End of ep." : p.sleepRemaining !== null ? formatDuration(p.sleepRemaining) : null;
  return (
    <Popover
      label="Sleep timer"
      button={
        <span className={cx("flex items-center gap-1.5 text-xs", active && "text-lavender")}>
          <Icon name="moon" size={18} />
          {label && <span className="tabular-nums">{label}</span>}
        </span>
      }
    >
      {(close) => (
        <div>
          <div className="mb-2 text-xs uppercase tracking-wider text-mist">Sleep timer</div>
          <p className="mb-3 text-xs text-mist">Audio fades out gently over the final 30 seconds.</p>
          <div className="grid grid-cols-3 gap-2">
            {[5, 15, 30, 45, 60].map((m) => (
              <button
                key={m}
                onClick={() => {
                  p.setSleepTimer(m);
                  close();
                }}
                className={cx("rounded-xl border border-white/10 py-1.5 hover:bg-white/10", p.sleepTimer?.kind === "minutes" && p.sleepTimer.minutes === m && "border-lavender text-lavender")}
              >
                {m}m
              </button>
            ))}
            <button
              onClick={() => {
                p.setSleepTimer("episode");
                close();
              }}
              className={cx("rounded-xl border border-white/10 py-1.5 text-xs hover:bg-white/10", p.sleepTimer?.kind === "episode" && "border-lavender text-lavender")}
            >
              End of ep.
            </button>
          </div>
          {active && (
            <button onClick={() => { p.setSleepTimer(null); close(); }} className="mt-3 w-full rounded-xl py-1.5 text-xs text-mist hover:bg-white/5">
              Turn off timer
            </button>
          )}
        </div>
      )}
    </Popover>
  );
}

export function SpeedControl() {
  const p = usePlayer();
  return (
    <Popover label="Playback speed" button={<span className="text-xs font-semibold tabular-nums">{p.speed}×</span>}>
      {(close) => (
        <div>
          <div className="mb-2 text-xs uppercase tracking-wider text-mist">Playback speed</div>
          <div className="grid grid-cols-3 gap-2">
            {SPEEDS.map((s) => (
              <button
                key={s}
                onClick={() => {
                  p.setSpeed(s);
                  close();
                }}
                className={cx("rounded-xl border border-white/10 py-1.5 hover:bg-white/10", p.speed === s && "border-lavender text-lavender")}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>
      )}
    </Popover>
  );
}

export function VolumeControl({ className }: { className?: string }) {
  const p = usePlayer();
  return (
    <div className={cx("flex items-center gap-2", className)}>
      <button onClick={p.toggleMute} aria-label={p.muted ? "Unmute" : "Mute"} className="rounded-full p-1.5 text-mist hover:text-white">
        <Icon name={p.muted || p.volume === 0 ? "mute" : "volume"} size={18} />
      </button>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={p.muted ? 0 : p.volume}
        onChange={(e) => p.setVolume(Number(e.target.value))}
        aria-label="Volume"
        className="w-24 accent-lavender"
      />
    </div>
  );
}

export function AutoplayToggle() {
  const p = usePlayer();
  return (
    <label className="flex cursor-pointer items-center gap-2 text-xs text-mist" title="Automatically continue to the next episode (stops after a few in a row).">
      <input type="checkbox" checked={p.autoplay} onChange={(e) => p.setAutoplay(e.target.checked)} className="accent-lavender" />
      Autoplay next
    </label>
  );
}
