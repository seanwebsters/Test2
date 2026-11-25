import * as THREE from 'three';
import { useGame, timeLevel } from '../game/store';
import { RestoreId } from '../game/quests';

/** Mutable per-frame values every world component can read without re-rendering. */
export const W = {
  /** smoothed time level 0..5 */
  flow: 0,
  /** time that only advances while the city is alive: frozen things stay frozen */
  alive: 0,
  t: 0,
  player: new THREE.Vector3(),
  him: new THREE.Vector3(),
  playerFacing: 0,
};

export function updateFlow(dt: number) {
  const s = useGame.getState();
  const target = timeLevel(s.restored);
  W.flow += (target - W.flow) * Math.min(1, dt * 0.6);
  W.t += dt;
  W.alive += dt * Math.min(1, W.flow);
}

/** 0..1 progress of a restoration's animation (0 before it happens) */
export function restoreProgress(id: RestoreId, dur = 3200): number {
  const at = useGame.getState().restored[id];
  if (!at) return 0;
  return THREE.MathUtils.clamp((Date.now() - at) / dur, 0, 1);
}

export const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export const easeOutBack = (x: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

export const PAL = {
  cream: '#efe4d2',
  creamWarm: '#f3e6d0',
  stone: '#d6c9c0',
  stoneDark: '#b8a9a6',
  terracotta: '#c47e62',
  rose: '#d99aa5',
  dusty: '#c98a93',
  lavender: '#a89cc6',
  lilac: '#c6b6dc',
  midnight: '#3b3d6a',
  roofPlum: '#6b5274',
  roofBlue: '#4a5585',
  timber: '#6b5049',
  sage: '#9fb49a',
  sageDark: '#71886b',
  hedge: '#6a8462',
  grass: '#93ab83',
  plum: '#5a3f5c',
  soil: '#7c5c52',
  ink: '#3a2f3f',
};

const matCache = new Map<string, THREE.MeshStandardMaterial>();
/** shared matte material */
export function mat(color: string, opts: { emissive?: string; ei?: number; rough?: number } = {}) {
  const k = `${color}|${opts.emissive ?? ''}|${opts.ei ?? 0}|${opts.rough ?? 0.92}`;
  let m = matCache.get(k);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color,
      roughness: opts.rough ?? 0.92,
      metalness: 0,
      emissive: opts.emissive ?? '#000000',
      emissiveIntensity: opts.ei ?? 0,
    });
    matCache.set(k, m);
  }
  return m;
}

/** Hand-drawn cobblestone texture, generated once. */
let cobble: THREE.CanvasTexture | null = null;
export function cobbleTexture() {
  if (cobble) return cobble;
  const S = 512;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  g.fillStyle = '#b79f9a';
  g.fillRect(0, 0, S, S);
  let seed = 3;
  const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const tints = ['#ecdccf', '#e8d2cc', '#f0e2d2', '#e2cfcf', '#ead8c6', '#e5d1d4'];
  const rows = 10;
  const h = S / rows;
  for (let row = 0; row < rows; row++) {
    let x = row % 2 ? -h * 0.5 : 0;
    while (x < S + h) {
      const w = h * (0.8 + r() * 0.6);
      const cx = x + w / 2;
      const cy = row * h + h / 2;
      for (const ox of [-S, 0, S]) {
        g.fillStyle = tints[Math.floor(r() * tints.length)];
        g.beginPath();
        const rr = Math.min(w, h) * 0.32;
        roundRect(g, cx + ox - w / 2 + 3, cy - h / 2 + 3, w - 6, h - 6, rr);
        g.fill();
        // soft top highlight
        g.fillStyle = 'rgba(255,255,255,0.10)';
        g.beginPath();
        roundRect(g, cx + ox - w / 2 + 6, cy - h / 2 + 5, w - 12, (h - 6) * 0.45, rr * 0.8);
        g.fill();
      }
      x += w;
    }
  }
  cobble = new THREE.CanvasTexture(c);
  cobble.wrapS = cobble.wrapT = THREE.RepeatWrapping;
  cobble.colorSpace = THREE.SRGBColorSpace;
  cobble.anisotropy = 8;
  return cobble;
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/** soft round glow sprite */
let glow: THREE.CanvasTexture | null = null;
export function glowTexture() {
  if (glow) return glow;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  glow = new THREE.CanvasTexture(c);
  glow.colorSpace = THREE.SRGBColorSpace;
  return glow;
}

/** banner cloth with a crescent moon */
let banner: THREE.CanvasTexture | null = null;
export function bannerTexture() {
  if (banner) return banner;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#6b4363';
  g.fillRect(0, 0, 128, 256);
  g.strokeStyle = '#e9cfa8';
  g.lineWidth = 4;
  g.strokeRect(10, 10, 108, 236);
  g.fillStyle = '#f1dfc2';
  g.beginPath();
  g.arc(64, 110, 34, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#6b4363';
  g.beginPath();
  g.arc(80, 98, 30, 0, Math.PI * 2);
  g.fill();
  banner = new THREE.CanvasTexture(c);
  banner.colorSpace = THREE.SRGBColorSpace;
  return banner;
}

/** Bookshop sign lettering */
export function signTexture(text: string) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#5a3f5c';
  g.fillRect(0, 0, 512, 128);
  g.strokeStyle = '#e8d6b4';
  g.lineWidth = 5;
  g.strokeRect(10, 10, 492, 108);
  g.fillStyle = '#f3e6cc';
  g.font = 'italic 600 58px "Cormorant Garamond", Georgia, serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 256, 68);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** clock face with roman-ish tick marks */
let clockFace: THREE.CanvasTexture | null = null;
export function clockTexture() {
  if (clockFace) return clockFace;
  const S = 512;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  const cx = S / 2;
  g.fillStyle = '#f6eedf';
  g.beginPath();
  g.arc(cx, cx, cx, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#6b5274';
  g.lineWidth = 14;
  g.beginPath();
  g.arc(cx, cx, cx - 16, 0, Math.PI * 2);
  g.stroke();
  g.lineWidth = 3;
  g.beginPath();
  g.arc(cx, cx, cx - 70, 0, Math.PI * 2);
  g.stroke();
  const numerals = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
  g.fillStyle = '#4b3a52';
  g.font = '600 40px "Cormorant Garamond", Georgia, serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    g.fillText(numerals[i], cx + Math.cos(a) * (cx - 110), cx + Math.sin(a) * (cx - 110));
    g.fillRect(cx + Math.cos(a) * (cx - 52) - 4, cx + Math.sin(a) * (cx - 52) - 4, 8, 8);
  }
  // crescent at the centre
  g.fillStyle = '#c99aa2';
  g.beginPath();
  g.arc(cx, cx + 70, 26, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#f6eedf';
  g.beginPath();
  g.arc(cx + 10, cx + 62, 22, 0, Math.PI * 2);
  g.fill();
  clockFace = new THREE.CanvasTexture(c);
  clockFace.colorSpace = THREE.SRGBColorSpace;
  clockFace.anisotropy = 8;
  return clockFace;
}

export function lerpColor(a: string, b: string, t: number, out = new THREE.Color()) {
  return out.set(a).lerp(new THREE.Color(b), t);
}
