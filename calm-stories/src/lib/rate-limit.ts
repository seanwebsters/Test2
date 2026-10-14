/**
 * In-memory token-bucket rate limiter. Good enough for a single instance;
 * replace the store with Redis/Upstash for multi-region deployments.
 */
interface Bucket {
  tokens: number;
  updated: number;
}

const g = globalThis as unknown as { __calmBuckets?: Map<string, Bucket> };
const buckets = (g.__calmBuckets ??= new Map());

export function rateLimit(key: string, capacity: number, refillPerMinute: number, now = Date.now()): boolean {
  const b = buckets.get(key) ?? { tokens: capacity, updated: now };
  const elapsed = (now - b.updated) / 60000;
  b.tokens = Math.min(capacity, b.tokens + elapsed * refillPerMinute);
  b.updated = now;
  if (b.tokens < 1) {
    buckets.set(key, b);
    return false;
  }
  b.tokens -= 1;
  buckets.set(key, b);
  return true;
}
