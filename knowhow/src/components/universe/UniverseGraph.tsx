"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CATEGORIES, CATEGORY_BY_ID } from "@/content/categories";
import type { Universe, UniverseNode } from "@/lib/universe";
import { cn } from "@/lib/cn";

export interface Positioned extends UniverseNode {
  x: number;
  y: number;
  r: number;
  color: string;
}

const R_CAT = 250;
const rnd = (n: number) => Math.round(n * 10) / 10;
const RING = [0, 0, 135, 105, 95, 90];

/** Deterministic radial tree layout: each category owns a sector; children fan out within it. */
export function layout(u: Universe): Positioned[] {
  const byParent = new Map<string, UniverseNode[]>();
  for (const n of u.nodes) if (n.parent) byParent.set(n.parent, [...(byParent.get(n.parent) ?? []), n]);
  const out: Positioned[] = [];
  const self = u.nodes.find((n) => n.id === "self")!;
  out.push({ ...self, x: 0, y: 0, r: 34, color: "#DFFF57" });
  const sector = (Math.PI * 2) / CATEGORIES.length;

  const leaves = (id: string): number => {
    const kids = byParent.get(id) ?? [];
    return kids.length ? kids.reduce((n, k) => n + leaves(k.id), 0) : 1;
  };

  CATEGORIES.forEach((c, i) => {
    const angle = -Math.PI / 2 + i * sector;
    const cat = u.nodes.find((n) => n.id === `cat:${c.id}`)!;
    const lit = cat.state === "category-lit";
    out.push({ ...cat, x: rnd(Math.cos(angle) * R_CAT), y: rnd(Math.sin(angle) * R_CAT), r: lit ? 22 + Math.min(10, cat.count * 1.5) : 15, color: c.color });
    const place = (parentId: string, a0: number, a1: number, radius: number, depth: number) => {
      const kids = byParent.get(parentId) ?? [];
      const total = kids.reduce((n, k) => n + leaves(k.id), 0) || 1;
      let cursor = a0;
      for (const k of kids) {
        const span = ((a1 - a0) * leaves(k.id)) / total;
        const a = cursor + span / 2;
        const rr = radius + (RING[depth + 1] ?? 90);
        const r = k.state === "lit" ? 9 + Math.min(8, k.count * 2) : k.state === "path" ? 7 : 5.5;
        out.push({ ...k, x: rnd(Math.cos(a) * rr), y: rnd(Math.sin(a) * rr), r, color: c.color });
        place(k.id, cursor, cursor + span, rr, depth + 1);
        cursor += span;
      }
    };
    place(`cat:${c.id}`, angle - sector * 0.46, angle + sector * 0.46, R_CAT, 1);
  });
  return out;
}

type View = { x: number; y: number; k: number };

export function UniverseGraph({
  universe,
  selected,
  onSelect,
  fresh,
  compact,
  className,
}: {
  universe: Universe;
  selected?: string | null;
  onSelect?: (n: Positioned | null) => void;
  fresh?: Set<string>;
  compact?: boolean;
  className?: string;
}) {
  const nodes = useMemo(() => layout(universe), [universe]);
  const pos = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const extent = useMemo(() => Math.max(420, ...nodes.map((n) => Math.hypot(n.x, n.y) + 60)), [nodes]);
  const [view, setView] = useState<View>({ x: 0, y: 0, k: 1 });
  const viewRef = useRef(view);
  viewRef.current = view;
  const svgRef = useRef<SVGSVGElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const drag = useRef<{ moved: boolean; pinch?: number } | null>(null);
  const anim = useRef<number | null>(null);

  const animateTo = useCallback((target: View, ms = 650) => {
    if (anim.current) cancelAnimationFrame(anim.current);
    const from = viewRef.current;
    const t0 = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      const e = 1 - Math.pow(1 - p, 3);
      setView({ x: from.x + (target.x - from.x) * e, y: from.y + (target.y - from.y) * e, k: from.k + (target.k - from.k) * e });
      if (p < 1) anim.current = requestAnimationFrame(step);
    };
    anim.current = requestAnimationFrame(step);
  }, []);

  useEffect(() => {
    if (!selected) return;
    const n = pos.get(selected);
    if (n) animateTo({ x: n.x, y: n.y + (compact ? 0 : 40), k: n.id === "self" ? 1 : n.id.startsWith("cat:") ? 1.7 : 2.2 });
  }, [selected, pos, animateTo, compact]);

  // Fit the category ring on narrow portrait screens (the viewBox is sliced to fill height).
  useEffect(() => {
    const el = svgRef.current;
    if (!el || !el.clientHeight) return;
    const aspect = el.clientWidth / el.clientHeight;
    if (aspect < 1) setView({ x: 0, y: compact ? 0 : -30, k: Math.min(1, (extent * aspect) / (R_CAT + 60)) });
  }, [extent, compact]);

  const half = extent / view.k;
  const vb = `${view.x - half} ${view.y - half} ${half * 2} ${half * 2}`;

  const toWorld = (dx: number, dy: number) => {
    const el = svgRef.current!;
    const size = Math.max(el.clientWidth, el.clientHeight) || 1;
    return { dx: (dx / size) * (2 * extent) / viewRef.current.k, dy: (dy / size) * (2 * extent) / viewRef.current.k };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (compact) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    drag.current = { moved: false };
    if (anim.current) cancelAnimationFrame(anim.current);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev || !drag.current) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (drag.current.pinch) {
        const ratio = dist / drag.current.pinch;
        setView((v) => ({ ...v, k: Math.max(0.6, Math.min(4, v.k * ratio)) }));
      }
      drag.current.pinch = dist;
      drag.current.moved = true;
      return;
    }
    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;
    if (Math.abs(dx) + Math.abs(dy) > 2) drag.current.moved = true;
    const w = toWorld(dx, dy);
    setView((v) => ({ ...v, x: v.x - w.dx, y: v.y - w.dy }));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2 && drag.current) drag.current.pinch = undefined;
    if (pointers.current.size === 0) setTimeout(() => (drag.current = null), 0);
  };

  useEffect(() => {
    const el = svgRef.current;
    if (!el || compact) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setView((v) => ({ ...v, k: Math.max(0.6, Math.min(4, v.k * (e.deltaY > 0 ? 0.9 : 1.1))) }));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [compact]);

  const click = (n: Positioned) => {
    if (drag.current?.moved) return;
    onSelect?.(n);
  };

  const labelFor = (n: Positioned) => {
    if (n.id === "self" || n.id.startsWith("cat:")) return true;
    if (compact) return false;
    if (n.state === "lit" || n.state === "path") return view.k > 0.85;
    return view.k > 1.6 || selected === n.id;
  };

  return (
    <div className={cn("relative h-full w-full touch-none select-none overflow-hidden", className)}>
      <Starfield parallax={view} />
      <svg
        ref={svgRef}
        viewBox={vb}
        preserveAspectRatio="xMidYMid slice"
        className={cn("relative h-full w-full", !compact && "cursor-grab active:cursor-grabbing")}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={(e) => e.target === svgRef.current && !drag.current?.moved && onSelect?.(null)}
        role="img"
        aria-label={`Your knowledge universe: ${universe.litTopics.length} topics lit`}
      >
        <defs>
          <filter id="glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
          <radialGradient id="core">
            <stop offset="0" stopColor="#F7FFD0" />
            <stop offset="0.5" stopColor="#DFFF57" />
            <stop offset="1" stopColor="#9BC21A" />
          </radialGradient>
        </defs>

        <g>
          {[R_CAT, R_CAT + 135, R_CAT + 240].map((r) => <circle key={r} r={r} fill="none" stroke="#F7F4E9" strokeOpacity="0.04" strokeDasharray="2 8" />)}
        </g>

        <g>
          {universe.edges.map((e, i) => {
            const a = pos.get(e.from);
            const b = pos.get(e.to);
            if (!a || !b) return null;
            const color = b.color;
            if (e.kind === "related") {
              const mx = rnd(((a.x + b.x) / 2) * 0.82);
              const my = rnd(((a.y + b.y) / 2) * 0.82);
              return <path key={i} d={`M${a.x},${a.y} Q${mx},${my} ${b.x},${b.y}`} fill="none" stroke={e.lit ? "#F7F4E9" : "#F7F4E9"} strokeOpacity={e.lit ? 0.45 : 0.1} strokeWidth={e.lit ? 1.4 : 1} strokeDasharray="3 6" className={e.lit ? "kh-flow" : undefined} />;
            }
            return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={color} strokeOpacity={e.lit ? 0.75 : 0.13} strokeWidth={e.lit ? 2 : 1} strokeDasharray={e.lit ? "6 6" : undefined} className={e.lit ? "kh-flow" : undefined} />;
          })}
        </g>

        <g>
          {nodes.map((n, i) => {
            const isCat = n.id.startsWith("cat:");
            const lit = n.state === "lit" || n.state === "category-lit" || n.state === "self";
            const dim = n.state === "category-dim" || n.state === "discoverable";
            const isSel = selected === n.id;
            const isFresh = fresh?.has(n.id);
            return (
              <g
                key={n.id}
                transform={`translate(${n.x} ${n.y})`}
                onClick={() => click(n)}
                className={cn(onSelect && "cursor-pointer")}
                role={onSelect ? "button" : undefined}
                aria-label={onSelect ? `${n.label}${lit ? " (lit)" : n.state === "discoverable" ? " (undiscovered)" : ""}` : undefined}
                tabIndex={onSelect && !compact ? 0 : undefined}
                onKeyDown={(e) => e.key === "Enter" && onSelect?.(n)}
              >
                <g className="kh-drift" style={{ animationDelay: `${-(i * 0.37) % 6}s`, animationDuration: `${5 + (i % 5)}s` }}>
                  {lit && <circle r={n.r * 1.9} fill={n.color} opacity={n.id === "self" ? 0.5 : 0.35} filter="url(#glow)" />}
                  {isFresh && <circle r={n.r} fill="none" stroke={n.color} strokeWidth="3" className="kh-burst" />}
                  {isSel && <circle r={n.r + 8} fill="none" stroke="#F7F4E9" strokeWidth="1.5" strokeDasharray="4 4" className="kh-spin" />}
                  <circle
                    r={n.r}
                    fill={n.id === "self" ? "url(#core)" : dim ? "#111114" : n.state === "path" ? `${n.color}66` : n.color}
                    stroke={dim ? n.color : n.state === "path" ? n.color : "none"}
                    strokeOpacity={dim ? 0.55 : 1}
                    strokeWidth={dim ? 1.5 : 1.5}
                    strokeDasharray={n.state === "discoverable" ? "2 3" : undefined}
                  />
                  {isCat && (
                    <text textAnchor="middle" dy="0.36em" fontSize={n.r * 0.95} fontWeight="800" fill={lit ? "#111114" : n.color} style={{ pointerEvents: "none" }}>
                      {CATEGORY_BY_ID[n.category as keyof typeof CATEGORY_BY_ID].glyph}
                    </text>
                  )}
                  {n.id === "self" && <text textAnchor="middle" dy="0.35em" fontSize="13" fontWeight="800" fill="#111114" style={{ pointerEvents: "none", letterSpacing: "0.08em" }}>YOU</text>}
                  {labelFor(n) && n.id !== "self" && (
                    <text
                      y={n.r + (isCat ? 18 : 14)}
                      textAnchor="middle"
                      fontSize={isCat ? 15 : 11}
                      fontWeight={isCat || lit ? 700 : 500}
                      fill={dim ? "#7C7A73" : "#F7F4E9"}
                      style={{ pointerEvents: "none", paintOrder: "stroke", stroke: "#111114", strokeWidth: 4, fontFamily: isCat ? "Unbounded Variable, sans-serif" : undefined }}
                    >
                      {n.label}
                    </text>
                  )}
                </g>
              </g>
            );
          })}
        </g>
      </svg>
      {!compact && (
        <div className="absolute bottom-4 right-4 flex flex-col gap-2 md:bottom-6 md:right-6">
          <button onClick={() => setView((v) => ({ ...v, k: Math.min(4, v.k * 1.3) }))} className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-ink-2/90 text-lg font-bold backdrop-blur" aria-label="Zoom in">+</button>
          <button onClick={() => setView((v) => ({ ...v, k: Math.max(0.6, v.k / 1.3) }))} className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-ink-2/90 text-lg font-bold backdrop-blur" aria-label="Zoom out">−</button>
          <button onClick={() => { onSelect?.(null); const el = svgRef.current!; const aspect = el.clientWidth / el.clientHeight; animateTo({ x: 0, y: aspect < 1 ? -30 : 0, k: aspect < 1 ? Math.min(1, (extent * aspect) / (R_CAT + 60)) : 1 }); }} className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-ink-2/90 text-xs font-bold backdrop-blur" aria-label="Recentre">⦿</button>
        </div>
      )}
    </div>
  );
}

/** Slow drifting particles behind the graph; shifts slightly with the camera for depth. */
function Starfield({ parallax }: { parallax: View }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const pRef = useRef(parallax);
  pRef.current = parallax;
  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const stars = Array.from({ length: 140 }, () => ({ x: Math.random(), y: Math.random(), z: Math.random() * 0.8 + 0.2, tw: Math.random() * Math.PI * 2, hue: Math.random() }));
    const resize = () => {
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
    };
    resize();
    window.addEventListener("resize", resize);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const draw = (t: number) => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const { x: px, y: py } = pRef.current;
      for (const s of stars) {
        const drift = reduce ? 0 : t * 0.000004 * s.z;
        const x = ((s.x + drift - (px / 4000) * s.z) % 1 + 1) % 1;
        const y = ((s.y - (py / 4000) * s.z) % 1 + 1) % 1;
        const a = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(t * 0.0015 * s.z + s.tw));
        ctx.fillStyle = s.hue > 0.85 ? `rgba(223,255,87,${a})` : s.hue > 0.7 ? `rgba(182,161,255,${a})` : `rgba(247,244,233,${a * 0.8})`;
        ctx.beginPath();
        ctx.arc(x * w, y * h, s.z * 1.4 * dpr, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);
  return <canvas ref={ref} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden />;
}
