import * as THREE from 'three';
import { SUMMIT, polylineAt, type Island } from './islandMap';

/** Nudges a point to the nearest dry, gentle ground. */
function settle(island: Island, x0: number, z0: number): [number, number] {
  const grad = { x: 0, z: 0 };
  let x = x0;
  let z = z0;
  for (let i = 0; i < 80; i++) {
    if (island.heightAt(x, z) > island.waterLevelAt(x, z) + 0.5 && island.gradientAt(x, z, grad) < 0.5) break;
    x = x0 + Math.cos(i * 2.4) * (2 + i * 0.6);
    z = z0 + Math.sin(i * 2.4) * (2 + i * 0.6);
  }
  return [x, z];
}

export interface Viewpoint {
  id: string;
  name: string;
  x: number;
  z: number;
  /** direction the view opens toward, as a camera yaw */
  yaw: number;
}

/** Mossy fallen logs at the island's best views: somewhere to rest and look. */
export class Viewpoints {
  readonly group = new THREE.Group();
  readonly spots: Viewpoint[] = [];

  constructor(island: Island) {
    const mouth = polylineAt(island.river, island.river.length - 150);
    const defs: [string, string, number, number, number][] = [
      ['summit', 'Top of the world', SUMMIT.x + 3, SUMMIT.z + 8, Math.PI],
      ['falls', 'Above the falls', island.falls.lip.x - 20, island.falls.lip.z - 4, Math.PI],
      ['bay', 'Edge of the bay', 20, 296, 0],
      ['mirror', 'Mirror Lake shore', island.lakes[1].x - island.lakes[1].r - 5, island.lakes[1].z, Math.PI / 2],
      ['ramp', 'The long view south', -150, -150, Math.PI],
      ['meadow', 'Meadow rise', 150, 100, -Math.PI / 2],
      ['mouth', 'Where the river ends', mouth.x - 14, mouth.z + 16, -Math.PI / 2],
      ['forest', 'A clearing in Mosswood', -200, 20, Math.PI / 2],
    ];
    const bark = new THREE.MeshLambertMaterial({ color: 0x7a5636 });
    const moss = new THREE.MeshLambertMaterial({ color: 0x6fae45 });
    const logGeo = new THREE.CylinderGeometry(0.3, 0.34, 2.6, 12).rotateZ(Math.PI / 2);
    const mossGeo = new THREE.SphereGeometry(1, 10, 8).scale(0.7, 0.12, 0.3);
    for (const [id, name, x0, z0, yaw] of defs) {
      const [x, z] = settle(island, x0, z0);
      const y = island.heightAt(x, z);
      const log = new THREE.Mesh(logGeo, bark);
      log.position.set(x, y + 0.2, z);
      log.rotation.y = yaw; // lies across the view
      log.castShadow = log.receiveShadow = true;
      const top = new THREE.Mesh(mossGeo, moss);
      top.position.set(x, y + 0.5, z);
      top.rotation.y = yaw;
      this.group.add(log, top);
      this.spots.push({ id, name, x, z, yaw });
    }
  }

  near(p: THREE.Vector3): Viewpoint | null {
    return this.spots.find((s) => Math.hypot(s.x - p.x, s.z - p.z) < 2.6) ?? null;
  }
}

/** Little towers of pebbles you can add to, one stone at a time. */
export class Cairns {
  readonly group = new THREE.Group();
  readonly max = 7;
  private stacks: { x: number; z: number; y: number; count: number; stones: THREE.Group }[] = [];
  private geo = new THREE.SphereGeometry(1, 12, 9);
  private mats = [0x8d8a86, 0xa39d94, 0x77736e, 0xb8b0a2].map((c) => new THREE.MeshLambertMaterial({ color: c }));

  constructor(island: Island) {
    const lake = island.lakes[0];
    for (const [x0, z0] of [[-10, 300], [60, 304], [lake.x - lake.r - 3, lake.z + 8], [island.lakes[1].x + 6, island.lakes[1].z + island.lakes[1].r + 4], [-26, 14]]) {
      const [x, z] = settle(island, x0, z0);
      const stones = new THREE.Group();
      stones.position.set(x, island.heightAt(x, z), z);
      this.group.add(stones);
      this.stacks.push({ x, z, y: stones.position.y, count: 0, stones });
      this.rebuild(this.stacks.length - 1);
    }
  }

  private rebuild(i: number): void {
    const s = this.stacks[i];
    s.stones.clear();
    // an empty spot still shows one base stone, so you can find it
    let y = 0;
    for (let k = 0; k < Math.max(1, s.count + 1); k++) {
      const r = 0.34 * Math.pow(0.84, k);
      const h = r * 0.42;
      const m = new THREE.Mesh(this.geo, this.mats[(i + k) % this.mats.length]);
      m.scale.set(r, h, r * 0.86);
      m.position.set(Math.sin(k * 2.1 + i) * 0.03, y + h, Math.cos(k * 1.7 + i) * 0.03);
      m.rotation.y = k * 1.3 + i;
      m.castShadow = true;
      s.stones.add(m);
      y += h * 1.8;
    }
  }

  near(p: THREE.Vector3): number {
    return this.stacks.findIndex((s) => Math.hypot(s.x - p.x, s.z - p.z) < 1.8);
  }

  canAdd(i: number): boolean {
    return this.stacks[i].count < this.max;
  }

  /** Adds a pebble; returns the new height of the tower. */
  add(i: number): number {
    const s = this.stacks[i];
    if (s.count < this.max) {
      s.count++;
      this.rebuild(i);
    }
    return s.count;
  }

  get tallest(): number {
    return Math.max(0, ...this.stacks.map((s) => s.count));
  }

  serialize(): number[] {
    return this.stacks.map((s) => s.count);
  }

  load(data: number[] | undefined): void {
    this.stacks.forEach((s, i) => {
      s.count = Math.min(this.max, Math.max(0, Math.floor(data?.[i] ?? 0)));
      this.rebuild(i);
    });
  }
}

/** A kite on a string that rides the wind behind you and climbs when you run. */
export class Kite {
  readonly group = new THREE.Group();
  flying = false;
  private kite = new THREE.Group();
  private line: THREE.Line;
  private pos = new THREE.Vector3();
  private amount = 0;

  constructor() {
    const shape = new THREE.BufferGeometry();
    shape.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.62, 0, -0.42, 0.08, 0, 0.42, 0.08, 0, 0, -0.62, 0], 3));
    shape.setAttribute('color', new THREE.Float32BufferAttribute([1, 0.45, 0.5, 1, 0.8, 0.3, 0.45, 0.75, 1, 0.6, 0.9, 0.5], 3));
    shape.setIndex([0, 1, 2, 1, 3, 2]);
    shape.computeVertexNormals();
    this.kite.add(new THREE.Mesh(shape, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })));
    for (let i = 0; i < 4; i++) {
      const bow = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.09), new THREE.MeshBasicMaterial({ color: [0xff7a8a, 0xffd23c, 0x7fc8ff, 0x9fe07a][i], side: THREE.DoubleSide }));
      bow.position.set(0, -0.82 - i * 0.24, 0);
      bow.userData.i = i;
      this.kite.add(bow);
    }
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 1, 0], 3));
    this.line = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 }));
    this.line.frustumCulled = false;
    this.group.add(this.kite, this.line);
    this.group.visible = false;
  }

  update(dt: number, time: number, hand: THREE.Vector3, yaw: number, speed: number): void {
    this.amount += ((this.flying ? 1 : 0) - this.amount) * (1 - Math.exp(-2.5 * dt));
    this.group.visible = this.amount > 0.02;
    if (!this.group.visible) {
      this.pos.copy(hand);
      return;
    }
    // it trails behind and climbs with your pace, swaying on the gusts
    const back = 3.5 + speed * 0.35;
    const up = (4.5 + speed * 0.55 + Math.sin(time * 0.9) * 0.6) * this.amount;
    const tx = hand.x - Math.sin(yaw) * back * this.amount + Math.sin(time * 0.7) * 1.2;
    const tz = hand.z - Math.cos(yaw) * back * this.amount + Math.cos(time * 0.53) * 1.2;
    const k = 1 - Math.exp(-1.8 * dt);
    this.pos.x += (tx - this.pos.x) * k;
    this.pos.y += (hand.y + up - this.pos.y) * k;
    this.pos.z += (tz - this.pos.z) * k;
    this.kite.position.copy(this.pos);
    this.kite.rotation.set(-0.5, Math.atan2(hand.x - this.pos.x, hand.z - this.pos.z), Math.sin(time * 1.7) * 0.18);
    for (const c of this.kite.children) if (c.userData.i !== undefined) c.rotation.z = Math.sin(time * 5 + c.userData.i) * 0.5;
    const a = this.line.geometry.attributes.position;
    a.setXYZ(0, hand.x, hand.y, hand.z);
    a.setXYZ(1, this.pos.x, this.pos.y - 0.1, this.pos.z);
    a.needsUpdate = true;
  }
}
