import { randomInt } from "node:crypto";

/** Returns an integer in [0, max). Server-only; injectable for tests. */
export type Rng = (max: number) => number;

export const cryptoRng: Rng = (max) => randomInt(0, max);

/** Deterministic RNG (mulberry32) for seeding demo data and tests. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return (max) => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    const f = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    return Math.floor(f * max);
  };
}

/** Picks a key from a weight table. Weights must be non-negative integers with a positive sum. */
export function pickWeighted<K extends string>(table: Record<K, number>, rng: Rng): K {
  const entries = Object.entries(table) as [K, number][];
  const total = entries.reduce((s, [, w]) => s + w, 0);
  if (total <= 0) throw new Error("Weight table is empty");
  let roll = rng(total);
  for (const [k, w] of entries) {
    if (roll < w) return k;
    roll -= w;
  }
  return entries[entries.length - 1]![0];
}
