"use client";

/**
 * Procedural cinematic world artwork.
 *
 * Each world is rendered as a layered SVG matte painting: sky gradient,
 * nebula haze, seeded starfield, a celestial body, distant/mid/near
 * silhouettes and atmospheric fog. A licensed partner would instead supply
 * `artUrl` and this component renders the approved key art.
 */
import React, { memo, useEffect, useId, useRef, useState } from "react";
import type { IPWorld, SceneKind } from "@/lib/types";

type Palette = IPWorld["visualStyle"]["palette"];

function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a * 1664525 + 1013904223) % 4294967296;
    return a / 4294967296;
  };
}
const seedOf = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

interface Props {
  scene: SceneKind;
  palette: Palette;
  seed?: string;
  className?: string;
  /** "card" trims detail for small sizes; "hero" adds extra depth. */
  detail?: "card" | "hero";
  /** 0..1 — the player dims the world as sleep deepens. */
  dim?: number;
  artUrl?: string;
}

export const WorldArt = memo(function WorldArt({ scene, palette, seed = scene, className = "", detail = "card", dim = 0, artUrl }: Props) {
  const raw = "u" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const id = (n: string) => `${raw}-${n}`;
  const r = rng(seedOf(seed));
  const [top, mid, horizon, accent, glow] = palette;
  const starCount = detail === "hero" ? 160 : 70;
  const stars = Array.from({ length: starCount }, () => ({ x: r() * 1600, y: r() * (scene === "sea" || scene === "academy" ? 470 : 620), s: r() * r() * 2.4 + 0.4, o: 0.3 + r() * 0.7, t: r() > 0.8 }));

  // Frame the scene around its focal point on narrow (portrait) containers.
  const box = useRef<HTMLDivElement>(null);
  const [viewBox, setViewBox] = useState("0 0 1600 900");
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const focus = FOCUS[scene] * 1600;
    const update = () => {
      const { width, height } = el.getBoundingClientRect();
      if (!width || !height) return;
      const vw = (900 * width) / height;
      if (vw >= 1600) return setViewBox("0 0 1600 900");
      const x0 = Math.max(0, Math.min(1600 - vw, focus - vw / 2));
      setViewBox(`${x0.toFixed(0)} 0 ${vw.toFixed(0)} 900`);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [scene]);

  if (artUrl)
    return (
      <div className={`${/\babsolute\b/.test(className) ? "" : "relative"} overflow-hidden ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={artUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      </div>
    );

  return (
    <div ref={box} className={`${/\babsolute\b/.test(className) ? "" : "relative"} overflow-hidden ${className}`} aria-hidden>
      <svg viewBox={viewBox} preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id={id("sky")} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={top} />
            <stop offset="0.55" stopColor={mid} />
            <stop offset="1" stopColor={horizon} />
          </linearGradient>
          <radialGradient id={id("neb1")} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor={glow} stopOpacity="0.55" />
            <stop offset="1" stopColor={glow} stopOpacity="0" />
          </radialGradient>
          <radialGradient id={id("neb2")} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor={accent} stopOpacity="0.35" />
            <stop offset="1" stopColor={accent} stopOpacity="0" />
          </radialGradient>
          <radialGradient id={id("moon")} cx="0.38" cy="0.35" r="0.75">
            <stop offset="0" stopColor="#fffaf0" />
            <stop offset="0.55" stopColor={blend(accent, "#fff6e0")} />
            <stop offset="1" stopColor={accent} stopOpacity="0.85" />
          </radialGradient>
          <radialGradient id={id("halo")} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor={accent} stopOpacity="0.45" />
            <stop offset="0.4" stopColor={accent} stopOpacity="0.12" />
            <stop offset="1" stopColor={accent} stopOpacity="0" />
          </radialGradient>
          <linearGradient id={id("fog")} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={horizon} stopOpacity="0" />
            <stop offset="0.6" stopColor={glow} stopOpacity="0.16" />
            <stop offset="1" stopColor={top} stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id={id("water")} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={horizon} />
            <stop offset="1" stopColor={top} />
          </linearGradient>
          <linearGradient id={id("far")} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={blend(horizon, glow, 0.25)} />
            <stop offset="1" stopColor={mid} />
          </linearGradient>
          <linearGradient id={id("near")} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={blend(top, mid, 0.5)} />
            <stop offset="1" stopColor={top} />
          </linearGradient>
          <filter id={id("blur")} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="40" />
          </filter>
          <filter id={id("soft")} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
          <filter id={id("glowf")} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width="1600" height="900" fill={`url(#${id("sky")})`} />
        {/* nebula haze */}
        <ellipse cx={300 + r() * 500} cy={180 + r() * 120} rx="520" ry="240" fill={`url(#${id("neb1")})`} filter={`url(#${id("blur")})`} />
        <ellipse cx={900 + r() * 500} cy={120 + r() * 200} rx="460" ry="200" fill={`url(#${id("neb2")})`} filter={`url(#${id("blur")})`} />

        {/* stars */}
        <g>
          {stars.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={s.s} fill="#fff" opacity={s.o} className={s.t ? "animate-twinkle" : undefined} style={s.t ? { animationDelay: `${(i % 7) * 0.6}s` } : undefined} />
          ))}
        </g>

        <Scene scene={scene} id={id} r={r} palette={palette} detail={detail} />

        <rect y="520" width="1600" height="380" fill={`url(#${id("fog")})`} />
      </svg>
      {dim > 0 && <div className="pointer-events-none absolute inset-0 bg-night-950 transition-opacity duration-[3000ms]" style={{ opacity: dim }} />}
    </div>
  );
});

/* ------------------------------------------------------------------ */

function Scene({ scene, id, r, palette, detail }: { scene: SceneKind; id: (n: string) => string; r: () => number; palette: Palette; detail: "card" | "hero" }) {
  const [top, mid, horizon, accent, glow] = palette;
  const moon = (cx: number, cy: number, rad: number) => (
    <g>
      <circle cx={cx} cy={cy} r={rad * 3.2} fill={`url(#${id("halo")})`} />
      <circle cx={cx} cy={cy} r={rad} fill={`url(#${id("moon")})`} />
      <circle cx={cx - rad * 0.3} cy={cy + rad * 0.2} r={rad * 0.14} fill={accent} opacity="0.18" />
      <circle cx={cx + rad * 0.25} cy={cy - rad * 0.25} r={rad * 0.09} fill={accent} opacity="0.15" />
    </g>
  );
  const ridge = (baseY: number, amp: number, steps: number, fill: string, op = 1) => {
    let d = `M0 ${baseY}`;
    for (let i = 0; i <= steps; i++) {
      const x = (i / steps) * 1600;
      const y = baseY - r() * amp;
      d += ` L${x.toFixed(0)} ${y.toFixed(0)}`;
    }
    d += " L1600 900 L0 900 Z";
    return <path d={d} fill={fill} opacity={op} />;
  };
  const windows = (n: number, x0: number, x1: number, y0: number, y1: number, color = "#ffd68a") =>
    Array.from({ length: n }, (_, i) => <rect key={i} x={x0 + r() * (x1 - x0)} y={y0 + r() * (y1 - y0)} width="4" height="7" rx="1" fill={color} opacity={0.5 + r() * 0.5} />);

  switch (scene) {
    case "space":
      return (
        <g>
          {/* giant ringed planet */}
          <circle cx="1180" cy="330" r="290" fill={`url(#${id("halo")})`} opacity="0.6" />
          <defs>
            <radialGradient id={id("planet")} cx="0.3" cy="0.3" r="0.9">
              <stop offset="0" stopColor={blend(glow, "#ffffff", 0.35)} />
              <stop offset="0.45" stopColor={glow} stopOpacity="0.85" />
              <stop offset="1" stopColor={top} />
            </radialGradient>
          </defs>
          <ellipse cx="1180" cy="330" rx="420" ry="70" fill="none" stroke={accent} strokeOpacity="0.25" strokeWidth="14" transform="rotate(-14 1180 330)" />
          <circle cx="1180" cy="330" r="210" fill={`url(#${id("planet")})`} />
          {Array.from({ length: 5 }, (_, i) => (
            <ellipse key={i} cx="1180" cy={260 + i * 34} rx={200 - Math.abs(2 - i) * 22} ry="6" fill={top} opacity="0.12" />
          ))}
          <path d="M760 400 A420 70 -14 0 0 1600 190" fill="none" stroke={accent} strokeOpacity="0.55" strokeWidth="6" transform="rotate(0)" />
          <path d="M790 410 A430 76 -14 0 0 1600 205" fill="none" stroke={glow} strokeOpacity="0.3" strokeWidth="2" />
          {moon(330, 210, 34)}
          {/* starship */}
          <g transform="translate(250 470) rotate(-6)" filter={`url(#${id("glowf")})`}>
            <path d="M0 40 C120 10 380 0 560 18 C600 22 620 30 600 38 C430 58 160 62 0 40 Z" fill={blend(top, glow, 0.25)} />
            <path d="M80 34 C200 20 380 16 540 24" stroke={accent} strokeOpacity="0.6" strokeWidth="2" fill="none" />
            <path d="M220 22 L300 -30 L360 18 Z" fill={blend(top, glow, 0.18)} />
            {Array.from({ length: 14 }, (_, i) => (
              <circle key={i} cx={120 + i * 30} cy={36} r="2" fill={glow} />
            ))}
            <ellipse cx="-6" cy="40" rx="30" ry="9" fill={glow} opacity="0.85" />
            <ellipse cx="-60" cy="40" rx="90" ry="5" fill={glow} opacity="0.25" />
          </g>
          {/* curved planet horizon */}
          <path d="M-100 900 Q800 600 1700 900 Z" fill={top} />
          <path d="M-100 900 Q800 600 1700 900" fill="none" stroke={glow} strokeOpacity="0.5" strokeWidth="3" filter={`url(#${id("soft")})`} />
        </g>
      );

    case "academy": {
      const castle = (x: number, scale: number, fill: string, lit: boolean) => (
        <g transform={`translate(${x} 0)`} fill={fill}>
          {[
            [0, 520, 70, 200, 60],
            [80, 440, 60, 280, 120],
            [150, 380, 80, 340, 170],
            [240, 470, 60, 250, 100],
            [310, 420, 46, 300, 140],
            [366, 500, 80, 220, 70],
          ].map(([dx, y, w, h, roof], i) => (
            <g key={i}>
              <rect x={dx * scale} y={y} width={w * scale} height={h + 300} />
              <path d={`M${dx * scale - 6} ${y} L${dx * scale + (w * scale) / 2} ${y - roof * scale} L${dx * scale + w * scale + 6} ${y} Z`} />
            </g>
          ))}
          <rect x="-30" y="610" width={480 * scale} height="300" />
          {lit && windows(detail === "hero" ? 40 : 22, 10, 440 * scale, 470, 700, accent)}
        </g>
      );
      return (
        <g>
          {moon(1240, 200, 78)}
          {moon(1380, 300, 22)}
          {ridge(560, 140, 9, `url(#${id("far")})`, 0.7)}
          {castle(560, 1, blend(top, mid, 0.35), true)}
          {ridge(700, 60, 14, `url(#${id("near")})`)}
          {/* lake with reflection */}
          <rect y="720" width="1600" height="180" fill={`url(#${id("water")})`} opacity="0.95" />
          <ellipse cx="1240" cy="780" rx="70" ry="8" fill={accent} opacity="0.35" />
          {Array.from({ length: 8 }, (_, i) => (
            <rect key={i} x={1140 + r() * 160} y={745 + i * 18} width={40 + r() * 80} height="2" fill={accent} opacity={0.35 - i * 0.03} />
          ))}
          {/* pines */}
          {Array.from({ length: 18 }, (_, i) => {
            const x = i < 9 ? i * 55 - 20 : 1100 + (i - 9) * 60;
            const h = 120 + r() * 140;
            return <path key={i} d={`M${x} 740 L${x + 24} ${740 - h} L${x + 48} 740 Z`} fill={top} />;
          })}
        </g>
      );
    }

    case "sea":
      return (
        <g>
          {moon(1150, 250, 120)}
          {ridge(540, 90, 6, `url(#${id("far")})`, 0.55)}
          {/* islands with lanterns */}
          <path d="M60 560 Q200 420 360 560 Z" fill={blend(top, mid, 0.5)} />
          <path d="M1320 560 Q1440 470 1600 560 Z" fill={blend(top, mid, 0.5)} />
          {[150, 210, 260, 1400, 1470].map((x, i) => (
            <circle key={i} cx={x} cy={530 + (i % 2) * 12} r="3" fill={accent} filter={`url(#${id("glowf")})`} />
          ))}
          <rect y="555" width="1600" height="345" fill={`url(#${id("water")})`} />
          {/* moon path on water */}
          {Array.from({ length: 22 }, (_, i) => (
            <rect key={i} x={1150 - (30 + i * 9) / 2 + (r() - 0.5) * 40} y={565 + i * 15} width={30 + i * 9 + r() * 40} height="2.5" rx="1" fill={accent} opacity={0.6 - i * 0.022} />
          ))}
          {Array.from({ length: 30 }, (_, i) => (
            <path key={i} d={`M${r() * 1600} ${590 + r() * 300} q20 -6 40 0`} stroke={glow} strokeOpacity={0.12 + r() * 0.12} fill="none" strokeWidth="1.5" />
          ))}
          {/* tall ship */}
          <g transform="translate(520 300)">
            <path d="M-40 300 L420 300 L380 360 L0 360 Z" fill={top} />
            <path d="M-40 300 L-90 280 L-40 290 Z" fill={top} />
            {[
              [70, -10, 280],
              [190, -60, 340],
              [310, 0, 260],
            ].map(([x, y, h], i) => (
              <g key={i}>
                <rect x={x} y={y} width="5" height={300 - y} fill={top} />
                <path d={`M${x - 70} ${y + 30} Q${x + 2} ${y + 50} ${x + 74} ${y + 30} L${x + 66} ${y + 110} Q${x + 2} ${y + 125} ${x - 62} ${y + 110} Z`} fill={blend(mid, accent, 0.15)} opacity="0.9" />
                <path d={`M${x - 58} ${y + 128} Q${x + 2} ${y + 145} ${x + 62} ${y + 128} L${x + 56} ${y + 210} Q${x + 2} ${y + 222} ${x - 52} ${y + 210} Z`} fill={blend(mid, accent, 0.12)} opacity="0.85" />
              </g>
            ))}
            <path d="M-40 290 L70 30" stroke={top} strokeWidth="2" />
            <path d="M190 -60 L-40 290 M190 -60 L420 300" stroke={top} strokeWidth="1.2" opacity="0.7" />
            {[30, 120, 250, 350].map((x, i) => (
              <circle key={i} cx={x} cy={320} r="4" fill={accent} filter={`url(#${id("glowf")})`} />
            ))}
            {/* reflection */}
            <path d="M0 365 L380 365 L360 420 L20 420 Z" fill={top} opacity="0.35" />
          </g>
        </g>
      );

    case "kingdom":
      return (
        <g>
          {moon(320, 190, 60)}
          {ridge(600, 120, 8, `url(#${id("far")})`, 0.6)}
          {/* emerald spires */}
          <g filter={`url(#${id("glowf")})`}>
            {Array.from({ length: 13 }, (_, i) => {
              const x = 820 + i * 44 + (r() - 0.5) * 20;
              const h = 140 + Math.sin((i / 12) * Math.PI) * 300 + r() * 60;
              const w = 22 + r() * 18;
              return (
                <g key={i}>
                  <path d={`M${x} 640 L${x} ${640 - h} L${x + w / 2} ${640 - h - 70 - r() * 50} L${x + w} ${640 - h} L${x + w} 640 Z`} fill={blend(mid, accent, 0.25 + r() * 0.2)} opacity="0.9" />
                  <rect x={x + w / 2 - 1} y={640 - h + 10} width="2" height={h - 20} fill={accent} opacity="0.5" />
                </g>
              );
            })}
          </g>
          <ellipse cx="1100" cy="560" rx="420" ry="160" fill={`url(#${id("neb2")})`} filter={`url(#${id("blur")})`} />
          {ridge(700, 50, 16, `url(#${id("near")})`)}
          {/* winding glowing road */}
          <path d="M200 900 C420 800 760 780 860 700 S1060 650 1100 640" stroke={glow} strokeWidth="10" fill="none" opacity="0.55" filter={`url(#${id("soft")})`} />
          {/* meadow flowers */}
          {Array.from({ length: detail === "hero" ? 120 : 50 }, (_, i) => (
            <circle key={i} cx={r() * 1600} cy={760 + r() * 140} r={1 + r() * 2.5} fill={i % 3 ? glow : accent} opacity={0.4 + r() * 0.5} />
          ))}
        </g>
      );

    case "blocks": {
      const cube = (x: number, y: number, s: number, c: string, k: number) => (
        <g key={k}>
          <path d={`M${x} ${y} L${x + s} ${y - s / 2} L${x + 2 * s} ${y} L${x + s} ${y + s / 2} Z`} fill={blend(c, "#ffffff", 0.18)} />
          <path d={`M${x} ${y} L${x + s} ${y + s / 2} L${x + s} ${y + 1.5 * s} L${x} ${y + s} Z`} fill={c} />
          <path d={`M${x + 2 * s} ${y} L${x + s} ${y + s / 2} L${x + s} ${y + 1.5 * s} L${x + 2 * s} ${y + s} Z`} fill={blend(c, "#000000", 0.35)} />
        </g>
      );
      const island = (ox: number, oy: number, s: number, n: number, key: string) => {
        const cubes: React.ReactElement[] = [];
        let k = 0;
        for (let row = 0; row < n; row++)
          for (let col = 0; col < n; col++) cubes.push(cube(ox + (col - row) * s, oy + (col + row) * (s / 2), s, blend(glow, top, 0.35), k++));
        for (let d = 1; d < 4; d++)
          for (let i = 0; i < n - d; i++) cubes.push(cube(ox + (i - (n - 1)) * s + d * s * 0.5, oy + (i + n - 1) * (s / 2) + d * s, s, blend(mid, top, 0.4), k++));
        return <g key={key}>{cubes}</g>;
      };
      return (
        <g>
          {moon(1300, 180, 50)}
          {island(980, 420, 34, 6, "a")}
          {/* houses */}
          <g>
            {cube(960, 360, 30, blend(accent, mid, 0.55), 900)}
            {cube(1060, 400, 26, blend(accent, mid, 0.55), 901)}
            <rect x="985" y="388" width="8" height="10" fill={accent} filter={`url(#${id("glowf")})`} />
            <rect x="1080" y="424" width="7" height="9" fill={accent} filter={`url(#${id("glowf")})`} />
            {/* tiny lighthouse */}
            <rect x="1150" y="300" width="18" height="110" fill={blend(mid, "#ffffff", 0.2)} />
            <circle cx="1159" cy="296" r="9" fill={accent} filter={`url(#${id("glowf")})`} />
            <path d="M1159 296 L1500 240 L1500 330 Z" fill={accent} opacity="0.08" />
          </g>
          {island(330, 560, 22, 4, "b")}
          {island(620, 250, 16, 3, "c")}
          {/* waterfall */}
          <rect x="1010" y="610" width="10" height="290" fill={glow} opacity="0.35" filter={`url(#${id("soft")})`} />
          {Array.from({ length: 30 }, (_, i) => (
            <rect key={i} x={r() * 1600} y={r() * 600} width="3" height="3" fill={accent} opacity={0.3 + r() * 0.5} />
          ))}
        </g>
      );
    }

    case "stadium":
      return (
        <g>
          {/* floodlights */}
          {[180, 1420].map((x, i) => (
            <g key={i}>
              <path d={`M${x} 240 L${x + (i ? -520 : 520)} 760 L${x + (i ? -120 : 120)} 760 Z`} fill={accent} opacity="0.07" />
              <rect x={x - 4} y="240" width="8" height="420" fill={top} />
              <rect x={x - 46} y="206" width="92" height="40" rx="4" fill={top} />
              {Array.from({ length: 8 }, (_, j) => (
                <circle key={j} cx={x - 36 + (j % 4) * 24} cy={216 + Math.floor(j / 4) * 20} r="6" fill="#fff8e6" filter={`url(#${id("glowf")})`} />
              ))}
              <circle cx={x} cy="226" r="140" fill={`url(#${id("halo")})`} />
            </g>
          ))}
          {/* stands bowl */}
          <path d="M0 520 Q800 380 1600 520 L1600 700 L0 700 Z" fill={blend(top, mid, 0.5)} />
          {Array.from({ length: 7 }, (_, i) => (
            <path key={i} d={`M0 ${540 + i * 22} Q800 ${410 + i * 26} 1600 ${540 + i * 22}`} stroke={glow} strokeOpacity={0.08} fill="none" />
          ))}
          {Array.from({ length: detail === "hero" ? 160 : 60 }, (_, i) => (
            <circle key={i} cx={r() * 1600} cy={500 + r() * 160} r="1.2" fill={accent} opacity={0.15 + r() * 0.3} />
          ))}
          {/* pitch with stripes */}
          <path d="M-200 900 L320 660 L1280 660 L1800 900 Z" fill={blend(mid, "#1f5a3a", 0.45)} />
          {Array.from({ length: 8 }, (_, i) => (
            <path key={i} d={`M${-200 + i * 250} 900 L${320 + i * 120} 660 L${380 + i * 120} 660 L${-80 + i * 250} 900 Z`} fill="#ffffff" opacity="0.025" />
          ))}
          <ellipse cx="800" cy="760" rx="160" ry="38" fill="none" stroke="#fff" strokeOpacity="0.25" strokeWidth="2" />
          <path d="M800 660 L800 900" stroke="#fff" strokeOpacity="0.2" strokeWidth="2" />
          <ellipse cx="800" cy="700" rx="900" ry="80" fill={glow} opacity="0.08" filter={`url(#${id("blur")})`} />
        </g>
      );

    case "train":
      return (
        <g>
          {/* aurora ribbons */}
          <g filter={`url(#${id("blur")})`} opacity="0.9">
            <path d="M-100 300 C300 120 600 380 900 200 S1400 160 1700 260 L1700 360 C1400 260 1200 320 900 300 S300 260 -100 420 Z" fill={accent} opacity="0.45" />
            <path d="M-100 200 C400 60 700 260 1000 120 S1500 120 1700 160 L1700 220 C1400 200 1200 240 1000 210 S400 180 -100 280 Z" fill={glow} opacity="0.35" />
          </g>
          {Array.from({ length: 50 }, (_, i) => (
            <rect key={i} x={i * 34} y={160 + Math.sin(i / 4) * 60} width="2" height={80 + r() * 120} fill={accent} opacity={0.08 + r() * 0.1} />
          ))}
          {ridge(560, 220, 7, `url(#${id("far")})`, 0.8)}
          {/* snow caps */}
          {ridge(640, 80, 12, blend(mid, "#ffffff", 0.12))}
          {/* train */}
          <g transform="translate(160 640)">
            {Array.from({ length: 7 }, (_, i) => (
              <g key={i} transform={`translate(${i * 170} 0)`}>
                <rect width="160" height="54" rx="8" fill={top} />
                {Array.from({ length: 5 }, (_, j) => (
                  <rect key={j} x={14 + j * 28} y="14" width="18" height="16" rx="2" fill={blend(accent, "#ffd68a", 0.6)} opacity={0.6 + r() * 0.4} filter={`url(#${id("glowf")})`} />
                ))}
              </g>
            ))}
            <path d="M1190 0 L1260 0 Q1300 20 1300 54 L1190 54 Z" fill={top} />
            <circle cx="1292" cy="38" r="5" fill="#fff6dc" filter={`url(#${id("glowf")})`} />
            <path d="M1300 38 L1600 20 L1600 60 Z" fill="#fff6dc" opacity="0.08" />
            <rect x="-200" y="58" width="1800" height="5" fill={top} />
          </g>
          <path d="M0 720 Q800 690 1600 720 L1600 900 L0 900 Z" fill={blend(mid, "#ffffff", 0.1)} />
          {Array.from({ length: detail === "hero" ? 140 : 60 }, (_, i) => (
            <circle key={i} cx={r() * 1600} cy={r() * 900} r={0.8 + r() * 1.8} fill="#fff" opacity={0.25 + r() * 0.5} />
          ))}
        </g>
      );

    case "garden":
      return (
        <g>
          {moon(1340, 170, 44)}
          {/* glasshouse dome */}
          <g transform="translate(800 720)">
            <path d="M-420 0 L-420 -220 Q-420 -460 0 -500 Q420 -460 420 -220 L420 0 Z" fill={glow} opacity="0.12" />
            <path d="M-420 0 L-420 -220 Q-420 -460 0 -500 Q420 -460 420 -220 L420 0" fill="none" stroke={accent} strokeOpacity="0.55" strokeWidth="4" />
            {Array.from({ length: 9 }, (_, i) => {
              const x = -420 + i * 105;
              return <path key={i} d={`M${x} 0 L${x} -220 Q${x * 0.6} ${-440 + Math.abs(x) * 0.25} 0 -500`} fill="none" stroke={accent} strokeOpacity="0.28" strokeWidth="2" />;
            })}
            {Array.from({ length: 5 }, (_, i) => (
              <path key={i} d={`M-420 ${-40 - i * 50} L420 ${-40 - i * 50}`} stroke={accent} strokeOpacity="0.18" strokeWidth="1.5" />
            ))}
            <ellipse cx="0" cy="-160" rx="300" ry="180" fill={accent} opacity="0.18" filter={`url(#${id("blur")})`} />
            {/* palms */}
            {[-240, -60, 150, 280].map((x, i) => (
              <g key={i} transform={`translate(${x} 0)`}>
                <path d={`M0 0 Q10 -150 -4 -${230 + i * 20}`} stroke={top} strokeWidth="8" fill="none" />
                {Array.from({ length: 6 }, (_, j) => {
                  const a = (j / 6) * Math.PI * 2;
                  return <path key={j} d={`M-4 -${230 + i * 20} q${Math.cos(a) * 80} ${Math.sin(a) * 30 - 20} ${Math.cos(a) * 130} ${Math.sin(a) * 50 + 30}`} stroke={top} strokeWidth="10" fill="none" strokeLinecap="round" />;
                })}
              </g>
            ))}
          </g>
          <rect y="720" width="1600" height="180" fill={`url(#${id("water")})`} />
          {/* lilies */}
          {Array.from({ length: 12 }, (_, i) => {
            const x = 100 + r() * 1400, y = 760 + r() * 120;
            return (
              <g key={i}>
                <ellipse cx={x} cy={y} rx="34" ry="8" fill={blend(mid, glow, 0.3)} opacity="0.8" />
                <circle cx={x} cy={y - 5} r="6" fill={accent} filter={`url(#${id("glowf")})`} />
              </g>
            );
          })}
          {/* fireflies */}
          {Array.from({ length: 40 }, (_, i) => (
            <circle key={i} cx={r() * 1600} cy={300 + r() * 500} r={1.5 + r() * 2} fill={accent} opacity={0.4 + r() * 0.6} filter={`url(#${id("glowf")})`} className={i % 3 === 0 ? "animate-twinkle" : undefined} />
          ))}
        </g>
      );
  }
}

/** Horizontal focal point (0..1) of each scene's composition. */
const FOCUS: Record<SceneKind, number> = { space: 0.6, academy: 0.62, sea: 0.56, kingdom: 0.62, blocks: 0.64, stadium: 0.5, train: 0.55, garden: 0.5 };

/** Simple hex blend helper. */
export function blend(a: string, b: string, t = 0.5) {
  const pa = hex(a), pb = hex(b);
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
  return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
function hex(h: string) {
  const s = h.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
}
