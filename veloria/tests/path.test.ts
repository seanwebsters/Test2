import { describe, expect, it } from 'vitest';
import { findPath, walkable } from '../src/game/layout';

describe('pathfinding', () => {
  it('walks round the fountain', () => {
    expect(walkable(508, 960)).toBe(true);
    expect(walkable(508, 690)).toBe(true);
    const p = findPath([508, 960], [508, 690]);
    console.log(JSON.stringify(p));
    expect(p).not.toBeNull();
    expect(p![p!.length - 1]).toEqual([508, 690]);
  });
});
