/**
 * In-memory sliding-window limiter for reward endpoints. Per process; put a
 * shared limiter (e.g. Redis or Postgres) in front for multi-instance hosting.
 */
const hits = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number, at = Date.now()): { ok: boolean; retryAfterMs: number } {
  const list = (hits.get(key) ?? []).filter((t) => at - t < windowMs);
  if (list.length >= limit) {
    hits.set(key, list);
    return { ok: false, retryAfterMs: windowMs - (at - list[0]!) };
  }
  list.push(at);
  hits.set(key, list);
  if (hits.size > 50_000) hits.clear();
  return { ok: true, retryAfterMs: 0 };
}

export function resetRateLimits() {
  hits.clear();
}
