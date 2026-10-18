import { useId, type ReactNode } from "react";
import type { ArtStyle, CardKind, Palette } from "@/lib/content/types";

/**
 * Procedural artwork. Every universe has its own scene language and every
 * card a deterministic composition derived from its seed, so placeholders
 * are coherent, distinctive and never broken. When real artwork is
 * uploaded in Studio it replaces this layer (see TradingCard).
 */

type RF = () => number;

function rngf(seed: number): RF {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const range = (r: RF, a: number, b: number) => a + r() * (b - a);
const pick = <T,>(r: RF, xs: T[]) => xs[Math.floor(r() * xs.length)]!;
const times = <T,>(n: number, f: (i: number) => T) => Array.from({ length: n }, (_, i) => f(i));

interface Ctx {
  r: RF;
  p: Palette;
  id: string;
  w: number;
  h: number;
  seed: number;
}

/* ------------------------------------------------------------------ */
/* Scenes                                                               */
/* ------------------------------------------------------------------ */

function dusk({ r, p, id, w, h }: Ctx) {
  const hy = h * range(r, 0.6, 0.7);
  const sx = w * range(r, 0.3, 0.7);
  const sr = w * range(r, 0.26, 0.38);
  const [gold, orange, pink, violet] = p.art;
  return (
    <>
      <defs>
        <linearGradient id={`${id}sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={violet} />
          <stop offset="0.45" stopColor={pink} />
          <stop offset="0.8" stopColor={orange} />
          <stop offset="1" stopColor={gold} />
        </linearGradient>
        <radialGradient id={`${id}sun`}>
          <stop offset="0" stopColor="#fff6d8" />
          <stop offset="0.6" stopColor={gold} />
          <stop offset="1" stopColor={orange} stopOpacity="0" />
        </radialGradient>
        <clipPath id={`${id}sc`}>
          <circle cx={sx} cy={hy} r={sr} />
        </clipPath>
      </defs>
      <rect width={w} height={h} fill={`url(#${id}sky)`} />
      <circle cx={sx} cy={hy} r={sr * 1.9} fill={`url(#${id}sun)`} opacity="0.55" />
      <circle cx={sx} cy={hy} r={sr} fill={gold} />
      <g clipPath={`url(#${id}sc)`}>
        {times(6, (i) => (
          <rect key={i} x={0} y={hy - sr * 0.1 - i * sr * 0.17} width={w} height={2 + i * 2.2} fill={pink} opacity="0.55" />
        ))}
      </g>
      <g className="nx-drift">
        {times(5, (i) => (
          <ellipse key={i} cx={range(r, 0, w)} cy={range(r, h * 0.1, hy * 0.8)} rx={range(r, 40, 110)} ry={range(r, 4, 9)} fill="#ffe2c4" opacity={range(r, 0.15, 0.35)} />
        ))}
      </g>
      <g fill={violet}>
        {times(14, (i) => {
          const bw = range(r, 14, 38);
          const bh = range(r, 30, 150);
          const x = (i / 14) * w + range(r, -10, 10);
          return (
            <g key={i}>
              <rect x={x} y={hy - bh} width={bw} height={bh + 2} />
              {r() > 0.5 && <path d={`M${x} ${hy - bh} L${x + bw / 2} ${hy - bh - range(r, 10, 40)} L${x + bw} ${hy - bh}Z`} />}
            </g>
          );
        })}
      </g>
      <path d={`M0 ${hy * 0.78} Q ${w / 2} ${hy * 0.9} ${w} ${hy * 0.74}`} stroke="#2a1630" strokeWidth="1" fill="none" opacity="0.6" />
      {times(9, (i) => {
        const t = (i + 1) / 10;
        const y = hy * 0.78 + Math.sin(t * Math.PI) * hy * 0.07 - (hy * 0.04) * t;
        return <circle key={i} className="nx-twinkle" style={{ animationDelay: `${i * 0.3}s` }} cx={t * w} cy={y + 6} r="3.5" fill="#ffe7a3" />;
      })}
      <rect y={hy} width={w} height={h - hy} fill={violet} />
      {times(7, (i) => (
        <rect key={i} x={sx - range(r, 20, 90)} y={hy + 6 + i * 11} width={range(r, 40, 180)} height="2.5" fill={gold} opacity={0.5 - i * 0.06} />
      ))}
    </>
  );
}

function macro({ r, p, id, w, h }: Ctx) {
  const [red, yellow, green, blue] = p.art;
  const floor = h * 0.72;
  return (
    <>
      <defs>
        <linearGradient id={`${id}bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4a3a28" />
          <stop offset="1" stopColor="#2a2117" />
        </linearGradient>
        <filter id={`${id}blur`}>
          <feGaussianBlur stdDeviation="9" />
        </filter>
        <filter id={`${id}felt`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" />
          <feColorMatrix values="0 0 0 0 1  0 0 0 0 0.9  0 0 0 0 0.7  0 0 0 0.08 0" />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
      </defs>
      <rect width={w} height={h} fill={`url(#${id}bg)`} />
      <polygon points={`${w * 0.55},0 ${w},0 ${w},${h * 0.6}`} fill="#fff1c9" opacity="0.12" />
      <g filter={`url(#${id}blur)`}>
        {times(7, (i) => (
          <circle key={i} cx={range(r, 0, w)} cy={range(r, 0, floor)} r={range(r, 20, 70)} fill={pick(r, [red!, yellow!, green!, blue!])} opacity="0.35" />
        ))}
      </g>
      {/* A giant button or a thread spool looming in the background */}
      {r() > 0.5 ? (
        <g opacity="0.85" transform={`translate(${range(r, w * 0.15, w * 0.85)} ${floor - range(r, 70, 120)})`}>
          <circle r="92" fill={pick(r, [red!, blue!, green!])} />
          <circle r="76" fill="none" stroke="#000" strokeOpacity="0.18" strokeWidth="6" />
          {[[-20, -20], [20, -20], [-20, 20], [20, 20]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="9" fill="#2a2117" />
          ))}
        </g>
      ) : (
        <g opacity="0.85" transform={`translate(${range(r, w * 0.15, w * 0.85)} ${floor - 150})`}>
          <rect x="-70" y="0" width="140" height="18" rx="4" fill="#c99a62" />
          <rect x="-55" y="18" width="110" height="114" fill={pick(r, [red!, blue!, green!])} />
          {times(10, (i) => (
            <line key={i} x1="-55" x2="55" y1={24 + i * 11} y2={28 + i * 11} stroke="#000" strokeOpacity="0.15" strokeWidth="2" />
          ))}
          <rect x="-70" y="132" width="140" height="18" rx="4" fill="#c99a62" />
        </g>
      )}
      <rect y={floor} width={w} height={h - floor} fill="#7a5532" />
      {times(5, (i) => (
        <line key={i} x1="0" x2={w} y1={floor + 8 + i * i * 6} y2={floor + 8 + i * i * 6} stroke="#4a3220" strokeWidth="2" />
      ))}
      <rect width={w} height={h} filter={`url(#${id}felt)`} fill="#fff" />
      <g className="nx-drift">
        {times(26, (i) => (
          <circle key={i} cx={range(r, 0, w)} cy={range(r, 0, h)} r={range(r, 0.8, 2.4)} fill="#fff2cc" opacity={range(r, 0.3, 0.8)} />
        ))}
      </g>
    </>
  );
}

function grid({ r, p, id, w, h }: Ctx) {
  const [mag, cyan, yellow, purple] = p.art;
  const hy = h * 0.52;
  return (
    <>
      <defs>
        <linearGradient id={`${id}bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#07060f" />
          <stop offset="0.5" stopColor="#1d0b3a" />
          <stop offset="1" stopColor="#07060f" />
        </linearGradient>
        <filter id={`${id}glow`}>
          <feGaussianBlur stdDeviation="2.5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect width={w} height={h} fill={`url(#${id}bg)`} />
      <g fill="#120c26">
        {times(16, (i) => {
          const bw = range(r, 18, 40);
          const bh = range(r, 60, hy * 0.9);
          const x = (i / 16) * w + range(r, -8, 8);
          return (
            <g key={i}>
              <rect x={x} y={hy - bh} width={bw} height={bh} />
              {times(Math.floor(bh / 14), (k) =>
                r() > 0.55 ? <rect key={k} x={x + 4 + Math.floor(r() * 3) * 9} y={hy - bh + 6 + k * 14} width="4" height="5" fill={r() > 0.5 ? cyan : mag} opacity="0.75" /> : null,
              )}
            </g>
          );
        })}
      </g>
      <rect y={hy} width={w} height={h - hy} fill="#0a0716" />
      <g stroke={mag} strokeWidth="1.4" filter={`url(#${id}glow)`} opacity="0.85">
        {times(13, (i) => (
          <line key={i} x1={w / 2} y1={hy} x2={(i - 6) * w * 0.32 + w / 2} y2={h} />
        ))}
        {times(8, (i) => {
          const y = hy + Math.pow((i + 1) / 8, 2.2) * (h - hy);
          return <line key={`h${i}`} x1="0" x2={w} y1={y} y2={y} />;
        })}
      </g>
      <g filter={`url(#${id}glow)`} className="nx-streak">
        {times(7, (i) => {
          const y = range(r, h * 0.3, h * 0.9);
          const x = range(r, -w * 0.3, w * 0.4);
          return <line key={i} x1={x} y1={y} x2={x + range(r, 120, 320)} y2={y - range(r, 20, 60)} stroke={pick(r, [mag!, cyan!, yellow!])} strokeWidth={range(r, 1.5, 4)} strokeLinecap="round" opacity="0.9" />;
        })}
      </g>
      <rect width={w} height={h} fill={purple} opacity="0.08" />
    </>
  );
}

function deco({ r, p, id, w, h }: Ctx) {
  const [gold, teal, ruby, deep] = p.art;
  const cx = w / 2;
  const by = h * range(r, 0.62, 0.72);
  return (
    <>
      <defs>
        <radialGradient id={`${id}bg`} cx="0.5" cy="0.7" r="0.8">
          <stop offset="0" stopColor="#24433a" />
          <stop offset="1" stopColor="#07110e" />
        </radialGradient>
        <pattern id={`${id}chk`} width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="skewX(-30)">
          <rect width="20" height="20" fill={gold} opacity="0.18" />
          <rect x="20" y="20" width="20" height="20" fill={gold} opacity="0.18" />
        </pattern>
      </defs>
      <rect width={w} height={h} fill={`url(#${id}bg)`} />
      <g opacity="0.55">
        {times(28, (i) => {
          const a = Math.PI + (i / 27) * Math.PI;
          const a2 = a + Math.PI / 80;
          const R = h * 1.2;
          return <path key={i} d={`M${cx} ${by} L${cx + Math.cos(a) * R} ${by + Math.sin(a) * R} L${cx + Math.cos(a2) * R} ${by + Math.sin(a2) * R}Z`} fill={i % 2 ? gold : teal} opacity={i % 2 ? 0.5 : 0.22} />;
        })}
      </g>
      {times(4, (i) => {
        const aw = w * (0.88 - i * 0.18);
        const top = h * (0.08 + i * 0.08);
        return (
          <path
            key={i}
            d={`M${cx - aw / 2} ${by} V${top + aw / 2} A${aw / 2} ${aw / 2} 0 0 1 ${cx + aw / 2} ${top + aw / 2} V${by}`}
            fill="none"
            stroke={gold}
            strokeWidth={i === 0 ? 3 : 1.4}
            opacity={0.9 - i * 0.15}
          />
        );
      })}
      <rect y={by} width={w} height={h - by} fill={deep} />
      <rect y={by} width={w} height={h - by} fill={`url(#${id}chk)`} />
      <line x1="0" x2={w} y1={by} y2={by} stroke={gold} strokeWidth="2" />
      <g transform={`translate(${cx} ${h * 0.12})`} className="nx-sway">
        <line y1={-h} y2="0" stroke={gold} strokeWidth="1" />
        {times(5, (i) => (
          <circle key={i} cx={(i - 2) * 14} cy={10 + Math.abs(i - 2) * -3} r="3" fill="#fff3c4" />
        ))}
      </g>
      <rect width={w} height={h} fill={ruby} opacity="0.06" />
    </>
  );
}

function pop({ r, p, id, w, h }: Ctx) {
  const [yellow, coral, mint, blue] = p.art;
  const bg = pick(r, [yellow!, coral!, mint!, blue!]);
  const others = [yellow!, coral!, mint!, blue!].filter((c) => c !== bg);
  return (
    <>
      <defs>
        <pattern id={`${id}dots`} width="12" height="12" patternUnits="userSpaceOnUse">
          <circle cx="6" cy="6" r="2.6" fill="#141018" />
        </pattern>
        <linearGradient id={`${id}fade`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="1" />
          <stop offset="0.6" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id={`${id}m`}>
          <rect width={w} height={h} fill={`url(#${id}fade)`} />
        </mask>
      </defs>
      <rect width={w} height={h} fill={bg} />
      <rect width={w} height={h} fill={`url(#${id}dots)`} opacity="0.22" mask={`url(#${id}m)`} />
      {times(4, (i) => {
        const x = range(r, 0, w);
        const y = range(r, 0, h);
        const s = range(r, 50, 120);
        const c = pick(r, others);
        return r() > 0.5 ? (
          <g key={i}>
            <circle cx={x + 8} cy={y + 8} r={s / 2} fill="#141018" />
            <circle cx={x} cy={y} r={s / 2} fill={c} stroke="#141018" strokeWidth="4" />
          </g>
        ) : (
          <g key={i} transform={`rotate(${range(r, -30, 30)} ${x} ${y})`}>
            <rect x={x - s / 2 + 8} y={y - s / 4 + 8} width={s} height={s / 2} rx="10" fill="#141018" />
            <rect x={x - s / 2} y={y - s / 4} width={s} height={s / 2} rx="10" fill={c} stroke="#141018" strokeWidth="4" />
          </g>
        );
      })}
      <path
        d={`M0 ${h * 0.82} ${times(9, (i) => `L${(i + 0.5) * (w / 9)} ${h * (i % 2 ? 0.82 : 0.76)}`).join(" ")} L${w} ${h * 0.82} V${h} H0Z`}
        fill="#141018"
      />
      <g className="nx-wobble">
        {times(6, (i) => (
          <path key={i} d={`M${range(r, 0, w)} ${range(r, 0, h * 0.7)} l8 -14 l8 14 l-8 -4z`} fill="#fffaf0" stroke="#141018" strokeWidth="2" />
        ))}
      </g>
    </>
  );
}

function abyss({ r, p, id, w, h }: Ctx) {
  const [cyan, violet, pink, deep] = p.art;
  return (
    <>
      <defs>
        <linearGradient id={`${id}bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={deep} />
          <stop offset="0.5" stopColor="#031322" />
          <stop offset="1" stopColor="#01050b" />
        </linearGradient>
        <radialGradient id={`${id}glow`}>
          <stop offset="0" stopColor={cyan} stopOpacity="0.9" />
          <stop offset="1" stopColor={cyan} stopOpacity="0" />
        </radialGradient>
        <filter id={`${id}soft`}>
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
      </defs>
      <rect width={w} height={h} fill={`url(#${id}bg)`} />
      {times(4, (i) => {
        const x = range(r, 0, w);
        return <polygon key={i} points={`${x},0 ${x + 30},0 ${x + range(r, 60, 140)},${h} ${x - range(r, 20, 60)},${h}`} fill="#bff7ff" opacity="0.035" />;
      })}
      {times(3, (i) => {
        const x = range(r, w * 0.1, w * 0.9);
        const y = range(r, h * 0.12, h * 0.55);
        const s = range(r, 22, 46);
        const c = pick(r, [cyan!, violet!, pink!]);
        return (
          <g key={i} className="nx-bob" style={{ animationDelay: `${i * 0.8}s` }}>
            <circle cx={x} cy={y} r={s * 2.2} fill={`url(#${id}glow)`} opacity="0.35" />
            <path d={`M${x - s} ${y} A${s} ${s * 0.85} 0 0 1 ${x + s} ${y} Q${x} ${y + s * 0.25} ${x - s} ${y}Z`} fill={c} opacity="0.75" />
            {times(5, (k) => {
              const tx = x - s * 0.7 + k * s * 0.35;
              return <path key={k} d={`M${tx} ${y + 4} q ${range(r, -10, 10)} ${s} 0 ${s * 1.6} t 0 ${s * 1.4}`} stroke={c} strokeWidth="1.4" fill="none" opacity="0.6" />;
            })}
          </g>
        );
      })}
      <g filter={`url(#${id}soft)`} className="nx-drift">
        {times(60, (i) => (
          <circle key={i} cx={range(r, 0, w)} cy={range(r, 0, h)} r={range(r, 0.6, 2.2)} fill={r() > 0.8 ? pink : cyan} opacity={range(r, 0.2, 0.9)} />
        ))}
      </g>
      <path d={`M0 ${h} Q ${w * 0.3} ${h * 0.86} ${w * 0.55} ${h * 0.92} T ${w} ${h * 0.88} V${h}Z`} fill="#010409" />
    </>
  );
}

function road({ r, p, id, w, h }: Ctx) {
  const [coral, amber, rose, plum] = p.art;
  const hy = h * 0.5;
  const vx = w * range(r, 0.42, 0.58);
  return (
    <>
      <defs>
        <linearGradient id={`${id}sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={plum} />
          <stop offset="0.55" stopColor={rose} />
          <stop offset="0.85" stopColor={coral} />
          <stop offset="1" stopColor={amber} />
        </linearGradient>
        <filter id={`${id}grain`}>
          <feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="1" seed="3" />
          <feColorMatrix values="0 0 0 0 1  0 0 0 0 0.9  0 0 0 0 0.8  0 0 0 0.12 0" />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
      </defs>
      <rect width={w} height={hy + 2} fill={`url(#${id}sky)`} />
      <circle cx={vx + range(r, -80, 80)} cy={hy - 10} r={range(r, 30, 55)} fill={amber} opacity="0.9" />
      <path d={`M0 ${hy} L0 ${hy - 40} L${w * 0.12} ${hy - 40} L${w * 0.16} ${hy - 70} L${w * 0.3} ${hy - 70} L${w * 0.34} ${hy - 30} L${w * 0.4} ${hy}Z`} fill="#3a1c2c" />
      <path d={`M${w} ${hy} L${w} ${hy - 55} L${w * 0.86} ${hy - 55} L${w * 0.8} ${hy - 25} L${w * 0.66} ${hy - 25} L${w * 0.62} ${hy}Z`} fill="#3a1c2c" />
      <rect y={hy} width={w} height={h - hy} fill="#2a1418" />
      <polygon points={`${vx - 4},${hy} ${vx + 4},${hy} ${w * 0.95},${h} ${w * 0.05},${h}`} fill="#161013" />
      {times(7, (i) => {
        const t0 = Math.pow(i / 7, 1.8);
        const t1 = Math.pow((i + 0.5) / 7, 1.8);
        const y0 = hy + t0 * (h - hy);
        const y1 = hy + t1 * (h - hy);
        return <polygon key={i} points={`${vx - 0.5 - t0 * 4},${y0} ${vx + 0.5 + t0 * 4},${y0} ${vx + 0.5 + t1 * 4},${y1} ${vx - 0.5 - t1 * 4},${y1}`} fill={amber} />;
      })}
      <g transform={`translate(${r() > 0.5 ? w * 0.72 : w * 0.08} ${hy - 110})`} className="nx-flicker">
        <rect width="78" height="44" rx="6" fill="#1a0c12" stroke={rose} strokeWidth="2.5" />
        <rect x="10" y="12" width="58" height="6" rx="3" fill={rose} />
        <rect x="10" y="24" width="38" height="6" rx="3" fill={amber} />
        <rect x="36" y="44" width="5" height="70" fill="#1a0c12" />
      </g>
      <rect width={w} height={h} filter={`url(#${id}grain)`} fill="#fff" />
    </>
  );
}

function staticScene({ r, p, id, w, h }: Ctx) {
  const [green, amber, white] = p.art;
  const tx = w * range(r, 0.25, 0.75);
  return (
    <>
      <defs>
        <pattern id={`${id}scan`} width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="4" height="2" fill="#000" opacity="0.45" />
        </pattern>
        <filter id={`${id}noise`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={Math.floor(r() * 100)} />
          <feColorMatrix values="0 0 0 0 0.6  0 0 0 0 1  0 0 0 0 0.6  0 0 0 0.16 0" />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
        <radialGradient id={`${id}vig`} cx="0.5" cy="0.5" r="0.75">
          <stop offset="0.55" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.85" />
        </radialGradient>
      </defs>
      <rect width={w} height={h} fill="#06100a" />
      <g fill="#0b1a10">
        {times(22, (i) => {
          const x = (i / 22) * w + range(r, -8, 8);
          const th = range(r, 80, 190);
          return <path key={i} d={`M${x} ${h} L${x + 14} ${h - th} L${x + 28} ${h}Z`} />;
        })}
      </g>
      <g stroke={green} strokeWidth="1.2" fill="none" opacity="0.8">
        <path d={`M${tx - 40} ${h * 0.86} L${tx} ${h * 0.18} L${tx + 40} ${h * 0.86}`} />
        {times(9, (i) => {
          const y = h * 0.18 + (i + 1) * ((h * 0.68) / 10);
          const half = ((y - h * 0.18) / (h * 0.68)) * 40;
          return <path key={i} d={`M${tx - half} ${y} L${tx + half} ${y + (h * 0.068)} M${tx + half} ${y} L${tx - half} ${y + h * 0.068}`} opacity="0.6" />;
        })}
      </g>
      <circle cx={tx} cy={h * 0.18} r="5" fill="#ff3b30" className="nx-blink" />
      <circle cx={tx} cy={h * 0.18} r="16" fill="#ff3b30" opacity="0.25" className="nx-blink" />
      <polyline
        className="nx-wave"
        points={times(60, (i) => `${(i / 59) * w},${h * 0.5 + Math.sin(i * 0.7 + r() * 2) * range(r, 2, 28) * (i % 7 === 0 ? 2.2 : 1)}`).join(" ")}
        fill="none"
        stroke={amber}
        strokeWidth="1.6"
        opacity="0.9"
      />
      <text x="14" y="26" fill={green} fontFamily="monospace" fontSize="13" opacity="0.85">
        {`87.9 MHz  02:${String(Math.floor(r() * 60)).padStart(2, "0")}`}
      </text>
      <rect width={w} height={h} fill={`url(#${id}scan)`} />
      <rect width={w} height={h} filter={`url(#${id}noise)`} fill="#fff" className="nx-noise" />
      <rect y={range(r, 0, h)} width={w} height="10" fill={white} opacity="0.05" className="nx-roll" />
      <rect width={w} height={h} fill={`url(#${id}vig)`} />
    </>
  );
}

function botanical({ r, p, id, w, h }: Ctx) {
  const [lime, green, pink, cream] = p.art;
  const leaf = (x: number, y: number, s: number, a: number, c: string, k: number) => (
    <g key={k} transform={`translate(${x} ${y}) rotate(${a}) scale(${s})`}>
      <path d="M0 0 C 30 -20 60 -20 100 0 C 60 20 30 20 0 0Z" fill={c} opacity="0.92" />
      <path d="M0 0 L100 0" stroke={cream} strokeWidth="1.2" opacity="0.45" />
      {times(5, (i) => (
        <path key={i} d={`M${18 + i * 16} 0 l10 ${i % 2 ? 8 : -8}`} stroke={cream} strokeWidth="0.8" opacity="0.35" />
      ))}
    </g>
  );
  return (
    <>
      <defs>
        <radialGradient id={`${id}bg`} cx="0.5" cy="0.35" r="0.9">
          <stop offset="0" stopColor="#2b4a2f" />
          <stop offset="1" stopColor="#081008" />
        </radialGradient>
        <linearGradient id={`${id}mist`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={cream} stopOpacity="0" />
          <stop offset="1" stopColor={cream} stopOpacity="0.22" />
        </linearGradient>
      </defs>
      <rect width={w} height={h} fill={`url(#${id}bg)`} />
      <g stroke={cream} strokeOpacity="0.16" fill="none" strokeWidth="2">
        <path d={`M${w * 0.08} ${h} V${h * 0.35} A${w * 0.42} ${w * 0.42} 0 0 1 ${w * 0.92} ${h * 0.35} V${h}`} />
        {times(5, (i) => (
          <line key={i} x1={w * (0.08 + (i + 1) * 0.14)} x2={w * (0.08 + (i + 1) * 0.14)} y1={h * 0.12} y2={h} />
        ))}
        {times(5, (i) => (
          <line key={i} x1={w * 0.08} x2={w * 0.92} y1={h * (0.35 + i * 0.14)} y2={h * (0.35 + i * 0.14)} />
        ))}
      </g>
      <g className="nx-sway">
        {times(14, (i) => leaf(range(r, -40, w), range(r, h * 0.2, h), range(r, 0.6, 1.6), range(r, -160, -20), pick(r, [lime!, green!, "#3d7a48", "#5aa860"]), i))}
      </g>
      {times(5, (i) => {
        const x = range(r, 20, w - 20);
        const y = range(r, h * 0.2, h * 0.8);
        return (
          <g key={i} transform={`translate(${x} ${y})`}>
            {times(6, (k) => (
              <ellipse key={k} rx="5" ry="11" transform={`rotate(${k * 60}) translate(0 -9)`} fill={pink} opacity="0.9" />
            ))}
            <circle r="4" fill={cream} />
          </g>
        );
      })}
      <rect width={w} height={h} fill={`url(#${id}mist)`} />
      <g className="nx-drift">
        {times(20, (i) => (
          <circle key={i} cx={range(r, 0, w)} cy={range(r, 0, h)} r={range(r, 0.8, 2)} fill={cream} opacity={range(r, 0.2, 0.6)} />
        ))}
      </g>
    </>
  );
}

function lantern({ r, p, id, w, h }: Ctx) {
  const [amber, coral, butter, indigo] = p.art;
  const mx = w * range(r, 0.25, 0.75);
  const my = h * range(r, 0.16, 0.28);
  return (
    <>
      <defs>
        <linearGradient id={`${id}bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0f0a1f" />
          <stop offset="1" stopColor={indigo} />
        </linearGradient>
        <radialGradient id={`${id}moon`}>
          <stop offset="0" stopColor="#fff8e0" />
          <stop offset="0.7" stopColor={butter} />
          <stop offset="1" stopColor={butter} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}lg`}>
          <stop offset="0" stopColor={amber} stopOpacity="0.8" />
          <stop offset="1" stopColor={amber} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width={w} height={h} fill={`url(#${id}bg)`} />
      {times(30, (i) => (
        <circle key={i} cx={range(r, 0, w)} cy={range(r, 0, h * 0.5)} r={range(r, 0.5, 1.4)} fill="#fff" opacity={range(r, 0.3, 0.9)} />
      ))}
      <circle cx={mx} cy={my} r={w * 0.3} fill={`url(#${id}moon)`} opacity="0.35" />
      <circle cx={mx} cy={my} r={w * 0.16} fill="#fff3d0" />
      {times(4, (i) => (
        <circle key={i} cx={mx + range(r, -30, 30)} cy={my + range(r, -30, 30)} r={range(r, 4, 11)} fill={butter} opacity="0.55" />
      ))}
      {times(3, (row) => {
        const y0 = h * (0.34 + row * 0.13);
        const sag = range(r, 20, 45);
        const n = 6;
        return (
          <g key={row} className="nx-sway" style={{ animationDelay: `${row * 0.6}s` }}>
            <path d={`M-10 ${y0} Q ${w / 2} ${y0 + sag * 2} ${w + 10} ${y0}`} stroke="#000" strokeOpacity="0.5" fill="none" strokeWidth="1.2" />
            {times(n, (i) => {
              const t = (i + 0.5) / n;
              const x = -10 + t * (w + 20);
              const y = y0 + 2 * sag * 2 * t * (1 - t);
              const c = pick(r, [amber!, coral!, amber!, butter!]);
              return (
                <g key={i} transform={`translate(${x} ${y})`}>
                  <circle r="26" fill={`url(#${id}lg)`} />
                  <rect x="-9" y="2" width="18" height="24" rx="8" fill={c} />
                  <rect x="-6" y="0" width="12" height="3" fill="#3a2a1a" />
                  <line x1="-9" x2="9" y1="14" y2="14" stroke="#000" strokeOpacity="0.25" />
                </g>
              );
            })}
          </g>
        );
      })}
      <g fill="#120c22">
        {times(5, (i) => {
          const x = (i / 5) * w - 10;
          const sw = w / 5 + 20;
          const y = h * range(r, 0.74, 0.8);
          return <path key={i} d={`M${x} ${h} V${y} L${x + sw / 2} ${y - 34} L${x + sw} ${y} V${h}Z`} />;
        })}
      </g>
      <g className="nx-steam" opacity="0.35">
        {times(3, (i) => (
          <path key={i} d={`M${w * (0.2 + i * 0.3)} ${h * 0.78} c -10 -20 10 -30 0 -50 s 10 -30 0 -50`} stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
        ))}
      </g>
    </>
  );
}

function orbit({ r, p, id, w, h }: Ctx) {
  const [orange, teal, yellow, rose] = p.art;
  const px = w * range(r, 0.3, 0.7);
  const py = h * range(r, 0.25, 0.4);
  const pr = w * range(r, 0.14, 0.22);
  return (
    <>
      <defs>
        <clipPath id={`${id}pl`}>
          <circle cx={px} cy={py} r={pr} />
        </clipPath>
        <pattern id={`${id}ht`} width="8" height="8" patternUnits="userSpaceOnUse">
          <circle cx="4" cy="4" r="1.6" fill="#000" opacity="0.35" />
        </pattern>
      </defs>
      <rect width={w} height={h} fill="#0b0d1a" />
      {times(50, (i) => (
        <circle key={i} className={i % 5 === 0 ? "nx-twinkle" : undefined} cx={range(r, 0, w)} cy={range(r, 0, h)} r={range(r, 0.5, 1.6)} fill="#fdf6e3" />
      ))}
      <g transform={`rotate(-25 ${w / 2} ${h})`} opacity="0.95">
        {[orange, yellow, teal, rose].map((c, i) => (
          <rect key={i} x={-w} y={h * 0.78 + i * 16} width={w * 3} height="12" fill={c} />
        ))}
      </g>
      <ellipse cx={px} cy={py} rx={pr * 2.1} ry={pr * 0.5} fill="none" stroke={yellow} strokeWidth="5" opacity="0.6" transform={`rotate(-18 ${px} ${py})`} />
      <circle cx={px} cy={py} r={pr} fill={teal} />
      <g clipPath={`url(#${id}pl)`}>
        {times(5, (i) => (
          <rect key={i} x={px - pr} y={py - pr + i * pr * 0.42} width={pr * 2} height={pr * 0.18} fill={orange} opacity="0.65" />
        ))}
        <circle cx={px + pr * 0.4} cy={py + pr * 0.3} r={pr} fill="#000" opacity="0.25" />
        <rect x={px - pr} y={py - pr} width={pr * 2} height={pr * 2} fill={`url(#${id}ht)`} />
      </g>
      <path d={`M${px - pr * 2.1} ${py} A${pr * 2.1} ${pr * 0.5} 0 0 0 ${px + pr * 2.1} ${py}`} fill="none" stroke={yellow} strokeWidth="5" transform={`rotate(-18 ${px} ${py})`} />
      {times(2, (i) => (
        <ellipse key={i} cx={w / 2} cy={h * 0.55} rx={w * (0.6 + i * 0.25)} ry={h * (0.12 + i * 0.05)} fill="none" stroke="#fdf6e3" strokeOpacity="0.15" strokeDasharray="4 6" />
      ))}
      <circle cx={w * range(r, 0.1, 0.9)} cy={h * 0.55} r="4" fill={orange} className="nx-orbit" />
    </>
  );
}

function portrait({ r, p, id, w, h }: Ctx) {
  const [ruby, gold, green, navy] = p.art;
  const ox = w / 2;
  const oy = h * 0.45;
  return (
    <>
      <defs>
        <pattern id={`${id}dam`} width="48" height="48" patternUnits="userSpaceOnUse">
          <path d="M24 4 C 34 14 34 20 24 24 C 14 20 14 14 24 4Z M24 44 C 34 34 34 28 24 24 C 14 28 14 34 24 44Z M4 24 C 14 14 20 14 24 24 C 20 34 14 34 4 24Z M44 24 C 34 14 28 14 24 24 C 28 34 34 34 44 24Z" fill={gold} opacity="0.09" />
        </pattern>
        <radialGradient id={`${id}cand`} cx={range(r, 0.2, 0.8)} cy="0.35" r="0.7">
          <stop offset="0" stopColor="#ffd9a0" stopOpacity="0.5" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}oval`} cx="0.4" cy="0.35" r="0.8">
          <stop offset="0" stopColor={pick(r, [green!, navy!, ruby!])} />
          <stop offset="1" stopColor="#0a0506" />
        </radialGradient>
      </defs>
      <rect width={w} height={h} fill="#1a0b0e" />
      <rect width={w} height={h} fill={`url(#${id}dam)`} />
      <rect width={w} height={h} fill={ruby} opacity="0.25" />
      <ellipse cx={ox} cy={oy} rx={w * 0.38} ry={h * 0.36} fill={`url(#${id}oval)`} />
      <ellipse cx={ox} cy={oy} rx={w * 0.38} ry={h * 0.36} fill="none" stroke={gold} strokeWidth="7" />
      <ellipse cx={ox} cy={oy} rx={w * 0.38 + 9} ry={h * 0.36 + 9} fill="none" stroke={gold} strokeWidth="1.5" opacity="0.7" />
      {times(12, (i) => {
        const a = (i / 12) * Math.PI * 2;
        return <circle key={i} cx={ox + Math.cos(a) * (w * 0.38 + 4)} cy={oy + Math.sin(a) * (h * 0.36 + 4)} r="3" fill={gold} />;
      })}
      <rect width={w} height={h} fill={`url(#${id}cand)`} className="nx-flicker" />
    </>
  );
}

const SCENES: Record<ArtStyle, (c: Ctx) => ReactNode> = {
  dusk,
  macro,
  grid,
  deco,
  pop,
  abyss,
  road,
  static: staticScene,
  botanical,
  lantern,
  orbit,
  portrait,
};

/* ------------------------------------------------------------------ */
/* Subjects                                                             */
/* ------------------------------------------------------------------ */

function subject(kind: CardKind, { r, p, id, w, h }: Ctx, style: ArtStyle): ReactNode {
  const cx = w / 2 + range(r, -w * 0.08, w * 0.08);
  const base = style === "portrait" ? h * 0.8 : h * 0.86;
  const ink = style === "pop" ? "#141018" : "#06040a";
  const rim = p.accent;
  const glow = (
    <defs>
      <radialGradient id={`${id}sg`}>
        <stop offset="0" stopColor={p.accent2} stopOpacity="0.95" />
        <stop offset="1" stopColor={p.accent2} stopOpacity="0" />
      </radialGradient>
      <filter id={`${id}rim`}>
        <feGaussianBlur stdDeviation="2" result="b" />
        <feMerge>
          <feMergeNode in="b" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );
  switch (kind) {
    case "character": {
      const s = range(r, 0.95, 1.15) * (w / 400);
      const hair = Math.floor(r() * 4);
      const tilt = range(r, -6, 6);
      const hand = r() > 0.5 ? 1 : -1;
      return (
        <g>
          {glow}
          <g transform={`translate(${cx} ${base}) scale(${s}) rotate(${tilt})`}>
            <circle cx={hand * 92} cy={-120} r="46" fill={`url(#${id}sg)`} className="nx-pulse" />
            <path d="M-130 0 C -125 -90 -80 -120 -40 -130 L 40 -130 C 80 -120 125 -90 130 0Z" fill={ink} />
            <rect x="-22" y="-160" width="44" height="40" fill={ink} />
            <ellipse cx="0" cy="-205" rx="52" ry="62" fill={ink} />
            {hair === 0 && <circle cx="0" cy="-270" r="26" fill={ink} />}
            {hair === 1 && <path d="M-55 -215 C -70 -120 -60 -90 -80 -60 L -40 -130Z M55 -215 C 70 -120 60 -90 80 -60 L 40 -130Z" fill={ink} />}
            {hair === 2 && <path d="M-80 -232 L 80 -232 L 60 -250 C 40 -300 -40 -300 -60 -250Z" fill={ink} />}
            {hair === 3 && <path d="M-50 -250 L -30 -300 L -10 -262 L 10 -305 L 25 -262 L 50 -290 L 52 -230Z" fill={ink} />}
            <path d="M-52 -205 C -52 -250 -20 -268 0 -267" stroke={rim} strokeWidth="3" fill="none" filter={`url(#${id}rim)`} opacity="0.9" />
            <path d="M-128 -4 C -120 -80 -84 -112 -42 -126" stroke={rim} strokeWidth="3" fill="none" filter={`url(#${id}rim)`} opacity="0.8" />
            <circle cx={hand * 92} cy={-120} r="9" fill="#fff" opacity="0.95" />
          </g>
        </g>
      );
    }
    case "creature": {
      const s = range(r, 0.8, 1.2) * (w / 400);
      const ears = r() > 0.5;
      return (
        <g>
          {glow}
          <g transform={`translate(${cx} ${base - 20}) scale(${s})`} className="nx-bob">
            <path d="M-110 0 C -120 -120 -60 -170 0 -170 C 60 -170 120 -120 110 0 C 70 20 -70 20 -110 0Z" fill={ink} />
            {ears ? (
              <path d="M-70 -140 L -95 -215 L -30 -160Z M70 -140 L 95 -215 L 30 -160Z" fill={ink} />
            ) : (
              times(4, (i) => <path key={i} d={`M${-60 + i * 40} 5 q ${i % 2 ? 10 : -10} 40 0 70`} stroke={ink} strokeWidth="12" strokeLinecap="round" fill="none" />)
            )}
            <circle cx="-38" cy="-95" r="26" fill={`url(#${id}sg)`} />
            <circle cx="38" cy="-95" r="26" fill={`url(#${id}sg)`} />
            <circle cx="-38" cy="-95" r="10" fill="#fff" />
            <circle cx="38" cy="-95" r="10" fill="#fff" />
            <path d="M-108 -10 C -118 -120 -60 -166 0 -167" stroke={rim} strokeWidth="3" fill="none" filter={`url(#${id}rim)`} opacity="0.8" />
          </g>
        </g>
      );
    }
    case "location": {
      const n = 3 + Math.floor(r() * 3);
      return (
        <g>
          {glow}
          <g fill={ink}>
            {times(n, (i) => {
              const bw = range(r, 50, 90) * (w / 400);
              const bh = range(r, 120, 260) * (h / 500);
              const x = cx - (n * 60 * (w / 400)) / 2 + i * 60 * (w / 400);
              const arch = r() > 0.4;
              return (
                <g key={i}>
                  <path d={arch ? `M${x} ${h} V${h - bh + bw / 2} A${bw / 2} ${bw / 2} 0 0 1 ${x + bw} ${h - bh + bw / 2} V${h}Z` : `M${x} ${h} V${h - bh} L${x + bw / 2} ${h - bh - 40} L${x + bw} ${h - bh} V${h}Z`} />
                  {times(3, (k) => (
                    <rect key={k} x={x + bw / 2 - 5} y={h - bh + 40 + k * 34} width="10" height="16" rx="5" fill={p.accent2} opacity={r() > 0.4 ? 0.9 : 0.25} className="nx-twinkle" style={{ animationDelay: `${k * 0.7 + i}s` }} />
                  ))}
                </g>
              );
            })}
          </g>
        </g>
      );
    }
    case "object":
    case "artifact": {
      const sides = kind === "artifact" ? 4 : 0;
      const R = (kind === "artifact" ? 70 : 62) * (w / 400);
      const y = h * 0.52;
      return (
        <g>
          {glow}
          <circle cx={cx} cy={y} r={R * 2.6} fill={`url(#${id}sg)`} opacity="0.7" className="nx-pulse" />
          {kind === "artifact" ? (
            <g transform={`translate(${cx} ${y})`} className="nx-spin-slow">
              <rect x={-R} y={-R} width={R * 2} height={R * 2} transform="rotate(45)" fill={ink} stroke={rim} strokeWidth="3" />
              <rect x={-R * 0.7} y={-R * 0.7} width={R * 1.4} height={R * 1.4} fill="none" stroke={rim} strokeWidth="1.5" opacity="0.7" />
              {times(8, (i) => (
                <line key={i} x1="0" y1={-R * 1.55} x2="0" y2={-R * 1.85} stroke={rim} strokeWidth="3" transform={`rotate(${i * 45})`} />
              ))}
              <circle r={R * 0.32} fill="#fff" opacity="0.95" />
            </g>
          ) : (
            <g transform={`translate(${cx} ${y})`}>
              <circle r={R} fill={ink} stroke={rim} strokeWidth="3" />
              <ellipse rx={R * 1.6} ry={R * 0.35} fill="none" stroke={rim} strokeWidth="2.5" transform={`rotate(${range(r, -30, 30)})`} />
              <circle cx={-R * 0.3} cy={-R * 0.3} r={R * 0.22} fill="#fff" opacity="0.9" />
            </g>
          )}
          {sides > 0 && null}
        </g>
      );
    }
    case "event":
    case "moment": {
      const y = h * 0.5;
      const R = 70 * (w / 400);
      return (
        <g>
          {glow}
          <g transform={`translate(${cx} ${y})`}>
            <circle r={R * 3} fill={`url(#${id}sg)`} opacity="0.6" className="nx-pulse" />
            <g className="nx-spin-slow">
              {times(24, (i) => (
                <line key={i} x1="0" y1={R * 0.9} x2="0" y2={R * (1.4 + (i % 3) * 0.35)} stroke={i % 2 ? rim : p.accent2} strokeWidth="3" strokeLinecap="round" transform={`rotate(${i * 15})`} />
              ))}
            </g>
            <circle r={R * 0.75} fill={ink} stroke={rim} strokeWidth="3" />
            {kind === "moment" ? <path d={`M${R * 0.1} ${-R * 0.55} A${R * 0.55} ${R * 0.55} 0 1 0 ${R * 0.1} ${R * 0.55} A${R * 0.4} ${R * 0.55} 0 1 1 ${R * 0.1} ${-R * 0.55}Z`} fill="#fff" opacity="0.92" /> : <circle r={R * 0.28} fill="#fff" />}
          </g>
        </g>
      );
    }
    case "secret": {
      const y = h * 0.5;
      const R = 90 * (w / 400);
      return (
        <g>
          {glow}
          <g transform={`translate(${cx} ${y})`}>
            <circle r={R * 2.4} fill={`url(#${id}sg)`} opacity="0.65" className="nx-pulse" />
            {times(4, (i) => (
              <circle key={i} r={R * (0.5 + i * 0.3)} fill="none" stroke={rim} strokeOpacity={0.6 - i * 0.12} strokeWidth="1.5" strokeDasharray={i % 2 ? "3 7" : undefined} className={i % 2 ? "nx-spin-slow" : undefined} />
            ))}
            <path d={`M${-R} 0 Q 0 ${-R * 0.75} ${R} 0 Q 0 ${R * 0.75} ${-R} 0Z`} fill={ink} stroke={rim} strokeWidth="3" />
            <circle r={R * 0.3} fill={p.accent2} />
            <circle r={R * 0.12} fill="#fff" />
          </g>
        </g>
      );
    }
  }
}

/* ------------------------------------------------------------------ */
/* Public components                                                    */
/* ------------------------------------------------------------------ */

export interface ArtProps {
  style: ArtStyle;
  palette: Palette;
  seed: number;
  kind?: CardKind;
  /** Aspect: card art window (4:5) or hero (16:9) or square */
  aspect?: "card" | "hero" | "square" | "tall";
  className?: string;
  title?: string;
  /** Hide the subject (backgrounds, banners) */
  sceneOnly?: boolean;
}

const ASPECTS = { card: [400, 500], hero: [1280, 720], square: [400, 400], tall: [400, 620] } as const;

export function Art({ style, palette, seed, kind, aspect = "card", className, title, sceneOnly }: ArtProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [w, h] = ASPECTS[aspect];
  const ctx: Ctx = { r: rngf(seed), p: palette, id: `a${uid}`, w, h, seed };
  const scene = SCENES[style](ctx);
  const subj = !sceneOnly && kind ? subject(kind, { ...ctx, r: rngf(seed ^ 0x9e3779b9) }, style) : null;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid slice" className={className} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true} xmlns="http://www.w3.org/2000/svg">
      {scene}
      {subj}
    </svg>
  );
}
