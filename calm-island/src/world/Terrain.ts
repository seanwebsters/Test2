import * as THREE from 'three';
import { clamp, lerp, smoothstep } from '../core/math';
import { CELL, GRID, HALF, WORLD_SIZE, type Island } from './islandMap';
import { Noise2D } from './noise';
import { SEASON } from './season';
import { globalUniforms } from './shared';

type RGB = [number, number, number];
const hex = (h: number): RGB => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];
const mix3 = (a: RGB, b: RGB, t: number, out: RGB): RGB => {
  out[0] = a[0] + (b[0] - a[0]) * t;
  out[1] = a[1] + (b[1] - a[1]) * t;
  out[2] = a[2] + (b[2] - a[2]) * t;
  return out;
};

const GRASS_A = hex(0x6a9f4c);
const GRASS_B = hex(0x4a8546);
const GRASS_SUN = hex(0x9dbd5a);
const GRASS_FOREST = hex(0x336b35);
const ALPINE = hex(0x8fa878);
const SAND = hex(0xf3e2b3);
const SAND_WET = hex(0xd9c493);
const SEABED = hex(0xe9e4c0);
const BED = hex(0xcbbd92);
const PATH = hex(0x94664a);
const PATH_EDGE = hex(0x7a6240);
const ROCK_A = hex(0x9c9284);
const ROCK_B = hex(0x7b7468);
const ROCK_WARM = hex(0xb39c7c);
const SNOW = hex(0xf6f9ff);
const DRY = hex(0x9a9a55);
const EARTH = hex(0x6a5a38);
const FLOWER_A = hex(0xe8e2b0);
const FLOWER_B = hex(0xb9a0d8);
const MUD = hex(0x8a7650);
const AUTUMN_GRASS = hex(0xc9a83a);

/**
 * Paints the island into one colour texture (rgb = ground colour, a = how much
 * grass grows there). The terrain mesh and the grass blades both read it, so
 * the blades always melt into the ground they stand on.
 */
export function bakeGroundTexture(island: Island, res: number, shadeSpots: number[] = []): THREE.DataTexture {
  // Soft pools of shade under every tree and boulder, so distant ones sit on
  // the ground instead of floating (real shadows only reach near the player).
  const SR = 1024;
  const shadeGrid = new Float32Array(SR * SR);
  for (let k = 0; k < shadeSpots.length; k += 3) {
    const cx = ((shadeSpots[k] + HALF) / WORLD_SIZE) * SR;
    const cz = ((shadeSpots[k + 1] + HALF) / WORLD_SIZE) * SR;
    const rad = (shadeSpots[k + 2] / WORLD_SIZE) * SR;
    const i0 = Math.max(0, Math.floor(cx - rad));
    const i1 = Math.min(SR - 1, Math.ceil(cx + rad));
    const j0 = Math.max(0, Math.floor(cz - rad));
    const j1 = Math.min(SR - 1, Math.ceil(cz + rad));
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const t = 1 - Math.hypot(i - cx, j - cz) / rad;
        if (t <= 0) continue;
        const v = t * t * (3 - 2 * t);
        const idx = j * SR + i;
        if (v > shadeGrid[idx]) shadeGrid[idx] = v;
      }
    }
  }
  const data = new Uint8Array(res * res * 4);
  const n1 = new Noise2D(77);
  const n2 = new Noise2D(303);
  const c: RGB = [0, 0, 0];
  const rock: RGB = [0, 0, 0];
  const scale = (GRID - 1) / res; // grid cells per texel
  const { height, sand, path, forest, wet } = island;

  const bil = (g: Float32Array, fx: number, fz: number): number => {
    const i = Math.min(Math.floor(fx), GRID - 2);
    const j = Math.min(Math.floor(fz), GRID - 2);
    const tx = fx - i;
    const tz = fz - j;
    const k = j * GRID + i;
    const a = g[k];
    const b = g[k + 1];
    const cc = g[k + GRID];
    const d = g[k + GRID + 1];
    return a + (b - a) * tx + (cc - a) * tz + (a - b - cc + d) * tx * tz;
  };
  const maxF = GRID - 1.001;

  for (let j = 0; j < res; j++) {
    const fz = clamp((j + 0.5) * scale, 0, maxF);
    const z = fz * CELL - HALF;
    for (let i = 0; i < res; i++) {
      const fx = clamp((i + 0.5) * scale, 0, maxF);
      const x = fx * CELL - HALF;
      const o = (j * res + i) * 4;
      const h = bil(height, fx, fz);
      if (h < -7) {
        data[o] = SEABED[0] * 255;
        data[o + 1] = SEABED[1] * 255;
        data[o + 2] = SEABED[2] * 255;
        data[o + 3] = 0;
        continue;
      }
      const e = 0.5;
      const gx = (bil(height, Math.min(fx + e, maxF), fz) - bil(height, Math.max(fx - e, 0), fz)) / (2 * e * CELL);
      const gz = (bil(height, fx, Math.min(fz + e, maxF)) - bil(height, fx, Math.max(fz - e, 0))) / (2 * e * CELL);
      const slope = Math.hypot(gx, gz);
      const sd = bil(sand, fx, fz);
      const pt = bil(path, fx, fz);
      const fr = bil(forest, fx, fz);
      const wt = bil(wet, fx, fz);

      const big = n1.simplex(x * 0.011, z * 0.011) * 0.5 + 0.5;
      const mid = n1.simplex(x * 0.045 + 9, z * 0.045) * 0.5 + 0.5;
      const fine = n2.simplex(x * 0.42, z * 0.42);

      // grass
      mix3(GRASS_A, GRASS_B, smoothstep(0.25, 0.75, big), c);
      mix3(c, GRASS_SUN, smoothstep(0.55, 0.9, mid) * 0.5, c);
      mix3(c, GRASS_FOREST, fr * 0.72, c);
      // broad drifts of drier, olive ground break up the meadows
      mix3(c, DRY, smoothstep(0.62, 0.9, n2.simplex(x * 0.006 + 40, z * 0.006) * 0.5 + 0.5) * 0.45 * (1 - fr), c);
      const alpine = smoothstep(58, 98, h + big * 8);
      mix3(c, ALPINE, alpine, c);
      // under the trees: leaf litter and bare earth showing through
      mix3(c, EARTH, fr * smoothstep(0.35, 0.8, mid) * 0.5, c);
      // faint washes of colour where wildflowers grow thickest
      const fa = n1.simplex(x * 0.017, z * 0.017);
      const fb = n1.simplex(x * 0.021 + 50, z * 0.021 - 20);
      if (fr < 0.4) {
        mix3(c, FLOWER_A, smoothstep(0.3, 0.8, fa) * 0.16, c);
        mix3(c, FLOWER_B, smoothstep(0.45, 0.9, fb) * 0.18, c);
      }
      const shade = 0.95 + 0.07 * fine + 0.05 * (mid - 0.5);
      c[0] *= shade;
      c[1] *= shade;
      c[2] *= shade;

      let grass = 1 - smoothstep(64, 96, h);
      // the meadows follow the calendar: straw-gold in autumn, under snow in winter
      if (SEASON === 'autumn') mix3(c, AUTUMN_GRASS, 0.34 + 0.12 * mid, c);
      else if (SEASON === 'winter') {
        mix3(c, SNOW, 0.8 + 0.1 * mid, c);
        grass *= 0.3;
      } else if (SEASON === 'summer') mix3(c, GRASS_B, 0.18, c);

      // path
      const pathEdge = smoothstep(0.02, 0.5, pt);
      if (pathEdge > 0) {
        const pmix = smoothstep(0.35, 0.75, pt + fine * 0.12);
        mix3(c, PATH_EDGE, pathEdge * 0.35 * (1 - pmix), c);
        mix3(c, PATH, pmix * (0.92 + 0.08 * fine), c);
        grass *= 1 - smoothstep(0.2, 0.55, pt);
      }

      // sand: beaches, then the beds and banks of inland water
      const sandAmt = smoothstep(0.3, 0.7, sd + fine * 0.08);
      if (sandAmt > 0) {
        const s2 = mix3(SAND, SAND_WET, smoothstep(0.9, 0.15, h), rock);
        if (h < 0) mix3(s2, SEABED, smoothstep(0, -3, h), s2);
        s2[0] *= 1 + fine * 0.025;
        s2[1] *= 1 + fine * 0.025;
        mix3(c, s2, sandAmt, c);
        grass *= 1 - sandAmt;
      }
      const bedAmt = smoothstep(0.08, 0.5, wt);
      if (wt > 0.005 && wt < 0.3) mix3(c, MUD, smoothstep(0.005, 0.1, wt) * 0.55, c); // damp, trodden banks
      if (bedAmt > 0) {
        mix3(c, BED, bedAmt, c);
        grass *= 1 - smoothstep(0.02, 0.3, wt);
      }

      // rock on steep ground, with soft strata
      const rockAmt = smoothstep(0.62, 0.95, slope + fine * 0.06);
      if (rockAmt > 0) {
        const strata = Math.sin(h * 0.85 + n1.simplex(x * 0.03, z * 0.03) * 3) * 0.5 + 0.5;
        mix3(ROCK_A, ROCK_B, strata, rock);
        mix3(rock, ROCK_WARM, smoothstep(0.4, 0.9, mid) * 0.5, rock);
        const rs = 0.92 + 0.12 * fine;
        rock[0] *= rs;
        rock[1] *= rs;
        rock[2] *= rs;
        mix3(c, rock, rockAmt, c);
        grass *= 1 - rockAmt;
      }

      const snow = smoothstep(108, 124, h + big * 10) * (1 - smoothstep(1.3, 2.2, slope));
      if (snow > 0) mix3(c, SNOW, snow, c);

      if (h < 0.35) grass = 0;
      const sx = Math.min(SR - 1.001, ((i + 0.5) / res) * SR);
      const sz = Math.min(SR - 1.001, ((j + 0.5) / res) * SR);
      const si = Math.floor(sx);
      const sj = Math.floor(sz);
      const ia = Math.min(si + 1, SR - 1);
      const ja = Math.min(sj + 1, SR - 1);
      const ax = sx - si;
      const az = sz - sj;
      const sh =
        (shadeGrid[sj * SR + si] * (1 - ax) + shadeGrid[sj * SR + ia] * ax) * (1 - az) +
        (shadeGrid[ja * SR + si] * (1 - ax) + shadeGrid[ja * SR + ia] * ax) * az;
      if (sh > 0) {
        c[0] *= 1 - sh * 0.36;
        c[1] *= 1 - sh * 0.26;
        c[2] *= 1 - sh * 0.2;
      }
      data[o] = clamp(c[0]) * 255;
      data[o + 1] = clamp(c[1]) * 255;
      data[o + 2] = clamp(c[2]) * 255;
      data[o + 3] = clamp(grass) * 255;
    }
  }

  const tex = new THREE.DataTexture(data, res, res, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 8;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

function makeDetailTexture(): THREE.DataTexture {
  const size = 256;
  const n = new Noise2D(5);
  const data = new Uint8Array(size * size * 4);
  // tileable noise via 4-corner blend
  const f = (x: number, y: number): number => n.fbm(x * 0.06, y * 0.06, 3) * 0.5 + 0.5;
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const u = i / size;
      const v = j / size;
      const val =
        lerp(lerp(f(i, j), f(i - size, j), u), lerp(f(i, j - size), f(i - size, j - size), u), v);
      const b = clamp(val) * 255;
      const o = (j * size + i) * 4;
      data[o] = data[o + 1] = data[o + 2] = b;
      data[o + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

/** The island surface, split into chunks so off-screen ground is culled. */
export class Terrain {
  readonly group = new THREE.Group();
  readonly material: THREE.MeshLambertMaterial;

  constructor(island: Island, groundTex: THREE.DataTexture, step = 1) {
    const detail = makeDetailTexture();
    this.material = new THREE.MeshLambertMaterial({ map: groundTex });
    this.material.onBeforeCompile = (shader) => {
      shader.uniforms.uDetail = { value: detail };
      shader.uniforms.uTime = globalUniforms.uTime;
      shader.uniforms.uDayLight = globalUniforms.uDayLight;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;\nvarying vec3 vWNormal;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWPos = position;\nvWNormal = normal;');
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <map_pars_fragment>',
          /* glsl */ `#include <map_pars_fragment>
          uniform sampler2D uDetail;
          uniform float uTime;
          uniform float uDayLight;
          varying vec3 vWPos;
          varying vec3 vWNormal;
          float gHash(vec2 p) {
            p = fract(p * vec2(123.34, 456.21));
            p += dot(p, p + 45.32);
            return fract(p.x * p.y);
          }
          float gNoise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            return mix(mix(gHash(i), gHash(i + vec2(1.0, 0.0)), f.x), mix(gHash(i + vec2(0.0, 1.0)), gHash(i + vec2(1.0, 1.0)), f.x), f.y);
          }`,
        )
        .replace(
          '#include <map_fragment>',
          /* glsl */ `#include <map_fragment>
          float det = texture2D(uDetail, vMapUv * 170.0).r * 0.6 + texture2D(uDetail, vMapUv * 37.0).r * 0.4;
          float grassAmt = sampledDiffuseColor.a;
          // fine, medium and broad variation so the ground never reads as flat colour
          float fine = gNoise(vWPos.xz * 7.0);
          float clumps = gNoise(vWPos.xz * 1.6 + 11.0);
          float broad = gNoise(vWPos.xz * 0.21 + 3.0);
          diffuseColor.rgb *= 0.8 + 0.1 * det + 0.1 * fine + 0.12 * clumps + 0.12 * broad;
          // meadows: darker hollows between tufts, lighter sun-bleached crowns
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.1, 1.08, 0.82), grassAmt * smoothstep(0.55, 0.9, clumps) * 0.5);
          // bare ground: wind ripples in the sand, glints of mica, and a darker wet band at the water's edge
          float bare = 1.0 - grassAmt;
          float ripple = sin(vWPos.x * 2.4 + vWPos.z * 0.9 + gNoise(vWPos.xz * 0.5) * 7.0) * 0.5 + 0.5;
          diffuseColor.rgb *= 1.0 - bare * smoothstep(5.0, 1.0, vWPos.y) * (0.07 * ripple);
          float glint = fract(sin(dot(floor(vWPos.xz * 23.0), vec2(127.1, 311.7))) * 43758.5453);
          diffuseColor.rgb += bare * step(0.985, glint) * 0.16 * smoothstep(8.0, 2.0, vWPos.y);
          diffuseColor.rgb *= mix(0.74, 1.0, smoothstep(-0.3, 0.7, vWPos.y + (fine - 0.5) * 0.4));
          // sunlight focused by the waves dances over the shallow sea bed
          float shallows = (1.0 - smoothstep(-0.5, 0.15, vWPos.y)) * smoothstep(-6.0, -1.2, vWPos.y);
          float c1 = gNoise(vWPos.xz * 0.8 + vec2(uTime * 0.3, uTime * 0.21));
          float c2 = gNoise(vWPos.xz * 1.3 - vec2(uTime * 0.24, uTime * 0.33) + 5.0);
          float caustic = pow(1.0 - abs(c1 - c2), 7.0);
          diffuseColor.rgb += vec3(0.75, 0.9, 0.7) * caustic * 0.5 * shallows;
          diffuseColor.a = 1.0;
          // Cliffs are too steep for the top-down ground texture, so their
          // rock is drawn here in world space: warped strata with fine grain.
          float steepness = 1.0 - normalize(vWNormal).y;
          float rockMask = smoothstep(0.26, 0.46, steepness + (det - 0.5) * 0.12);
          if (rockMask > 0.0) {
            float warp = texture2D(uDetail, vWPos.xz * 0.004).r;
            float blotch = texture2D(uDetail, vec2((vWPos.x + vWPos.z) * 0.012, vWPos.y * 0.012)).r;
            float strata = texture2D(uDetail, vec2((vWPos.x - vWPos.z) * 0.0016, vWPos.y * 0.021 + warp * 0.12)).r;
            float grain = texture2D(uDetail, vec2((vWPos.x - vWPos.z) * 0.06, vWPos.y * 0.19)).r;
            // ledges: stacked beds of stone with broken edges, used for both tone and relief
            float beds = vWPos.y * 0.16 + warp * 1.6 + blotch * 0.5;
            float bed = fract(beds);
            float ledge = smoothstep(0.0, 0.12, bed) * smoothstep(1.0, 0.8, bed);
            float cracks = smoothstep(0.42, 0.5, abs(texture2D(uDetail, vec2((vWPos.x - vWPos.z) * 0.021 + floor(beds) * 0.37, vWPos.y * 0.01)).r - 0.5) * 2.0 + 0.3);
            vec3 rockCol = mix(vec3(0.40, 0.35, 0.38), vec3(0.64, 0.56, 0.55), smoothstep(0.35, 0.65, strata));
            rockCol *= mix(0.78, 1.0, ledge) * mix(0.9, 1.0, cracks);
            // each bed is a rounded block: shaded under its overhang, sunlit along its top lip
            rockCol *= mix(0.84, 1.16, smoothstep(0.05, 0.95, bed));
            rockCol += vec3(0.10, 0.08, 0.05) * smoothstep(0.8, 0.97, bed);
            rockCol = mix(rockCol, vec3(0.70, 0.60, 0.52), smoothstep(0.45, 0.8, blotch) * 0.55);
            rockCol *= 0.9 + 0.2 * grain;
            // moss creeps over the gentler ledges
            float moss = smoothstep(0.7, 0.36, steepness) * smoothstep(0.38, 0.66, grain + warp * 0.3);
            // and it gathers along the top of every ledge, trailing a little way down the face
            moss = max(moss, smoothstep(0.72, 0.98, bed + (grain - 0.5) * 0.35) * smoothstep(0.92, 0.5, steepness) * 0.9);
            rockCol = mix(rockCol, mix(vec3(0.16, 0.34, 0.08), vec3(0.34, 0.50, 0.12), blotch), moss * 0.78);
            diffuseColor.rgb = mix(diffuseColor.rgb, rockCol, rockMask);
          }
          // Surface relief, from smooth noise only so its slope is clean:
          // soft tussocks in grass, wind ripples in sand, ledges and cracks in rock.
          float reliefGrass = gNoise(vWPos.xz * 1.9) * 0.55 + gNoise(vWPos.xz * 7.5 + 3.0) * 0.2;
          float reliefSand = (sin(vWPos.x * 2.4 + vWPos.z * 0.9 + gNoise(vWPos.xz * 0.5) * 7.0) * 0.5 + 0.5) * 0.3 + gNoise(vWPos.xz * 5.0) * 0.15;
          float beds2 = fract(vWPos.y * 0.17 + gNoise(vWPos.xz * 0.045) * 2.2);
          // broad, smooth forms only: fine rock relief aliases into speckle on a distant cliff
          float reliefRock = gNoise(vec2(vWPos.x + vWPos.z, vWPos.y * 1.6) * 0.33) * 0.9 + gNoise(vec2(vWPos.x - vWPos.z, vWPos.y) * 0.11) * 0.8;
          float relief = mix(mix(reliefSand, reliefGrass, grassAmt), reliefRock, rockMask);
          float reliefStrength = mix(mix(0.5, 0.75, grassAmt), 1.1, rockMask);
          // cracks between the rock beds sit in shadow
          diffuseColor.rgb *= 1.0 - rockMask * (1.0 - smoothstep(0.0, 0.14, beds2) * smoothstep(1.0, 0.86, beds2)) * 0.3 * (1.0 - smoothstep(40.0, 160.0, length(vViewPosition)));`,
        )
        .replace(
          '#include <normal_fragment_maps>',
          /* glsl */ `#include <normal_fragment_maps>
          {
            vec3 sigmaX = dFdx(-vViewPosition);
            vec3 sigmaY = dFdy(-vViewPosition);
            vec3 r1 = cross(sigmaY, normal);
            vec3 r2 = cross(normal, sigmaX);
            float det2 = dot(sigmaX, r1);
            vec3 grad = sign(det2) * (dFdx(relief) * r1 + dFdy(relief) * r2);
            // fade the relief with distance so far hills stay calm instead of shimmering
            // (and soften it after dark: lamplight at a low angle turns the screen-space slopes blocky)
            float fadeR = (1.0 - smoothstep(30.0, 140.0, length(vViewPosition))) * mix(0.15, 1.0, clamp(uDayLight, 0.0, 1.0));
            // far away the screen-space slopes vanish; without this guard the normal
            // becomes 0/0 and the glow pass smears the bad pixels across the frame
            vec3 bumped = abs(det2) * normal - grad * reliefStrength * fadeR;
            if (abs(det2) > 1e-10 && dot(bumped, bumped) > 1e-20) normal = normalize(bumped);
          }`,
        );
    };

    const CHUNKS = 8;
    const cells = (GRID - 1) / CHUNKS; // grid cells per chunk side
    const vps = cells / step + 1;
    const index: number[] = [];
    for (let j = 0; j < vps - 1; j++) {
      for (let i = 0; i < vps - 1; i++) {
        const a = j * vps + i;
        const b = a + 1;
        const c = a + vps;
        const d = c + 1;
        index.push(a, c, b, b, c, d);
      }
    }
    const H = (i: number, j: number): number =>
      island.height[clamp(j, 0, GRID - 1) * GRID + clamp(i, 0, GRID - 1)];

    for (let cj = 0; cj < CHUNKS; cj++) {
      for (let ci = 0; ci < CHUNKS; ci++) {
        const pos = new Float32Array(vps * vps * 3);
        const nor = new Float32Array(vps * vps * 3);
        const uv = new Float32Array(vps * vps * 2);
        let p = 0;
        let u = 0;
        let above = false;
        for (let j = 0; j < vps; j++) {
          for (let i = 0; i < vps; i++) {
            const gi = ci * cells + i * step;
            const gj = cj * cells + j * step;
            const h = H(gi, gj);
            if (h > -30) above = true;
            pos[p] = gi * CELL - HALF;
            pos[p + 1] = h;
            pos[p + 2] = gj * CELL - HALF;
            const nx = -(H(gi + 1, gj) - H(gi - 1, gj)) / (2 * CELL);
            const nz = -(H(gi, gj + 1) - H(gi, gj - 1)) / (2 * CELL);
            const l = Math.hypot(nx, 1, nz);
            nor[p] = nx / l;
            nor[p + 1] = 1 / l;
            nor[p + 2] = nz / l;
            p += 3;
            uv[u++] = gi / (GRID - 1);
            uv[u++] = gj / (GRID - 1);
          }
        }
        if (!above) continue; // open sea: the water hides nothing here
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
        geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
        geo.setIndex(index);
        geo.computeBoundingSphere();
        geo.computeBoundingBox();
        const mesh = new THREE.Mesh(geo, this.material);
        mesh.receiveShadow = true;
        mesh.matrixAutoUpdate = false;
        this.group.add(mesh);
      }
    }
    void WORLD_SIZE;
  }
}
