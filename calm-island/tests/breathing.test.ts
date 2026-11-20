import { describe, expect, it } from 'vitest';
import { BREATHS, Breathing } from '../src/core/Breathing';

describe('breathing exercise', () => {
  it('runs three in / hold / out breaths and then finishes', () => {
    const b = new Breathing();
    b.start();
    const phases: string[] = [];
    let finishedAt = -1;
    let peak = 0;
    for (let i = 0; i < 60 * 60; i++) {
      const done = b.update(1 / 60);
      if (phases[phases.length - 1] !== `${b.breath}:${b.phase}`) phases.push(`${b.breath}:${b.phase}`);
      peak = Math.max(peak, b.fill);
      expect(b.fill).toBeGreaterThanOrEqual(0);
      expect(b.fill).toBeLessThanOrEqual(1);
      if (done) {
        finishedAt = i / 60;
        break;
      }
    }
    expect(BREATHS).toBe(3);
    expect(phases).toEqual(['0:in', '0:hold', '0:out', '1:in', '1:hold', '1:out', '2:in', '2:hold', '2:out']);
    expect(peak).toBe(1);
    expect(finishedAt).toBeGreaterThan(30);
    expect(finishedAt).toBeLessThan(40);
    expect(b.active).toBe(false);
    expect(b.fill).toBe(0);
  });

  it('can be cancelled part way', () => {
    const b = new Breathing();
    b.start();
    b.update(2);
    expect(b.fill).toBeGreaterThan(0);
    b.cancel();
    expect(b.active).toBe(false);
    expect(b.update(1)).toBe(false);
  });
});
