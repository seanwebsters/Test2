import * as THREE from 'three';
import { mulberry32 } from '../core/math';
import { WORLD_UV_GLSL, globalUniforms } from './shared';

export interface GrassOptions {
  patch: number;
  maxBlades: number;
  bladeHeight: number;
  bladeWidth: number;
  seed: number;
  /** far layers use a single triangle per blade */
  simple?: boolean;
  /** blades closer than this to the player are left to a finer layer */
  inner?: number;
}

/**
 * A square of grass blades that follows the player. Blades wrap around the
 * patch on the GPU, read their height and colour from the baked island
 * textures, sway in the wind and lean away from the Calmling's feet.
 */
export class Grass {
  readonly mesh: THREE.Mesh;
  private geo: THREE.InstancedBufferGeometry;
  private uniforms = {
    uCenter: { value: new THREE.Vector3() },
    uPlayer: { value: new THREE.Vector3() },
    uPatch: { value: 40 },
    uBladeH: { value: 0.4 },
    uInner: { value: 0 },
    uHeightTex: { value: null as THREE.Texture | null },
    uGroundTex: { value: null as THREE.Texture | null },
  };

  constructor(heightTex: THREE.Texture, groundTex: THREE.Texture, private opts: GrassOptions) {
    const w = opts.bladeWidth / 2;
    const geo = new THREE.InstancedBufferGeometry();
    if (opts.simple) {
      geo.setAttribute('position', new THREE.Float32BufferAttribute([-w, 0, 0, w, 0, 0, 0, 1, 0], 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
    } else {
      // a tapered, two-segment blade
      geo.setAttribute('position', new THREE.Float32BufferAttribute([-w, 0, 0, w, 0, 0, -w * 0.72, 0.5, 0, w * 0.72, 0.5, 0, 0, 1, 0], 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
      geo.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4]);
    }
    const rnd = mulberry32(opts.seed);
    const off = new Float32Array(opts.maxBlades * 4);
    for (let i = 0; i < opts.maxBlades; i++) {
      off[i * 4] = rnd() * opts.patch;
      off[i * 4 + 1] = rnd() * opts.patch;
      off[i * 4 + 2] = rnd();
      off[i * 4 + 3] = rnd();
    }
    geo.setAttribute('aOffset', new THREE.InstancedBufferAttribute(off, 4));
    geo.instanceCount = opts.maxBlades;
    this.geo = geo;

    this.uniforms.uPatch.value = opts.patch;
    this.uniforms.uBladeH.value = opts.bladeHeight;
    this.uniforms.uInner.value = opts.inner ?? 0;
    this.uniforms.uHeightTex.value = heightTex;
    this.uniforms.uGroundTex.value = groundTex;

    const mat = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide });
    mat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.uniforms, {
        uTime: globalUniforms.uTime,
        uWorldSize: globalUniforms.uWorldSize,
      });
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          /* glsl */ `#include <common>
          uniform float uTime;
          uniform float uWorldSize;
          uniform vec3 uCenter;
          uniform vec3 uPlayer;
          uniform float uPatch;
          uniform float uBladeH;
          uniform float uInner;
          uniform sampler2D uHeightTex;
          uniform sampler2D uGroundTex;
          attribute vec4 aOffset;
          float gHash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
          float gNoise2(vec2 p) { vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(gHash(i), gHash(i + vec2(1.0, 0.0)), f.x), mix(gHash(i + vec2(0.0, 1.0)), gHash(i + vec2(1.0, 1.0)), f.x), f.y); }
          varying vec3 vGrassCol;
          varying float vBladeY;
          varying float vSheen;
          ${WORLD_UV_GLSL}`,
        )
        .replace(
          '#include <begin_vertex>',
          /* glsl */ `
          vec2 base = aOffset.xy + floor((uCenter.xz - aOffset.xy) / uPatch + 0.5) * uPatch;
          float groundY = texture2D(uHeightTex, worldUv(base)).r;
          vec4 ground = texture2D(uGroundTex, base / uWorldSize + 0.5);
          float fade = 1.0 - smoothstep(uPatch * 0.36, uPatch * 0.5, distance(base, uCenter.xz));
          // thin the lawn out toward sand, rock and paths rather than cutting it off
          float grow = smoothstep(aOffset.w * 0.7, aOffset.w * 0.7 + 0.25, ground.a) * fade;
          grow *= smoothstep(uInner * 0.7, uInner + 0.001, distance(base, uPlayer.xz) + 0.001);
          // no stunted specks on sand and paths: a blade either grows properly or not at all
          grow *= step(0.3, grow) * step(0.25, ground.a);
          // the meadow rolls between cropped lawn and long, lush drifts
          float drift = gNoise2(base * 0.035) * 0.65 + gNoise2(base * 0.11 + 9.0) * 0.35;
          float lush = smoothstep(0.38, 0.72, drift);
          float hgt = uBladeH * (0.55 + 0.9 * aOffset.z) * grow * mix(0.55, 1.75, lush);
          float ang = aOffset.w * 6.2831 + aOffset.z * 40.0;
          float bend = position.y * position.y;
          vec3 local = vec3(cos(ang) * position.x, position.y * hgt, sin(ang) * position.x);
          // wind: a slow swell with quick ripples running across it
          float swell = sin(uTime * 0.9 + base.x * 0.07 + base.y * 0.05);
          float ripple = sin(uTime * 2.6 + base.x * 0.45 - base.y * 0.33 + aOffset.z * 3.0);
          vec2 wind = vec2(0.86, 0.5) * (swell * 0.16 + ripple * 0.07 + 0.08);
          local.xz += (wind + vec2(cos(ang * 1.7), sin(ang * 1.7)) * 0.1) * bend * hgt * 1.6;
          // lean away from the Calmling
          vec2 away = base - uPlayer.xz;
          float pd = length(away);
          float push = step(0.02, hgt) * (1.0 - smoothstep(0.35, 1.5, pd)) * (1.0 - smoothstep(0.4, 1.4, abs(uPlayer.y - groundY)));
          local.xz += away / max(pd, 0.001) * push * 0.45 * bend;
          local.y *= 1.0 - push * 0.55;
          vec3 transformed = vec3(base.x, groundY, base.y) + local;
          // each blade its own shade; a few go to seed and turn straw-gold
          vGrassCol = ground.rgb * (0.86 + 0.28 * aOffset.z);
          // long grass is deeper and cooler, cropped grass a little sun-bleached
          vGrassCol *= mix(vec3(1.08, 1.06, 0.82), vec3(0.82, 0.96, 0.9), lush);
          // a soft pool of shade where the Calmling stands
          vGrassCol *= 1.0 - 0.42 * (1.0 - smoothstep(0.3, 1.25, pd)) * (1.0 - smoothstep(0.4, 1.6, abs(uPlayer.y - groundY)));
          vGrassCol = mix(vGrassCol, vGrassCol * vec3(1.25, 1.12, 0.6), step(0.93, fract(aOffset.w * 17.0)) * 0.6);
          // the crest of each gust catches the light as it rolls across the meadow
          vSheen = smoothstep(0.35, 1.0, swell) * 0.6 + smoothstep(0.5, 1.0, ripple) * 0.25;
          vBladeY = position.y;`,
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
          varying vec3 vGrassCol;
          varying float vBladeY;
          varying float vSheen;`,
        )
        .replace(
          '#include <color_fragment>',
          /* glsl */ `
          diffuseColor.rgb = vGrassCol * mix(0.62, 1.3, vBladeY) + vec3(0.05, 0.06, 0.0) * vBladeY * vBladeY;
          diffuseColor.rgb += vec3(0.16, 0.19, 0.05) * vSheen * vBladeY * vBladeY;
          diffuseColor.rgb = min(diffuseColor.rgb, vec3(0.8)); // grass must never be bright enough to glow`,
        )
        .replace(
          '#include <normal_fragment_begin>',
          `vec3 normal = normalize(vNormal);
           vec3 nonPerturbedNormal = normal;`,
        );
    };
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.frustumCulled = false;
    this.mesh.receiveShadow = true;
  }

  setDensity(fraction: number): void {
    this.geo.instanceCount = Math.max(1, Math.floor(this.opts.maxBlades * fraction));
  }

  update(center: THREE.Vector3, player: THREE.Vector3): void {
    this.uniforms.uCenter.value.copy(center);
    this.uniforms.uPlayer.value.copy(player);
  }
}
