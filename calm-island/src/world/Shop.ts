import * as THREE from 'three';
import { CalmlingModel, type CalmlingLook, type CalmlingPose, type SculptRig } from '../player/CalmlingModel';
import type { Colliders } from './Colliders';
import type { Island } from './islandMap';
import type { Kit } from './Kit';
import { bakeStatic } from './bake';

/** What Sampoyoshi sells. Costs are in starberries, moon melons and sun pods. */
export interface ShopItem {
  id: string;
  kind: 'rug' | 'quilt' | 'lamp' | 'home';
  name: string;
  note: string;
  color: number;
  cost: [number, number, number];
}
export const SHOP_ITEMS: ShopItem[] = [
  { id: 'rug-meadow', kind: 'rug', name: 'Meadow rug', note: 'Soft green, like the long grass', color: 0x7fb86a, cost: [2, 0, 0] },
  { id: 'rug-sunset', kind: 'rug', name: 'Sunset rug', note: 'Warm coral for the middle of the room', color: 0xe98a6a, cost: [0, 0, 2] },
  { id: 'rug-lilac', kind: 'rug', name: 'Lilac rug', note: 'The colour of the evening sky', color: 0xa890d8, cost: [0, 2, 0] },
  { id: 'quilt-rose', kind: 'quilt', name: 'Rose quilt', note: 'A pink patchwork for your bed', color: 0xf08fb0, cost: [1, 1, 0] },
  { id: 'quilt-leaf', kind: 'quilt', name: 'Leaf quilt', note: 'Stitched in forest greens', color: 0x6fae7a, cost: [0, 0, 2] },
  { id: 'quilt-honey', kind: 'quilt', name: 'Honey quilt', note: 'Golden, and very warm', color: 0xf0c060, cost: [0, 1, 1] },
  { id: 'lamp-rose', kind: 'lamp', name: 'Rose lantern', note: 'A blush of pink light indoors', color: 0xff9cc0, cost: [2, 0, 0] },
  { id: 'lamp-sea', kind: 'lamp', name: 'Sea-glass lantern', note: 'Cool and calm, like the bay', color: 0x8fe0f0, cost: [0, 2, 0] },
  { id: 'windowbox', kind: 'home', name: 'Window-box seeds', note: 'Flowers under the treehouse window', color: 0xff8fb8, cost: [1, 0, 1] },
  { id: 'bunting', kind: 'home', name: 'Deck bunting', note: 'Little flags strung round the deck', color: 0xffd65a, cost: [1, 1, 1] },
  { id: 'wreath', kind: 'home', name: 'Door wreath', note: 'Leaves and berries over your door', color: 0x62b04a, cost: [0, 1, 0] },
];

export const SAMPOYOSHI: CalmlingLook = {
  fur: 0xf2a94e, furLow: 0xf7bd6a, belly: 0xfad49a, iris: 0x7a5230, style: 'smooth', limbs: 0xf2a94e, scale: 1.12,
  extras: ['glasses', 'bandana', 'bigEars', 'apron'],
};

/**
 * Sampoyoshi's stall: a little thatched market hut by the river path, hung
 * with lanterns and stacked with rugs and quilts. He trades for fruit.
 */
export class Shop {
  readonly group = new THREE.Group();
  readonly x: number;
  readonly z: number;
  private keeper = new CalmlingModel(SAMPOYOSHI, false);

  /** Swap the shopkeeper's built-in body for his sculpted one. */
  useSculpt(model: THREE.Object3D, rig: SculptRig): void {
    this.keeper.useSculpt(model, rig);
  }
  private pose: CalmlingPose;
  private lamps: THREE.MeshBasicMaterial[] = [];
  private facing = 0;

  constructor(island: Island, colliders: Colliders, kit: Kit | null = null) {
    // a flat, dry, open spot beside the path that runs east along the river
    let x = 47;
    let z = 17;
    const grad = { x: 0, z: 0 };
    const tmp = { x: 0, z: 0 };
    for (let i = 0; i < 90; i++) {
      const cx = 47 + Math.cos(i * 2.4) * i * 0.45;
      const cz = 17 + Math.sin(i * 2.4) * i * 0.45;
      tmp.x = cx;
      tmp.z = cz;
      if (island.heightAt(cx, cz) > island.waterLevelAt(cx, cz) + 0.8 && island.gradientAt(cx, cz, grad) < 0.2 && island.path[0] !== undefined && !colliders.resolve(tmp, 3.2)) {
        x = cx;
        z = cz;
        break;
      }
    }
    this.x = x;
    this.z = z;
    const y = island.heightAt(x, z);
    this.group.position.set(x, y, z);
    this.facing = Math.PI; // the counter looks north, toward the path
    this.group.rotation.y = this.facing;

    const L = (color: number, extra: THREE.MeshLambertMaterialParameters = {}): THREE.MeshLambertMaterial => new THREE.MeshLambertMaterial({ color, ...extra });
    const wood = L(0xb98c58);
    const woodDark = L(0x8a5f3a);
    const beam = L(0x7a5230);
    const thatch = L(0xf0cc62);
    const thatchDark = L(0xd7ac46);
    const add = (m: THREE.Object3D, x2: number, y2: number, z2: number, rx = 0, ry = 0, rz = 0): THREE.Object3D => {
      m.position.set(x2, y2, z2);
      m.rotation.set(rx, ry, rz);
      m.traverse((o) => {
        (o as THREE.Mesh).castShadow = true;
        (o as THREE.Mesh).receiveShadow = true;
      });
      this.group.add(m);
      return m;
    };
    const box = (w: number, h: number, d: number, mat: THREE.Material): THREE.Mesh => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    const ball = new THREE.SphereGeometry(1, 12, 9);
    const orb = (r: number, mat: THREE.Material, sy = 1): THREE.Mesh => {
      const m = new THREE.Mesh(ball, mat);
      m.scale.set(r, r * sy, r);
      return m;
    };
    if (kit) {
      // a proper market pitch: a canopied stall, a hand cart of goods, barrels, crates and a string of lanterns
      const prop = (name: string, x2: number, z2: number, ry = 0, sc = 1, y2 = 0): THREE.Group => {
        const g = kit.make(name);
        g.scale.setScalar(sc);
        g.position.set(x2, y2, z2);
        g.rotation.y = ry;
        this.group.add(g);
        return g;
      };
      prop('Stall_Empty', 0, 0.55, 0, 1.45);
      prop('Stall_Cart_Empty', -3.1, 0.35, 0.28, 1.1);
      prop('Barrel_Apples', 2.05, 1.0, 0.3, 0.9);
      prop('Barrel', 2.75, 0.35, -0.4, 0.9);
      prop('Crate_Wooden', 2.2, -0.55, 0.5, 0.85);
      prop('FarmCrate_Apple', 2.2, -0.55, 0.3, 0.9, 0.75);
      prop('Bag', 1.55, 0.05, -0.5, 0.8);
      prop('Vase_2', 1.35, 1.35, 0.3, 0.8);
      const cloth = kit.material('MI_Banner');
      if (cloth) cloth.color.setHex(0xa98ad0); // his purple, on every awning
      prop('Pot_1', -1.15, -0.4, 0, 0.9);
      // two posts and a line of lanterns across the front
      for (const sx of [-4.4, 3.4]) add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 3.1, 7), beam), sx, 1.55, 1.55);
      for (let i = 0; i < 7; i++) {
        const t = i / 6;
        const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        this.lamps.push(mat);
        const g = new THREE.Group();
        g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.22, 4), beam));
        const b = orb(0.13, mat, 1.25);
        b.position.y = -0.24;
        g.add(b);
        add(g, -4.4 + t * 7.8, 3.0 - Math.sin(t * Math.PI) * 0.42, 1.55);
        b.castShadow = false;
      }
      // the goods: rolled rugs propped in the cart, quilts folded on the crate, seed pots on the counter
      [0x7fb86a, 0xe98a6a, 0xa890d8].forEach((c, i) => {
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 1.0, 12), L(c)), -3.5 + i * 0.36, 1.35 + (i % 2) * 0.05, 0.35, 0.16, 0, 0.1 * (i - 1));
        add(new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.03, 6, 12), L(0xfff0d8)), -3.5 + i * 0.36, 1.85 + (i % 2) * 0.05, 0.43, Math.PI / 2 + 0.16, 0, 0);
      });
      [0xf08fb0, 0x6fae7a, 0xf0c060].forEach((c, i) => add(box(0.62, 0.11, 0.46, L(c)), 2.75, 0.87 + i * 0.115, -0.4, 0, (i - 1) * 0.14, 0));
      for (let i = 0; i < 3; i++) {
        const pot = new THREE.Group();
        pot.add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.075, 0.14, 10), L(0xb5683a)));
        const sprout = orb(0.07, L(0x62b04a), 1.4);
        sprout.position.y = 0.14;
        pot.add(sprout);
        add(pot, -0.55 + i * 0.55, 1.42, 0.62);
      }
    } else {
      const W = 1.9; // half width
      const D = 1.25; // half depth
      // a plank floor on short stumps, four log posts, a back wall of boards
      add(box(W * 2 + 0.3, 0.14, D * 2 + 0.3, woodDark), 0, 0.2, 0);
      for (let i = 0; i < 10; i++) add(box(0.36, 0.03, D * 2 + 0.3, i % 2 ? wood : L(0xc99c66)), -W + 0.03 + i * 0.41, 0.285, 0);
      for (const sx of [-W, W]) for (const sz of [-D, D]) add(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 2.7, 8), beam), sx, 1.45, sz);
      for (let i = 0; i < 14; i++) add(box(0.255, 1.9 + (i % 3) * 0.05, 0.07, [wood, L(0xd4aa72), woodDark][i % 3]), -W + 0.14 + i * 0.275, 1.25, -D);
      for (const sx of [-W, W]) for (let i = 0; i < 4; i++) add(box(0.07, 1.0, 0.26, [wood, woodDark][i % 2]), sx, 0.8, -D + 0.16 + i * 0.275);
      // the counter, with a striped cloth over the front
      add(box(W * 2 + 0.2, 0.12, 0.62, wood), 0, 1.02, D - 0.1);
      add(box(W * 2, 0.7, 0.08, woodDark), 0, 0.64, D + 0.12);
      for (let i = 0; i < 9; i++) add(box(0.42, 0.34, 0.03, L(i % 2 ? 0x6f4a8f : 0xfff0d8)), -W + 0.22 + i * 0.42, 0.86, D + 0.22);
      // the thatched roof, pitched forward over the counter
      const reed = new THREE.CylinderGeometry(0.5, 0.56, 1, 7);
      for (let c = 0; c < 5; c++) {
        for (let j = 0; j < 15; j++) {
          const r1 = Math.abs(Math.sin(c * 12.9 + j * 78.2) * 43758.5) % 1;
          const m = new THREE.Mesh(reed, (j + c) % 3 ? thatch : thatchDark);
          m.scale.set(0.36, 0.95 + r1 * 0.15, 0.28);
          add(m, -W - 0.45 + ((j + 0.5 + (c % 2) * 0.5) / 15) * (W * 2 + 0.9), 3.42 - c * 0.24 + r1 * 0.04, -D - 0.15 + c * 0.66, Math.PI / 2 + 0.36, 0, (r1 - 0.5) * 0.1);
        }
      }
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, W * 2 + 1.2, 8), beam), 0, 3.55, -D - 0.3, 0, 0, Math.PI / 2);
      for (const sx of [-W, W]) add(box(0.1, 0.12, D * 2 + 1.1, beam), sx, 2.95, 0.1, 0.36, 0, 0);
      // a sign hung from the front beam
      add(box(W * 2 + 0.5, 0.12, 0.12, beam), 0, 2.5, D + 0.35);
      const sign = new THREE.Group();
      sign.add(box(1.5, 0.46, 0.06, L(0xfff0d8)));
      const frame = box(1.6, 0.56, 0.04, beam);
      frame.position.z = -0.02;
      sign.add(frame);
      [0xff7ad0, 0x8fe9ff, 0xffd65a].forEach((c, i) => {
        const f = orb(0.11, new THREE.MeshBasicMaterial({ color: c }));
        f.position.set(-0.4 + i * 0.4, 0, 0.05);
        sign.add(f);
      });
      add(sign, 0, 2.14, D + 0.37);
      // lanterns strung along the front
      [0xff9cc0, 0xffd27a, 0x8fe0f0, 0xb9a0ff].forEach((c, i) => {
        const mat = new THREE.MeshBasicMaterial({ color: c });
        this.lamps.push(mat);
        const g = new THREE.Group();
        g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.3, 4), beam));
        const b = orb(0.13, mat, 1.25);
        b.position.y = -0.28;
        g.add(b);
        add(g, -W + 0.25 + i * ((W * 2 - 0.5) / 3) + (i === 1 || i === 2 ? 0 : 0), 2.3, D + 0.36);
        b.castShadow = false;
      });
      // goods: rolled rugs, folded quilts, seed pots, a basket of fruit
      [0x7fb86a, 0xe98a6a, 0xa890d8].forEach((c, i) => {
        const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.9, 12), L(c));
        add(roll, -W + 0.4 + i * 0.3, 0.75 + (i % 2) * 0.05, -D + 0.35, 0.18, 0, 0.12 * (i - 1));
        const end = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.03, 6, 12), L(0xfff0d8));
        add(end, -W + 0.4 + i * 0.3, 1.2 + (i % 2) * 0.05, -D + 0.43, Math.PI / 2 + 0.18, 0, 0);
      });
      [0xf08fb0, 0x6fae7a, 0xf0c060].forEach((c, i) => add(box(0.62, 0.11, 0.46, L(c)), W - 0.55, 1.14 + i * 0.115, D - 0.12, 0, (i - 1) * 0.12, 0));
      for (let i = 0; i < 3; i++) {
        const pot = new THREE.Group();
        pot.add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.075, 0.14, 10), L(0xb5683a)));
        const sprout = orb(0.07, L(0x62b04a), 1.4);
        sprout.position.y = 0.14;
        pot.add(sprout);
        add(pot, -0.5 + i * 0.3, 1.15, D - 0.02);
      }
      add(box(1.5, 0.05, 0.3, wood), 0.2, 1.75, -D + 0.2);
      [0xff9cc0, 0x8fe0f0, 0xffd27a].forEach((c, i) => {
        const mat = new THREE.MeshBasicMaterial({ color: c });
        this.lamps.push(mat);
        add(orb(0.12, mat, 1.2), -0.2 + i * 0.42, 1.92, -D + 0.2);
      });
      // crates and a barrel beside the stall
      add(box(0.7, 0.6, 0.7, woodDark), W + 0.75, 0.3, 0.3, 0, 0.3, 0);
      add(box(0.5, 0.45, 0.5, wood), W + 0.7, 0.82, 0.3, 0, -0.2, 0);
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.3, 0.8, 12), woodDark), -W - 0.7, 0.4, 0.5);
      for (const yy of [0.2, 0.62]) add(new THREE.Mesh(new THREE.TorusGeometry(0.335, 0.025, 6, 16), L(0x4a3a2c)), -W - 0.7, yy, 0.5, Math.PI / 2, 0, 0);
      // two steps up to the counter side
      add(box(1.3, 0.14, 0.5, wood), 0, 0.07, D + 0.75);
    }

    // the shopkeeper, behind his counter
    // (with the model stall he stands out in front beside it, where he can be seen and greeted)
    this.keeper.root.position.set(kit ? -1.45 : 0, kit ? 0 : 0.29, kit ? 1.0 : 0.2);
    this.keeper.root.rotation.y = kit ? 0.25 : 0;
    this.group.add(this.keeper.root);
    this.pose = { speed: 0, walkSpeed: 3.6, runSpeed: 7.8, grounded: true, swimming: false, verticalSpeed: 0, turnRate: 0, accel: new THREE.Vector3(), yaw: this.facing, sitting: false, breath: 0, gliding: false };

    this.keeper.root.userData.live = true;
    bakeStatic(this.group);
    colliders.add(x, z, 1.7);
    colliders.add(x + 1.5, z, 1.2);
    colliders.add(x - 1.5, z, 1.2);
  }

  /** Standing at the front of the counter. */
  near(p: THREE.Vector3): boolean {
    return Math.hypot(this.x - p.x, this.z - 2.6 - p.z) < 2.6 || Math.hypot(this.x - p.x, this.z - p.z) < 3.6;
  }

  /** Open through the day; Sampoyoshi sleeps at night. */
  open(hour: number): boolean {
    return hour >= 6.5 && hour < 19;
  }

  update(dt: number, night: number, hour: number): void {
    const open = this.open(hour);
    this.keeper.root.visible = open;
    if (open) this.keeper.update(dt, this.pose);
    const g = 0.75 + night * 0.7;
    this.lamps.forEach((m, i) => {
      const c = [0xff9cc0, 0xffd27a, 0x8fe0f0, 0xb9a0ff, 0xff9cc0, 0x8fe0f0, 0xffd27a][i % 7];
      m.color.setHex(c).multiplyScalar(g);
    });
  }
}
