import "server-only";
import { HttpError } from "./http";

const buckets = new Map<string, number[]>();

/** Simple in-memory sliding-window limiter (per instance). */
export function rateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= max) throw new HttpError(429, "You're going a bit fast — give it a moment and try again.");
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 10_000) buckets.clear();
}
