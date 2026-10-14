/**
 * In-memory sliding-window limiter. Per instance only; in a multi-instance
 * deployment swap for a shared store (e.g. Upstash Redis) behind this function.
 */
const windows = new Map<string, number[]>();

export function rateLimit(key: string, perMinute: number, now = Date.now()): boolean {
  const cutoff = now - 60000;
  const hits = (windows.get(key) ?? []).filter((t) => t > cutoff);
  if (hits.length >= perMinute) {
    windows.set(key, hits);
    return false;
  }
  hits.push(now);
  windows.set(key, hits);
  if (windows.size > 10000) {
    for (const [k, v] of windows) if (!v.some((t) => t > cutoff)) windows.delete(k);
  }
  return true;
}
