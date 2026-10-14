/**
 * Procedural key art. Every series stores an ArtworkSpec (scene + palette +
 * seed) and this renderer turns it into a layered, cinematic SVG landscape.
 * Uploaded or AI-generated images (spec.image_url) take precedence.
 *
 * Pure function of its props – safe in server and client components.
 */
import type { ArtworkSpec, SceneKind } from "@/lib/types";
import { prng } from "@/lib/util";
import type { ReactNode } from "react";

const W = 1600;
const H = 900;

type Rand = () => number;

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m || !m[1]) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Darken/mix a colour toward a deep navy so silhouettes sit in the palette. */
function shade(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const target = [4, 9, 22];
  const mix = rgb.map((c, i) => Math.round(c + ((target[i] ?? 0) - c) * amount));
  return `rgb(${mix.join(",")})`;
}

function stars(rand: Rand, count: number, maxY: number, color: string): ReactNode {
  const out: ReactNode[] = [];
  for (let i = 0; i < count; i++) {
    const r = rand() < 0.08 ? 2.4 : 0.6 + rand() * 1.3;
    out.push(
      <circle
        key={i}
        cx={rand() * W}
        cy={rand() * maxY}
        r={r}
        fill={color}
        opacity={0.35 + rand() * 0.65}
        className={rand() < 0.25 ? "cs-twinkle" : undefined}
        style={rand() < 0.25 ? { animationDelay: `${(rand() * 4).toFixed(2)}s` } : undefined}
      />,
    );
  }
  return <g>{out}</g>;
}

function ridge(rand: Rand, baseY: number, amp: number, jag: number, color: string, opacity = 1): ReactNode {
  let d = `M0 ${H} L0 ${baseY}`;
  const steps = 14 + Math.floor(rand() * 8);
  for (let i = 1; i <= steps; i++) {
    const x = (i / steps) * W;
    const peak = baseY - amp * (0.3 + rand() * 0.7);
    const mid = x - W / steps / 2;
    d += ` L${mid.toFixed(0)} ${(peak - rand() * jag).toFixed(0)} L${x.toFixed(0)} ${(baseY - amp * rand() * 0.4).toFixed(0)}`;
  }
  d += ` L${W} ${H} Z`;
  return <path d={d} fill={color} opacity={opacity} />;
}

function hills(rand: Rand, baseY: number, amp: number, color: string, opacity = 1): ReactNode {
  const phase = rand() * Math.PI * 2;
  const freq = 1.2 + rand() * 1.5;
  let d = `M0 ${H} L0 ${baseY}`;
  for (let x = 0; x <= W; x += 40) {
    const y = baseY - Math.sin((x / W) * Math.PI * freq + phase) * amp - Math.sin((x / W) * 7 + phase) * amp * 0.15;
    d += ` L${x} ${y.toFixed(1)}`;
  }
  d += ` L${W} ${H} Z`;
  return <path d={d} fill={color} opacity={opacity} />;
}

function pines(rand: Rand, baseY: number, count: number, minH: number, maxH: number, color: string): ReactNode {
  const out: ReactNode[] = [];
  for (let i = 0; i < count; i++) {
    const x = rand() * W;
    const h = minH + rand() * (maxH - minH);
    const w = h * (0.32 + rand() * 0.1);
    const y = baseY + rand() * 20;
    let d = "";
    for (let t = 0; t < 3; t++) {
      const top = y - h + t * h * 0.22;
      const bw = w * (0.55 + t * 0.25);
      d += `M${x} ${top} L${x - bw / 2} ${top + h * 0.45} L${x + bw / 2} ${top + h * 0.45} Z `;
    }
    d += `M${x - w * 0.06} ${y - h * 0.12} h${w * 0.12} v${h * 0.15} h${-w * 0.12} Z`;
    out.push(<path key={i} d={d} fill={color} />);
  }
  return <g>{out}</g>;
}

function roundTrees(rand: Rand, baseY: number, count: number, size: number, color: string): ReactNode {
  const out: ReactNode[] = [];
  for (let i = 0; i < count; i++) {
    const x = rand() * W;
    const s = size * (0.6 + rand() * 0.8);
    out.push(
      <g key={i} fill={color}>
        <rect x={x - s * 0.05} y={baseY - s * 0.8} width={s * 0.1} height={s * 0.9} />
        <circle cx={x} cy={baseY - s} r={s * 0.45} />
        <circle cx={x - s * 0.3} cy={baseY - s * 0.75} r={s * 0.32} />
        <circle cx={x + s * 0.32} cy={baseY - s * 0.8} r={s * 0.34} />
      </g>,
    );
  }
  return <g>{out}</g>;
}

function windowLight(x: number, y: number, w: number, h: number, color: string, key: string | number): ReactNode {
  return (
    <g key={key}>
      <rect x={x - w} y={y - h} width={w * 3} height={h * 3} fill={color} opacity={0.12} filter="url(#cs-soft)" />
      <rect x={x} y={y} width={w} height={h} fill={color} rx={w * 0.3} />
    </g>
  );
}

function castle(rand: Rand, cx: number, baseY: number, scale: number, color: string, light: string): ReactNode {
  const parts: ReactNode[] = [];
  const towers = 5 + Math.floor(rand() * 3);
  const span = 520 * scale;
  for (let i = 0; i < towers; i++) {
    const x = cx - span / 2 + (i / (towers - 1)) * span;
    const centerBias = 1 - Math.abs(i / (towers - 1) - 0.5) * 1.4;
    const h = (160 + centerBias * 260 + rand() * 60) * scale;
    const w = (38 + rand() * 26) * scale;
    parts.push(<rect key={`t${i}`} x={x - w / 2} y={baseY - h} width={w} height={h} fill={color} />);
    parts.push(
      <path key={`r${i}`} d={`M${x - w * 0.62} ${baseY - h} L${x} ${baseY - h - w * 1.6} L${x + w * 0.62} ${baseY - h} Z`} fill={color} />,
    );
    parts.push(<line key={`f${i}`} x1={x} y1={baseY - h - w * 1.6} x2={x} y2={baseY - h - w * 2.1} stroke={color} strokeWidth={2 * scale} />);
    const windows = 1 + Math.floor(rand() * 3);
    for (let k = 0; k < windows; k++) {
      if (rand() < 0.75) parts.push(windowLight(x - 4 * scale, baseY - h * (0.3 + k * 0.22), 8 * scale, 14 * scale, light, `w${i}${k}`));
    }
  }
  parts.push(<rect key="wall" x={cx - span / 2} y={baseY - 120 * scale} width={span} height={120 * scale} fill={color} />);
  for (let i = 0; i < 10; i++) {
    parts.push(<rect key={`c${i}`} x={cx - span / 2 + i * (span / 10)} y={baseY - 134 * scale} width={span / 20} height={16 * scale} fill={color} />);
  }
  parts.push(<path key="gate" d={`M${cx - 26 * scale} ${baseY} v${-50 * scale} a${26 * scale} ${26 * scale} 0 0 1 ${52 * scale} 0 v${50 * scale} Z`} fill={light} opacity={0.55} />);
  return <g>{parts}</g>;
}

function cottage(x: number, baseY: number, s: number, color: string, light: string, rand: Rand, key: string | number, smoke = false): ReactNode {
  const w = 90 * s;
  const h = 60 * s;
  return (
    <g key={key}>
      {smoke && (
        <path
          d={`M${x + w * 0.3} ${baseY - h - 70 * s} q ${20 * s} ${-30 * s} 0 ${-60 * s} q ${-20 * s} ${-30 * s} ${10 * s} ${-70 * s}`}
          stroke="#ffffff"
          strokeOpacity={0.12}
          strokeWidth={14 * s}
          fill="none"
          strokeLinecap="round"
          filter="url(#cs-soft)"
        />
      )}
      <rect x={x + w * 0.22} y={baseY - h - 62 * s} width={12 * s} height={30 * s} fill={color} />
      <rect x={x - w / 2} y={baseY - h} width={w} height={h} fill={color} />
      <path d={`M${x - w * 0.62} ${baseY - h} L${x} ${baseY - h - 52 * s} L${x + w * 0.62} ${baseY - h} Z`} fill={color} />
      {windowLight(x - w * 0.3, baseY - h * 0.65, 16 * s, 16 * s, light, "a")}
      {rand() < 0.7 && windowLight(x + w * 0.12, baseY - h * 0.65, 16 * s, 16 * s, light, "b")}
    </g>
  );
}

function village(rand: Rand, baseY: number, count: number, scale: number, color: string, light: string): ReactNode {
  const out: ReactNode[] = [];
  for (let i = 0; i < count; i++) {
    const x = (i + 0.5) * (W / count) + (rand() - 0.5) * 40;
    const s = scale * (0.7 + rand() * 0.6);
    out.push(cottage(x, baseY + rand() * 18, s, color, light, rand, i, rand() < 0.3));
  }
  return <g>{out}</g>;
}

function water(rand: Rand, horizon: number, top: string, bottom: string, glow: string, moonX: number, uid = "w"): ReactNode {
  const lines: ReactNode[] = [];
  for (let i = 0; i < 26; i++) {
    const y = horizon + 10 + i * i * 0.9;
    const w = 40 + i * 14 + rand() * 60;
    lines.push(<rect key={i} x={moonX - w / 2 + (rand() - 0.5) * 30} y={y} width={w} height={2 + i * 0.15} rx={2} fill={glow} opacity={0.5 - i * 0.017} />);
  }
  return (
    <g>
      <rect x={0} y={horizon} width={W} height={H - horizon} fill={`url(#cs-water-${uid})`} />
      <defs>
        <linearGradient id={`cs-water-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={top} />
          <stop offset="1" stopColor={bottom} />
        </linearGradient>
      </defs>
      {lines}
    </g>
  );
}

function fireflies(rand: Rand, count: number, minY: number, color: string): ReactNode {
  const out: ReactNode[] = [];
  for (let i = 0; i < count; i++) {
    const x = rand() * W;
    const y = minY + rand() * (H - minY);
    out.push(
      <g key={i} className="cs-twinkle" style={{ animationDelay: `${(rand() * 4).toFixed(2)}s` }}>
        <circle cx={x} cy={y} r={9} fill={color} opacity={0.18} filter="url(#cs-soft)" />
        <circle cx={x} cy={y} r={2.2} fill={color} />
      </g>,
    );
  }
  return <g>{out}</g>;
}

function planets(rand: Rand, p: ArtworkSpec["palette"], uid = "p"): ReactNode {
  const out: ReactNode[] = [];
  const n = 2 + Math.floor(rand() * 2);
  for (let i = 0; i < n; i++) {
    const r = i === 0 ? 170 + rand() * 90 : 30 + rand() * 60;
    const cx = i === 0 ? W * (0.62 + rand() * 0.2) : rand() * W;
    const cy = i === 0 ? H * (0.42 + rand() * 0.15) : H * (0.15 + rand() * 0.4);
    const gid = `cs-pl-${uid}-${i}`;
    out.push(
      <g key={i}>
        <defs>
          <radialGradient id={gid} cx="0.35" cy="0.3" r="0.8">
            <stop offset="0" stopColor={i % 2 ? p[3] : p[2]} />
            <stop offset="0.6" stopColor={shade(i % 2 ? p[2] : p[1], 0.35)} />
            <stop offset="1" stopColor={shade(p[0], 0.3)} />
          </radialGradient>
        </defs>
        <circle cx={cx} cy={cy} r={r * 1.25} fill={p[2]} opacity={0.08} filter="url(#cs-soft)" />
        <circle cx={cx} cy={cy} r={r} fill={`url(#${gid})`} />
        {i === 0 && (
          <ellipse cx={cx} cy={cy} rx={r * 1.9} ry={r * 0.36} fill="none" stroke={p[3]} strokeOpacity={0.45} strokeWidth={10} transform={`rotate(-14 ${cx} ${cy})`} />
        )}
      </g>,
    );
  }
  return <g>{out}</g>;
}

function nebula(rand: Rand, p: ArtworkSpec["palette"]): ReactNode {
  return (
    <g filter="url(#cs-blur)" opacity={0.5}>
      {[0, 1, 2, 3].map((i) => (
        <ellipse key={i} cx={rand() * W} cy={rand() * H * 0.7} rx={200 + rand() * 300} ry={80 + rand() * 120} fill={i % 2 ? p[2] : p[3]} opacity={0.25} />
      ))}
    </g>
  );
}

function aurora(rand: Rand, p: ArtworkSpec["palette"]): ReactNode {
  const ribbons: ReactNode[] = [];
  for (let i = 0; i < 3; i++) {
    const y = 160 + i * 70 + rand() * 40;
    const amp = 60 + rand() * 60;
    let d = `M-100 ${y}`;
    for (let x = -100; x <= W + 100; x += 100) d += ` Q ${x + 50} ${y - amp * Math.sin(x / 260 + i)} ${x + 100} ${y + amp * 0.4 * Math.cos(x / 300 + i)}`;
    ribbons.push(
      <path key={i} d={d} stroke={i === 1 ? p[3] : p[2]} strokeWidth={70 - i * 14} fill="none" opacity={0.35 - i * 0.07} filter="url(#cs-blur)" strokeLinecap="round" />,
    );
  }
  return <g>{ribbons}</g>;
}

function dunes(rand: Rand, p: ArtworkSpec["palette"]): ReactNode {
  return (
    <g>
      {hills(rand, 600, 70, shade(p[1], 0.45), 1)}
      {hills(rand, 700, 60, shade(p[1], 0.65), 1)}
      {hills(rand, 800, 45, shade(p[1], 0.82), 1)}
      <g>
        {Array.from({ length: 7 }).map((_, i) => {
          const x = 520 + i * 46;
          const y = 668 - i * 6;
          return (
            <g key={i}>
              <ellipse cx={x} cy={y} rx={16} ry={9} fill={shade(p[1], 0.9)} />
              <rect x={x - 2} y={y - 22} width={4} height={14} fill={shade(p[1], 0.9)} />
              {i % 2 === 0 && <circle cx={x + 10} cy={y - 20} r={3} fill={p[3]} />}
              {i % 2 === 0 && <circle cx={x + 10} cy={y - 20} r={12} fill={p[3]} opacity={0.15} />}
            </g>
          );
        })}
      </g>
    </g>
  );
}

function city(rand: Rand, p: ArtworkSpec["palette"]): ReactNode {
  const out: ReactNode[] = [];
  const count = 18;
  for (let i = 0; i < count; i++) {
    const w = 50 + rand() * 70;
    const x = (i / count) * W + (rand() - 0.5) * 30;
    const h = 200 + rand() * 420;
    const color = shade(p[1], 0.55 + rand() * 0.3);
    out.push(<rect key={`b${i}`} x={x} y={H - 120 - h} width={w} height={h + 120} rx={w * 0.45} fill={color} />);
    for (let k = 0; k < 7; k++) {
      if (rand() < 0.55)
        out.push(<rect key={`l${i}${k}`} x={x + w * 0.25 + rand() * w * 0.4} y={H - 120 - h + 30 + rand() * h} width={4} height={10} rx={2} fill={rand() < 0.5 ? p[2] : p[3]} opacity={0.85} />);
    }
  }
  out.push(<path key="bridge" d={`M0 520 Q ${W / 2} 440 ${W} 520`} stroke={p[2]} strokeOpacity={0.55} strokeWidth={5} fill="none" />);
  out.push(<path key="bridge2" d={`M0 640 Q ${W / 2} 580 ${W} 640`} stroke={p[3]} strokeOpacity={0.35} strokeWidth={4} fill="none" />);
  return <g>{out}</g>;
}

function library(rand: Rand, p: ArtworkSpec["palette"]): ReactNode {
  const dark = shade(p[1], 0.75);
  const books: ReactNode[] = [];
  for (let i = 0; i < 16; i++) {
    const x = rand() * W;
    const y = 120 + rand() * 520;
    const w = 40 + rand() * 40;
    books.push(
      <g key={i} transform={`rotate(${(rand() - 0.5) * 60} ${x} ${y})`}>
        <rect x={x} y={y} width={w} height={w * 0.7} rx={3} fill={i % 3 === 0 ? p[2] : shade(p[2], 0.4)} opacity={0.9} />
        <rect x={x + w * 0.48} y={y} width={w * 0.04} height={w * 0.7} fill={dark} />
        <circle cx={x + w / 2} cy={y + w * 0.35} r={w} fill={p[3]} opacity={0.05} />
      </g>,
    );
  }
  return (
    <g>
      <path d={`M560 900 V320 a240 240 0 0 1 480 0 V900 Z`} fill={p[3]} opacity={0.08} />
      <path d={`M600 900 V330 a200 200 0 0 1 400 0 V900 Z`} fill={shade(p[0], 0.2)} stroke={p[2]} strokeOpacity={0.4} strokeWidth={6} />
      {stars(rand, 40, 900, p[3])}
      <rect x={0} y={0} width={420} height={H} fill={dark} />
      <rect x={W - 420} y={0} width={420} height={H} fill={dark} />
      {[0, 1, 2, 3, 4, 5].map((r) => (
        <g key={r}>
          <rect x={20} y={80 + r * 140} width={380} height={10} fill={shade(p[2], 0.6)} />
          <rect x={W - 400} y={80 + r * 140} width={380} height={10} fill={shade(p[2], 0.6)} />
          {Array.from({ length: 14 }).map((_, k) => (
            <rect key={k} x={30 + k * 26} y={80 + r * 140 - 60 - (k % 3) * 8} width={20} height={60 + (k % 3) * 8} fill={k % 4 === 0 ? shade(p[2], 0.3) : shade(p[1], 0.5)} />
          ))}
          {Array.from({ length: 14 }).map((_, k) => (
            <rect key={`r${k}`} x={W - 390 + k * 26} y={80 + r * 140 - 60 - (k % 2) * 10} width={20} height={60 + (k % 2) * 10} fill={k % 5 === 0 ? shade(p[2], 0.3) : shade(p[1], 0.5)} />
          ))}
        </g>
      ))}
      {books}
      {[700, 900].map((x) => (
        <g key={x}>
          <circle cx={x} cy={760} r={60} fill={p[3]} opacity={0.12} filter="url(#cs-soft)" />
          <rect x={x - 8} y={770} width={16} height={60} fill={shade(p[3], 0.2)} />
          <ellipse cx={x} cy={762} rx={6} ry={12} fill={p[3]} />
        </g>
      ))}
    </g>
  );
}

function garden(rand: Rand, p: ArtworkSpec["palette"]): ReactNode {
  const hedge = shade(p[1], 0.7);
  const flowers: ReactNode[] = [];
  for (let i = 0; i < 120; i++) {
    const x = rand() * W;
    const y = 700 + rand() * 200;
    flowers.push(<circle key={i} cx={x} cy={y} r={3 + rand() * 5} fill={rand() < 0.5 ? p[2] : p[3]} opacity={0.6 + rand() * 0.4} />);
  }
  return (
    <g>
      {hills(rand, 640, 40, shade(p[1], 0.55))}
      <path d={`M560 900 V560 a240 240 0 0 1 480 0 V900 h-70 V570 a170 170 0 0 0 -340 0 V900 Z`} fill={hedge} />
      <path d={`M630 900 V570 a170 170 0 0 1 340 0 V900 Z`} fill={p[3]} opacity={0.08} />
      <rect x={0} y={600} width={560} height={300} fill={hedge} />
      <rect x={1040} y={600} width={560} height={300} fill={hedge} />
      {[200, 420, 1180, 1400].map((x) => (
        <g key={x}>
          <line x1={x} y1={600} x2={x} y2={680} stroke={shade(p[3], 0.6)} strokeWidth={3} />
          <circle cx={x} cy={690} r={40} fill={p[3]} opacity={0.15} filter="url(#cs-soft)" />
          <rect x={x - 10} y={680} width={20} height={26} rx={6} fill={p[3]} />
        </g>
      ))}
      {flowers}
    </g>
  );
}

function lighthouse(x: number, baseY: number, p: ArtworkSpec["palette"]): ReactNode {
  const c = shade(p[1], 0.85);
  return (
    <g>
      <path d={`M${x - 34} ${baseY} L${x - 20} ${baseY - 230} L${x + 20} ${baseY - 230} L${x + 34} ${baseY} Z`} fill={c} />
      <rect x={x - 26} y={baseY - 262} width={52} height={32} fill={p[3]} />
      <path d={`M${x - 30} ${baseY - 262} L${x} ${baseY - 292} L${x + 30} ${baseY - 262} Z`} fill={c} />
      <path d={`M${x} ${baseY - 246} L${x - 700} ${baseY - 330} L${x - 700} ${baseY - 170} Z`} fill={p[3]} opacity={0.1} />
      <circle cx={x} cy={baseY - 246} r={60} fill={p[3]} opacity={0.25} filter="url(#cs-soft)" />
    </g>
  );
}

function portrait(rand: Rand, p: ArtworkSpec["palette"]): ReactNode {
  return (
    <g>
      <circle cx={W / 2} cy={H * 0.4} r={380} fill={p[3]} opacity={0.12} filter="url(#cs-blur)" />
      {stars(rand, 50, H, p[3])}
      <g transform={`translate(${W / 2} ${H * 0.98})`}>
        <path d="M-330 0 C -320 -190 -180 -270 0 -270 C 180 -270 320 -190 330 0 Z" fill={p[0]} stroke={p[2]} strokeOpacity={0.5} strokeWidth={4} />
        <rect x={-60} y={-330} width={120} height={90} fill={p[0]} />
        <ellipse cx={0} cy={-470} rx={130} ry={160} fill={p[0]} stroke={p[2]} strokeOpacity={0.6} strokeWidth={5} />
        <path d={`M-140 -480 C -150 -650 150 -650 140 -480 C 120 -560 -120 -560 -140 -480 Z`} fill={p[1]} opacity={0.9} />
      </g>
    </g>
  );
}

function sceneLayers(scene: SceneKind, rand: Rand, p: ArtworkSpec["palette"], uid: string): { moon: boolean; layers: ReactNode } {
  const far = shade(p[1], 0.35);
  const mid = shade(p[1], 0.6);
  const near = shade(p[0], 0.6);
  switch (scene) {
    case "kingdom":
      return {
        moon: true,
        layers: (
          <>
            {ridge(rand, 620, 160, 40, far, 0.9)}
            {hills(rand, 700, 50, mid)}
            {castle(rand, W * 0.5, 660, 1, shade(p[0], 0.55), p[3])}
            {pines(rand, 800, 40, 60, 150, near)}
            {hills(rand, 860, 25, shade(p[0], 0.8))}
          </>
        ),
      };
    case "forest":
      return {
        moon: true,
        layers: (
          <>
            {pines(rand, 600, 60, 180, 340, far)}
            {pines(rand, 720, 50, 220, 420, mid)}
            {fireflies(rand, 40, 400, p[2])}
            {pines(rand, 880, 26, 320, 620, near)}
          </>
        ),
      };
    case "cabin":
      return {
        moon: true,
        layers: (
          <>
            {ridge(rand, 560, 260, 60, far, 0.95)}
            <path d="M0 520 L1600 520" stroke="#fff" strokeOpacity={0} />
            {pines(rand, 700, 50, 90, 200, mid)}
            {hills(rand, 760, 40, shade(p[3], 0.75))}
            {cottage(W * 0.55, 760, 1.6, near, p[2], rand, "cabin", true)}
            {pines(rand, 900, 18, 260, 460, shade(p[0], 0.8))}
          </>
        ),
      };
    case "space":
      return {
        moon: false,
        layers: (
          <>
            {nebula(rand, p)}
            {stars(rand, 220, H, "#ffffff")}
            {planets(rand, p, uid)}
            <path d={`M-50 820 Q ${W * 0.4} 620 ${W + 50} 700`} stroke={p[2]} strokeWidth={3} fill="none" opacity={0.7} />
            {Array.from({ length: 9 }).map((_, i) => (
              <rect key={i} x={260 + i * 64} y={736 - i * 12} width={56} height={22} rx={8} fill={shade(p[1], 0.7)} stroke={p[3]} strokeOpacity={0.5} />
            ))}
          </>
        ),
      };
    case "ocean":
      return {
        moon: true,
        layers: (
          <>
            {water(rand, 560, shade(p[1], 0.3), shade(p[0], 0.7), p[3], W * 0.62, uid)}
            {ridge(rand, 560, 40, 10, far, 0.6)}
            <path d={`M${W * 0.18} 600 q 120 -90 260 -10 q 30 18 0 30 q -140 20 -260 -20 Z`} fill={shade(p[0], 0.75)} />
          </>
        ),
      };
    case "coast":
      return {
        moon: true,
        layers: (
          <>
            {water(rand, 600, shade(p[1], 0.3), shade(p[0], 0.7), p[3], W * 0.35, uid)}
            <path d={`M${W * 0.62} 900 L${W * 0.66} 560 Q ${W * 0.8} 520 ${W} 540 L${W} 900 Z`} fill={shade(p[0], 0.7)} />
            {lighthouse(W * 0.78, 548, p)}
            {village(rand, 620, 4, 0.5, shade(p[0], 0.75), p[2])}
          </>
        ),
      };
    case "garden":
      return { moon: true, layers: garden(rand, p) };
    case "library":
      return { moon: false, layers: library(rand, p) };
    case "village":
      return {
        moon: true,
        layers: (
          <>
            {ridge(rand, 520, 200, 50, far, 0.85)}
            {hills(rand, 660, 40, mid)}
            {village(rand, 760, 8, 1.1, near, p[2])}
            {hills(rand, 880, 20, shade(p[0], 0.85))}
          </>
        ),
      };
    case "desert":
      return { moon: true, layers: dunes(rand, p) };
    case "aurora":
      return {
        moon: false,
        layers: (
          <>
            {aurora(rand, p)}
            {ridge(rand, 640, 260, 70, shade(p[1], 0.4), 1)}
            <path d="M0 900 L0 700 L1600 720 L1600 900 Z" fill={shade(p[3], 0.85)} />
            {village(rand, 760, 5, 0.6, shade(p[0], 0.7), p[3])}
            {pines(rand, 900, 20, 160, 280, shade(p[0], 0.85))}
          </>
        ),
      };
    case "city":
      return { moon: true, layers: city(rand, p) };
    case "lake":
      return {
        moon: true,
        layers: (
          <>
            {ridge(rand, 560, 240, 60, far, 0.9)}
            {pines(rand, 600, 70, 60, 130, mid)}
            {water(rand, 600, shade(p[1], 0.4), shade(p[0], 0.75), p[3], W * 0.32, uid)}
            <path d={`M${W * 0.6} 760 q 60 18 120 0 l -14 16 q -46 10 -92 0 Z`} fill={shade(p[0], 0.85)} />
            <circle cx={W * 0.6 + 60} cy={746} r={4} fill={p[2]} />
            <circle cx={W * 0.6 + 60} cy={746} r={18} fill={p[2]} opacity={0.2} />
          </>
        ),
      };
    case "portrait":
      return { moon: false, layers: portrait(rand, p) };
  }
}

export function SceneArt({
  spec,
  className,
  title,
  priority: _priority,
}: {
  spec: ArtworkSpec;
  className?: string;
  title?: string;
  priority?: boolean;
}) {
  if (spec.image_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={spec.image_url} alt={title ?? ""} className={className} style={{ objectFit: "cover" }} />;
  }
  const rand = prng(spec.seed);
  const p = spec.palette;
  const { moon, layers } = sceneLayers(spec.scene, rand, p, `${spec.seed}`);
  const moonX = W * (0.25 + rand() * 0.5);
  const moonY = H * (0.16 + rand() * 0.14);
  const skyId = `cs-sky-${spec.seed}-${spec.scene}`;
  const glowId = `cs-glow-${spec.seed}-${spec.scene}`;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <defs>
        <linearGradient id={skyId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p[0]} />
          <stop offset="1" stopColor={p[1]} />
        </linearGradient>
        <radialGradient id={glowId} cx={moonX / W} cy={moonY / H} r="0.6">
          <stop offset="0" stopColor={p[3]} stopOpacity={0.4} />
          <stop offset="1" stopColor={p[3]} stopOpacity={0} />
        </radialGradient>
        <filter id="cs-soft" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="12" />
        </filter>
        <filter id="cs-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="40" />
        </filter>
        <linearGradient id="cs-vignette" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.55" stopColor="#07152E" stopOpacity={0} />
          <stop offset="1" stopColor="#07152E" stopOpacity={0.55} />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#${skyId})`} />
      {moon && <rect width={W} height={H} fill={`url(#${glowId})`} />}
      {spec.scene !== "space" && spec.scene !== "library" && spec.scene !== "portrait" && stars(rand, 110, H * 0.55, "#ffffff")}
      {moon && (
        <g>
          <circle cx={moonX} cy={moonY} r={120} fill={p[3]} opacity={0.18} filter="url(#cs-soft)" />
          <circle cx={moonX} cy={moonY} r={58} fill={p[3]} />
          <circle cx={moonX + 14} cy={moonY - 8} r={10} fill="#000" opacity={0.05} />
          <circle cx={moonX - 18} cy={moonY + 14} r={7} fill="#000" opacity={0.05} />
        </g>
      )}
      <ellipse cx={W * 0.5} cy={H * 0.7} rx={W * 0.6} ry={70} fill="#ffffff" opacity={0.04} filter="url(#cs-blur)" />
      {layers}
      <rect width={W} height={H} fill="url(#cs-vignette)" />
    </svg>
  );
}
