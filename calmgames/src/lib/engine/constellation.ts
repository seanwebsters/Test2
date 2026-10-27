import type { ConstellationLevel } from "./schemas";

export const edgeKey = (a: string, b: string) => (a < b ? `${a}~${b}` : `${b}~${a}`);

export interface SkyState {
  drawn: string[];
  misses: number;
}

export const MIN_STAR_GAP = 0.05;

type P = { x: number; y: number };
function orient(a: P, b: P, c: P) {
  return Math.sign((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x));
}
/** Proper crossing of two segments that share no endpoint. */
export function segmentsCross(a: P, b: P, c: P, d: P): boolean {
  return orient(a, b, c) * orient(a, b, d) < 0 && orient(c, d, a) * orient(c, d, b) < 0;
}

export function validateConstellationLevel(level: ConstellationLevel): string[] {
  const errors: string[] = [];
  const stars = new Map(level.stars.map((s) => [s.id, s]));
  if (stars.size !== level.stars.length) errors.push("star ids must be unique");
  level.stars.forEach((s) => {
    if (s.x < 0.05 || s.x > 0.95 || s.y < 0.05 || s.y > 0.95) errors.push(`star ${s.id} sits too close to the edge; keep x and y within 0.05–0.95`);
  });
  for (let i = 0; i < level.stars.length; i++)
    for (let j = i + 1; j < level.stars.length; j++) {
      const a = level.stars[i], b = level.stars[j];
      if (Math.hypot(a.x - b.x, a.y - b.y) < MIN_STAR_GAP) errors.push(`stars ${a.id} and ${b.id} are too close together to tap separately`);
    }
  const keys = new Set<string>();
  level.edges.forEach(([a, b], i) => {
    if (!stars.has(a) || !stars.has(b)) errors.push(`edges[${i}] references an unknown star`);
    if (a === b) errors.push(`edges[${i}] joins a star to itself`);
    const k = edgeKey(a, b);
    if (keys.has(k)) errors.push(`edges[${i}] duplicates another line`);
    keys.add(k);
  });
  if (errors.length) return errors;

  for (let i = 0; i < level.edges.length; i++)
    for (let j = i + 1; j < level.edges.length; j++) {
      const [a, b] = level.edges[i], [c, d] = level.edges[j];
      if (new Set([a, b, c, d]).size < 4) continue;
      if (segmentsCross(stars.get(a)!, stars.get(b)!, stars.get(c)!, stars.get(d)!)) errors.push(`lines ${a}–${b} and ${c}–${d} cross; constellations here never cross`);
    }

  // Every star in the figure must be reachable from every other.
  const adj = new Map<string, string[]>();
  for (const [a, b] of level.edges) {
    adj.set(a, [...(adj.get(a) ?? []), b]);
    adj.set(b, [...(adj.get(b) ?? []), a]);
  }
  const start = level.edges[0][0];
  const seen = new Set([start]);
  const queue = [start];
  while (queue.length) for (const n of adj.get(queue.shift()!) ?? []) if (!seen.has(n)) seen.add(n), queue.push(n);
  if (seen.size !== adj.size) errors.push("the figure is split into separate pieces; every line should connect into one shape");
  return errors;
}

export function createSky(): SkyState {
  return { drawn: [], misses: 0 };
}

export type ConnectResult = "correct" | "incorrect" | "duplicate" | "same";

export function connect(state: SkyState, level: ConstellationLevel, a: string, b: string): { state: SkyState; result: ConnectResult } {
  if (a === b) return { state, result: "same" };
  const key = edgeKey(a, b);
  if (state.drawn.includes(key)) return { state, result: "duplicate" };
  const target = level.edges.some(([x, y]) => edgeKey(x, y) === key);
  if (!target) return { state: { ...state, misses: state.misses + 1 }, result: "incorrect" };
  return { state: { ...state, drawn: [...state.drawn, key] }, result: "correct" };
}

/** Lines a star still needs before its part of the figure is whole. */
export function remainingDegree(state: SkyState, level: ConstellationLevel, id: string): number {
  return level.edges.filter(([a, b]) => (a === id || b === id) && !state.drawn.includes(edgeKey(a, b))).length;
}

export const isSkyComplete = (state: SkyState, level: ConstellationLevel) => level.edges.every(([a, b]) => state.drawn.includes(edgeKey(a, b)));

export function nextEdge(state: SkyState, level: ConstellationLevel): string[] | null {
  return level.edges.find(([a, b]) => !state.drawn.includes(edgeKey(a, b))) ?? null;
}
