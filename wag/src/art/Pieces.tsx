import { memo } from 'react';
import type { Special } from '../match3/engine';

/** Shared gradient defs for the puzzle pieces — render once per board. */
export function PieceDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
      <defs>
        <radialGradient id="pg-ball" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#efff9a" />
          <stop offset="45%" stopColor="#b7e03a" />
          <stop offset="100%" stopColor="#5f9a17" />
        </radialGradient>
        <linearGradient id="pg-biscuit" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe3a0" />
          <stop offset="55%" stopColor="#efb24a" />
          <stop offset="100%" stopColor="#c07a22" />
        </linearGradient>
        <radialGradient id="pg-paw" cx="38%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#e7d4ff" />
          <stop offset="50%" stopColor="#a874ee" />
          <stop offset="100%" stopColor="#6436b8" />
        </radialGradient>
        <radialGradient id="pg-rope" cx="38%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#c8ecff" />
          <stop offset="50%" stopColor="#3fa4ea" />
          <stop offset="100%" stopColor="#1c5fae" />
        </radialGradient>
        <linearGradient id="pg-collar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff9c9c" />
          <stop offset="50%" stopColor="#e8353f" />
          <stop offset="100%" stopColor="#9f1426" />
        </linearGradient>
        <linearGradient id="pg-bone" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffd3a1" />
          <stop offset="50%" stopColor="#ff8a2b" />
          <stop offset="100%" stopColor="#c7520d" />
        </linearGradient>
        <linearGradient id="pg-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff6c4" />
          <stop offset="45%" stopColor="#ffcf3d" />
          <stop offset="100%" stopColor="#c98600" />
        </linearGradient>
        <radialGradient id="pg-orb" cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="40%" stopColor="#ffd6f4" />
          <stop offset="100%" stopColor="#8f6ae6" />
        </radialGradient>
        <linearGradient id="pg-chest" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d99a5a" />
          <stop offset="100%" stopColor="#8a5428" />
        </linearGradient>
        <filter id="pg-shadow" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="5" stdDeviation="0" floodColor="#2d2a32" floodOpacity="0.2" />
        </filter>
      </defs>
    </svg>
  );
}

const Gloss = ({ cx = 38, cy = 30, rx = 16, ry = 8, r = -25 }) => (
  <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#fff" opacity="0.55" transform={`rotate(${r} ${cx} ${cy})`} />
);

function Ball() {
  return (
    <g>
      <circle cx="50" cy="50" r="38" fill="url(#pg-ball)" />
      <path d="M20 30 Q50 50 20 72" stroke="#fffbe8" strokeWidth="6" fill="none" strokeLinecap="round" />
      <path d="M80 28 Q50 50 80 72" stroke="#fffbe8" strokeWidth="6" fill="none" strokeLinecap="round" />
      <circle cx="50" cy="50" r="38" fill="none" stroke="#4d7d10" strokeOpacity=".35" strokeWidth="2" />
      <Gloss />
    </g>
  );
}

function Biscuit() {
  return (
    <g>
      <path d="M22 36 a12 12 0 1 1 16 -14 h24 a12 12 0 1 1 16 14 v28 a12 12 0 1 1 -16 14 h-24 a12 12 0 1 1 -16 -14 Z" fill="url(#pg-biscuit)" stroke="#b06c18" strokeWidth="2.5" />
      {[
        [38, 40],
        [62, 40],
        [50, 52],
        [38, 62],
        [62, 62],
      ].map(([x, y]) => (
        <circle key={`${x}${y}`} cx={x} cy={y} r="3.2" fill="#b0681c" opacity="0.75" />
      ))}
      <Gloss cx={34} cy={28} rx={12} ry={5} />
    </g>
  );
}

function Paw() {
  return (
    <g>
      <circle cx="50" cy="50" r="40" fill="url(#pg-paw)" />
      <circle cx="50" cy="50" r="40" fill="none" stroke="#4e2596" strokeOpacity=".4" strokeWidth="2" />
      <g fill="#fdf6ff">
        <ellipse cx="50" cy="60" rx="15" ry="12.5" />
        <ellipse cx="29" cy="45" rx="6.8" ry="8.5" transform="rotate(-20 29 45)" />
        <ellipse cx="42" cy="32" rx="6.8" ry="8.8" transform="rotate(-6 42 32)" />
        <ellipse cx="58" cy="32" rx="6.8" ry="8.8" transform="rotate(6 58 32)" />
        <ellipse cx="71" cy="45" rx="6.8" ry="8.5" transform="rotate(20 71 45)" />
      </g>
      <Gloss cx={34} cy={24} rx={13} ry={6} />
    </g>
  );
}

function Rope() {
  return (
    <g>
      <circle cx="50" cy="50" r="36" fill="url(#pg-rope)" />
      <g fill="none" stroke="#bfe8ff" strokeWidth="5" strokeLinecap="round" opacity="0.85">
        <path d="M22 40 Q50 22 78 40" />
        <path d="M18 56 Q50 38 82 56" />
        <path d="M24 70 Q50 54 76 70" />
      </g>
      <g fill="none" stroke="#1a5aa3" strokeWidth="2.5" opacity="0.5">
        <path d="M36 18 Q30 50 40 84" />
        <path d="M64 18 Q70 50 60 84" />
      </g>
      <circle cx="50" cy="50" r="36" fill="none" stroke="#164f93" strokeOpacity=".35" strokeWidth="2" />
      <Gloss cx={36} cy={28} rx={12} ry={6} />
    </g>
  );
}

function Collar() {
  return (
    <g>
      <circle cx="50" cy="48" r="32" fill="none" stroke="url(#pg-collar)" strokeWidth="15" />
      <circle cx="50" cy="48" r="32" fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="2.5" strokeDasharray="4 7" />
      <rect x="58" y="14" width="18" height="14" rx="3" fill="url(#pg-gold)" stroke="#a66c00" strokeWidth="1.5" transform="rotate(30 67 21)" />
      <path d="M50 80 l0 4" stroke="#a66c00" strokeWidth="2" />
      <circle cx="50" cy="89" r="8" fill="url(#pg-gold)" stroke="#a66c00" strokeWidth="1.5" />
      <path d="M30 26 Q38 18 48 16" stroke="#fff" strokeOpacity=".6" strokeWidth="4" fill="none" strokeLinecap="round" />
    </g>
  );
}

function Bone({ fill = 'url(#pg-bone)', stroke = '#b4460a' }) {
  return (
    <g transform="rotate(-30 50 50)">
      <path d="M26 40 a10 10 0 1 1 8 -12 L66 28 a10 10 0 1 1 8 12 a10 10 0 1 1 -8 12 L34 52 a10 10 0 1 1 -8 -12Z" transform="translate(0 10)" fill={fill} stroke={stroke} strokeWidth="2.5" />
      <path d="M30 34 Q48 32 66 34" transform="translate(0 10)" stroke="#fff" strokeOpacity=".55" strokeWidth="4" fill="none" strokeLinecap="round" />
    </g>
  );
}

const BASE = [Ball, Biscuit, Paw, Rope, Collar, () => <Bone />];
export const PIECE_COLORS = ['#9bd23a', '#efb24a', '#a874ee', '#3fa4ea', '#e8353f', '#ff8a2b'];

function Chest() {
  return (
    <g>
      <rect x="18" y="42" width="64" height="40" rx="6" fill="url(#pg-chest)" stroke="#5e3514" strokeWidth="2.5" />
      <path d="M18 46 Q18 20 50 20 Q82 20 82 46 Z" fill="#c98446" stroke="#5e3514" strokeWidth="2.5" />
      <rect x="18" y="42" width="64" height="8" fill="url(#pg-gold)" />
      <rect x="44" y="40" width="12" height="18" rx="3" fill="url(#pg-gold)" stroke="#a66c00" strokeWidth="1.5" />
      <path d="M34 22 L34 82 M66 22 L66 82" stroke="#f2c14e" strokeWidth="4" />
      <circle cx="74" cy="22" r="4" fill="#fff" opacity="0.9" />
    </g>
  );
}

function Sniffer() {
  return (
    <g>
      <circle cx="50" cy="50" r="40" fill="url(#pg-orb)" />
      {PIECE_COLORS.map((c, i) => (
        <circle key={c} cx={50 + Math.cos((i / 6) * Math.PI * 2) * 27} cy={50 + Math.sin((i / 6) * Math.PI * 2) * 27} r="6.5" fill={c} stroke="#fff" strokeWidth="2" />
      ))}
      <path d="M36 46 Q50 36 64 46 Q64 60 50 64 Q36 60 36 46Z" fill="#3a2a35" />
      <ellipse cx="45" cy="45" rx="5" ry="2.6" fill="#fff" opacity=".7" />
      <Gloss cx={34} cy={24} rx={12} ry={5} />
    </g>
  );
}

function GoldenBone() {
  return (
    <g>
      <circle cx="50" cy="50" r="42" fill="#fff2b8" opacity="0.45" />
      <Bone fill="url(#pg-gold)" stroke="#a66c00" />
      {[
        [20, 22],
        [80, 76],
        [82, 24],
      ].map(([x, y]) => (
        <path key={x} d={`M${x} ${y - 7} L${x + 2} ${y - 2} L${x + 7} ${y} L${x + 2} ${y + 2} L${x} ${y + 7} L${x - 2} ${y + 2} L${x - 7} ${y} L${x - 2} ${y - 2}Z`} fill="#fff" />
      ))}
    </g>
  );
}

function PawPower({ color }: { color: number }) {
  const Base = BASE[color] ?? Paw;
  return (
    <g>
      <g transform="translate(14 14) scale(.72)">
        <Base />
      </g>
      <g fill="#fff" stroke="#c7b5f2" strokeWidth="2">
        <path d="M14 46 Q-2 30 10 20 Q22 24 26 40Z" />
        <path d="M86 46 Q102 30 90 20 Q78 24 74 40Z" />
      </g>
      <circle cx="50" cy="50" r="44" fill="none" stroke="#ffe27a" strokeWidth="3" strokeDasharray="6 6" />
    </g>
  );
}

export const Piece = memo(function Piece({ color, special, treasure }: { color: number; special: Special; treasure?: boolean }) {
  let inner: React.ReactNode;
  if (treasure) inner = <Chest />;
  else if (special === 'sniffer') inner = <Sniffer />;
  else if (special === 'bone') inner = <GoldenBone />;
  else if (special === 'paw') inner = <PawPower color={color} />;
  else {
    const B = BASE[color] ?? Ball;
    inner = <B />;
  }
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ overflow: 'visible' }}>
      <g filter="url(#pg-shadow)">{inner}</g>
      {(special === 'zrow' || special === 'zcol') && (
        <g transform={special === 'zcol' ? 'rotate(90 50 50)' : undefined}>
          <g stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity="0.95">
            <path d="M4 40 L18 40 M2 52 L14 52 M4 64 L18 64" />
            <path d="M96 40 L82 40 M98 52 L86 52 M96 64 L82 64" />
          </g>
          <path d="M8 50 L0 50 M92 50 L100 50" stroke="#ffd84a" strokeWidth="4" />
          <path d="M-2 50 L8 42 L8 58Z M102 50 L92 42 L92 58Z" fill="#ffd84a" stroke="#c98600" strokeWidth="1.5" />
        </g>
      )}
    </svg>
  );
});

export function BoosterIcon({ id, size = 34 }: { id: 'zoomies' | 'bone' | 'sniffer'; size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ overflow: 'visible' }}>
      <g filter="url(#pg-shadow)">
        {id === 'bone' ? (
          <GoldenBone />
        ) : id === 'sniffer' ? (
          <Sniffer />
        ) : (
          <g>
            <circle cx="50" cy="50" r="34" fill="url(#pg-ball)" />
            <path d="M24 32 Q50 50 24 68 M76 32 Q50 50 76 68" stroke="#fffbe8" strokeWidth="5" fill="none" />
            <g stroke="#ffd84a" strokeWidth="6" strokeLinecap="round">
              <path d="M2 38 L14 38 M-2 52 L10 52 M2 66 L14 66" />
            </g>
          </g>
        )}
      </g>
    </svg>
  );
}
