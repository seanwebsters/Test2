import * as THREE from 'three';
import type { Island } from './islandMap';

/** Throw a flat stone across the water and count how many times it skips. */
export class Skimming {
  readonly group = new THREE.Group();
  /** skips of the stone in flight, or of the last throw */
  skips = 0;
  flying = false;
  private stone: THREE.Mesh;
  private vel = new THREE.Vector3();
  private rings: { mesh: THREE.Mesh; age: number }[] = [];
  private nextRing = 0;

  constructor(private island: Island) {
    this.stone = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8).scale(0.13, 0.04, 0.11), new THREE.MeshLambertMaterial({ color: 0x8d8a86 }));
    this.stone.visible = false;
    this.stone.castShadow = true;
    this.group.add(this.stone);
    const ring = new THREE.RingGeometry(0.82, 1, 28).rotateX(-Math.PI / 2);
    for (let i = 0; i < 10; i++) {
      const mesh = new THREE.Mesh(ring, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
      mesh.visible = false;
      mesh.renderOrder = 4;
      this.group.add(mesh);
      this.rings.push({ mesh, age: 9 });
    }
  }

  throw(from: THREE.Vector3, yaw: number): void {
    if (this.flying) return;
    this.flying = true;
    this.skips = 0;
    this.stone.visible = true;
    this.stone.position.set(from.x + Math.sin(yaw) * 0.5, from.y + 0.75, from.z + Math.cos(yaw) * 0.5);
    this.vel.set(Math.sin(yaw) * 11, 1.6, Math.cos(yaw) * 11);
  }

  /** Returns 'skip' on each bounce and 'done' when the stone comes to rest. */
  update(dt: number): 'skip' | 'done' | null {
    for (const r of this.rings) {
      if (r.age > 1.6) continue;
      r.age += dt;
      r.mesh.scale.setScalar(0.25 + r.age * 1.5);
      (r.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.75 * (1 - r.age / 1.6));
      r.mesh.visible = r.age <= 1.6;
    }
    if (!this.flying) return null;
    const p = this.stone.position;
    this.vel.y -= 13 * dt;
    p.addScaledVector(this.vel, dt);
    this.stone.rotation.y += dt * 14;
    const ground = this.island.heightAt(p.x, p.z);
    const water = this.island.waterLevelAt(p.x, p.z);
    const speed = Math.hypot(this.vel.x, this.vel.z);
    if (ground > water && p.y <= ground + 0.05) {
      this.flying = false; // landed on the bank
      p.y = ground + 0.04;
      return 'done';
    }
    if (ground <= water && p.y <= water && this.vel.y < 0) {
      const r = this.rings[(this.nextRing = (this.nextRing + 1) % this.rings.length)];
      r.age = 0;
      r.mesh.position.set(p.x, water + 0.04, p.z);
      if (speed > 3.4) {
        // a clean skip: lose a little pace each time
        this.skips++;
        p.y = water;
        this.vel.y = 1.1 + speed * 0.13;
        this.vel.x *= 0.8;
        this.vel.z *= 0.8;
        return 'skip';
      }
      this.flying = false;
      this.stone.visible = false;
      return 'done';
    }
    return null;
  }
}
