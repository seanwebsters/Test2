import { ReactNode } from 'react';
import { StoryPage } from '../game/story';

/** Storybook vignettes, drawn in the same palette as the world. */

function Sky({ id, a, b, c }: { id: string; a: string; b: string; c: string }) {
  return (
    <>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={a} />
          <stop offset="0.6" stopColor={b} />
          <stop offset="1" stopColor={c} />
        </linearGradient>
      </defs>
      <rect width="320" height="200" fill={`url(#${id})`} />
    </>
  );
}

function Stars({ n = 18, seed = 3 }: { n?: number; seed?: number }) {
  let s = seed;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  return (
    <g fill="#fff7e8">
      {Array.from({ length: n }, (_, i) => (
        <circle key={i} cx={r() * 320} cy={r() * 90} r={r() * 1.1 + 0.3} opacity={0.5 + r() * 0.5} />
      ))}
    </g>
  );
}

function Moon({ x, y, r = 14 }: { x: number; y: number; r?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r * 2.2} fill="#fff3dc" opacity="0.12" />
      <path d={`M${x + r * 0.4} ${y - r} a${r} ${r} 0 1 0 ${r * 0.6} ${r * 1.8} a${r * 0.82} ${r * 0.82} 0 1 1 ${-r * 0.6} ${-r * 1.8}Z`} fill="#f8ead0" />
    </g>
  );
}

function Tower({ x, base, s = 1, lit = true }: { x: number; base: number; s?: number; lit?: boolean }) {
  return (
    <g transform={`translate(${x} ${base}) scale(${s})`}>
      <rect x="-14" y="-96" width="28" height="96" fill="#e9dccd" />
      <rect x="-16" y="-100" width="32" height="5" fill="#d2c3b6" />
      <rect x="-12" y="-122" width="24" height="22" fill="#e9dccd" />
      <circle cx="0" cy="-111" r="8" fill="#f7efe2" stroke="#6b5274" strokeWidth="1.6" />
      <path d="M0 -111 L-3 -115 M0 -111 L4 -111" stroke="#3a2f3f" strokeWidth="1" />
      <path d="M-15 -122 L0 -160 L15 -122Z" fill="#3b3d6a" />
      <path d="M1 -170 a4 4 0 1 0 3 6 a3 3 0 1 1 -3 -6Z" fill="#efdcb6" />
      <path d="M-5 0 V-14 a5 5 0 0 1 10 0 V0Z" fill="#5a3f5c" />
      <rect x="-3" y="-60" width="6" height="12" rx="3" fill={lit ? '#ffcf8a' : '#5a5878'} />
    </g>
  );
}

function House({ x, base, w, h, roof, wall = '#efe3d2', lit = true }: { x: number; base: number; w: number; h: number; roof: string; wall?: string; lit?: boolean }) {
  return (
    <g>
      <rect x={x - w / 2} y={base - h} width={w} height={h} fill={wall} />
      <path d={`M${x - w / 2 - 3} ${base - h} L${x} ${base - h - w * 0.6} L${x + w / 2 + 3} ${base - h}Z`} fill={roof} />
      <rect x={x - w / 4 - 3} y={base - h * 0.7} width="6" height="8" rx="3" fill={lit ? '#ffcf8a' : '#5f5b80'} />
      <rect x={x + w / 4 - 3} y={base - h * 0.7} width="6" height="8" rx="3" fill={lit ? '#ffd9a0' : '#5f5b80'} />
    </g>
  );
}

function Blossom({ x, y, r = 24, c = '#eab0be' }: { x: number; y: number; r?: number; c?: string }) {
  return (
    <g>
      <path d={`M${x} ${y + r * 1.6} C${x - 2} ${y + r} ${x + 2} ${y + r * 0.4} ${x} ${y}`} stroke="#6e5348" strokeWidth={r * 0.18} fill="none" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <circle key={i} cx={x + Math.cos(i) * r * 0.7} cy={y - r * 0.2 + Math.sin(i * 1.7) * r * 0.35} r={r * 0.62} fill={c} opacity={0.9} />
      ))}
      <circle cx={x} cy={y - r * 0.5} r={r * 0.7} fill="#f2c7d0" />
    </g>
  );
}

/** chibi figure, facing left/right */
export function Figure({ x, y, s = 1, who, flip = false, sit = false }: { x: number; y: number; s?: number; who: 'her' | 'him'; flip?: boolean; sit?: boolean }) {
  const her = who === 'her';
  const hair = her ? '#4b2f2c' : '#2b2128';
  const cloak = her ? '#a3505a' : '#2f2a3a';
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
      <ellipse cx="0" cy="2" rx="13" ry="3" fill="#2b2540" opacity="0.2" />
      {sit ? (
        <path d="M-12 -6 C-12 -22 12 -22 12 -6 L16 -4 L16 0 L-12 0Z" fill={cloak} />
      ) : (
        <path d="M-11 0 C-11 -12 -8 -24 0 -26 C8 -24 11 -12 11 0Z" fill={cloak} />
      )}
      {her && !sit && <path d="M-5 0 C-5 -8 -3 -18 0 -20 C3 -18 5 -8 5 0Z" fill="#f1e4d1" />}
      <circle cx="0" cy="-34" r="12" fill="#f4d9c8" />
      {her ? (
        <path d="M-13 -34 C-14 -48 14 -48 13 -36 C12 -30 9 -34 6 -40 C0 -38 -8 -38 -10 -34 C-10 -28 -14 -18 -16 -12 C-18 -20 -15 -28 -13 -34Z" fill={hair} />
      ) : (
        <g fill={hair}>
          {[-9, -4, 1, 6, 10, -11, 8, -2, 4].map((cx, i) => (
            <circle key={i} cx={cx} cy={-42 + (i % 3) * 2 + (i > 4 ? 5 : 0)} r={4.6} />
          ))}
        </g>
      )}
      <circle cx="5" cy="-33" r="1.5" fill="#2a2230" />
      <circle cx="-3" cy="-33" r="1.5" fill="#2a2230" />
      <circle cx="8" cy="-29" r="2.2" fill="#f0a6a8" opacity="0.6" />
    </g>
  );
}

function Ground({ c = '#93ab83', y = 168 }: { c?: string; y?: number }) {
  return <path d={`M0 ${y} C80 ${y - 8} 220 ${y + 6} 320 ${y - 4} V200 H0Z`} fill={c} />;
}

function Cobbles({ y = 172 }: { y?: number }) {
  return (
    <g>
      <path d={`M0 ${y} C90 ${y - 6} 230 ${y + 4} 320 ${y - 3} V200 H0Z`} fill="#d6cac6" />
      {Array.from({ length: 22 }, (_, i) => (
        <ellipse key={i} cx={(i * 37) % 320} cy={y + 8 + (i % 3) * 7} rx="10" ry="3.4" fill="#c8bbba" />
      ))}
    </g>
  );
}

const PETALS = (n: number, seed: number) => {
  let s = seed;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  return (
    <g fill="#f3bcc8">
      {Array.from({ length: n }, (_, i) => (
        <ellipse key={i} cx={r() * 320} cy={20 + r() * 150} rx="2.6" ry="1.4" transform={`rotate(${r() * 180})`} style={{ transformBox: 'fill-box', transformOrigin: 'center' }} />
      ))}
    </g>
  );
};

const ARTS: Record<StoryPage['art'], () => ReactNode> = {
  tower: () => (
    <>
      <Sky id="s1" a="#262a52" b="#6b5f99" c="#c8a9cf" />
      <Stars n={26} />
      <Moon x={250} y={40} />
      <House x={70} base={170} w={44} h={48} roof="#4a5585" />
      <House x={250} base={172} w={50} h={40} roof="#6b5274" />
      <Tower x={160} base={172} s={0.95} />
      <Blossom x={30} y={110} r={30} />
      <Blossom x={300} y={118} r={26} c="#d9a5c6" />
      <Cobbles />
      {PETALS(14, 5)}
    </>
  ),
  tree: () => (
    <>
      <Sky id="s2" a="#2c2f5c" b="#7d6ba6" c="#cdb2d6" />
      <Stars n={14} seed={9} />
      <Tower x={250} base={150} s={0.55} lit={false} />
      <House x={200} base={152} w={30} h={26} roof="#4a5585" lit={false} />
      <Ground c="#8ea67e" y={150} />
      <Blossom x={110} y={60} r={48} />
      <Figure x={150} y={176} s={1.1} who="her" sit />
      <rect x="128" y="168" width="10" height="7" rx="1" fill="#fbf3e4" transform="rotate(-12 133 171)" />
      {PETALS(20, 2)}
    </>
  ),
  meet: () => (
    <>
      <Sky id="s3" a="#2a2d58" b="#7c6aa6" c="#e0b4bf" />
      <Stars n={10} seed={4} />
      <Tower x={160} base={140} s={0.9} />
      <rect x="0" y="140" width="320" height="60" fill="#d6cac6" />
      <rect x="110" y="138" width="100" height="10" fill="#cbbdb3" />
      <Figure x={128} y={178} s={1.35} who="her" />
      <Figure x={196} y={178} s={1.45} who="him" flip />
      <circle cx="162" cy="140" r="5" fill="#fff4d6" opacity="0.9" />
      <circle cx="162" cy="140" r="14" fill="#fff4d6" opacity="0.25" />
      {PETALS(10, 8)}
    </>
  ),
  fountain: () => (
    <>
      <Sky id="s4" a="#343a78" b="#a184b8" c="#f2bfa8" />
      <Moon x={60} y={40} r={11} />
      <House x={50} base={150} w={60} h={60} roof="#4a5585" />
      <House x={270} base={150} w={60} h={70} roof="#6b5274" />
      <Cobbles y={150} />
      <ellipse cx="160" cy="160" rx="70" ry="14" fill="#d9ccc3" />
      <ellipse cx="160" cy="156" rx="60" ry="9" fill="#a9c8cf" />
      <rect x="153" y="112" width="14" height="44" fill="#d3c5bd" />
      <ellipse cx="160" cy="112" rx="28" ry="6" fill="#dacdc4" />
      {[-1, 1].map((sx) => (
        <path key={sx} d={`M160 108 C${160 + sx * 18} 92 ${160 + sx * 34} 110 ${160 + sx * 40} 150`} stroke="#d8e9f2" strokeWidth="3" fill="none" strokeDasharray="1 5" strokeLinecap="round" />
      ))}
      <Figure x={110} y={160} s={1.05} who="her" sit />
      <Figure x={140} y={162} s={1.12} who="him" flip sit />
    </>
  ),
  alone: () => (
    <>
      <Sky id="s5" a="#1f2347" b="#4c4b80" c="#9b8fbf" />
      <Stars n={34} seed={12} />
      <Moon x={240} y={44} r={16} />
      <path d="M0 150 H320 V200 H0Z" fill="#6a8462" />
      {[30, 70, 250, 290].map((x) => (
        <Blossom key={x} x={x} y={130} r={16} c="#d9a5c6" />
      ))}
      <path d="M120 150 C120 96 200 96 200 150" stroke="#efe6da" strokeWidth="5" fill="none" />
      {Array.from({ length: 14 }, (_, i) => (
        <circle key={i} cx={124 + i * 5.6} cy={150 - Math.sin((i / 13) * Math.PI) * 48} r="5" fill={i % 3 ? '#7f9c72' : '#e3a3b0'} />
      ))}
      <Figure x={160} y={178} s={1.3} who="him" />
      {PETALS(8, 21)}
    </>
  ),
  return: () => (
    <>
      <Sky id="s6" a="#2d3266" b="#9a7fb4" c="#f0bba6" />
      <Moon x={270} y={36} r={10} />
      <Ground c="#93ab83" y={160} />
      <Blossom x={80} y={66} r={50} />
      <Figure x={150} y={180} s={1.25} who="her" />
      <Figure x={192} y={180} s={1.35} who="him" flip />
      {PETALS(26, 6)}
    </>
  ),
  bookshop: () => (
    <>
      <Sky id="s7" a="#343a78" b="#a184b8" c="#f2bfa8" />
      <rect x="70" y="40" width="180" height="140" fill="#93a891" />
      <rect x="62" y="20" width="196" height="26" fill="#f0e4d3" />
      <path d="M56 22 L160 -20 L264 22Z" fill="#4a5585" />
      <rect x="96" y="80" width="128" height="70" rx="4" fill="#ffcf8a" />
      {Array.from({ length: 16 }, (_, i) => (
        <rect key={i} x={100 + i * 7.6} y={110 - (i % 3) * 3} width="6" height={34 + (i % 3) * 3} fill={['#a3606b', '#5d6c8e', '#8a9a74', '#c49a6c', '#7c5a85'][i % 5]} />
      ))}
      <rect x="110" y="56" width="100" height="18" fill="#5a3f5c" />
      <text x="160" y="69" textAnchor="middle" fill="#f3e6cc" fontFamily="Cormorant Garamond, serif" fontStyle="italic" fontSize="12">
        Hollow &amp; Quill
      </text>
      <path d="M0 180 H320 V200 H0Z" fill="#d6cac6" />
      <rect x="140" y="152" width="40" height="28" fill="#fbf3e4" stroke="#6b5274" />
      <circle cx="160" cy="164" r="5" fill="#b8566c" />
    </>
  ),
  bell: () => (
    <>
      <Sky id="s8" a="#313773" b="#b18bb9" c="#f6c3a6" />
      <Tower x={160} base={200} s={1.2} />
      {Array.from({ length: 12 }, (_, i) => (
        <path key={i} d={`M${40 + i * 22} ${30 + (i % 4) * 14} q4 -5 8 0 q4 -5 8 0`} stroke="#5a4a5e" strokeWidth="1.6" fill="none" />
      ))}
      {[0, 1, 2].map((i) => (
        <circle key={i} cx="160" cy="58" r={30 + i * 18} fill="none" stroke="#fff3dc" strokeWidth="1.2" opacity={0.5 - i * 0.14} />
      ))}
    </>
  ),
};

export function Illustration({ art, className }: { art: StoryPage['art']; className?: string }) {
  return (
    <svg viewBox="0 0 320 200" className={className} preserveAspectRatio="xMidYMid slice">
      {ARTS[art]()}
    </svg>
  );
}

/** Lucien's portrait for the relationship page */
export function Portrait({ size = 120, mystery = false }: { size?: number; mystery?: boolean }) {
  return (
    <svg viewBox="0 0 120 120" width={size} height={size}>
      <defs>
        <radialGradient id="pbg" cx="50%" cy="40%" r="65%">
          <stop offset="0" stopColor="#e8d6e6" />
          <stop offset="1" stopColor="#a594c4" />
        </radialGradient>
      </defs>
      <circle cx="60" cy="60" r="58" fill="url(#pbg)" />
      <path d="M20 120 C22 92 40 82 60 82 C80 82 98 92 100 120Z" fill="#2f2a3a" />
      <path d="M48 84 L60 98 L72 84" fill="#47405a" />
      <path d="M56 92 L60 88 L64 92 L60 96Z" fill="#e2c99a" />
      <circle cx="60" cy="56" r="27" fill="#efd2c0" />
      <g fill={mystery ? '#3a3046' : '#2b2128'}>
        {[
          [36, 44, 10],
          [46, 34, 11],
          [60, 30, 12],
          [74, 34, 11],
          [84, 44, 10],
          [40, 56, 8],
          [82, 56, 8],
          [54, 38, 8],
          [68, 38, 8],
          [62, 42, 7],
        ].map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} />
        ))}
      </g>
      <circle cx="51" cy="60" r="3" fill="#2a2230" />
      <circle cx="69" cy="60" r="3" fill="#2a2230" />
      <circle cx="52" cy="59" r="0.9" fill="#fff" />
      <circle cx="70" cy="59" r="0.9" fill="#fff" />
      <path d="M46 53 L55 52 M65 52 L74 53" stroke="#2b2128" strokeWidth="1.6" strokeLinecap="round" />
      <ellipse cx="45" cy="68" rx="4" ry="2.4" fill="#f0a6a8" opacity="0.55" />
      <ellipse cx="75" cy="68" rx="4" ry="2.4" fill="#f0a6a8" opacity="0.55" />
      <path d="M57 71 Q60 73 63 71" stroke="#8a5a5a" strokeWidth="1.3" fill="none" strokeLinecap="round" />
      {mystery && <circle cx="60" cy="60" r="58" fill="#2c2b4a" opacity="0.35" />}
    </svg>
  );
}
