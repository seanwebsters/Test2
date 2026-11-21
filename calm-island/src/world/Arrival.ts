import * as THREE from 'three';
import { glowDot } from './Trail';

/**
 * The clouds you fall through on the way in: big soft puffs stacked round the
 * drop, each one thinning away as you sink past it, so the island appears
 * through a parting sky.
 */
export class ArrivalClouds {
  readonly group = new THREE.Group();
  private puffs: { sprite: THREE.Sprite; y: number; mat: THREE.SpriteMaterial }[] = [];
  private show = 0;

  constructor() {
    const rnd = (i: number): number => {
      const v = Math.sin(i * 53.3 + 7.1) * 43758.5453;
      return v - Math.floor(v);
    };
    for (let i = 0; i < 46; i++) {
      const mat = new THREE.SpriteMaterial({ map: glowDot(), color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, fog: false });
      const sprite = new THREE.Sprite(mat);
      const a = rnd(i) * Math.PI * 2;
      const r = 16 + rnd(i + 100) * 95;
      const y = 55 + rnd(i + 200) * 125;
      const s = 34 + rnd(i + 300) * 46;
      sprite.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
      sprite.scale.set(s * 1.6, s, 1);
      this.group.add(sprite);
      this.puffs.push({ sprite, y, mat });
    }
    this.group.visible = false;
  }

  /** `at` is where the Calmling is; clouds gather round the column they are falling down. */
  update(dt: number, falling: boolean, at: THREE.Vector3, ground: number, daylight: number): void {
    this.show += ((falling ? 1 : 0) - this.show) * Math.min(1, dt * 1.2);
    this.group.visible = this.show > 0.01;
    if (!this.group.visible) return;
    this.group.position.set(at.x, ground, at.z);
    const h = at.y - ground;
    for (const p of this.puffs) {
      // full while below you, thinning as you pass, gone once it is overhead
      const rel = h - p.y;
      const o = 1 - Math.min(1, Math.max(0, (20 - rel) / 45));
      p.mat.opacity = this.show * o * 0.46;
      p.mat.color.setScalar(0.6 + 0.4 * daylight);
    }
  }
}
