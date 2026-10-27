import type { TileLevel } from "./schemas";
import { rng } from "./rng";

/** Connector bits, clockwise: N E S W. */
export const N = 1, E = 2, S = 4, W = 8;
export const DIR_BITS = [N, E, S, W] as const;
export const DIR_STEP: ReadonlyArray<readonly [number, number]> = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const opposite = (d: number) => (d + 2) % 4;

export type TileKind = "source" | "target" | "path" | "decoy" | "empty";
export interface TileCell {
  kind: TileKind;
  /** Connectors at rotation 0. */
  mask: number;
  /** Quarter turns clockwise. */
  rot: number;
}
export interface TileBoard {
  cols: number;
  rows: number;
  cells: TileCell[];
  source: number;
  target: number;
  moves: number;
}

export function rotateMask(mask: number, turns: number): number {
  let m = mask & 15;
  for (let i = 0; i < ((turns % 4) + 4) % 4; i++) m = ((m << 1) | (m >> 3)) & 15;
  return m;
}
export const effectiveMask = (c: TileCell) => rotateMask(c.mask, c.rot);

function dirBetween(a: readonly number[], b: readonly number[]): number {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  return DIR_STEP.findIndex(([x, y]) => x === dx && y === dy);
}

export function validateTileLevel(level: TileLevel): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  level.path.forEach(([c, r], i) => {
    if (c < 0 || r < 0 || c >= level.cols || r >= level.rows) errors.push(`path[${i}] (${c},${r}) is outside the ${level.cols}×${level.rows} grid`);
    const key = `${c},${r}`;
    if (seen.has(key)) errors.push(`path[${i}] (${c},${r}) repeats an earlier cell`);
    seen.add(key);
    if (i > 0 && dirBetween(level.path[i - 1], level.path[i]) < 0) errors.push(`path[${i - 1}]→path[${i}] is not a step to an orthogonal neighbour`);
  });
  if (level.path.length < 4) errors.push("path needs at least 4 cells");
  return errors;
}

const DECOY_SHAPES = [N | S, N | E, N | E | S];

/** Lay out the level and scramble every rotatable tile so the puzzle never starts solved. */
export function buildBoard(level: TileLevel, seed = 1): TileBoard {
  const errors = validateTileLevel(level);
  if (errors.length) throw new Error(errors.join("; "));
  const rand = rng(seed);
  const { cols, rows, path } = level;
  const cells: TileCell[] = Array.from({ length: cols * rows }, () => ({ kind: "empty", mask: 0, rot: 0 }));
  const idx = (c: number, r: number) => r * cols + c;

  path.forEach((p, i) => {
    let mask = 0;
    if (i > 0) mask |= DIR_BITS[dirBetween(p, path[i - 1])];
    if (i < path.length - 1) mask |= DIR_BITS[dirBetween(p, path[i + 1])];
    const kind: TileKind = i === 0 ? "source" : i === path.length - 1 ? "target" : "path";
    cells[idx(p[0], p[1])] = { kind, mask, rot: 0 };
  });

  cells.forEach((c, i) => {
    if (c.kind === "empty" && rand() < level.decoyDensity) {
      cells[i] = { kind: "decoy", mask: DECOY_SHAPES[Math.floor(rand() * DECOY_SHAPES.length)], rot: Math.floor(rand() * 4) };
    }
  });

  const rotatable = cells.filter((c) => c.kind === "path");
  for (const c of rotatable) c.rot = Math.floor(rand() * 4);
  const board: TileBoard = { cols, rows, cells, source: idx(path[0][0], path[0][1]), target: idx(path.at(-1)![0], path.at(-1)![1]), moves: 0 };
  // Guarantee at least one path tile starts out of place.
  if (isSolved(board)) {
    const t = rotatable.find((c) => rotateMask(c.mask, 1) !== c.mask) ?? rotatable[0];
    if (t) t.rot = (t.rot + 1) % 4;
  }
  return board;
}

export const isRotatable = (c: TileCell) => c.kind === "path" || c.kind === "decoy";

export function rotateCell(board: TileBoard, i: number): TileBoard {
  const c = board.cells[i];
  if (!c || !isRotatable(c)) return board;
  const cells = board.cells.slice();
  cells[i] = { ...c, rot: (c.rot + 1) % 4 };
  return { ...board, cells, moves: board.moves + 1 };
}

/** Cells reached by the flow from the source, following matching connectors. */
export function litCells(board: TileBoard): Set<number> {
  const lit = new Set<number>([board.source]);
  const queue = [board.source];
  while (queue.length) {
    const i = queue.shift()!;
    const c = i % board.cols, r = Math.floor(i / board.cols);
    const m = effectiveMask(board.cells[i]);
    for (let d = 0; d < 4; d++) {
      if (!(m & DIR_BITS[d])) continue;
      const nc = c + DIR_STEP[d][0], nr = r + DIR_STEP[d][1];
      if (nc < 0 || nr < 0 || nc >= board.cols || nr >= board.rows) continue;
      const j = nr * board.cols + nc;
      if (lit.has(j)) continue;
      if (effectiveMask(board.cells[j]) & DIR_BITS[opposite(d)]) {
        lit.add(j);
        queue.push(j);
      }
    }
  }
  return lit;
}

export const isSolved = (board: TileBoard) => litCells(board).has(board.target);

/** Fewest clicks to put a path tile back on its solution orientation. */
export function clicksToSolve(c: TileCell): number {
  for (let k = 0; k < 4; k++) if (rotateMask(c.mask, c.rot + k) === c.mask) return k;
  return 0;
}

/** Next cell to click on the canonical solution, or -1 when nothing is left. */
export function nextSolutionClick(board: TileBoard): number {
  if (isSolved(board)) return -1;
  return board.cells.findIndex((c) => c.kind === "path" && clicksToSolve(c) > 0);
}
