import * as THREE from 'three';
import { mulberry32 } from '../core/math';
import { SUMMIT, type Island } from './islandMap';

/**
 * Calm seeds: small glowing things tucked into corners of the island for the
 * curious to find. Placement is fixed, so everyone's island hides them in the
 * same spots.
 */
export class Seeds {
  readonly group = new THREE.Group();
  readonly spots: { x: number; z: number; mesh: THREE.Mesh; found: boolean }[] = [];

  constructor(island: Island) {
    const rnd = mulberry32(77);
    const grad = { x: 0, z: 0 };
    const ok = (x: number, z: number): boolean => {
      const h = island.heightAt(x, z);
      return h > island.waterLevelAt(x, z) + 0.4 && island.gradientAt(x, z, grad) < 0.9;
    };
    const far = (x: number, z: number, d: number): boolean => this.spots.every((s) => Math.hypot(s.x - x, s.z - z) > d);
    const geo = new THREE.OctahedronGeometry(0.2, 1).scale(0.8, 1.25, 0.8);
    const mat = new THREE.MeshBasicMaterial({ color: 0xc9e27c });
    const place = (x: number, z: number): void => {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, island.heightAt(x, z) + 0.75, z);
      this.group.add(mesh);
      this.spots.push({ x, z, mesh, found: false });
    };
    // a handful in places worth the trip…
    const lakeA = island.lakes[0];
    const lakeB = island.lakes[1];
    const special = [
      [SUMMIT.x + 2, SUMMIT.z + 2], [205, -255], [island.falls.base.x + 14, island.falls.base.z + 6],
      [lakeB.x, lakeB.z - lakeB.r - 6], [lakeA.x + lakeA.r + 6, lakeA.z], [-11, -17], [150, 330], [-120, 318],
      [island.falls.lip.x - 14, island.falls.lip.z - 8], [-188, -150],
    ];
    for (const [x, z] of special) if (ok(x, z) && far(x, z, 20)) place(x, z);
    // …and the rest scattered wherever the ground allows, well apart
    for (let i = 0; i < 4000 && this.spots.length < 36; i++) {
      const x = (rnd() - 0.5) * 860;
      const z = (rnd() - 0.5) * 860;
      if (Math.hypot(x, z) > 40 && ok(x, z) && far(x, z, 90)) place(x, z);
    }
  }

  /** Marks seeds as found from a save. */
  load(found: number[] | undefined): void {
    for (const i of found ?? []) {
      if (!this.spots[i]) continue;
      this.spots[i].found = true;
      this.spots[i].mesh.visible = false;
    }
  }

  get foundIds(): number[] {
    return this.spots.flatMap((s, i) => (s.found ? [i] : []));
  }

  reset(): void {
    for (const s of this.spots) {
      s.found = false;
      s.mesh.visible = true;
    }
  }

  /** Spins the seeds and returns the index of one just picked up, or -1. */
  update(time: number, p: THREE.Vector3): number {
    let picked = -1;
    this.spots.forEach((s, i) => {
      if (s.found) return;
      if (Math.abs(s.x - p.x) > 120 || Math.abs(s.z - p.z) > 120) return;
      s.mesh.rotation.y = time * 1.4 + i;
      s.mesh.scale.setScalar(1 + Math.sin(time * 3 + i) * 0.15);
      if (Math.hypot(s.x - p.x, s.z - p.z) < 1.5 && Math.abs(s.mesh.position.y - 0.75 - p.y) < 3) {
        s.found = true;
        s.mesh.visible = false;
        picked = i;
      }
    });
    return picked;
  }
}
