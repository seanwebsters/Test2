import * as THREE from 'three';
import type { Island } from './islandMap';

export const FISH = ['Moonscale minnow', 'Pebble perch', 'Sleepy carp', 'Glass guppy', 'Blossom koi', 'Reed darter', 'Dawn trout', 'Lantern fish'];

/** Quiet fishing: cast, watch the float, and let whatever bites go again. */
export class Fishing {
  readonly group = new THREE.Group();
  state: 'idle' | 'wait' | 'bite' = 'idle';
  private float: THREE.Mesh;
  private line: THREE.Line;
  private timer = 0;
  private level = 0;

  constructor(private island: Island) {
    this.float = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), new THREE.MeshLambertMaterial({ color: 0xff5a4a }));
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.092, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0xffffff }));
    this.float.add(cap);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 1, 0], 3));
    this.line = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 }));
    this.line.frustumCulled = false;
    this.group.add(this.float, this.line);
    this.group.visible = false;
  }

  get active(): boolean {
    return this.state !== 'idle';
  }

  /** Drops the float on the first open water ahead. False if there is none in reach. */
  cast(from: THREE.Vector3, yaw: number): boolean {
    for (let d = 3.5; d <= 9; d += 0.5) {
      const x = from.x + Math.sin(yaw) * d;
      const z = from.z + Math.cos(yaw) * d;
      const water = this.island.waterLevelAt(x, z);
      if (water > this.island.heightAt(x, z) + 0.35) {
        this.level = water;
        this.float.position.set(x, water, z);
        this.state = 'wait';
        this.timer = 5 + Math.random() * 9;
        this.group.visible = true;
        return true;
      }
    }
    return false;
  }

  stop(): void {
    this.state = 'idle';
    this.group.visible = false;
  }

  /** Reel in. Returns the fish if one was on the line. */
  reel(): string | null {
    const caught = this.state === 'bite' ? FISH[Math.floor(Math.random() * FISH.length)] : null;
    this.stop();
    return caught;
  }

  /** Returns 'bite' when something takes the float, 'gone' if it was left too long. */
  update(dt: number, time: number, hand: THREE.Vector3): 'bite' | 'gone' | null {
    if (this.state === 'idle') return null;
    let event: 'bite' | 'gone' | null = null;
    this.timer -= dt;
    if (this.timer <= 0) {
      if (this.state === 'wait') {
        this.state = 'bite';
        this.timer = 3;
        event = 'bite';
      } else {
        this.state = 'wait'; // it nibbled and left; the float settles again
        this.timer = 6 + Math.random() * 9;
        event = 'gone';
      }
    }
    const dip = this.state === 'bite' ? -0.1 + Math.sin(time * 16) * 0.05 : Math.sin(time * 1.8) * 0.025;
    this.float.position.y = this.level + 0.03 + dip;
    const a = this.line.geometry.attributes.position;
    a.setXYZ(0, hand.x, hand.y, hand.z);
    a.setXYZ(1, this.float.position.x, this.float.position.y + 0.08, this.float.position.z);
    a.needsUpdate = true;
    return event;
  }
}
