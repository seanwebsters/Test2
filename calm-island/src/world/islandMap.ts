/**
 * Pure (three.js-free) description of Calm Island: shape, heights, water,
 * paths and biome masks. Everything is baked once into grids and then
 * sampled bilinearly, so gameplay queries are cheap and deterministic.
 *
 * Layout (x east, z south, y up — the player starts in the garden at the origin):
 *   north  : highland plateau behind a cliff line, the mountain, Mirror Lake
 *   centre : the Calm Garden, with the waterfall and its lake to the north-east
 *   west   : the forest and the gentle ramp up to the highlands
 *   south  : a crescent bay with a wide beach
 *   east   : meadows, with the river running down to the sea
 */
import { clamp, lerp, smoothstep } from '../core/math';
import { Noise2D } from './noise';

export const WORLD_SIZE = 1024;
export const GRID = 513;
export const CELL = WORLD_SIZE / (GRID - 1);
export const HALF = WORLD_SIZE / 2;
export const SEA_LEVEL = 0;
export const RIVER_HALF_WIDTH = 6;
/** Water sits this far below the flattened shore height of lakes and river banks. */
export const WATER_DROP = 0.8;
export const HIGH_SHORE = 47.8;
export const LOW_SHORE = 10;
export const GARDEN_HEIGHT = 12;
export const SPAWN = { x: 0, z: 6 };

const nA = new Noise2D(1337);
const nB = new Noise2D(90210);

// ---------------------------------------------------------------- polylines

export interface Polyline {
  x: Float32Array;
  z: Float32Array;
  /** cumulative arc length at each point */
  s: Float32Array;
  count: number;
  length: number;
}

function catmull(a: number, b: number, c: number, d: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
}

export function makePolyline(ctrl: number[][], spacing = 3): Polyline {
  const xs: number[] = [];
  const zs: number[] = [];
  for (let i = 0; i < ctrl.length - 1; i++) {
    const p0 = ctrl[Math.max(i - 1, 0)];
    const p1 = ctrl[i];
    const p2 = ctrl[i + 1];
    const p3 = ctrl[Math.min(i + 2, ctrl.length - 1)];
    const len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const steps = Math.max(2, Math.ceil(len / spacing));
    for (let k = 0; k < steps; k++) {
      const t = k / steps;
      xs.push(catmull(p0[0], p1[0], p2[0], p3[0], t));
      zs.push(catmull(p0[1], p1[1], p2[1], p3[1], t));
    }
  }
  const last = ctrl[ctrl.length - 1];
  xs.push(last[0]);
  zs.push(last[1]);
  const count = xs.length;
  const s = new Float32Array(count);
  for (let i = 1; i < count; i++) s[i] = s[i - 1] + Math.hypot(xs[i] - xs[i - 1], zs[i] - zs[i - 1]);
  return { x: Float32Array.from(xs), z: Float32Array.from(zs), s, count, length: s[count - 1] };
}

/** Position and unit tangent at arc length s. */
export function polylineAt(pl: Polyline, s: number): { x: number; z: number; tx: number; tz: number } {
  s = clamp(s, 0, pl.length);
  let lo = 0;
  let hi = pl.count - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (pl.s[mid] <= s) lo = mid;
    else hi = mid;
  }
  const seg = pl.s[hi] - pl.s[lo] || 1;
  const t = (s - pl.s[lo]) / seg;
  const dx = pl.x[hi] - pl.x[lo];
  const dz = pl.z[hi] - pl.z[lo];
  const l = Math.hypot(dx, dz) || 1;
  return { x: pl.x[lo] + dx * t, z: pl.z[lo] + dz * t, tx: dx / l, tz: dz / l };
}

/** Stamp the distance to a polyline (and optionally arc length) into grid arrays. */
function rasterize(pl: Polyline, radius: number, dist: Float32Array, arc: Float32Array | null): void {
  for (let k = 0; k < pl.count - 1; k++) {
    const ax = pl.x[k];
    const az = pl.z[k];
    const bx = pl.x[k + 1];
    const bz = pl.z[k + 1];
    const i0 = Math.max(0, Math.floor((Math.min(ax, bx) - radius + HALF) / CELL));
    const i1 = Math.min(GRID - 1, Math.ceil((Math.max(ax, bx) + radius + HALF) / CELL));
    const j0 = Math.max(0, Math.floor((Math.min(az, bz) - radius + HALF) / CELL));
    const j1 = Math.min(GRID - 1, Math.ceil((Math.max(az, bz) + radius + HALF) / CELL));
    const ex = bx - ax;
    const ez = bz - az;
    const el2 = ex * ex + ez * ez || 1;
    const segLen = pl.s[k + 1] - pl.s[k];
    for (let j = j0; j <= j1; j++) {
      const z = j * CELL - HALF;
      for (let i = i0; i <= i1; i++) {
        const x = i * CELL - HALF;
        const t = clamp(((x - ax) * ex + (z - az) * ez) / el2);
        const d = Math.hypot(x - (ax + ex * t), z - (az + ez * t));
        const idx = j * GRID + i;
        if (d < dist[idx]) {
          dist[idx] = d;
          if (arc) arc[idx] = pl.s[k] + segLen * t;
        }
      }
    }
  }
}

// ------------------------------------------------------------- macro shape

function smin(a: number, b: number, k: number): number {
  const h = clamp(0.5 + (0.5 * (b - a)) / k);
  return lerp(b, a, h) - k * h * (1 - h);
}

const BAY = { x: 20, z: 470, r: 165 };

/** Signed distance to the coastline; positive inland. */
export function coastDistance(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const a = Math.atan2(z, x);
  const cx = Math.cos(a);
  const sz = Math.sin(a);
  const R = 392 + 36 * nA.simplex(cx * 1.2 + 10, sz * 1.2) + 14 * nA.simplex(cx * 3 + 3, sz * 3 + 5);
  let d = R - r + 5 * nA.simplex(x * 0.018, z * 0.018);
  d = smin(d, Math.hypot(x - BAY.x, z - BAY.z) - BAY.r, 50);
  return d;
}

/** The z coordinate of the highland cliff line for a given x. */
export function plateauEdgeZ(x: number): number {
  return -108 + 20 * nA.simplex(x * 0.006, 3.3) + 5 * nA.simplex(x * 0.021, 7.1);
}

/** 1 where the cliff relaxes into a walkable ramp. */
function rampAmount(x: number): number {
  return Math.max(1 - smoothstep(18, 55, Math.abs(x + 185)), 1 - smoothstep(14, 45, Math.abs(x - 250)));
}

/** 0 in the lowlands, 1 on the highland plateau. */
export function plateauFactor(x: number, z: number): number {
  const w = lerp(7, 58, rampAmount(x));
  return smoothstep(-w, w, plateauEdgeZ(x) - z);
}

const PEAKS = [
  { x: -80, z: -265, r: 165, h: 125 },
  { x: 205, z: -255, r: 88, h: 52 },
];
export const SUMMIT = { x: PEAKS[0].x, z: PEAKS[0].z };

const scratch = { d: 0, p: 0, beachW: 0 };

function naturalHeight(x: number, z: number): number {
  const d = coastDistance(x, z);
  const p = plateauFactor(x, z);
  const bayNear = 1 - smoothstep(0, 90, Math.hypot(x - BAY.x, z - BAY.z) - BAY.r);
  const beachW = 14 + 10 * (nA.simplex(x * 0.005 + 30, z * 0.005) * 0.5 + 0.5) + 34 * bayNear;
  scratch.d = d;
  scratch.p = p;
  scratch.beachW = beachW;
  if (d <= 0) {
    const u = -d;
    return Math.max(-38, -(u * 0.09 + u * u * 0.0009));
  }
  const inland = smoothstep(beachW * 0.9, beachW + 80, d);
  let h = 2.6 * smoothstep(0, beachW, d) + inland * 9.5;
  h += inland * (nA.fbm(x * 0.0065, z * 0.0065, 4) * 6.5 + nB.fbm(x * 0.022, z * 0.022, 3) * 1.6);
  const pl = p * smoothstep(1, 14, d);
  h += pl * (37 + nA.fbm(x * 0.01 + 7, z * 0.01, 3) * 5);
  const land = smoothstep(0, 30, d);
  for (const pk of PEAKS) {
    const dist = Math.hypot(x - pk.x, z - pk.z);
    if (dist >= pk.r) continue;
    const k = 1 - smoothstep(0, pk.r, dist);
    const rid = nB.ridged(x * 0.012, z * 0.012, 4);
    h += land * (pk.h * Math.pow(k, 1.7) * (0.72 + 0.28 * rid) + k * (1 - k) * 48 * (rid - 0.4));
  }
  const g = 1 - smoothstep(24, 75, Math.hypot(x, z));
  return lerp(h, GARDEN_HEIGHT, g);
}

// ------------------------------------------------------------------ island

export interface Lake {
  id: string;
  x: number;
  z: number;
  r: number;
  shore: number;
  depth: number;
  side: 'low' | 'high' | 'any';
  level: number;
}

export interface Region {
  id: string;
  name: string;
  blurb: string;
  x: number;
  z: number;
  r: number;
}

export interface Falls {
  lip: { x: number; y: number; z: number };
  base: { x: number; y: number; z: number };
  /** arc lengths on the river */
  lipS: number;
  baseS: number;
}

export interface Island {
  height: Float32Array;
  sand: Float32Array;
  path: Float32Array;
  forest: Float32Array;
  wet: Float32Array;
  lakes: Lake[];
  river: Polyline;
  paths: Polyline[];
  falls: Falls;
  regions: Region[];
  /** shore target height along the river (water = this - WATER_DROP) */
  riverShore(s: number, x: number, z: number): number;
  heightAt(x: number, z: number): number;
  /** terrain gradient (dh/dx, dh/dz) written into out */
  gradientAt(x: number, z: number, out: { x: number; z: number }): number;
  /** highest water surface at this point (the sea is always there at 0) */
  waterLevelAt(x: number, z: number): number;
  sample(grid: Float32Array, x: number, z: number): number;
}

function sampleGrid(grid: Float32Array, x: number, z: number): number {
  const fx = clamp((x + HALF) / CELL, 0, GRID - 1.0001);
  const fz = clamp((z + HALF) / CELL, 0, GRID - 1.0001);
  const i = Math.floor(fx);
  const j = Math.floor(fz);
  const tx = fx - i;
  const tz = fz - j;
  const k = j * GRID + i;
  const a = grid[k];
  const b = grid[k + 1];
  const c = grid[k + GRID];
  const d = grid[k + GRID + 1];
  return a + (b - a) * tx + (c - a) * tz + (a - b - c + d) * tx * tz;
}

let cached: Island | null = null;

export function getIsland(): Island {
  if (!cached) cached = buildIsland();
  return cached;
}

function buildIsland(): Island {
  const n = GRID * GRID;
  const E = plateauEdgeZ(74);

  const lakes: Lake[] = [
    { id: 'falls', x: 72, z: E + 38, r: 34, shore: LOW_SHORE, depth: 5, side: 'low', level: 0 },
    { id: 'mirror', x: 96, z: E - 98, r: 30, shore: HIGH_SHORE, depth: 5, side: 'high', level: 0 },
    { id: 'pond', x: 17, z: -12, r: 7.5, shore: GARDEN_HEIGHT, depth: 1.25, side: 'any', level: 0 },
  ];
  for (const l of lakes) l.level = l.shore - WATER_DROP;

  const river = makePolyline(
    [
      [96, E - 98], [94, E - 62], [86, E - 32], [77, E - 10], [74, E + 8], [72, E + 38],
      [90, E + 70], [128, E + 96], [180, E + 118], [236, E + 140], [292, E + 176],
      [346, E + 204], [410, E + 228], [500, E + 250],
    ],
    3,
  );

  const paths: Polyline[] = [
    // south to the bay
    makePolyline([[2, 14], [5, 55], [-12, 108], [3, 165], [24, 220], [18, 268], [20, 298]]),
    // north-east to the foot of the falls
    makePolyline([[-2, -16], [6, -38], [24, E + 62], [42, E + 60]]),
    // east along the river to its mouth
    makePolyline([[16, 4], [44, 9], [82, 4], [122, 12], [172, 34], [228, 56], [282, 92], [336, 120], [372, 130]]),
    // west through the forest, up the ramp and on to the summit
    makePolyline([
      [-15, 0], [-46, -8], [-92, 10], [-136, -10], [-170, -42], [-190, -82], [-186, -132],
      [-170, -170], [-128, -190], [-140, -226], [-112, -250], [-90, -238], [-80, -262],
    ]),
    // a narrow trodden track from the river path to the treehouse ladder, and a spur to the fruit patch
    makePolyline([[18, 4.5], [19.5, 11], [21.8, 19.1], [26, 22.9], [30, 26.4]]),
    makePolyline([[26, 22.9], [28.6, 21.8], [31, 21.5]]),
    // across the highlands to Mirror Lake
    makePolyline([[-170, -170], [-110, -152], [-42, -160], [20, E - 68], [62, E - 92]]),
  ];

  const riverD = new Float32Array(n).fill(1e9);
  const riverS = new Float32Array(n);
  rasterize(river, 34, riverD, riverS);
  const pathD = new Float32Array(n).fill(1e9);
  for (const p of paths) rasterize(p, 8, pathD, null);

  // Where the river meets the cliff, the lake exit and the sea.
  let lipS = 0;
  let baseS = 0;
  let mouthS = river.length;
  for (let s = 0; s <= river.length; s += 0.5) {
    const q = polylineAt(river, s);
    const p = plateauFactor(q.x, q.z);
    if (p > 0.97) lipS = s;
    if (p < 0.03 && baseS === 0) baseS = s;
    if (baseS > 0 && coastDistance(q.x, q.z) < 8) {
      mouthS = s;
      break;
    }
  }
  const fallsLake = lakes[0];
  let exitS = baseS;
  for (let s = baseS; s <= river.length; s += 0.5) {
    const q = polylineAt(river, s);
    exitS = s;
    if (Math.hypot(q.x - fallsLake.x, q.z - fallsLake.z) > fallsLake.r + 6 && s > baseS + fallsLake.r) break;
  }
  const lowShore = (s: number): number => {
    if (s <= exitS) return LOW_SHORE;
    return lerp(LOW_SHORE, 0.6, smoothstep(0, 1, clamp((s - exitS) / (mouthS - exitS))) * 0.5 + 0.5 * clamp((s - exitS) / (mouthS - exitS)));
  };
  const riverShore = (s: number, x: number, z: number): number => lerp(lowShore(s), HIGH_SHORE, plateauFactor(x, z));

  const sideWeight = (l: Lake, p: number): number => (l.side === 'low' ? 1 - p : l.side === 'high' ? p : 1);

  /** Level of lakes / river at a point, or -Infinity when there is none. */
  const inlandLevel = (x: number, z: number, dR: number, s: number, p: number): number => {
    let lvl = -Infinity;
    for (const l of lakes) {
      if (Math.hypot(x - l.x, z - l.z) < l.r && sideWeight(l, p) > 0.5) lvl = Math.max(lvl, l.level);
    }
    if (dR < RIVER_HALF_WIDTH) {
      // On the cliff itself the water is a free-falling sheet, not a surface.
      const shore = p > 0.97 ? HIGH_SHORE : lowShore(s);
      if (p > 0.97 || p < 0.5) lvl = Math.max(lvl, shore - WATER_DROP);
    }
    return lvl;
  };

  const height = new Float32Array(n);
  const sand = new Float32Array(n);
  const path = new Float32Array(n);
  const forest = new Float32Array(n);
  const wet = new Float32Array(n);

  for (let j = 0; j < GRID; j++) {
    const z = j * CELL - HALF;
    for (let i = 0; i < GRID; i++) {
      const x = i * CELL - HALF;
      const idx = j * GRID + i;
      let h = naturalHeight(x, z);
      const d = scratch.d;
      const p = scratch.p;
      const beachW = scratch.beachW;
      const dR = riverD[idx];
      const s = riverS[idx];
      const mouth = smoothstep(-30, 4, d);

      if (d > -30) {
        let carve = 0;
        if (dR < RIVER_HALF_WIDTH + 20) {
          const w = (1 - smoothstep(RIVER_HALF_WIDTH, RIVER_HALF_WIDTH + 20, dR)) * mouth;
          h = lerp(h, lerp(lowShore(s), HIGH_SHORE, p), w);
          carve = 2 * (1 - smoothstep(RIVER_HALF_WIDTH * 0.25, RIVER_HALF_WIDTH, dR)) * mouth;
        }
        for (const l of lakes) {
          const dl = Math.hypot(x - l.x, z - l.z);
          if (dl > l.r + 18) continue;
          const side = sideWeight(l, p);
          h = lerp(h, l.shore, (1 - smoothstep(l.r, l.r + 18, dl)) * side);
          carve = Math.max(carve, l.depth * (1 - smoothstep(l.r * 0.3, l.r, dl)) * side);
        }
        h -= carve;
      }
      height[idx] = h;

      const lvl = inlandLevel(x, z, dR, s, p);
      wet[idx] = lvl > -1e6 ? clamp((lvl - h + 1.0) / 1.2) : 0;
      sand[idx] = d > 0 ? (1 - smoothstep(beachW * 0.7, beachW * 1.05, d)) * (1 - p * smoothstep(1, 14, d)) : 1;
      path[idx] = 1 - smoothstep(0.7, 2.3, pathD[idx]);

      const nz = nA.fbm(x * 0.0055 + 40, z * 0.0055 - 17, 3) * 0.5 + 0.5;
      const west = smoothstep(-40, -170, x);
      let f = smoothstep(0.42, 0.6, nz * 0.72 + west * 0.36 + p * 0.06);
      f *= smoothstep(36, 74, Math.hypot(x, z));
      f *= d > 0 ? smoothstep(beachW, beachW + 25, d) : 0;
      f *= 1 - smoothstep(60, 85, h);
      forest[idx] = f;
    }
  }

  const heightAt = (x: number, z: number): number => sampleGrid(height, x, z);

  const gradientAt = (x: number, z: number, out: { x: number; z: number }): number => {
    out.x = (heightAt(x + 0.75, z) - heightAt(x - 0.75, z)) / 1.5;
    out.z = (heightAt(x, z + 0.75) - heightAt(x, z - 0.75)) / 1.5;
    return Math.hypot(out.x, out.z);
  };

  const waterLevelAt = (x: number, z: number): number => {
    const lvl = inlandLevel(x, z, sampleGrid(riverD, x, z), sampleGrid(riverS, x, z), plateauFactor(x, z));
    return Math.max(SEA_LEVEL, lvl);
  };

  const lip = polylineAt(river, lipS);
  const base = polylineAt(river, baseS);
  const falls: Falls = {
    lip: { x: lip.x, y: HIGH_SHORE - WATER_DROP, z: lip.z },
    base: { x: base.x, y: LOW_SHORE - WATER_DROP, z: base.z },
    lipS,
    baseS,
  };

  const mouthP = polylineAt(river, mouthS);
  const regions: Region[] = [
    { id: 'garden', name: 'The Calm Garden', blurb: 'Where every wander begins', x: 0, z: 0, r: 30 },
    { id: 'falls', name: 'Whispering Falls', blurb: 'The cliff sings into the lake', x: fallsLake.x, z: fallsLake.z, r: 50 },
    { id: 'mirror', name: 'Mirror Lake', blurb: 'Still water above the clouds', x: lakes[1].x, z: lakes[1].z, r: 46 },
    { id: 'peak', name: 'Cloudrest Peak', blurb: 'The whole island at your feet', x: SUMMIT.x, z: SUMMIT.z, r: 34 },
    { id: 'bay', name: 'Sunrise Bay', blurb: 'Warm sand and gentle waves', x: 20, z: 318, r: 62 },
    { id: 'forest', name: 'Mosswood', blurb: 'Dappled light under old trees', x: -150, z: 5, r: 62 },
    { id: 'ramp', name: 'The Long Climb', blurb: 'A soft path to the highlands', x: -188, z: -110, r: 40 },
    { id: 'mouth', name: 'Rivermouth', blurb: 'Where the river meets the sea', x: mouthP.x, z: mouthP.z, r: 46 },
  ];

  return {
    height, sand, path, forest, wet, lakes, river, paths, falls, regions,
    riverShore, heightAt, gradientAt, waterLevelAt,
    sample: sampleGrid,
  };
}
