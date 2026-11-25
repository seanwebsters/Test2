import { ChainId } from './items';

/** World positions shared by the 3D scene and the game logic. x/z on the ground; north is -z. */
export type V2 = [number, number];

export const PLACES = {
  fountain: [0, 0] as V2,
  tower: [0, -14] as V2,
  towerSteps: [0, -10.4] as V2,
  himSeat: [0, -10.0] as V2,
  bookshop: [12, -1.5] as V2,
  bookshopDoor: [9.2, -1.5] as V2,
  garden: [-12.5, -1.5] as V2,
  gardenGate: [-7.6, -1.5] as V2,
  bench: [-16.1, -1.5] as V2,
  tree: [4.5, 16.2] as V2,
  wake: [2.8, 14.2] as V2,
  bridge: [0, 9.5] as V2,
  canalZ: 9.5,
  canalHalf: 1.15,
  bridgeHalf: 1.7,
} as const;

export const BOUNDS = { minX: -21, maxX: 21, minZ: -18, maxZ: 20 };

export interface Glimmer {
  id: string;
  pos: V2;
  chain: ChainId;
}

export const GLIMMERS: Glimmer[] = [
  { id: 'g1', pos: [3.6, 4.4], chain: 'bloom' },
  { id: 'g2', pos: [-5.2, -6.2], chain: 'clock' },
  { id: 'g3', pos: [6.2, -7.4], chain: 'crystal' },
  { id: 'g4', pos: [-6.4, 4.6], chain: 'bloom' },
  { id: 'g5', pos: [7.4, 2.8], chain: 'ink' },
  { id: 'g6', pos: [-4.2, 13.2], chain: 'crystal' },
  { id: 'g7', pos: [7.6, 13.0], chain: 'time' },
  { id: 'g8', pos: [-3.6, -9.4], chain: 'clock' },
  { id: 'g9', pos: [15.4, 4.2], chain: 'key' },
  { id: 'g10', pos: [-16.5, 3.6], chain: 'bloom' },
];

export const GLIMMER_RESPAWN_MS = 75_000;

export interface Spot {
  id: string;
  pos: V2;
  r: number;
  label: string;
}

/** things you can inspect */
export const SPOTS: Spot[] = [
  { id: 'fountain', pos: [0, 2.9], r: 2.4, label: 'Look at the fountain' },
  { id: 'bird', pos: [-3.6, 3.2], r: 2.0, label: 'Look at the sparrow' },
  { id: 'garden', pos: PLACES.gardenGate as V2, r: 2.4, label: 'Look into the garden' },
  { id: 'bookshop', pos: [8.6, -1.5], r: 2.4, label: 'Peer into the bookshop' },
  { id: 'canal', pos: [-4.5, 7.6], r: 2.0, label: 'Look at the canal' },
  { id: 'tree', pos: [3.6, 15.2], r: 2.2, label: 'Something among the roots' },
  { id: 'lamp', pos: [6.6, 6.0], r: 1.6, label: 'Look at the street lamp' },
];

export const LAMPS: V2[] = [
  [6.9, 6.3],
  [-6.9, 6.3],
  [7.8, -5.6],
  [-7.8, -5.6],
  [2.6, -9.6],
  [-2.6, -9.6],
  [2.4, 8.0],
  [-2.4, 8.0],
];

export interface Box {
  x: number;
  z: number;
  hw: number;
  hd: number;
}

/** axis-aligned blockers (buildings, hedges, canal) */
export const BOXES: Box[] = [
  { x: 0, z: -14, hw: 3.0, hd: 3.0 }, // tower
  { x: 0, z: -11.1, hw: 1.8, hd: 0.35 }, // steps (him sits in front)
  { x: 12.6, z: -1.5, hw: 3.0, hd: 3.2 }, // bookshop
  // garden hedges (opening on the east side)
  { x: -12.5, z: -6.0, hw: 4.9, hd: 0.45 },
  { x: -12.5, z: 3.0, hw: 4.9, hd: 0.45 },
  { x: -17.3, z: -1.5, hw: 0.45, hd: 4.9 },
  { x: -7.8, z: -4.6, hw: 0.45, hd: 1.4 },
  { x: -7.8, z: 1.6, hw: 0.45, hd: 1.4 },
  // houses
  { x: -8.5, z: -13.2, hw: 2.4, hd: 2.2 },
  { x: 8.5, z: -13.2, hw: 2.4, hd: 2.2 },
  { x: -14.5, z: -11.6, hw: 2.3, hd: 2.3 },
  { x: 14.5, z: -10.8, hw: 2.3, hd: 2.3 },
  { x: 13.6, z: 5.4, hw: 2.4, hd: 1.9 },
  { x: -13.6, z: 6.0, hw: 2.4, hd: 1.9 },
  { x: 10.6, z: -8.6, hw: 2.1, hd: 1.8 },
  { x: -10.4, z: -9.0, hw: 2.1, hd: 1.8 },
  // canal, either side of the bridge
  { x: -16, z: 9.5, hw: 14.3, hd: 1.15 },
  { x: 16, z: 9.5, hw: 14.3, hd: 1.15 },
];

/** round blossom trees dressing the town */
export const BLOSSOMS: V2[] = [
  [-6.2, -9.6],
  [6.4, -10.2],
  [10.6, 3.2],
  [-10.4, 4.6],
  [5.2, -5.8],
  [-4.8, 5.6],
  [16.4, -4.8],
  [-18.4, -7.2],
  [17.6, 1.6],
  [3.8, 11.8],
  [-3.6, 11.6],
];

export interface Circle {
  x: number;
  z: number;
  r: number;
}

export const CIRCLES: Circle[] = [
  { x: 0, z: 0, r: 2.75 }, // fountain
  { x: 4.5, z: 16.2, r: 0.8 }, // wake tree trunk
  { x: -16.1, z: -1.5, r: 0.7 }, // bench
  ...BLOSSOMS.map(([x, z]) => ({ x, z, r: 0.45 })),
  ...LAMPS.map(([x, z]) => ({ x, z, r: 0.3 })),
];

/** woodland trees: deterministic scatter south of the canal and round the edges */
export function woodlandTrees(): { x: number; z: number; s: number; kind: number; pink: boolean; rot: number }[] {
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const out: { x: number; z: number; s: number; kind: number; pink: boolean; rot: number }[] = [];
  const ok = (x: number, z: number) => {
    // keep the path from the bridge to the wake tree clear
    if (z > 10.5 && z < 19 && Math.abs(x - (z - 10.5) * 0.35) < 3.2) return false;
    if (Math.hypot(x - PLACES.tree[0], z - PLACES.tree[1]) < 4) return false;
    for (const t of out) if (Math.hypot(t.x - x, t.z - z) < 3.4) return false;
    return true;
  };
  let tries = 0;
  while (out.length < 64 && tries < 4000) {
    tries++;
    const x = -34 + rnd() * 68;
    const z = -30 + rnd() * 62;
    const south = z > 11.8 && z < 26 && Math.abs(x) < 24;
    const edge = Math.abs(x) > 21 || z < -18.5 || z > 20.5;
    if (!south && !edge) continue;
    if (!ok(x, z)) continue;
    out.push({ x, z, s: 0.85 + rnd() * 0.45, kind: Math.floor(rnd() * 3), pink: rnd() < 0.32, rot: rnd() * Math.PI * 2 });
  }
  return out;
}

export const TREES = woodlandTrees();

for (const t of TREES) if (t.z < BOUNDS.maxZ + 1 && Math.abs(t.x) < BOUNDS.maxX + 1) CIRCLES.push({ x: t.x, z: t.z, r: 0.7 * t.s });

/** Push a point out of every blocker. */
export function collide(x: number, z: number, r = 0.4): V2 {
  for (const b of BOXES) {
    const dx = x - b.x;
    const dz = z - b.z;
    const px = b.hw + r - Math.abs(dx);
    const pz = b.hd + r - Math.abs(dz);
    if (px > 0 && pz > 0) {
      if (px < pz) x += Math.sign(dx || 1) * px;
      else z += Math.sign(dz || 1) * pz;
    }
  }
  for (const c of CIRCLES) {
    const dx = x - c.x;
    const dz = z - c.z;
    const d = Math.hypot(dx, dz);
    const min = c.r + r;
    if (d < min && d > 1e-5) {
      x = c.x + (dx / d) * min;
      z = c.z + (dz / d) * min;
    }
  }
  x = Math.max(BOUNDS.minX, Math.min(BOUNDS.maxX, x));
  z = Math.max(BOUNDS.minZ, Math.min(BOUNDS.maxZ, z));
  return [x, z];
}
