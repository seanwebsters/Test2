import * as THREE from 'three';
import type { Island } from './islandMap';

/** Where home stands, so the forest can leave a clearing around it. */
export const HOME_SPOT = { x: 34, z: 30 };

/** The three fruits of the patch, in bed order. */
export const FRUITS = [
  { name: 'starberry', plural: 'starberries', effect: 'Light as air: you glide much further for a while' },
  { name: 'moon melon', plural: 'moon melons', effect: 'You glow softly for a while. Lovely after dark' },
  { name: 'sun pod', plural: 'sun pods', effect: 'A spring in your step: you run faster for a while' },
];
/** How long a picked plant takes to fruit again, in real milliseconds. */
const REGROW = 8 * 60 * 1000;

/** What each keepsake is and how it is earned, in the order they sit around the nook. */
export const KEEPSAKES: { id: string; name: string }[] = [
  { id: 'lantern', name: 'A seed lantern' },
  { id: 'bloom', name: 'A flower from your garden' },
  { id: 'stones', name: 'A little stone stack' },
  { id: 'kite', name: 'Your kite' },
  { id: 'skimmer', name: 'A perfect skimming stone' },
  { id: 'shell', name: 'A shell from the bay' },
  { id: 'feather', name: 'A feather from the summit' },
  { id: 'garland', name: 'A friendship garland' },
  { id: 'bowl', name: 'A bowl of lake water' },
  { id: 'picture', name: 'A picture you took' },
];

/**
 * Home: a little thatched hut on the stump of a giant old tree, with a ladder,
 * a rope swing, a bench and a lantern, and stepping stones leading to it.
 * Outside are the signs of someone living there: a fenced patch of glowing
 * fruit, a woodpile and a fire ring. Keepsakes from the things you do gather
 * round it over time.
 */
export class Home {
  readonly group = new THREE.Group();
  readonly x: number;
  readonly z: number;
  private items = new Map<string, THREE.Object3D>();
  private swing = new THREE.Group();
  private glow: THREE.MeshBasicMaterial[] = [];
  private light = new THREE.PointLight(0xffc878, 0, 16, 1.6);
  /** one warm light that serves the fire outside or the lamp indoors, whichever you are at */
  private patchLight = new THREE.PointLight(0xffb868, 0, 13, 1.6);
  private plants: { kind: number; x: number; z: number; fruits: THREE.Group; t: number }[] = [];
  private flames: THREE.Mesh[] = [];
  private vine: THREE.Object3D[] = [];
  private lanterns: { group: THREE.Group; mat: THREE.MeshBasicMaterial; c: THREE.Color }[] = [];
  private flies!: THREE.Points;
  private flyMat = new THREE.PointsMaterial({ color: 0xeaff9a, size: 0.17, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  private firePos = new THREE.Vector3();
  private lampPos = new THREE.Vector3();
  /** the fire ring is burning (until morning) */
  lit = false;
  readonly fireSpot = { x: 0, z: 0 };
  readonly ladderSpot = { x: 0, z: 0 };
  /** places round the fire where visiting friends sit */
  readonly gatherSpots: { x: number; z: number }[] = [];
  /** the room indoors: where you sit, the bed, and the fixed camera */
  readonly inside = { pos: new THREE.Vector3(), yaw: 0, bed: new THREE.Vector3(), bedYaw: 0, cam: new THREE.Vector3(), look: new THREE.Vector3() };
  private fruit: { mat: THREE.MeshBasicMaterial; r: number; g: number; b: number; phase: number }[] = [];
  /** Small solid things around the house, as [x, z, radius] in world metres. */
  readonly solids: [number, number, number][] = [];

  constructor(island: Island) {
    this.x = HOME_SPOT.x;
    this.z = HOME_SPOT.z;
    const y = island.heightAt(this.x, this.z);
    this.group.position.set(this.x, y, this.z);
    this.group.rotation.y = -2.3; // the door looks back toward the garden
    const L = (color: number, extra: THREE.MeshLambertMaterialParameters = {}): THREE.MeshLambertMaterial => new THREE.MeshLambertMaterial({ color, ...extra });
    const add = (m: THREE.Object3D, parent: THREE.Object3D = this.group): THREE.Object3D => {
      m.traverse((o) => {
        (o as THREE.Mesh).castShadow = true;
        (o as THREE.Mesh).receiveShadow = true;
      });
      parent.add(m);
      return m;
    };
    const box = (w: number, h: number, d: number, mat: THREE.Material, x: number, yy: number, z: number, ry = 0, rz = 0, rx = 0): THREE.Mesh => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, yy, z);
      m.rotation.set(rx, ry, rz);
      add(m);
      return m;
    };
    const bark = L(0x8a5a36);
    const barkDark = L(0x6f4528);
    const plank = L(0xc79c64);
    const plankDark = L(0x9a6f42);
    const beam = L(0x7a5230);
    const thatch = L(0xf0cc62);
    const thatchDark = L(0xd7ac46);
    const rope = L(0xc9a46a);
    const stone = new THREE.SphereGeometry(1, 12, 9);

    // ---- the stump: wide, flared and rooted
    const stump = new THREE.CylinderGeometry(2.7, 3.3, 3.5, 20, 8, false).translate(0, 1.75, 0);
    {
      const p = stump.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const px = p.getX(i);
        const py = p.getY(i);
        const pz = p.getZ(i);
        const a = Math.atan2(pz, px);
        const flare = 1 + Math.max(0, 1.3 - py) * 0.42 * (0.6 + 0.4 * Math.sin(a * 5)) + 0.05 * Math.sin(a * 11 + py * 3);
        p.setXYZ(i, px * flare, py, pz * flare);
      }
      stump.computeVertexNormals();
    }
    add(new THREE.Mesh(stump, bark));
    for (let i = 0; i < 6; i++) {
      // roots running out into the grass
      const a = (i / 6) * Math.PI * 2 + 0.4;
      const root = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 2.2, 4, 8), barkDark);
      root.position.set(Math.cos(a) * 3.7, 0.2, Math.sin(a) * 3.7);
      root.rotation.set(0, -a, Math.PI / 2 - 0.3);
      add(root);
    }

    // ---- the deck, with posts and a rope rail
    const DECK = 3.6;
    const deck = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, 0.24, 10), plank);
    deck.position.y = DECK;
    add(deck);
    for (let i = -4; i <= 4; i++) box(0.06, 0.02, 7.8 - Math.abs(i) * 0.6, plankDark, i * 0.86, DECK + 0.13, 0); // gaps between planks
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      if (Math.abs(a - Math.PI / 2 - Math.PI / 8) < 0.5) continue; // leave the ladder side open
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.9, 7), beam);
      post.position.set(Math.cos(a) * 3.95, DECK + 0.55, Math.sin(a) * 3.95);
      add(post);
      const a2 = a + (Math.PI * 2) / 8;
      const railing = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 3.0, 5), rope);
      railing.position.set(Math.cos((a + a2) / 2) * 3.65, DECK + 0.78, Math.sin((a + a2) / 2) * 3.65);
      railing.rotation.set(Math.PI / 2, 0, 0);
      railing.rotation.y = -(a + a2) / 2;
      railing.rotation.order = 'YXZ';
      add(railing);
    }

    // ---- the hut: low and wide, plank walls, a doorway, a window
    const HY = DECK + 0.12;
    const HW = 1.95; // half width
    const HD = 1.5; // half depth
    const HH = 1.9; // wall height
    box(HW * 2, HH, 0.14, plank, 0, HY + HH / 2, -HD);
    box(0.14, HH, HD * 2, plank, -HW, HY + HH / 2, 0);
    box(0.14, HH, HD * 2, plank, HW, HY + HH / 2, 0);
    box(HW - 0.6, HH, 0.14, plank, -(HW + 0.6) / 2, HY + HH / 2, HD);
    box(HW - 0.6, HH, 0.14, plank, (HW + 0.6) / 2, HY + HH / 2, HD);
    box(1.3, 0.34, 0.14, plank, 0, HY + HH - 0.17, HD);
    box(1.2, 1.56, 0.05, L(0x2a1c12), 0, HY + 0.78, HD - 0.05); // the dark inside
    box(1.5, 0.16, 0.22, beam, 0, HY + 1.6, HD + 0.05); // lintel
    box(0.16, 1.62, 0.22, beam, -0.68, HY + 0.81, HD + 0.05);
    box(0.16, 1.62, 0.22, beam, 0.68, HY + 0.81, HD + 0.05);
    for (const sx of [-HW, HW]) for (const sz of [-HD, HD]) box(0.24, HH + 0.1, 0.24, beam, sx, HY + HH / 2, sz); // corner posts
    for (let i = 0; i < 3; i++) {
      // board lines round the walls
      box(HW * 2 + 0.02, 0.03, 0.02, plankDark, 0, HY + 0.45 + i * 0.5, -HD - 0.08);
      box(0.02, 0.03, HD * 2 + 0.02, plankDark, -HW - 0.08, HY + 0.45 + i * 0.5, 0);
    }
    box(0.04, 0.72, 0.72, L(0x2a1c12), HW + 0.08, HY + 1.05, 0.2); // window
    box(0.1, 0.86, 0.1, beam, HW + 0.1, HY + 1.05, -0.2);
    box(0.1, 0.86, 0.1, beam, HW + 0.1, HY + 1.05, 0.6);
    box(0.1, 0.1, 0.9, beam, HW + 0.1, HY + 1.46, 0.2);
    box(0.1, 0.1, 0.9, beam, HW + 0.1, HY + 0.64, 0.2);

    // ---- the thatched roof: steep, shaggy, and hanging well out past the walls
    const RY = HY + HH;
    const SLOPE = 0.86;
    for (const side of [-1, 1]) {
      for (let layer = 0; layer < 6; layer++) {
        const t = layer / 5;
        // each course of thatch overlaps the one below and sticks out a little further
        const slab = box(5.3 + (layer % 2) * 0.14, 0.34, 0.95, layer % 2 ? thatchDark : thatch, (layer % 3 - 1) * 0.05, RY + 2.25 - t * 2.55, side * (0.3 + t * 2.25), 0, 0, side * SLOPE);
        slab.rotation.y = (layer % 2 ? 1 : -1) * 0.012;
      }
      // a ragged fringe along the eaves
      for (let k = 0; k < 19; k++) {
        const straw = new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.62, 5), k % 2 ? thatch : thatchDark);
        straw.position.set(-2.6 + k * 0.29, RY - 0.52, side * 2.86);
        straw.rotation.x = Math.PI + side * 0.8;
        add(straw);
      }
    }
    box(5.6, 0.26, 0.34, beam, 0, RY + 2.52, 0); // ridge
    box(5.9, 0.2, 0.2, beam, 0, RY + 2.42, 0, 0, 0.03); // a second, crooked ridge pole, as in the picture
    for (const sx of [-HW - 0.02, HW + 0.02]) {
      // gable ends
      const tri = new THREE.Shape();
      tri.moveTo(-HD - 0.1, 0);
      tri.lineTo(HD + 0.1, 0);
      tri.lineTo(0, 1.95);
      const gable = new THREE.Mesh(new THREE.ExtrudeGeometry(tri, { depth: 0.12, bevelEnabled: false }), plankDark);
      gable.position.set(sx - 0.06, RY, 0);
      gable.rotation.y = Math.PI / 2;
      add(gable);
    }
    // a patch on the roof, like the one in the picture
    box(0.9, 0.06, 0.7, plankDark, 1.3, RY + 1.42, 1.15, 0.3, 0, SLOPE);

    // ---- ladder up to the deck
    const ladder = new THREE.Group();
    for (const sx of [-0.4, 0.4]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 4.5, 0.1), beam);
      rail.position.set(sx, 2.15, 0);
      ladder.add(rail);
    }
    for (let i = 0; i < 8; i++) {
      const rung = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.1), plank);
      rung.position.y = 0.4 + i * 0.5;
      ladder.add(rung);
    }
    ladder.position.set(0, 0, 5.0);
    ladder.rotation.x = -0.22;
    add(ladder);

    // ---- rope swing under the deck
    for (const sx of [-0.45, 0.45]) {
      const r = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.5, 5).translate(0, -1.25, 0), rope);
      r.position.x = sx;
      this.swing.add(r);
    }
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.08, 0.38), plank);
    seat.position.y = -2.5;
    this.swing.add(seat);
    this.swing.position.set(3.7, DECK - 0.1, 1.4);
    add(this.swing);

    // ---- bench and lantern
    const bench = new THREE.Group();
    const part = (w: number, h: number, d: number, x: number, yy: number, z: number, rx = 0): void => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), plank);
      m.position.set(x, yy, z);
      m.rotation.x = rx;
      bench.add(m);
    };
    part(1.9, 0.1, 0.6, 0, 0.52, 0);
    part(1.9, 0.6, 0.1, 0, 0.95, -0.3, -0.18);
    for (const sx of [-0.8, 0.8]) part(0.12, 0.52, 0.5, sx, 0.26, 0);
    bench.position.set(5.4, 0, 3.6);
    bench.rotation.y = -0.9;
    add(bench);
    const lampPost = new THREE.Group();
    lampPost.add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 2.3, 7).translate(0, 1.15, 0), beam));
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.08), beam);
    arm.position.set(0.3, 2.25, 0);
    lampPost.add(arm);
    // the lantern is never dimmed by fog: it is the light you walk toward
    const flame = new THREE.MeshBasicMaterial({ color: 0xffd27a, fog: false });
    this.glow.push(flame);
    const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.34, 0.26), flame);
    lantern.position.set(0.58, 1.98, 0);
    lampPost.add(lantern);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.16, 4), beam);
    cap.position.set(0.58, 2.22, 0);
    cap.rotation.y = Math.PI / 4;
    lampPost.add(cap);
    lampPost.position.set(6.6, 0, 2.2);
    add(lampPost);
    lantern.castShadow = false;
    this.light.position.set(7.2, 2.0, 2.2);
    this.group.add(this.light);
    // a second, larger beacon high on the roof so the house can be found from far off in the fog
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), flame);
    beacon.position.set(0, RY + 2.95, 0);
    this.group.add(beacon);
    const warm = new THREE.MeshBasicMaterial({ color: 0xffb84a, fog: false });
    this.glow.push(warm);
    const doorGlow = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.5), warm);
    doorGlow.position.set(0, HY + 0.78, HD - 0.02);
    this.group.add(doorGlow);

    // ---- stepping stones leading away from the ladder
    for (let i = 0; i < 9; i++) {
      const st = new THREE.Mesh(stone, L([0xe0b8a8, 0xd6a898, 0xe8c4b2][i % 3]));
      st.scale.set(0.55 + (i % 3) * 0.08, 0.07, 0.42 + (i % 2) * 0.1);
      st.position.set(Math.sin(i * 0.9) * 0.7, 0.05, 6.3 + i * 1.25);
      st.rotation.y = i * 1.3;
      add(st);
    }


    // ---- everything below sits on the real ground, which is not quite level around the stump
    const ROT = this.group.rotation.y;
    const world = (lx: number, lz: number): [number, number] => [this.x + lx * Math.cos(ROT) + lz * Math.sin(ROT), this.z - lx * Math.sin(ROT) + lz * Math.cos(ROT)];
    const ground = (lx: number, lz: number): number => {
      const [wx, wz] = world(lx, lz);
      return island.heightAt(wx, wz) - y;
    };
    const put = (m: THREE.Object3D, lx: number, lz: number, up = 0): THREE.Object3D => {
      m.position.set(lx, ground(lx, lz) + up, lz);
      return add(m);
    };
    const solid = (lx: number, lz: number, r: number): void => {
      const [wx, wz] = world(lx, lz);
      this.solids.push([wx, wz, r]);
    };

    // ---- the fruit patch: three raised beds of glowing fruit, a little tree, a fence on two sides
    const soil = L(0x6b4630);
    const leaf = L(0x4fa046);
    const leafLight = L(0x7cc45a);
    const magic = (color: number): THREE.MeshBasicMaterial => {
      const m = new THREE.MeshBasicMaterial({ color });
      const c = new THREE.Color(color);
      this.fruit.push({ mat: m, r: c.r, g: c.g, b: c.b, phase: this.fruit.length * 1.7 });
      return m;
    };
    const pink = magic(0xff7ad0);
    const aqua = magic(0x8fe9ff);
    const gold = magic(0xffd65a);
    const violet = magic(0xc59bff);
    const ball = new THREE.SphereGeometry(1, 12, 9);
    const orb = (mat: THREE.Material, r: number, x: number, yy: number, z: number, sy = 1): THREE.Mesh => {
      const m = new THREE.Mesh(ball, mat);
      m.scale.set(r, r * sy, r);
      m.position.set(x, yy, z);
      return m;
    };
    const FX = -7.5;
    [4.3, 6.0, 7.7].forEach((bz, row) => {
      const bed = new THREE.Group();
      bed.add(new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.5, 1.1).translate(0, 0.05, 0), soil));
      for (const sz of [-0.58, 0.58]) {
        const log = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.13, 3.5, 8), sz < 0 ? barkDark : bark);
        log.rotation.z = Math.PI / 2;
        log.position.set(0, 0.2, sz);
        bed.add(log);
      }
      for (const sx of [-1.7, 1.7]) {
        const log = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.2, 8), bark);
        log.rotation.x = Math.PI / 2;
        log.position.set(sx, 0.2, 0);
        bed.add(log);
      }
      for (let k = 0; k < 4; k++) {
        const px = -1.2 + k * 0.8 + ((k * 7 + row * 3) % 5) * 0.03;
        const plant = new THREE.Group();
        const fruits = new THREE.Group();
        plant.add(fruits);
        plant.position.set(px, 0.3, ((k + row) % 2 ? 0.08 : -0.08));
        const size = 0.85 + ((k * 5 + row * 2) % 4) * 0.08;
        if (row === 0) {
          // starberries: a round bush dotted with small bright berries
          plant.add(orb(leaf, 0.36, 0, 0.26, 0, 0.8), orb(leafLight, 0.24, 0.12, 0.42, 0.06, 0.8));
          for (let b = 0; b < 6; b++) {
            const a = b * 1.05 + k;
            fruits.add(orb(b % 3 ? pink : violet, 0.075, Math.cos(a) * 0.33, 0.24 + (b % 3) * 0.13, Math.sin(a) * 0.33));
          }
        } else if (row === 1) {
          // moon melons: one big pale fruit resting in a ring of broad leaves
          for (let b = 0; b < 5; b++) {
            const a = b * 1.256 + k;
            const lf = orb(b % 2 ? leaf : leafLight, 0.26, Math.cos(a) * 0.3, 0.05, Math.sin(a) * 0.3, 0.14);
            lf.rotation.set(Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3);
            plant.add(lf);
          }
          fruits.add(orb(k % 2 ? aqua : violet, 0.25, 0, 0.24, 0, 0.88));
          const curl = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.2, 5), leaf);
          curl.position.set(0.03, 0.52, 0);
          curl.rotation.z = -0.5;
          plant.add(curl);
        } else {
          // sun pods: a vine up a stake, hung with teardrop fruit
          plant.add(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 1.5, 6).translate(0, 0.75, 0), beam));
          for (let b = 0; b < 4; b++) {
            const lf = orb(b % 2 ? leaf : leafLight, 0.17, Math.cos(b * 1.9) * 0.14, 0.35 + b * 0.32, Math.sin(b * 1.9) * 0.14, 0.5);
            plant.add(lf);
          }
          for (let b = 0; b < 3; b++) fruits.add(orb(b === 1 ? pink : gold, 0.085, Math.cos(b * 2.2 + k) * 0.2, 0.5 + b * 0.33, Math.sin(b * 2.2 + k) * 0.2, 1.4));
        }
        plant.scale.setScalar(size);
        const [fwx, fwz] = world(FX + px, bz);
        this.plants.push({ kind: row, x: fwx, z: fwz, fruits, t: 0 });
        bed.add(plant);
      }
      bed.rotation.y = (row - 1) * 0.04;
      put(bed, FX, bz);
    });
    // the little fruit tree at the corner of the patch
    {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, 2.0, 8).translate(0, 1.0, 0), bark);
      trunk.rotation.z = 0.08;
      tree.add(trunk);
      const crown: [number, number, number, number][] = [[0, 2.5, 0, 1.15], [0.75, 2.2, 0.3, 0.8], [-0.7, 2.25, -0.25, 0.85], [0.1, 2.15, -0.8, 0.75], [-0.1, 3.1, 0.2, 0.75]];
      crown.forEach(([cx, cy, cz, r], i) => tree.add(orb(i % 2 ? leafLight : leaf, r, cx, cy, cz, 0.82)));
      for (let b = 0; b < 9; b++) {
        const a = b * 0.7;
        const mat = [gold, pink, aqua][b % 3];
        tree.add(orb(mat, 0.13, Math.cos(a) * (1.0 + (b % 2) * 0.25), 1.75 + (b % 4) * 0.22, Math.sin(a) * (1.0 + (b % 2) * 0.25), 1.15));
      }
      put(tree, -11.4, 9.6);
      solid(-11.4, 9.6, 0.45);
      put(orb(gold, 0.13, 0, 0, 0, 1.1), -10.6, 10.5, 0.12); // a windfall in the grass
    }
    // a low fence along the two far sides, posts a little crooked
    const fence = (ax: number, az: number, bx: number, bz: number): void => {
      const len = Math.hypot(bx - ax, bz - az);
      const n = Math.round(len / 1.15);
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const px = ax + (bx - ax) * t;
        const pz = az + (bz - az) * t;
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.075, 0.95 + (i % 3) * 0.06, 6).translate(0, 0.45, 0), i % 2 ? beam : plankDark);
        post.rotation.set(((i * 7) % 5 - 2) * 0.025, 0, ((i * 3) % 5 - 2) * 0.025);
        put(post, px, pz);
        solid(px, pz, 0.35);
        if (i === n) break;
        const qx = ax + (bx - ax) * ((i + 1) / n);
        const qz = az + (bz - az) * ((i + 1) / n);
        const g0 = ground(px, pz);
        const g1 = ground(qx, qz);
        for (const h of [0.36, 0.7]) {
          const rail = new THREE.Mesh(new THREE.BoxGeometry(len / n + 0.1, 0.06, 0.04), plank);
          rail.position.set((px + qx) / 2, (g0 + g1) / 2 + h, (pz + qz) / 2);
          rail.rotation.y = -Math.atan2(qz - pz, qx - px);
          rail.rotation.z = Math.atan2(g1 - g0, len / n) + (h > 0.5 ? 0.02 : -0.015);
          rail.rotation.order = 'YZX';
          add(rail);
        }
      }
    };
    fence(-10.4, 3.1, -10.4, 8.9);
    fence(-10.4, 3.1, -5.4, 3.1);
    // a basket of picked fruit and a watering can left by the beds
    {
      const basket = new THREE.Group();
      basket.add(new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.26, 0.3, 12, 1, true).translate(0, 0.15, 0), L(0xc9a46a, { side: THREE.DoubleSide })));
      basket.add(new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.04, 12).translate(0, 0.02, 0), rope));
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.025, 5, 14, Math.PI), rope);
      handle.position.y = 0.28;
      basket.add(handle);
      [pink, gold, aqua, violet, gold].forEach((m, i) => basket.add(orb(m, 0.1, Math.cos(i * 1.4) * 0.14, 0.27 + (i % 2) * 0.05, Math.sin(i * 1.4) * 0.14)));
      put(basket, -5.0, 7.2);
      const can = new THREE.Group();
      const tin = L(0x8fb7c9);
      can.add(new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.34, 12).translate(0, 0.17, 0), tin));
      const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 0.42, 6), tin);
      spout.position.set(0.3, 0.26, 0);
      spout.rotation.z = -0.9;
      const grip = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.022, 5, 10, Math.PI), tin);
      grip.position.set(-0.17, 0.2, 0);
      grip.rotation.z = Math.PI / 2;
      can.add(spout, grip);
      can.rotation.y = 0.7;
      put(can, -5.3, 5.0);
    }
    this.group.add(this.patchLight);

    // ---- signs that someone lives here: a woodpile, a fire ring with log seats, pots by the ladder
    {
      const pile = new THREE.Group();
      [[-0.5, 0.16], [0, 0.16], [0.5, 0.16], [-0.25, 0.46], [0.25, 0.46], [0, 0.76]].forEach(([px, py], i) => {
        const log = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.3, 8), i % 2 ? bark : barkDark);
        log.rotation.x = Math.PI / 2;
        log.position.set(px, py, 0);
        pile.add(log);
        const end = new THREE.Mesh(new THREE.CircleGeometry(0.13, 8), plank);
        end.position.set(px, py, 0.655);
        pile.add(end);
      });
      pile.rotation.y = 2.2;
      put(pile, 5.2, -3.4);
      solid(5.2, -3.4, 0.8);

      const fire = new THREE.Group();
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        const s = new THREE.Mesh(stone, L([0x9a958e, 0xb3aca0, 0x847f79][i % 3]));
        s.scale.set(0.2 + (i % 2) * 0.04, 0.14, 0.17);
        s.position.set(Math.cos(a) * 0.62, 0.08, Math.sin(a) * 0.62);
        s.rotation.y = a;
        fire.add(s);
      }
      for (let i = 0; i < 3; i++) {
        const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.8, 6), L(0x3a2a20));
        stick.rotation.set(Math.PI / 2 - 0.5, i * 2.1, 0);
        stick.rotation.order = 'YXZ';
        stick.position.y = 0.2;
        fire.add(stick);
      }
      const ember = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), warm);
      ember.scale.y = 0.4;
      ember.position.y = 0.1;
      fire.add(ember);
      [0xffa53a, 0xffd060, 0xfff0a8].forEach((c, i) => {
        const fl = new THREE.Mesh(new THREE.ConeGeometry(0.26 - i * 0.07, 0.85 - i * 0.2, 7), new THREE.MeshBasicMaterial({ color: c }));
        fl.position.set((i - 1) * 0.1, 0.5 - i * 0.04, (i % 2) * 0.08);
        fl.visible = false;
        fire.add(fl);
        this.flames.push(fl);
      });
      put(fire, 7.4, 6.8);
      for (const fl of this.flames) fl.castShadow = false;
      [this.fireSpot.x, this.fireSpot.z] = world(7.4, 6.8);
      this.firePos.set(7.4, ground(7.4, 6.8) + 0.9, 6.8);
      for (const [ox, oz] of [[-1.9, 0], [-1.3, -1.45], [0.2, -1.95], [1.65, -1.2], [-1.5, 1.45]]) {
        const [gx, gz] = world(7.4 + ox, 6.8 + oz);
        this.gatherSpots.push({ x: gx, z: gz });
      }
      for (const [sx, sz, ry] of [[9.0, 7.4, 0.35], [7.0, 8.6, 1.4]]) {
        const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 1.5, 10), bark);
        seat.rotation.set(0, ry, Math.PI / 2);
        seat.rotation.order = 'YXZ';
        put(seat, sx, sz, 0.26);
      }
      for (const [px, pz, c] of [[1.3, 5.6, 0xff8fb8], [-1.4, 5.5, 0xffd65a], [-1.9, 5.1, 0xb9a0ff]] as [number, number, number][]) {
        const p2 = new THREE.Group();
        p2.add(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.28, 10).translate(0, 0.14, 0), L(0xb5683a)));
        p2.add(orb(leaf, 0.2, 0, 0.36, 0, 0.7));
        for (let b = 0; b < 4; b++) p2.add(orb(L(c), 0.07, Math.cos(b * 1.6) * 0.13, 0.46, Math.sin(b * 1.6) * 0.13));
        put(p2, px, pz);
      }
    }


    [this.ladderSpot.x, this.ladderSpot.z] = world(0, 6.4);

    // ---- the vine: one leaf for every day spent on the island, a flower every seventh
    {
      const stem = L(0x4c8a3a);
      const leafA = L(0x62b04a);
      const leafB = L(0x86cc5e);
      const petal = L(0xff9cc4);
      const at = (i: number, out: THREE.Vector3): THREE.Vector3 => {
        const t = i / 44;
        const py = 0.25 + t * 5.4; // up the stump, past the deck and on up the corner of the hut
        const a = Math.PI / 2 + 0.75 + t * Math.PI * 2.6;
        let r: number;
        if (py < 3.5) {
          const flare = 1 + Math.max(0, 1.3 - py) * 0.42 * (0.6 + 0.4 * Math.sin(a * 5)) + 0.05 * Math.sin(a * 11 + py * 3);
          r = (3.3 - (py / 3.5) * 0.6) * flare + 0.07;
        } else r = 4.25 - Math.min(1, (py - 3.5) / 0.5) * 1.85;
        return out.set(Math.cos(a) * r, py, Math.sin(a) * r);
      };
      const p0 = new THREE.Vector3();
      const p1 = new THREE.Vector3();
      const upY = new THREE.Vector3(0, 1, 0);
      for (let i = 0; i < 44; i++) {
        at(i, p0);
        at(i + 1, p1);
        const g = new THREE.Group();
        const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.034, p0.distanceTo(p1) + 0.04, 5), stem);
        seg.position.copy(p0).lerp(p1, 0.5);
        seg.quaternion.setFromUnitVectors(upY, p1.clone().sub(p0).normalize());
        g.add(seg);
        const out = new THREE.Vector3(p1.x, 0, p1.z).normalize();
        const leaf = new THREE.Mesh(ball, i % 2 ? leafA : leafB);
        leaf.scale.set(0.2, 0.035, 0.13);
        leaf.position.copy(p1).addScaledVector(out, 0.16);
        leaf.position.y += (i % 2 ? 0.08 : -0.06);
        leaf.rotation.set(0, -Math.atan2(out.z, out.x), i % 2 ? 0.5 : -0.4);
        g.add(leaf);
        if (i % 7 === 6) {
          for (let k = 0; k < 5; k++) {
            const pt = new THREE.Mesh(ball, petal);
            pt.scale.setScalar(0.065);
            pt.position.copy(p1).addScaledVector(out, 0.2).add(new THREE.Vector3(0, Math.sin(k * 1.257) * 0.09, 0)).addScaledVector(new THREE.Vector3(-out.z, 0, out.x), Math.cos(k * 1.257) * 0.09);
            g.add(pt);
          }
          const eye = new THREE.Mesh(ball, gold);
          eye.scale.setScalar(0.05);
          eye.position.copy(p1).addScaledVector(out, 0.24);
          g.add(eye);
        }
        g.visible = false;
        add(g);
        this.vine.push(g);
      }
    }

    // ---- a lantern for every friend who has been given a gift, strung round the deck
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2 + 0.17;
      const g = new THREE.Group();
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.42, 4).translate(0, -0.21, 0), rope));
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), mat);
      body.scale.y = 1.25;
      body.position.y = -0.6;
      g.add(body);
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 8), beam);
      top.position.y = -0.4;
      g.add(top);
      g.position.set(Math.cos(a) * 4.28, DECK - 0.1, Math.sin(a) * 4.28);
      g.visible = false;
      this.group.add(g);
      this.lanterns.push({ group: g, mat, c: new THREE.Color(0xffffff) });
    }

    // ---- fireflies that come out round the house after dark
    {
      const n = 70;
      const pos = new Float32Array(n * 3);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 2, 0), 30);
      this.flies = new THREE.Points(geo, this.flyMat);
      this.group.add(this.flies);
    }

    // ---- indoors: a bed, a rug, a shelf of fruit jars, a lamp in the rafters
    {
      const room = new THREE.Group();
      room.position.y = HY;
      const rin = (m: THREE.Mesh, x: number, yy: number, z: number, ry = 0): THREE.Mesh => {
        m.position.set(x, yy, z);
        m.rotation.y = ry;
        m.receiveShadow = true;
        room.add(m);
        return m;
      };
      const rug = rin(new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.03, 20), L(0x6fa8c9)), -0.2, 0.02, 0.1);
      rug.scale.z = 0.8;
      rin(new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.035, 20), L(0xe6f1f7)), -0.2, 0.022, 0.1).scale.z = 0.8;
      // the bed, along the back wall
      rin(new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.26, 1.0), plankDark), -0.85, 0.16, -0.9);
      rin(new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.2, 0.92), L(0xfff4e0)), -0.85, 0.36, -0.9);
      rin(new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.1, 0.98), L(0x7fb7e6)), -0.5, 0.48, -0.9);
      rin(new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 8), L(0xffffff)), -1.5, 0.52, -0.9).scale.set(1, 0.5, 1.3);
      rin(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.7, 1.0), beam), -1.82, 0.38, -0.9);
      // shelf with jars of fruit
      rin(new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 0.3), beam), 1.0, 1.15, -1.28);
      [pink, aqua, gold, violet].forEach((m, i) => {
        rin(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.24, 10), L(0xdff3ff, { transparent: true, opacity: 0.45 })), 0.5 + i * 0.34, 1.3, -1.28);
        rin(new THREE.Mesh(ball, m), 0.5 + i * 0.34, 1.27, -1.28).scale.setScalar(0.07);
      });
      // a little table with a candle and a cup
      rin(new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.3, 0.42, 12), bark), 1.35, 0.21, -0.55);
      rin(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.16, 6), L(0xfff4e0)), 1.3, 0.5, -0.55);
      rin(new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), warm), 1.3, 0.62, -0.55).scale.y = 1.6;
      rin(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.09, 8), L(0x8fb7c9)), 1.5, 0.47, -0.45);
      // bunting along the back wall
      for (let i = 0; i < 9; i++) {
        const flag = rin(new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.2, 3), L([0xff8fb8, 0xffd65a, 0x8fe9ff, 0xb9a0ff, 0x9fe07a][i % 5])), -1.5 + i * 0.37, 1.62 - Math.sin((i / 8) * Math.PI) * 0.12, -1.38);
        flag.rotation.x = Math.PI;
        flag.scale.z = 0.2;
      }
      // a round window of sky in the back wall, and a picture
      rin(new THREE.Mesh(new THREE.CircleGeometry(0.3, 16), new THREE.MeshBasicMaterial({ color: 0xbfe6ff })), -0.2, 1.25, -1.42);
      rin(new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.04, 6, 18), beam), -0.2, 1.25, -1.41);
      // the lamp hanging from the ridge
      rin(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.0, 4), rope), 0.2, 2.75, 0.1);
      rin(new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), flame), 0.2, 2.2, 0.1);
      this.group.add(room);
      this.lampPos.set(0.2, HY + 2.0, 0.1);
      const at3 = (lx: number, ly: number, lz: number, out: THREE.Vector3): void => {
        const [wx, wz] = world(lx, lz);
        out.set(wx, y + ly, wz);
      };
      at3(-0.35, HY + 0.04, 0.0, this.inside.pos);
      at3(-0.6, HY + 0.5, -0.9, this.inside.bed);
      at3(1.72, HY + 1.8, 1.3, this.inside.cam);
      at3(-0.5, HY + 0.6, -0.55, this.inside.look);
      this.inside.yaw = Math.atan2(2.07, 1.3) + ROT; // sits facing the camera corner
      this.inside.bedYaw = Math.PI / 2 + ROT;
    }

    // keepsakes, each hidden until earned
    const at = (i: number, r = 5.4): [number, number] => [Math.cos((i / 10) * Math.PI * 2 + 0.3) * r, Math.sin((i / 10) * Math.PI * 2 + 0.3) * r];
    const place = (id: string, i: number, obj: THREE.Object3D, yOff = 0): void => {
      const [px, pz] = at(i);
      obj.position.set(px, yOff, pz);
      obj.visible = false;
      add(obj);
      this.items.set(id, obj);
    };
    place('lantern', 0, new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 1), new THREE.MeshBasicMaterial({ color: 0xeaffa0 })), 0.4);
    const pot = new THREE.Group();
    pot.add(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.2, 10).translate(0, 0.1, 0), L(0xb5683a)));
    const flower = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), L(0xff7ab0));
    flower.position.y = 0.46;
    pot.add(new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.28, 5).translate(0, 0.32, 0), L(0x4f9a3a)), flower);
    place('bloom', 1, pot);
    const stack = new THREE.Group();
    [0.2, 0.15, 0.11].forEach((r, k) => {
      const m = new THREE.Mesh(stone, L([0x8d8a86, 0xb8b0a2, 0x77736e][k]));
      m.scale.set(r, r * 0.45, r * 0.85);
      m.position.y = 0.09 + k * 0.14;
      stack.add(m);
    });
    place('stones', 2, stack);
    const kiteGeo = new THREE.BufferGeometry();
    kiteGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.5, 0, -0.3, 0.1, 0, 0.3, 0.1, 0, 0, -0.4, 0], 3));
    kiteGeo.setIndex([0, 1, 2, 1, 3, 2]);
    kiteGeo.computeVertexNormals();
    const kite = new THREE.Mesh(kiteGeo, new THREE.MeshBasicMaterial({ color: 0xff8a6a, side: THREE.DoubleSide }));
    kite.rotation.x = -0.5;
    place('kite', 3, kite, 0.5);
    const skim = new THREE.Mesh(stone, L(0x6f7f8a));
    skim.scale.set(0.2, 0.045, 0.16);
    place('skimmer', 4, skim, 0.07);
    const shell = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.26, 10), L(0xffd9e0));
    shell.rotation.z = 1.2;
    place('shell', 5, shell, 0.12);
    const feather = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6).scale(0.07, 0.36, 0.015), L(0xffffff));
    feather.rotation.z = 0.5;
    place('feather', 6, feather, 0.36);
    const garland = new THREE.Group();
    for (let k = 0; k < 7; k++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), L([0xff7a8a, 0xffd23c, 0x7fc8ff, 0x9fe07a, 0xd7b6ff][k % 5]));
      b.position.set((k - 3) * 0.2, 1.2 - Math.sin((k / 6) * Math.PI) * 0.25, 0);
      garland.add(b);
    }
    place('garland', 7, garland);
    const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), L(0x6fb8e6, { side: THREE.DoubleSide }));
    place('bowl', 8, bowl, 0.2);
    const frame = new THREE.Group();
    frame.add(new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.34, 0.04), L(0xb5863a)));
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.26), new THREE.MeshBasicMaterial({ color: 0x9fd6ff }));
    pic.position.z = 0.025;
    frame.add(pic);
    frame.rotation.x = -0.25;
    place('picture', 9, frame, 0.24);
    for (const [, o] of this.items) o.lookAt(0, o.position.y, 0);
  }

  near(p: THREE.Vector3): boolean {
    return Math.hypot(this.x - p.x, this.z - p.z) < 7.5;
  }

  /** Index of a plant with ripe fruit within reach, or -1. */
  fruitNear(p: THREE.Vector3, now: number): number {
    let best = -1;
    let bestD = 1.5;
    this.plants.forEach((pl, i) => {
      const d = Math.hypot(pl.x - p.x, pl.z - p.z);
      if (d < bestD && now - pl.t >= REGROW) {
        bestD = d;
        best = i;
      }
    });
    return best;
  }

  /** Pick plant `i`; returns which fruit it was (an index into FRUITS). */
  pick(i: number, now: number): number {
    this.plants[i].t = now;
    return this.plants[i].kind;
  }

  /** Where a ripe plant of one kind stands (any plant of that kind if none is ripe). */
  plantSpot(kind: number, now: number): { x: number; z: number } {
    const mine = this.plants.filter((pl) => pl.kind === kind);
    return mine.find((pl) => now - pl.t >= REGROW) ?? mine[0];
  }

  fireNear(p: THREE.Vector3): boolean {
    return Math.hypot(this.fireSpot.x - p.x, this.fireSpot.z - p.z) < 2.3;
  }

  ladderNear(p: THREE.Vector3): boolean {
    return Math.hypot(this.ladderSpot.x - p.x, this.ladderSpot.z - p.z) < 1.9;
  }

  serializeFruit(): number[] {
    return this.plants.map((pl) => pl.t);
  }

  loadFruit(times: number[] | undefined): void {
    this.plants.forEach((pl, i) => (pl.t = typeof times?.[i] === 'number' ? times[i] : 0));
  }

  /** The vine shows one leaf per day on the island (it stops at the roof). */
  setVine(days: number): void {
    this.vine.forEach((g, i) => (g.visible = i < days));
  }

  /** One lantern per friend: a colour to show it, or null to hide it. */
  setLanterns(colors: (number | null)[]): void {
    this.lanterns.forEach((l, i) => {
      const c = colors[i] ?? null;
      l.group.visible = c !== null;
      if (c !== null) l.c.setHex(c);
    });
  }

  /** The swing drifts, the lantern warms as evening comes, fruit regrows, the fire flickers. */
  update(time: number, night: number, now = Date.now(), indoors = false): void {
    this.swing.rotation.x = Math.sin(time * 1.1) * 0.12;
    const k = 0.55 + 0.45 * night + Math.sin(time * 7) * 0.03;
    this.glow[0].color.setRGB(1.0 * k, 0.82 * k, 0.48 * k);
    this.glow[1].color.setRGB(1.0 * k, 0.72 * k, 0.29 * k);
    this.light.intensity = 6 + night * 26;
    // the fruit breathes: soft by day, properly aglow after dark
    for (const f of this.fruit) {
      const g = 0.8 + 0.1 * Math.sin(time * 1.3 + f.phase) + night * 0.75;
      f.mat.color.setRGB(f.r * g, f.g * g, f.b * g);
    }
    // picked plants swell back over a few minutes
    for (const pl of this.plants) {
      const ripe = Math.min(1, (now - pl.t) / REGROW);
      pl.fruits.visible = ripe > 0.35;
      pl.fruits.scale.setScalar(ripe >= 1 ? 1 : 0.3 + ripe * 0.55);
    }
    for (const l of this.lanterns) {
      if (!l.group.visible) continue;
      const g = 0.75 + night * 0.7;
      l.mat.color.setRGB(l.c.r * g, l.c.g * g, l.c.b * g);
    }
    this.flames.forEach((fl, i) => {
      fl.visible = this.lit;
      const f = 1 + Math.sin(time * (9 + i * 3.7) + i) * 0.16 + Math.sin(time * 23 + i * 2) * 0.07;
      fl.scale.set(1 + (f - 1) * 0.5, f, 1 + (f - 1) * 0.5);
      fl.rotation.z = Math.sin(time * 6 + i * 2) * 0.1;
    });
    if (indoors) {
      this.patchLight.position.copy(this.lampPos);
      this.patchLight.intensity = 2.6;
    } else {
      this.patchLight.position.copy(this.firePos);
      this.patchLight.intensity = this.lit ? 30 + Math.sin(time * 11) * 5 + Math.sin(time * 27) * 3 : 0;
    }
    // fireflies: slow looping drifts, blinking, only after dark
    this.flyMat.opacity = Math.max(0, night - 0.25) * 1.2;
    this.flies.visible = night > 0.26;
    if (this.flies.visible) {
      const pos = this.flies.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        const a = i * 2.399 + time * (0.05 + (i % 5) * 0.012) * (i % 2 ? 1 : -1);
        const r = 5 + ((i * 37) % 13) + Math.sin(time * 0.3 + i) * 1.2;
        const blink = Math.sin(time * (1.1 + (i % 7) * 0.23) + i * 1.3) > -0.2 ? 0 : -50; // blinked-out ones drop out of sight
        pos.setXYZ(i, Math.cos(a) * r, 1.0 + ((i * 13) % 9) * 0.32 + Math.sin(time * 0.7 + i * 0.9) * 0.4 + blink, Math.sin(a) * r);
      }
      pos.needsUpdate = true;
    }
  }

  show(earned: Set<string>): void {
    for (const [id, o] of this.items) o.visible = earned.has(id);
  }
}
