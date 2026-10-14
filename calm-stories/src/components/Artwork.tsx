import type { ArtworkSpec } from "@/lib/types";
import { prng } from "@/lib/util";

/**
 * Procedural key art. Each series gets a consistent, distinctive scene from its
 * ArtworkSpec (scene + palette + seed). When an uploaded or generated image is
 * attached (`image_url`) it replaces the procedural scene.
 *
 * Pure render – safe in server and client components.
 */
export function Artwork({
  spec,
  title,
  className,
  variant = "card",
}: {
  spec: ArtworkSpec;
  title?: string;
  className?: string;
  variant?: "card" | "hero" | "square";
}) {
  if (spec.image_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={spec.image_url} alt={title ? `${title} artwork` : ""} className={`h-full w-full object-cover ${className ?? ""}`} />;
  }
  const [skyTop, skyBottom, accent, glow] = spec.palette;
  const id = `art-${spec.scene}-${spec.seed}-${variant}`;
  const rand = prng(spec.seed);
  const W = variant === "hero" ? 1600 : 400;
  const H = variant === "hero" ? 700 : variant === "square" ? 400 : 500;
  const ground = H * (variant === "hero" ? 0.72 : 0.7);

  const stars = Array.from({ length: variant === "hero" ? 140 : 60 }, () => ({
    x: rand() * W,
    y: rand() * ground * 0.85,
    r: rand() * (variant === "hero" ? 1.6 : 1.2) + 0.2,
    o: rand() * 0.7 + 0.2,
  }));
  const orb = { x: W * (0.62 + rand() * 0.22), y: H * (0.18 + rand() * 0.1), r: (variant === "hero" ? 70 : 34) + rand() * 14 };

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      className={`h-full w-full ${className ?? ""}`}
      role={title ? "img" : undefined}
      aria-label={title ? `${title} artwork` : undefined}
      aria-hidden={title ? undefined : true}
    >
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={skyTop} />
          <stop offset="0.75" stopColor={skyBottom} />
          <stop offset="1" stopColor={mix(skyBottom, glow, 0.25)} />
        </linearGradient>
        <radialGradient id={`${id}-glow`}>
          <stop offset="0" stopColor={glow} stopOpacity="0.95" />
          <stop offset="0.35" stopColor={glow} stopOpacity="0.35" />
          <stop offset="1" stopColor={glow} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-haze`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={accent} stopOpacity="0" />
          <stop offset="1" stopColor={accent} stopOpacity="0.28" />
        </linearGradient>
        <linearGradient id={`${id}-fade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.55" stopColor="#07152E" stopOpacity="0" />
          <stop offset="1" stopColor="#07152E" stopOpacity="0.85" />
        </linearGradient>
        <filter id={`${id}-blur`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={variant === "hero" ? 18 : 8} />
        </filter>
      </defs>

      <rect width={W} height={H} fill={`url(#${id}-sky)`} />
      {stars.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity={s.o} />
      ))}
      <Scene scene={spec.scene} id={id} W={W} H={H} ground={ground} orb={orb} seed={spec.seed} palette={spec.palette} hero={variant === "hero"} />
      <rect y={H * 0.45} width={W} height={H * 0.55} fill={`url(#${id}-haze)`} />
      <rect width={W} height={H} fill={`url(#${id}-fade)`} />
    </svg>
  );
}

type SceneProps = {
  scene: ArtworkSpec["scene"];
  id: string;
  W: number;
  H: number;
  ground: number;
  orb: { x: number; y: number; r: number };
  /** Scene owns its PRNG so a (StrictMode) re-render can't shift the shared random stream. */
  seed: number;
  palette: ArtworkSpec["palette"];
  /** Wide hero art keeps its focal point right of centre, clear of the headline. */
  hero: boolean;
};

function Moon({ id, orb, color, ring = false }: { id: string; orb: SceneProps["orb"]; color: string; ring?: boolean }) {
  return (
    <g>
      <circle cx={orb.x} cy={orb.y} r={orb.r * 3.2} fill={`url(#${id}-glow)`} />
      <circle cx={orb.x} cy={orb.y} r={orb.r} fill={color} opacity="0.95" />
      <circle cx={orb.x - orb.r * 0.3} cy={orb.y - orb.r * 0.2} r={orb.r * 0.18} fill="#000" opacity="0.06" />
      <circle cx={orb.x + orb.r * 0.35} cy={orb.y + orb.r * 0.25} r={orb.r * 0.12} fill="#000" opacity="0.05" />
      {ring && <ellipse cx={orb.x} cy={orb.y} rx={orb.r * 1.9} ry={orb.r * 0.42} fill="none" stroke={color} strokeOpacity="0.55" strokeWidth={orb.r * 0.09} transform={`rotate(-16 ${orb.x} ${orb.y})`} />}
    </g>
  );
}

function hills(W: number, base: number, amp: number, rand: () => number, segments = 6) {
  const pts: string[] = [`M0 ${base}`];
  const step = W / segments;
  for (let i = 0; i <= segments; i++) {
    const x = i * step;
    const y = base - amp * (0.4 + rand() * 0.6);
    pts.push(`Q${x - step / 2} ${y - amp * 0.3} ${x} ${y}`);
  }
  pts.push(`L${W} ${base + 2000} L0 ${base + 2000} Z`);
  return pts.join(" ");
}

function pine(x: number, base: number, h: number) {
  const w = h * 0.38;
  return `M${x} ${base - h} L${x + w * 0.5} ${base - h * 0.55} L${x + w * 0.3} ${base - h * 0.55} L${x + w * 0.7} ${base - h * 0.15} L${x + w * 0.1} ${base - h * 0.15} L${x + w * 0.1} ${base} L${x - w * 0.1} ${base} L${x - w * 0.1} ${base - h * 0.15} L${x - w * 0.7} ${base - h * 0.15} L${x - w * 0.3} ${base - h * 0.55} L${x - w * 0.5} ${base - h * 0.55} Z`;
}

function Scene({ scene, id, W, H, ground, orb, seed, palette, hero }: SceneProps) {
  const rand = prng((seed ^ 0x9e3779b9) >>> 0);
  const [, skyBottom, accent, glow] = palette;
  const far = mix(skyBottom, "#000000", 0.25);
  const mid = mix(skyBottom, "#000000", 0.5);
  const near = mix(skyBottom, "#000000", 0.72);
  const s = Math.min(W / 400, H / 500);
  const focus = hero ? W * 0.7 : W * 0.5;

  switch (scene) {
    case "kingdom": {
      const cx = hero ? focus : W * 0.42;
      const base = ground - 20 * s;
      const towers = [
        { x: cx - 70 * s, w: 18, h: 120 },
        { x: cx - 35 * s, w: 22, h: 170 },
        { x: cx, w: 30, h: 220 },
        { x: cx + 40 * s, w: 22, h: 160 },
        { x: cx + 72 * s, w: 16, h: 110 },
      ];
      return (
        <g>
          <Moon id={id} orb={orb} color={glow} />
          <path d={hills(W, ground + 10 * s, 50 * s, rand, 5)} fill={far} />
          <rect x={cx - 80 * s} y={base - 70 * s} width={160 * s} height={80 * s} fill={mid} />
          {towers.map((t, i) => (
            <g key={i} fill={mid}>
              <rect x={t.x - (t.w * s) / 2} y={base - t.h * s} width={t.w * s} height={t.h * s} />
              <path d={`M${t.x - (t.w * s) / 2 - 4 * s} ${base - t.h * s} L${t.x} ${base - t.h * s - t.w * 1.6 * s} L${t.x + (t.w * s) / 2 + 4 * s} ${base - t.h * s} Z`} />
              <rect x={t.x - 2 * s} y={base - t.h * s + 20 * s} width={4 * s} height={7 * s} fill={glow} opacity="0.85" />
            </g>
          ))}
          <path d={hills(W, ground + 50 * s, 30 * s, rand, 4)} fill={near} />
          {Array.from({ length: 14 }, (_, i) => (
            <circle key={i} cx={rand() * W} cy={ground + 30 * s + rand() * 60 * s} r={(1.5 + rand() * 1.5) * s} fill={glow} opacity={0.5 + rand() * 0.4} />
          ))}
        </g>
      );
    }
    case "forest":
    case "garden": {
      const rows = [
        { base: ground, h: 120, color: far, n: 14 },
        { base: ground + 40 * s, h: 150, color: mid, n: 10 },
        { base: ground + 90 * s, h: 190, color: near, n: 7 },
      ];
      return (
        <g>
          <Moon id={id} orb={orb} color={glow} />
          {rows.map((r, ri) => (
            <g key={ri} fill={r.color}>
              <rect x={0} y={r.base - 4} width={W} height={H} />
              {Array.from({ length: r.n }, (_, i) => {
                const x = (i / (r.n - 1)) * W + (rand() - 0.5) * 30 * s;
                const h = r.h * s * (0.6 + rand() * 0.5);
                return scene === "garden" && ri === 2 ? (
                  <ellipse key={i} cx={x} cy={r.base} rx={h * 0.35} ry={h * 0.28} />
                ) : (
                  <path key={i} d={pine(x, r.base, h)} />
                );
              })}
            </g>
          ))}
          {scene === "garden" && (
            <g>
              <path d={`M${W * 0.43} ${ground + 92 * s} L${W * 0.43} ${ground + 20 * s} Q${W * 0.5} ${ground - 30 * s} ${W * 0.57} ${ground + 20 * s} L${W * 0.57} ${ground + 92 * s} Z`} fill={mix(near, "#000", 0.3)} />
              <path d={`M${W * 0.455} ${ground + 92 * s} L${W * 0.455} ${ground + 28 * s} Q${W * 0.5} ${ground - 12 * s} ${W * 0.545} ${ground + 28 * s} L${W * 0.545} ${ground + 92 * s} Z`} fill={glow} opacity="0.55" />
            </g>
          )}
          {Array.from({ length: 22 }, (_, i) => (
            <circle key={i} cx={rand() * W} cy={ground - 40 * s + rand() * 140 * s} r={(1 + rand() * 1.6) * s} fill={accent} opacity={0.4 + rand() * 0.5} />
          ))}
        </g>
      );
    }
    case "cabin": {
      const cx = focus;
      const base = ground + 40 * s;
      return (
        <g>
          <Moon id={id} orb={orb} color={glow} />
          <path d={`M0 ${ground} L${W * 0.2} ${ground - 130 * s} L${W * 0.38} ${ground - 40 * s} L${W * 0.6} ${ground - 170 * s} L${W * 0.85} ${ground - 60 * s} L${W} ${ground - 110 * s} L${W} ${H} L0 ${H} Z`} fill={far} />
          <path d={`M${W * 0.6 - 30 * s} ${ground - 130 * s} L${W * 0.6} ${ground - 170 * s} L${W * 0.6 + 34 * s} ${ground - 125 * s} Z`} fill="#fff" opacity="0.5" />
          <path d={hills(W, base, 25 * s, rand, 4)} fill={mix(mid, "#ffffff", 0.12)} />
          {Array.from({ length: 9 }, (_, i) => (
            <path key={i} d={pine((i / 8) * W + (rand() - 0.5) * 20 * s, base + 10 * s, (70 + rand() * 60) * s)} fill={near} />
          ))}
          <g>
            <rect x={cx - 40 * s} y={base - 40 * s} width={80 * s} height={50 * s} fill={mix(near, "#3a2618", 0.4)} />
            <path d={`M${cx - 50 * s} ${base - 38 * s} L${cx} ${base - 78 * s} L${cx + 50 * s} ${base - 38 * s} Z`} fill={mix(near, "#ffffff", 0.35)} />
            <rect x={cx - 26 * s} y={base - 26 * s} width={16 * s} height={14 * s} fill="#ffcf8a" />
            <rect x={cx + 10 * s} y={base - 26 * s} width={16 * s} height={14 * s} fill="#ffcf8a" />
            <circle cx={cx} cy={base - 20 * s} r={70 * s} fill="#ffcf8a" opacity="0.08" />
          </g>
          {Array.from({ length: 50 }, (_, i) => (
            <circle key={i} cx={rand() * W} cy={rand() * H} r={(0.8 + rand() * 1.4) * s} fill="#fff" opacity={0.3 + rand() * 0.5} />
          ))}
        </g>
      );
    }
    case "space": {
      const big = { x: hero ? W * 0.55 : W * 0.32, y: H * 0.55, r: 120 * s };
      return (
        <g>
          <ellipse cx={W * 0.7} cy={H * 0.3} rx={180 * s} ry={70 * s} fill={accent} opacity="0.18" filter={`url(#${id}-blur)`} />
          <ellipse cx={W * 0.25} cy={H * 0.2} rx={140 * s} ry={50 * s} fill={glow} opacity="0.12" filter={`url(#${id}-blur)`} />
          <circle cx={big.x} cy={big.y} r={big.r * 1.5} fill={`url(#${id}-glow)`} opacity="0.4" />
          <circle cx={big.x} cy={big.y} r={big.r} fill={mix(accent, skyBottom, 0.45)} />
          <path d={`M${big.x - big.r} ${big.y} A${big.r} ${big.r} 0 0 0 ${big.x + big.r} ${big.y} Z`} fill="#000" opacity="0.25" />
          {[0.25, 0.45, 0.62].map((t, i) => (
            <ellipse key={i} cx={big.x} cy={big.y - big.r + big.r * 2 * t} rx={big.r * Math.sin(Math.PI * t)} ry={big.r * 0.06} fill={glow} opacity="0.12" />
          ))}
          <ellipse cx={big.x} cy={big.y} rx={big.r * 1.9} ry={big.r * 0.35} fill="none" stroke={glow} strokeOpacity="0.5" strokeWidth={6 * s} transform={`rotate(-14 ${big.x} ${big.y})`} />
          <Moon id={id} orb={{ x: orb.x, y: orb.y, r: orb.r * 0.5 }} color={glow} />
          <circle cx={W * 0.82} cy={H * 0.62} r={14 * s} fill={accent} opacity="0.8" />
        </g>
      );
    }
    case "ocean":
    case "coast":
    case "lake": {
      const horizon = ground - 20 * s;
      return (
        <g>
          <Moon id={id} orb={orb} color={glow} />
          {scene === "lake" && (
            <path d={`M0 ${horizon} L${W * 0.15} ${horizon - 120 * s} L${W * 0.3} ${horizon - 50 * s} L${W * 0.5} ${horizon - 160 * s} L${W * 0.72} ${horizon - 70 * s} L${W * 0.88} ${horizon - 130 * s} L${W} ${horizon - 40 * s} L${W} ${horizon} Z`} fill={far} />
          )}
          {scene === "coast" && (
            <g>
              <path d={`M${W * 0.62} ${horizon} L${W * 0.66} ${horizon - 60 * s} L${W} ${horizon - 80 * s} L${W} ${horizon} Z`} fill={mid} />
              <path d={`M${W * 0.77} ${horizon - 72 * s} L${W * 0.785} ${horizon - 170 * s} L${W * 0.815} ${horizon - 170 * s} L${W * 0.83} ${horizon - 72 * s} Z`} fill={mix(mid, "#ffffff", 0.5)} />
              <rect x={W * 0.776} y={horizon - 185 * s} width={W * 0.048} height={16 * s} fill={glow} />
              <path d={`M${W * 0.8} ${horizon - 177 * s} L0 ${horizon - 230 * s} L0 ${horizon - 150 * s} Z`} fill={glow} opacity="0.13" />
              <path d={`M${W * 0.8} ${horizon - 177 * s} L${W * 0.5} ${horizon - 260 * s} L${W * 0.42} ${horizon - 230 * s} Z`} fill={glow} opacity="0.07" />
              {Array.from({ length: 5 }, (_, i) => (
                <rect key={i} x={W * (0.64 + i * 0.07)} y={horizon - (68 + rand() * 6) * s} width={12 * s} height={10 * s} fill={i % 2 ? "#ffcf8a" : mid} />
              ))}
            </g>
          )}
          <rect x={0} y={horizon} width={W} height={H - horizon} fill={mix(skyBottom, "#000", 0.35)} />
          <rect x={orb.x - orb.r * 0.7} y={horizon} width={orb.r * 1.4} height={H - horizon} fill={glow} opacity="0.12" filter={`url(#${id}-blur)`} />
          {Array.from({ length: 26 }, (_, i) => {
            const y = horizon + 6 * s + (i / 26) * (H - horizon);
            const w = (30 + rand() * 80) * s * (1 + i / 20);
            const x = orb.x + (rand() - 0.5) * (orb.r * 2 + i * 6 * s);
            return <rect key={i} x={x - w / 2} y={y} width={w} height={1.6 * s} fill={glow} opacity={0.12 + rand() * 0.3} rx={1} />;
          })}
          {scene === "ocean" && <path d={hills(W, H - 40 * s, 25 * s, rand, 8)} fill={near} opacity="0.7" />}
        </g>
      );
    }
    case "library": {
      const cx = focus;
      const cy = H * 0.5;
      return (
        <g>
          <Moon id={id} orb={orb} color={glow} />
          {[-1, 1].map((d) => (
            <g key={d}>
              <line x1={cx + d * 50 * s} y1={cy - 30 * s} x2={cx + d * 70 * s} y2={cy - 120 * s} stroke={mid} strokeWidth={1.5 * s} />
              <ellipse cx={cx + d * 75 * s} cy={cy - 150 * s} rx={34 * s} ry={42 * s} fill={mix(accent, skyBottom, 0.35)} />
            </g>
          ))}
          <ellipse cx={cx} cy={cy - 175 * s} rx={40 * s} ry={48 * s} fill={mix(accent, glow, 0.3)} />
          <line x1={cx} y1={cy - 30 * s} x2={cx} y2={cy - 128 * s} stroke={mid} strokeWidth={1.5 * s} />
          <rect x={cx - 80 * s} y={cy - 30 * s} width={160 * s} height={70 * s} rx={6 * s} fill={mid} />
          <path d={`M${cx - 90 * s} ${cy - 30 * s} L${cx} ${cy - 70 * s} L${cx + 90 * s} ${cy - 30 * s} Z`} fill={mid} />
          {Array.from({ length: 5 }, (_, i) => (
            <rect key={i} x={cx - 65 * s + i * 28 * s} y={cy - 15 * s} width={14 * s} height={30 * s} rx={7 * s} fill={glow} opacity="0.8" />
          ))}
          <path d={`M${cx - 70 * s} ${cy + 40 * s} Q${cx} ${cy + 80 * s} ${cx + 70 * s} ${cy + 40 * s} Z`} fill={near} />
          {Array.from({ length: 6 }, (_, i) => (
            <ellipse key={i} cx={rand() * W} cy={ground + rand() * 80 * s} rx={(60 + rand() * 80) * s} ry={(12 + rand() * 12) * s} fill="#fff" opacity="0.08" />
          ))}
        </g>
      );
    }
    case "village":
    case "city": {
      const base = ground + 30 * s;
      const n = scene === "city" ? 12 : 9;
      return (
        <g>
          <Moon id={id} orb={orb} color={glow} />
          <path d={hills(W, ground, 60 * s, rand, 4)} fill={far} />
          {Array.from({ length: n }, (_, i) => {
            const w = (26 + rand() * 24) * s;
            const x = (i / n) * W + rand() * 10 * s;
            const h = (scene === "city" ? 50 + rand() * 80 : 30 + rand() * 30) * s;
            return (
              <g key={i} fill={mid}>
                <rect x={x} y={base - h} width={w} height={h + 200 * s} />
                {scene === "village" ? <path d={`M${x - 4 * s} ${base - h} L${x + w / 2} ${base - h - 22 * s} L${x + w + 4 * s} ${base - h} Z`} /> : null}
                {Array.from({ length: Math.floor(h / (18 * s)) }, (_, k) => (
                  <rect key={k} x={x + w * 0.3} y={base - h + 10 * s + k * 18 * s} width={w * 0.35} height={8 * s} fill={rand() > 0.45 ? "#ffcf8a" : mid} opacity="0.85" />
                ))}
              </g>
            );
          })}
          {scene === "city" && (
            <g fill={near}>
              <rect x={W * 0.7} y={base - 190 * s} width={28 * s} height={200 * s} />
              <path d={`M${W * 0.7 - 4 * s} ${base - 190 * s} L${W * 0.7 + 14 * s} ${base - 225 * s} L${W * 0.7 + 32 * s} ${base - 190 * s} Z`} />
              <circle cx={W * 0.7 + 14 * s} cy={base - 165 * s} r={9 * s} fill={glow} />
            </g>
          )}
          <path d={hills(W, base + 40 * s, 20 * s, rand, 5)} fill={near} />
          {scene === "village" &&
            Array.from({ length: 12 }, (_, i) => {
              const x = rand() * W;
              const y = base - 10 * s + rand() * 40 * s;
              return (
                <g key={i}>
                  <circle cx={x} cy={y} r={10 * s} fill="#ffb26b" opacity="0.15" />
                  <ellipse cx={x} cy={y} rx={4 * s} ry={5 * s} fill="#ffb26b" opacity="0.9" />
                </g>
              );
            })}
        </g>
      );
    }
    case "desert": {
      return (
        <g>
          <Moon id={id} orb={orb} color={glow} />
          <path d={hills(W, ground, 40 * s, rand, 3)} fill={mix(accent, skyBottom, 0.6)} opacity="0.6" />
          <path d={`M${W * 0.15} ${ground + 10 * s} L${W * 0.15} ${ground - 70 * s} Q${W * 0.24} ${ground - 120 * s} ${W * 0.33} ${ground - 70 * s} L${W * 0.33} ${ground + 10 * s} L${W * 0.3} ${ground + 10 * s} L${W * 0.3} ${ground - 60 * s} Q${W * 0.24} ${ground - 95 * s} ${W * 0.18} ${ground - 60 * s} L${W * 0.18} ${ground + 10 * s} Z`} fill={mid} />
          <path d={hills(W, ground + 50 * s, 40 * s, rand, 3)} fill={mid} />
          <path d={hills(W, ground + 110 * s, 30 * s, rand, 2)} fill={near} />
          <circle cx={W * 0.62} cy={ground + 70 * s} r={40 * s} fill="#ffb26b" opacity="0.15" />
          <path d={`M${W * 0.6} ${ground + 82 * s} Q${W * 0.62} ${ground + 50 * s} ${W * 0.64} ${ground + 82 * s} Z`} fill="#ffb26b" />
          {[0.55, 0.68].map((x, i) => (
            <path key={i} d={`M${W * x} ${ground + 85 * s} L${W * x + 16 * s} ${ground + 60 * s} L${W * x + 32 * s} ${ground + 85 * s} Z`} fill={mix(near, "#fff", 0.15)} />
          ))}
        </g>
      );
    }
    case "aurora": {
      return (
        <g>
          {[0, 1, 2].map((i) => (
            <path
              key={i}
              d={`M${-50 * s} ${H * (0.25 + i * 0.07)} C${W * 0.25} ${H * (0.05 + i * 0.05)} ${W * 0.55} ${H * (0.42 + i * 0.03)} ${W + 50 * s} ${H * (0.18 + i * 0.06)}`}
              stroke={i === 1 ? glow : accent}
              strokeWidth={(40 - i * 8) * s}
              fill="none"
              opacity={0.35 - i * 0.07}
              filter={`url(#${id}-blur)`}
            />
          ))}
          <path d={hills(W, ground, 70 * s, rand, 4)} fill={mix(mid, "#ffffff", 0.18)} />
          {Array.from({ length: 8 }, (_, i) => (
            <path key={i} d={pine(rand() * W, ground + 50 * s, (50 + rand() * 40) * s)} fill={near} />
          ))}
          <path d={hills(W, ground + 60 * s, 20 * s, rand, 4)} fill={mix(near, "#ffffff", 0.2)} />
          <rect x={W * 0.6} y={ground + 10 * s} width={50 * s} height={30 * s} fill={near} />
          <path d={`M${W * 0.6 - 6 * s} ${ground + 12 * s} L${W * 0.6 + 25 * s} ${ground - 14 * s} L${W * 0.6 + 56 * s} ${ground + 12 * s} Z`} fill={mix(near, "#fff", 0.3)} />
          <rect x={W * 0.6 + 8 * s} y={ground + 18 * s} width={10 * s} height={9 * s} fill="#ffcf8a" />
          <rect x={W * 0.6 + 30 * s} y={ground + 18 * s} width={10 * s} height={9 * s} fill="#ffcf8a" />
        </g>
      );
    }
    case "portrait":
    default: {
      const cx = W * 0.5;
      const cy = H * 0.5;
      return (
        <g>
          <circle cx={cx} cy={cy * 0.85} r={W * 0.36} fill={`url(#${id}-glow)`} opacity="0.6" />
          <circle cx={cx} cy={cy * 0.82} r={W * 0.16} fill={mid} />
          <path d={`M${cx - W * 0.34} ${H} Q${cx - W * 0.3} ${cy * 1.18} ${cx} ${cy * 1.15} Q${cx + W * 0.3} ${cy * 1.18} ${cx + W * 0.34} ${H} Z`} fill={mid} />
          <circle cx={cx} cy={cy * 0.82} r={W * 0.16} fill="none" stroke={glow} strokeOpacity="0.35" strokeWidth={2 * s} />
        </g>
      );
    }
  }
}

/** Mixes two hex colours. Non-hex inputs (e.g. hsl()) are returned unchanged. */
function mix(a: string, b: string, t: number): string {
  const pa = parseHex(a);
  const pb = parseHex(b);
  if (!pa || !pb) return a;
  const c = pa.map((v, i) => Math.round(v + ((pb[i] ?? 0) - v) * t));
  return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function parseHex(h: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{6})$/i.exec(h);
  if (!m || !m[1]) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
