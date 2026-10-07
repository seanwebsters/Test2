"use client";

import type { Sleepiness, SleepStage } from "@/lib/types";
import { stageAt } from "@/lib/engine/mockGenerator";

export const STAGE_META: Record<SleepStage, { label: string; color: string; copy: string; detail: string }> = {
  awake: { label: "Awake", color: "#f6e2b8", copy: "Story is unfolding", detail: "Cinematic storytelling · richer music · more dialogue" },
  drifting: { label: "Drifting", color: "#b8a8f4", copy: "Dream is becoming calmer…", detail: "Slower narration · fewer events · softer music" },
  sleepy: { label: "Sleepy", color: "#8fb6ff", copy: "Breathing slows…", detail: "Longer pauses · gentle voices · ambience rises" },
  asleep: { label: "Asleep", color: "#5d6fae", copy: "Only the night now…", detail: "Mostly ambience · sparse narration · low stimulation" },
};

/** Smooth area graph of narrative intensity across the dream, coloured by stage. */
export function SleepCurve({ sleepiness, progress, className = "", height = 64 }: { sleepiness: Sleepiness; progress?: number; className?: string; height?: number }) {
  const N = 60;
  const pts = Array.from({ length: N + 1 }, (_, i) => {
    const f = i / N;
    const y = 0.12 + 0.82 * Math.pow(1 - f, 1.5) * (stageAt(f, sleepiness) === "awake" ? 1 : stageAt(f, sleepiness) === "drifting" ? 0.85 : stageAt(f, sleepiness) === "sleepy" ? 0.6 : 0.35);
    return [f * 300, height - y * height] as const;
  });
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${line} L300 ${height} L0 ${height} Z`;
  const bounds = (["awake", "drifting", "sleepy", "asleep"] as SleepStage[]).map((s) => {
    const xs = pts.filter(([x]) => stageAt(x / 300, sleepiness) === s).map(([x]) => x);
    return { s, x0: xs.length ? Math.min(...xs) : 0, x1: xs.length ? Math.max(...xs) : 0 };
  });
  const gid = `sc-${sleepiness}-${height}`;
  return (
    <svg viewBox={`0 0 300 ${height}`} preserveAspectRatio="none" className={className}>
      <defs>
        <linearGradient id={gid} x1="0" x2="1">
          {bounds.map((b) => (
            <stop key={b.s} offset={(b.x0 + (b.x1 - b.x0) / 2) / 300} stopColor={STAGE_META[b.s].color} />
          ))}
        </linearGradient>
        <linearGradient id={`${gid}-f`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.18" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id={`${gid}-m`}>
          <path d={area} fill={`url(#${gid}-f)`} />
        </mask>
      </defs>
      <rect width="300" height={height} fill={`url(#${gid})`} mask={`url(#${gid}-m)`} />
      <path d={line} fill="none" stroke={`url(#${gid})`} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
      {bounds.slice(1).map((b) => (
        <line key={b.s} x1={b.x0} x2={b.x0} y1="0" y2={height} stroke="#fff" strokeOpacity="0.08" strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />
      ))}
      {progress !== undefined && <line x1={progress * 300} x2={progress * 300} y1="0" y2={height} stroke="#fff" strokeOpacity="0.7" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />}
    </svg>
  );
}
