/**
 * Server clock. Daily resets happen at 00:00 UTC for every collector,
 * regardless of their local timezone (one global reset keeps drops fair
 * and auditable). Tests may override the clock.
 */
export const DAY_MS = 86_400_000;

let override: number | undefined;

export function now(): number {
  return override ?? Date.now();
}

export function setNow(ms: number | undefined) {
  override = ms;
}

export function utcDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function nextUtcMidnight(ms: number): number {
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
}
