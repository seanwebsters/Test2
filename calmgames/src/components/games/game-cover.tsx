import { cn } from "@/lib/utils";
import type { GameSummary } from "@/lib/types";

const PALETTES: Record<string, string[]> = {
  Puzzle: ["#F7D9B4", "#EBA98E", "#A988B0"],
  Gardening: ["#EEF4F1", "#C9DFDF", "#93B7C4"],
  Breathing: ["#EDF2EA", "#CADBCF", "#8FB0AE"],
  Colouring: ["#F6E4D8", "#E9B79A", "#B9AEDC"],
  Exploration: ["#0F1833", "#1E2A52", "#3E4374"],
  Sound: ["#E7E2F4", "#B9AEDC", "#7FA6C4"],
  Memory: ["#F3EFF8", "#D9D0EC", "#9DB59A"],
  Creativity: ["#FBF9F5", "#F6E4D8", "#E3EBE0"],
};

/** Motif drawn over the cover gradient: it describes the game type, it is not a screenshot. */
function Motif({ archetype, accent }: { archetype: string; accent: string }) {
  if (archetype === "constellation")
    return (
      <g stroke={accent} strokeWidth="1.4" fill="none" opacity="0.9">
        <path d="M60 120 L100 92 L140 84 L170 56 L210 44 M140 84 L150 128" />
        {[[60, 120], [100, 92], [140, 84], [170, 56], [210, 44], [150, 128], [230, 110], [40, 60]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i > 5 ? 1.4 : 2.6} fill="#fff" stroke="none" />)}
      </g>
    );
  if (archetype === "garden")
    return (
      <g>
        {[0, 1, 2, 3].map((i) => (
          <g key={i} transform={`translate(${70 + i * 44} ${118 - (i % 2) * 10})`}>
            <path d="M0 0 V-26" stroke="#5f7d62" strokeWidth="2" />
            <ellipse cx="-7" cy="-12" rx="7" ry="3" fill="#7E9B76" transform="rotate(-30 -7 -12)" />
            {[0, 72, 144, 216, 288].map((a) => <ellipse key={a} cx={Math.cos((a * Math.PI) / 180) * 6} cy={-30 + Math.sin((a * Math.PI) / 180) * 6} rx="5" ry="3" fill={accent} transform={`rotate(${a} ${Math.cos((a * Math.PI) / 180) * 6} ${-30 + Math.sin((a * Math.PI) / 180) * 6})`} />)}
          </g>
        ))}
      </g>
    );
  if (archetype === "tile-path")
    return (
      <g>
        {[0, 1, 2, 3].map((c) => [0, 1].map((r) => <rect key={`${c}${r}`} x={84 + c * 34} y={64 + r * 34} width="30" height="30" rx="7" fill="#fff" opacity="0.35" />))}
        <path d="M99 79 H133 V113 H201" stroke={accent} strokeWidth="7" strokeLinecap="round" fill="none" />
        <circle cx="99" cy="79" r="6" fill="#fff" />
      </g>
    );
  return <circle cx="150" cy="84" r="26" fill="#fff" opacity="0.4" />;
}

export function GameCover({ game, className }: { game: GameSummary; className?: string }) {
  if (game.hasThumbnail)
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={`/api/games/${game.id}/thumbnail?v=${encodeURIComponent(game.updatedAt)}`} alt={`${game.name}, captured during automated testing`} className={cn("h-full w-full object-cover", className)} />
    );
  const sky = game.cover?.sky ?? PALETTES[game.category] ?? PALETTES.Puzzle;
  const id = `c-${game.id}`;
  return (
    <svg viewBox="0 0 300 168" preserveAspectRatio="xMidYMid slice" className={cn("h-full w-full", className)} role="img" aria-label={`${game.name} cover`}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          {sky.map((c, i) => <stop key={i} offset={i / Math.max(1, sky.length - 1)} stopColor={c} />)}
        </linearGradient>
        <radialGradient id={`${id}-sun`} cx="0.72" cy="0.55" r="0.6">
          <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="300" height="168" fill={`url(#${id})`} />
      <rect width="300" height="168" fill={`url(#${id}-sun)`} />
      {game.cover?.archetype !== "constellation" && <path d="M0 140 C60 128 110 150 170 136 S260 126 300 134 V168 H0Z" fill="#14213D" opacity="0.12" />}
      {game.cover ? <Motif archetype={game.cover.archetype} accent={game.cover.accent} /> : <text x="150" y="92" textAnchor="middle" fontFamily="var(--font-display)" fontSize="15" fill="#14213D" opacity="0.5">Concept</text>}
    </svg>
  );
}
