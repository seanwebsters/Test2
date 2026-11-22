import * as THREE from 'three';
import { glowDot } from './Trail';

const COUNT = 46;

/** Leaves and dust kicked up behind a leaf rider: they spin away, drift and fade. */
export class LeafTrail {
  readonly points: THREE.Points;
  private pos = new Float32Array(COUNT * 3);
  private col = new Float32Array(COUNT * 3);
  private vel = new Float32Array(COUNT * 3);
  private life = new Float32Array(COUNT);
  private next = 0;
  private spawn = 0;

  constructor() {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    this.pos.fill(-999);
    this.points = new THREE.Points(geo, new THREE.PointsMaterial({ map: glowDot(), size: 0.3, vertexColors: true, transparent: true, depthWrite: false, opacity: 0.95 }));
    this.points.frustumCulled = false;
  }

  update(dt: number, riding: boolean, at: THREE.Vector3, yaw: number, speed: number): void {
    if (riding && speed > 3) {
      this.spawn += dt * (8 + speed * 2.2);
      while (this.spawn >= 1) {
        this.spawn -= 1;
        const i = this.next++ % COUNT;
        const side = (Math.random() - 0.5) * 1.1;
        this.pos[i * 3] = at.x - Math.sin(yaw) * 1.0 + Math.cos(yaw) * side;
        this.pos[i * 3 + 1] = at.y - 0.05 + Math.random() * 0.25;
        this.pos[i * 3 + 2] = at.z - Math.cos(yaw) * 1.0 - Math.sin(yaw) * side;
        this.vel[i * 3] = -Math.sin(yaw) * speed * 0.18 + (Math.random() - 0.5) * 1.6;
        this.vel[i * 3 + 1] = 0.6 + Math.random() * 1.4;
        this.vel[i * 3 + 2] = -Math.cos(yaw) * speed * 0.18 + (Math.random() - 0.5) * 1.6;
        this.life[i] = 1;
        // mostly green and gold leaves, with the odd puff of pale dust
        const c = [[0.55, 0.82, 0.3], [0.98, 0.78, 0.28], [0.92, 0.5, 0.2], [0.96, 0.93, 0.82]][Math.floor(Math.random() * 4)];
        this.col.set(c, i * 3);
      }
    }
    for (let i = 0; i < COUNT; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt * 0.9;
      this.vel[i * 3 + 1] -= dt * 1.6;
      this.pos[i * 3] += (this.vel[i * 3] + Math.sin(this.life[i] * 9 + i) * 0.6) * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += (this.vel[i * 3 + 2] + Math.cos(this.life[i] * 8 + i) * 0.6) * dt;
      if (this.life[i] <= 0) this.pos[i * 3 + 1] = -999;
    }
    (this.points.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.points.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  }
}
