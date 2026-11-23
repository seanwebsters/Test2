import * as THREE from 'three';
import { mulberry32 } from '../core/math';
import type { Island } from './islandMap';
import { glowDot } from './Trail';

const COUNT = 56;
/** the flies live in a square this wide that follows you about, so there are always a few in view */
const BOX = 64;

/**
 * Little drifting lights, a handful always somewhere near: they wander low over
 * the grass, pulse slowly, each to its own rhythm, and brighten as the day fades.
 */
export class Fireflies {
  readonly points: THREE.Points;
  private pos: Float32Array;
  private col: Float32Array;
  private flies: { hx: number; hz: number; h: number; ph: number; f: number; r: number; hue: number }[] = [];
  private tint = new THREE.Color();

  constructor(private island: Island) {
    const rnd = mulberry32(2718);
    this.pos = new Float32Array(COUNT * 3);
    this.col = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) this.flies.push({ hx: rnd() * BOX, hz: rnd() * BOX, h: 0.5 + rnd() * 1.9, ph: rnd() * 6.3, f: 0.12 + rnd() * 0.2, r: 1.2 + rnd() * 2.4, hue: rnd() });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    this.points = new THREE.Points(geo, new THREE.PointsMaterial({ map: glowDot(), size: 0.68, sizeAttenuation: true, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    this.points.frustumCulled = false;
    this.points.renderOrder = 3;
    // a small hot centre in each soft glow
    const core = new THREE.Points(geo, new THREE.PointsMaterial({ map: glowDot(), size: 0.24, sizeAttenuation: true, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    core.frustumCulled = false;
    core.renderOrder = 3;
    this.points.add(core);
  }

  /** `dusk` is 0 in full day and 1 when the light is low: they show up more as it dims. */
  update(time: number, center: THREE.Vector3, dusk: number): void {
    const half = BOX / 2;
    for (let i = 0; i < COUNT; i++) {
      const f = this.flies[i];
      const hx = center.x + ((((f.hx - center.x) % BOX) + BOX * 1.5) % BOX) - half;
      const hz = center.z + ((((f.hz - center.z) % BOX) + BOX * 1.5) % BOX) - half;
      const t = time * f.f + f.ph;
      const x = hx + Math.sin(t) * f.r + Math.sin(t * 2.3 + 1) * 0.5;
      const z = hz + Math.cos(t * 0.8) * f.r + Math.cos(t * 1.9) * 0.5;
      const ground = Math.max(this.island.heightAt(x, z), this.island.waterLevelAt(x, z));
      this.pos[i * 3] = x;
      this.pos[i * 3 + 1] = ground + f.h + Math.sin(time * 0.9 + f.ph * 3) * 0.3;
      this.pos[i * 3 + 2] = z;
      // a slow glow and fade, each to its own time, with a quicker shimmer on top
      const pulse = Math.max(0, Math.sin(time * (0.7 + f.hue * 0.5) + f.ph * 5));
      // (brighter than white on purpose: the bloom turns that into a soft halo, which is what makes them read in daylight)
      const glow = (0.35 + 0.65 * pulse * pulse) * (0.92 + 0.08 * Math.sin(time * 9 + f.ph)) * (3.2 + 1.6 * dusk);
      // fade out at the edge of the box so none pop in or out
      const edge = Math.min(1, (half - Math.max(Math.abs(x - center.x), Math.abs(z - center.z))) / 6 + 0.4);
      this.tint.setHSL(0.13 + f.hue * 0.1, 1, 0.62).multiplyScalar(glow * Math.max(0, edge));
      this.col[i * 3] = this.tint.r;
      this.col[i * 3 + 1] = this.tint.g;
      this.col[i * 3 + 2] = this.tint.b;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
  }
}
