import * as THREE from 'three';
import { buildItem, campfire, lantern, tent } from '../merge/items';
import { bakeStatic } from './bake';
import type { Colliders } from './Colliders';
import type { Island } from './islandMap';
import { stone } from './Props';
import { glowDot } from './Trail';

const REVEAL = 2.6;

/**
 * The cosy campsite: a canvas tent strung with fairy lights, a fire in a ring
 * of stones, logs and cushions to sit on. It is not there to begin with: it
 * appears, for good, when the Cosy collection is completed on the merge board.
 */
export class Campsite {
  readonly group = new THREE.Group();
  readonly x: number;
  readonly z: number;
  readonly y: number;
  unlocked = false;
  private site = new THREE.Group();
  private flames: THREE.Object3D | null = null;
  private light = new THREE.PointLight(0xffb060, 0, 16, 1.6);
  private burst: THREE.Points;
  private revealT = -1;
  private solids: [number, number, number][] = [];

  constructor(private island: Island, private colliders: Colliders, home: { x: number; z: number }, avoid: { x: number; z: number; r: number }[]) {
    // the flattest clear patch of meadow a short walk from home
    const tmp = { x: 0, z: 0 };
    let best = { x: home.x + 34, z: home.z + 10, score: Infinity };
    for (const strict of [true, false]) {
      for (let d = 26; d <= 78; d += 4) {
        for (let k = 0; k < 28; k++) {
          const a = (k / 28) * Math.PI * 2 + d;
          const x = home.x + Math.cos(a) * d;
          const z = home.z + Math.sin(a) * d;
          const h = island.heightAt(x, z);
          if (h < island.waterLevelAt(x, z) + 1.2) continue;
          if (!avoid.every((s) => Math.hypot(x - s.x, z - s.z) > s.r + 9)) continue;
          let rough = 0;
          let clear = true;
          for (let i = 0; i < 12; i++) {
            const r = i < 6 ? 3.2 : 6.4;
            const px = x + Math.cos(i * 1.05) * r;
            const pz = z + Math.sin(i * 1.05) * r - (i < 6 ? 2 : 2.4);
            rough = Math.max(rough, Math.abs(island.heightAt(px, pz) - h));
            if (island.heightAt(px, pz) < island.waterLevelAt(px, pz) + 0.6) clear = false;
          }
          // nothing growing or standing anywhere the camp will be: checked a stride at a time
          for (let gx = -7; strict && clear && gx <= 7; gx += 1) {
            for (let gz = -9; gz <= 6.5; gz += 1) {
              tmp.x = x + gx;
              tmp.z = z + gz;
              if (colliders.resolve(tmp, 0.7)) {
                clear = false;
                break;
              }
            }
          }
          if (!clear) continue;
          const score = rough + d * 0.012;
          if (score < best.score) best = { x, z, score };
        }
      }
      if (best.score < Infinity) break;
    }
    this.x = best.x;
    this.z = best.z;
    this.y = island.heightAt(this.x, this.z);
    this.group.position.set(this.x, this.y, this.z);
    this.group.add(this.site, this.light);
    this.light.position.set(0, 1.1, 0);
    this.build();
    this.site.visible = false;

    // a shower of light for the moment it appears
    const n = 90;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = i * 2.39996;
      const r = 1 + ((i * 0.618) % 1) * 6.5;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = ((i * 0.37) % 1) * 1.2;
      pos[i * 3 + 2] = Math.sin(a) * r - 2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.burst = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffe9a8, map: glowDot(), size: 0.5, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    this.burst.frustumCulled = false;
    this.burst.visible = false;
    this.group.add(this.burst);
  }

  /** How far the ground at a local spot sits above or below the middle of the camp. */
  private gy(lx: number, lz: number): number {
    return this.island.heightAt(this.x + lx, this.z + lz) - this.y;
  }

  private build(): void {
    const s = this.site;
    const add = (o: THREE.Object3D, x: number, z: number, lift = 0): THREE.Object3D => {
      o.position.set(x, this.gy(x, z) + lift, z);
      s.add(o);
      return o;
    };
    const mat = (color: number, roughness = 0.8): THREE.MeshStandardMaterial => new THREE.MeshStandardMaterial({ color, roughness });
    const mesh = (geo: THREE.BufferGeometry, m: THREE.Material): THREE.Mesh => {
      const o = new THREE.Mesh(geo, m);
      o.castShadow = o.receiveShadow = true;
      return o;
    };
    const wood = mat(0x8a5a36, 0.9);
    const cut = mat(0xe6c08a, 0.8);

    // the fire, in the middle
    const fire = campfire(2.3);
    this.flames = fire.getObjectByName('flames') ?? null;
    if (this.flames) this.flames.userData.live = true;
    add(fire, 0, 0);
    this.solids.push([0, 0, 1.0]);

    // the tent, its door toward the fire
    const TZ = -4.7;
    const t = tent(4.4, 3.0, 3.8, true);
    add(t, 0, TZ, 0.02);
    this.solids.push([-1.75, TZ, 0.8], [1.75, TZ, 0.8], [-1.2, TZ - 1.5, 0.9], [1.2, TZ - 1.5, 0.9], [0, TZ - 1.9, 1.0]);
    // inside: a rug, a quilt and a heap of cushions
    const rug = mesh(new THREE.CylinderGeometry(1.7, 1.7, 0.04, 28).scale(1, 1, 0.95), mat(0xe9a6b8, 0.95));
    add(rug, 0, TZ + 0.1, 0.04);
    const quilt = mesh(new THREE.BoxGeometry(1.5, 0.12, 1.9), mat(0xf7dfe6, 0.9));
    quilt.rotation.y = 0.12;
    add(quilt, -0.35, TZ - 0.45, 0.12);
    const pastel = [0xff9fc0, 0xa6c8ff, 0xfff0d0, 0xc6b3ff, 0xffd08a, 0xa8e5c8];
    const cushion = (x: number, z: number, r: number, i: number, lift = 0.2): void => {
      const c = mesh(new THREE.SphereGeometry(r, 16, 12).scale(1, 0.5, 1), mat(pastel[i % pastel.length], 0.85));
      c.rotation.set(i * 0.4, i, i * 0.3 - 0.2);
      add(c, x, z, lift);
    };
    cushion(0.75, TZ - 0.9, 0.42, 0, 0.3);
    cushion(0.2, TZ - 1.25, 0.4, 1, 0.3);
    cushion(-0.75, TZ - 1.15, 0.38, 2, 0.34);
    cushion(1.05, TZ - 0.2, 0.36, 3, 0.24);
    cushion(-0.2, TZ - 0.7, 0.3, 4, 0.34);

    // places to sit round the fire: stumps, a long log with a blanket over it, cushions on the grass
    const stump = (x: number, z: number, r: number, h: number): void => {
      const g = new THREE.Group();
      const body = mesh(new THREE.CylinderGeometry(r, r * 1.08, h, 14), wood);
      body.position.y = h / 2;
      const top = mesh(new THREE.CircleGeometry(r * 0.96, 14).rotateX(-Math.PI / 2), cut);
      top.position.y = h + 0.004;
      g.add(body, top);
      add(g, x, z);
      this.solids.push([x, z, r + 0.1]);
    };
    stump(2.5, 0.9, 0.42, 0.5);
    stump(1.6, 2.4, 0.38, 0.46);
    stump(-0.6, 2.8, 0.4, 0.5);
    {
      const g = new THREE.Group();
      const log = mesh(new THREE.CylinderGeometry(0.36, 0.38, 2.6, 14).rotateZ(Math.PI / 2), wood);
      log.position.y = 0.36;
      g.add(log);
      for (const e of [-1, 1]) {
        const cap = mesh(new THREE.CircleGeometry(0.36, 14).rotateY((e * Math.PI) / 2), cut);
        cap.position.set(e * 1.302, 0.36, 0);
        g.add(cap);
      }
      const blanket = mesh(new THREE.CylinderGeometry(0.385, 0.4, 1.0, 14, 1, true, -1.9, 3.8).rotateZ(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xf5b8c8, roughness: 0.95, side: THREE.DoubleSide }));
      blanket.position.set(0.3, 0.36, 0);
      g.add(blanket);
      g.rotation.y = 1.15;
      add(g, -2.7, 0.7);
      this.solids.push([-2.9, 0.1, 0.5], [-2.5, 1.3, 0.5]);
    }
    cushion(2.9, -1.3, 0.4, 5, 0.18);
    cushion(-2.3, -1.9, 0.38, 3, 0.18);

    // lanterns either side of the door, and a few stepping stones up to the fire
    add(lantern(1.5), -2.05, TZ + 2.35);
    add(lantern(1.5), 2.05, TZ + 2.35);
    for (let i = 0; i < 4; i++) {
      const st = stone(0.42 + (i % 2) * 0.08, i);
      st.scale.y *= 0.3;
      add(st, Math.sin(i * 1.7) * 0.5, 4 + i * 1.25, 0.03);
    }

    // fairy lights: from the ridge of the tent out to two poles, and back round behind
    const POLE = 2.7;
    const poles: [number, number][] = [[-5, 0.6], [5, 0.6]];
    for (const [px, pz] of poles) {
      const p = mesh(new THREE.CylinderGeometry(0.05, 0.07, POLE, 8), wood);
      add(p, px, pz, POLE / 2);
      this.solids.push([px, pz, 0.25]);
    }
    const ridge = new THREE.Vector3(0, this.gy(0, TZ) + 3.25, TZ + 1.95);
    const back = new THREE.Vector3(0, this.gy(0, TZ) + 3.25, TZ - 1.95);
    const tops = poles.map(([px, pz]) => new THREE.Vector3(px, this.gy(px, pz) + POLE, pz));
    const runs: [THREE.Vector3, THREE.Vector3, number][] = [[ridge, tops[0], 11], [ridge, tops[1], 11], [tops[0], back, 13], [tops[1], back, 13]];
    const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffe2a0, fog: false }), runs.reduce((n, r) => n + r[2], 0));
    const wire = new THREE.LineBasicMaterial({ color: 0x4a3a2a });
    const m4 = new THREE.Matrix4();
    let bi = 0;
    for (const [a, b, n] of runs) {
      const sag = a.distanceTo(b) * 0.13;
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 24; i++) {
        const k = i / 24;
        pts.push(new THREE.Vector3().lerpVectors(a, b, k).setY(a.y + (b.y - a.y) * k - Math.sin(k * Math.PI) * sag));
      }
      s.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wire));
      for (let i = 0; i < n; i++) {
        const k = (i + 0.5) / n;
        m4.makeTranslation(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k - Math.sin(k * Math.PI) * sag - 0.09, a.z + (b.z - a.z) * k);
        bulbs.setMatrixAt(bi++, m4);
      }
    }
    bulbs.frustumCulled = false;
    s.add(bulbs);

    // flowers all around
    for (let i = 0; i < 16; i++) {
      const a = i * 2.39996;
      const r = 5.4 + ((i * 0.618) % 1) * 2.4;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r - 1.6;
      if (Math.abs(x) < 1.4 && z > 2) continue; // keep the way in clear
      const f = buildItem(i % 5 === 4 ? 6 : 5);
      f.scale.setScalar(0.62 + (i % 3) * 0.12);
      f.rotation.y = i * 1.3;
      add(f, x, z);
    }
    bakeStatic(s);
  }

  /** Bring the camp into the world. `show` plays its arrival; without it the camp is simply there (a saved game). */
  unlock(show: boolean): void {
    if (this.unlocked) return;
    this.unlocked = true;
    this.site.visible = true;
    for (const [x, z, r] of this.solids) this.colliders.add(this.x + x, this.z + z, r);
    if (show) {
      this.revealT = 0;
      this.site.scale.setScalar(0.001);
      this.burst.visible = true;
    }
  }

  /** Close enough to the fire to sit down beside it. */
  near(p: THREE.Vector3): boolean {
    if (!this.unlocked) return false;
    const d = Math.hypot(p.x - this.x, p.z - this.z);
    return d > 1.1 && d < 3.9;
  }

  update(dt: number, time: number): void {
    if (!this.unlocked) return;
    if (this.revealT >= 0) {
      this.revealT += dt;
      const k = Math.min(1, this.revealT / REVEAL);
      // rises out of the ground with a little overshoot
      const e = 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2);
      this.site.scale.setScalar(Math.max(0.001, e));
      const m = this.burst.material as THREE.PointsMaterial;
      const life = this.revealT / (REVEAL + 2.4);
      m.opacity = Math.sin(Math.min(1, life) * Math.PI) * 0.95;
      this.burst.position.y = life * 4.2;
      this.burst.rotation.y = life * 1.4;
      if (life >= 1) {
        this.revealT = -1;
        this.burst.visible = false;
        this.site.scale.setScalar(1);
      }
    }
    const flick = 0.82 + 0.1 * Math.sin(time * 11) + 0.08 * Math.sin(time * 23.7);
    if (this.flames) {
      this.flames.scale.set(0.94 + 0.06 * Math.sin(time * 9), flick * 1.1, 0.94 + 0.06 * Math.cos(time * 7.3));
      this.flames.rotation.y = time * 0.6;
    }
    this.light.intensity = 26 * flick * this.site.scale.x;
  }
}
