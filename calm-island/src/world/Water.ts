import * as THREE from 'three';
import { HIGH_SHORE, LOW_SHORE, RIVER_HALF_WIDTH, SEA_LEVEL, WATER_DROP, polylineAt, type Island } from './islandMap';
import { NOISE_GLSL, WORLD_UV_GLSL, globalUniforms } from './shared';

const VERT = /* glsl */ `
#include <common>
#include <fog_pars_vertex>
varying vec3 vWorld;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const FRAG = /* glsl */ `
#include <common>
#include <fog_pars_fragment>
uniform float uTime;
uniform float uWorldSize;
uniform sampler2D uHeightTex;
uniform vec3 uSunDir;
uniform vec3 uShallow;
uniform vec3 uDeep;
uniform vec3 uSky;
uniform float uDepthK;
uniform float uFlow;
uniform float uSurf;
varying vec3 vWorld;
varying vec2 vUv;
${NOISE_GLSL}
${WORLD_UV_GLSL}
float waveH(vec2 p, float t) {
  return fbm2(p * 0.22 + t * vec2(0.11, 0.07)) + 0.5 * fbm2(p * 0.55 - t * vec2(0.09, 0.14));
}
void main() {
  float ground = texture2D(uHeightTex, worldUv(vWorld.xz)).r;
  float depth = vWorld.y - ground;
  if (depth < -0.4) discard;
  float edge = smoothstep(-0.05, 0.08, depth);
  depth = max(depth, 0.0);

  // Rivers scroll their ripples along the flow, everything else drifts.
  vec2 p = mix(vWorld.xz, vec2(vUv.x * 5.0, vUv.y * 0.7 - uTime * 1.5), uFlow);
  float e = 0.4;
  float h0 = waveH(p, uTime);
  float hx = waveH(p + vec2(e, 0.0), uTime);
  float hz = waveH(p + vec2(0.0, e), uTime);
  vec3 N = normalize(vec3((h0 - hx) * 0.55, e, (h0 - hz) * 0.55));
  vec3 V = normalize(cameraPosition - vWorld);
  float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 3.0);

  float dk = 1.0 - exp(-depth * uDepthK);
  vec3 col = mix(uShallow, uDeep, dk);
  // dancing light on the shallows
  float ca = vnoise(p * 0.8 + N.xz * 4.0 + uTime * 0.35);
  col += pow(ca, 4.0) * 0.35 * (1.0 - dk);
  col = mix(col, uSky, fres * 0.5);

  vec3 R = reflect(-uSunDir, N);
  float spec = pow(max(dot(R, V), 0.0), 220.0);
  col += vec3(1.0, 0.96, 0.85) * spec * 1.5;
  float glit = smoothstep(0.985, 1.0, vnoise(p * 3.0 + uTime * 0.6)) * pow(max(dot(R, V), 0.0), 8.0);
  col += glit * 0.8;

  // foam hugging every shoreline, breathing in and out
  float fn = fbm2(p * 1.4 + uTime * vec2(0.14, 0.09));
  float breathe = sin(uTime * 0.8 + vnoise(vWorld.xz * 0.04) * 6.2831) * 0.5 + 0.5;
  float reach = 0.22 + 0.3 * breathe * uSurf + 0.1 * (1.0 - uSurf);
  float foam = 1.0 - smoothstep(reach * 0.35, reach, depth + (fn - 0.5) * 0.3);
  float bands = smoothstep(0.7, 0.95, sin(depth * 6.0 - uTime * 1.4 + fn * 2.5));
  foam += bands * smoothstep(1.6, 0.3, depth) * smoothstep(0.35, 0.6, fn) * 0.75 * uSurf;
  // white streaks where the river runs
  float streak = smoothstep(0.62, 0.8, vnoise(vec2(vUv.x * 9.0, vUv.y * 0.35 - uTime * 1.1)));
  foam += streak * 0.3 * uFlow;
  foam = clamp(foam, 0.0, 1.0);
  col = mix(col, vec3(1.0), foam * 0.92);

  float alpha = mix(0.5, 0.97, dk);
  alpha = max(alpha, foam * 0.95);
  alpha = mix(alpha, 1.0, fres * 0.6) * edge;

  gl_FragColor = vec4(col, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

const FALL_FRAG = /* glsl */ `
#include <common>
#include <fog_pars_fragment>
uniform float uTime;
varying vec3 vWorld;
varying vec2 vUv;
${NOISE_GLSL}
void main() {
  float t = uTime;
  float fall = vUv.y * vUv.y; // water accelerates as it drops
  float a = vnoise(vec2(vUv.x * 16.0, fall * 9.0 - t * 3.2));
  float b = vnoise(vec2(vUv.x * 44.0 + 3.0, fall * 22.0 - t * 5.0));
  float streak = a * 0.65 + b * 0.35;
  vec3 col = mix(vec3(0.36, 0.78, 0.93), vec3(1.0), smoothstep(0.3, 0.72, streak));
  col = mix(col, vec3(1.0), smoothstep(0.8, 1.0, vUv.y) * 0.85);
  float side = smoothstep(0.0, 0.14, vUv.x) * smoothstep(1.0, 0.86, vUv.x);
  float ragged = smoothstep(0.0, 0.25, side + (a - 0.5) * 0.3);
  float alpha = ragged * mix(0.82, 1.0, streak);
  gl_FragColor = vec4(col, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

const MIST_VERT = /* glsl */ `
uniform float uTime;
uniform float uScale;
attribute vec4 aSeed;
varying float vAlpha;
void main() {
  float life = fract(uTime * (0.1 + aSeed.w * 0.08) + aSeed.x);
  vec3 p = position;
  p.x += (aSeed.y - 0.5) * (2.0 + life * 9.0);
  p.z += (aSeed.z - 0.5) * (2.0 + life * 9.0) + life * 3.0;
  p.y += life * (3.0 + aSeed.w * 6.0);
  vAlpha = sin(life * 3.14159) * 0.32;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = uScale * (2.5 + life * 5.0) / -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;

const MIST_FRAG = /* glsl */ `
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.05, d) * vAlpha;
  gl_FragColor = vec4(vec3(1.0), a);
}
`;

interface WaterOptions {
  shallow: number;
  deep: number;
  depthK: number;
  flow?: boolean;
  surf?: number;
}

/** Sea, lakes, river and the waterfall. */
export class Water {
  readonly group = new THREE.Group();
  private mist: THREE.ShaderMaterial;

  constructor(private island: Island, private heightTex: THREE.Texture, skyColor: THREE.Color) {
    const sea = new THREE.Mesh(
      new THREE.PlaneGeometry(9000, 9000).rotateX(-Math.PI / 2),
      this.material({ shallow: 0x3fe3d6, deep: 0x1a6fd0, depthK: 0.34, surf: 1 }, skyColor),
    );
    sea.position.y = SEA_LEVEL;
    sea.renderOrder = 1;
    this.group.add(sea);

    const fresh = this.material({ shallow: 0x58e6d8, deep: 0x1c8fd6, depthK: 0.42, surf: 0.25 }, skyColor);
    for (const lake of island.lakes) {
      const disc = new THREE.Mesh(new THREE.CircleGeometry(lake.r + 1, 48).rotateX(-Math.PI / 2), fresh);
      disc.position.set(lake.x, lake.level + 0.02, lake.z);
      disc.renderOrder = 2;
      this.group.add(disc);
    }

    const flowing = this.material(
      { shallow: 0x58e6d8, deep: 0x1c8fd6, depthK: 0.5, flow: true, surf: 0 },
      skyColor,
    );
    const mirror = island.lakes[1];
    const fallsLake = island.lakes[0];
    const { falls, river } = island;
    this.addRibbon(flowing, mirror.r - 2, falls.lipS + 0.5);
    // start just inside the lake's far shore
    let s0 = falls.baseS;
    for (let s = falls.baseS; s < river.length; s += 0.5) {
      const q = polylineAt(river, s);
      s0 = s;
      if (s > falls.baseS + 10 && Math.hypot(q.x - fallsLake.x, q.z - fallsLake.z) > fallsLake.r - 2) break;
    }
    this.addRibbon(flowing, s0, river.length);
    this.addFalls();

    this.mist = new THREE.ShaderMaterial({
      vertexShader: MIST_VERT,
      fragmentShader: MIST_FRAG,
      uniforms: { uTime: globalUniforms.uTime, uScale: { value: 600 } },
      transparent: true,
      depthWrite: false,
    });
    const count = 90;
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = falls.base.x;
      pos[i * 3 + 1] = falls.base.y + 0.3;
      pos[i * 3 + 2] = falls.base.z;
      for (let k = 0; k < 4; k++) seed[i * 4 + k] = Math.random();
    }
    const mg = new THREE.BufferGeometry();
    mg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    mg.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
    mg.boundingSphere = new THREE.Sphere(new THREE.Vector3(falls.base.x, falls.base.y + 6, falls.base.z), 24);
    const mistPoints = new THREE.Points(mg, this.mist);
    mistPoints.renderOrder = 5;
    this.group.add(mistPoints);
  }

  setViewport(heightPx: number): void {
    this.mist.uniforms.uScale.value = heightPx;
  }

  private material(o: WaterOptions, sky: THREE.Color): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
        uTime: globalUniforms.uTime,
        uWorldSize: globalUniforms.uWorldSize,
        uSunDir: globalUniforms.uSunDir,
        uHeightTex: { value: this.heightTex },
        uShallow: { value: new THREE.Color(o.shallow) },
        uDeep: { value: new THREE.Color(o.deep) },
        uSky: { value: sky },
        uDepthK: { value: o.depthK },
        uFlow: { value: o.flow ? 1 : 0 },
        uSurf: { value: o.surf ?? 0 },
      },
      transparent: true,
      depthWrite: false,
      fog: true,
    });
  }

  /** A strip of water following the river between two arc lengths. */
  private addRibbon(mat: THREE.Material, s0: number, s1: number): void {
    const { river } = this.island;
    const pos: number[] = [];
    const uv: number[] = [];
    const idx: number[] = [];
    const W = RIVER_HALF_WIDTH + 0.5;
    let row = 0;
    for (let s = s0; s <= s1 + 0.01; s += 1.5) {
      const q = polylineAt(river, Math.min(s, s1));
      const y = this.island.riverShore(s, q.x, q.z) - WATER_DROP;
      const nx = -q.tz;
      const nz = q.tx;
      for (let k = 0; k < 5; k++) {
        const a = k / 4;
        const off = (a * 2 - 1) * W;
        pos.push(q.x + nx * off, y, q.z + nz * off);
        uv.push(a, s);
      }
      if (row > 0) {
        for (let k = 0; k < 4; k++) {
          const a = (row - 1) * 5 + k;
          const b = a + 5;
          idx.push(a, a + 1, b, a + 1, b + 1, b);
        }
      }
      row++;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, mat);
    (mat as THREE.ShaderMaterial).side = THREE.DoubleSide;
    mesh.renderOrder = 2;
    this.group.add(mesh);
  }

  /** The falling sheet: a parabola from the cliff lip to the lake. */
  private addFalls(): void {
    const { falls, river } = this.island;
    const dir = polylineAt(river, (falls.lipS + falls.baseS) / 2);
    const top = HIGH_SHORE - WATER_DROP;
    const bottom = LOW_SHORE - WATER_DROP - 0.3;
    const span = Math.hypot(falls.base.x - falls.lip.x, falls.base.z - falls.lip.z) + 2.5;
    const half = RIVER_HALF_WIDTH * 0.72;
    const rows = 28;
    const cols = 8;
    const pos: number[] = [];
    const uv: number[] = [];
    const idx: number[] = [];
    for (let r = 0; r <= rows; r++) {
      const u = r / rows;
      const cx = falls.lip.x + dir.tx * (span * u - 1.0);
      const cz = falls.lip.z + dir.tz * (span * u - 1.0);
      const y = top - (top - bottom) * u * u;
      for (let c = 0; c <= cols; c++) {
        const a = c / cols;
        const off = (a * 2 - 1) * half * (1 + 0.12 * u);
        // bow the sheet outward a touch in the middle
        const bulge = Math.sin(a * Math.PI) * 0.8 * u;
        pos.push(cx - dir.tz * off + dir.tx * bulge, y, cz + dir.tx * off + dir.tz * bulge);
        uv.push(a, u);
      }
      if (r > 0) {
        for (let c = 0; c < cols; c++) {
          const a = (r - 1) * (cols + 1) + c;
          const b = a + cols + 1;
          idx.push(a, a + 1, b, a + 1, b + 1, b);
        }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeBoundingSphere();
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FALL_FRAG,
      uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), uTime: globalUniforms.uTime },
      transparent: true,
      side: THREE.DoubleSide,
      fog: true,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = 3;
    this.group.add(mesh);
  }
}
