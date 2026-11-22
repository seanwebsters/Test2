import { CHAINS, ITEM_COUNT } from './items';

export const BOARD = 25;
export const COLS = 5;

export interface MergeSave {
  cells: number[];
  bag: number[];
  done: boolean[];
  seen: number[];
  fresh: number;
  /** how many of each finished collection have been made */
  made?: number[];
}

/**
 * The merge board: twenty-five places, each empty (-1) or holding an item.
 * Three of the same item become one of the next. The last step of a
 * collection leaves the board and is kept for good.
 */
export class MergeBoard {
  cells: number[] = new Array(BOARD).fill(-1);
  /** things collected while the board was full, waiting for room */
  bag: number[] = [];
  done: boolean[] = CHAINS.map(() => false);
  made: number[] = CHAINS.map(() => 0);
  seen = new Set<number>();
  /** collected since the board was last opened */
  fresh = 0;

  /** Put a newly found item on the board (or in the bag if there is no room). Returns the cell, or -1. */
  add(code: number): number {
    this.seen.add(code);
    this.fresh++;
    const cell = this.place(code);
    if (cell < 0) this.bag.push(code);
    return cell;
  }

  private place(code: number): number {
    const empty: number[] = [];
    this.cells.forEach((c, i) => c < 0 && empty.push(i));
    if (!empty.length) return -1;
    // beside one of its own kind when it can be, so sets gather themselves
    const beside = empty.filter((i) => this.neighbours(i).some((n) => this.cells[n] === code));
    const pick = (beside.length ? beside : empty)[0];
    this.cells[pick] = code;
    return pick;
  }

  private neighbours(i: number): number[] {
    const x = i % COLS;
    const y = Math.floor(i / COLS);
    const out: number[] = [];
    if (x > 0) out.push(i - 1);
    if (x < COLS - 1) out.push(i + 1);
    if (y > 0) out.push(i - COLS);
    if (y < COLS - 1) out.push(i + COLS);
    return out;
  }

  count(code: number): number {
    return this.cells.reduce((n, c) => n + (c === code ? 1 : 0), 0);
  }

  /** The cell tapped plus the two nearest of the same kind, or fewer if there are not three. */
  pick(cell: number): number[] {
    const code = this.cells[cell];
    if (code < 0) return [];
    const dist = (i: number): number => Math.abs((i % COLS) - (cell % COLS)) + Math.abs(Math.floor(i / COLS) - Math.floor(cell / COLS));
    const others = this.cells.map((c, i) => i).filter((i) => i !== cell && this.cells[i] === code).sort((a, b) => dist(a) - dist(b));
    return [cell, ...others.slice(0, 2)];
  }

  /**
   * Merge three cells holding the same item into the first of them.
   * Returns what was made and, if that finished a collection, which one.
   */
  merge(cells: number[]): { made: number; finished: number; first: boolean } | null {
    if (cells.length !== 3 || new Set(cells).size !== 3) return null;
    const code = this.cells[cells[0]];
    if (code < 0 || (code & 3) === 3 || cells.some((c) => this.cells[c] !== code)) return null;
    const made = code + 1;
    this.seen.add(made);
    this.cells[cells[1]] = -1;
    this.cells[cells[2]] = -1;
    let finished = -1;
    let first = false;
    if ((made & 3) === 3) {
      // the top of a collection is kept, not left on the board
      finished = made >> 2;
      first = !this.done[finished];
      this.done[finished] = true;
      this.made[finished]++;
      this.cells[cells[0]] = -1;
    } else this.cells[cells[0]] = made;
    this.refill();
    return { made, finished, first };
  }

  /** Move things waiting in the bag onto the board while there is room. */
  refill(): void {
    while (this.bag.length && this.cells.includes(-1)) this.place(this.bag.shift()!);
  }

  serialize(): MergeSave {
    return { cells: [...this.cells], bag: [...this.bag], done: [...this.done], seen: [...this.seen], fresh: this.fresh, made: [...this.made] };
  }

  load(s: MergeSave | undefined): void {
    const ok = (c: unknown): c is number => Number.isInteger(c) && (c as number) >= 0 && (c as number) < ITEM_COUNT;
    this.cells = new Array(BOARD).fill(-1).map((_, i) => (ok(s?.cells?.[i]) ? (s!.cells[i] as number) : -1));
    this.bag = (s?.bag ?? []).filter(ok);
    this.done = CHAINS.map((_, i) => !!s?.done?.[i]);
    this.made = CHAINS.map((_, i) => Math.max(this.done[i] ? 1 : 0, Math.floor(Number(s?.made?.[i]) || 0)));
    this.seen = new Set((s?.seen ?? []).filter(ok));
    for (const c of this.cells) if (c >= 0) this.seen.add(c);
    this.fresh = Math.max(0, Math.floor(Number(s?.fresh) || 0));
  }
}
