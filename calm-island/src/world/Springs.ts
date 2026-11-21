import * as THREE from 'three';
import type { Colliders } from './Colliders';
import { HOME_SPOT } from './Home';
import type { Island } from './islandMap';

interface Spring {
  id: string;
  name: string;
  x: number;
  z: number;
  orb: THREE.Mesh;
  beam: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  beamMat: THREE.MeshBasicMaterial;
}

/**
 * One calm spring sleeps in every region: a ring of stones round a still
 * basin. Sit beside it and take three breaths and it wakes, sending up a soft
 * column of light that can be seen from far away.
 */
export class Springs {
  readonly group = new THREE.Group();
  readonly spots: Spring[] = [];
  private awake = new Set<string>();

  constructor(island: Island, colliders: Colliders) {
    const stone = new THREE.SphereGeometry(1, 10, 8);
    const grad = { x: 0, z: 0 };
    const tmp = { x: 0, z: 0 };
    island.regions.forEach((r, i) => {
      // find flat, dry, open ground a little way from the middle of the region
      let x = r.x;
      let z = r.z;
      let ok = false;
      for (let k = 0; k < 110 && !ok; k++) {
        const a = i * 1.9 + k * 2.4;
        const d = Math.min(r.r * 0.85, 6 + k * 0.8);
        x = r.x + Math.cos(a) * d;
        z = r.z + Math.sin(a) * d;
        tmp.x = x;
        tmp.z = z;
        ok =
          island.heightAt(x, z) > island.waterLevelAt(x, z) + 0.5 &&
          island.gradientAt(x, z, grad) < 0.28 &&
          Math.hypot(x, z) > 17 &&
          Math.hypot(x - HOME_SPOT.x, z - HOME_SPOT.z) > 24 &&
          !colliders.resolve(tmp, 2.6);
      }
      if (!ok) return;
      const g = new THREE.Group();
      g.position.set(x, island.heightAt(x, z), z);
      for (let k = 0; k < 9; k++) {
        const a = (k / 9) * Math.PI * 2;
        const s = new THREE.Mesh(stone, new THREE.MeshLambertMaterial({ color: [0x9aa3a8, 0xb5bcc0, 0x848d92][k % 3] }));
        s.scale.set(0.34 + (k % 2) * 0.08, 0.24 + (k % 3) * 0.05, 0.28);
        s.position.set(Math.cos(a) * 1.75, 0.1, Math.sin(a) * 1.75);
        s.rotation.y = a;
        s.castShadow = true;
        g.add(s);
      }
      const basin = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.2, 0.34, 18), new THREE.MeshLambertMaterial({ color: 0xa9b2b6 }));
      basin.position.y = 0.17;
      basin.castShadow = basin.receiveShadow = true;
      g.add(basin);
      const mat = new THREE.MeshBasicMaterial({ color: 0x5f7f90 });
      const pool = new THREE.Mesh(new THREE.CircleGeometry(0.9, 18), mat);
      pool.rotation.x = -Math.PI / 2;
      pool.position.y = 0.345;
      g.add(pool);
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 10), mat);
      orb.position.y = 0.5;
      g.add(orb);
      // a column of light that is brightest at the water and thins away into the sky
      const beamGeo = new THREE.CylinderGeometry(0.12, 0.5, 60, 14, 12, true).translate(0, 30.4, 0);
      const fade = new Float32Array(beamGeo.attributes.position.count * 3);
      for (let v = 0; v < beamGeo.attributes.position.count; v++) {
        const f = Math.pow(1 - Math.min(1, (beamGeo.attributes.position.getY(v) - 0.4) / 60), 2.2);
        fade.set([f, f, f], v * 3);
      }
      beamGeo.setAttribute('color', new THREE.BufferAttribute(fade, 3));
      const beamMat = new THREE.MeshBasicMaterial({ color: 0x9fefff, vertexColors: true, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.visible = false;
      g.add(beam);
      this.group.add(g);
      colliders.add(x, z, 1.25);
      this.spots.push({ id: r.id, name: r.name, x, z, orb, beam, mat, beamMat });
    });
  }

  /** Index of the spring within a few steps, or -1. */
  near(p: THREE.Vector3): number {
    for (let i = 0; i < this.spots.length; i++) {
      if (Math.hypot(this.spots[i].x - p.x, this.spots[i].z - p.z) < 6.5) return i;
    }
    return -1;
  }

  isAwake(i: number): boolean {
    return this.awake.has(this.spots[i].id);
  }

  get awakeCount(): number {
    return this.awake.size;
  }

  /** Wake spring `i`. False if it was awake already. */
  wake(i: number): boolean {
    if (this.isAwake(i)) return false;
    this.awake.add(this.spots[i].id);
    return true;
  }

  serialize(): string[] {
    return [...this.awake];
  }

  load(ids: string[] | undefined): void {
    this.awake.clear();
    for (const id of ids ?? []) if (this.spots.some((s) => s.id === id)) this.awake.add(id);
  }

  update(time: number, night: number): void {
    this.spots.forEach((s, i) => {
      const on = this.awake.has(s.id);
      s.beam.visible = on;
      if (on) {
        const g = 0.95 + 0.12 * Math.sin(time * 1.4 + i) + night * 0.5;
        s.mat.color.setRGB(0.56 * g, 0.93 * g, 1.0 * g);
        s.orb.position.y = 1.35 + Math.sin(time * 0.9 + i) * 0.14;
        s.orb.scale.setScalar(1 + Math.sin(time * 1.7 + i) * 0.06);
        s.beamMat.opacity = 0.22 + 0.05 * Math.sin(time * 0.8 + i) + night * 0.4;
      } else {
        s.mat.color.setHex(0x5f7f90);
        s.orb.position.y = 0.5;
        s.orb.scale.setScalar(1);
      }
    });
  }
}
