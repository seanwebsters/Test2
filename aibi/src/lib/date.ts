export function dayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  const ta = Date.UTC(ay, am - 1, ad);
  const tb = Date.UTC(by, bm - 1, bd);
  return Math.round((tb - ta) / 86400000);
}

/** Monday-based week key, e.g. "2026-11-23". */
export function weekKey(d: Date = new Date()): string {
  const copy = new Date(d);
  const dow = (copy.getDay() + 6) % 7; // 0 = Monday
  copy.setDate(copy.getDate() - dow);
  return dayKey(copy);
}

/** Fraction of the week elapsed (0..1), Monday 00:00 → Sunday 23:59. */
export function weekProgress(d: Date = new Date()): number {
  const dow = (d.getDay() + 6) % 7;
  return (dow + (d.getHours() * 60 + d.getMinutes()) / 1440) / 7;
}

export function lastNDays(n: number, d: Date = new Date()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const c = new Date(d);
    c.setDate(c.getDate() - i);
    out.push(dayKey(c));
  }
  return out;
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function seeded(seed: number) {
  let x = seed || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return ((x >>> 0) % 100000) / 100000;
  };
}
