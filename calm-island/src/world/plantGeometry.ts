/**
 * Procedural plant and rock meshes. Everything is vertex-coloured and smooth
 * shaded so it reads as soft, hand-sculpted shapes rather than facets. Each
 * builder returns plain BufferGeometry with position / normal / color, sitting
 * on the ground at y = 0, so a GLB asset can replace any of them later.
 */
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { lerp, mulberry32, smoothstep } from '../core/math';
import { Noise2D } from './noise';
import { SEASON } from './season';

const nz = new Noise2D(808);
const v = new THREE.Vector3();
const C = (h: number): THREE.Color => new THREE.Color(h);

type ColorFn = (p: THREE.Vector3, n: THREE.Vector3, out: THREE.Color) => void;

function paint(geo: THREE.BufferGeometry, fn: ColorFn): THREE.BufferGeometry {
  const g = geo.index ? geo.toNonIndexed() : geo;
  g.deleteAttribute('uv');
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  const col = new Float32Array(pos.count * 3);
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    n.fromBufferAttribute(nor, i);
    fn(p, n, c);
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

function merge(list: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const flat = list.map((g) => (g.index ? g.toNonIndexed() : g));
  // fronds carry where each point lies on its leaf; anything merged with them gets a "not a leaf" marker
  if (flat.some((g) => g.attributes.aLeaf)) {
    for (const g of flat) {
      if (g.attributes.aLeaf) continue;
      const a = new Float32Array(g.attributes.position.count * 2);
      for (let i = 0; i < a.length; i += 2) a[i + 1] = -1;
      g.setAttribute('aLeaf', new THREE.BufferAttribute(a, 2));
    }
  }
  const out = mergeGeometries(flat);
  if (!out) throw new Error('could not merge plant geometry');
  return out;
}

/** A lumpy sphere with smooth normals. */
function blob(r: number, detail: number, seed: number, squash = 0.84, lump = 0.17): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(1, detail);
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    const k = r * (1 + lump * nz.simplex(v.x * 1.7 + seed * 7.3, v.y * 1.7 + v.z * 1.3 + seed));
    nor.setXYZ(i, v.x, v.y, v.z);
    pos.setXYZ(i, v.x * k, v.y * k * squash, v.z * k);
  }
  g.deleteAttribute('uv');
  return g;
}

interface Palette {
  dark: THREE.Color;
  mid: THREE.Color;
  light: THREE.Color;
}

interface BlobDef {
  x: number;
  y: number;
  z: number;
  r: number;
}

/** A cloud of blobs shaded as one soft mass: deep underneath, sunlit on top. */
function canopy(blobs: BlobDef[], detail: number, pal: Palette, seed: number): THREE.BufferGeometry {
  const core = Math.max(1, detail - 1);
  const parts = blobs.map((b, i) => blob(b.r, i === 0 ? core : Math.max(1, core - 1), seed + i * 1.7).translate(b.x, b.y, b.z));
  if (detail >= 4) {
    // little puffs over the top and sides break up the outline into leafy tufts
    const rnd = mulberry32(Math.floor(seed * 1000) + 5);
    blobs.forEach((b, i) => {
      const n = b.r > 2 ? 9 : 5;
      for (let k = 0; k < n; k++) {
        const a = rnd() * Math.PI * 2;
        const y = -0.25 + rnd() * 1.2;
        const rr = Math.sqrt(Math.max(0, 1 - Math.min(1, y) ** 2));
        const pr = b.r * (0.26 + rnd() * 0.16);
        parts.push(
          blob(pr, 1, seed + i * 3.1 + k, 0.9, 0.1).translate(
            b.x + Math.cos(a) * rr * b.r * 0.86,
            b.y + Math.min(1, y) * b.r * 0.84 * 0.86,
            b.z + Math.sin(a) * rr * b.r * 0.86,
          ),
        );
      }
    });
  }
  const g = merge(parts);
  g.computeBoundingBox();
  const bb = g.boundingBox!;
  const centre = bb.getCenter(new THREE.Vector3());
  centre.y = lerp(bb.min.y, bb.max.y, 0.35);
  const nor = g.attributes.normal;
  const pos = g.attributes.position;
  const out = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(nor, i);
    out.fromBufferAttribute(pos, i).sub(centre).normalize();
    v.multiplyScalar(0.5).addScaledVector(out, 0.5);
    v.y += 0.55; // lit as if a little more of the crown faced the sky: soft, never muddy
    v.normalize();
    nor.setXYZ(i, v.x, v.y, v.z);
  }
  return paint(g, (p, n, c) => {
    const t = (p.y - bb.min.y) / (bb.max.y - bb.min.y);
    let shade = smoothstep(0, 1, t) * 0.7 + (n.y * 0.5 + 0.5) * 0.3;
    shade += nz.simplex(p.x * 0.9 + seed, p.z * 0.9 + p.y) * 0.1;
    if (shade < 0.5) c.copy(pal.dark).lerp(pal.mid, smoothstep(0, 0.5, shade));
    else c.copy(pal.mid).lerp(pal.light, smoothstep(0.5, 1, shade));
  });
}

const BARK_DARK = C(0x6b4a33);
const BARK_LIGHT = C(0x9b7350);

function trunk(height: number, rBottom: number, rTop: number, bend: number, lean = 0): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(rTop, rBottom, height, 9, 6, true).translate(0, height / 2, 0);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const flare = 1 + Math.max(0, 0.9 - v.y) * 0.75;
    const t = v.y / height;
    pos.setXYZ(i, v.x * flare + bend * t * t + lean * t, v.y, v.z * flare);
  }
  g.computeVertexNormals();
  return paint(g, (p, _n, c) => {
    c.copy(BARK_DARK).lerp(BARK_LIGHT, 0.5 + 0.5 * nz.simplex(p.y * 1.3, Math.atan2(p.z, p.x) * 2));
  });
}

function branch(from: THREE.Vector3, to: THREE.Vector3, r: number): THREE.BufferGeometry {
  const len = from.distanceTo(to);
  const g = new THREE.CylinderGeometry(r * 0.6, r, len, 6, 1, true).translate(0, len / 2, 0);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
  g.applyQuaternion(q).translate(from.x, from.y, from.z);
  return paint(g, (_p, _n, c) => c.copy(BARK_DARK).lerp(BARK_LIGHT, 0.4));
}

const LEAF: Palette[] = [
  { dark: C(0x2f8a3c), mid: C(0x55b545), light: C(0x9bdc55) },
  { dark: C(0x2b7f45), mid: C(0x47a84b), light: C(0x84d05a) },
  { dark: C(0x3f8f2f), mid: C(0x6fbd3a), light: C(0xb5e25c) },
];
const BLOSSOM: Palette[] = [
  { dark: C(0xe888b4), mid: C(0xf9b3d0), light: C(0xffe1ee) },
  { dark: C(0xee9cbf), mid: C(0xfcc5da), light: C(0xfff0f6) },
];

export function broadleafTree(variant: number, detail: number): THREE.BufferGeometry {
  const rnd = mulberry32(100 + variant * 31);
  const bend = (rnd() - 0.5) * 1.2;
  const h = 3.4 + rnd() * 0.8;
  const blobs: BlobDef[] = [{ x: bend, y: h + 2.2, z: 0, r: 2.6 }];
  const ring = 5 + (variant % 2);
  for (let i = 0; i < ring; i++) {
    const a = (i / ring) * Math.PI * 2 + rnd();
    const d = 1.9 + rnd() * 0.6;
    blobs.push({ x: bend + Math.cos(a) * d, y: h + 0.9 + rnd() * 1.5, z: Math.sin(a) * d, r: 1.5 + rnd() * 0.6 });
  }
  blobs.push({ x: bend + 0.3, y: h + 4.0, z: 0.2, r: 1.7 });
  return merge([trunk(h + 1.6, 0.36, 0.2, bend), canopy(blobs, detail, leafPal(variant), variant * 3.1)]);
}

export function cherryTree(variant: number, detail: number): THREE.BufferGeometry {
  const rnd = mulberry32(500 + variant * 17);
  const lean = (rnd() - 0.5) * 1.4;
  const h = 2.5 + rnd() * 0.5;
  const top = new THREE.Vector3(lean, h, 0);
  const blobs: BlobDef[] = [{ x: lean, y: h + 1.7, z: 0, r: 2.1 }];
  const parts: THREE.BufferGeometry[] = [trunk(h + 0.6, 0.3, 0.17, 0, lean * (h + 0.6) / h)];
  const ring = 6;
  for (let i = 0; i < ring; i++) {
    const a = (i / ring) * Math.PI * 2 + rnd();
    const d = 2.1 + rnd() * 0.7;
    const b = { x: lean + Math.cos(a) * d, y: h + 0.9 + rnd() * 1.0, z: Math.sin(a) * d, r: 1.35 + rnd() * 0.5 };
    blobs.push(b);
    if (i % 2 === 0) parts.push(branch(top.clone().setY(h - 0.4), new THREE.Vector3(b.x, b.y - 0.2, b.z), 0.11));
  }
  parts.push(canopy(blobs, detail, blossomPal(variant), 40 + variant * 2.3));
  return merge(parts);
}

const PINE_DARK = C(0x1f6b45);
const PINE_MID = C(0x318f52);
const PINE_LIGHT = C(0x63b963);
const SNOWY = C(0xf4f8ff);
const AUTUMN_LEAF: Palette[] = [
  { dark: C(0xb5521e), mid: C(0xe8922a), light: C(0xffd24a) },
  { dark: C(0x9a3a1e), mid: C(0xd9602a), light: C(0xf7a03a) },
  { dark: C(0xa8761e), mid: C(0xe0b030), light: C(0xf7e06a) },
];
const AUTUMN_BLOSSOM: Palette[] = [
  { dark: C(0x9a2a2a), mid: C(0xd9483a), light: C(0xf78a5a) },
  { dark: C(0xb5521e), mid: C(0xf08a3a), light: C(0xffc86a) },
];
const WINTER: Palette = { dark: C(0x8fa6b2), mid: C(0xd4e2ea), light: C(0xffffff) };
const SUMMER_BLOSSOM: Palette = { dark: C(0x2f8a3c), mid: C(0x5cbc48), light: C(0xa6e25c) };

/** Leaves turn with the seasons: gold in autumn, snow-laden in winter. */
function leafPal(i: number): Palette {
  if (SEASON === 'autumn') return AUTUMN_LEAF[i % AUTUMN_LEAF.length];
  if (SEASON === 'winter') return WINTER;
  return LEAF[i % LEAF.length];
}
/** Blossom trees are pink in spring, green in summer, red in autumn, white in winter. */
function blossomPal(i: number): Palette {
  if (SEASON === 'summer') return SUMMER_BLOSSOM;
  if (SEASON === 'autumn') return AUTUMN_BLOSSOM[i % AUTUMN_BLOSSOM.length];
  if (SEASON === 'winter') return WINTER;
  return BLOSSOM[i % BLOSSOM.length];
}

export function pineTree(variant: number, detail: number): THREE.BufferGeometry {
  const rnd = mulberry32(900 + variant * 13);
  const tiers = 5;
  const seg = detail > 1 ? 12 : 8;
  const parts: THREE.BufferGeometry[] = [trunk(3, 0.28, 0.16, 0)];
  let y = 1.5;
  for (let t = 0; t < tiers; t++) {
    const k = t / (tiers - 1);
    const r = lerp(2.5, 0.9, k) * (0.92 + rnd() * 0.16);
    const hgt = lerp(2.8, 2.0, k);
    const g = new THREE.ConeGeometry(r, hgt, seg, 3, true).translate(0, hgt / 2, 0);
    const pos = g.attributes.position;
    const spin = rnd() * 6;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const a = Math.atan2(v.z, v.x);
      const low = 1 - v.y / hgt;
      const wob = 1 + 0.16 * Math.sin(a * 5 + spin) * low;
      // skirts flare and droop like heavy boughs
      pos.setXYZ(i, v.x * wob * (1 + 0.12 * low * low), v.y - 0.35 * low * low * (1 + 0.5 * Math.sin(a * 5 + spin)), v.z * wob * (1 + 0.12 * low * low));
    }
    g.computeVertexNormals();
    g.translate(0, y, 0);
    const y0 = y;
    parts.push(
      paint(g, (p, _n, c) => {
        const low = 1 - (p.y - y0) / hgt;
        c.copy(PINE_DARK).lerp(PINE_MID, smoothstep(0.1, 0.7, low)).lerp(SEASON === 'winter' ? SNOWY : PINE_LIGHT, smoothstep(SEASON === 'winter' ? 0.45 : 0.75, 1.05, low) * 0.8);
      }),
    );
    y += hgt * 0.56;
  }
  return merge(parts);
}

/** A leaf blade that arcs up and droops over: palm fronds, ferns, big tropical leaves. */
function frond(length: number, width: number, rise: number, droop: number, base: THREE.Color, tip: THREE.Color, segs = 8): THREE.BufferGeometry {
  const pos: number[] = [];
  const leaf: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const x = length * t;
    const y = rise * Math.sin(t * Math.PI * 0.75) - droop * t * t;
    const w = width * Math.pow(Math.sin(Math.PI * Math.min(1, t * 0.92 + 0.06)), 0.7) * 0.5;
    const fold = w * 0.45;
    pos.push(x, y - fold, -w, x, y, 0, x, y - fold, w);
    leaf.push(-1, t + 0.01, 0, t + 0.01, 1, t + 0.01); // (never exactly 0: that is what a shape with no leaf data reads as)
    if (i > 0) {
      const a = (i - 1) * 3;
      const b = i * 3;
      idx.push(a, b, a + 1, a + 1, b, b + 1, a + 1, b + 1, a + 2, a + 2, b + 1, b + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aLeaf', new THREE.Float32BufferAttribute(leaf, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return paint(g, (p, _n, c) => {
    c.copy(base).lerp(tip, smoothstep(0, length, p.x) * 0.85 + (Math.abs(p.z) / (width * 0.5 + 0.001)) * 0.15);
  });
}

function frondCrown(count: number, make: (i: number, rnd: () => number) => THREE.BufferGeometry, seed: number, pitchMin: number, pitchMax: number): THREE.BufferGeometry[] {
  const rnd = mulberry32(seed);
  const out: THREE.BufferGeometry[] = [];
  for (let i = 0; i < count; i++) {
    const g = make(i, rnd);
    g.rotateZ(lerp(pitchMin, pitchMax, rnd()));
    g.rotateY((i / count) * Math.PI * 2 + rnd() * 0.5);
    out.push(g);
  }
  return out;
}

const PALM_BASE = C(0x2f9440);
const PALM_TIP = C(0x9bd94c);
const PALM_BARK_A = C(0x8a6f4c);
const PALM_BARK_B = C(0xb89a6c);

/** A tree reduced to one soft crown on a stick, for the far distance. */
export function farTree(type: 'leaf' | 'blossom' | 'pine', variant: number): THREE.BufferGeometry {
  const pal = type === 'blossom' ? blossomPal(variant) : type === 'pine' ? { dark: PINE_DARK, mid: PINE_MID, light: SEASON === 'winter' ? SNOWY : PINE_LIGHT } : leafPal(variant);
  const crown = type === 'pine' ? [{ x: 0, y: 5.6, z: 0, r: 2.4 }] : [{ x: 0, y: 6.2, z: 0, r: 3.3 }];
  const g = canopy(crown, 2, pal, 90 + variant);
  if (type === 'pine') g.scale(1, 1.7, 1).translate(0, -3.2, 0);
  const stick = paint(new THREE.CylinderGeometry(0.2, 0.3, 4.4, 5, 1, true).translate(0, 2.2, 0), (_p, _n, c) => c.copy(BARK_DARK).lerp(BARK_LIGHT, 0.4));
  return merge([stick, g]);
}

export function palmTree(variant: number, simple = false): THREE.BufferGeometry {
  const rnd = mulberry32(1300 + variant * 7);
  const h = 8 + rnd() * 3.5;
  const bend = 1.6 + rnd() * 2.2;
  const g = new THREE.CylinderGeometry(0.15, 0.27, h, simple ? 5 : 8, simple ? 4 : 12, true).translate(0, h / 2, 0);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const t = v.y / h;
    const ring = 1 + 0.07 * Math.sin(t * 60);
    pos.setXYZ(i, v.x * ring * (1 + Math.max(0, 0.5 - v.y) * 0.8) + bend * t * t, v.y, v.z * ring * (1 + Math.max(0, 0.5 - v.y) * 0.8));
  }
  g.computeVertexNormals();
  const parts = [paint(g, (p, _n, c) => c.copy(PALM_BARK_A).lerp(PALM_BARK_B, 0.5 + 0.5 * Math.sin((p.y / h) * 60)))];
  // two rings of fronds: long arching ones outside, shorter upright ones in the heart
  const crown = simple
    ? frondCrown(7, (_i, r) => frond(4.6 + r() * 1.2, 1.9, 1.7, 3.4 + r() * 1.4, PALM_BASE, PALM_TIP, 4), 1400 + variant, 0.0, 0.5)
    : [
    ...frondCrown(11, (_i, r) => frond(4.4 + r() * 1.4, 1.5, 1.7, 3.4 + r() * 1.6, PALM_BASE, PALM_TIP, 11), 1400 + variant, 0.0, 0.42),
    ...frondCrown(6, (_i, r) => frond(2.8 + r() * 0.8, 1.1, 1.3, 0.9 + r() * 0.6, PALM_BASE, PALM_TIP, 8), 1500 + variant, 0.55, 1.05),
  ];
  for (const f of crown) parts.push(f.translate(bend, h - 0.05, 0));
  for (let i = 0; i < (simple ? 0 : 3); i++) {
    const a = i * 2.1 + variant;
    parts.push(paint(new THREE.SphereGeometry(0.2, 8, 6).translate(bend + Math.cos(a) * 0.25, h - 0.3, Math.sin(a) * 0.25), (_p, _n, c) => c.set(0x7a5a36)));
  }
  return merge(parts);
}

export function fern(variant: number): THREE.BufferGeometry {
  const baseC = variant % 2 ? C(0x2f9a45) : C(0x3aa63c);
  const tipC = variant % 2 ? C(0x8fd957) : C(0xa8e05a);
  return merge(frondCrown(8 + variant, (_i, r) => frond(1.1 + r() * 0.6, 0.42, 0.55, 0.5 + r() * 0.35, baseC, tipC, 6), 1700 + variant, 0.25, 0.75));
}

/** Broad glossy leaves, like the foreground plants in the concept art. */
export function tropicalPlant(): THREE.BufferGeometry {
  return merge(frondCrown(7, (_i, r) => frond(1.5 + r() * 0.7, 0.75, 0.8, 0.55 + r() * 0.3, C(0x1f8f3f), C(0x7fd14e), 7), 1900, 0.35, 0.95));
}

export function bush(variant: number): THREE.BufferGeometry {
  const rnd = mulberry32(2100 + variant * 5);
  const blobs: BlobDef[] = [{ x: 0, y: 0.55, z: 0, r: 0.85 }];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + rnd();
    blobs.push({ x: Math.cos(a) * 0.7, y: 0.35 + rnd() * 0.3, z: Math.sin(a) * 0.7, r: 0.5 + rnd() * 0.25 });
  }
  return canopy(blobs, 4, leafPal(variant + 1), 60 + variant);
}

const ROCK_DARK = C(0x6f6a64);
const ROCK_LIGHT = C(0xb3aca0);
const MOSS = C(0x6fae45);

export function rock(variant: number): THREE.BufferGeometry {
  let g: THREE.BufferGeometry = new THREE.IcosahedronGeometry(1, 3);
  g.deleteAttribute('uv');
  g.deleteAttribute('normal');
  g = mergeVertices(g, 1e-4);
  const pos = g.attributes.position;
  const s = variant * 13.7;
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    let k = 1 + 0.28 * nz.simplex(v.x * 1.1 + s, v.y * 1.1 + v.z * 0.9) + 0.1 * nz.simplex(v.x * 3.3 + s, v.z * 3.3 + v.y * 2);
    // chisel a few flat faces so it reads as stone, not dough
    k = Math.min(k, 1.02 + 0.2 * nz.simplex(v.z * 0.8 + s, v.x * 0.8));
    pos.setXYZ(i, v.x * k, Math.max(v.y * k * 0.72, -0.25), v.z * k);
  }
  g.computeVertexNormals();
  return paint(g, (p, n, c) => {
    const tone = 0.5 + 0.5 * nz.simplex(p.x * 1.5 + s, p.z * 1.5 + p.y);
    c.copy(ROCK_DARK).lerp(ROCK_LIGHT, tone * 0.6 + smoothstep(-0.2, 0.7, p.y) * 0.4);
    c.lerp(MOSS, smoothstep(0.55, 0.9, n.y + nz.simplex(p.x * 2, p.z * 2) * 0.2) * 0.55);
  });
}

// ------------------------------------------------------------------ flowers

const STEM = C(0x4a9a3a);

function stem(h: number): THREE.BufferGeometry {
  return paint(new THREE.CylinderGeometry(0.012, 0.016, h, 4, 1, true).translate(0, h / 2, 0), (_p, _n, c) => c.copy(STEM));
}

function upNormals(g: THREE.BufferGeometry, blend = 0.7): THREE.BufferGeometry {
  // Petals are lit as if facing the sky so they glow instead of going dark edge-on.
  const nor = g.attributes.normal;
  for (let i = 0; i < nor.count; i++) {
    v.fromBufferAttribute(nor, i);
    if (v.y < 0) v.negate();
    v.lerp(new THREE.Vector3(0, 1, 0), blend).normalize();
    nor.setXYZ(i, v.x, v.y, v.z);
  }
  return g;
}

/** White petals are left pure so the per-instance colour can tint them. */
export function daisy(): THREE.BufferGeometry {
  const h = 0.34;
  const parts = [stem(h)];
  const petals = 9;
  for (let i = 0; i < petals; i++) {
    const g = new THREE.CircleGeometry(0.05, 6).scale(1, 2.1, 1).translate(0, 0.115, 0).rotateX(-Math.PI / 2 + 0.28).rotateY((i / petals) * Math.PI * 2);
    parts.push(paint(upNormals(g), (_p, _n, c) => c.setRGB(1, 1, 1)));
  }
  parts.push(paint(upNormals(new THREE.SphereGeometry(0.05, 8, 5).scale(1, 0.6, 1), 0.4), (_p, _n, c) => c.set(0xffc928)));
  const head = merge(parts.slice(1)).translate(0, h, 0).rotateZ(0.18);
  return merge([parts[0], head]);
}

export function hibiscus(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const petals = 5;
  for (let i = 0; i < petals; i++) {
    const g = new THREE.CircleGeometry(0.17, 8).scale(0.9, 1.25, 1).translate(0, 0.2, 0);
    const pos = g.attributes.position;
    for (let k = 0; k < pos.count; k++) {
      v.fromBufferAttribute(pos, k);
      pos.setZ(k, v.y * v.y * 1.1 + Math.abs(v.x) * 0.35); // cupped and gently ruffled
    }
    g.computeVertexNormals();
    g.rotateX(-Math.PI / 2 + 0.55).rotateY((i / petals) * Math.PI * 2);
    parts.push(paint(upNormals(g, 0.55), (p, _n, c) => c.setRGB(1, 1, 1).multiplyScalar(lerp(0.62, 1, smoothstep(0.02, 0.2, Math.hypot(p.x, p.z))))));
  }
  parts.push(paint(new THREE.CylinderGeometry(0.012, 0.02, 0.26, 5).translate(0, 0.2, 0), (p, _n, c) => c.set(p.y > 0.26 ? 0xffe14a : 0xffb0a0)));
  const head = merge(parts).translate(0, 0.3, 0).rotateZ(0.3);
  const leaves = frondCrown(4, () => frond(0.42, 0.24, 0.16, 0.12, C(0x1f8a3a), C(0x5cc04a), 4), 2500, 0.2, 0.6);
  return merge([stem(0.32), head, ...leaves]);
}

export function lupine(): THREE.BufferGeometry {
  const parts = [stem(0.3)];
  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    const r = lerp(0.07, 0.03, t);
    const g = new THREE.SphereGeometry(r, 6, 5).scale(1, 0.85, 1).translate(Math.sin(i * 2.4) * 0.018, 0.3 + i * 0.062, Math.cos(i * 2.4) * 0.018);
    parts.push(paint(g, (_p, n, c) => c.setRGB(1, 1, 1).multiplyScalar(lerp(0.78, 1.05, t) * (0.85 + 0.15 * n.y))));
  }
  return merge(parts);
}

export function lilyPad(): THREE.BufferGeometry {
  const g = new THREE.CircleGeometry(0.55, 18, 0.25, Math.PI * 2 - 0.5).rotateX(-Math.PI / 2);
  const pad = paint(g, (p, _n, c) => c.set(0x3fa54a).lerp(C(0x7fd05a), smoothstep(0.1, 0.55, Math.hypot(p.x, p.z))));
  return pad;
}

export function lotus(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let ring = 0; ring < 2; ring++) {
    const petals = ring ? 5 : 8;
    for (let i = 0; i < petals; i++) {
      const g = new THREE.CircleGeometry(0.1, 6).scale(0.75, 1.7, 1).translate(0, 0.16, 0).rotateX(-Math.PI / 2 + (ring ? 1.0 : 0.5)).rotateY((i / petals) * Math.PI * 2 + ring * 0.4);
      parts.push(paint(upNormals(g, 0.5), (p, _n, c) => c.set(0xffffff).lerp(C(0xff8fc0), smoothstep(0.05, 0.3, Math.hypot(p.x, p.z)) * 0.8)));
    }
  }
  parts.push(paint(new THREE.SphereGeometry(0.05, 6, 5).translate(0, 0.05, 0), (_p, _n, c) => c.set(0xffd23c)));
  return merge(parts);
}
