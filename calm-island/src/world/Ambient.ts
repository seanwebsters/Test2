import * as THREE from 'three';
import { mulberry32 } from '../core/math';
import type { Island } from './islandMap';
import { globalUniforms } from './shared';

/** Small signs of life: drifting pollen around the player and birds wheeling overhead. */
export class Ambient {
  readonly group = new THREE.Group();
  private pollen: THREE.ShaderMaterial;
  private birds: { pivot: THREE.Group; wingL: THREE.Mesh; wingR: THREE.Mesh; r: number; speed: number; phase: number; y: number; cx: number; cz: number }[] = [];

  private butterflies: { body: THREE.Group; wingL: THREE.Mesh; wingR: THREE.Mesh; hx: number; hz: number; ph: number; f: number; h: number }[] = [];

  private flocks: { x: number; z: number; air: number; scared: number; away: number; birds: { g: THREE.Group; l: THREE.Mesh; r: THREE.Mesh; ox: number; oz: number; ph: number }[] }[] = [];
  private fish: { m: THREE.Mesh; cx: number; cz: number; r: number; a: number; dir: number; y: number; fright: number }[] = [];
  private kick!: { points: THREE.Points; pos: Float32Array; vel: Float32Array; life: Float32Array; next: number; timer: number };

  constructor(private island: Island) {
    const rnd = mulberry32(11);
    this.buildReactive(rnd);
    // butterflies drifting between the flowers, always a few near the Calmling
    const wingGeo = new THREE.CircleGeometry(0.11, 10).scale(1, 1.25, 1).translate(0.1, 0, 0).rotateX(-Math.PI / 2);
    const tints = [0xffffff, 0xffe27a, 0xffa9d0, 0x9fd6ff, 0xffb46b, 0xd7b6ff];
    for (let i = 0; i < 18; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: tints[i % tints.length], side: THREE.DoubleSide });
      const body = new THREE.Group();
      const wingR = new THREE.Mesh(wingGeo, mat);
      const wingL = new THREE.Mesh(wingGeo, mat);
      wingL.scale.x = -1;
      body.add(wingL, wingR);
      body.scale.setScalar(0.8 + rnd() * 0.6);
      this.butterflies.push({ body, wingL, wingR, hx: rnd() * 60, hz: rnd() * 60, ph: rnd() * 6.3, f: 0.25 + rnd() * 0.3, h: 0.5 + rnd() * 1.1 });
      this.group.add(body);
    }
    const N = 260;
    const BOX = 46;
    const pos = new Float32Array(N * 3);
    const seed = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = rnd() * BOX;
      pos[i * 3 + 1] = rnd() * 9;
      pos[i * 3 + 2] = rnd() * BOX;
      seed[i] = rnd();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    this.pollen = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uTime: globalUniforms.uTime, uCenter: { value: new THREE.Vector3() }, uScale: { value: 600 } },
      vertexShader: /* glsl */ `
        uniform float uTime;
        uniform vec3 uCenter;
        uniform float uScale;
        attribute float aSeed;
        varying float vAlpha;
        void main() {
          vec3 p = position;
          p.x += uTime * 0.35 + sin(uTime * 0.6 + aSeed * 40.0) * 0.7;
          p.y += sin(uTime * 0.4 + aSeed * 20.0) * 0.6;
          p.z += uTime * 0.18 + cos(uTime * 0.5 + aSeed * 30.0) * 0.7;
          p.xz = mod(p.xz - uCenter.xz + ${(BOX / 2).toFixed(1)}, ${BOX.toFixed(1)}) - ${(BOX / 2).toFixed(1)} + uCenter.xz;
          p.y += uCenter.y - 1.0;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          float edge = 1.0 - smoothstep(${(BOX * 0.36).toFixed(1)}, ${(BOX * 0.5).toFixed(1)}, distance(p.xz, uCenter.xz));
          vAlpha = edge * (0.35 + 0.45 * sin(uTime * 1.3 + aSeed * 90.0)) * smoothstep(3.0, 7.0, -mv.z);
          gl_PointSize = uScale * (0.02 + aSeed * 0.022) / -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          gl_FragColor = vec4(1.0, 0.98, 0.8, smoothstep(0.5, 0.1, d) * vAlpha);
        }`,
    });
    const points = new THREE.Points(geo, this.pollen);
    points.frustumCulled = false;
    points.renderOrder = 6;
    this.group.add(points);

    const wing = new THREE.BufferGeometry();
    wing.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.28, 0, 0, -0.22, 1.25, 0, -0.1], 3));
    wing.computeVertexNormals();
    const birdMat = new THREE.MeshBasicMaterial({ color: 0xfafcff, side: THREE.DoubleSide, fog: true });
    for (let i = 0; i < 9; i++) {
      const pivot = new THREE.Group();
      const wingR = new THREE.Mesh(wing, birdMat);
      const wingL = new THREE.Mesh(wing, birdMat);
      wingL.scale.x = -1;
      pivot.add(wingL, wingR);
      pivot.scale.setScalar(0.9 + rnd() * 0.5);
      const flock = i < 5 ? { x: 70, z: -70 } : { x: 10, z: 250 };
      this.birds.push({ pivot, wingL, wingR, r: 26 + rnd() * 46, speed: (0.12 + rnd() * 0.1) * (rnd() < 0.5 ? 1 : -1), phase: rnd() * 6.3, y: 42 + rnd() * 32, cx: flock.x, cz: flock.z });
      this.group.add(pivot);
    }
  }

  /** Things that notice the Calmling: startled birds, shy fish, petals underfoot. */
  private buildReactive(rnd: () => number): void {
    const I = this.island;
    // little flocks pecking about on the ground
    const wingGeo = new THREE.BufferGeometry();
    wingGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.1, 0, 0, -0.1, 0.34, 0, -0.03], 3));
    wingGeo.computeVertexNormals();
    const bodyGeo = new THREE.SphereGeometry(1, 8, 6).scale(0.07, 0.07, 0.13);
    const spots = [[30, 44], [-34, 62], [112, -8], [58, 252], [-42, 272], [204, 62], [-92, -152], [22, -142], [-70, 120], [150, 150]];
    spots.forEach(([x, z], f) => {
      if (I.heightAt(x, z) < I.waterLevelAt(x, z) + 0.5) return;
      const mat = new THREE.MeshLambertMaterial({ color: [0xfafafa, 0x8a6a4a, 0xf2c14a, 0x6a8fd0][f % 4], side: THREE.DoubleSide });
      const birds = [];
      for (let i = 0; i < 5; i++) {
        const g = new THREE.Group();
        const l = new THREE.Mesh(wingGeo, mat);
        const r = new THREE.Mesh(wingGeo, mat);
        l.scale.x = -1;
        g.add(new THREE.Mesh(bodyGeo, mat), l, r);
        this.group.add(g);
        birds.push({ g, l, r, ox: (rnd() - 0.5) * 3.4, oz: (rnd() - 0.5) * 3.4, ph: rnd() * 6.3 });
      }
      this.flocks.push({ x, z, air: 0, scared: 0, away: 0, birds });
    });
    // fish idling in the lakes and the garden pond
    const fishGeo = new THREE.SphereGeometry(1, 10, 8).scale(0.07, 0.09, 0.26);
    I.lakes.forEach((lake, li) => {
      const n = lake.r > 20 ? 9 : 5;
      for (let i = 0; i < n; i++) {
        const mat = new THREE.MeshLambertMaterial({ color: li === 2 ? [0xff8a2a, 0xffffff, 0xf2b63a][i % 3] : [0x2f6f9a, 0x4a8fb8, 0xd98a3a][i % 3] });
        const m = new THREE.Mesh(fishGeo, mat);
        m.scale.setScalar(li === 2 ? 0.8 : 1.3);
        this.group.add(m);
        this.fish.push({ m, cx: lake.x, cz: lake.z, r: lake.r * (0.15 + rnd() * 0.5), a: rnd() * 6.3, dir: rnd() < 0.5 ? 1 : -1, y: lake.level - 0.14 - rnd() * 0.12, fright: 0 });
      }
    });
    // petals and grass seed thrown up by running feet
    const N = 70;
    const pos = new Float32Array(N * 3).fill(-999);
    const col = new Float32Array(N * 3);
    const tints = [0xffc2dc, 0xffffff, 0xffe27a, 0xa6e06a, 0xf79ac0];
    const c = new THREE.Color();
    for (let i = 0; i < N; i++) col.set(c.set(tints[i % tints.length]).toArray(), i * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const points = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.11, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false }));
    points.frustumCulled = false;
    this.group.add(points);
    this.kick = { points, pos, vel: new Float32Array(N * 3), life: new Float32Array(N), next: 0, timer: 0 };
  }

  private updateReactive(dt: number, time: number, p: THREE.Vector3, speed: number, grounded: boolean): void {
    const I = this.island;
    for (const f of this.flocks) {
      const d = Math.hypot(f.x - p.x, f.z - p.z);
      if (d < 7 && f.scared <= 0) f.away = Math.atan2(f.x - p.x, f.z - p.z); // fly directly away
      if (d < 7) f.scared = 12;
      else if (d > 18) f.scared -= dt;
      f.air += ((f.scared > 0 ? 1 : 0) - f.air) * (1 - Math.exp(-(f.scared > 0 ? 1.6 : 0.5) * dt));
      for (const b of f.birds) {
        const circle = time * 0.7 + b.ph;
        const x = f.x + b.ox + (Math.sin(f.away) * 20 + Math.cos(circle) * 6) * f.air;
        const z = f.z + b.oz + (Math.cos(f.away) * 20 + Math.sin(circle) * 6) * f.air;
        const flying = f.air > 0.03;
        const hop = flying ? 0 : Math.max(0, Math.sin(time * 5 + b.ph * 4)) * 0.05;
        b.g.position.set(x, I.heightAt(x, z) + 0.08 + hop + f.air * (9 + Math.sin(circle * 1.7) * 1.5), z);
        b.g.rotation.y = flying ? f.away + (Math.cos(circle) * 0.8 - 0.4) * f.air : b.ph + Math.sin(time * 0.5 + b.ph) * 1.5;
        const flap = flying ? Math.sin(time * 16 + b.ph) * 0.9 : 1.25;
        b.l.rotation.z = -flap;
        b.r.rotation.z = flap;
      }
    }
    for (const f of this.fish) {
      const x = f.cx + Math.cos(f.a) * f.r;
      const z = f.cz + Math.sin(f.a) * f.r;
      if (Math.hypot(x - p.x, z - p.z) < 4.5 && f.fright <= 0) {
        f.fright = 1.6; // dart off the other way
        f.dir = -f.dir;
      }
      f.fright = Math.max(0, f.fright - dt);
      f.a += (f.dir * dt * (0.5 + f.fright * 4)) / Math.max(f.r, 1.2);
      f.m.position.set(x, f.y + Math.sin(time * 1.3 + f.r) * 0.04, z);
      f.m.rotation.y = -f.a + (f.dir > 0 ? Math.PI : 0) + Math.sin(time * 6 + f.r) * 0.25;
    }
    const k = this.kick;
    k.timer -= dt;
    if (grounded && speed > 5.2 && k.timer <= 0 && I.sample(I.sand, p.x, p.z) < 0.3 && p.y < 62) {
      k.timer = 0.07;
      for (let n = 0; n < 2; n++) {
        const i = (k.next = (k.next + 1) % k.life.length);
        k.pos.set([p.x + (Math.random() - 0.5) * 0.6, p.y + 0.1, p.z + (Math.random() - 0.5) * 0.6], i * 3);
        k.vel.set([(Math.random() - 0.5) * 2.4, 1.6 + Math.random() * 1.8, (Math.random() - 0.5) * 2.4], i * 3);
        k.life[i] = 1.3 + Math.random() * 0.8;
      }
    }
    for (let i = 0; i < k.life.length; i++) {
      if (k.life[i] <= 0) continue;
      k.life[i] -= dt;
      const o = i * 3;
      // flutter down rather than fall
      k.vel[o + 1] = Math.max(k.vel[o + 1] - 4.5 * dt, -0.7);
      k.vel[o] += Math.sin(time * 5 + i) * 2.2 * dt;
      k.vel[o + 2] += Math.cos(time * 4.3 + i * 2) * 2.2 * dt;
      k.pos[o] += k.vel[o] * dt;
      k.pos[o + 1] += k.vel[o + 1] * dt;
      k.pos[o + 2] += k.vel[o + 2] * dt;
      if (k.life[i] <= 0) k.pos[o + 1] = -999;
    }
    k.points.geometry.attributes.position.needsUpdate = true;
  }

  setViewport(heightPx: number): void {
    this.pollen.uniforms.uScale.value = heightPx;
  }

  update(dt: number, time: number, center: THREE.Vector3, speed: number, grounded: boolean, night: number): void {
    (this.pollen.uniforms.uCenter.value as THREE.Vector3).copy(center);
    this.updateReactive(dt, time, center, speed, grounded);
    for (const b of this.butterflies) b.body.visible = night < 0.5; // butterflies sleep; the pollen glows like fireflies
    for (const b of this.butterflies) {
      const t = time * b.f + b.ph;
      // a looping wander around a home spot that wraps to stay near the player
      const hx = center.x + ((((b.hx - center.x) % 60) + 90) % 60) - 30;
      const hz = center.z + ((((b.hz - center.z) % 60) + 90) % 60) - 30;
      const x = hx + Math.sin(t) * 3.2 + Math.sin(t * 2.7 + 1) * 1.1;
      const z = hz + Math.cos(t * 0.8) * 3.2 + Math.cos(t * 2.3) * 1.1;
      const ground = Math.max(this.island.heightAt(x, z), this.island.waterLevelAt(x, z));
      const vx = Math.cos(t) * 3.2 + Math.cos(t * 2.7 + 1) * 3;
      const vz = -Math.sin(t * 0.8) * 2.6 - Math.sin(t * 2.3) * 2.5;
      b.body.position.set(x, ground + b.h + Math.sin(time * 3 + b.ph) * 0.18, z);
      b.body.rotation.y = Math.atan2(vx, vz) + Math.PI / 2;
      const flap = 0.15 + Math.abs(Math.sin(time * 13 + b.ph * 5)) * 1.15;
      b.wingR.rotation.z = flap;
      b.wingL.rotation.z = -flap;
    }
    for (const b of this.birds) {
      const a = time * b.speed + b.phase;
      b.pivot.position.set(b.cx + Math.cos(a) * b.r, b.y + Math.sin(a * 2.3) * 3, b.cz + Math.sin(a) * b.r);
      b.pivot.rotation.y = -a + (b.speed > 0 ? 0 : Math.PI);
      b.pivot.rotation.z = b.speed > 0 ? -0.25 : 0.25;
      const glide = Math.sin(time * 0.35 + b.phase) > 0.55 ? 0.15 : 1;
      const flap = Math.sin(time * 7.5 + b.phase * 3) * 0.6 * glide + 0.15;
      b.wingR.rotation.z = flap;
      b.wingL.rotation.z = -flap;
    }
  }
}
