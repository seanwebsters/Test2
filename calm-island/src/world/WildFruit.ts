import * as THREE from 'three';
import type { Colliders } from './Colliders';
import { FRUITS } from './Home';
import type { Island } from './islandMap';

/** How long a picked bush takes to fruit again, in real milliseconds. */
const REGROW = 8 * 60 * 1000;
const COLORS = [0xff7ad0, 0x8fe9ff, 0xffd65a];

/**
 * Fruit bushes growing wild across the island, two or three in every region,
 * so there is always something to gather on a walk and the patch at home is
 * not the only larder.
 */
export class WildFruit {
  readonly group = new THREE.Group();
  private bushes: { kind: number; x: number; z: number; fruits: THREE.Group; t: number }[] = [];
  private mats = COLORS.map((c) => new THREE.MeshBasicMaterial({ color: c }));

  constructor(island: Island, colliders: Colliders, avoid: { x: number; z: number; r: number }[]) {
    const ball = new THREE.SphereGeometry(1, 12, 9);
    const leaf = new THREE.MeshLambertMaterial({ color: 0x4a9a44 });
    const leafLight = new THREE.MeshLambertMaterial({ color: 0x74bd58 });
    const grad = { x: 0, z: 0 };
    const tmp = { x: 0, z: 0 };
    let n = 0;
    island.regions.forEach((r, ri) => {
      for (let b = 0; b < 3; b++) {
        let ok = false;
        let x = 0;
        let z = 0;
        for (let k = 0; k < 60 && !ok; k++) {
          const a = ri * 2.1 + b * 2.09 + k * 2.4;
          const d = r.r * (0.3 + ((k * 0.13) % 0.6));
          x = r.x + Math.cos(a) * d;
          z = r.z + Math.sin(a) * d;
          tmp.x = x;
          tmp.z = z;
          ok =
            island.heightAt(x, z) > island.waterLevelAt(x, z) + 0.6 &&
            island.gradientAt(x, z, grad) < 0.35 &&
            avoid.every((s) => Math.hypot(x - s.x, z - s.z) > s.r) &&
            this.bushes.every((s) => Math.hypot(x - s.x, z - s.z) > 14) &&
            !colliders.resolve(tmp, 1.6);
        }
        if (!ok) continue;
        const kind = n++ % 3;
        const g = new THREE.Group();
        const sc = 1.15 + (n % 4) * 0.08;
        const puffs: [number, number, number, number][] = [[0, 0.5, 0, 0.62], [0.42, 0.42, 0.1, 0.44], [-0.4, 0.4, -0.12, 0.46], [0.05, 0.86, 0.05, 0.4]];
        puffs.forEach(([px, py, pz, pr], i) => {
          const m = new THREE.Mesh(ball, i % 2 ? leafLight : leaf);
          m.scale.set(pr, pr * 0.82, pr);
          m.position.set(px, py, pz);
          m.castShadow = m.receiveShadow = true;
          g.add(m);
        });
        const fruits = new THREE.Group();
        for (let f = 0; f < 6; f++) {
          const a = f * 1.05 + n;
          const m = new THREE.Mesh(ball, this.mats[kind]);
          const fr = kind === 1 ? 0.13 : 0.095;
          m.scale.set(fr, fr * (kind === 2 ? 1.4 : 1), fr);
          m.position.set(Math.cos(a) * 0.58, 0.4 + (f % 3) * 0.22, Math.sin(a) * 0.58);
          fruits.add(m);
        }
        g.add(fruits);
        g.scale.setScalar(sc);
        g.position.set(x, island.heightAt(x, z), z);
        this.group.add(g);
        colliders.add(x, z, 0.55);
        this.bushes.push({ kind, x, z, fruits, t: 0 });
      }
    });
  }

  get count(): number {
    return this.bushes.length;
  }

  /** Index of a bush in fruit within reach, or -1. */
  near(p: THREE.Vector3, now: number): number {
    for (let i = 0; i < this.bushes.length; i++) {
      const b = this.bushes[i];
      if (now - b.t >= REGROW && Math.hypot(b.x - p.x, b.z - p.z) < 2.1) return i;
    }
    return -1;
  }

  /** What is growing on bush `i`. */
  name(i: number): string {
    return FRUITS[this.bushes[i].kind].plural;
  }

  /** Pick bush `i`; returns which fruit it was. */
  pick(i: number, now: number): number {
    this.bushes[i].t = now;
    return this.bushes[i].kind;
  }

  serialize(): number[] {
    return this.bushes.map((b) => b.t);
  }

  load(times: number[] | undefined): void {
    this.bushes.forEach((b, i) => (b.t = typeof times?.[i] === 'number' ? times[i] : 0));
  }

  update(time: number, night: number, now: number): void {
    this.mats.forEach((m, i) => {
      const g = 0.8 + 0.1 * Math.sin(time * 1.3 + i * 1.7) + night * 0.75;
      m.color.setHex(COLORS[i]).multiplyScalar(g);
    });
    for (const b of this.bushes) {
      const ripe = Math.min(1, (now - b.t) / REGROW);
      b.fruits.visible = ripe > 0.35;
      b.fruits.scale.setScalar(ripe >= 1 ? 1 : 0.3 + ripe * 0.55);
    }
  }
}
