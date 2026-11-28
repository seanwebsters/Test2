/**
 * Treasure Trails — a complete Match-3 engine.
 * Pure functions over an immutable-ish board; the UI orchestrates the steps
 * (swap → clear → gravity → repeat) so every phase can be animated.
 */

export const W = 8;
export const H = 8;

export type Special = 'none' | 'zrow' | 'zcol' | 'bone' | 'sniffer' | 'paw';

export interface Piece {
  id: number;
  color: number; // 0..5, -1 = colourless (sniffer / treasure)
  special: Special;
  treasure?: boolean;
  born?: number; // rows above the board this piece fell from (for spawn animation)
}

export interface Board {
  cells: (Piece | null)[];
  dirt: number[]; // layer hit points under each cell
  holes: boolean[];
}

export type Goal =
  | { kind: 'collect'; color: number; n: number }
  | { kind: 'dirt'; n: number }
  | { kind: 'treasure'; n: number }
  | { kind: 'score'; n: number };

export interface Effect {
  kind: 'row' | 'col' | 'blast' | 'sniff' | 'paw' | 'cross' | 'mega';
  at: number;
  radius?: number;
  color?: number;
  targets?: number[];
}

export interface ClearResult {
  board: Board;
  cleared: { idx: number; piece: Piece }[];
  created: { idx: number; piece: Piece }[];
  effects: Effect[];
  score: number;
  collected: number[];
  dirt: number;
  specialsFired: number;
  biggestGroup: number;
}

let nextId = 1;
const newPiece = (color: number, special: Special = 'none', extra: Partial<Piece> = {}): Piece => ({ id: nextId++, color, special, ...extra });

export const idx = (x: number, y: number) => y * W + x;
export const xy = (i: number) => [i % W, Math.floor(i / W)] as const;
const inB = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H;

export const isMatchable = (p: Piece | null | undefined): p is Piece => !!p && p.color >= 0 && !p.treasure && p.special !== 'sniffer';

export function cloneBoard(b: Board): Board {
  return { cells: b.cells.slice(), dirt: b.dirt.slice(), holes: b.holes };
}

// ---------- creation ----------

export function createBoard(opts: { mask?: string[]; dirt?: string[]; colors: number; rand: () => number }): Board {
  const holes = Array.from({ length: W * H }, (_, i) => {
    const [x, y] = xy(i);
    return opts.mask ? opts.mask[y]?.[x] === ' ' || opts.mask[y]?.[x] === undefined : false;
  });
  const dirt = Array.from({ length: W * H }, (_, i) => {
    const [x, y] = xy(i);
    const c = opts.dirt?.[y]?.[x];
    return holes[i] ? 0 : c === '2' ? 2 : c === '1' ? 1 : 0;
  });
  const b: Board = { cells: Array(W * H).fill(null), dirt, holes };
  for (let tries = 0; tries < 50; tries++) {
    for (let i = 0; i < W * H; i++) {
      if (holes[i]) {
        b.cells[i] = null;
        continue;
      }
      const [x, y] = xy(i);
      let c = 0;
      for (let k = 0; k < 20; k++) {
        c = Math.floor(opts.rand() * opts.colors);
        const l1 = x >= 2 ? b.cells[idx(x - 1, y)] : null;
        const l2 = x >= 2 ? b.cells[idx(x - 2, y)] : null;
        const u1 = y >= 2 ? b.cells[idx(x, y - 1)] : null;
        const u2 = y >= 2 ? b.cells[idx(x, y - 2)] : null;
        const sq = x >= 1 && y >= 1 ? [b.cells[idx(x - 1, y)], b.cells[idx(x, y - 1)], b.cells[idx(x - 1, y - 1)]] : null;
        if (l1 && l2 && l1.color === c && l2.color === c) continue;
        if (u1 && u2 && u1.color === c && u2.color === c) continue;
        if (sq && sq.every((p) => p && p.color === c)) continue;
        break;
      }
      b.cells[i] = newPiece(c);
    }
    if (findMove(b)) return b;
  }
  return b;
}

// ---------- matching ----------

interface Group {
  cells: number[];
  hRun: number;
  vRun: number;
  square: boolean;
  color: number;
}

export function findGroups(b: Board): Group[] {
  const runs: { cells: number[]; dir: 'h' | 'v' }[] = [];
  const colorAt = (x: number, y: number) => {
    const p = b.cells[idx(x, y)];
    return isMatchable(p) ? p.color : -1;
  };
  for (let y = 0; y < H; y++) {
    let x = 0;
    while (x < W) {
      const c = colorAt(x, y);
      let e = x + 1;
      while (c >= 0 && e < W && colorAt(e, y) === c) e++;
      if (c >= 0 && e - x >= 3) runs.push({ cells: Array.from({ length: e - x }, (_, k) => idx(x + k, y)), dir: 'h' });
      x = e;
    }
  }
  for (let x = 0; x < W; x++) {
    let y = 0;
    while (y < H) {
      const c = colorAt(x, y);
      let e = y + 1;
      while (c >= 0 && e < H && colorAt(x, e) === c) e++;
      if (c >= 0 && e - y >= 3) runs.push({ cells: Array.from({ length: e - y }, (_, k) => idx(x, y + k)), dir: 'v' });
      y = e;
    }
  }
  // merge runs that share cells (L / T shapes)
  const groups: Group[] = [];
  const owner = new Map<number, Group>();
  for (const r of runs) {
    let g: Group | undefined;
    for (const c of r.cells) if (owner.has(c)) g = owner.get(c);
    if (!g) {
      g = { cells: [], hRun: 0, vRun: 0, square: false, color: b.cells[r.cells[0]]!.color };
      groups.push(g);
    }
    for (const c of r.cells) {
      if (!g.cells.includes(c)) g.cells.push(c);
      owner.set(c, g);
    }
    if (r.dir === 'h') g.hRun = Math.max(g.hRun, r.cells.length);
    else g.vRun = Math.max(g.vRun, r.cells.length);
  }
  // 2x2 squares not already part of a line
  for (let y = 0; y < H - 1; y++)
    for (let x = 0; x < W - 1; x++) {
      const c = colorAt(x, y);
      if (c < 0) continue;
      const sq = [idx(x, y), idx(x + 1, y), idx(x, y + 1), idx(x + 1, y + 1)];
      if (!sq.every((i) => colorAt(...xy(i)) === c)) continue;
      const touching = sq.map((i) => owner.get(i)).find(Boolean);
      if (touching) {
        // a square glued to a 3-run → still a paw if the run is only 3
        if (touching.hRun < 4 && touching.vRun < 4 && !(touching.hRun >= 3 && touching.vRun >= 3)) {
          for (const i of sq) if (!touching.cells.includes(i)) touching.cells.push(i), owner.set(i, touching);
          touching.square = true;
        }
        continue;
      }
      const g: Group = { cells: sq, hRun: 0, vRun: 0, square: true, color: c };
      sq.forEach((i) => owner.set(i, g));
      groups.push(g);
    }
  return groups;
}

function specialFor(g: Group): Special {
  if (g.hRun >= 5 || g.vRun >= 5) return 'sniffer';
  if (g.hRun >= 3 && g.vRun >= 3) return 'bone';
  if (g.hRun === 4) return 'zrow';
  if (g.vRun === 4) return 'zcol';
  if (g.square) return 'paw';
  return 'none';
}

// ---------- special areas ----------

function areaRow(y: number) {
  return Array.from({ length: W }, (_, x) => idx(x, y));
}
function areaCol(x: number) {
  return Array.from({ length: H }, (_, y) => idx(x, y));
}
function areaBlast(i: number, r: number, diamond = true) {
  const [cx, cy] = xy(i);
  const out: number[] = [];
  for (let y = cy - r; y <= cy + r; y++)
    for (let x = cx - r; x <= cx + r; x++) if (inB(x, y) && (!diamond || Math.abs(x - cx) + Math.abs(y - cy) <= r + 1)) out.push(idx(x, y));
  return out;
}
function neighbours(i: number) {
  const [x, y] = xy(i);
  return [
    [x + 1, y],
    [x - 1, y],
    [x, y + 1],
    [x, y - 1],
  ]
    .filter(([a, c]) => inB(a, c))
    .map(([a, c]) => idx(a, c));
}

function mostCommonColor(b: Board, exclude = new Set<number>()) {
  const counts = new Map<number, number>();
  b.cells.forEach((p, i) => {
    if (isMatchable(p) && !exclude.has(i)) counts.set(p.color, (counts.get(p.color) ?? 0) + 1);
  });
  let best = 0;
  let bc = -1;
  counts.forEach((n, c) => {
    if (n > best) (best = n), (bc = c);
  });
  return bc;
}

export interface ClearCtx {
  rand: () => number;
  /** cells the player just swapped (specials spawn there) */
  swapCells?: number[];
  /** cells forcibly cleared (combos / boosters) */
  seed?: number[];
  seedEffects?: Effect[];
  /** pieces converted before clearing (sniffer + special combos) */
  convert?: { idx: number; special: Special }[];
  /** paw targeting: what still matters for the objectives */
  wantColors: number[];
  cascade: number;
}

export function pawTarget(b: Board, ctx: ClearCtx, avoid: Set<number>): number {
  const dirtCells = b.dirt.map((d, i) => (d > 0 && !avoid.has(i) ? i : -1)).filter((i) => i >= 0);
  if (dirtCells.length) return dirtCells[Math.floor(ctx.rand() * dirtCells.length)];
  const wanted = b.cells.map((p, i) => (p && isMatchable(p) && ctx.wantColors.includes(p.color) && !avoid.has(i) ? i : -1)).filter((i) => i >= 0);
  if (wanted.length) return wanted[Math.floor(ctx.rand() * wanted.length)];
  // treasure: clear the piece directly beneath a chest to help it fall
  const tre = b.cells.findIndex((p) => p?.treasure);
  if (tre >= 0 && tre + W < W * H && !avoid.has(tre + W)) return tre + W;
  const any = b.cells.map((p, i) => (p && !p.treasure && !avoid.has(i) ? i : -1)).filter((i) => i >= 0);
  return any[Math.floor(ctx.rand() * any.length)] ?? 0;
}

/** Area cleared when a special at `i` fires. */
function fire(b: Board, i: number, p: Piece, ctx: ClearCtx, cleared: Set<number>, effects: Effect[]): number[] {
  const [x, y] = xy(i);
  switch (p.special) {
    case 'zrow':
      effects.push({ kind: 'row', at: i });
      return areaRow(y);
    case 'zcol':
      effects.push({ kind: 'col', at: i });
      return areaCol(x);
    case 'bone':
      effects.push({ kind: 'blast', at: i, radius: 2 });
      return areaBlast(i, 2);
    case 'sniffer': {
      const c = mostCommonColor(b, cleared);
      const t = b.cells.map((q, k) => (isMatchable(q) && q.color === c ? k : -1)).filter((k) => k >= 0);
      effects.push({ kind: 'sniff', at: i, color: c, targets: t });
      return t;
    }
    case 'paw': {
      const t = pawTarget(b, ctx, new Set([...cleared, i]));
      effects.push({ kind: 'paw', at: i, targets: [t] });
      return [...neighbours(i), t];
    }
    default:
      return [];
  }
}

export function clearStep(input: Board, ctx: ClearCtx): ClearResult | null {
  const b = cloneBoard(input);
  for (const c of ctx.convert ?? []) {
    const p = b.cells[c.idx];
    if (p) b.cells[c.idx] = { ...p, special: c.special };
  }
  const groups = findGroups(b);
  if (!groups.length && !ctx.seed?.length) return null;

  const toClear = new Set<number>(ctx.seed ?? []);
  const creations: { idx: number; piece: Piece }[] = [];
  const effects: Effect[] = [...(ctx.seedEffects ?? [])];
  let biggest = 0;
  for (const g of groups) {
    biggest = Math.max(biggest, g.cells.length);
    g.cells.forEach((c) => toClear.add(c));
    const sp = specialFor(g);
    if (sp !== 'none') {
      const at = g.cells.find((c) => ctx.swapCells?.includes(c)) ?? g.cells[Math.floor(g.cells.length / 2)];
      creations.push({ idx: at, piece: newPiece(sp === 'sniffer' ? -1 : g.color, sp) });
    }
  }

  // chain-fire specials
  const fired = new Set<number>();
  const queue = [...toClear];
  let specialsFired = 0;
  while (queue.length) {
    const i = queue.shift()!;
    const p = b.cells[i];
    if (!p || p.special === 'none' || fired.has(i)) continue;
    fired.add(i);
    specialsFired++;
    for (const t of fire(b, i, p, ctx, toClear, effects)) {
      if (b.holes[t] || b.cells[t]?.treasure) continue;
      if (!toClear.has(t)) {
        toClear.add(t);
        queue.push(t);
      }
    }
  }

  const cleared: { idx: number; piece: Piece }[] = [];
  const collected = [0, 0, 0, 0, 0, 0];
  let dirt = 0;
  for (const i of toClear) {
    if (b.holes[i]) continue;
    const p = b.cells[i];
    if (p?.treasure) continue;
    if (p) {
      cleared.push({ idx: i, piece: p });
      if (p.color >= 0) collected[p.color]++;
      b.cells[i] = null;
    }
    if (b.dirt[i] > 0) {
      b.dirt[i]--;
      dirt++;
    }
  }
  for (const c of creations) b.cells[c.idx] = c.piece;
  const mult = 1 + ctx.cascade * 0.5;
  const score = Math.round((cleared.length * 20 + specialsFired * 60 + creations.length * 40 + dirt * 30) * mult);
  return { board: b, cleared, created: creations, effects, score, collected, dirt, specialsFired, biggestGroup: biggest };
}

// ---------- gravity ----------

export function gravity(input: Board, colors: number, rand: () => number, spawnTreasure: () => boolean): Board {
  const b = cloneBoard(input);
  for (let x = 0; x < W; x++) {
    const ys: number[] = [];
    for (let y = 0; y < H; y++) if (!b.holes[idx(x, y)]) ys.push(y);
    const pieces = ys.map((y) => b.cells[idx(x, y)]).filter(Boolean) as Piece[];
    const missing = ys.length - pieces.length;
    const fresh: Piece[] = [];
    for (let k = 0; k < missing; k++) {
      const t = spawnTreasure();
      fresh.push(t ? newPiece(-1, 'none', { treasure: true, born: missing }) : newPiece(Math.floor(rand() * colors), 'none', { born: missing }));
    }
    const col = [...fresh, ...pieces.map((p) => (p.born ? { ...p, born: undefined } : p))];
    ys.forEach((y, k) => (b.cells[idx(x, y)] = col[k]));
  }
  return b;
}

/** Remove treasure chests that reached the bottom of their column. */
export function collectTreasure(input: Board): { board: Board; got: number[] } {
  const b = cloneBoard(input);
  const got: number[] = [];
  for (let x = 0; x < W; x++) {
    for (let y = H - 1; y >= 0; y--) {
      const i = idx(x, y);
      if (b.holes[i]) continue;
      if (b.cells[i]?.treasure) {
        b.cells[i] = null;
        got.push(i);
      }
      break;
    }
  }
  return { board: b, got };
}

// ---------- moves ----------

export function adjacent(a: number, b: number) {
  const [ax, ay] = xy(a);
  const [bx, by] = xy(b);
  return Math.abs(ax - bx) + Math.abs(ay - by) === 1;
}

export function swapCells(b: Board, a: number, c: number): Board {
  const n = cloneBoard(b);
  [n.cells[a], n.cells[c]] = [n.cells[c], n.cells[a]];
  return n;
}

const isActive = (p: Piece | null | undefined) => !!p && p.special !== 'none' && !p.treasure;

function makesMatch(b: Board, i: number) {
  const p = b.cells[i];
  if (!isMatchable(p)) return false;
  const [x, y] = xy(i);
  const same = (xx: number, yy: number) => inB(xx, yy) && isMatchable(b.cells[idx(xx, yy)]) && b.cells[idx(xx, yy)]!.color === p.color;
  let h = 1;
  for (let k = x - 1; same(k, y); k--) h++;
  for (let k = x + 1; same(k, y); k++) h++;
  let v = 1;
  for (let k = y - 1; same(x, k); k--) v++;
  for (let k = y + 1; same(x, k); k++) v++;
  if (h >= 3 || v >= 3) return true;
  for (const [dx, dy] of [
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ])
    if (same(x + dx, y) && same(x, y + dy) && same(x + dx, y + dy)) return true;
  return false;
}

export function isValidSwap(b: Board, a: number, c: number) {
  if (!adjacent(a, c) || b.holes[a] || b.holes[c]) return false;
  const pa = b.cells[a];
  const pc = b.cells[c];
  if (!pa || !pc) return false;
  if (isActive(pa) || isActive(pc)) return true;
  const n = swapCells(b, a, c);
  return makesMatch(n, a) || makesMatch(n, c);
}

export function findMove(b: Board): [number, number] | null {
  for (let i = 0; i < W * H; i++) {
    const [x, y] = xy(i);
    if (x < W - 1 && isValidSwap(b, i, i + 1)) return [i, i + 1];
    if (y < H - 1 && isValidSwap(b, i, i + W)) return [i, i + W];
  }
  return null;
}

export function shuffleBoard(b: Board, rand: () => number): Board {
  for (let t = 0; t < 80; t++) {
    const n = cloneBoard(b);
    const slots = n.cells.map((p, i) => (p && p.special === 'none' && !p.treasure ? i : -1)).filter((i) => i >= 0);
    const colors = slots.map((i) => n.cells[i]!.color);
    for (let k = colors.length - 1; k > 0; k--) {
      const j = Math.floor(rand() * (k + 1));
      [colors[k], colors[j]] = [colors[j], colors[k]];
    }
    slots.forEach((i, k) => (n.cells[i] = { ...n.cells[i]!, color: colors[k] }));
    if (!findGroups(n).length && findMove(n)) return n;
  }
  return b;
}

/**
 * Resolve a swap that involves at least one special ("Best Friends" combos and
 * single-special activations). Returns the seed cells/effects to clear.
 */
export function comboSeed(b: Board, from: number, to: number, ctx: Omit<ClearCtx, 'seed' | 'seedEffects' | 'cascade'>): Pick<ClearCtx, 'seed' | 'seedEffects' | 'convert'> | null {
  const a = b.cells[to]; // piece that moved onto `to`
  const c = b.cells[from];
  if (!a || !c) return null;
  const A = isActive(a);
  const C = isActive(c);
  if (!A && !C) return null;
  const [tx, ty] = xy(to);
  const seed = new Set<number>([to, from]);
  const eff: Effect[] = [];
  const add = (arr: number[]) => arr.forEach((i) => seed.add(i));
  const sp = [a.special, c.special].sort().join('+');

  if (A && C) {
    if (a.special === 'sniffer' && c.special === 'sniffer') {
      b.cells.forEach((p, i) => p && !p.treasure && seed.add(i));
      eff.push({ kind: 'mega', at: to });
      return { seed: [...seed], seedEffects: eff };
    }
    if (a.special === 'sniffer' || c.special === 'sniffer') {
      const other = a.special === 'sniffer' ? c : a;
      const col = other.color >= 0 ? other.color : mostCommonColor(b);
      const targets = b.cells.map((p, i) => (isMatchable(p) && p.color === col ? i : -1)).filter((i) => i >= 0);
      eff.push({ kind: 'sniff', at: to, color: col, targets });
      const kind = other.special === 'zrow' || other.special === 'zcol' ? null : other.special;
      return {
        seed: [...seed, ...targets],
        seedEffects: eff,
        convert: [
          { idx: a.special === 'sniffer' ? to : from, special: 'none' },
          ...targets.map((i, k) => ({ idx: i, special: (kind ?? (k % 2 ? 'zrow' : 'zcol')) as Special })),
        ],
      };
    }
    if (sp === 'zcol+zrow' || sp === 'zrow+zrow' || sp === 'zcol+zcol') {
      add(areaRow(ty));
      add(areaCol(tx));
      eff.push({ kind: 'cross', at: to });
    } else if (sp === 'bone+zrow' || sp === 'bone+zcol') {
      for (let d = -1; d <= 1; d++) {
        if (ty + d >= 0 && ty + d < H) add(areaRow(ty + d));
        if (tx + d >= 0 && tx + d < W) add(areaCol(tx + d));
      }
      eff.push({ kind: 'cross', at: to, radius: 1 });
    } else if (sp === 'bone+bone') {
      add(areaBlast(to, 3, false));
      eff.push({ kind: 'blast', at: to, radius: 3 });
    } else if (a.special === 'paw' || c.special === 'paw') {
      const other = a.special === 'paw' ? c : a;
      const n = other.special === 'paw' ? 3 : 1;
      const avoid = new Set<number>([to, from]);
      const targets: number[] = [];
      for (let k = 0; k < n; k++) {
        const t = pawTarget(b, { ...ctx, cascade: 0 }, avoid);
        targets.push(t);
        avoid.add(t);
        if (other.special === 'zrow') add(areaRow(xy(t)[1]));
        else if (other.special === 'zcol') add(areaCol(xy(t)[0]));
        else if (other.special === 'bone') add(areaBlast(t, 2));
        else add([t, ...neighbours(t)]);
      }
      eff.push({ kind: 'paw', at: to, targets });
      // stop the carried special from also firing in place
      return { seed: [...seed, ...targets], seedEffects: eff, convert: [{ idx: to, special: 'none' }, { idx: from, special: 'none' }] };
    }
    return { seed: [...seed], seedEffects: eff, convert: [{ idx: to, special: 'none' }, { idx: from, special: 'none' }] };
  }

  // a single special was swapped
  const s = A ? a : c;
  const si = A ? to : from;
  if (s.special === 'sniffer') {
    const other = A ? c : a;
    const col = other.color >= 0 ? other.color : mostCommonColor(b);
    const targets = b.cells.map((p, i) => (isMatchable(p) && p.color === col ? i : -1)).filter((i) => i >= 0);
    eff.push({ kind: 'sniff', at: si, color: col, targets });
    return { seed: [si, ...targets], seedEffects: eff, convert: [{ idx: si, special: 'none' }] };
  }
  return { seed: [si], seedEffects: [] };
}

/** Place pre-game boosters on random normal cells. */
export function placeBoosters(b: Board, list: Special[], rand: () => number): Board {
  const n = cloneBoard(b);
  for (const sp of list) {
    const slots = n.cells.map((p, i) => (p && p.special === 'none' && !p.treasure ? i : -1)).filter((i) => i >= 0);
    const i = slots[Math.floor(rand() * slots.length)];
    if (i === undefined) break;
    n.cells[i] = { ...n.cells[i]!, special: sp, color: sp === 'sniffer' ? -1 : n.cells[i]!.color };
  }
  return n;
}

export function spawnInitialTreasure(b: Board, count: number): Board {
  const n = cloneBoard(b);
  const cols = [1, 6, 3, 4, 2, 5];
  for (let k = 0; k < count; k++) {
    const x = cols[k % cols.length];
    for (let y = 0; y < H; y++) {
      const i = idx(x, y);
      if (!n.holes[i]) {
        n.cells[i] = newPiece(-1, 'none', { treasure: true });
        break;
      }
    }
  }
  return n;
}
