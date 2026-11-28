import type { World } from '../data/types';
import { Glyph } from './Glyph';

/** A small illustrated environment for each career world. */
export function WorldArt({ world, height = 160, className = '', landmark = true }: { world: World; height?: number; className?: string; landmark?: boolean }) {
  const p = world.palette;
  const dark = world.id === 'film';
  const id = `wa-${world.id}`;
  return (
    <svg viewBox="0 0 360 200" preserveAspectRatio="xMidYMid slice" width="100%" height={height} className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={p.sky} /><stop offset="1" stopColor={p.sky2} /></linearGradient>
      </defs>
      <rect width="360" height="200" fill={`url(#${id}-sky)`} />
      {dark ? (
        <g fill="#FFE9A8">{[[30, 30], [80, 18], [140, 40], [220, 22], [300, 35], [330, 70], [60, 80], [260, 64]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i % 3 ? 1.6 : 2.6} />)}</g>
      ) : (
        <>
          <circle cx="300" cy="44" r="22" fill="#FFE066" opacity=".9" />
          <g fill="#fff" opacity=".9"><ellipse cx="70" cy="40" rx="28" ry="10" /><ellipse cx="90" cy="34" rx="18" ry="10" /><ellipse cx="220" cy="60" rx="22" ry="8" /></g>
        </>
      )}
      <path d="M0 150 C60 110 120 120 180 135 S300 105 360 125 V200 H0Z" fill={p.land2} opacity=".75" />
      <path d="M0 170 C70 140 150 150 220 160 S320 150 360 158 V200 H0Z" fill={p.land} />
      <path d="M0 188 C90 176 200 182 360 178 V200 H0Z" fill={p.deep} opacity=".25" />
      {/* tiny trees and props tinted to the world */}
      <g>
        <rect x="46" y="140" width="5" height="16" rx="2" fill={p.deep} opacity=".6" />
        <circle cx="48.5" cy="136" r="12" fill={p.accent} opacity=".85" />
        <rect x="306" y="134" width="5" height="18" rx="2" fill={p.deep} opacity=".6" />
        <circle cx="308.5" cy="130" r="14" fill={p.land2} />
      </g>
      {landmark && (
        <g transform="translate(130 50)">
          <ellipse cx="50" cy="104" rx="56" ry="10" fill={p.deep} opacity=".18" />
          <Glyph name={world.glyph} size={100} />
        </g>
      )}
    </svg>
  );
}
