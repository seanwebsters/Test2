import * as THREE from 'three';
import type { Island } from './islandMap';

const COUNT = 16;

let dot: THREE.CanvasTexture | null = null;
/** A soft round glow, so sparkles and fireflies are dots of light rather than squares. */
export function glowDot(): THREE.CanvasTexture {
  if (dot) return dot;
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.75)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 32);
  return (dot = new THREE.CanvasTexture(c));
}

/**
 * A drift of golden sparkles leading from the Calmling toward somewhere worth
 * going. It hugs the ground, flows away from you, and fades when there is
 * nowhere in particular to point.
 */
export class Trail {
  readonly points: THREE.Points;
  private mat = new THREE.PointsMaterial({ color: 0xffe9a0, map: glowDot(), size: 0.26, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  private show = 0;
  private dir = new THREE.Vector3();

  constructor(private island: Island) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(COUNT * 3), 3));
    this.points = new THREE.Points(geo, this.mat);
    this.points.frustumCulled = false;
  }

  /** `eye` is the camera: a sparkle that drifts right up to the lens would fill the screen, so those are put out. */
  update(dt: number, time: number, from: THREE.Vector3, target: { x: number; z: number } | null, eye?: THREE.Vector3): void {
    const far = target ? Math.hypot(target.x - from.x, target.z - from.z) : 0;
    this.show += ((target && far > 5 ? 1 : 0) - this.show) * Math.min(1, dt * 2.5);
    this.mat.opacity = this.show * 0.7;
    this.points.visible = this.show > 0.02;
    if (!this.points.visible || !target) return;
    this.dir.set(target.x - from.x, 0, target.z - from.z).normalize();
    const pos = this.points.geometry.attributes.position as THREE.BufferAttribute;
    const reach = Math.min(far - 1.5, 30);
    for (let i = 0; i < COUNT; i++) {
      // each sparkle slides forward along the line, then starts again at your feet
      const along = 2.2 + (((i / COUNT + time * 0.11) % 1) * reach);
      const side = Math.sin(i * 2.4 + time * 1.3) * 0.35;
      const x = from.x + this.dir.x * along - this.dir.z * side;
      const z = from.z + this.dir.z * along + this.dir.x * side;
      const y = Math.max(this.island.heightAt(x, z), this.island.waterLevelAt(x, z)) + 0.95 + Math.sin(time * 2.1 + i * 1.7) * 0.25;
      const tooClose = !!eye && Math.hypot(x - eye.x, y - eye.y, z - eye.z) < 4;
      pos.setXYZ(i, x, tooClose ? -500 : y, z);
    }
    pos.needsUpdate = true;
  }
}
