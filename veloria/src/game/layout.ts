import { ChainId } from './items';

/**
 * Positions in the painted town map, in image pixels (the map is 1024 × 1536).
 * North is up; y grows towards the viewer.
 */
export type V2 = [number, number];

export const MAP_W = 1024;
export const MAP_H = 1536;

export const PLACES = {
  clockFace: [410, 320] as V2,
  clockR: 54,
  towerSteps: [410, 640] as V2,
  himSeat: [455, 668] as V2,
  fountain: [508, 812] as V2,
  bookshopDoor: [748, 700] as V2,
  gardenGate: [228, 650] as V2,
  tree: [850, 1290] as V2,
  wake: [690, 1400] as V2,
  bridge: [210, 1040] as V2,
  canal: [150, 1260] as V2,
} as const;

/** walkable regions (polygons); anything outside is scenery */
const WALK: V2[][] = [
  // the plaza and the approach to the tower
  [
    [40, 760], [120, 700], [200, 668], [300, 660], [345, 640], [352, 600], [470, 600], [475, 640],
    [560, 650], [620, 660], [690, 700], [690, 748], [760, 752], [900, 760], [1000, 790], [1015, 900],
    [1000, 990], [900, 1030], [720, 1040], [360, 1050], [300, 1000], [120, 980], [30, 940],
  ],
  // into the garden through the rose arch
  [
    [200, 610], [262, 610], [300, 680], [60, 760], [30, 720], [90, 690],
  ],
  // over the bridge
  [
    [30, 1000], [300, 990], [420, 1010], [430, 1070], [300, 1060], [40, 1070],
  ],
  // down through the woods to the blossom tree
  [
    [340, 1030], [730, 1030], [660, 1140], [640, 1220], [760, 1300], [960, 1360], [1020, 1440],
    [1020, 1530], [520, 1530], [470, 1420], [420, 1330], [380, 1220], [340, 1120],
  ],
];

interface Ellipse {
  x: number;
  y: number;
  rx: number;
  ry: number;
}

/** blockers inside the walkable areas */
const BLOCK: Ellipse[] = [
  { x: 508, y: 828, rx: 150, ry: 70 }, // fountain basin
  { x: 116, y: 752, rx: 22, ry: 12 }, // lamps
  { x: 56, y: 984, rx: 22, ry: 12 },
  { x: 652, y: 680, rx: 20, ry: 12 },
  { x: 966, y: 982, rx: 22, ry: 12 },
  { x: 860, y: 1335, rx: 70, ry: 30 }, // blossom tree trunk
];

function inPoly(p: V2, poly: V2[]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function walkable(x: number, y: number): boolean {
  if (!WALK.some((poly) => inPoly([x, y], poly))) return false;
  for (const e of BLOCK) {
    const dx = (x - e.x) / e.rx;
    const dy = (y - e.y) / e.ry;
    if (dx * dx + dy * dy < 1) return false;
  }
  return true;
}

/** Step from (x,y) towards (nx,ny), sliding along edges when blocked. */
export function move(x: number, y: number, nx: number, ny: number): V2 {
  if (walkable(nx, ny)) return [nx, ny];
  if (walkable(nx, y)) return [nx, y];
  if (walkable(x, ny)) return [x, ny];
  return [x, y];
}

/** nearest walkable point to a tap (searching outward in rings) */
export function snap(x: number, y: number): V2 | null {
  if (walkable(x, y)) return [x, y];
  for (let r = 12; r < 160; r += 12) {
    for (let a = 0; a < 16; a++) {
      const px = x + Math.cos((a / 16) * Math.PI * 2) * r;
      const py = y + Math.sin((a / 16) * Math.PI * 2) * r * 0.7;
      if (walkable(px, py)) return [px, py];
    }
  }
  return null;
}

/** characters look smaller further up the map */
export function depthScale(y: number) {
  return 0.78 + ((y - 600) / 900) * 0.34;
}

export interface Glimmer {
  id: string;
  pos: V2;
  chain: ChainId;
}

export const GLIMMERS: Glimmer[] = [
  { id: 'g1', pos: [300, 860], chain: 'bloom' },
  { id: 'g2', pos: [590, 690], chain: 'clock' },
  { id: 'g3', pos: [800, 900], chain: 'crystal' },
  { id: 'g4', pos: [120, 720], chain: 'bloom' },
  { id: 'g5', pos: [820, 790], chain: 'ink' },
  { id: 'g6', pos: [560, 1180], chain: 'crystal' },
  { id: 'g7', pos: [880, 1460], chain: 'time' },
  { id: 'g8', pos: [380, 690], chain: 'clock' },
  { id: 'g9', pos: [150, 1030], chain: 'key' },
  { id: 'g10', pos: [660, 980], chain: 'bloom' },
];

export const GLIMMER_RESPAWN_MS = 75_000;

export interface Spot {
  id: string;
  pos: V2;
  r: number;
  label: string;
}

/** things you can look at */
export const SPOTS: Spot[] = [
  { id: 'fountain', pos: [508, 920], r: 80, label: 'Look at the fountain' },
  { id: 'bird', pos: [640, 760], r: 60, label: 'Look at the sparrow' },
  { id: 'garden', pos: [210, 680], r: 70, label: 'Look into the garden' },
  { id: 'bookshop', pos: [748, 735], r: 70, label: 'Peer into the bookshop' },
  { id: 'canal', pos: [280, 1060], r: 70, label: 'Look at the canal' },
  { id: 'tree', pos: [740, 1380], r: 90, label: 'Something among the roots' },
  { id: 'lamp', pos: [966, 1010], r: 55, label: 'Look at the street lamp' },
];

export const LAMPS: V2[] = [
  [112, 598],
  [56, 812],
  [652, 532],
  [968, 790],
];

/** where each restoration blends the living city back in (ellipses, image px) */
export const REGIONS = {
  clock: { x: 405, y: 330, rx: 190, ry: 380 },
  fountain: { x: 508, y: 800, rx: 300, ry: 200 },
  garden: { x: 160, y: 650, rx: 280, ry: 220 },
  bookshop: { x: 850, y: 560, rx: 300, ry: 270 },
} as const;
