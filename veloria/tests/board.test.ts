import { describe, expect, it } from 'vitest';
import { CELLS, drop, starterBoard, take, Board } from '../src/game/board';
import { nextOf, rollGenerator } from '../src/game/items';

const item = (it: string, uid: number, frozen = false) => ({ kind: 'item' as const, item: it as `bloom:${number}`, uid, frozen });

describe('merge board', () => {
  it('starts with 63 cells and the generators', () => {
    const b = starterBoard();
    expect(b).toHaveLength(CELLS);
    expect(b.filter((c) => c?.kind === 'gen')).toHaveLength(4);
  });
  it('merges two identical items into the next level and thaws neighbours', () => {
    const b: Board = new Array(CELLS).fill(null);
    b[0] = item('bloom:1', 1);
    b[1] = item('bloom:1', 2);
    b[2] = item('clock:1', 3, true);
    const { board, res } = drop(b, 0, 1);
    expect(res.type).toBe('merge');
    expect(board[1]).toMatchObject({ item: 'bloom:2' });
    expect(board[0]).toBeNull();
    expect(board[2]).toMatchObject({ frozen: false });
  });
  it('swaps different items and moves into empty cells', () => {
    const b: Board = new Array(CELLS).fill(null);
    b[0] = item('bloom:1', 1);
    b[1] = item('crystal:1', 2);
    expect(drop(b, 0, 1).res.type).toBe('swap');
    expect(drop(b, 0, 5).res.type).toBe('move');
  });
  it('never merges past the top of a chain', () => {
    expect(nextOf('bloom:6')).toBeNull();
    expect(nextOf('bloom:5')).toBe('bloom:6');
  });
  it('takes the items an order needs', () => {
    const b: Board = new Array(CELLS).fill(null);
    b[3] = item('bloom:4', 1);
    expect(take(b, ['bloom:4'])![3]).toBeNull();
    expect(take(b, ['clock:3'])).toBeNull();
  });
  it('generators roll from their own chains', () => {
    expect(rollGenerator('cart', 0.5, 0.5)).toBe('bloom:1');
    expect(rollGenerator('tinker', 0.95, 0.01)).toBe('key:2');
  });
});
