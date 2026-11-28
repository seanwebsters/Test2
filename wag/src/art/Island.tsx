import { motion } from 'framer-motion';
import { memo, type ReactNode } from 'react';
import type { DogLook, Placement, SeedPlot } from '../game/types';
import type { Phase } from '../game/util';
import { Dog, type Pose } from './Dog';
import { Creature } from './Creatures';
import { Deco } from './Decor';

export const ISLAND_W = 800;
export const ISLAND_H = 760;

export interface IslandView {
  restored: string[];
  placed: Placement[];
  creatures: string[];
  plots: SeedPlot[];
  look: DogLook;
  plus: boolean;
  name: string;
}

export type IslandTarget = 'cottage' | 'tree' | 'waterfall' | 'bridge' | 'garden' | 'woods' | 'grotto' | 'islet' | 'cove' | 'pond' | 'mailbox' | 'plot';

interface Props {
  view: IslandView;
  phase: Phase;
  dogPos: { x: number; y: number };
  dogPose: Pose;
  dogFlip?: boolean;
  dogMs?: number;
  onDog?: () => void;
  onTarget?: (t: IslandTarget, extra?: number) => void;
  onDeco?: (uid: string) => void;
  selected?: string | null;
  plotStages?: number[];
  hideDog?: boolean;
}

/** Walkable waypoints the dog wanders between. */
export const WAYPOINTS: Record<string, { x: number; y: number }[]> = {
  meadow: [
    { x: 400, y: 410 },
    { x: 470, y: 450 },
    { x: 360, y: 470 },
    { x: 520, y: 380 },
    { x: 430, y: 350 },
    { x: 600, y: 400 },
    { x: 330, y: 420 },
    { x: 540, y: 470 },
  ],
  bridge: [
    { x: 262, y: 410 },
    { x: 230, y: 440 },
  ],
  woods: [
    { x: 180, y: 360 },
    { x: 220, y: 330 },
  ],
};

function Tree({ x, y, s = 1, hue = 'green', delay = 0 }: { x: number; y: number; s?: number; hue?: 'green' | 'pink' | 'dark' | 'gold'; delay?: number }) {
  const g = {
    green: ['#9fd16d', '#6faa4c', '#4f8a3b'],
    pink: ['#ffd0e4', '#f59cc2', '#d672a1'],
    dark: ['#78b062', '#4f8a47', '#356a37'],
    gold: ['#ffe08c', '#f2b54a', '#c98a2c'],
  }[hue];
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="0" cy="2" rx="26" ry="7" fill="#2b4a2a" opacity="0.22" />
      <path d="M-5 0 Q-4 -26 -2 -34 L3 -34 Q5 -26 6 0Z" fill="#8a5d3b" />
      <g className="sway" style={{ animationDelay: `${delay}s`, transformOrigin: `0px -30px` }}>
        <circle cx="-14" cy="-44" r="18" fill={g[2]} />
        <circle cx="14" cy="-46" r="18" fill={g[2]} />
        <circle cx="0" cy="-62" r="22" fill={g[1]} />
        <circle cx="-12" cy="-50" r="16" fill={g[1]} />
        <circle cx="12" cy="-52" r="15" fill={g[1]} />
        <circle cx="-6" cy="-68" r="12" fill={g[0]} />
        <circle cx="8" cy="-60" r="7" fill={g[0]} opacity=".8" />
      </g>
    </g>
  );
}

function Pine({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cy="2" rx="18" ry="5" fill="#2b4a2a" opacity=".2" />
      <rect x="-3" y="-14" width="6" height="14" fill="#7b5233" />
      <g className="sway" style={{ transformOrigin: '0 -10px' }}>
        <path d="M0 -70 L22 -14 L-22 -14Z" fill="#3f7d4a" />
        <path d="M0 -70 L14 -36 L-14 -36Z" fill="#5b9e5d" />
        <path d="M0 -70 L-8 -46 L-2 -46Z" fill="#8cc77a" />
      </g>
    </g>
  );
}

function Flowers({ x, y, c = '#f4a3c4', n = 5 }: { x: number; y: number; c?: string; n?: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {Array.from({ length: n }, (_, i) => {
        const dx = (i - n / 2) * 7 + ((i * 37) % 5);
        const dy = ((i * 13) % 7) - 3;
        return (
          <g key={i} transform={`translate(${dx} ${dy})`}>
            <path d={`M0 0 L0 -7`} stroke="#5f9a4a" strokeWidth="1.5" />
            <circle cy="-8" r="3" fill={i % 2 ? c : '#fff3c4'} />
            <circle cy="-8" r="1.2" fill="#f2b54a" />
          </g>
        );
      })}
    </g>
  );
}

function Cottage({ built, night }: { built: boolean; night: boolean }) {
  if (!built)
    return (
      <g transform="translate(570 318)">
        <ellipse cy="4" rx="56" ry="12" fill="#3b2f2a" opacity=".2" />
        <path d="M-40 0 L-40 -30 L-20 -40 L-14 -10 L10 -34 L30 -18 L40 0Z" fill="#b8a48c" stroke="#8e7a64" strokeWidth="2" />
        <path d="M-30 -30 L30 -60 M-10 -48 L22 -20" stroke="#7a5638" strokeWidth="6" strokeLinecap="round" />
        <rect x="-50" y="-8" width="22" height="12" rx="2" fill="#a07a52" transform="rotate(-8)" />
        <g transform="translate(10 -74)">
          <rect x="-34" y="-12" width="68" height="22" rx="11" fill="#fff8ec" stroke="#d7c4a5" />
          <text textAnchor="middle" y="4" fontSize="11" fontFamily="Fredoka Variable" fontWeight="600" fill="#6b5a8c">5 ★ to build</text>
        </g>
      </g>
    );
  return (
    <g transform="translate(570 318)">
      <ellipse cy="6" rx="70" ry="14" fill="#3b2f2a" opacity=".22" />
      {/* chimney smoke */}
      <g opacity=".7">
        {[0, 1, 2].map((i) => (
          <circle key={i} className="smoke" style={{ animationDelay: `${i * 1.2}s` }} cx="30" cy="-112" r="7" fill="#fff" />
        ))}
      </g>
      <rect x="22" y="-110" width="14" height="30" rx="3" fill="#9b7e6b" />
      {/* walls */}
      <path d="M-52 0 L-52 -58 L52 -58 L52 0Z" fill="#fbe9cf" />
      <path d="M-52 -58 L52 -58 L52 0 L36 0 L36 -58Z" fill="#000" opacity=".05" />
      {/* timber */}
      <path d="M-52 -30 L52 -30" stroke="#b58a62" strokeWidth="4" />
      {/* roof */}
      <path d="M-66 -52 Q-60 -64 -40 -92 Q0 -128 40 -92 Q60 -64 66 -52 Q0 -60 -66 -52Z" fill="#8c6fd6" />
      <path d="M-66 -52 Q0 -60 66 -52 Q60 -46 0 -50 Q-60 -46 -66 -52Z" fill="#6d52b8" />
      <path d="M-40 -92 Q0 -128 40 -92 Q0 -110 -40 -92Z" fill="#a993ea" />
      {/* door */}
      <path d="M-12 0 L-12 -24 Q0 -40 12 -24 L12 0Z" fill="#8a5a3b" />
      <circle cx="7" cy="-12" r="2" fill="#f2c14e" />
      {/* windows */}
      {[-34, 30].map((wx) => (
        <g key={wx}>
          <circle cx={wx} cy="-40" r="10" fill={night ? '#ffd77a' : '#bfe3f7'} className={night ? 'glowpulse' : undefined} />
          <path d={`M${wx - 10} -40 L${wx + 10} -40 M${wx} -50 L${wx} -30`} stroke="#b58a62" strokeWidth="2.5" />
          <circle cx={wx} cy="-40" r="10" fill="none" stroke="#b58a62" strokeWidth="3" />
        </g>
      ))}
      {night && <circle cx="0" cy="-30" r="70" fill="url(#isl-glow)" opacity=".55" />}
      <Flowers x={-42} y={4} c="#c7b2f2" n={4} />
      <Flowers x={42} y={4} c="#f4a3c4" n={4} />
    </g>
  );
}

function BlossomTree({ grown, night }: { grown: boolean; night: boolean }) {
  if (!grown)
    return (
      <g transform="translate(410 250)">
        <ellipse cy="2" rx="24" ry="6" fill="#2b4a2a" opacity=".2" />
        <path d="M0 0 Q-2 -20 0 -30" stroke="#8a5d3b" strokeWidth="4" fill="none" />
        <ellipse cx="-7" cy="-28" rx="8" ry="4" fill="#8cc77a" transform="rotate(-30 -7 -28)" />
        <ellipse cx="7" cy="-32" rx="8" ry="4" fill="#8cc77a" transform="rotate(30 7 -32)" />
        <g transform="translate(0 -52)">
          <rect x="-36" y="-11" width="72" height="22" rx="11" fill="#fff8ec" stroke="#d7c4a5" />
          <text textAnchor="middle" y="4" fontSize="11" fontFamily="Fredoka Variable" fontWeight="600" fill="#6b5a8c">3 ★ to plant</text>
        </g>
      </g>
    );
  const blobs: [number, number, number, string][] = [
    [-70, -120, 40, '#d672a1'],
    [70, -124, 42, '#d672a1'],
    [0, -170, 54, '#e985b4'],
    [-46, -150, 44, '#f59cc2'],
    [50, -156, 44, '#f59cc2'],
    [-90, -96, 28, '#e985b4'],
    [94, -100, 28, '#e985b4'],
    [0, -120, 46, '#f59cc2'],
    [-24, -186, 32, '#ffc2dc'],
    [30, -176, 28, '#ffd0e4'],
    [-60, -168, 22, '#ffd0e4'],
  ];
  return (
    <g transform="translate(410 262)">
      <ellipse cy="4" rx="110" ry="22" fill="#2b4a2a" opacity=".22" />
      <path d="M-18 0 Q-10 -50 -16 -90 Q-30 -110 -56 -118 M-8 -70 Q20 -100 58 -114 M16 0 Q14 -50 10 -90 Q6 -120 0 -140" stroke="#7a5233" strokeWidth="14" fill="none" strokeLinecap="round" />
      <path d="M-22 0 Q-10 -60 -8 -100 L12 -100 Q14 -50 22 0Z" fill="#8a5d3b" />
      <g className="sway-slow" style={{ transformOrigin: '0 -90px' }}>
        {blobs.map(([x, y, r, c], i) => (
          <circle key={i} cx={x} cy={y} r={r} fill={c} />
        ))}
        {/* lanterns */}
        {[
          [-80, -86],
          [84, -92],
          [-30, -100],
          [44, -110],
          [0, -80],
        ].map(([x, y], i) => (
          <g key={i} transform={`translate(${x} ${y})`}>
            <path d="M0 -14 L0 -6" stroke="#6b4a2a" strokeWidth="1.5" />
            <rect x="-5" y="-6" width="10" height="13" rx="3" fill={night ? '#ffd770' : '#f6c979'} className={night ? 'glowpulse' : undefined} />
            {night && <circle r="16" fill="url(#isl-glow)" />}
          </g>
        ))}
      </g>
      {/* falling petals */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <ellipse key={i} className="petal" style={{ animationDelay: `${i * 1.3}s`, ['--px' as string]: `${(i % 3) * 30 - 30}px` }} cx={-70 + i * 28} cy={-110} rx="3.5" ry="2.2" fill="#ffc2dc" />
      ))}
    </g>
  );
}

function Waterfall({ x, y, h, w = 26, flowing = true }: { x: number; y: number; h: number; w?: number; flowing?: boolean }) {
  if (!flowing)
    return (
      <g>
        <path d={`M${x - w / 2} ${y} L${x + w / 2} ${y} L${x + w / 2 - 4} ${y + h} L${x - w / 2 + 4} ${y + h}Z`} fill="#8f8079" opacity=".35" />
      </g>
    );
  return (
    <g>
      <path d={`M${x - w / 2} ${y} Q${x - w / 2 - 2} ${y + h / 2} ${x - w / 2 + 2} ${y + h} L${x + w / 2 - 2} ${y + h} Q${x + w / 2 + 2} ${y + h / 2} ${x + w / 2} ${y}Z`} fill="url(#isl-fall)" />
      <g stroke="#fff" strokeWidth="2.5" strokeLinecap="round" opacity=".85">
        {[-w / 3, 0, w / 3].map((dx, i) => (
          <line key={i} className="fall" style={{ animationDelay: `${i * 0.25}s` }} x1={x + dx} y1={y} x2={x + dx} y2={y + h} strokeDasharray="10 18" />
        ))}
      </g>
      {[-10, 4, 14].map((dx, i) => (
        <circle key={i} className="mist" style={{ animationDelay: `${i * 0.6}s` }} cx={x + dx} cy={y + h} r={10 + i * 2} fill="#fff" opacity=".7" />
      ))}
    </g>
  );
}

function Fog({ x, y, label, cost, onTap }: { x: number; y: number; label: string; cost: string; onTap?: () => void }) {
  return (
    <g onClick={onTap} style={{ cursor: 'pointer' }}>
      {[
        [-50, 10, 46],
        [0, -10, 56],
        [50, 6, 44],
        [-20, 30, 40],
        [30, 28, 40],
      ].map(([dx, dy, r], i) => (
        <circle key={i} className="fogdrift" style={{ animationDelay: `${i * 0.7}s` }} cx={x + dx} cy={y + dy} r={r} fill="#f4efff" opacity=".88" />
      ))}
      <g transform={`translate(${x} ${y})`}>
        <rect x="-62" y="-22" width="124" height="44" rx="16" fill="#fff8ec" stroke="#cdbbe9" strokeWidth="2" />
        <text textAnchor="middle" y="-3" fontSize="12" fontFamily="Fredoka Variable" fontWeight="600" fill="#4b3c74">{label}</text>
        <text textAnchor="middle" y="13" fontSize="10.5" fontFamily="Nunito Variable" fontWeight="700" fill="#8a77b8">{cost}</text>
      </g>
    </g>
  );
}

function Butterfly({ path, delay, c }: { path: string; delay: number; c: string }) {
  return (
    <g className="flyalong" style={{ offsetPath: `path('${path}')`, animationDelay: `${delay}s` } as React.CSSProperties}>
      <g className="flutter">
        <ellipse cx="-4" cy="0" rx="5" ry="3.6" fill={c} />
        <ellipse cx="4" cy="0" rx="5" ry="3.6" fill={c} />
      </g>
      <ellipse rx="1" ry="3" fill="#4b3c74" />
    </g>
  );
}

function IslandImpl(p: Props) {
  const { view, phase } = p;
  const night = phase === 'night';
  const has = (id: string) => view.restored.includes(id);
  const tap = (t: IslandTarget, e?: number) => () => p.onTarget?.(t, e);

  const sortables: { y: number; key: string; node: ReactNode }[] = [];
  for (const pl of view.placed) {
    sortables.push({
      y: pl.y,
      key: pl.uid,
      node: (
        <g
          key={pl.uid}
          transform={`translate(${pl.x} ${pl.y})`}
          onClick={(e) => {
            e.stopPropagation();
            p.onDeco?.(pl.uid);
          }}
          style={{ cursor: 'pointer' }}
        >
          {p.selected === pl.uid && <ellipse rx="30" ry="9" fill="none" stroke="#fff" strokeWidth="3" strokeDasharray="5 4" className="spin-dash" />}
          <Deco id={pl.itemId} night={night} />
        </g>
      ),
    });
  }
  // meadow trees
  const trees: [number, number, number, 'green' | 'pink' | 'dark' | 'gold'][] = [
    [660, 360, 0.9, 'green'],
    [690, 420, 0.7, 'pink'],
    [150, 470, 0.8, 'green'],
    [640, 500, 0.75, 'gold'],
  ];
  trees.forEach(([x, y, s, h], i) => sortables.push({ y, key: `t${i}`, node: <Tree key={`t${i}`} x={x} y={y} s={s} hue={h} delay={i * 0.4} /> }));

  if (!p.hideDog)
    sortables.push({
      y: p.dogPos.y,
      key: 'dog',
      node: (
        <motion.g
          key="dog"
          initial={false}
          animate={{ x: p.dogPos.x - 30, y: p.dogPos.y - 66 }}
          transition={{ duration: (p.dogMs ?? 1600) / 1000, ease: 'easeInOut' }}
          onClick={(e) => {
            e.stopPropagation();
            p.onDog?.();
          }}
          style={{ cursor: 'pointer' }}
        >
          <Dog look={view.look} pose={p.dogPose} size={60} flip={p.dogFlip} />
        </motion.g>
      ),
    });
  sortables.sort((a, b) => a.y - b.y);

  return (
    <svg viewBox={`0 0 ${ISLAND_W} ${ISLAND_H}`} width="100%" height="100%" className="island-svg" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="isl-grass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#b6e07e" />
          <stop offset="60%" stopColor="#8fcb64" />
          <stop offset="100%" stopColor="#6fb352" />
        </linearGradient>
        <linearGradient id="isl-cliff" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c99b76" />
          <stop offset="50%" stopColor="#a8795a" />
          <stop offset="100%" stopColor="#7d5a49" />
        </linearGradient>
        <linearGradient id="isl-cliff2" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#000" stopOpacity=".18" />
          <stop offset="40%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity=".22" />
        </linearGradient>
        <linearGradient id="isl-water" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#9fe0f5" />
          <stop offset="100%" stopColor="#5fb5e3" />
        </linearGradient>
        <linearGradient id="isl-fall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#bdeefc" />
          <stop offset="100%" stopColor="#7dc8ee" stopOpacity=".8" />
        </linearGradient>
        <radialGradient id="isl-glow">
          <stop offset="0%" stopColor="#ffe9a8" stopOpacity=".9" />
          <stop offset="100%" stopColor="#ffe9a8" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="isl-crystal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f4e9ff" />
          <stop offset="100%" stopColor="#9d7df0" />
        </linearGradient>
      </defs>

      {/* Starlight Islet (back right) */}
      <g onClick={tap('islet')} style={{ cursor: 'pointer' }}>
        <g className="bob" style={{ animationDelay: '-2s' }}>
          <path d="M630 180 Q700 150 760 182 Q770 196 752 204 Q700 290 690 300 Q676 260 640 206 Q620 196 630 180Z" fill="url(#isl-cliff)" />
          <ellipse cx="696" cy="184" rx="66" ry="22" fill="url(#isl-grass)" />
          {has('islet') ? (
            <g transform="translate(700 176)">
              <rect x="-12" y="-46" width="24" height="46" fill="#f5ecff" />
              <path d="M-18 -46 Q0 -76 18 -46Z" fill="#6d52b8" />
              <rect x="-4" y="-34" width="8" height="10" rx="4" fill={night ? '#ffd77a' : '#bfe3f7'} />
              <rect x="8" y="-60" width="22" height="6" rx="3" fill="#cdbbe9" transform="rotate(-30 8 -60)" />
            </g>
          ) : (
            <Pine x={700} y={186} s={0.7} />
          )}
        </g>
      </g>
      {has('islet') && <path d="M600 260 Q630 200 650 196" stroke="#cdb08a" strokeWidth="6" fill="none" strokeDasharray="2 6" strokeLinecap="round" />}

      {/* Crystal Cove (Plus islet, bottom left) */}
      <g onClick={tap('cove')} style={{ cursor: 'pointer' }} className="bob">
        <path d="M30 640 Q80 618 140 640 Q148 650 136 656 Q100 720 84 730 Q66 700 42 656 Q24 650 30 640Z" fill="url(#isl-cliff)" />
        <ellipse cx="86" cy="640" rx="56" ry="16" fill={view.plus ? '#c8b6f5' : '#d8d2e6'} />
        {[
          [70, 640, 1],
          [96, 636, 1.3],
          [112, 644, 0.8],
        ].map(([x, y, s], i) => (
          <path key={i} d={`M${x} ${y} l${-7 * s} ${-12 * s} l${7 * s} ${-18 * s} l${7 * s} ${18 * s}Z`} fill="url(#isl-crystal)" opacity={view.plus ? 1 : 0.5} className={view.plus ? 'glowpulse' : undefined} />
        ))}
        {!view.plus && (
          <g transform="translate(86 604)">
            <rect x="-34" y="-11" width="68" height="22" rx="11" fill="#3d3a6b" />
            <text textAnchor="middle" y="4" fontSize="10.5" fontFamily="Fredoka Variable" fontWeight="600" fill="#ffe38a">WAG Plus</text>
          </g>
        )}
      </g>

      {/* Main island cliff */}
      <path d="M86 400 Q80 470 120 540 Q170 640 260 690 Q330 740 400 742 Q480 740 550 690 Q640 630 690 540 Q722 470 714 400Z" fill="url(#isl-cliff)" />
      <path d="M86 400 Q80 470 120 540 Q170 640 260 690 Q330 740 400 742 Q480 740 550 690 Q640 630 690 540 Q722 470 714 400Z" fill="url(#isl-cliff2)" />
      <path d="M120 520 Q260 580 400 576 Q560 580 690 520" stroke="#8a634e" strokeWidth="3" fill="none" opacity=".4" />
      <path d="M170 610 Q300 650 400 650 Q520 650 620 610" stroke="#8a634e" strokeWidth="3" fill="none" opacity=".35" />
      {/* hanging roots & vines */}
      {[180, 260, 520, 600, 640].map((x, i) => (
        <path key={x} d={`M${x} ${470 + (i % 2) * 20} q-6 30 2 ${50 + i * 6}`} stroke="#5f9a4a" strokeWidth="3" fill="none" className="sway" style={{ transformOrigin: `${x}px 470px` }} />
      ))}

      {/* Waterfall Grotto (cave behind left waterfall) */}
      <g onClick={tap('grotto')} style={{ cursor: 'pointer' }}>
        <path d="M150 560 Q170 520 200 560 L200 600 L150 600Z" fill={has('grotto') ? '#3d3a6b' : '#6b4f42'} />
        {has('grotto') && (
          <g>
            <circle cx="175" cy="580" r="6" fill="#ffe38a" className="glowpulse" />
            <circle cx="175" cy="580" r="18" fill="url(#isl-glow)" />
          </g>
        )}
      </g>

      {/* Grass top */}
      <path d="M86 400 Q70 330 150 280 Q250 220 400 222 Q560 220 660 286 Q740 340 714 400 Q700 470 560 500 Q400 530 240 500 Q100 470 86 400Z" fill="#5f9e4a" transform="translate(0 10)" />
      <path d="M86 400 Q70 330 150 280 Q250 220 400 222 Q560 220 660 286 Q740 340 714 400 Q700 470 560 500 Q400 530 240 500 Q100 470 86 400Z" fill="url(#isl-grass)" />
      {/* grass texture tufts */}
      {Array.from({ length: 26 }, (_, i) => {
        const x = 140 + ((i * 97) % 520);
        const y = 290 + ((i * 53) % 200);
        return <path key={i} d={`M${x} ${y} l3 -7 l3 7 l3 -5 l2 5`} stroke="#6fb352" strokeWidth="1.8" fill="none" />;
      })}
      {/* path */}
      <path d="M400 500 Q420 450 400 410 Q380 370 430 330 Q470 300 520 320" stroke="#efdcb4" strokeWidth="18" fill="none" strokeLinecap="round" opacity=".9" />
      <path d="M400 500 Q420 450 400 410 Q380 370 430 330 Q470 300 520 320" stroke="#e2c999" strokeWidth="18" fill="none" strokeLinecap="round" strokeDasharray="1 26" opacity=".9" />

      {/* hill behind tree */}
      <ellipse cx="410" cy="262" rx="140" ry="40" fill="#a5d872" />

      {/* river */}
      <g onClick={tap('waterfall')} style={{ cursor: 'pointer' }}>
        <path d="M470 278 Q420 300 360 330 Q300 360 270 400 Q240 440 160 430 Q120 425 96 420" stroke={has('waterfall') ? 'url(#isl-water)' : '#a7957c'} strokeWidth={has('waterfall') ? 26 : 14} fill="none" strokeLinecap="round" opacity={has('waterfall') ? 1 : 0.6} />
        {has('waterfall') && <path d="M470 278 Q420 300 360 330 Q300 360 270 400 Q240 440 160 430 Q120 425 96 420" stroke="#e6f9ff" strokeWidth="3" fill="none" strokeDasharray="8 22" className="shimmer" strokeLinecap="round" />}
        {/* spring rock */}
        <ellipse cx="478" cy="276" rx="22" ry="10" fill="#9c8f8a" />
        <Waterfall x={94} y={424} h={170} w={30} flowing={has('waterfall')} />
        <Waterfall x={706} y={410} h={120} w={20} flowing={has('waterfall')} />
        {!has('waterfall') && (
          <g transform="translate(330 316)">
            <rect x="-40" y="-11" width="80" height="22" rx="11" fill="#fff8ec" stroke="#d7c4a5" />
            <text textAnchor="middle" y="4" fontSize="11" fontFamily="Fredoka Variable" fontWeight="600" fill="#6b5a8c">8 ★ to restore</text>
          </g>
        )}
      </g>

      {/* bridge */}
      <g onClick={tap('bridge')} style={{ cursor: 'pointer' }} transform="translate(276 392) rotate(-38)">
        {has('bridge') ? (
          <g>
            <path d="M-36 6 Q0 -14 36 6 L36 14 Q0 -6 -36 14Z" fill="#b5835a" />
            {[-28, -16, -4, 8, 20, 30].map((x) => (
              <path key={x} d={`M${x} ${x * x * 0.012 - 6} l0 12`} stroke="#8a5d3b" strokeWidth="2" />
            ))}
            <path d="M-36 -6 Q0 -26 36 -6" stroke="#8a5d3b" strokeWidth="3" fill="none" />
            <rect x="-38" y="-12" width="4" height="22" fill="#7a5233" />
            <rect x="34" y="-12" width="4" height="22" fill="#7a5233" />
          </g>
        ) : (
          <g>
            <path d="M-36 6 Q-20 -2 -10 0 L-10 8 Q-20 6 -36 14Z" fill="#b5835a" />
            <path d="M14 0 Q24 -2 36 6 L36 14 Q24 6 14 8Z" fill="#b5835a" />
            <rect x="-38" y="-12" width="4" height="22" fill="#7a5233" />
            <g transform="rotate(38) translate(0 -26)">
              <rect x="-36" y="-11" width="72" height="22" rx="11" fill="#fff8ec" stroke="#d7c4a5" />
              <text textAnchor="middle" y="4" fontSize="11" fontFamily="Fredoka Variable" fontWeight="600" fill="#6b5a8c">2 ★ to repair</text>
            </g>
          </g>
        )}
      </g>

      {/* pond */}
      <g onClick={tap('pond')} style={{ cursor: 'pointer' }}>
        <ellipse cx="300" cy="470" rx="46" ry="18" fill="url(#isl-water)" />
        <ellipse cx="300" cy="470" rx="46" ry="18" fill="none" stroke="#b6e3f3" strokeWidth="3" />
        <ellipse cx="286" cy="468" rx="9" ry="4" fill="#7fbf5f" />
        <ellipse cx="316" cy="474" rx="7" ry="3" fill="#7fbf5f" />
        <circle cx="286" cy="466" r="2.6" fill="#f6a8c4" />
        <ellipse className="ripple" cx="304" cy="470" rx="10" ry="4" fill="none" stroke="#fff" strokeWidth="1.5" />
      </g>

      {/* woods (left) */}
      <g onClick={tap('woods')} style={{ cursor: 'pointer' }}>
        <Pine x={150} y={330} s={1} />
        <Pine x={196} y={310} s={1.15} />
        <Tree x={130} y={380} s={0.85} hue="dark" />
        <Pine x={236} y={290} s={0.9} />
        <Tree x={210} y={360} s={0.75} hue="dark" delay={0.8} />
        {has('woods') && (
          <g>
            {[
              [170, 380],
              [230, 384],
              [196, 340],
            ].map(([x, y], i) => (
              <g key={i} transform={`translate(${x} ${y})`}>
                <rect x="-2" y="-8" width="4" height="8" fill="#fff3e0" />
                <ellipse cy="-9" rx="8" ry="5" fill="#e9837a" />
                <circle cx="-3" cy="-10" r="1.4" fill="#fff" />
                {night && <circle cy="-8" r="14" fill="url(#isl-glow)" />}
              </g>
            ))}
            {/* Hazel the owl */}
            <g transform="translate(196 262)">
              <ellipse rx="10" ry="12" fill="#a77a52" />
              <ellipse cy="3" rx="6" ry="7" fill="#efdcc0" />
              <circle cx="-4" cy="-4" r="3.6" fill="#fff" />
              <circle cx="4" cy="-4" r="3.6" fill="#fff" />
              <circle cx="-4" cy="-4" r="1.8" fill="#2b2131" />
              <circle cx="4" cy="-4" r="1.8" fill="#2b2131" />
              <path d="M-1 0 L1 0 L0 3Z" fill="#f2b54a" />
            </g>
          </g>
        )}
      </g>
      {!has('woods') && <Fog x={190} y={340} label="Whispering Woods" cost="15 ★ territory" onTap={tap('woods')} />}

      {/* blossom tree */}
      <g onClick={tap('tree')} style={{ cursor: 'pointer' }}>
        <BlossomTree grown={has('blossom')} night={night} />
      </g>

      {/* garden (front right) */}
      <g onClick={tap('garden')} style={{ cursor: 'pointer' }}>
        <path d="M480 470 L620 450 L640 490 L500 512Z" fill="#8c6a4c" opacity=".9" />
        <path d="M486 474 L616 455 L632 488 L502 507Z" fill="#a27b58" />
        {[0, 1, 2].map((i) => {
          const px = 520 + i * 40;
          const py = 486 - i * 6;
          const plot = view.plots.find((x) => x.plot === i);
          const st = plot ? (p.plotStages?.[i] ?? 0) : -1;
          return (
            <g
              key={i}
              transform={`translate(${px} ${py})`}
              onClick={(e) => {
                e.stopPropagation();
                p.onTarget?.('plot', i);
              }}
            >
              <ellipse rx="14" ry="6" fill="#6d4a33" />
              {st >= 0 && <path d={`M0 0 L0 ${-6 - st * 7}`} stroke="#5f9a4a" strokeWidth="2.5" />}
              {st >= 1 && <ellipse cx="-5" cy={-6 - st * 4} rx="5" ry="2.6" fill="#7fbf5f" transform={`rotate(-30 -5 ${-6 - st * 4})`} />}
              {st >= 2 && <ellipse cx="5" cy={-8 - st * 4} rx="5" ry="2.6" fill="#7fbf5f" transform={`rotate(30 5 ${-8 - st * 4})`} />}
              {st >= 3 && (
                <g transform="translate(0 -30)" className="glowpulse">
                  {[0, 72, 144, 216, 288].map((r) => (
                    <ellipse key={r} rx="4" ry="6.5" transform={`rotate(${r}) translate(0 -5)`} fill={plot?.species === 'sunpetal' ? '#ffd36e' : plot?.species === 'starbell' ? '#9fd3f2' : '#c7b2f2'} />
                  ))}
                  <circle r="3.2" fill="#fff6c4" />
                  <circle r="16" fill="url(#isl-glow)" />
                </g>
              )}
              {st < 0 && <path d="M-4 -2 L4 -2 M0 -6 L0 2" stroke="#efdcb4" strokeWidth="2" strokeLinecap="round" />}
            </g>
          );
        })}
        {/* fence */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <rect key={i} x={482 + i * 30} y={460 - i * 4} width="5" height="18" rx="2" fill="#f6ead0" />
        ))}
        <path d="M482 466 L640 444" stroke="#f6ead0" strokeWidth="3" />
        <Flowers x={470} y={498} c="#f4a3c4" n={4} />
      </g>

      <Flowers x={350} y={380} c="#c7b2f2" />
      <Flowers x={620} y={330} c="#f4a3c4" />
      <Flowers x={250} y={300} c="#fff3c4" n={4} />
      <Flowers x={450} y={490} c="#c7b2f2" n={6} />

      {/* cottage */}
      <g onClick={tap('cottage')} style={{ cursor: 'pointer' }}>
        <Cottage built={has('cottage')} night={night} />
      </g>

      {/* depth-sorted entities */}
      {sortables.map((e) => e.node)}

      {/* creatures */}
      {view.creatures.map((c, i) => {
        const spots = [
          [470, 300],
          [340, 450],
          [620, 470],
          [250, 380],
          [530, 360],
          [380, 200],
          [680, 380],
          [430, 470],
        ];
        const [x, y] = spots[i % spots.length];
        return (
          <g key={c} transform={`translate(${x} ${y})`}>
            <g className="float" style={{ animationDelay: `${i * 0.7}s` }}>
              <Creature id={c} size={26} />
            </g>
          </g>
        );
      })}

      {/* butterflies & particles */}
      {!night && (
        <>
          <Butterfly path="M300 380 C 360 300, 460 320, 520 380 S 620 460, 680 360" delay={0} c="#f6a8c4" />
          <Butterfly path="M560 300 C 500 240, 420 260, 380 320 S 300 420, 220 380" delay={3} c="#fff3a6" />
          <Butterfly path="M420 470 C 470 420, 540 430, 580 480 S 640 520, 700 470" delay={6} c="#c7b2f2" />
        </>
      )}
      {Array.from({ length: night ? 18 : 12 }, (_, i) => (
        <circle
          key={i}
          className="mote"
          style={{ animationDelay: `${(i * 0.9) % 8}s`, animationDuration: `${7 + (i % 5)}s` }}
          cx={120 + ((i * 131) % 580)}
          cy={260 + ((i * 71) % 260)}
          r={night ? 2.4 : 1.8}
          fill={night ? '#fff3a6' : '#fff'}
        />
      ))}

      {/* night tint */}
      {(night || phase === 'sunset' || phase === 'dawn') && (
        <rect x="0" y="0" width={ISLAND_W} height={ISLAND_H} fill={night ? '#1d1a4a' : phase === 'sunset' ? '#ff9a6a' : '#ffc2a6'} opacity={night ? 0.38 : 0.12} style={{ mixBlendMode: 'multiply', pointerEvents: 'none' }} />
      )}
      {night && (
        <g style={{ pointerEvents: 'none' }}>
          {view.placed
            .filter((pl) => ['lantern', 'mushroom', 'arch', 'crystal'].includes(pl.itemId))
            .map((pl) => (
              <circle key={pl.uid} cx={pl.x} cy={pl.y - 24} r="34" fill="url(#isl-glow)" />
            ))}
        </g>
      )}
    </svg>
  );
}

export const Island = memo(IslandImpl);
