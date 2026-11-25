import { memo, ReactNode } from 'react';
import { GeneratorId, ItemKey, parse } from '../game/items';

/** Shared gradients for every icon; rendered once at the root. */
export function SvgDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
      <defs>
        <radialGradient id="gPink" cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="#fbd3dc" />
          <stop offset="1" stopColor="#d5798c" />
        </radialGradient>
        <radialGradient id="gRose" cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="#f7c3cd" />
          <stop offset="1" stopColor="#c25a72" />
        </radialGradient>
        <radialGradient id="gMoon" cx="45%" cy="40%" r="65%">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#c8b9e8" />
        </radialGradient>
        <linearGradient id="gLeaf" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a9c49a" />
          <stop offset="1" stopColor="#5e7f58" />
        </linearGradient>
        <linearGradient id="gBrass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f0d6a2" />
          <stop offset="1" stopColor="#b98a56" />
        </linearGradient>
        <linearGradient id="gSilver" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f3f1f7" />
          <stop offset="1" stopColor="#a6a3b8" />
        </linearGradient>
        <linearGradient id="gRust" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#c99a7e" />
          <stop offset="1" stopColor="#8a5a48" />
        </linearGradient>
        <linearGradient id="gCrystal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ece3ff" />
          <stop offset="0.5" stopColor="#b9a2ea" />
          <stop offset="1" stopColor="#7d63b8" />
        </linearGradient>
        <linearGradient id="gCrystalD" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a58ad9" />
          <stop offset="1" stopColor="#5f4a96" />
        </linearGradient>
        <linearGradient id="gPaper" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fdf8ef" />
          <stop offset="1" stopColor="#eadcc4" />
        </linearGradient>
        <linearGradient id="gSage" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a8bea3" />
          <stop offset="1" stopColor="#6f8a6c" />
        </linearGradient>
        <linearGradient id="gPlum" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#9a6f95" />
          <stop offset="1" stopColor="#5a3d5c" />
        </linearGradient>
        <linearGradient id="gNight" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5c63a0" />
          <stop offset="1" stopColor="#2d2f5a" />
        </linearGradient>
        <linearGradient id="gGlass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.75" />
          <stop offset="1" stopColor="#d9e6f2" stopOpacity="0.35" />
        </linearGradient>
        <linearGradient id="gSand" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f6e2bf" />
          <stop offset="1" stopColor="#d8b685" />
        </linearGradient>
        <radialGradient id="gTime" cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="#f2fbff" />
          <stop offset="0.6" stopColor="#9fcbe8" />
          <stop offset="1" stopColor="#5f86c0" />
        </radialGradient>
        <linearGradient id="gWood" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#b88b6e" />
          <stop offset="1" stopColor="#7a5545" />
        </linearGradient>
        <radialGradient id="gGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#fff6dc" stopOpacity="0.95" />
          <stop offset="1" stopColor="#fff6dc" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="gGlowLav" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#efe4ff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#efe4ff" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
}

const O = '#4a3a4c'; // outline ink
const sw = 1.6;

function Ground() {
  return <ellipse cx="32" cy="56" rx="17" ry="3.2" fill="#3a2d40" opacity="0.14" />;
}

function Sparkle({ x, y, s = 1, c = '#fff8e6' }: { x: number; y: number; s?: number; c?: string }) {
  return <path d={`M${x} ${y - 4 * s} Q${x + 0.8 * s} ${y - 0.8 * s} ${x + 4 * s} ${y} Q${x + 0.8 * s} ${y + 0.8 * s} ${x} ${y + 4 * s} Q${x - 0.8 * s} ${y + 0.8 * s} ${x - 4 * s} ${y} Q${x - 0.8 * s} ${y - 0.8 * s} ${x} ${y - 4 * s}Z`} fill={c} />;
}

function Stem({ h = 22, leaves = 2 }: { h?: number; leaves?: number }) {
  return (
    <g>
      <path d={`M32 54 C31 ${54 - h * 0.4} 33 ${54 - h * 0.7} 32 ${54 - h}`} stroke="#5e7f58" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      {leaves > 0 && <path d="M32 46 C24 46 21 40 20 37 C27 37 31 40 32 46Z" fill="url(#gLeaf)" stroke={O} strokeWidth="1.1" />}
      {leaves > 1 && <path d="M32 42 C40 42 43 36 44 33 C37 33 33 36 32 42Z" fill="url(#gLeaf)" stroke={O} strokeWidth="1.1" />}
    </g>
  );
}

function petalRing(n: number, r: number, cx: number, cy: number, w: number, h: number, fill: string, rot = 0) {
  return Array.from({ length: n }, (_, i) => (
    <ellipse key={i} cx={cx} cy={cy - r} rx={w} ry={h} fill={fill} stroke={O} strokeWidth="1" transform={`rotate(${(360 / n) * i + rot} ${cx} ${cy})`} />
  ));
}

function bloom(l: number): ReactNode {
  switch (l) {
    case 1:
      return (
        <g>
          <path d="M32 22 C40 30 41 42 32 48 C23 42 24 30 32 22Z" fill="url(#gWood)" stroke={O} strokeWidth={sw} />
          <path d="M30 30 C29 36 29 40 31 44" stroke="#e5c6a6" strokeWidth="2" fill="none" strokeLinecap="round" />
        </g>
      );
    case 2:
      return (
        <g>
          <Stem h={26} />
          <path d="M32 18 C37 22 37 30 32 32 C27 30 27 22 32 18Z" fill="url(#gLeaf)" stroke={O} strokeWidth={sw} />
          <path d="M32 18 C34 20 34 23 32 24 C30 23 30 20 32 18Z" fill="#e7a0b0" />
        </g>
      );
    case 3:
      return (
        <g>
          <Stem h={24} />
          <path d="M32 12 C41 18 41 30 32 33 C23 30 23 18 32 12Z" fill="url(#gPink)" stroke={O} strokeWidth={sw} />
          <path d="M32 33 C26 31 24 26 25 22 C28 27 30 29 32 33Z" fill="url(#gLeaf)" stroke={O} strokeWidth="1" />
          <path d="M32 33 C38 31 40 26 39 22 C36 27 34 29 32 33Z" fill="url(#gLeaf)" stroke={O} strokeWidth="1" />
          <path d="M30 18 C32 22 33 25 32 29" stroke="#c25a72" strokeWidth="1.2" fill="none" />
        </g>
      );
    case 4:
      return (
        <g>
          <Stem h={18} />
          {petalRing(6, 9, 32, 26, 7.5, 9, 'url(#gRose)')}
          {petalRing(5, 5, 32, 26, 5.5, 6.5, 'url(#gPink)', 30)}
          <circle cx="32" cy="26" r="4" fill="#c25a72" stroke={O} strokeWidth="1" />
          <path d="M30 25 Q32 22 34 25" stroke="#f7c3cd" strokeWidth="1.2" fill="none" />
        </g>
      );
    case 5:
      return (
        <g>
          <circle cx="32" cy="27" r="20" fill="url(#gGlowLav)" />
          <Stem h={16} leaves={1} />
          {petalRing(6, 10, 32, 27, 5.5, 10, 'url(#gMoon)')}
          {petalRing(6, 6, 32, 27, 3.5, 6, '#e9dcf8', 30)}
          <circle cx="32" cy="27" r="4" fill="#f6e3b4" stroke={O} strokeWidth="1" />
          <path d="M44 10 a5 5 0 1 0 4 8 a4 4 0 1 1 -4 -8Z" fill="#f6ead1" stroke={O} strokeWidth="0.9" />
        </g>
      );
    default:
      return (
        <g>
          <path d="M14 50 L50 50 L50 46 C50 24 14 24 14 46Z" fill="url(#gGlass)" stroke={O} strokeWidth={sw} />
          <rect x="11" y="49" width="42" height="6" rx="2" fill="url(#gWood)" stroke={O} strokeWidth={sw} />
          <circle cx="32" cy="13" r="3" fill="url(#gWood)" stroke={O} strokeWidth="1.2" />
          <path d="M32 49 C31 44 33 40 32 36" stroke="#5e7f58" strokeWidth="2" fill="none" />
          <path d="M32 44 C27 44 25 41 24 39 C28 39 31 41 32 44Z" fill="url(#gLeaf)" />
          {petalRing(6, 6, 32, 32, 5, 6, 'url(#gRose)')}
          <circle cx="32" cy="32" r="3" fill="#a9455e" />
          <path d="M19 40 C19 32 24 27 30 25" stroke="#fff" strokeWidth="2" fill="none" opacity="0.7" strokeLinecap="round" />
          <Sparkle x={47} y={22} s={1} />
          <Sparkle x={18} y={24} s={0.7} />
        </g>
      );
  }
}

function gearPath(cx: number, cy: number, r: number, teeth: number, depth: number) {
  let d = '';
  const steps = teeth * 4;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const rr = i % 4 < 2 ? r : r - depth;
    d += `${i === 0 ? 'M' : 'L'}${(cx + Math.cos(a) * rr).toFixed(2)} ${(cy + Math.sin(a) * rr).toFixed(2)} `;
  }
  return d + 'Z';
}

function clock(l: number): ReactNode {
  switch (l) {
    case 1:
      return (
        <g transform="rotate(-30 32 34)">
          <rect x="29" y="26" width="6" height="22" rx="2" fill="url(#gSilver)" stroke={O} strokeWidth={sw} />
          {[30, 35, 40, 45].map((y) => (
            <path key={y} d={`M29 ${y} L35 ${y - 2}`} stroke={O} strokeWidth="1" />
          ))}
          <rect x="24" y="20" width="16" height="7" rx="3" fill="url(#gSilver)" stroke={O} strokeWidth={sw} />
          <path d="M28 23.5 L36 23.5" stroke={O} strokeWidth="1.4" />
        </g>
      );
    case 2:
      return (
        <g>
          <path d={gearPath(32, 33, 16, 8, 4)} fill="url(#gBrass)" stroke={O} strokeWidth={sw} strokeLinejoin="round" />
          <circle cx="32" cy="33" r="5" fill="#f6ead1" stroke={O} strokeWidth={sw} />
        </g>
      );
    case 3:
      return (
        <g>
          <path d={gearPath(44, 20, 9, 7, 3)} fill="url(#gSilver)" stroke={O} strokeWidth="1.3" />
          <circle cx="44" cy="20" r="3" fill="#f6ead1" stroke={O} strokeWidth="1" />
          <path d={gearPath(29, 35, 18, 10, 4)} fill="url(#gBrass)" stroke={O} strokeWidth={sw} strokeLinejoin="round" />
          <circle cx="29" cy="35" r="10" fill="none" stroke={O} strokeWidth="1.2" />
          {[0, 1, 2, 3, 4].map((i) => {
            const a = (i / 5) * Math.PI * 2;
            return <path key={i} d={`M29 35 L${29 + Math.cos(a) * 10} ${35 + Math.sin(a) * 10}`} stroke={O} strokeWidth="1.6" />;
          })}
          <circle cx="29" cy="35" r="3.5" fill="#f6ead1" stroke={O} strokeWidth="1.2" />
        </g>
      );
    case 4: {
      let d = 'M32 32';
      for (let i = 0; i < 60; i++) {
        const a = i * 0.32;
        const r = 1 + i * 0.3;
        d += ` L${(32 + Math.cos(a) * r).toFixed(2)} ${(32 + Math.sin(a) * r).toFixed(2)}`;
      }
      return (
        <g>
          <circle cx="32" cy="32" r="21" fill="#f3e6d0" stroke={O} strokeWidth={sw} />
          <circle cx="32" cy="32" r="18" fill="none" stroke="#d9c4a4" strokeWidth="1.2" />
          <path d={d} fill="none" stroke="url(#gBrass)" strokeWidth="3" strokeLinecap="round" />
          <path d={d} fill="none" stroke={O} strokeWidth="0.6" opacity="0.6" />
          <rect x="49" y="29" width="6" height="6" rx="1.5" fill="url(#gBrass)" stroke={O} strokeWidth="1.2" />
        </g>
      );
    }
    case 5:
      return (
        <g>
          <path d="M32 6 C26 6 26 13 32 13 C38 13 38 6 32 6Z" fill="none" stroke="url(#gBrass)" strokeWidth="2.6" />
          <rect x="29" y="11" width="6" height="5" rx="1.5" fill="url(#gBrass)" stroke={O} strokeWidth="1.2" />
          <circle cx="32" cy="35" r="19" fill="url(#gBrass)" stroke={O} strokeWidth={sw} />
          <circle cx="32" cy="35" r="15" fill="#fbf4e6" stroke={O} strokeWidth="1.2" />
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * Math.PI * 2;
            return <circle key={i} cx={32 + Math.cos(a) * 12} cy={35 + Math.sin(a) * 12} r={i % 3 ? 0.7 : 1.2} fill={O} />;
          })}
          <path d="M32 35 L25 30" stroke={O} strokeWidth="2" strokeLinecap="round" />
          <path d="M32 35 L41 35" stroke={O} strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="32" cy="35" r="1.6" fill="#c25a72" />
          <path d="M20 26 C23 21 28 19 33 19" stroke="#fff" strokeWidth="1.6" fill="none" opacity="0.8" strokeLinecap="round" />
        </g>
      );
    default:
      return (
        <g>
          <circle cx="32" cy="30" r="24" fill="url(#gGlowLav)" />
          <path d={gearPath(32, 30, 22, 14, 3)} fill="url(#gNight)" stroke={O} strokeWidth={sw} />
          <circle cx="32" cy="30" r="16" fill="#f3ecfb" stroke={O} strokeWidth="1.2" />
          <path d="M26 22 a8 8 0 1 0 9 13 a6.5 6.5 0 1 1 -9 -13Z" fill="#d7c6f0" stroke={O} strokeWidth="1" />
          <path d="M32 30 L32 19" stroke={O} strokeWidth="1.6" strokeLinecap="round" />
          <path d="M32 30 L39 34" stroke={O} strokeWidth="1.6" strokeLinecap="round" />
          <Sparkle x={42} y={22} s={0.8} c="#f6e3b4" />
          <Sparkle x={24} y={38} s={0.6} c="#f6e3b4" />
          <rect x="22" y="50" width="20" height="5" rx="2" fill="url(#gBrass)" stroke={O} strokeWidth="1.2" />
        </g>
      );
  }
}

function crystalShape(x: number, y: number, w: number, h: number, key?: number) {
  return (
    <g key={key}>
      <path d={`M${x} ${y - h} L${x + w} ${y - h * 0.62} L${x + w * 0.8} ${y} L${x - w * 0.8} ${y} L${x - w} ${y - h * 0.62}Z`} fill="url(#gCrystal)" stroke={O} strokeWidth="1.4" strokeLinejoin="round" />
      <path d={`M${x} ${y - h} L${x + w * 0.2} ${y} M${x} ${y - h} L${x - w} ${y - h * 0.62}`} stroke="#f4eeff" strokeWidth="1" opacity="0.8" />
      <path d={`M${x + w * 0.2} ${y} L${x + w} ${y - h * 0.62} L${x + w * 0.8} ${y}Z`} fill="url(#gCrystalD)" opacity="0.55" />
    </g>
  );
}

function crystal(l: number): ReactNode {
  switch (l) {
    case 1:
      return <g transform="rotate(15 32 40)">{crystalShape(32, 50, 6, 26)}</g>;
    case 2:
      return <g>{crystalShape(32, 52, 10, 38)}</g>;
    case 3:
      return (
        <g>
          <g transform="rotate(-24 24 52)">{crystalShape(24, 52, 7, 26)}</g>
          <g transform="rotate(22 42 52)">{crystalShape(42, 52, 7, 28)}</g>
          {crystalShape(32, 53, 9, 40)}
          <ellipse cx="32" cy="53" rx="15" ry="3.5" fill="#8d7b9a" stroke={O} strokeWidth="1.2" />
        </g>
      );
    case 4:
      return (
        <g>
          <circle cx="32" cy="33" r="22" fill="url(#gGlowLav)" />
          <ellipse cx="32" cy="34" rx="16" ry="18" fill="url(#gMoon)" stroke={O} strokeWidth={sw} />
          <path d="M24 26 C26 21 30 19 34 19" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <ellipse cx="36" cy="40" rx="6" ry="4" fill="#cdbbea" opacity="0.6" />
          <path d={gearPath(32, 34, 18.5, 18, 1.4)} fill="none" stroke="url(#gSilver)" strokeWidth="1.2" />
        </g>
      );
    default:
      return (
        <g>
          <circle cx="32" cy="32" r="25" fill="url(#gGlow)" />
          <path d="M32 6 L38 24 L57 26 L42 37 L47 55 L32 45 L17 55 L22 37 L7 26 L26 24Z" fill="url(#gCrystal)" stroke={O} strokeWidth={sw} strokeLinejoin="round" />
          <path d="M32 6 L32 45 M7 26 L42 37 M57 26 L22 37" stroke="#f5efff" strokeWidth="0.9" opacity="0.7" />
          <path d="M32 6 L38 24 L32 30 L26 24Z" fill="#f7f2ff" opacity="0.7" />
          <Sparkle x={50} y={12} s={1} />
        </g>
      );
  }
}

function keyShape(fill: string, bow: ReactNode, teeth = 2) {
  return (
    <g transform="rotate(-38 32 32)">
      <rect x="29" y="22" width="6" height="30" rx="2.5" fill={fill} stroke={O} strokeWidth={sw} />
      {Array.from({ length: teeth }, (_, i) => (
        <rect key={i} x="35" y={44 - i * 6} width={i % 2 ? 6 : 8} height="4" rx="1" fill={fill} stroke={O} strokeWidth="1.3" />
      ))}
      {bow}
    </g>
  );
}

function key(l: number): ReactNode {
  switch (l) {
    case 1:
      return keyShape('url(#gRust)', <circle cx="32" cy="16" r="8" fill="none" stroke="url(#gRust)" strokeWidth="5" />, 1);
    case 2:
      return keyShape(
        'url(#gBrass)',
        <g>
          <circle cx="32" cy="15" r="9" fill="url(#gBrass)" stroke={O} strokeWidth={sw} />
          <circle cx="32" cy="15" r="4.5" fill="#f6ead1" stroke={O} strokeWidth="1" />
          <path d="M32 15 L32 12.5 M32 15 L34 15" stroke={O} strokeWidth="0.9" />
        </g>,
      );
    case 3:
      return keyShape(
        'url(#gSilver)',
        <g>
          <path d="M32 4 C40 8 42 18 32 24 C22 18 24 8 32 4Z" fill="url(#gSilver)" stroke={O} strokeWidth={sw} />
          <circle cx="32" cy="14" r="3.4" fill="#c8b9e8" stroke={O} strokeWidth="1" />
        </g>,
        3,
      );
    case 4:
      return keyShape(
        'url(#gSilver)',
        <g>
          <circle cx="32" cy="14" r="12" fill="url(#gGlowLav)" />
          <path d="M27 5 a10 10 0 1 0 12 15 a8 8 0 1 1 -12 -15Z" fill="url(#gMoon)" stroke={O} strokeWidth={sw} />
          <Sparkle x={38} y={9} s={0.6} c="#ffffff" />
        </g>,
        3,
      );
    default:
      return (
        <g>
          <circle cx="32" cy="32" r="26" fill="url(#gGlowLav)" />
          {keyShape(
            'url(#gNight)',
            <g>
              <circle cx="32" cy="14" r="11" fill="url(#gNight)" stroke={O} strokeWidth={sw} />
              <circle cx="32" cy="14" r="7.5" fill="#f3ecfb" stroke={O} strokeWidth="1" />
              <path d="M32 14 L32 9 M32 14 L35.5 15.5" stroke={O} strokeWidth="1.2" strokeLinecap="round" />
            </g>,
            3,
          )}
          <Sparkle x={50} y={46} s={0.8} c="#f6e3b4" />
        </g>
      );
  }
}

function ink(l: number): ReactNode {
  switch (l) {
    case 1:
      return (
        <g transform="rotate(-8 32 32)">
          <path d="M18 12 L44 12 L46 18 L43 24 L46 30 L43 37 L46 44 L44 52 L18 52Z" fill="url(#gPaper)" stroke={O} strokeWidth={sw} strokeLinejoin="round" />
          {[20, 26, 32, 38, 44].map((y) => (
            <path key={y} d={`M22 ${y} L${36 + (y % 3) * 2} ${y}`} stroke="#b3a08a" strokeWidth="1.3" strokeLinecap="round" />
          ))}
        </g>
      );
    case 2:
      return (
        <g transform="rotate(-6 32 32)">
          <path d="M14 22 L32 16 L50 22 L50 46 L14 46Z" fill="url(#gPaper)" stroke={O} strokeWidth={sw} strokeLinejoin="round" />
          <path d="M14 22 L32 30 L50 22" fill="none" stroke={O} strokeWidth="1.2" />
          <path d="M20 36 L34 36 M20 40 L30 40" stroke="#b3a08a" strokeWidth="1.3" strokeLinecap="round" />
        </g>
      );
    case 3:
      return (
        <g>
          <rect x="10" y="18" width="44" height="30" rx="3" fill="url(#gPaper)" stroke={O} strokeWidth={sw} />
          <path d="M10 20 L32 36 L54 20" fill="none" stroke={O} strokeWidth="1.3" />
          <circle cx="32" cy="35" r="6.5" fill="#b8566c" stroke={O} strokeWidth="1.3" />
          <path d="M30 32 a3.5 3.5 0 1 0 4 5 a2.6 2.6 0 1 1 -4 -5Z" fill="#e7a0b0" />
        </g>
      );
    case 4:
      return (
        <g>
          <rect x="15" y="10" width="34" height="44" rx="4" fill="url(#gSage)" stroke={O} strokeWidth={sw} />
          <rect x="19" y="13" width="28" height="38" rx="2" fill="none" stroke="#e9e1cf" strokeWidth="1" opacity="0.7" />
          <rect x="44" y="28" width="9" height="8" rx="2" fill="url(#gWood)" stroke={O} strokeWidth="1.2" />
          <path d="M15 14 L13 14 L13 52 L15 52" fill="#f3ead8" stroke={O} strokeWidth="1.2" />
          <path d="M26 22 C30 18 36 24 32 28 C28 32 34 36 38 32" stroke="#e9e1cf" strokeWidth="1.4" fill="none" />
        </g>
      );
    case 5:
      return (
        <g>
          <path d="M12 46 L12 16 C12 13 14 12 17 12 L50 12 L50 46Z" fill="#efe3cf" stroke={O} strokeWidth={sw} />
          <rect x="10" y="10" width="38" height="42" rx="4" fill="url(#gPlum)" stroke={O} strokeWidth={sw} />
          <path d="M10 14 L16 10 M48 14 L42 10 M10 48 L16 52 M48 48 L42 52" stroke="url(#gBrass)" strokeWidth="3" />
          <rect x="18" y="20" width="22" height="22" rx="11" fill="none" stroke="#e7cfa8" strokeWidth="1.4" />
          <path d="M29 24 L29 38 M22 31 L36 31" stroke="#e7cfa8" strokeWidth="1.4" />
          <rect x="48" y="14" width="4" height="34" rx="1" fill="#e9dcc6" stroke={O} strokeWidth="1" />
        </g>
      );
    default:
      return (
        <g>
          <circle cx="32" cy="32" r="26" fill="url(#gGlowLav)" />
          <rect x="11" y="10" width="40" height="44" rx="5" fill="url(#gNight)" stroke={O} strokeWidth={sw} />
          <rect x="15" y="14" width="32" height="36" rx="3" fill="none" stroke="#c8b9e8" strokeWidth="1.2" />
          <path d="M28 20 a10 10 0 1 0 10 16 a8 8 0 1 1 -10 -16Z" fill="#efe2c8" stroke={O} strokeWidth="1" />
          <Sparkle x={22} y={42} s={0.7} c="#f6e3b4" />
          <Sparkle x={41} y={20} s={0.6} c="#f6e3b4" />
          <path d="M51 14 L54 16 L54 52 L51 54" fill="#e9dcc6" stroke={O} strokeWidth="1" />
        </g>
      );
  }
}

function time(l: number): ReactNode {
  switch (l) {
    case 1:
      return (
        <g>
          <path d="M18 50 C22 38 42 38 46 50Z" fill="url(#gSand)" stroke={O} strokeWidth={sw} />
          <circle cx="32" cy="32" r="3.5" fill="url(#gSand)" stroke={O} strokeWidth="1.2" />
          <Sparkle x={38} y={26} s={0.8} />
          {[24, 29, 35, 40].map((x, i) => (
            <circle key={x} cx={x} cy={46 - (i % 2) * 2} r="0.9" fill="#a98656" />
          ))}
        </g>
      );
    case 2:
      return (
        <g>
          <rect x="27" y="10" width="10" height="6" rx="2" fill="url(#gWood)" stroke={O} strokeWidth="1.2" />
          <path d="M28 16 L28 22 C20 26 18 32 18 40 C18 50 24 54 32 54 C40 54 46 50 46 40 C46 32 44 26 36 22 L36 16Z" fill="url(#gGlass)" stroke={O} strokeWidth={sw} />
          <path d="M20 42 C26 38 38 38 44 42 C44 50 40 52 32 52 C24 52 20 50 20 42Z" fill="url(#gSand)" />
          <path d="M23 30 C24 27 26 25 29 24" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </g>
      );
    case 3:
      return (
        <g>
          <rect x="16" y="8" width="32" height="6" rx="2.5" fill="url(#gWood)" stroke={O} strokeWidth={sw} />
          <rect x="16" y="50" width="32" height="6" rx="2.5" fill="url(#gWood)" stroke={O} strokeWidth={sw} />
          <path d="M20 14 C20 26 30 28 30 32 C30 36 20 38 20 50 L44 50 C44 38 34 36 34 32 C34 28 44 26 44 14Z" fill="url(#gGlass)" stroke={O} strokeWidth={sw} />
          <path d="M23 18 C24 25 30 28 31 31 L33 31 C34 28 40 25 41 18Z" fill="url(#gSand)" />
          <path d="M22 50 C24 44 30 42 32 41 C34 42 40 44 42 50Z" fill="url(#gSand)" />
          <path d="M32 31 L32 41" stroke="#d8b685" strokeWidth="1.2" strokeDasharray="1.4 1.6" />
          <path d="M19 14 L19 50 M45 14 L45 50" stroke={O} strokeWidth="2" />
        </g>
      );
    case 4:
      return (
        <g>
          <circle cx="32" cy="32" r="24" fill="url(#gGlow)" />
          <path d="M32 6 L44 26 L38 56 L26 56 L20 26Z" fill="url(#gTime)" stroke={O} strokeWidth={sw} strokeLinejoin="round" />
          <circle cx="32" cy="32" r="7" fill="#f2fbff" stroke={O} strokeWidth="1" opacity="0.9" />
          <path d="M32 32 L32 27.5 M32 32 L35 33" stroke={O} strokeWidth="1.1" strokeLinecap="round" />
          <path d="M32 6 L32 25 M20 26 L25 30" stroke="#fff" strokeWidth="1" opacity="0.7" />
        </g>
      );
    default:
      return (
        <g>
          <circle cx="32" cy="32" r="28" fill="url(#gGlow)" />
          <circle cx="32" cy="32" r="17" fill="url(#gTime)" stroke={O} strokeWidth={sw} />
          <ellipse cx="32" cy="32" rx="25" ry="8" fill="none" stroke="url(#gBrass)" strokeWidth="2.2" transform="rotate(-20 32 32)" />
          <path d="M27 24 C27 30 31 31 31 32 C31 33 27 34 27 40 L37 40 C37 34 33 33 33 32 C33 31 37 30 37 24Z" fill="#f6fbff" stroke={O} strokeWidth="1" />
          <path d="M28 38.5 C30 36 34 36 36 38.5Z" fill="url(#gSand)" />
          <Sparkle x={50} y={14} s={1} />
          <Sparkle x={13} y={46} s={0.7} />
        </g>
      );
  }
}

function generator(g: GeneratorId): ReactNode {
  switch (g) {
    case 'cart':
      return (
        <g>
          <circle cx="20" cy="50" r="6" fill="url(#gWood)" stroke={O} strokeWidth={sw} />
          <circle cx="44" cy="50" r="6" fill="url(#gWood)" stroke={O} strokeWidth={sw} />
          <path d="M8 30 L56 30 L52 46 L12 46Z" fill="url(#gSage)" stroke={O} strokeWidth={sw} strokeLinejoin="round" />
          <path d="M10 36 L54 36" stroke="#e9e1cf" strokeWidth="1.2" opacity="0.7" />
          {[16, 26, 36, 46].map((x, i) => (
            <g key={x}>
              <circle cx={x} cy={24 - (i % 2) * 3} r="6" fill={i % 2 ? 'url(#gPink)' : 'url(#gMoon)'} stroke={O} strokeWidth="1.1" />
              <circle cx={x} cy={24 - (i % 2) * 3} r="2" fill="#f6e3b4" />
            </g>
          ))}
          <path d="M20 18 C18 14 22 12 23 15 M40 16 C40 11 45 12 43 15" stroke="#5e7f58" strokeWidth="2" fill="none" />
        </g>
      );
    case 'tinker':
      return (
        <g>
          <path d="M10 26 L54 26 L54 52 C54 54 52 55 50 55 L14 55 C12 55 10 54 10 52Z" fill="url(#gWood)" stroke={O} strokeWidth={sw} />
          <path d="M8 20 C8 14 56 14 56 20 L56 26 L8 26Z" fill="#a87b62" stroke={O} strokeWidth={sw} />
          <rect x="28" y="30" width="8" height="8" rx="2" fill="url(#gBrass)" stroke={O} strokeWidth="1.2" />
          <path d={gearPath(22, 12, 7, 7, 2.4)} fill="url(#gBrass)" stroke={O} strokeWidth="1.2" />
          <path d={gearPath(38, 10, 5, 6, 2)} fill="url(#gSilver)" stroke={O} strokeWidth="1.2" />
          <path d="M14 44 L50 44" stroke="#5c3f34" strokeWidth="1.2" opacity="0.6" />
        </g>
      );
    case 'geode':
      return (
        <g>
          <path d="M8 46 C6 30 16 16 32 16 C48 16 58 30 56 46 C50 54 14 54 8 46Z" fill="#9c8f9f" stroke={O} strokeWidth={sw} />
          <path d="M14 44 C13 32 21 23 32 23 C43 23 51 32 50 44 C44 49 20 49 14 44Z" fill="#5c4a7e" stroke={O} strokeWidth="1.2" />
          <g transform="translate(0 -2)">
            {crystalShape(24, 46, 5, 16)}
            {crystalShape(40, 46, 5, 18)}
            {crystalShape(32, 47, 7, 24)}
          </g>
          <Sparkle x={47} y={22} s={0.8} />
        </g>
      );
    case 'desk':
      return (
        <g>
          <rect x="8" y="34" width="48" height="6" rx="2" fill="url(#gWood)" stroke={O} strokeWidth={sw} />
          <path d="M12 40 L12 56 M52 40 L52 56" stroke={O} strokeWidth="3" strokeLinecap="round" />
          <path d="M14 34 L28 28 L44 32 L30 36Z" fill="url(#gPaper)" stroke={O} strokeWidth="1.2" />
          <path d="M40 22 C40 18 50 18 50 22 L50 32 L40 32Z" fill="url(#gNight)" stroke={O} strokeWidth="1.3" />
          <path d="M45 24 C42 14 36 8 30 6 C34 12 40 18 45 24Z" fill="#f4ecdc" stroke={O} strokeWidth="1.1" />
        </g>
      );
  }
}

const DRAW = { bloom, clock, crystal, key, ink, time };

export const ItemIcon = memo(function ItemIcon({ item, size = 48 }: { item: ItemKey; size?: number }) {
  const { chain, level } = parse(item);
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className="item-svg">
      <Ground />
      <g transform="translate(32 33) scale(1.14) translate(-32 -33)">{DRAW[chain](level)}</g>
    </svg>
  );
});

export const GenIcon = memo(function GenIcon({ gen, size = 48 }: { gen: GeneratorId; size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className="item-svg">
      <Ground />
      {generator(gen)}
    </svg>
  );
});
