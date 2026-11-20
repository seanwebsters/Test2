import * as THREE from 'three';
import type { Island } from './islandMap';
import * as plants from './plantGeometry';

export interface PlotSave {
  /** when the seed went in (ms since 1970), or 0 for an empty plot */
  t: number;
  /** when it was last watered */
  w: number;
}

const MIN = 60000;
const WATER_LASTS = 6 * 60 * MIN;
const TINTS = [0xff5a7a, 0xffb03a, 0xb98aff, 0xffffff, 0xff7ac8, 0x7fc8ff];

/**
 * Six soft plots in the Calm Garden. Seeds grow in real time — even while the
 * game is closed — from sprout (a minute) to bud (twenty) to full bloom (three
 * hours). Watering jumps a plant ahead and doubles its pace for six hours.
 */
export class Garden {
  readonly group = new THREE.Group();
  private plots: { x: number; z: number; y: number; save: PlotSave; stage: number; plant: THREE.Group }[] = [];
  private bloomGeo = [plants.hibiscus(), plants.daisy(), plants.lupine()];

  constructor(island: Island) {
    const soil = new THREE.MeshLambertMaterial({ color: 0x7a5236 });
    const mound = new THREE.SphereGeometry(1, 16, 10).scale(0.75, 0.2, 0.75);
    for (let i = 0; i < 6; i++) {
      const a = 0.45 + (i / 6) * Math.PI * 2;
      const x = Math.cos(a) * 9.5;
      const z = Math.sin(a) * 9.5;
      const y = island.heightAt(x, z);
      const m = new THREE.Mesh(mound, soil);
      m.position.set(x, y + 0.02, z);
      m.receiveShadow = true;
      const plant = new THREE.Group();
      plant.position.set(x, y + 0.14, z);
      this.group.add(m, plant);
      this.plots.push({ x, z, y, save: { t: 0, w: 0 }, stage: -1, plant });
    }
  }

  /** 0 empty · 1 seed · 2 sprout · 3 bud · 4 bloom */
  private stageOf(s: PlotSave, now: number): number {
    if (!s.t) return 0;
    let minutes = (now - s.t) / MIN;
    if (s.w) minutes += 10 + Math.min(now - s.w, WATER_LASTS) / MIN;
    return minutes < 1 ? 1 : minutes < 20 ? 2 : minutes < 180 ? 3 : 4;
  }

  private thirsty(s: PlotSave, now: number): boolean {
    return !!s.t && (!s.w || now - s.w > WATER_LASTS) && this.stageOf(s, now) < 4;
  }

  /** Index of the plot within reach, or -1. */
  near(p: THREE.Vector3): number {
    for (let i = 0; i < this.plots.length; i++) {
      if (Math.hypot(this.plots[i].x - p.x, this.plots[i].z - p.z) < 1.9) return i;
    }
    return -1;
  }

  prompt(i: number, now: number): string | null {
    const s = this.plots[i].save;
    if (!s.t) return 'Plant a seed';
    return this.thirsty(s, now) ? 'Water the plant' : null;
  }

  /** Plant or water. Returns a short description of what happened. */
  tend(i: number, now: number): string | null {
    const s = this.plots[i].save;
    if (!s.t) {
      s.t = now;
      return 'planted';
    }
    if (this.thirsty(s, now)) {
      s.w = now;
      return 'watered';
    }
    return null;
  }

  get blooms(): number {
    return this.plots.filter((p) => p.stage === 4).length;
  }

  update(now: number, time: number): void {
    this.plots.forEach((p, i) => {
      const stage = this.stageOf(p.save, now);
      if (stage !== p.stage) {
        p.stage = stage;
        this.rebuild(i);
      }
      p.plant.rotation.z = Math.sin(time * 1.2 + i) * 0.05;
    });
  }

  private rebuild(i: number): void {
    const p = this.plots[i];
    p.plant.clear();
    const green = new THREE.MeshLambertMaterial({ color: 0x4fae3a });
    const add = (m: THREE.Mesh): void => {
      m.castShadow = true;
      p.plant.add(m);
    };
    if (p.stage === 1) {
      add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshLambertMaterial({ color: 0xd9c08a })));
    } else if (p.stage === 2 || p.stage === 3) {
      const h = p.stage === 2 ? 0.16 : 0.5;
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, h, 6).translate(0, h / 2, 0), green));
      for (const s of [-1, 1]) {
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6).scale(0.14, 0.03, 0.08), green);
        leaf.position.set(s * 0.12, h * 0.6, 0);
        leaf.rotation.z = s * 0.5;
        add(leaf);
      }
      if (p.stage === 3) {
        const bud = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8).scale(0.09, 0.14, 0.09), new THREE.MeshLambertMaterial({ color: TINTS[i] }));
        bud.position.y = h + 0.1;
        add(bud);
      }
    } else if (p.stage === 4) {
      const flower = new THREE.Mesh(
        this.bloomGeo[i % 3],
        new THREE.MeshLambertMaterial({ vertexColors: true, color: TINTS[i], side: THREE.DoubleSide, emissive: TINTS[i], emissiveIntensity: 0.12 }),
      );
      flower.scale.setScalar(i % 3 === 2 ? 2.2 : 3);
      add(flower);
    }
  }

  serialize(): PlotSave[] {
    return this.plots.map((p) => ({ ...p.save }));
  }

  load(data: PlotSave[] | undefined): void {
    data?.forEach((s, i) => {
      if (this.plots[i] && typeof s?.t === 'number') this.plots[i].save = { t: s.t, w: s.w || 0 };
    });
  }

  clear(): void {
    for (const p of this.plots) p.save = { t: 0, w: 0 };
  }
}
