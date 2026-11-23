import * as THREE from 'three';
import { paintify } from './shared';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * The shared asset library: one set of physically based materials and modelled
 * pieces (fruit, leaves, flowers, pots, baskets, tools) used wherever such a
 * thing appears, so a strawberry in the patch, in a basket or on a wild bush
 * is always the same carefully made strawberry.
 */

const cache = new Map<string, unknown>();
function once<T>(key: string, make: () => T): T {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key) as T;
}
const rnd = (i: number): number => {
  const v = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};

/** A small painted texture, drawn once. */
function paint(key: string, size: number, draw: (ctx: CanvasRenderingContext2D, s: number) => void, srgb = true): THREE.CanvasTexture {
  return once(`tex:${key}`, () => {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    draw(c.getContext('2d')!, size);
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
    return t;
  });
}

const std = (key: string, params: THREE.MeshStandardMaterialParameters): THREE.MeshStandardMaterial => once(`mat:${key}`, () => new THREE.MeshStandardMaterial({ metalness: 0, roughness: 0.8, ...params }));

// ---------------------------------------------------------------- materials

const speckle = (): THREE.CanvasTexture =>
  paint('speckle', 128, (ctx, s) => {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 900; i++) {
      const v = 96 + Math.floor(rnd(i) * 80);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(rnd(i + 1000) * s, rnd(i + 2000) * s, 1 + rnd(i + 3000) * 3, 1 + rnd(i + 4000) * 3);
    }
  }, false);

/** Dimples in rows, for the seeds of a berry. */
const seeds = (): THREE.CanvasTexture =>
  paint('seeds', 128, (ctx, s) => {
    ctx.fillStyle = '#b0b0b0';
    ctx.fillRect(0, 0, s, s);
    for (let j = 0; j < 9; j++) for (let i = 0; i < 9; i++) {
      const x = ((i + (j % 2) * 0.5) / 9) * s;
      const y = ((j + 0.5) / 9) * s;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 6);
      g.addColorStop(0, '#303030');
      g.addColorStop(1, 'rgba(176,176,176,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - 7, y - 7, 14, 14);
    }
  }, false);

const weave = (): THREE.CanvasTexture =>
  paint('weave', 128, (ctx, s) => {
    ctx.fillStyle = '#c9a060';
    ctx.fillRect(0, 0, s, s);
    for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) {
      const over = (i + j) % 2 === 0;
      ctx.fillStyle = over ? '#e2bd7c' : '#a87c44';
      ctx.fillRect(i * 16 + 1, j * 16 + (over ? 2 : 5), 14, over ? 12 : 6);
    }
  });

const veins = (): THREE.CanvasTexture =>
  paint('veins', 128, (ctx, s) => {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = 'rgba(40,90,30,0.45)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(s / 2, 0);
    ctx.lineTo(s / 2, s);
    ctx.stroke();
    ctx.lineWidth = 1.5;
    for (let k = 1; k < 7; k++) {
      const y = (k / 7) * s;
      ctx.beginPath();
      ctx.moveTo(s / 2, y);
      ctx.quadraticCurveTo(s * 0.72, y - 10, s * 0.96, y - 22);
      ctx.moveTo(s / 2, y);
      ctx.quadraticCurveTo(s * 0.28, y - 10, s * 0.04, y - 22);
      ctx.stroke();
    }
  });

const painted = new Set<string>();
/** Shared materials are made once: paint each only the first time it is asked for. */
function paintOnce<T extends THREE.Material>(key: string, m: T, tex: string, scale: number): T {
  if (!painted.has(key)) {
    painted.add(key);
    paintify(m, tex, scale, 0.85);
  }
  return m;
}

export const MAT = {
  /** leaves: matt, softly veined, lit from both sides */
  leaf: (dark = false): THREE.MeshStandardMaterial => std(`leaf${dark}`, { color: dark ? 0x4f9a48 : 0x6dbb55, map: veins(), roughness: 0.72, side: THREE.DoubleSide, vertexColors: true }),
  stem: (): THREE.MeshStandardMaterial => std('stem', { color: 0x5a9a44, roughness: 0.8 }),
  soil: (): THREE.MeshStandardMaterial => paintOnce('soil', std('soil', { color: 0x5f3f2c, roughness: 1, bumpMap: speckle(), bumpScale: 4 }), 'soil', 0.9),
  stone: (): THREE.MeshStandardMaterial => paintOnce('stone', std('stone', { color: 0xbdb6ae, roughness: 0.78, bumpMap: speckle(), bumpScale: 1.5 }), 'rock', 0.7),
  terracotta: (): THREE.MeshStandardMaterial => paintOnce('terracotta', std('terracotta', { color: 0xc8703f, roughness: 0.85, bumpMap: speckle(), bumpScale: 0.8 }), 'brush', 3),
  brass: (): THREE.MeshStandardMaterial => std('brass', { color: 0xe2b34a, roughness: 0.38, metalness: 0.55 }),
  wicker: (): THREE.MeshStandardMaterial => std('wicker', { color: 0xffffff, map: weave(), bumpMap: weave(), bumpScale: 2.5, roughness: 0.9, side: THREE.DoubleSide }),
  petal: (color: number): THREE.MeshStandardMaterial => paintOnce(`petal${color}`, std(`petal${color}`, { color, roughness: 0.6, side: THREE.DoubleSide }), 'brush', 5),
  /** fruit skins carry their colour per vertex (a gradient from stalk to tip) and glow faintly from within */
  berry: (): THREE.MeshStandardMaterial => std('berry', { color: 0xffffff, vertexColors: true, roughness: 0.42, bumpMap: seeds(), bumpScale: 2.2, emissive: 0xff5a8a, emissiveIntensity: 0.12 }),
  melon: (): THREE.MeshStandardMaterial => std('melon', { color: 0xffffff, vertexColors: true, roughness: 0.5, bumpMap: speckle(), bumpScale: 0.7, emissive: 0x7fdfff, emissiveIntensity: 0.14 }),
  pod: (): THREE.MeshStandardMaterial => std('pod', { color: 0xffffff, vertexColors: true, roughness: 0.48, bumpMap: speckle(), bumpScale: 0.5, emissive: 0xffb030, emissiveIntensity: 0.14 }),
};
/** The three fruit skins, for making them glow after dark. */
export const fruitSkins = (): THREE.MeshStandardMaterial[] => [MAT.berry(), MAT.melon(), MAT.pod()];

// ----------------------------------------------------------------- geometry

/** Paint a gradient into a geometry's vertex colours from a function of each vertex. */
function tint(geo: THREE.BufferGeometry, at: (x: number, y: number, z: number, out: THREE.Color) => void): THREE.BufferGeometry {
  const p = geo.attributes.position;
  const col = new Float32Array(p.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    at(p.getX(i), p.getY(i), p.getZ(i), c);
    col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

/**
 * One leaf: pointed, widest below the middle, cupped across and arched along
 * its length, with a crease down the midrib. Its stalk end is at the origin
 * and it grows along +z, face up.
 */
export function leafGeo(): THREE.BufferGeometry {
  return once('geo:leaf', () => {
    const g = new THREE.PlaneGeometry(1, 1, 6, 8);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const u = p.getX(i); // -0.5..0.5 across
      const v = p.getY(i) + 0.5; // 0..1 along
      const width = Math.pow(Math.sin(Math.PI * Math.pow(v, 0.72)), 0.85) * 0.5;
      const x = u * 2 * width;
      const y = -Math.pow(v, 1.6) * 0.22 + Math.abs(u) * 0.2 * width * 2 + Math.sin(v * 9) * 0.008;
      p.setXYZ(i, x, y, v);
    }
    g.computeVertexNormals();
    // lighter toward the tip and edges, deeper along the midrib
    return tint(g, (x, _y, z, c) => c.setRGB(0.78 + z * 0.22, 0.86 + z * 0.14, 0.74 + Math.abs(x) * 0.3));
  });
}

/** A strawberry-shaped starberry: fat shoulders tapering to a soft point, seeded, deep red at the tip and rosy at the top. */
function berryGeo(): THREE.BufferGeometry {
  return once('geo:berry', () => {
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16; // tip -> shoulder
      const r = Math.pow(Math.sin(t * Math.PI * 0.5), 0.75) * (1 - Math.pow(t, 6) * 0.45);
      pts.push(new THREE.Vector2(Math.max(0.001, r * 0.5), t * 1.05 - 0.55));
    }
    pts.push(new THREE.Vector2(0.001, 0.5));
    const g = new THREE.LatheGeometry(pts, 20);
    g.computeVertexNormals();
    return tint(g, (_x, y, _z, c) => c.setRGB(0.98, 0.16 + (y + 0.55) * 0.3, 0.32 + (y + 0.55) * 0.28));
  });
}

/** A moon melon: slightly flattened, softly ribbed, pale aqua with deeper stripes. */
function melonGeo(): THREE.BufferGeometry {
  return once('geo:melon', () => {
    const g = new THREE.SphereGeometry(1, 40, 28);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      const z = p.getZ(i);
      const a = Math.atan2(z, x);
      const k = 1 + Math.cos(a * 10) * 0.018 * (1 - y * y);
      p.setXYZ(i, x * k, y * 0.9, z * k);
    }
    g.computeVertexNormals();
    return tint(g, (x, y, z, c) => {
      const stripe = Math.pow(Math.cos(Math.atan2(z, x) * 10) * 0.5 + 0.5, 2.2);
      c.setRGB(0.5 + stripe * 0.32 - (1 - y) * 0.05, 0.84 + stripe * 0.12, 0.93 + stripe * 0.06);
    });
  });
}

/** A sun pod: a small pumpkin-like fruit in deep lobes, gold at the shoulders and amber in the creases. */
function podGeo(): THREE.BufferGeometry {
  return once('geo:pod', () => {
    const g = new THREE.SphereGeometry(1, 40, 28);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      const z = p.getZ(i);
      const a = Math.atan2(z, x);
      const lobe = 1 - Math.pow(Math.abs(Math.sin(a * 4)), 0.7) * 0.13 * (1 - y * y * 0.6);
      const dent = 1 - Math.max(0, y - 0.55) * 0.35;
      p.setXYZ(i, x * lobe, y * 0.86 * dent, z * lobe);
    }
    g.computeVertexNormals();
    return tint(g, (x, y, z, c) => {
      const crease = Math.pow(Math.abs(Math.sin(Math.atan2(z, x) * 4)), 0.7);
      c.setRGB(1.0, 0.56 + (1 - crease) * 0.22 + y * 0.06, 0.12 + (1 - crease) * 0.12);
    });
  });
}

/** One fruit, about `size` across, hanging from the origin (its stalk points up). */
export function fruit(kind: number, size: number): THREE.Group {
  const g = new THREE.Group();
  const skins = fruitSkins();
  const body = new THREE.Mesh([berryGeo(), melonGeo(), podGeo()][kind], skins[kind]);
  body.castShadow = true;
  const leaf = leafGeo();
  if (kind === 0) {
    body.scale.setScalar(size);
    body.position.y = -size * 0.5;
    // a star of small leaves over the shoulders, welded into one piece
    const star = new THREE.Mesh(
      once('geo:calyx', () => {
        const parts: THREE.BufferGeometry[] = [];
        for (let i = 0; i < 6; i++) parts.push(leaf.clone().scale(0.5, 0.5, 0.55).applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(0.5, (i / 6) * Math.PI * 2, 0, 'YXZ'))));
        return mergeGeometries(parts)!;
      }),
      MAT.leaf(true),
    );
    star.scale.setScalar(size);
    star.position.y = -size * 0.02;
    g.add(star);
  } else if (kind === 1) {
    body.scale.setScalar(size * 0.5);
    body.position.y = -size * 0.45;
  } else {
    body.scale.set(size * 0.5, size * 0.62, size * 0.5);
    body.position.y = -size * 0.55;
  }
  const stalk = new THREE.Mesh(new THREE.CylinderGeometry(size * 0.035, size * 0.05, size * 0.3, 8), MAT.stem());
  stalk.position.y = size * 0.1;
  stalk.rotation.z = 0.25;
  g.add(body, stalk);
  return g;
}

/**
 * A mound of real leaves: `count` of them fanned over a dome of the given
 * radius, each one its own angle, size and shade. One draw call.
 */
export function leafMound(count: number, radius: number, seed: number, leafSize = 0.34, flat = 0.75): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(leafGeo(), MAT.leaf(), count);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const a = i * 2.39996 + rnd(seed + i) * 0.6;
    const t = Math.sqrt((i + 0.5) / count); // 0 centre/top .. 1 rim
    const tiltDown = 0.15 + t * 1.15 * flat;
    e.set(tiltDown - 0.9, a, (rnd(seed + i * 3) - 0.5) * 0.5, 'YXZ');
    q.setFromEuler(e);
    const s = leafSize * (0.75 + rnd(seed + i * 7) * 0.5);
    const r = radius * t * 0.55;
    m.compose(new THREE.Vector3(Math.sin(a) * r, radius * (1 - t * t) * 0.62, Math.cos(a) * r), q, new THREE.Vector3(s * 0.8, s, s));
    mesh.setMatrixAt(i, m);
    const shade = 0.72 + rnd(seed + i * 11) * 0.4;
    mesh.setColorAt(i, c.setRGB(shade * 0.92, shade, shade * 0.86));
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.computeBoundingSphere();
  return mesh;
}

/** A small five-petalled flower, about `size` across, facing up. */
export function blossom(color: number, size: number): THREE.Group {
  const g = new THREE.Group();
  const petal = once('geo:petal', () => new THREE.SphereGeometry(1, 10, 8).scale(0.3, 0.07, 0.5).translate(0, 0, 0.5));
  for (let i = 0; i < 5; i++) {
    const p = new THREE.Mesh(petal, MAT.petal(color));
    p.scale.setScalar(size * 0.5);
    p.rotation.set(-0.25, (i / 5) * Math.PI * 2, 0, 'YXZ');
    g.add(p);
  }
  const eye = new THREE.Mesh(once('geo:eye', () => new THREE.SphereGeometry(1, 10, 8)), std('eye', { color: 0xffd65a, roughness: 0.6 }));
  eye.scale.setScalar(size * 0.13);
  eye.position.y = size * 0.03;
  g.add(eye);
  return g;
}

/** A fruiting bush or plant of one kind, with its ripe fruit gathered in `fruits` so it can be picked and regrown. */
export function fruitPlant(kind: number, seed: number, scale = 1): { group: THREE.Group; fruits: THREE.Group } {
  const group = new THREE.Group();
  const fruits = new THREE.Group();
  fruits.userData.live = true; // picked, regrown, never welded into the scenery
  if (kind === 0) {
    // starberries: a low mound of leaves, berries hanging round its skirt, white flowers on top
    group.add(leafMound(30, 0.46, seed, 0.3, 0.9));
    for (let i = 0; i < 6; i++) {
      const a = i * 1.05 + seed;
      const f = fruit(0, 0.17 + rnd(seed + i) * 0.04);
      f.position.set(Math.cos(a) * 0.36, 0.2 + rnd(seed + i * 5) * 0.08, Math.sin(a) * 0.36);
      f.rotation.z = Math.cos(a) * 0.35;
      f.rotation.x = -Math.sin(a) * 0.35;
      fruits.add(f);
    }
    for (let i = 0; i < 3; i++) {
      const b = blossom(0xffffff, 0.13);
      b.position.set(Math.cos(i * 2.2 + seed) * 0.18, 0.36, Math.sin(i * 2.2 + seed) * 0.18);
      group.add(b);
    }
  } else if (kind === 1) {
    // moon melons: one great pale fruit nested in broad sprawling leaves
    group.add(leafMound(12, 0.62, seed, 0.5, 1.15));
    const f = fruit(1, 0.5);
    f.position.set(0.05, 0.47, 0);
    fruits.add(f);
  } else {
    // sun pods: a leafy vine up a stake, the pods hanging from it
    const stake = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 1.5, 8), std('stake', { color: 0x9c6a3a, roughness: 0.85 }));
    stake.position.y = 0.75;
    stake.castShadow = true;
    group.add(stake);
    for (let k = 0; k < 4; k++) {
      const tuft = leafMound(7, 0.26, seed + k * 13, 0.26, 1.0);
      tuft.position.set(Math.cos(k * 1.9) * 0.07, 0.25 + k * 0.33, Math.sin(k * 1.9) * 0.07);
      group.add(tuft);
    }
    for (let i = 0; i < 3; i++) {
      const a = i * 2.2 + seed;
      const f = fruit(2, 0.2);
      f.position.set(Math.cos(a) * 0.2, 0.62 + i * 0.3, Math.sin(a) * 0.2);
      fruits.add(f);
    }
  }
  group.add(fruits);
  group.scale.setScalar(scale);
  return { group, fruits };
}

/** A woven basket with a hoop handle, heaped with one of each fruit. */
export function basket(): THREE.Group {
  const g = new THREE.Group();
  const pts = [[0.2, 0], [0.27, 0.02], [0.33, 0.16], [0.36, 0.3], [0.35, 0.32], [0.31, 0.16], [0.25, 0.04], [0.001, 0.04]].map(([x, y]) => new THREE.Vector2(x, y));
  const bowl = new THREE.Mesh(new THREE.LatheGeometry(pts, 28), MAT.wicker());
  bowl.castShadow = true;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.355, 0.028, 8, 28), MAT.wicker());
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.31;
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.022, 8, 24, Math.PI), MAT.wicker());
  handle.position.y = 0.31;
  g.add(bowl, rim, handle);
  [[0, -0.1, 0.08, 0.17], [1, 0.12, -0.04, 0.22], [2, -0.02, -0.13, 0.17], [0, 0.14, 0.14, 0.15], [0, -0.17, -0.05, 0.15]].forEach(([k, x, z, s]) => {
    const f = fruit(k, s);
    f.position.set(x, 0.36 + (k === 1 ? 0.06 : 0), z);
    f.rotation.set(0.4 * x * 6, 0, -0.4 * z * 6);
    g.add(f);
  });
  return g;
}

/** A brass watering can: rounded body, long spout with a rose, a loop handle. */
export function wateringCan(): THREE.Group {
  const g = new THREE.Group();
  const brass = MAT.brass();
  const pts = [[0.001, 0], [0.17, 0], [0.2, 0.03], [0.21, 0.2], [0.19, 0.33], [0.15, 0.37], [0.13, 0.37]].map(([x, y]) => new THREE.Vector2(x, y));
  const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 28), brass);
  body.castShadow = true;
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.045, 0.5, 12), brass);
  spout.position.set(0.36, 0.26, 0);
  spout.rotation.z = -0.95;
  const rose = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.03, 0.07, 14), brass);
  rose.position.set(0.58, 0.41, 0);
  rose.rotation.z = -0.95;
  const grip = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.022, 8, 20, Math.PI * 1.15), brass);
  grip.position.set(-0.2, 0.2, 0);
  grip.rotation.z = Math.PI / 2 + 0.25;
  const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.018, 8, 20, Math.PI), brass);
  hoop.position.y = 0.37;
  g.add(body, spout, rose, grip, hoop);
  return g;
}

/** A terracotta pot with a rolled rim, a mound of leaves and a few flowers. */
export function flowerPot(color: number, seed: number): THREE.Group {
  const g = new THREE.Group();
  const pts = [[0.001, 0], [0.13, 0], [0.19, 0.24], [0.215, 0.25], [0.215, 0.3], [0.17, 0.3], [0.17, 0.26], [0.001, 0.26]].map(([x, y]) => new THREE.Vector2(x, y));
  const pot = new THREE.Mesh(new THREE.LatheGeometry(pts, 24), MAT.terracotta());
  pot.castShadow = true;
  g.add(pot);
  const leaves = leafMound(12, 0.22, seed, 0.2, 0.9);
  leaves.position.y = 0.27;
  g.add(leaves);
  for (let i = 0; i < 4; i++) {
    const b = blossom(color, 0.13);
    b.position.set(Math.cos(i * 1.7 + seed) * 0.1, 0.44 + rnd(seed + i) * 0.05, Math.sin(i * 1.7 + seed) * 0.1);
    b.rotation.set((rnd(seed + i * 2) - 0.5) * 0.6, 0, (rnd(seed + i * 3) - 0.5) * 0.6);
    g.add(b);
  }
  return g;
}

/** A smooth, slightly irregular stone. */
export function stone(size: number, seed: number): THREE.Mesh {
  const geo = once(`geo:stone${seed % 3}`, () => {
    const g = new THREE.SphereGeometry(1, 22, 16);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      const z = p.getZ(i);
      const k = 1 + Math.sin(x * 2.3 + (seed % 3) * 2) * 0.07 + Math.sin(z * 3.1 + y * 2) * 0.05;
      p.setXYZ(i, x * k, y * 0.6 * k, z * 0.85 * k);
    }
    g.computeVertexNormals();
    return g;
  });
  const m = new THREE.Mesh(geo, MAT.stone());
  m.scale.setScalar(size);
  m.castShadow = m.receiveShadow = true;
  return m;
}
