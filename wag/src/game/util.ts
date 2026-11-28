import { COATS } from './data';
import type { CoatId } from './types';

export const dayKey = (d: Date | number = Date.now()) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

export const daysBetween = (a: string, b: string) => {
  const pa = new Date(a + 'T12:00:00').getTime();
  const pb = new Date(b + 'T12:00:00').getTime();
  return Math.round((pb - pa) / 86400000);
};

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function rng(seed: string | number) {
  let a = typeof seed === 'number' ? seed : hash(seed);
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const pick = <T,>(r: () => number, arr: T[]): T => arr[Math.floor(r() * arr.length)];

export function shuffle<T>(r: () => number, arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const fill = (s: string, dog: string) => s.replaceAll('{dog}', dog);

export type Phase = 'dawn' | 'day' | 'sunset' | 'night';
export function phaseOf(date = new Date()): Phase {
  const h = date.getHours() + date.getMinutes() / 60;
  if (h >= 5.5 && h < 8) return 'dawn';
  if (h >= 8 && h < 17.5) return 'day';
  if (h >= 17.5 && h < 20.5) return 'sunset';
  return 'night';
}

export function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 5) return 'Sweet dreams';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

/** Downscale an uploaded image to a JPEG data URL small enough for localStorage. */
export function fileToDataUrl(file: File, max = 640, quality = 0.78): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

/** Sample the centre of a photo and find the closest coat colour. Works fully on-device. */
export function matchCoat(dataUrl: string): Promise<CoatId> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      const s = 48;
      c.width = s;
      c.height = s;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(img, 0, 0, s, s);
      const d = ctx.getImageData(s * 0.25, s * 0.2, s * 0.5, s * 0.6).data;
      // bucket colours and pick the most common non-background-looking bucket
      const buckets = new Map<string, { n: number; r: number; g: number; b: number }>();
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i + 1], b = d[i + 2];
        const sat = Math.max(r, g, b) - Math.min(r, g, b);
        // ignore greens/blues (grass, sky)
        if (g > r + 12 || b > r + 18) continue;
        const k = `${r >> 5}-${g >> 5}-${b >> 5}`;
        const e = buckets.get(k) ?? { n: 0, r: 0, g: 0, b: 0 };
        e.n += 1 + (sat > 30 ? 0.3 : 0);
        e.r += r;
        e.g += g;
        e.b += b;
        buckets.set(k, e);
      }
      let best: { n: number; r: number; g: number; b: number } | null = null;
      for (const v of buckets.values()) if (!best || v.n > best.n) best = v;
      if (!best) return resolve('golden');
      const avg = [best.r / best.n, best.g / best.n, best.b / best.n];
      let coat: CoatId = 'golden';
      let bestD = Infinity;
      for (const [id, c2] of Object.entries(COATS)) {
        const dd = (avg[0] - c2.rgb[0]) ** 2 + (avg[1] - c2.rgb[1]) ** 2 + (avg[2] - c2.rgb[2]) ** 2;
        if (dd < bestD) {
          bestD = dd;
          coat = id as CoatId;
        }
      }
      resolve(coat);
    };
    img.onerror = () => resolve('golden');
    img.src = dataUrl;
  });
}

export const fmtTime = (secs: number) => {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export const prettyDay = (day: string) =>
  new Date(day + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

export function haversineKm(a: GeolocationCoordinates, b: GeolocationCoordinates) {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const la = (a.latitude * Math.PI) / 180;
  const lb = (b.latitude * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la) * Math.cos(lb) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function weekKey(d = new Date()) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  return dayKey(x);
}

export function season(d = new Date()) {
  const m = d.getMonth();
  if (m >= 2 && m <= 4) return 'Spring';
  if (m >= 5 && m <= 7) return 'Summer';
  if (m >= 8 && m <= 10) return 'Autumn';
  return 'Winter';
}
