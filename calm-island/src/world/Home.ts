import * as THREE from 'three';
import type { Island } from './islandMap';
import type { Kit } from './Kit';
import { glowDot } from './Trail';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Where home stands, so the forest can leave a clearing around it. */
export const HOME_SPOT = { x: 34, z: 30 };

/** The three fruits of the patch, in bed order. */
export const FRUITS = [
  { name: 'starberry', plural: 'starberries', effect: 'Light as air: you glide much further for a while' },
  { name: 'moon melon', plural: 'moon melons', effect: 'You glow softly for a while. Lovely after dark' },
  { name: 'sun pod', plural: 'sun pods', effect: 'A spring in your step: you run faster for a while' },
];
/** The walkable floor indoors. */
export interface Room {
  x: number;
  z: number;
  hw: number;
  hd: number;
  cos: number;
  sin: number;
  y: number;
  solids: [number, number, number][];
}
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
  private flyMat = new THREE.PointsMaterial({ color: 0xeaff9a, map: glowDot(), size: 0.3, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  private firePos = new THREE.Vector3();
  private patchLamp = new THREE.Color(0xffe2b0);
  private fireColor = new THREE.Color(0xffb868);
  private lampPos = new THREE.Vector3();
  /** the fire ring is burning (until morning) */
  lit = false;
  readonly fireSpot = { x: 0, z: 0 };
  readonly ladderSpot = { x: 0, z: 0 };
  /** places round the fire where visiting friends sit */
  readonly gatherSpots: { x: number; z: number }[] = [];
  /** the room indoors: where you sit, the bed, and the fixed camera */
  readonly inside = {
    pos: new THREE.Vector3(), yaw: 0, bed: new THREE.Vector3(), bedYaw: 0, bedside: new THREE.Vector3(), cam: new THREE.Vector3(), look: new THREE.Vector3(),
    door: new THREE.Vector3(), chest: new THREE.Vector3(), bedEdge: new THREE.Vector3(),
  };
  /** the floor of the room: a rectangle turned with the house, and the furniture standing on it */
  room!: Room;
  private rugMat = new THREE.MeshLambertMaterial({ color: 0x6fa8c9 });
  private rugMat2 = new THREE.MeshLambertMaterial({ color: 0xe6f1f7 });
  private quiltMat = new THREE.MeshLambertMaterial({ color: 0x7fb7e6 });
  private quiltMat2 = new THREE.MeshLambertMaterial({ color: 0xfff6e6 });
  private lampMat = new THREE.MeshBasicMaterial({ color: 0xffd27a, fog: false });
  private lampColor = new THREE.Color(0xffd27a);
  private pane!: THREE.MeshBasicMaterial;
  private extras = new Map<string, THREE.Group>();
  private quiltKit: THREE.MeshLambertMaterial | null = null;
  private fruit: { mat: THREE.MeshBasicMaterial; r: number; g: number; b: number; phase: number }[] = [];
  /** Small solid things around the house, as [x, z, radius] in world metres. */
  readonly solids: [number, number, number][] = [];

  constructor(island: Island, kit: Kit | null = null) {
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
    const stumpMat = kit?.barkDark ? new THREE.MeshLambertMaterial({ map: kit.barkDark, color: 0xffffff, emissive: 0x4a2c16, emissiveMap: kit.barkDark }) : bark;
    if (kit?.barkDark) {
      const uv = stump.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 5, uv.getY(i) * 1.6);
    }
    add(new THREE.Mesh(stump, stumpMat));
    for (let i = 0; i < 6; i++) {
      // roots running out into the grass
      const a = (i / 6) * Math.PI * 2 + 0.4;
      const root = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 2.2, 4, 8), kit?.barkDark ? stumpMat : barkDark);
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

    // ---- shared batches: hundreds of planks, reeds and books drawn as a handful of meshes
    const batches = new Map<string, { geo: THREE.BufferGeometry; mat: THREE.Material; list: THREE.Matrix4[] }>();
    const unitBox = new THREE.BoxGeometry(1, 1, 1);
    const reed = new THREE.CylinderGeometry(0.5, 0.56, 1, 7);
    const tuft = new THREE.ConeGeometry(0.5, 1, 5);
    const pe = new THREE.Euler();
    const pq = new THREE.Quaternion();
    const piece = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, yy: number, z: number, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0): void => {
      const key = geo.uuid + mat.uuid;
      let bt = batches.get(key);
      if (!bt) batches.set(key, (bt = { geo, mat, list: [] }));
      bt.list.push(new THREE.Matrix4().compose(new THREE.Vector3(x, yy, z), pq.setFromEuler(pe.set(rx, ry, rz)).clone(), new THREE.Vector3(sx, sy, sz)));
    };
    const flush = (): void => {
      for (const bt of batches.values()) {
        const mesh = new THREE.InstancedMesh(bt.geo, bt.mat, bt.list.length);
        bt.list.forEach((m, i) => mesh.setMatrixAt(i, m));
        mesh.instanceMatrix.needsUpdate = true;
        mesh.castShadow = mesh.receiveShadow = true;
        mesh.computeBoundingSphere();
        this.group.add(mesh);
      }
      batches.clear();
    };
    const rnd = (i: number): number => {
      const v = Math.sin(i * 127.1 + 311.7) * 43758.5453;
      return v - Math.floor(v);
    };

    // ---- the hut: every wall is a row of hand-cut planks, no two quite alike
    const HY = DECK + 0.12;
    const KS = 0.85; // the model pieces are built for people; the house is Calmling-sized
    const HW = 2.55; // half width
    const HD = 1.7; // half depth
    const HH = kit ? 2.65 : 2.1; // wall height
    const tones = [plank, L(0xd4aa72), L(0xb98c58), plankDark];
    let seed = 1;
    /** A plank wall from a to b. `gap(u, yLow, yHigh)` says where a doorway or window leaves a hole. */
    const wall = (ax: number, az: number, bx: number, bz: number, gap: (u: number) => [number, number] | null): void => {
      const len = Math.hypot(bx - ax, bz - az);
      const ry = -Math.atan2(bz - az, bx - ax);
      const n = Math.round(len / 0.27);
      for (let i = 0; i < n; i++) {
        const u = (i + 0.5) / n;
        const px = ax + (bx - ax) * u;
        const pz = az + (bz - az) * u;
        const top = HH + rnd(seed) * 0.07;
        const mat = tones[Math.floor(rnd(seed + 7) * tones.length)];
        const w = len / n - 0.012;
        const hole = gap(u * len - len / 2);
        const span = (y0: number, y1: number): void => {
          if (y1 - y0 > 0.04) piece(unitBox, mat, px, HY + (y0 + y1) / 2, pz, w, y1 - y0, 0.09 + rnd(seed + 3) * 0.02, 0, ry, (rnd(seed + 5) - 0.5) * 0.012);
        };
        if (hole) {
          span(0, hole[0]);
          span(hole[1], top);
        } else span(0, top);
        seed += 11;
      }
    };
    const DOOR = 0.66; // half width of the doorway
    const WZ0 = -0.25; // the window, along the right-hand wall
    const WZ1 = 0.95;
    const WX = HW + 0.05;
    const WC = (WZ0 + WZ1) / 2;
    const RY = HY + HH + 0.12;
    const RISE = 2.35;
    const RUN = HD + 0.85;
    const DROP = 0.42; // how far the eaves hang below the top of the walls
    const SLOPE = Math.atan2(RISE + DROP, RUN);
    const SLEN = Math.hypot(RISE + DROP, RUN);
    const ROWS = 7;
    const RIDGE = RY + RISE;
    if (kit) {
      // ---- a cabin of whole logs, bark still on, notched together at the corners.
      // The door, the windows and their shutters are carpentered pieces set into the log walls.
      const sides: THREE.BufferGeometry[] = [];
      const ends: THREE.BufferGeometry[] = [];
      const LR = 0.138; // log radius
      const logM = new THREE.Matrix4();
      /** One log from a to b (house space), with pale sawn ends. */
      const log = (ax: number, ay: number, az: number, bx: number, by: number, bz: number, r = LR): void => {
        const d = new THREE.Vector3(bx - ax, by - ay, bz - az);
        const len = d.length();
        if (len < 0.12) return;
        const rr = r * (0.94 + rnd(seed++) * 0.12);
        const g = new THREE.CylinderGeometry(rr, rr * (0.95 + rnd(seed++) * 0.08), len, 10, 1, true);
        const uv = g.attributes.uv;
        const turn = rnd(seed++);
        for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 0.5 + turn, uv.getY(i) * len * 0.32 + turn);
        logM.compose(new THREE.Vector3((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()), new THREE.Vector3(1, 1, 1));
        sides.push(g.applyMatrix4(logM));
        for (const s2 of [-1, 1]) {
          const cap = new THREE.CircleGeometry(rr, 10);
          cap.rotateX(-s2 * Math.PI / 2);
          cap.translate(0, (s2 * len) / 2, 0);
          ends.push(cap.applyMatrix4(logM));
        }
      };
      type Hole = [number, number, number, number]; // along the wall from..to, and from..to in height
      const DOORW = 0.6;
      const WINW = 0.6;
      const WY0 = 0.86;
      const WY1 = 2.36;
      /** A wall of stacked logs along one axis, leaving the holes open. */
      const logWall = (alongX: boolean, fixed: number, half: number, lift: number, holes: Hole[], rows: number): void => {
        for (let k = 0; k < rows; k++) {
          const yy = HY + LR + lift + k * LR * 1.9;
          const cut = holes.filter((h) => yy - HY > h[2] - 0.06 && yy - HY < h[3] + 0.06).sort((p1, p2) => p1[0] - p2[0]);
          let from = -half - 0.24 - rnd(seed++) * 0.1;
          const end = half + 0.24 + rnd(seed++) * 0.1;
          for (const h of [...cut, [end, end, 0, 0] as Hole]) {
            const to = h[0];
            if (alongX) log(from, yy, fixed, to, yy, fixed);
            else log(fixed, yy, from, fixed, yy, to);
            from = h[1];
          }
        }
      };
      const ROWSL = Math.floor((HH - 0.05) / (LR * 1.9));
      logWall(true, HD, HW, 0, [[-1.7 - WINW, -1.7 + WINW, WY0, WY1], [-DOORW, DOORW, 0, 2.2], [1.7 - WINW, 1.7 + WINW, WY0, WY1]], ROWSL);
      logWall(true, -HD, HW, 0, [[-WINW, WINW, WY0, WY1]], ROWSL);
      logWall(false, -HW, HD, LR * 0.95, [[0.85 - WINW, 0.85 + WINW, WY0, WY1]], ROWSL);
      logWall(false, HW, HD, LR * 0.95, [], ROWSL);
      // the gable ends carry on up in shorter and shorter logs to the ridge
      const RYK = HY + HH + 0.12;
      for (const sx of [-HW, HW]) {
        for (let yy = HY + LR * 0.95 + ROWSL * LR * 1.9 + LR; yy < RYK + 2.35 - 0.2; yy += LR * 1.9) {
          const halfLen = Math.max(0, (HD + 0.5) * (1 - (yy - RYK) / 2.35));
          log(sx, yy, -Math.min(halfLen, HD + 0.3), sx, yy, Math.min(halfLen, HD + 0.3));
        }
      }
      // the deck is edged with a ring of logs and carried on joists that run out under it
      for (let i = 0; i < 10; i++) {
        const a0 = (i / 10) * Math.PI * 2;
        const a1 = ((i + 1) / 10) * Math.PI * 2;
        log(Math.cos(a0) * 4.24, DECK + 0.04, Math.sin(a0) * 4.24, Math.cos(a1) * 4.24, DECK + 0.04, Math.sin(a1) * 4.24, 0.13);
      }
      for (let i = 0; i < 8; i++) {
        const a0 = (i / 8) * Math.PI * 2 + 0.2;
        log(Math.cos(a0) * 2.3, DECK - 0.24, Math.sin(a0) * 2.3, Math.cos(a0) * 4.45, DECK - 0.2, Math.sin(a0) * 4.45, 0.1);
      }
      // upright posts either side of the door and windows hide the cut ends
      for (const dx of [-DOORW - 0.02, DOORW + 0.02]) log(dx, HY, HD, dx, HY + 2.3, HD, 0.1);
      const barkMat = new THREE.MeshLambertMaterial({ map: kit.bark, color: 0xf2d2b0 });
      const endMat = new THREE.MeshLambertMaterial({ color: 0xe6c08e });
      for (const [list, mat] of [[sides, barkMat], [ends, endMat]] as [THREE.BufferGeometry[], THREE.Material][]) {
        const m = new THREE.Mesh(mergeGeometries(list), mat);
        m.castShadow = m.receiveShadow = true;
        this.group.add(m);
      }
      // carpentered pieces, laid out in the kit's own 4 m by 6 m plan and turned to face the ladder
      const cot = new THREE.Group();
      cot.position.y = HY;
      cot.scale.setScalar(KS);
      cot.rotation.y = -Math.PI / 2;
      const put = (name: string, x: number, yy: number, z: number, ry = 0, parent: THREE.Object3D = cot): THREE.Group => {
        const g = kit.make(name);
        g.position.set(x, yy, z);
        g.rotation.y = ry;
        parent.add(g);
        return g;
      };
      const Q = Math.PI / 2;
      for (const cx of [-1, 1]) for (const cz of [-2, 0, 2]) put('Floor_WoodLight', cx, 0.012, cz);
      const windowAt = (x: number, z: number, ry: number, shutters: boolean): void => {
        put('Window_Wide_Round1', x, 0, z, ry);
        if (shutters) put('WindowShutters_Wide_Round_Open', x, 0, z, ry);
      };
      windowAt(2, -2, Q, true);
      windowAt(2, 2, Q, true);
      windowAt(-2, 0, -Q, false);
      windowAt(1, 3, 0, true);
      const frame = put('DoorFrame_Round_WoodDark', 2, 0, 0, Q);
      const door = put('Door_1_Round', -0.56, 0, 0.06, 0, frame);
      door.rotation.y = -1.95; // standing open
      // vines find their way up the logs and over the eaves
      put('Prop_Vine1', 2.2, 2.95, 1.05, Q);
      put('Prop_Vine4', 2.2, 2.9, -2.8, Q);
      put('Prop_Vine1', 0.2, 2.95, 3.2, 0);
      put('Prop_Vine4', -2.2, 2.9, -1.1, -Q);
      put('Prop_Vine1', -1.2, 3.3, -3.2, Math.PI);
      this.group.add(cot);
    } else {
    wall(-HW, -HD, HW, -HD, () => null);
    wall(-HW, HD, HW, HD, (u) => (Math.abs(u) < DOOR ? [0, 1.72] : null));
    wall(-HW, -HD, -HW, HD, () => null);
    wall(HW, -HD, HW, HD, (u) => (u > WZ0 && u < WZ1 ? [0.82, 1.62] : null));
    // log posts at the corners, and a beam tying the walls together
    for (const sx of [-HW, HW]) for (const sz of [-HD, HD]) piece(reed, bark, sx, HY + (HH + 0.16) / 2, sz, 0.34, HH + 0.16, 0.34);
    for (const sz of [-HD, HD]) piece(unitBox, beam, 0, HY + HH + 0.06, sz, HW * 2 + 0.3, 0.16, 0.2);
    for (const sx of [-HW, HW]) piece(unitBox, beam, sx, HY + HH + 0.06, 0, 0.2, 0.16, HD * 2 + 0.3);
    // skirting log round the foot of the walls
    for (const sz of [-HD - 0.06, HD + 0.06]) for (const side of [-1, 1]) {
      if (sz > 0) piece(unitBox, barkDark, side * (HW + DOOR) / 2, HY + 0.07, sz, HW - DOOR, 0.14, 0.12);
      else if (side > 0) piece(unitBox, barkDark, 0, HY + 0.07, sz, HW * 2, 0.14, 0.12);
    }
    // the doorway: a stout frame, an arched top, and the door standing open
    for (const sx of [-DOOR - 0.07, DOOR + 0.07]) piece(unitBox, beam, sx, HY + 0.9, HD + 0.02, 0.15, 1.8, 0.24);
    piece(unitBox, beam, 0, HY + 1.8, HD + 0.02, DOOR * 2 + 0.44, 0.17, 0.26);
    {
      const leaf = new THREE.Group();
      for (let i = 0; i < 4; i++) {
        const b2 = new THREE.Mesh(unitBox, tones[(i + 1) % 3]);
        b2.scale.set(0.31, 1.66, 0.07);
        b2.position.set(0.17 + i * 0.32, 0.86, 0);
        leaf.add(b2);
      }
      for (const yy of [0.35, 1.35]) {
        const bar = new THREE.Mesh(unitBox, beam);
        bar.scale.set(1.26, 0.1, 0.1);
        bar.position.set(0.66, yy, 0.05);
        leaf.add(bar);
      }
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), L(0xd9a441));
      knob.position.set(1.14, 0.86, 0.09);
      leaf.add(knob);
      leaf.position.set(-DOOR, HY + 0.03, HD + 0.1);
      leaf.rotation.y = 2.05; // swung right back against the wall
      add(leaf);
    }
    // the window: frame, cross bars, a pair of painted shutters
    const teal = L(0x4f9aa8);
    for (const zz of [WZ0 - 0.05, WZ1 + 0.05]) piece(unitBox, beam, WX, HY + 1.22, zz, 0.16, 0.98, 0.11);
    for (const yy of [0.78, 1.66]) piece(unitBox, beam, WX, HY + yy, WC, 0.18, 0.11, WZ1 - WZ0 + 0.22);
    piece(unitBox, beam, WX, HY + 1.22, WC, 0.07, 0.8, 0.05);
    piece(unitBox, beam, WX, HY + 1.22, WC, 0.07, 0.05, WZ1 - WZ0);
    for (const [zz, ry] of [[WZ0 - 0.36, 0.5], [WZ1 + 0.36, -0.5]]) {
      for (let i = 0; i < 3; i++) piece(unitBox, teal, WX + 0.1, HY + 1.22, zz + (i - 1) * 0.17, 0.05, 0.86, 0.16, 0, ry * 0.25, 0);
      piece(unitBox, L(0x3c7f8c), WX + 0.13, HY + 1.22, zz, 0.04, 0.08, 0.5, 0, ry * 0.25, 0);
    }
    // the floor: boards laid across the room
    for (let i = 0; i < 13; i++) piece(unitBox, tones[(i * 2 + 1) % 3], -HW + 0.2 + i * 0.4, HY + 0.012, 0, 0.385, 0.03, HD * 2 - 0.1);

    // ---- the thatched roof: rows of reed bundles, each lapped over the row below
    for (const sx of [-HW - 0.03, HW + 0.03]) {
      // gable ends, planked
      const tri = new THREE.Shape();
      tri.moveTo(-HD - 0.12, 0);
      tri.lineTo(HD + 0.12, 0);
      tri.lineTo(0, RISE * (HD + 0.12) / RUN + 0.5);
      const gable = new THREE.Mesh(new THREE.ExtrudeGeometry(tri, { depth: 0.1, bevelEnabled: false }), plankDark);
      gable.position.set(sx - 0.05, RY - 0.06, 0);
      gable.rotation.y = Math.PI / 2;
      add(gable);
    }
    // a stone chimney through the back slope
    for (let i = 0; i < 7; i++) piece(unitBox, L([0x9a958e, 0xb3aca0, 0x847f79][i % 3]), -1.5 + (rnd(seed++) - 0.5) * 0.04, RY + 0.9 + i * 0.3, -1.25, 0.62 - (i > 5 ? -0.12 : 0), 0.31, 0.62 - (i > 5 ? -0.12 : 0), 0, (rnd(seed++) - 0.5) * 0.12, 0);
    }
    for (const side of [-1, 1]) {
      for (let c = 0; c < ROWS; c++) {
        const t = (c + 0.5) / ROWS;
        const cols = 20;
        for (let j = 0; j < cols; j++) {
          const r1 = rnd(seed++);
          const r2 = rnd(seed++);
          const x = -HW - 0.62 + ((j + 0.5 + (c % 2) * 0.5) / cols) * (HW * 2 + 1.24);
          const along = t + (r1 - 0.5) * 0.03;
          const lift = 0.1 + (ROWS - c) * 0.012 + r2 * 0.05;
          const yy = RIDGE - along * (RISE + DROP) + Math.cos(SLOPE) * lift;
          const zz = side * (along * RUN + Math.sin(SLOPE) * lift);
          piece(reed, (j + c) % 3 === 0 ? thatchDark : thatch, x, yy, zz, 0.36 + r2 * 0.06, (SLEN / ROWS) * (1.5 + r1 * 0.25), 0.3, side * (Math.PI / 2 + SLOPE - 0.07), 0, (r1 - 0.5) * 0.1);
        }
      }
      // a ragged fringe along the eaves
      for (let k = 0; k < 26; k++) {
        const r1 = rnd(seed++);
        piece(tuft, k % 2 ? thatch : thatchDark, -HW - 0.6 + (k / 25) * (HW * 2 + 1.2), RY - DROP - 0.12, side * (RUN + 0.08), 0.36, 0.55 + r1 * 0.3, 0.36, Math.PI + side * 0.75, 0, 0);
      }
      // barge boards finishing the gable ends
      for (const sx of [-HW - 0.6, HW + 0.6]) piece(unitBox, beam, sx, RIDGE - (RISE + DROP) / 2 + 0.05, side * (RUN / 2), 0.1, 0.2, SLEN + 0.2, side * SLOPE, 0, 0);
    }
    // the ridge: a pole with a cap of short reeds folded over it
    piece(reed, beam, 0, RIDGE + 0.2, 0, 0.22, HW * 2 + 1.7, 0.22, 0, 0, Math.PI / 2);
    for (let k = 0; k < 24; k++) piece(reed, k % 2 ? thatchDark : thatch, -HW - 0.55 + (k / 23) * (HW * 2 + 1.1), RIDGE + 0.1, 0, 0.3, 0.75, 0.42, Math.PI / 2, 0, (rnd(seed++) - 0.5) * 0.2);
    // moss and a few self-sown plants have settled into the thatch
    const mossGeo = new THREE.SphereGeometry(1, 8, 6);
    const mossy = [L(0x7f8f3a), L(0x8f9a44), L(0x6a7f34)];
    for (let k = 0; k < 18; k++) {
      const side = k % 2 ? 1 : -1;
      const along = 0.08 + rnd(seed++) * 0.84;
      const mx = (rnd(seed++) - 0.5) * (HW * 2 + 0.8);
      const sc = 0.1 + rnd(seed++) * 0.16;
      piece(mossGeo, mossy[k % 3], mx, RIDGE - along * (RISE + DROP) + Math.cos(SLOPE) * 0.3, side * (along * RUN + Math.sin(SLOPE) * 0.3), sc * 1.5, sc * 0.4, sc, side * SLOPE, 0, 0);
    }
    flush();

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
    beacon.position.set(0, RIDGE + 0.62, 0);
    this.group.add(beacon);
    const warm = new THREE.MeshBasicMaterial({ color: 0xffb84a, fog: false });
    this.glow.push(warm);

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
        } else r = 4.25 - Math.min(1, (py - 3.5) / 0.5) * 1.12;
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

    // ---- indoors: a real little room, furnished, with space to potter about
    {
      const rm = (m: THREE.Object3D, x: number, yy: number, z: number, ry = 0): THREE.Object3D => {
        m.position.set(x, HY + yy, z);
        m.rotation.y = ry;
        m.traverse((o) => ((o as THREE.Mesh).receiveShadow = true));
        this.group.add(m);
        return m;
      };
      const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material, sx = 1, sy = 1, sz = 1): THREE.Mesh => {
        const m = new THREE.Mesh(geo, mat);
        m.scale.set(sx, sy, sz);
        return m;
      };
      const cyl = new THREE.CylinderGeometry(1, 1, 1, 20);
      let bedX = 0;
      let bedZ = 0;
      let shX = 0;
      let shZ = 0;
      let chX = 0;
      let chZ = 0;
      let chestX = 0;
      let chestZ = 0;
      if (kit) {
        // furnished from the same family of models as the house itself
        const P = 0.74;
        const prop = (name: string, x: number, z: number, ry = 0, sc = P, yy = 0, swap?: { name: string; mat: THREE.Material }): THREE.Group => {
          const g = kit.make(name, swap);
          g.scale.setScalar(sc);
          g.position.set(x, HY + yy, z);
          g.rotation.y = ry;
          this.group.add(g);
          return g;
        };
        const pane = new THREE.MeshBasicMaterial({ color: 0xffb84a, fog: false, side: THREE.DoubleSide, transparent: true, opacity: 0.2, depthWrite: false });
        this.pane = pane;
        for (const [px, pz, ry] of [[-1.7, HD - 0.1, 0], [1.7, HD - 0.1, 0], [0, -HD + 0.1, 0], [-HW + 0.1, 0.85, Math.PI / 2]]) rm(mesh(new THREE.PlaneGeometry(0.95, 1.2), pane), px, 1.6, pz, ry);
        // the rug: two rings
        rm(mesh(cyl, this.rugMat, 1.3, 0.03, 1.0), 0.15, 0.04, 0.2);
        rm(mesh(cyl, this.rugMat2, 1.0, 0.034, 0.76), 0.15, 0.042, 0.2);
        rm(mesh(cyl, this.rugMat, 0.55, 0.038, 0.42), 0.15, 0.044, 0.2);
        // the bed wears whichever quilt is chosen: its cloth takes the quilt's colour
        const cloth = kit.material('MI_Trim_Cloth');
        if (cloth) {
          this.quiltKit = cloth.clone();
          this.quiltKit.name = 'quilt';
        }
        bedX = -1.5;
        bedZ = -0.72;
        prop('Bed_Twin1', bedX, bedZ, Math.PI / 2, P, 0, this.quiltKit ? { name: 'MI_Trim_Cloth', mat: this.quiltKit } : undefined);
        prop('Nightstand_Shelf', -0.2, -HD + 0.52, 0);
        prop('Book_Stack_1', -0.28, -HD + 0.52, 0.4, P, 1.21 * P);
        prop('Candle_1', -0.05, -HD + 0.55, 0, 1.3, 1.21 * P);
        rm(mesh(ball, warm, 0.035, 0.06, 0.035), -0.05, 1.21 * P + 0.2, -HD + 0.55);
        shX = 1.35;
        shZ = -HD + 0.5;
        prop('Bookcase_2', shX, shZ, 0);
        chestX = HW - 0.72;
        chestZ = -0.2;
        prop('Chest_Wood', chestX, chestZ, -Math.PI / 2);
        chX = -1.8;
        chZ = 0.85;
        prop('Chair_1', chX, chZ, 2.3, 0.85);
        prop('Stool', -1.15, 1.1, 0.4);
        prop('Mug', -1.15, 1.1, 1.0, P, 0.58 * P);
        prop('Cabinet', 1.6, HD - 0.5, Math.PI);
        prop('BookGroup_Medium_1', 1.55, HD - 0.5, Math.PI, P, 1.0 * P);
        prop('Vase_2', HW - 0.62, 0.95, 0.5, 0.55);
        for (let k = 0; k < 5; k++) rm(mesh(ball, k % 2 ? leaf : leafLight, 0.06, 0.3, 0.12), HW - 0.62 + Math.cos(k * 1.26) * 0.08, 0.5, 0.95 + Math.sin(k * 1.26) * 0.08, k * 1.26).rotation.z = 0.35;
        // round rafters across the open roof
        for (const xx of [-1.6, 0, 1.6]) {
          const raft = mesh(new THREE.CylinderGeometry(0.09, 0.1, HD * 2 + 0.2, 8), beam);
          raft.rotation.x = Math.PI / 2;
          rm(raft, xx, HH + 0.12, 0);
        }
        // a candle wheel hanging from the roof, with a soft light inside it
        prop('Chandelier', 0.1, 0.2, 0, 0.62, HH + 0.95);
        rm(mesh(new THREE.SphereGeometry(1, 14, 10), this.lampMat, 0.15, 0.15, 0.15), 0.1, HH + 0.25, 0.2);
        this.lampPos.set(0.1, HY + HH + 0.05, 0.2);
      } else {
        // window panes and the little attic lights glow warm from outside after dark
        const pane = new THREE.MeshBasicMaterial({ color: 0xffb84a, fog: false, side: THREE.DoubleSide, transparent: true, opacity: 0.55 });
        this.pane = pane;
        rm(mesh(new THREE.PlaneGeometry(WZ1 - WZ0, 0.8), pane), HW + 0.02, 1.22, WC, Math.PI / 2);
        for (const sx of [-HW - 0.1, HW + 0.1]) rm(mesh(new THREE.CircleGeometry(0.26, 14), warm), sx, HH + 0.75, 0, sx > 0 ? Math.PI / 2 : -Math.PI / 2);
        // rafters across the open roof
        for (const xx of [-1.5, 0, 1.5]) piece(unitBox, beam, xx, HY + HH + 0.1, 0, 0.14, 0.16, HD * 2);
        // the rug: two rings and a fringe
        rm(mesh(cyl, this.rugMat, 1.45, 0.03, 1.1), 0.1, 0.035, 0.25);
        rm(mesh(cyl, this.rugMat2, 1.12, 0.034, 0.84), 0.1, 0.037, 0.25);
        rm(mesh(cyl, this.rugMat, 0.62, 0.038, 0.46), 0.1, 0.039, 0.25);
        // the bed, tucked into the back corner
        bedX = -1.5;
        bedZ = -1.3;
        piece(unitBox, plankDark, bedX, HY + 0.2, bedZ, 2.05, 0.22, 1.12);
        for (const sx of [-0.98, 0.98]) for (const sz of [-0.5, 0.5]) piece(reed, bark, bedX + sx, HY + 0.22, bedZ + sz, 0.16, 0.44, 0.16);
        piece(unitBox, beam, bedX - 1.0, HY + 0.62, bedZ, 0.1, 0.72, 1.16);
        rm(mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.1, 18, 1, false, 0, Math.PI), beam), bedX - 1.0, 0.96, bedZ, Math.PI / 2).rotation.z = Math.PI / 2;
        rm(mesh(unitBox, L(0xfff6e6), 1.9, 0.2, 1.0), bedX, 0.4, bedZ);
        rm(mesh(unitBox, this.quiltMat, 1.25, 0.13, 1.06), bedX + 0.36, 0.5, bedZ);
        rm(mesh(unitBox, this.quiltMat2, 0.2, 0.14, 1.07), bedX - 0.2, 0.505, bedZ);
        rm(mesh(ball, L(0xffffff), 0.3, 0.13, 0.4), bedX - 0.66, 0.56, bedZ);
        // bedside stump with a candle and a cup
        piece(reed, bark, -0.2, HY + 0.24, -1.62, 0.52, 0.48, 0.52);
        rm(mesh(cyl, L(0xfff4e0), 0.035, 0.18, 0.035), -0.25, 0.57, -1.62);
        rm(mesh(ball, warm, 0.04, 0.07, 0.04), -0.25, 0.72, -1.62);
        rm(mesh(cyl, L(0x8fb7c9), 0.06, 0.09, 0.06), -0.07, 0.52, -1.52);
        // bookshelf against the back wall
        shX = 1.55;
        shZ = -HD + 0.28;
        for (const sx of [-0.78, 0.78]) piece(unitBox, beam, shX + sx, HY + 0.95, shZ, 0.08, 1.9, 0.36);
        for (let k = 0; k < 4; k++) piece(unitBox, plankDark, shX, HY + 0.12 + k * 0.58, shZ, 1.52, 0.06, 0.36);
        piece(unitBox, plankDark, shX, HY + 0.95, shZ - 0.16, 1.56, 1.9, 0.04);
        const bookCols = [0xd9603a, 0x4f9aa8, 0xe8b84a, 0x7a4f8f, 0x5fa05a, 0xc8556f, 0x3f6fa8].map((c) => L(c));
        for (let k = 0; k < 2; k++) {
          let bx = shX - 0.66;
          for (let i = 0; bx < shX + 0.6; i++) {
            const w = 0.06 + rnd(seed++) * 0.06;
            const h = 0.32 + rnd(seed++) * 0.14;
            piece(unitBox, bookCols[(i + k * 3) % bookCols.length], bx + w / 2, HY + 0.15 + k * 0.58 + h / 2, shZ + 0.02, w, h, 0.24, 0, 0, i % 6 === 5 ? 0.18 : 0);
            bx += w + 0.012 + (i % 6 === 5 ? 0.05 : 0);
          }
        }
        [pink, aqua, gold, violet].forEach((m, i) => {
          rm(mesh(cyl, L(0xdff3ff, { transparent: true, opacity: 0.45 }), 0.1, 0.26, 0.1), shX - 0.5 + i * 0.34, 1.44, shZ + 0.02);
          rm(mesh(ball, m, 0.07, 0.07, 0.07), shX - 0.5 + i * 0.34, 1.41, shZ + 0.02);
        });
        rm(mesh(ball, leaf, 0.2, 0.16, 0.2), shX + 0.45, 2.02, shZ);
        rm(mesh(cyl, L(0xb5683a), 0.12, 0.16, 0.12), shX + 0.45, 1.92, shZ);
        // an armchair by the door
        chX = -1.85;
        chZ = 1.05;
        const cushion = L(0x5fa8a0);
        const chair = new THREE.Group();
        chair.add(mesh(ball, cushion, 0.5, 0.2, 0.46).translateY(0.38), mesh(ball, cushion, 0.48, 0.44, 0.17).translateY(0.74).translateZ(-0.36));
        for (const sx of [-0.46, 0.46]) chair.add(mesh(ball, L(0x4c8f88), 0.14, 0.2, 0.42).translateX(sx).translateY(0.5));
        chair.add(mesh(cyl, bark, 0.42, 0.22, 0.4).translateY(0.13));
        chair.add(mesh(ball, L(0xffd65a), 0.2, 0.16, 0.1).translateY(0.62).translateZ(-0.2));
        rm(chair, chX, 0, chZ, 0.9);
        // the chest where rugs, quilts and lanterns are kept
        const chest = new THREE.Group();
        chest.add(mesh(unitBox, plankDark, 0.95, 0.46, 0.56).translateY(0.24));
        const lid = mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.95, 12, 1, false, 0, Math.PI), plank);
        lid.rotation.set(0, 0, Math.PI / 2);
        lid.rotation.order = 'ZYX';
        lid.position.y = 0.47;
        chest.add(lid);
        for (const sx of [-0.3, 0.3]) chest.add(mesh(unitBox, L(0xd9a441), 0.07, 0.5, 0.6).translateX(sx).translateY(0.25));
        chest.add(mesh(unitBox, L(0xd9a441), 0.12, 0.14, 0.05).translateY(0.42).translateZ(0.29));
        chestX = HW - 0.42;
        chestZ = -0.95;
        rm(chest, chestX, 0, chestZ, -Math.PI / 2);
        // curtains, pictures, bunting and a couple of pot plants
        for (const zz of [WZ0 - 0.12, WZ1 + 0.12]) rm(mesh(unitBox, L(0xf2c4a0), 0.05, 0.95, 0.22), HW - 0.09, 1.25, zz);
        piece(unitBox, beam, HW - 0.09, HY + 1.76, WC, 0.06, 0.06, WZ1 - WZ0 + 0.6);
        for (const [px, c] of [[-0.35, 0x9fd6ff], [0.3, 0xffd0a0]] as [number, number][]) {
          piece(unitBox, beam, px, HY + 1.45, -HD + 0.07, 0.5, 0.42, 0.04);
          rm(mesh(new THREE.PlaneGeometry(0.4, 0.32), new THREE.MeshBasicMaterial({ color: c })), px, 1.45, -HD + 0.095);
        }
        for (let i = 0; i < 11; i++) {
          const fl = rm(mesh(new THREE.ConeGeometry(0.11, 0.2, 3), L([0xff8fb8, 0xffd65a, 0x8fe9ff, 0xb9a0ff, 0x9fe07a][i % 5]), 1, 1, 0.2), -HW + 0.1, 1.86 - Math.sin((i / 10) * Math.PI) * 0.14, -1.6 + i * 0.32, Math.PI / 2);
          fl.rotation.x = Math.PI;
        }
        for (const [px, pz] of [[HW - 0.4, HD - 0.4], [0.75, -HD + 0.3]]) {
          rm(mesh(cyl, L(0xb5683a), 0.17, 0.26, 0.17), px, 0.13, pz);
          for (let k = 0; k < 5; k++) rm(mesh(ball, k % 2 ? leaf : leafLight, 0.07, 0.3, 0.13), px + Math.cos(k * 1.26) * 0.1, 0.5, pz + Math.sin(k * 1.26) * 0.1, k * 1.26).rotation.z = 0.35;
        }
        rm(mesh(cyl, L(0xc9a46a), 0.5, 0.02, 0.34), 0, 0.03, HD - 0.55); // door mat
        // the lamp hanging from the ridge
        rm(mesh(cyl, rope, 0.012, RIDGE - HY - 2.5, 0.012), 0.1, (RIDGE - HY + 2.5) / 2, 0.2);
        rm(mesh(new THREE.SphereGeometry(1, 14, 10), this.lampMat, 0.2, 0.24, 0.2), 0.1, 2.4, 0.2);
        rm(mesh(new THREE.ConeGeometry(0.3, 0.16, 12, 1, true), beam), 0.1, 2.66, 0.2);
        this.lampPos.set(0.1, HY + 2.2, 0.2);
        flush();

      }

      // ---- things bought at the market that dress the outside of the house
      const boxG = new THREE.Group();
      boxG.add(mesh(unitBox, plankDark, 0.26, 0.2, WZ1 - WZ0 + 0.3).translateY(0.1));
      for (let k = 0; k < 7; k++) {
        boxG.add(mesh(ball, leaf, 0.1, 0.1, 0.1).translateY(0.24).translateZ(-0.6 + k * 0.2));
        boxG.add(mesh(ball, L([0xff8fb8, 0xffd65a, 0xb9a0ff][k % 3]), 0.065, 0.065, 0.065).translateY(0.34).translateZ(-0.6 + k * 0.2).translateX(0.04));
      }
      if (kit) {
        boxG.position.set(-1.7, HY + 0.7, HD + 0.26);
        boxG.rotation.y = Math.PI / 2;
      } else boxG.position.set(HW + 0.24, HY + 0.56, WC);
      const bunt = new THREE.Group();
      for (let i = 0; i < 16; i++) {
        const a2 = Math.PI / 2 + 0.5 + (i / 15) * (Math.PI * 2 - 1.0);
        const fl = mesh(new THREE.ConeGeometry(0.13, 0.26, 3), L([0xff8fb8, 0xffd65a, 0x8fe9ff, 0xb9a0ff, 0x9fe07a][i % 5]), 1, 1, 0.2);
        fl.position.set(Math.cos(a2) * 3.95, DECK + 0.86 - Math.abs(Math.sin(i * Math.PI)) * 0.1, Math.sin(a2) * 3.95);
        fl.rotation.set(Math.PI, -a2, 0);
        bunt.add(fl);
      }
      const wreath = new THREE.Group();
      wreath.add(mesh(new THREE.TorusGeometry(0.24, 0.07, 8, 18), leaf));
      for (let k = 0; k < 6; k++) wreath.add(mesh(ball, L([0xff8fb8, 0xffd65a][k % 2]), 0.05, 0.05, 0.05).translateX(Math.cos(k * 1.05) * 0.24).translateY(Math.sin(k * 1.05) * 0.24).translateZ(0.06));
      wreath.position.set(0, HY + (kit ? 2.42 : 2.02), HD + (kit ? 0.2 : 0.16));
      for (const [id, g] of [['windowbox', boxG], ['bunting', bunt], ['wreath', wreath]] as [string, THREE.Group][]) {
        g.visible = false;
        this.group.add(g);
        this.extras.set(id, g);
      }

      const at3 = (lx: number, ly: number, lz: number, out: THREE.Vector3): void => {
        const [wx, wz] = world(lx, lz);
        out.set(wx, y + ly, wz);
      };
      at3(0, HY + 0.04, HD - 1.05, this.inside.pos);
      at3(bedX + 0.25, HY + 0.56, bedZ, this.inside.bed);
      at3(bedX + 0.3, HY + 0.04, bedZ + 1.0, this.inside.bedside);
      at3(HW - (kit ? 0.42 : 0.24), HY + (kit ? 2.25 : 1.92), HD - (kit ? 0.42 : 0.24), this.inside.cam); // tucked in the corner by the door
      at3(-0.8, HY + 0.5, -0.6, this.inside.look);
      at3(0, 0, HD - 0.55, this.inside.door);
      at3(chestX - 0.5, 0, chestZ, this.inside.chest);
      at3(bedX + 0.2, 0, bedZ + 0.75, this.inside.bedEdge);
      this.inside.yaw = Math.PI + ROT; // walks in facing the room
      this.inside.bedYaw = Math.PI / 2 + ROT;
      // where a Calmling can walk indoors, and what is in the way
      const [rx, rz] = world(0, 0);
      this.room = { x: rx, z: rz, hw: HW - (kit ? 0.72 : 0.5), hd: HD - (kit ? 0.68 : 0.5), cos: Math.cos(ROT), sin: Math.sin(ROT), y: y + HY + 0.04, solids: [] };
      for (const [lx, lz, r] of [[bedX - 0.5, bedZ, 0.62], [bedX + 0.5, bedZ, 0.62], [-0.2, -1.62, 0.36], [shX - 0.4, shZ, 0.42], [shX + 0.4, shZ, 0.42], [chX, chZ, 0.5], [chestX, chestZ, 0.5]]) {
        const [wx, wz] = world(lx, lz);
        this.room.solids.push([wx, wz, r]);
      }
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

  /** Dress the room: rug, quilt and lamp colours. */
  setDecor(rug: number, quilt: number, lamp: number): void {
    this.rugMat.color.setHex(rug);
    this.rugMat2.color.setHex(rug).lerp(new THREE.Color(0xffffff), 0.72);
    this.quiltMat.color.setHex(quilt);
    this.quiltKit?.color.setHex(quilt).lerp(new THREE.Color(0xffffff), 0.25);
    this.quiltMat2.color.setHex(quilt).lerp(new THREE.Color(0xffffff), 0.75);
    this.lampColor.setHex(lamp);
    this.patchLamp.setHex(lamp).lerp(new THREE.Color(0xffffff), 0.35);
  }

  /** Show the market pieces that have been bought for the outside of the house. */
  setExtras(owned: Set<string>): void {
    for (const [id, g] of this.extras) g.visible = owned.has(id);
  }

  doorNear(p: THREE.Vector3): boolean {
    return Math.hypot(this.inside.door.x - p.x, this.inside.door.z - p.z) < 0.95;
  }

  chestNear(p: THREE.Vector3): boolean {
    return Math.hypot(this.inside.chest.x - p.x, this.inside.chest.z - p.z) < 1.0;
  }

  bedNear(p: THREE.Vector3): boolean {
    return Math.hypot(this.inside.bedEdge.x - p.x, this.inside.bedEdge.z - p.z) < 1.1;
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
    const lampGlow = 0.8 + 0.35 * night;
    this.lampMat.color.copy(this.lampColor).multiplyScalar(lampGlow);
    this.pane.opacity = 0.18 + 0.7 * night;
    this.patchLight.color.copy(indoors ? this.patchLamp : this.fireColor);
    if (indoors) {
      this.patchLight.position.copy(this.lampPos);
      this.patchLight.intensity = 1.9;
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
