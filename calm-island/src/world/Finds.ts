import * as THREE from 'three';
import { mulberry32 } from '../core/math';
import { buildItem, itemName } from '../merge/items';
import { bakeStatic } from './bake';
import type { Colliders } from './Colliders';
import type { Island } from './islandMap';
import { glowDot } from './Trail';

/** How long before something you picked up can be found there again, in real milliseconds. */
const REGROW = 3 * 60 * 1000;
const REACH = 2.2;

interface Find {
  code: number;
  x: number;
  y: number;
  z: number;
  /** when it was last collected */
  t: number;
  root: THREE.Group;
  item: THREE.Group;
  glow: THREE.Sprite;
  spark: THREE.Sprite;
  phase: number;
}

/**
 * Little treasures lying about the island: shells along the shore, flower seeds
 * in the meadows, acorns under the trees and firewood everywhere. Each glows
 * softly, can be collected, and turns up again a few minutes later.
 */
export class Finds {
  readonly group = new THREE.Group();
  private finds: Find[] = [];

  constructor(island: Island, colliders: Colliders, avoid: { x: number; z: number; r: number }[], home: { x: number; z: number }) {
    const rnd = mulberry32(4242);
    const grad = { x: 0, z: 0 };
    const tmp = { x: 0, z: 0 };
    const glowMat = (color: number): THREE.SpriteMaterial =>
      new THREE.SpriteMaterial({ map: glowDot(), color, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    const tints = [0xffc9d6, 0xffb3e0, 0xd8ffb0, 0xffd9a0];
    const region = (id: string): { x: number; z: number; r: number } => island.regions.find((r) => r.id === id) ?? island.regions[0];
    const free = (x: number, z: number): boolean => {
      tmp.x = x;
      tmp.z = z;
      return avoid.every((s) => Math.hypot(x - s.x, z - s.z) > s.r) && this.finds.every((f) => Math.hypot(x - f.x, z - f.z) > 7) && !colliders.resolve(tmp, 0.9);
    };
    const dry = (x: number, z: number): boolean => island.heightAt(x, z) > island.waterLevelAt(x, z) + 0.7 && island.gradientAt(x, z, grad) < 0.45 && free(x, z);
    const shore = (x: number, z: number): boolean => {
      const up = island.heightAt(x, z) - island.waterLevelAt(x, z);
      return up > 0.22 && up < 1.5 && island.gradientAt(x, z, grad) < 0.4 && free(x, z);
    };
    const place = (chain: number, x: number, z: number): void => {
      const code = chain * 4;
      const root = new THREE.Group();
      const item = buildItem(code);
      item.scale.setScalar(0.62);
      item.traverse((o) => (o.castShadow = false));
      bakeStatic(item); // one mesh per material, so a field of finds stays cheap to draw
      root.add(item);
      const glow = new THREE.Sprite(glowMat(tints[chain]));
      glow.scale.setScalar(1.9);
      glow.position.y = 0.3;
      root.add(glow);
      const spark = new THREE.Sprite(glowMat(0xffffff));
      spark.scale.setScalar(0.22);
      root.add(spark);
      const y = island.heightAt(x, z);
      root.position.set(x, y, z);
      root.userData.live = true;
      this.group.add(root);
      this.finds.push({ code, x, y, z, t: 0, root, item, glow, spark, phase: rnd() * 10 });
    };
    /** Try spots around a centre until `count` of them hold. */
    const scatter = (chain: number, count: number, cx: number, cz: number, rMin: number, rMax: number, ok: (x: number, z: number) => boolean): void => {
      let placed = 0;
      for (let k = 0; k < count * 60 && placed < count; k++) {
        const a = rnd() * Math.PI * 2;
        const d = rMin + (rMax - rMin) * Math.sqrt(rnd());
        const x = cx + Math.cos(a) * d;
        const z = cz + Math.sin(a) * d;
        if (!ok(x, z)) continue;
        place(chain, x, z);
        placed++;
      }
    };
    // a first handful of everything within a short walk of home, so the game explains itself
    scatter(3, 12, home.x, home.z, 14, 62, dry);
    scatter(1, 6, home.x, home.z, 16, 66, dry);
    scatter(2, 5, home.x, home.z, 18, 70, dry);
    // then each kind where it belongs
    const bay = region('bay');
    const mouth = region('mouth');
    scatter(0, 16, bay.x, bay.z, 0, bay.r * 1.5, shore);
    scatter(0, 8, mouth.x, mouth.z, 0, mouth.r * 1.4, shore);
    scatter(0, 10, 0, 0, 60, 400, shore);
    for (const id of ['garden', 'falls', 'mirror', 'mouth']) scatter(1, 5, region(id).x, region(id).z, 8, region(id).r * 1.4, dry);
    for (const id of ['forest', 'ramp', 'peak']) scatter(2, id === 'forest' ? 12 : 5, region(id).x, region(id).z, 6, region(id).r * 1.3, dry);
    for (const r of island.regions) scatter(3, 4, r.x, r.z, 6, r.r * 1.4, dry);
  }

  get count(): number {
    return this.finds.length;
  }

  /** Index of something to collect within reach, or -1. */
  near(p: THREE.Vector3, now: number): number {
    let best = -1;
    let bd = REACH;
    for (let i = 0; i < this.finds.length; i++) {
      const f = this.finds[i];
      if (now - f.t < REGROW) continue;
      const d = Math.hypot(f.x - p.x, f.z - p.z);
      if (d < bd && Math.abs(f.y - p.y) < 3) {
        bd = d;
        best = i;
      }
    }
    return best;
  }

  name(i: number): string {
    return itemName(this.finds[i].code);
  }

  /** Collect find `i`; returns the item's code. */
  take(i: number, now: number): number {
    this.finds[i].t = now;
    return this.finds[i].code;
  }

  serialize(): number[] {
    return this.finds.map((f) => f.t);
  }

  load(times: number[] | undefined): void {
    this.finds.forEach((f, i) => (f.t = typeof times?.[i] === 'number' ? times[i] : 0));
  }

  /** Where the nearest thing of a collection lies, for pointing the way. */
  nearestOf(chain: number, p: THREE.Vector3, now: number): { x: number; z: number } | null {
    let best: Find | null = null;
    let bd = Infinity;
    for (const f of this.finds) {
      if (f.code >> 2 !== chain || now - f.t < REGROW) continue;
      const d = Math.hypot(f.x - p.x, f.z - p.z);
      if (d < bd) {
        bd = d;
        best = f;
      }
    }
    return best;
  }

  update(time: number, now: number, eye: THREE.Vector3, player: THREE.Vector3): void {
    for (const f of this.finds) {
      const since = now - f.t;
      const far = Math.hypot(f.x - eye.x, f.z - eye.z);
      f.root.visible = far < 95 && (since < 700 || since >= REGROW);
      if (!f.root.visible) continue;
      if (since < 700) {
        // collected: it leaps up, spins and winks out
        const k = since / 700;
        f.item.position.y = 0.45 + Math.sin(k * Math.PI * 0.6) * 1.5;
        f.item.rotation.y += 0.4;
        f.item.scale.setScalar(0.62 * (1 - k * k));
        f.glow.scale.setScalar(1.9 + k * 3.2);
        (f.glow.material as THREE.SpriteMaterial).opacity = 0.75 * (1 - k);
        f.spark.visible = false;
        continue;
      }
      const close = Math.max(0, 1 - Math.hypot(f.x - player.x, f.z - player.z) / 7);
      const grow = Math.min(1, (since - REGROW) / 900 + (f.t === 0 ? 1 : 0));
      f.item.position.y = 0.42 + Math.sin(time * 1.6 + f.phase) * 0.07;
      f.item.rotation.y = time * 0.7 + f.phase;
      f.item.scale.setScalar(0.62 * grow * (1 + close * 0.14));
      const pulse = 0.5 + 0.5 * Math.sin(time * 2.4 + f.phase);
      f.glow.scale.setScalar(1.7 + pulse * 0.35 + close * 0.8);
      (f.glow.material as THREE.SpriteMaterial).opacity = 0.34 + pulse * 0.12 + close * 0.3;
      // one sparkle circling it
      const a = time * 1.9 + f.phase * 3;
      f.spark.visible = true;
      f.spark.position.set(Math.cos(a) * 0.5, 0.55 + Math.sin(a * 1.7) * 0.28, Math.sin(a) * 0.5);
      f.spark.scale.setScalar(0.12 + 0.16 * Math.abs(Math.sin(time * 5 + f.phase)));
    }
  }
}
