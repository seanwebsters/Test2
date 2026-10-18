import { memo, type ReactNode } from "react";
import type { Art } from "@/lib/types";
import { cn } from "@/lib/cn";

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function rng(seed: string) {
  let a = hash(seed);
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function blobPath(cx: number, cy: number, r: number, rand: () => number, points = 7) {
  const pts = Array.from({ length: points }, (_, i) => {
    const a = (i / points) * Math.PI * 2;
    const rr = r * (0.75 + rand() * 0.45);
    return [Math.round((cx + Math.cos(a) * rr) * 10) / 10, Math.round((cy + Math.sin(a) * rr) * 10) / 10];
  });
  let d = "";
  for (let i = 0; i < pts.length; i++) {
    const p0 = pts[(i - 1 + pts.length) % pts.length];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % pts.length];
    const p3 = pts[(i + 2) % pts.length];
    if (i === 0) d += `M${p1[0].toFixed(1)},${p1[1].toFixed(1)}`;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d + "Z";
}

const f = (n: number) => Math.round(n * 10) / 10;

function Motif({ art, seed }: { art: Art; seed: string }) {
  const [bg, a, b, ink] = art.palette;
  const r = rng(seed);
  const uid = `m${hash(seed).toString(36)}`;
  switch (art.motif) {
    case "sun": {
      const stripes = Array.from({ length: 9 }, (_, i) => ({ y: 230 + i * 20 + i * i * 0.8, h: 3 + i * 1.6 }));
      return (
        <g>
          <defs>
            <clipPath id={`${uid}c`}>
              <circle cx="200" cy="215" r="135" />
            </clipPath>
          </defs>
          <circle cx="200" cy="215" r="135" fill={a} />
          <g clipPath={`url(#${uid}c)`}>
            {stripes.map((s, i) => <rect key={i} x="40" y={s.y} width="320" height={s.h} fill={bg} />)}
          </g>
          <rect x="0" y="352" width="400" height="48" fill={b} opacity="0.9" />
          <circle cx={60 + r() * 60} cy={60 + r() * 30} r="5" fill={b} />
        </g>
      );
    }
    case "columns": {
      const n = 5;
      return (
        <g>
          <circle cx="200" cy="170" r="150" fill={b} opacity="0.13" />
          {Array.from({ length: n }, (_, i) => {
            const w = 46;
            const x = 40 + i * 67;
            const top = 120 + Math.abs(i - 2) * 34 + r() * 18;
            return (
              <g key={i}>
                <path d={`M${x},400 L${x},${top + w / 2} A${w / 2},${w / 2} 0 0 1 ${x + w},${top + w / 2} L${x + w},400 Z`} fill={i % 2 ? a : b} />
                {[0.25, 0.5, 0.75].map((f) => <rect key={f} x={x + w * f - 1.5} y={top + w / 2 + 6} width="3" height={400 - top} fill={bg} opacity="0.25" />)}
              </g>
            );
          })}
          <rect x="20" y="380" width="360" height="12" fill={a} />
        </g>
      );
    }
    case "orbit":
      return (
        <g transform="rotate(-18 200 200)">
          {[170, 135, 100, 65].map((rx, i) => (
            <ellipse key={rx} cx="200" cy="200" rx={rx} ry={rx * 0.42} fill="none" stroke={i % 2 ? b : a} strokeWidth={i === 0 ? 3 : 1.5} opacity={1 - i * 0.12} />
          ))}
          <circle cx="200" cy="200" r="46" fill={a} />
          <circle cx="200" cy="200" r="46" fill={`url(#${uid}g)`} />
          <circle cx={f(200 + 135 * Math.cos(r() * 6.28))} cy={f(200 + 56 * Math.sin(r() * 6.28))} r="12" fill={b} />
          <circle cx={f(200 + 170 * Math.cos(r() * 6.28))} cy={f(200 + 71 * Math.sin(r() * 6.28))} r="6" fill={ink} />
          <defs>
            <radialGradient id={`${uid}g`} cx="0.3" cy="0.3" r="0.8">
              <stop offset="0" stopColor="#fff" stopOpacity="0.5" />
              <stop offset="1" stopColor={bg} stopOpacity="0.5" />
            </radialGradient>
          </defs>
        </g>
      );
    case "blob":
      return (
        <g>
          <path d={blobPath(150, 170, 120, r)} fill={a} />
          <path d={blobPath(260, 250, 110, r)} fill={b} opacity="0.9" style={{ mixBlendMode: "multiply" }} />
          <path d={blobPath(210, 210, 55, r, 6)} fill={ink} opacity="0.9" />
          <circle cx="320" cy="90" r="14" fill={ink} />
        </g>
      );
    case "grid": {
      const pts: [number, number][] = [];
      for (let x = 0; x < 9; x++) for (let y = 0; y < 9; y++) pts.push([40 + x * 40, 40 + y * 40]);
      const path = Array.from({ length: 6 }, (_, i) => [60 + i * 56, 320 - i * 40 - r() * 60]);
      return (
        <g>
          {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={r() > 0.9 ? 7 : 2.2} fill={r() > 0.85 ? b : ink} opacity={0.55} />)}
          <polyline points={path.map((p) => p.join(",")).join(" ")} fill="none" stroke={a} strokeWidth="14" strokeLinejoin="round" strokeLinecap="round" />
          {path.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="11" fill={bg} stroke={a} strokeWidth="5" />)}
          <rect x="250" y="40" width="110" height="110" rx="55" fill={b} opacity="0.95" />
        </g>
      );
    }
    case "glyph":
      return (
        <g>
          <text x="210" y="330" textAnchor="middle" fontFamily="Unbounded Variable, sans-serif" fontWeight="900" fontSize={(art.glyph ?? "?").length > 2 ? 150 : 300} fill="none" stroke={b} strokeWidth="3">{art.glyph ?? "?"}</text>
          <text x="196" y="316" textAnchor="middle" fontFamily="Unbounded Variable, sans-serif" fontWeight="900" fontSize={(art.glyph ?? "?").length > 2 ? 150 : 300} fill={a}>{art.glyph ?? "?"}</text>
          <circle cx="340" cy="70" r="22" fill={b} />
        </g>
      );
    case "waves":
      return (
        <g>
          {Array.from({ length: 13 }, (_, i) => {
            const y = 60 + i * 24;
            const amp = 8 + Math.sin(i / 2) * 14 + r() * 6;
            const ph = r() * 6;
            let d = `M0,${y}`;
            for (let x = 0; x <= 400; x += 10) d += ` L${x},${f(y + Math.sin(x / 38 + ph) * amp)}`;
            return <path key={i} d={d} fill="none" stroke={i === 6 ? b : a} strokeWidth={i === 6 ? 9 : 2.5} opacity={i === 6 ? 1 : 0.85} />;
          })}
        </g>
      );
    case "checker": {
      const cells = [];
      for (let x = 0; x < 8; x++) for (let y = 0; y < 8; y++) if ((x + y) % 2 === 0) cells.push(<rect key={`${x}-${y}`} x={x * 60 - 40} y={y * 60 - 40} width="60" height="60" fill={a} />);
      return (
        <g>
          <g transform="skewY(-12) translate(0 40)">{cells}</g>
          <circle cx="200" cy="200" r="92" fill={b} />
          <circle cx="200" cy="200" r="92" fill="none" stroke={bg} strokeWidth="10" />
        </g>
      );
    }
    case "rays":
      return (
        <g>
          {Array.from({ length: 28 }, (_, i) => {
            const a0 = (i / 28) * Math.PI * 2;
            const a1 = ((i + 0.5) / 28) * Math.PI * 2;
            return <path key={i} d={`M200,200 L${f(200 + Math.cos(a0) * 420)},${f(200 + Math.sin(a0) * 420)} L${f(200 + Math.cos(a1) * 420)},${f(200 + Math.sin(a1) * 420)} Z`} fill={a} opacity={i % 3 === 0 ? 1 : 0.55} />;
          })}
          <circle cx="200" cy="200" r="70" fill={b} />
          <circle cx="200" cy="200" r="30" fill={bg} />
        </g>
      );
    case "stack":
      return (
        <g>
          {Array.from({ length: 6 }, (_, i) => (
            <rect key={i} x={60 + i * 26} y={70 + i * 30} width="190" height="150" rx="26" fill={[a, b, ink][i % 3]} stroke={bg} strokeWidth="5" />
          ))}
        </g>
      );
    case "eye":
      return (
        <g>
          {[190, 150, 110].map((w, i) => (
            <path key={w} d={`M${200 - w},200 Q200,${200 - w * 0.9} ${200 + w},200 Q200,${200 + w * 0.9} ${200 - w},200 Z`} fill={i === 0 ? a : i === 1 ? bg : b} />
          ))}
          <circle cx="200" cy="200" r="58" fill={ink} />
          <circle cx="200" cy="200" r="26" fill={bg} />
          <circle cx="222" cy="180" r="10" fill={ink} opacity="0.9" />
        </g>
      );
    case "spiral": {
      let x = 60, y = 60, s = 280;
      const arcs = [];
      for (let i = 0; i < 7; i++) {
        const dir = i % 4;
        const [cx, cy] = dir === 0 ? [x + s, y + s] : dir === 1 ? [x, y + s] : dir === 2 ? [x, y] : [x + s, y];
        const start = dir === 0 ? [x, y + s] : dir === 1 ? [x, y] : dir === 2 ? [x + s, y] : [x + s, y + s];
        const end = dir === 0 ? [x + s, y] : dir === 1 ? [x + s, y + s] : dir === 2 ? [x, y + s] : [x, y];
        arcs.push(<path key={i} d={`M${start[0]},${start[1]} A${s},${s} 0 0 1 ${end[0]},${end[1]}`} fill="none" stroke={i % 2 ? b : a} strokeWidth={14 - i * 1.5} strokeLinecap="round" />);
        void cx; void cy;
        const ns = s * 0.618;
        if (dir === 0) { x = x + s - ns; } else if (dir === 1) { y = y + s - ns; } else if (dir === 2) { /* x stays */ } else { /* y stays */ }
        s = ns;
      }
      return (
        <g>
          <rect x="60" y="60" width="280" height="280" fill="none" stroke={a} strokeOpacity="0.3" strokeWidth="2" />
          {arcs}
          <circle cx="300" cy="110" r="18" fill={b} />
        </g>
      );
    }
    case "bars":
      return (
        <g>
          {Array.from({ length: 7 }, (_, i) => {
            const h = 50 + i * 38 + r() * 30;
            return (
              <g key={i}>
                <rect x={36 + i * 49} y={360 - h} width="36" height={h} rx="6" fill={i === 6 ? b : a} opacity={0.55 + i * 0.07} />
              </g>
            );
          })}
          <path d="M40,300 L130,250 L200,270 L340,110" fill="none" stroke={ink} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M310,100 L345,105 L338,140" fill="none" stroke={ink} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      );
    case "halftone": {
      const dots = [];
      for (let x = 0; x < 22; x++)
        for (let y = 0; y < 22; y++) {
          const px = 40 + x * 15.3;
          const py = 40 + y * 15.3;
          const d = Math.hypot(px - 200, py - 210);
          if (d > 150) continue;
          const shade = (px - 120 + (py - 130)) / 360;
          const rad = Math.max(0.6, 6.4 * (1 - Math.max(0, Math.min(1, shade))));
          dots.push(<circle key={`${x}-${y}`} cx={px} cy={py} r={rad} fill={a} />);
        }
      return (
        <g>
          {Array.from({ length: 30 }, (_, i) => <circle key={i} cx={r() * 400} cy={r() * 400} r={r() * 1.8 + 0.4} fill={b} opacity={0.8} />)}
          {dots}
          <ellipse cx="200" cy="210" rx="200" ry="40" fill="none" stroke={b} strokeWidth="3" transform="rotate(-14 200 210)" />
        </g>
      );
    }
  }
}

export const CoverArt = memo(function CoverArt({ art, seed, className }: { art: Art; seed: string; className?: string }) {
  const [bg] = art.palette;
  const uid = `v${hash(seed).toString(36)}`;
  return (
    <svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" className={cn("absolute inset-0 h-full w-full", className)} aria-hidden>
      <defs>
        <radialGradient id={`${uid}l`} cx="0.2" cy="0.1" r="0.9">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.16" />
          <stop offset="0.6" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${uid}v`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.45" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.55" />
        </linearGradient>
      </defs>
      <rect width="400" height="400" fill={bg} />
      <Motif art={art} seed={seed} />
      <rect width="400" height="400" fill={`url(#${uid}l)`} />
      <rect width="400" height="400" fill={`url(#${uid}v)`} />
    </svg>
  );
});

export function Cover({
  art,
  seed,
  title,
  label = "KNOWHOW Original",
  className,
  titleClass,
  children,
  showTitle = true,
}: {
  art: Art;
  seed: string;
  title?: string;
  label?: string | null;
  className?: string;
  titleClass?: string;
  children?: ReactNode;
  showTitle?: boolean;
}) {
  const ink = art.palette[3];
  return (
    <div className={cn("relative isolate overflow-hidden rounded-2xl", className)} style={{ containerType: "inline-size", backgroundColor: art.palette[0] }}>
      <CoverArt art={art} seed={seed} />
      {label && (
        <div className="absolute left-[min(7cqw,28px)] top-[min(7cqw,28px)] flex items-center gap-[1.6cqw] font-bold uppercase" style={{ color: ink, fontSize: "clamp(7px, 4.2cqw, 12px)", letterSpacing: "0.14em" }}>
          <span className="grid aspect-square place-items-center rounded-full bg-current" style={{ width: "clamp(10px, 6.4cqw, 20px)" }}>
            <span style={{ color: art.palette[0], fontSize: "clamp(6px, 4cqw, 12px)" }} className="font-display font-black leading-none">K</span>
          </span>
          <span className="opacity-90">{label}</span>
        </div>
      )}
      {showTitle && title && (
        <div
          className={cn("display absolute inset-x-[7cqw] bottom-[7cqw] text-balance", titleClass)}
          style={{ color: ink, fontSize: "clamp(10px, 10.5cqw, 64px)", textShadow: "0 2px 18px rgba(0,0,0,0.25)" }}
        >
          {title}
        </div>
      )}
      {children}
    </div>
  );
}
