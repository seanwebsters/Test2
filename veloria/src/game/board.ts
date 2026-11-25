import { GeneratorId, ItemKey, nextOf } from './items';

export const COLS = 7;
export const ROWS = 9;
export const CELLS = COLS * ROWS;

export type Cell =
  | null
  | { kind: 'item'; item: ItemKey; uid: number; frozen?: boolean }
  | { kind: 'gen'; gen: GeneratorId; uid: number; frozen?: boolean };

export type Board = Cell[];

let uidCounter = 1;
export function uid(): number {
  return uidCounter++;
}
export function bumpUid(board: Board) {
  for (const c of board) if (c && c.uid >= uidCounter) uidCounter = c.uid + 1;
}

export function idx(col: number, row: number) {
  return row * COLS + col;
}
export function colRow(i: number) {
  return { col: i % COLS, row: Math.floor(i / COLS) };
}

export function neighbours(i: number): number[] {
  const { col, row } = colRow(i);
  const out: number[] = [];
  if (col > 0) out.push(idx(col - 1, row));
  if (col < COLS - 1) out.push(idx(col + 1, row));
  if (row > 0) out.push(idx(col, row - 1));
  if (row < ROWS - 1) out.push(idx(col, row + 1));
  return out;
}

/** The empty cell closest to `from` (by grid distance), or -1 if the board is full. */
export function nearestEmpty(board: Board, from: number): number {
  const a = colRow(from);
  let best = -1;
  let bestD = Infinity;
  board.forEach((c, i) => {
    if (c) return;
    const b = colRow(i);
    const d = Math.hypot(a.col - b.col, (a.row - b.row) * 1.05);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  return best;
}

export function firstEmpty(board: Board): number {
  return nearestEmpty(board, idx(3, 4));
}

export type DropResult =
  | { type: 'none' }
  | { type: 'move' }
  | { type: 'swap' }
  | { type: 'merge'; result: ItemKey; thawed: number[] };

/**
 * Drop the cell at `from` onto `to`. Returns the new board and what happened.
 * Merging thaws frozen neighbours of the target cell.
 */
export function drop(board: Board, from: number, to: number): { board: Board; res: DropResult } {
  if (from === to) return { board, res: { type: 'none' } };
  const a = board[from];
  const b = board[to];
  if (!a || a.frozen) return { board, res: { type: 'none' } };
  const next = board.slice();
  if (!b) {
    next[to] = a;
    next[from] = null;
    return { board: next, res: { type: 'move' } };
  }
  if (b.frozen) {
    // merging onto a frozen twin thaws it and merges
    if (a.kind === 'item' && b.kind === 'item' && a.item === b.item) {
      const r = nextOf(a.item);
      if (r) {
        next[to] = { kind: 'item', item: r, uid: uid() };
        next[from] = null;
        const thawed = thaw(next, to);
        return { board: next, res: { type: 'merge', result: r, thawed } };
      }
    }
    return { board, res: { type: 'none' } };
  }
  if (a.kind === 'item' && b.kind === 'item' && a.item === b.item) {
    const r = nextOf(a.item);
    if (r) {
      next[to] = { kind: 'item', item: r, uid: uid() };
      next[from] = null;
      const thawed = thaw(next, to);
      return { board: next, res: { type: 'merge', result: r, thawed } };
    }
  }
  next[to] = a;
  next[from] = b;
  return { board: next, res: { type: 'swap' } };
}

function thaw(board: Board, at: number): number[] {
  const out: number[] = [];
  for (const n of neighbours(at)) {
    const c = board[n];
    if (c && c.frozen) {
      board[n] = { ...c, frozen: false } as Cell;
      out.push(n);
    }
  }
  return out;
}

export function countItem(board: Board, item: ItemKey): number {
  return board.reduce((s, c) => s + (c && c.kind === 'item' && !c.frozen && c.item === item ? 1 : 0), 0);
}

/** Remove one unfrozen copy of each listed item. Returns null if any is missing. */
export function take(board: Board, items: ItemKey[]): Board | null {
  const next = board.slice();
  for (const it of items) {
    const i = next.findIndex((c) => c && c.kind === 'item' && !c.frozen && c.item === it);
    if (i < 0) return null;
    next[i] = null;
  }
  return next;
}

export function starterBoard(): Board {
  const b: Board = new Array(CELLS).fill(null);
  const put = (col: number, row: number, c: Cell) => (b[idx(col, row)] = c);
  const it = (item: ItemKey, frozen = false): Cell => ({ kind: 'item', item, uid: uid(), frozen });
  const gen = (g: GeneratorId, frozen = false): Cell => ({ kind: 'gen', gen: g, uid: uid(), frozen });
  put(1, 4, gen('cart'));
  put(5, 4, gen('tinker'));
  put(3, 6, gen('geode'));
  put(3, 1, gen('desk', true));
  put(2, 4, it('bloom:1'));
  put(3, 4, it('bloom:1'));
  put(4, 4, it('clock:1'));
  // frozen-in-time items around the edges: merge beside them to wake them
  const frozen: [number, number, ItemKey][] = [
    [0, 0, 'crystal:1'], [1, 0, 'bloom:2'], [5, 0, 'clock:2'], [6, 0, 'time:1'],
    [0, 1, 'ink:1'], [6, 1, 'key:1'], [2, 1, 'ink:2'], [4, 1, 'ink:1'],
    [0, 8, 'bloom:1'], [1, 8, 'crystal:2'], [5, 8, 'time:1'], [6, 8, 'clock:1'],
    [0, 7, 'key:1'], [6, 7, 'bloom:2'], [2, 8, 'clock:1'], [4, 8, 'crystal:1'],
    [3, 0, 'time:2'], [3, 8, 'bloom:3'], [0, 4, 'crystal:1'], [6, 4, 'ink:1'],
  ];
  for (const [c, r, item] of frozen) put(c, r, it(item, true));
  return b;
}
