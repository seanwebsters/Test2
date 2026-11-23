import * as THREE from 'three';
import { glowDot } from './Trail';

const N = 46;
const LIFE = 2.4;

/** A puff of rising sparkles, for a happy moment. One is kept and set off wherever it is wanted. */
export class Burst {
  readonly points: THREE.Points;
  private base = new Float32Array(N * 3);
  private pos = new Float32Array(N * 3);
  private t = LIFE;

  constructor() {
    for (let i = 0; i < N; i++) {
      const a = i * 2.39996;
      const r = 0.35 + ((i * 0.618) % 1) * 1.1;
      this.base.set([Math.cos(a) * r, ((i * 0.37) % 1) * 1.5, Math.sin(a) * r], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.points = new THREE.Points(geo, new THREE.PointsMaterial({ map: glowDot(), color: new THREE.Color(3, 2.3, 1.6), size: 0.3, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    this.points.frustumCulled = false;
    this.points.visible = false;
  }

  fire(at: THREE.Vector3, color = 0xffc9de): void {
    this.points.position.copy(at);
    (this.points.material as THREE.PointsMaterial).color.set(color).multiplyScalar(2.6);
    this.t = 0;
    this.points.visible = true;
  }

  update(dt: number): void {
    if (this.t >= LIFE) return;
    this.t += dt;
    const k = Math.min(1, this.t / LIFE);
    const out = 1 - (1 - k) ** 3;
    for (let i = 0; i < N; i++) {
      this.pos[i * 3] = this.base[i * 3] * (0.3 + out * 1.3);
      this.pos[i * 3 + 1] = 0.3 + this.base[i * 3 + 1] * (0.4 + out) + out * 1.1;
      this.pos[i * 3 + 2] = this.base[i * 3 + 2] * (0.3 + out * 1.3);
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    (this.points.material as THREE.PointsMaterial).opacity = Math.sin(k * Math.PI) ** 0.6;
    if (k >= 1) this.points.visible = false;
  }
}
