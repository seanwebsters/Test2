import * as THREE from 'three';
import { mulberry32 } from '../core/math';
import { Colliders } from './Colliders';
import { GARDEN_HEIGHT, HALF, polylineAt, type Island } from './islandMap';
import { Noise2D } from './noise';
import * as plants from './plantGeometry';
import { globalUniforms } from './shared';

interface Kind {
  hi: THREE.BufferGeometry;
  lo?: THREE.BufferGeometry;
  material: THREE.Material;
  shadow: boolean;
  /** beyond this the low-detail mesh is shown (if any) */
  lodDist: number;
  /** beyond this the sector is hidden altogether */
  cullDist: number;
  tint: boolean;
  /** rounded foliage looks cleaner without self-shadowing */
  receive?: boolean;
}

interface Batch {
  hi: THREE.InstancedMesh;
  lo: THREE.InstancedMesh | null;
  cx: number;
  cz: number;
  kind: Kind;
}

const SECTOR = 128;
const SECTORS = (HALF * 2) / SECTOR;

/** Lambert material with vertex colours and a gentle wind sway above `base`. */
function foliageMaterial(sway: number, base: number, doubleSide = false, leafy = false, bloom = false): THREE.MeshLambertMaterial {
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, side: doubleSide ? THREE.DoubleSide : THREE.FrontSide });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = globalUniforms.uTime;
    shader.uniforms.uPlayer = globalUniforms.uPlayer;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform vec3 uPlayer;')
      .replace(
        '#include <begin_vertex>',
        /* glsl */ `#include <begin_vertex>
        #ifdef USE_INSTANCING
          float swayPhase = instanceMatrix[3].x * 0.37 + instanceMatrix[3].z * 0.23;
        #else
          float swayPhase = 0.0;
        #endif
        float swayAmt = ${sway.toFixed(4)} * max(position.y - ${base.toFixed(2)}, 0.0);
        transformed.x += (sin(uTime * 1.3 + swayPhase) + 0.5 * sin(uTime * 2.9 + swayPhase * 1.7 + position.y)) * swayAmt;
        transformed.z += cos(uTime * 1.1 + swayPhase * 1.3) * swayAmt * 0.7;
        ${bloom ? `
        #ifdef USE_INSTANCING
          // flowers wait half-closed and open up as the Calmling comes near
          float near = 1.0 - smoothstep(2.5, 8.0, distance(instanceMatrix[3].xyz, uPlayer));
          transformed *= mix(0.6, 1.12, near * near * (3.0 - 2.0 * near));
        #endif` : ''}
        ${leafy ? `
        #ifdef USE_INSTANCING
          vLeafPos = (instanceMatrix * vec4(position, 1.0)).xyz;
        #else
          vLeafPos = position;
        #endif` : ''}`,
      );
    if (leafy) {
      // Dappled clumps of lighter and darker leaves, so crowns read as foliage
      // rather than smooth balloons.
      shader.vertexShader = shader.vertexShader.replace('uniform float uTime;', 'uniform float uTime;\nvarying vec3 vLeafPos;');
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          /* glsl */ `#include <common>
          varying vec3 vLeafPos;
          float leafHash(vec3 p) {
            p = fract(p * vec3(0.1031, 0.1030, 0.0973));
            p += dot(p, p.yxz + 33.33);
            return fract((p.x + p.y) * p.z);
          }
          float leafNoise(vec3 p) {
            vec3 i = floor(p);
            vec3 f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            return mix(
              mix(mix(leafHash(i), leafHash(i + vec3(1, 0, 0)), f.x), mix(leafHash(i + vec3(0, 1, 0)), leafHash(i + vec3(1, 1, 0)), f.x), f.y),
              mix(mix(leafHash(i + vec3(0, 0, 1)), leafHash(i + vec3(1, 0, 1)), f.x), mix(leafHash(i + vec3(0, 1, 1)), leafHash(i + vec3(1, 1, 1)), f.x), f.y),
              f.z);
          }`,
        )
        .replace(
          '#include <color_fragment>',
          /* glsl */ `#include <color_fragment>
          float clump = leafNoise(vLeafPos * 1.9) * 0.6 + leafNoise(vLeafPos * 5.3 + 7.0) * 0.4;
          diffuseColor.rgb *= mix(0.8, 1.14, smoothstep(0.32, 0.7, clump));`,
        );
    }
  };
  return mat;
}

/** All the island's plants and rocks, instanced per 128 m sector with simple LOD. */
export class Vegetation {
  readonly group = new THREE.Group();
  readonly colliders = new Colliders();
  /** x, z, radius triples: where the ground should be gently shaded */
  readonly shade: number[] = [];
  private batches: Batch[] = [];
  private pending = new Map<Kind, { m: number[][]; c: number[][] }>();
  private occupied = new Map<number, number[]>();
  counts: Record<string, number> = {};

  constructor(private island: Island) {
    const rnd = mulberry32(2024);
    const nz = new Noise2D(606);
    const tree = foliageMaterial(0.012, 2.2, false, true);
    const small = foliageMaterial(0.05, 0.1, false, true);
    const leafy = foliageMaterial(0.035, 0.2, true);
    const palmMat = foliageMaterial(0.014, 3, true);
    const flowerMat = foliageMaterial(0.16, 0.05, true, false, true);
    const rockMat = new THREE.MeshLambertMaterial({ vertexColors: true });

    const treeKind = (make: (detail: number) => THREE.BufferGeometry): Kind => ({
      hi: make(4), lo: make(2), material: tree, shadow: true, lodDist: 70, cullDist: 1e9, tint: false, receive: false,
    });
    const broad = [0, 1, 2].map((v) => treeKind((d) => plants.broadleafTree(v, d)));
    const cherry = [0, 1].map((v) => treeKind((d) => plants.cherryTree(v, d)));
    const pine = [0, 1].map((v) => treeKind((d) => plants.pineTree(v, d)));
    const palm = [0, 1, 2].map((v): Kind => ({ hi: plants.palmTree(v), material: palmMat, shadow: true, lodDist: 1e9, cullDist: 1e9, tint: false }));
    const bush = [0, 1].map((v): Kind => ({ hi: plants.bush(v), material: small, shadow: true, lodDist: 1e9, cullDist: 420, tint: false, receive: false }));
    const fern = [0, 1].map((v): Kind => ({ hi: plants.fern(v), material: leafy, shadow: false, lodDist: 1e9, cullDist: 230, tint: false }));
    const tropical: Kind = { hi: plants.tropicalPlant(), material: leafy, shadow: true, lodDist: 1e9, cullDist: 260, tint: false };
    const rock = [0, 1, 2].map((v): Kind => ({ hi: plants.rock(v), material: rockMat, shadow: true, lodDist: 1e9, cullDist: 1e9, tint: false }));
    const flower = (g: THREE.BufferGeometry, cull = 200): Kind => ({ hi: g, material: flowerMat, shadow: false, lodDist: 1e9, cullDist: cull, tint: true });
    const daisy = flower(plants.daisy());
    const hibiscus = flower(plants.hibiscus());
    const lupine = flower(plants.lupine());
    const pad: Kind = { hi: plants.lilyPad(), material: leafy, shadow: false, lodDist: 1e9, cullDist: 260, tint: false };
    const lotus: Kind = { hi: plants.lotus(), material: flowerMat, shadow: false, lodDist: 1e9, cullDist: 200, tint: false };

    const I = island;
    const grad = { x: 0, z: 0 };
    const at = (g: Float32Array, x: number, z: number): number => I.sample(g, x, z);
    const pick = <T>(list: T[]): T => list[Math.floor(rnd() * list.length)];
    const DAISY_TINTS = [0xffffff, 0xffffff, 0xfff4c2, 0xffd9ec, 0xe8dcff];
    const HIBISCUS_TINTS = [0xff3b3b, 0xff5a36, 0xff4f8a, 0xffa13d];
    const LUPINE_TINTS = [0x9f7bff, 0x7e8bff, 0xd27bff, 0xff8fd0];

    const tree1 = (kind: Kind, x: number, z: number, scale: number, colliderR: number, spacing: number): boolean => {
      if (I.gradientAt(x, z, grad) > 0.62) return false; // never on a cliff face
      if (spacing > 0 && !this.claim(x, z, spacing)) return false;
      this.put(kind, x, I.heightAt(x, z) - 0.15 * scale, z, rnd() * Math.PI * 2, scale, scale * (0.9 + rnd() * 0.25));
      if (colliderR > 0) this.colliders.add(x, z, colliderR * scale);
      this.shade.push(x, z, 3.6 * scale);
      return true;
    };

    // ---- the Calm Garden, composed by hand -------------------------------
    tree1(broad[0], -11, -13, 2.3, 0.42, 6);
    const ringR = 27;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + 0.26;
      const x = Math.cos(a) * (ringR + (rnd() - 0.5) * 5);
      const z = Math.sin(a) * (ringR + (rnd() - 0.5) * 5);
      if (at(I.path, x, z) > 0.05 || at(I.wet, x, z) > 0) continue;
      tree1(pick(cherry), x, z, 1.05 + rnd() * 0.35, 0.34, 5);
    }
    // flower beds in arcs around the heart of the garden
    const bed = (r0: number, r1: number, a0: number, a1: number, kind: Kind, tints: number[], n: number, sMin: number, sMax: number): void => {
      for (let i = 0; i < n; i++) {
        const a = a0 + (a1 - a0) * rnd();
        const r = r0 + (r1 - r0) * Math.sqrt(rnd());
        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r;
        if (at(I.path, x, z) > 0.15 || at(I.wet, x, z) > 0.02) continue;
        this.put(kind, x, I.heightAt(x, z), z, rnd() * 6.3, sMin + rnd() * (sMax - sMin), undefined, pick(tints));
      }
    };
    bed(11, 14, 0.5, 2.6, lupine, LUPINE_TINTS, 150, 1.0, 1.7);
    bed(11, 14, 3.4, 5.6, lupine, [0xff8fd0, 0xffb3de, 0xd27bff], 150, 1.0, 1.7);
    bed(15, 18.5, 0.2, 6.2, daisy, DAISY_TINTS, 420, 0.9, 1.5);
    bed(19.5, 23, 1.2, 2.9, hibiscus, HIBISCUS_TINTS, 60, 1.0, 1.6);
    bed(19.5, 23, 4.0, 5.9, hibiscus, HIBISCUS_TINTS, 60, 1.0, 1.6);
    bed(2, 6.5, 0, 6.28, daisy, [0xffffff, 0xfff4c2], 90, 0.8, 1.2);
    for (const [x, z, s, k] of [[-19, 7, 1.7, 0], [9, 20, 1.2, 1], [22, 5, 1.0, 2], [-5, -22, 1.4, 1], [-20, -9, 0.9, 2], [6.5, -16, 0.8, 0]] as const) {
      this.put(rock[k], x, GARDEN_HEIGHT - 0.1, z, rnd() * 6, s, s * 0.85);
      this.colliders.add(x, z, s * 0.8);
      for (let i = 0; i < 3; i++) {
        const a = rnd() * 6.3;
        this.put(i ? pick(fern) : tropical, x + Math.cos(a) * (s + 0.5), GARDEN_HEIGHT, z + Math.sin(a) * (s + 0.5), rnd() * 6, 0.9 + rnd() * 0.5);
      }
    }
    // the pond: reeds of fern, stones on the rim, lily pads on the water
    const pond = I.lakes[2];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + rnd() * 0.3;
      const r = pond.r * (0.95 + rnd() * 0.18);
      const x = pond.x + Math.cos(a) * r;
      const z = pond.z + Math.sin(a) * r;
      if (i % 3 === 0) {
        const s = 0.45 + rnd() * 0.45;
        this.put(pick(rock), x, I.heightAt(x, z) - 0.05, z, rnd() * 6, s, s * 0.8);
        if (s > 0.6) this.colliders.add(x, z, s * 0.75);
      } else if (at(I.path, x, z) < 0.1) {
        this.put(i % 3 === 1 ? pick(fern) : tropical, x, I.heightAt(x, z), z, rnd() * 6, 0.8 + rnd() * 0.5);
      }
    }
    for (let i = 0; i < 11; i++) {
      const a = rnd() * 6.3;
      const r = Math.sqrt(rnd()) * pond.r * 0.62;
      const x = pond.x + Math.cos(a) * r;
      const z = pond.z + Math.sin(a) * r;
      const s = 0.6 + rnd() * 0.7;
      this.put(pad, x, pond.level + 0.035, z, rnd() * 6, s, 1);
      if (i % 3 === 0) this.put(lotus, x, pond.level + 0.05, z, rnd() * 6, 1.1 + rnd() * 0.5);
    }

    // ---- blossom trees framing the lakes and the river --------------------
    for (const lake of [I.lakes[0], I.lakes[1]]) {
      for (let i = 0; i < 26; i++) {
        const a = rnd() * 6.3;
        const r = lake.r + 5 + rnd() * 16;
        const x = lake.x + Math.cos(a) * r;
        const z = lake.z + Math.sin(a) * r;
        if (this.dry(x, z, 0.4) && at(I.path, x, z) < 0.05) tree1(pick(cherry), x, z, 0.95 + rnd() * 0.5, 0.34, 6);
      }
    }
    for (let s = I.falls.baseS + 60; s < I.river.length - 40; s += 13 + rnd() * 16) {
      const q = polylineAt(I.river, s);
      const side = rnd() < 0.5 ? -1 : 1;
      const off = 11 + rnd() * 9;
      const x = q.x - q.tz * off * side;
      const z = q.z + q.tx * off * side;
      if (this.dry(x, z, 0.4) && at(I.sand, x, z) < 0.2 && at(I.path, x, z) < 0.05) tree1(rnd() < 0.6 ? pick(cherry) : pick(broad), x, z, 0.9 + rnd() * 0.5, 0.34, 6);
    }

    // ---- forests, groves and lone trees ----------------------------------
    for (let i = 0; i < 14000; i++) {
      const x = (rnd() - 0.5) * 900;
      const z = (rnd() - 0.5) * 900;
      const f = at(I.forest, x, z);
      const lone = rnd() < 0.012;
      if (f < rnd() * 0.85 + 0.12 && !lone) continue;
      const h = I.heightAt(x, z);
      if (h < 3.6 || h > 92 || at(I.sand, x, z) > 0.1 || at(I.path, x, z) > 0.02 || !this.dry(x, z, 0.5)) continue;
      if (Math.hypot(x, z) < 33) continue;
      const high = h > 42;
      let kind: Kind;
      const r = rnd();
      if (high) kind = r < (h > 60 ? 0.95 : 0.62) ? pick(pine) : r < 0.9 ? pick(broad) : pick(cherry);
      else if (lone) kind = r < 0.45 ? pick(cherry) : pick(broad);
      else kind = r < 0.07 ? pick(cherry) : r < 0.16 ? pick(pine) : pick(broad);
      tree1(kind, x, z, 0.85 + rnd() * 0.75, 0.34, lone ? 9 : 4.6);
    }

    // ---- palms along the beaches -----------------------------------------
    for (let i = 0; i < 9000; i++) {
      const x = (rnd() - 0.5) * 940;
      const z = (rnd() - 0.5) * 940;
      const sd = at(I.sand, x, z);
      if (sd < 0.25 || sd > 0.97) continue;
      const h = I.heightAt(x, z);
      if (h < 1.5 || h > 4.5 || rnd() > 0.3) continue;
      tree1(pick(palm), x, z, 0.85 + rnd() * 0.5, 0.26, 6.5);
    }

    // ---- undergrowth ------------------------------------------------------
    for (let i = 0; i < 26000; i++) {
      const x = (rnd() - 0.5) * 900;
      const z = (rnd() - 0.5) * 900;
      const f = at(I.forest, x, z);
      const h = I.heightAt(x, z);
      if (h < 3.2 || h > 80 || at(I.sand, x, z) > 0.2 || at(I.path, x, z) > 0.1 || !this.dry(x, z, 0.6)) continue;
      if (I.gradientAt(x, z, grad) > 0.7) continue;
      const edge = f * (1 - f) * 4;
      const p = rnd();
      if (p < 0.1 + f * 0.35) this.put(pick(fern), x, h, z, rnd() * 6.3, 0.8 + rnd() * 0.9);
      else if (p < 0.14 + f * 0.3 + edge * 0.25) {
        const s = 0.8 + rnd() * 0.9;
        this.put(pick(bush), x, h - 0.1, z, rnd() * 6.3, s);
        this.shade.push(x, z, 1.3 * s);
      } else if (p > 0.985 - f * 0.02) this.put(tropical, x, h, z, rnd() * 6.3, 0.9 + rnd() * 0.8);
    }

    // ---- rocks: scree on slopes, boulders in meadows, stones in the river --
    for (let i = 0; i < 9000; i++) {
      const x = (rnd() - 0.5) * 940;
      const z = (rnd() - 0.5) * 940;
      const h = I.heightAt(x, z);
      if (h < -1.2 || Math.hypot(x, z) < 28 || at(I.path, x, z) > 0.1) continue;
      const slope = I.gradientAt(x, z, grad);
      const wetness = at(I.wet, x, z);
      let chance = 0.012;
      if (slope > 0.5 && slope < 1.6) chance = 0.28;
      if (wetness > 0.05 && wetness < 0.75) chance = 0.22;
      if (h < 1 && h > -1) chance = 0.05;
      if (h > 95) chance = 0.1;
      if (rnd() > chance) continue;
      const s = 0.35 + Math.pow(rnd(), 2.2) * 2.6;
      this.put(pick(rock), x, h - 0.12 * s, z, rnd() * 6.3, s, s * (0.7 + rnd() * 0.5));
      if (s > 0.7) this.colliders.add(x, z, s * 0.78);
      if (s > 0.6) this.shade.push(x, z, 1.5 * s);
    }

    // ---- wildflower drifts ------------------------------------------------
    for (let i = 0; i < 90000; i++) {
      const x = (rnd() - 0.5) * 880;
      const z = (rnd() - 0.5) * 880;
      const a = nz.simplex(x * 0.017, z * 0.017);
      const b = nz.simplex(x * 0.021 + 50, z * 0.021 - 20);
      const c = nz.simplex(x * 0.03 - 80, z * 0.03 + 33);
      if (a < 0.28 && b < 0.42 && c < 0.55) continue;
      const h = I.heightAt(x, z);
      if (h < 3.4 || h > 70 || at(I.sand, x, z) > 0.1 || at(I.path, x, z) > 0.12 || !this.dry(x, z, 0.9)) continue;
      if (I.gradientAt(x, z, grad) > 0.55 || Math.hypot(x, z) < 26) continue;
      if (a >= 0.28 && rnd() < 0.5) this.put(daisy, x, h, z, rnd() * 6.3, 0.9 + rnd() * 0.8, undefined, pick(DAISY_TINTS));
      else if (b >= 0.42 && rnd() < 0.42) this.put(lupine, x, h, z, rnd() * 6.3, 1 + rnd() * 0.9, undefined, pick(LUPINE_TINTS));
      else if (c >= 0.55 && rnd() < 0.2) this.put(hibiscus, x, h, z, rnd() * 6.3, 0.9 + rnd() * 0.7, undefined, pick(HIBISCUS_TINTS));
    }

    this.build();
  }

  private dry(x: number, z: number, margin: number): boolean {
    const I = this.island;
    return I.sample(I.wet, x, z) <= 0 && I.heightAt(x, z) > I.waterLevelAt(x, z) + margin;
  }

  /** Reserve a spot so trees keep their distance from each other. */
  private claim(x: number, z: number, spacing: number): boolean {
    const S = 10;
    const cx = Math.floor(x / S);
    const cz = Math.floor(z / S);
    for (let i = cx - 1; i <= cx + 1; i++) {
      for (let j = cz - 1; j <= cz + 1; j++) {
        const list = this.occupied.get(i * 4096 + j);
        if (!list) continue;
        for (let k = 0; k < list.length; k += 2) {
          if (Math.hypot(list[k] - x, list[k + 1] - z) < spacing) return false;
        }
      }
    }
    const key = cx * 4096 + cz;
    let list = this.occupied.get(key);
    if (!list) this.occupied.set(key, (list = []));
    list.push(x, z);
    return true;
  }

  private put(kind: Kind, x: number, y: number, z: number, rotY: number, scale: number, scaleY?: number, tint?: number): void {
    let p = this.pending.get(kind);
    if (!p) this.pending.set(kind, (p = { m: [], c: [] }));
    p.m.push([x, y, z, rotY, scale, scaleY ?? scale]);
    p.c.push([tint ?? 0xffffff]);
  }

  private build(): void {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const pos = new THREE.Vector3();
    const scl = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    const col = new THREE.Color();
    let total = 0;
    for (const [kind, data] of this.pending) {
      const sectors = new Map<number, number[]>();
      data.m.forEach((it, i) => {
        const sx = Math.min(SECTORS - 1, Math.max(0, Math.floor((it[0] + HALF) / SECTOR)));
        const sz = Math.min(SECTORS - 1, Math.max(0, Math.floor((it[2] + HALF) / SECTOR)));
        const key = sz * SECTORS + sx;
        let l = sectors.get(key);
        if (!l) sectors.set(key, (l = []));
        l.push(i);
      });
      for (const [key, ids] of sectors) {
        const make = (geo: THREE.BufferGeometry, shadow: boolean): THREE.InstancedMesh => {
          const mesh = new THREE.InstancedMesh(geo, kind.material, ids.length);
          ids.forEach((id, n) => {
            const it = data.m[id];
            pos.set(it[0], it[1], it[2]);
            q.setFromAxisAngle(up, it[3]);
            scl.set(it[4], it[5], it[4]);
            mesh.setMatrixAt(n, m.compose(pos, q, scl));
            if (kind.tint) mesh.setColorAt(n, col.set(data.c[id][0]));
          });
          mesh.instanceMatrix.needsUpdate = true;
          mesh.castShadow = shadow;
          mesh.receiveShadow = kind.receive ?? true;
          mesh.computeBoundingSphere();
          mesh.matrixAutoUpdate = false;
          this.group.add(mesh);
          return mesh;
        };
        const hi = make(kind.hi, kind.shadow);
        const lo = kind.lo ? make(kind.lo, false) : null;
        this.batches.push({
          hi, lo, kind,
          cx: ((key % SECTORS) + 0.5) * SECTOR - HALF,
          cz: (Math.floor(key / SECTORS) + 0.5) * SECTOR - HALF,
        });
        total += ids.length;
      }
    }
    this.counts = { instances: total, batches: this.batches.length, colliders: this.colliders.count };
    this.pending.clear();
    this.occupied.clear();
  }

  /** Swap level of detail and hide far-away small plants. */
  update(camera: THREE.Vector3, distanceScale: number): void {
    for (const b of this.batches) {
      const d = Math.max(0, Math.hypot(b.cx - camera.x, b.cz - camera.z) - SECTOR * 0.71);
      const visible = d < b.kind.cullDist * distanceScale;
      const near = d < b.kind.lodDist * distanceScale;
      b.hi.visible = visible && (near || !b.lo);
      if (b.lo) b.lo.visible = visible && !near;
    }
  }
}
