import * as THREE from 'three';

/**
 * The things you find and merge. Four collections, four steps each; three of
 * one step make one of the next. An item's code is `chain * 4 + tier`.
 */
export interface Chain {
  id: string;
  name: string;
  /** singular names of the four steps */
  steps: [string, string, string, string];
  /** soft colour of the collection, for the board */
  tint: string;
}

export const CHAINS: Chain[] = [
  { id: 'ocean', name: 'Ocean', steps: ['Seashell', 'Pearl', 'Ocean Crystal', 'Ocean Heart'], tint: '#8fdcff' },
  { id: 'garden', name: 'Garden', steps: ['Flower Seed', 'Flower', 'Magical Plant', 'Blossom Tree'], tint: '#ffb3d9' },
  { id: 'forest', name: 'Forest', steps: ['Acorn', 'Sapling', 'Tree', 'Enchanted Tree'], tint: '#a8e58f' },
  { id: 'cosy', name: 'Cosy', steps: ['Wood', 'Lantern', 'Campfire', 'Cosy Campsite'], tint: '#ffd08a' },
];
export const COSY = 3;
export const ITEM_COUNT = CHAINS.length * 4;
export const itemName = (code: number): string => CHAINS[code >> 2].steps[code & 3];
/** "three Seashells", but "three Wood" */
export const itemPlural = (code: number): string => (itemName(code) === 'Wood' ? 'Wood' : `${itemName(code)}s`);

const std = (color: number, roughness = 0.6, extra: THREE.MeshStandardMaterialParameters = {}): THREE.MeshStandardMaterial =>
  new THREE.MeshStandardMaterial({ color, roughness, ...extra });
const glowing = (color: number, emissive: number, intensity = 1.2, roughness = 0.35): THREE.MeshStandardMaterial =>
  new THREE.MeshStandardMaterial({ color, roughness, emissive, emissiveIntensity: intensity });
const lit = (color: number): THREE.MeshBasicMaterial => new THREE.MeshBasicMaterial({ color, fog: false });

function put(parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  parent.add(m);
  return m;
}
const ball = (r: number, w = 20, h = 14): THREE.SphereGeometry => new THREE.SphereGeometry(r, w, h);

/** A ribbed scallop fan, hinge at the origin, opening upward. */
function scallop(radius: number, top: number, hinge: number): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(1, 1, 44, 14);
  const pos = geo.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const a = new THREE.Color(top);
  const b = new THREE.Color(hinge);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) * 2; // -1..1 across the fan
    const v = pos.getY(i) + 0.5; // 0 at the hinge, 1 at the lip
    const ang = u * 0.98;
    const rib = Math.cos(u * 9 * Math.PI) * 0.5 + 0.5;
    const r = radius * v * (1 + 0.035 * rib * v);
    const dome = Math.sin(Math.min(1, v * 1.05) * Math.PI * 0.62) * radius * 0.3 * (1 - 0.35 * u * u);
    pos.setXYZ(i, Math.sin(ang) * r, Math.cos(ang) * r, dome + rib * 0.035 * radius * v);
    c.copy(b).lerp(a, Math.pow(v, 0.8)).offsetHSL(0, 0, (rib - 0.5) * 0.07);
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.38, side: THREE.DoubleSide }));
  m.castShadow = true;
  return m;
}

function crystal(parent: THREE.Object3D, mat: THREE.Material, h: number, r: number, x: number, z: number, tilt: number, turn: number): void {
  const g = new THREE.Group();
  put(g, new THREE.CylinderGeometry(r, r * 0.8, h * 0.62, 6), mat, 0, h * 0.31, 0);
  put(g, new THREE.ConeGeometry(r, h * 0.38, 6), mat, 0, h * 0.81, 0);
  g.position.set(x, 0, z);
  g.rotation.set(Math.sin(turn) * tilt, turn, Math.cos(turn) * tilt);
  parent.add(g);
}

function petals(parent: THREE.Object3D, mat: THREE.Material, heart: THREE.Material, size: number, x: number, y: number, z: number, n = 5): THREE.Group {
  const g = new THREE.Group();
  const geo = ball(size * 0.5, 14, 10).scale(0.62, 1, 0.3);
  for (let i = 0; i < n; i++) {
    const p = new THREE.Mesh(geo, mat);
    const a = (i / n) * Math.PI * 2;
    p.position.set(Math.sin(a) * size * 0.42, Math.cos(a) * size * 0.42, 0);
    p.rotation.z = -a;
    p.castShadow = true;
    g.add(p);
  }
  put(g, ball(size * 0.24, 12, 10).scale(1, 1, 0.7), heart, 0, 0, size * 0.1);
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

function leafOn(parent: THREE.Object3D, mat: THREE.Material, len: number, x: number, y: number, z: number, turn: number, lift: number): void {
  const m = put(parent, ball(len * 0.5, 12, 8).scale(0.45, 0.16, 1), mat, x, y, z);
  m.rotation.set(-lift, turn, 0);
  m.translateZ(len * 0.5);
}

function blobs(parent: THREE.Object3D, mats: THREE.Material[], spots: [number, number, number, number][]): void {
  spots.forEach(([x, y, z, r], i) => put(parent, new THREE.IcosahedronGeometry(r, 2), mats[i % mats.length], x, y, z));
}

function logPile(parent: THREE.Object3D, len: number, r: number): void {
  const bark = std(0x8a5a36, 0.9);
  const cut = std(0xe9c48d, 0.8);
  const log = (x: number, y: number, turn: number): void => {
    const g = new THREE.Group();
    const side = put(g, new THREE.CylinderGeometry(r, r, len, 12, 1, true), bark);
    side.rotation.x = Math.PI / 2;
    for (const s of [-1, 1]) {
      const cap = put(g, new THREE.CircleGeometry(r, 12), cut, 0, 0, (s * len) / 2);
      if (s < 0) cap.rotation.y = Math.PI;
      const ring = put(g, new THREE.RingGeometry(r * 0.35, r * 0.48, 12), bark, 0, 0, s * (len / 2 + 0.002));
      if (s < 0) ring.rotation.y = Math.PI;
    }
    g.position.set(x, y, 0);
    g.rotation.y = turn;
    parent.add(g);
  };
  log(-r * 1.02, r, 0.1);
  log(r * 1.02, r, -0.12);
  log(0, r * 2.72, 0.04);
}

export function lantern(scale = 1): THREE.Group {
  const g = new THREE.Group();
  const frame = std(0x6b4a2e, 0.55, { metalness: 0.2 });
  const gold = std(0xf2c14e, 0.35, { metalness: 0.5 });
  put(g, new THREE.CylinderGeometry(0.2, 0.23, 0.07, 8), frame, 0, 0.035, 0);
  put(g, new THREE.CylinderGeometry(0.17, 0.17, 0.4, 8), glowing(0xffe2a0, 0xffb347, 1.6), 0, 0.27, 0);
  put(g, ball(0.09, 10, 8), lit(0xfff3c4), 0, 0.26, 0);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    put(g, new THREE.BoxGeometry(0.03, 0.42, 0.03), frame, Math.sin(a) * 0.175, 0.27, Math.cos(a) * 0.175);
  }
  put(g, new THREE.ConeGeometry(0.25, 0.16, 8), frame, 0, 0.55, 0);
  put(g, ball(0.04, 8, 6), gold, 0, 0.64, 0);
  const handle = put(g, new THREE.TorusGeometry(0.13, 0.014, 6, 16, Math.PI), gold, 0, 0.64, 0);
  handle.rotation.y = 0.4;
  g.scale.setScalar(scale);
  return g;
}

/** The flames of a fire, as a group of soft cones the caller may flicker. */
export function flames(size: number): THREE.Group {
  const g = new THREE.Group();
  const mats = [lit(0xff8a2a), lit(0xffb53d), lit(0xffe58a)];
  [[0, 0, 1, 0], [0.34, 0.1, 0.62, 1], [-0.3, -0.12, 0.7, 1], [0.05, 0.3, 0.52, 2], [-0.08, -0.05, 0.6, 2]].forEach(([x, z, h, m]) => {
    const f = new THREE.Mesh(new THREE.ConeGeometry(size * 0.22 * (0.6 + h * 0.5), size * h, 7), mats[m]);
    f.position.set(x * size * 0.5, (size * h) / 2, z * size * 0.5);
    g.add(f);
  });
  return g;
}

export function campfire(size = 1): THREE.Group {
  const g = new THREE.Group();
  const rock = std(0x9b9a98, 0.95);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const s = put(g, new THREE.DodecahedronGeometry(0.11 + (i % 3) * 0.015, 0), rock, Math.sin(a) * 0.42, 0.07, Math.cos(a) * 0.42);
    s.rotation.set(i, i * 2, i * 3);
    s.scale.y = 0.75;
  }
  const bark = std(0x74492c, 0.9);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.3;
    const l = put(g, new THREE.CylinderGeometry(0.05, 0.06, 0.5, 8), bark, Math.sin(a) * 0.12, 0.17, Math.cos(a) * 0.12);
    l.rotation.set(Math.cos(a) * 0.95, 0, -Math.sin(a) * 0.95);
  }
  put(g, new THREE.CylinderGeometry(0.2, 0.26, 0.05, 10), glowing(0x4a2a1a, 0xff5a1a, 1.4, 0.9), 0, 0.05, 0);
  const f = flames(0.5);
  f.position.y = 0.1;
  f.name = 'flames';
  g.add(f);
  g.scale.setScalar(size);
  return g;
}

/** A canvas A-frame tent, open to +z, sitting on y = 0. */
export function tent(w: number, h: number, d: number, detail: boolean): THREE.Group {
  const g = new THREE.Group();
  const cloth = std(0xf6e7c8, 0.85, { side: THREE.DoubleSide });
  const trim = std(0xe9b872, 0.8, { side: THREE.DoubleSide });
  const pole = std(0x8a5a36, 0.85);
  const slope = Math.hypot(w / 2, h);
  const lean = Math.atan2(w / 2, h);
  for (const s of [-1, 1]) {
    const side = put(g, new THREE.PlaneGeometry(d, slope, 6, 1), cloth, (s * w) / 4, h / 2, 0);
    side.rotation.set(0, (s * Math.PI) / 2, 0);
    side.rotateX(-lean);
    side.receiveShadow = true;
    // a trim along the ground
    const hem = put(g, new THREE.PlaneGeometry(d, slope * 0.09), trim, s * (w / 2 - 0.045 * w * 0.5) * 1.004, slope * 0.045 * Math.cos(lean), 0);
    hem.rotation.set(0, (s * Math.PI) / 2, 0);
    hem.rotateX(-lean);
    hem.translateZ(0.01);
  }
  const tri = new THREE.Shape();
  tri.moveTo(-w / 2, 0);
  tri.lineTo(w / 2, 0);
  tri.lineTo(0, h);
  tri.closePath();
  put(g, new THREE.ShapeGeometry(tri), cloth, 0, 0, -d / 2);
  // the door flaps, tied back
  for (const s of [-1, 1]) {
    const flap = new THREE.Shape();
    flap.moveTo(s * (w / 2), 0);
    flap.lineTo(s * (w * 0.3), 0);
    flap.quadraticCurveTo(s * (w * 0.2), h * 0.45, 0, h);
    flap.closePath();
    put(g, new THREE.ShapeGeometry(flap), cloth, 0, 0, d / 2);
  }
  // crossed poles at each end, poking out above the ridge
  const pl = slope * 1.18;
  for (const z of [d / 2 + 0.02, -d / 2 - 0.02]) {
    for (const s of [-1, 1]) {
      const p = put(g, new THREE.CylinderGeometry(w * 0.014, w * 0.018, pl, 8), pole, (s * w) / 4 - s * Math.sin(lean) * (pl - slope) * 0.5, (pl * Math.cos(lean)) / 2, z);
      p.rotation.z = s * lean;
    }
  }
  if (detail) {
    const ridge = put(g, new THREE.CylinderGeometry(w * 0.012, w * 0.012, d + 0.1, 8), pole, 0, h, 0);
    ridge.rotation.x = Math.PI / 2;
  }
  return g;
}

/** Build the model for an item. It stands on y = 0 and is roughly one unit tall. */
export function buildItem(code: number): THREE.Group {
  const g = new THREE.Group();
  const leaf = std(0x5fbf4a, 0.6);
  const leafDark = std(0x3f9a45, 0.65);
  const stem = std(0x4f9f3f, 0.7);
  const wood = std(0x8a5a36, 0.9);
  switch (code) {
    case 0: {
      // seashell
      const s = scallop(0.6, 0xffb8a8, 0xfff0e2);
      s.rotation.x = -0.22;
      s.position.y = 0.08;
      g.add(s);
      put(g, new THREE.BoxGeometry(0.3, 0.09, 0.12), std(0xffe2d0, 0.4), 0, 0.07, -0.02);
      break;
    }
    case 1: {
      // a pearl in an open shell
      const lower = scallop(0.58, 0xffb0bf, 0xffe9e0);
      lower.rotation.x = -1.32;
      lower.position.y = 0.06;
      g.add(lower);
      const upper = scallop(0.58, 0xff9fb4, 0xffe2dc);
      upper.rotation.x = -0.12;
      upper.position.set(0, 0.07, -0.05);
      g.add(upper);
      put(g, ball(0.19, 28, 20), new THREE.MeshPhysicalMaterial({ color: 0xfffaf4, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.1, emissive: 0xffd9e6, emissiveIntensity: 0.35 }), 0, 0.3, 0.28);
      break;
    }
    case 2: {
      // ocean crystal
      const mat = new THREE.MeshPhysicalMaterial({ color: 0x7fe4ff, roughness: 0.12, clearcoat: 1, emissive: 0x2aa6e8, emissiveIntensity: 0.75, flatShading: true });
      const pale = new THREE.MeshPhysicalMaterial({ color: 0xc9f6ff, roughness: 0.12, clearcoat: 1, emissive: 0x58c8ff, emissiveIntensity: 0.6, flatShading: true });
      crystal(g, mat, 0.95, 0.17, 0, 0, 0.05, 0.3);
      crystal(g, pale, 0.62, 0.13, 0.24, 0.08, 0.38, 1.6);
      crystal(g, mat, 0.52, 0.12, -0.23, 0.1, 0.42, -1.5);
      crystal(g, pale, 0.4, 0.1, 0.03, 0.24, 0.5, 0);
      put(g, new THREE.CylinderGeometry(0.36, 0.42, 0.1, 9), std(0xf3e2c0, 0.9), 0, 0.03, 0.05);
      break;
    }
    case 3: {
      // ocean heart: a great crystal cradled in a shell, ringed with pearls
      const shell = scallop(0.62, 0xff9fc0, 0xffe6e0);
      shell.rotation.x = -1.25;
      shell.position.y = 0.05;
      g.add(shell);
      const back = scallop(0.66, 0xffb3cf, 0xffeee8);
      back.rotation.x = -0.1;
      back.position.set(0, 0.06, -0.08);
      g.add(back);
      const mat = new THREE.MeshPhysicalMaterial({ color: 0x9ff0ff, roughness: 0.08, clearcoat: 1, emissive: 0x38c6ff, emissiveIntensity: 1.1, flatShading: true });
      crystal(g, mat, 1.05, 0.24, 0, 0.26, 0, 0.5);
      const pearl = new THREE.MeshPhysicalMaterial({ color: 0xfffaf4, roughness: 0.16, clearcoat: 1, emissive: 0xffe2ee, emissiveIntensity: 0.4 });
      for (let i = 0; i < 5; i++) {
        const a = (i / 4 - 0.5) * 2.1;
        put(g, ball(0.07, 14, 10), pearl, Math.sin(a) * 0.36, 0.16, 0.26 + Math.cos(a) * 0.3);
      }
      put(g, new THREE.OctahedronGeometry(0.08, 0), lit(0xffffff), 0, 1.3, 0.26);
      break;
    }
    case 4: {
      // flower seed, just sprouting
      const seed = put(g, ball(0.3, 20, 16).scale(0.82, 1.1, 0.7), std(0xa9743f, 0.55), 0, 0.34, 0);
      seed.rotation.z = 0.2;
      const stripe = put(g, ball(0.3, 20, 16).scale(0.3, 1.11, 0.71), std(0xd9a566, 0.5), 0.02, 0.34, 0.02);
      stripe.rotation.z = 0.2;
      const sprout = put(g, new THREE.CylinderGeometry(0.025, 0.03, 0.3, 6), stem, -0.06, 0.78, 0);
      sprout.rotation.z = 0.2;
      leafOn(g, leaf, 0.26, -0.09, 0.92, 0, 1.2, 0.6);
      leafOn(g, leaf, 0.22, -0.09, 0.92, 0, -1.9, 0.75);
      break;
    }
    case 5: {
      // flower
      put(g, new THREE.CylinderGeometry(0.03, 0.04, 0.62, 8), stem, 0, 0.31, 0);
      leafOn(g, leaf, 0.34, 0, 0.2, 0, 1.3, 0.5);
      leafOn(g, leafDark, 0.3, 0, 0.3, 0, -1.6, 0.55);
      const f = petals(g, std(0xff8fc4, 0.45), std(0xffd84d, 0.5), 0.56, 0, 0.72, 0.04);
      f.rotation.x = -0.35;
      break;
    }
    case 6: {
      // magical plant: glowing blooms in a pot
      put(g, new THREE.CylinderGeometry(0.3, 0.22, 0.32, 14), std(0xd98a5a, 0.7), 0, 0.16, 0);
      put(g, new THREE.TorusGeometry(0.3, 0.045, 8, 20), std(0xe9a070, 0.65), 0, 0.32, 0).rotation.x = Math.PI / 2;
      const bloom = glowing(0xd9a6ff, 0xb14dff, 0.9, 0.4);
      const heart = lit(0xfff2a8);
      ([[0, 0.98, 0, 0.42, 0], [0.3, 0.72, 0.06, 0.3, -0.5], [-0.3, 0.66, 0.08, 0.28, 0.5]] as number[][]).forEach(([x, y, z, s, lean]) => {
        const st = put(g, new THREE.CylinderGeometry(0.022, 0.03, y - 0.3, 6), stem, x * 0.5, (y + 0.3) / 2, z);
        st.rotation.z = -lean * 0.5;
        const f = petals(g, bloom, heart, s, x, y, z + 0.04, 6);
        f.rotation.set(-0.3, 0, lean * 0.3);
      });
      for (let i = 0; i < 5; i++) leafOn(g, i % 2 ? leaf : leafDark, 0.34, 0, 0.34, 0, i * 1.3, 0.45);
      for (let i = 0; i < 4; i++) put(g, ball(0.028, 8, 6), lit(0xffffff), Math.sin(i * 2.1) * 0.46, 0.6 + i * 0.16, Math.cos(i * 2.1) * 0.2);
      break;
    }
    case 7: {
      // blossom tree
      const trunk = put(g, new THREE.CylinderGeometry(0.07, 0.13, 0.6, 8), wood, 0, 0.3, 0);
      trunk.rotation.z = 0.08;
      const b1 = put(g, new THREE.CylinderGeometry(0.035, 0.05, 0.34, 6), wood, 0.14, 0.62, 0);
      b1.rotation.z = -0.8;
      const b2 = put(g, new THREE.CylinderGeometry(0.035, 0.05, 0.3, 6), wood, -0.14, 0.6, 0);
      b2.rotation.z = 0.9;
      blobs(g, [std(0xffa3cf, 0.75), std(0xff86bd, 0.75), std(0xffc4e0, 0.75)], [
        [0, 0.98, 0, 0.3], [0.3, 0.82, 0.05, 0.24], [-0.3, 0.8, 0.04, 0.24], [0.12, 0.86, 0.2, 0.2], [-0.12, 1.1, -0.1, 0.2], [0.02, 0.76, -0.2, 0.2],
      ]);
      for (let i = 0; i < 7; i++) put(g, ball(0.035, 8, 6), std(0xfff0f7, 0.5), Math.sin(i * 1.9) * 0.36, 0.78 + ((i * 0.37) % 0.42), 0.16 + Math.cos(i * 1.9) * 0.18);
      break;
    }
    case 8: {
      // acorn
      put(g, ball(0.3, 22, 16).scale(0.86, 1.15, 0.86), std(0xd89a4a, 0.3), 0, 0.36, 0);
      put(g, new THREE.ConeGeometry(0.06, 0.1, 8).rotateX(Math.PI), std(0xc98838, 0.3), 0, 0.02, 0);
      put(g, new THREE.SphereGeometry(0.3, 22, 10, 0, Math.PI * 2, 0, Math.PI * 0.5).scale(0.98, 0.7, 0.98), std(0x7a4a26, 0.95), 0, 0.5, 0);
      const st = put(g, new THREE.CylinderGeometry(0.03, 0.04, 0.14, 6), wood, 0.02, 0.77, 0);
      st.rotation.z = -0.3;
      break;
    }
    case 9: {
      // sapling
      put(g, ball(0.34, 16, 10).scale(1, 0.34, 1), std(0x7a5234, 0.95), 0, 0.06, 0);
      put(g, new THREE.CylinderGeometry(0.028, 0.045, 0.7, 6), wood, 0, 0.44, 0);
      leafOn(g, leaf, 0.36, 0, 0.44, 0, 1.2, 0.5);
      leafOn(g, leafDark, 0.34, 0, 0.56, 0, -1.9, 0.55);
      leafOn(g, leaf, 0.3, 0, 0.7, 0, 2.9, 0.7);
      leafOn(g, leafDark, 0.28, 0, 0.78, 0, 0.1, 0.9);
      break;
    }
    case 10: {
      // tree
      put(g, new THREE.CylinderGeometry(0.08, 0.14, 0.56, 8), wood, 0, 0.28, 0);
      blobs(g, [std(0x58b84a, 0.8), std(0x3f9f45, 0.8), std(0x7fd05c, 0.8)], [
        [0, 0.92, 0, 0.34], [0.28, 0.74, 0.04, 0.26], [-0.28, 0.72, 0.02, 0.26], [0.05, 0.78, 0.22, 0.22], [-0.05, 1.12, -0.04, 0.2],
      ]);
      break;
    }
    case 11: {
      // enchanted tree
      const bark = std(0x6a4a7a, 0.8);
      const t = put(g, new THREE.CylinderGeometry(0.08, 0.16, 0.6, 8), bark, 0, 0.3, 0);
      t.rotation.z = -0.1;
      blobs(g, [glowing(0x4fd8c0, 0x1fa890, 0.5, 0.6), glowing(0x7ae8a8, 0x2fb878, 0.45, 0.6), glowing(0x58c8e8, 0x2888c8, 0.5, 0.6)], [
        [0.03, 0.96, 0, 0.34], [0.32, 0.78, 0.04, 0.26], [-0.26, 0.76, 0.02, 0.26], [0.08, 0.8, 0.22, 0.22], [-0.02, 1.16, -0.04, 0.2],
      ]);
      for (let i = 0; i < 8; i++) put(g, ball(0.04, 8, 6), lit(i % 2 ? 0xfff2a0 : 0xd8ffff), Math.sin(i * 2.4) * 0.4, 0.62 + ((i * 0.29) % 0.62), 0.18 + Math.cos(i * 2.4) * 0.16);
      break;
    }
    case 12:
      logPile(g, 0.82, 0.15);
      g.rotation.y = 0.6;
      break;
    case 13: {
      const l = lantern(1.45);
      g.add(l);
      break;
    }
    case 14:
      g.add(campfire(1.05));
      break;
    default: {
      // cosy campsite, in miniature
      put(g, new THREE.CylinderGeometry(0.56, 0.6, 0.06, 20), std(0x8fcf6a, 0.9), 0, 0.03, 0);
      const t = tent(0.86, 0.74, 0.66, false);
      t.position.set(-0.08, 0.06, -0.12);
      t.rotation.y = 0.25;
      g.add(t);
      const f = campfire(0.36);
      f.position.set(0.22, 0.06, 0.3);
      g.add(f);
      for (let i = 0; i < 6; i++) put(g, ball(0.035, 8, 6), lit(0xffe6a0), -0.42 + i * 0.16, 0.86 - Math.sin((i / 5) * Math.PI) * 0.1, 0.26);
      put(g, ball(0.09, 10, 8).scale(1, 0.6, 1), std(0xff9fc0, 0.7), -0.3, 0.1, 0.34);
      break;
    }
  }
  return g;
}

/**
 * Photograph every item once, so the board can show real models as pictures.
 * Uses a little renderer of its own, thrown away afterwards.
 */
export function renderIcons(size = 176): string[] {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(size, size, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0xcdb7ff, 2.3));
  const key = new THREE.DirectionalLight(0xfff4e0, 2.6);
  key.position.set(2.2, 4, 3.4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xbfd9ff, 1.1);
  rim.position.set(-3, 2, -2);
  scene.add(rim);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 20);
  const box = new THREE.Box3();
  const centre = new THREE.Vector3();
  const dim = new THREE.Vector3();
  const out: string[] = [];
  for (let code = 0; code < ITEM_COUNT; code++) {
    const item = buildItem(code);
    item.rotation.y += -0.42;
    scene.add(item);
    box.setFromObject(item);
    box.getCenter(centre);
    box.getSize(dim);
    const half = Math.max(dim.x, dim.y, dim.z) * 0.58;
    cam.left = cam.bottom = -half;
    cam.right = cam.top = half;
    cam.updateProjectionMatrix();
    cam.position.set(centre.x, centre.y + 2.2, centre.z + 6);
    cam.lookAt(centre);
    renderer.render(scene, cam);
    out.push(renderer.domElement.toDataURL('image/png'));
    scene.remove(item);
    item.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    });
  }
  renderer.dispose();
  renderer.forceContextLoss();
  return out;
}
