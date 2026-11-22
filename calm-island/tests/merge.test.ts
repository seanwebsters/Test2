import { describe, expect, it } from 'vitest';
import { MergeBoard } from '../src/merge/board';

describe('merge board', () => {
  it('three of a kind become one of the next', () => {
    const b = new MergeBoard();
    for (let i = 0; i < 3; i++) b.add(0);
    const cells = b.pick(b.cells.indexOf(0));
    expect(cells).toHaveLength(3);
    const r = b.merge(cells)!;
    expect(r.made).toBe(1);
    expect(b.count(0)).toBe(0);
    expect(b.count(1)).toBe(1);
  });

  it('refuses fewer than three, or a mixed set', () => {
    const b = new MergeBoard();
    b.add(0);
    b.add(0);
    b.add(4);
    expect(b.merge(b.pick(b.cells.indexOf(0)))).toBeNull();
    expect(b.merge([0, 1, 2])).toBeNull();
  });

  it('twenty-seven of the first step finish a collection, which leaves the board', () => {
    const b = new MergeBoard();
    let finished = -1;
    for (let i = 0; i < 27; i++) {
      b.add(12);
      for (let again = true; again; ) {
        again = false;
        for (let c = 12; c < 15; c++) {
          if (b.count(c) < 3) continue;
          const r = b.merge(b.pick(b.cells.indexOf(c)))!;
          if (r.finished >= 0) finished = r.finished;
          again = true;
        }
      }
    }
    expect(finished).toBe(3);
    expect(b.done[3]).toBe(true);
    expect(b.cells.every((c) => c < 0)).toBe(true);
  });

  it('keeps what does not fit in the bag and brings it out when there is room', () => {
    const b = new MergeBoard();
    // two of each of the twelve mergeable items, plus one: the board is full with one set of three
    const codes = [0, 1, 2, 4, 5, 6, 8, 9, 10, 12, 13, 14];
    for (const c of codes) b.cells[b.cells.indexOf(-1)] = c;
    for (const c of codes) b.cells[b.cells.indexOf(-1)] = c;
    b.cells[b.cells.indexOf(-1)] = 0;
    expect(b.add(4)).toBe(-1);
    expect(b.bag).toEqual([4]);
    b.merge(b.pick(b.cells.indexOf(0)));
    expect(b.bag).toEqual([]);
    expect(b.count(4)).toBe(3);
  });

  it('survives a save and load', () => {
    const b = new MergeBoard();
    b.add(8);
    b.add(12);
    const c = new MergeBoard();
    c.load(JSON.parse(JSON.stringify(b.serialize())));
    expect(c.cells).toEqual(b.cells);
    expect(c.seen.has(8)).toBe(true);
    expect(c.fresh).toBe(2);
  });
});
