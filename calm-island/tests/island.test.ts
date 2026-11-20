import { describe, expect, it } from 'vitest';
import { GRID, SPAWN, SUMMIT, getIsland, polylineAt, WATER_DROP } from '../src/world/islandMap';

const island = getIsland();

describe('island map', () => {
  it('bakes a finite height grid', () => {
    expect(island.height.length).toBe(GRID * GRID);
    for (let i = 0; i < island.height.length; i += 97) expect(Number.isFinite(island.height[i])).toBe(true);
  });

  it('spawns the player on dry, flat land', () => {
    const h = island.heightAt(SPAWN.x, SPAWN.z);
    expect(h).toBeGreaterThan(10);
    expect(island.waterLevelAt(SPAWN.x, SPAWN.z)).toBeLessThan(h);
    expect(island.gradientAt(SPAWN.x, SPAWN.z, { x: 0, z: 0 })).toBeLessThan(0.2);
  });

  it('is surrounded by sea', () => {
    for (const [x, z] of [[-505, 0], [505, 0], [0, -505], [0, 505], [-480, -480], [480, 480]]) {
      expect(island.heightAt(x, z)).toBeLessThan(-2);
    }
  });

  it('has a tall mountain and a real waterfall drop', () => {
    expect(island.heightAt(SUMMIT.x, SUMMIT.z)).toBeGreaterThan(120);
    expect(island.falls.lip.y - island.falls.base.y).toBeGreaterThan(30);
    expect(island.falls.baseS).toBeGreaterThan(island.falls.lipS);
  });

  it('keeps the river bed under its water and flowing downhill', () => {
    let prev = Infinity;
    for (let s = island.falls.baseS + 45; s < island.river.length - 120; s += 6) {
      const q = polylineAt(island.river, s);
      const water = island.riverShore(s, q.x, q.z) - WATER_DROP;
      expect(water).toBeLessThanOrEqual(prev + 1e-6);
      prev = water;
      if (water > 0.3) expect(island.heightAt(q.x, q.z)).toBeLessThan(water);
    }
  });

  it('fills the lakes', () => {
    for (const l of island.lakes) {
      expect(island.heightAt(l.x, l.z)).toBeLessThan(l.level);
      expect(island.waterLevelAt(l.x, l.z)).toBeCloseTo(l.level, 5);
    }
  });

  it('keeps paths on land', () => {
    for (const p of island.paths) {
      for (let s = 0; s <= p.length; s += 5) {
        const q = polylineAt(p, s);
        expect(island.heightAt(q.x, q.z)).toBeGreaterThan(0);
      }
    }
  });
});
