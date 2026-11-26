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

export function walkable(x: number, y: number, pad = 0): boolean {
  if (!WALK.some((poly) => inPoly([x, y], poly))) return false;
  for (const e of BLOCK) {
    const dx = (x - e.x) / (e.rx + pad);
    const dy = (y - e.y) / (e.ry + pad * 0.7);
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

// ---------- pathfinding: A* over a coarse grid of the walkable map ----------
const CELL = 16;
/** planned routes keep this far from obstacles so she never scrapes along them */
const PAD = 22;
const GW = Math.ceil(MAP_W / CELL);
const GH = Math.ceil(MAP_H / CELL);
let grid: Uint8Array | null = null;
function walkGrid() {
  if (grid) return grid;
  grid = new Uint8Array(GW * GH);
  for (let gy = 0; gy < GH; gy++)
    for (let gx = 0; gx < GW; gx++) grid[gy * GW + gx] = walkable(gx * CELL + CELL / 2, gy * CELL + CELL / 2, PAD) ? 1 : 0;
  return grid;
}

/** can she walk in a straight line from a to b? */
export function clearLine(a: V2, b: V2): boolean {
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const n = Math.max(1, Math.ceil(d / 8));
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    if (!walkable(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, t < 0.05 || t > 0.95 ? 0 : PAD)) return false;
  }
  return true;
}

/** waypoints from a to b around obstacles (b itself last), or null if unreachable */
export function findPath(a: V2, b: V2): V2[] | null {
  if (clearLine(a, b)) return [b];
  const g = walkGrid();
  const idx = (x: number, y: number) => y * GW + x;
  const sx = Math.min(GW - 1, Math.max(0, Math.floor(a[0] / CELL)));
  const sy = Math.min(GH - 1, Math.max(0, Math.floor(a[1] / CELL)));
  const tx = Math.min(GW - 1, Math.max(0, Math.floor(b[0] / CELL)));
  const ty = Math.min(GH - 1, Math.max(0, Math.floor(b[1] / CELL)));
  const start = idx(sx, sy);
  const goal = idx(tx, ty);
  const cost = new Float32Array(GW * GH).fill(Infinity);
  const from = new Int32Array(GW * GH).fill(-1);
  const open: number[] = [start];
  const f = new Float32Array(GW * GH).fill(Infinity);
  cost[start] = 0;
  f[start] = Math.hypot(tx - sx, ty - sy);
  const closed = new Uint8Array(GW * GH);
  let found = false;
  let guard = 0;
  while (open.length && guard++ < 20000) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (f[open[i]] < f[open[bi]]) bi = i;
    const cur = open[bi];
    open.splice(bi, 1);
    if (cur === goal) {
      found = true;
      break;
    }
    closed[cur] = 1;
    const cx = cur % GW;
    const cy = (cur / GW) | 0;
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
        const n = idx(nx, ny);
        if (closed[n] || (!g[n] && n !== goal)) continue;
        if (dx && dy && (!g[idx(cx + dx, cy)] || !g[idx(cx, cy + dy)])) continue;
        const c = cost[cur] + (dx && dy ? 1.414 : 1);
        if (c < cost[n]) {
          cost[n] = c;
          from[n] = cur;
          f[n] = c + Math.hypot(tx - nx, ty - ny);
          if (!open.includes(n)) open.push(n);
        }
      }
  }
  if (!found) return null;
  const cells: V2[] = [];
  for (let c = goal; c !== -1 && c !== start; c = from[c]) cells.push([(c % GW) * CELL + CELL / 2, ((c / GW) | 0) * CELL + CELL / 2]);
  cells.reverse();
  cells[cells.length - 1] = b;
  // string-pull: skip every waypoint she can see past
  const out: V2[] = [];
  let at = a;
  let i = 0;
  while (i < cells.length) {
    let j = cells.length - 1;
    while (j > i && !clearLine(at, cells[j])) j--;
    out.push(cells[j]);
    at = cells[j];
    i = j + 1;
  }
  return out;
}
