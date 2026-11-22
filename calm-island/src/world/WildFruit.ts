import * as THREE from 'three';
import type { Colliders } from './Colliders';
import { FRUITS } from './Home';
import { fruitPlant, leafMound } from './Props';
import type { Island } from './islandMap';

/** How long a picked bush takes to fruit again, in real milliseconds. */
const REGROW = 8 * 60 * 1000;

/**
 * Fruit bushes growing wild across the island, two or three in every region,
 * so there is always something to gather on a walk and the patch at home is
 * not the only larder.
 */
export class WildFruit {
  readonly group = new THREE.Group();
  private bushes: { kind: number; x: number; z: number; fruits: THREE.Group; t: number; root: THREE.Group }[] = [];

  constructor(island: Island, colliders: Colliders, avoid: { x: number; z: number; r: number }[]) {
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
        const sc = 1.5 + (n % 4) * 0.1;
        // the same plants as in the patch at home, grown bigger and wilder
        const body = leafMound(54, 0.62, n * 13, 0.36, 0.95);
        g.add(body);
        const { group: plant, fruits } = fruitPlant(kind, n * 29, 1.0);
        plant.position.y = kind === 2 ? 0.1 : 0.22;
        g.add(plant);
        g.scale.setScalar(sc);
        g.position.set(x, island.heightAt(x, z), z);
        this.group.add(g);
        colliders.add(x, z, 0.55);
        this.bushes.push({ kind, x, z, fruits, t: 0, root: g });
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

  update(_time: number, _night: number, now: number, eye?: THREE.Vector3): void {
    for (const b of this.bushes) {
      // a bush is a few dozen pieces: only the ones within sight are drawn at all
      b.root.visible = !eye || Math.hypot(b.x - eye.x, b.z - eye.z) < 150;
      if (!b.root.visible) continue;
      const since = now - b.t;
      if (since < 520) {
        const k = since / 520;
        b.fruits.visible = true;
        b.fruits.position.y = k * k * 0.6;
        b.fruits.scale.setScalar(1 - k * k);
        continue;
      }
      b.fruits.position.y = 0;
      const ripe = Math.min(1, since / REGROW);
      b.fruits.visible = ripe > 0.35;
      b.fruits.scale.setScalar(ripe >= 1 ? 1 : 0.3 + ripe * 0.55);
    }
  }
}
