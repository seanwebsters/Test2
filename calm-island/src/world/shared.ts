import * as THREE from 'three';
import { GRID, WORLD_SIZE, type Island } from './islandMap';

// Aerial perspective for everything that uses fog: besides the far fade to the
// horizon colour, a thin cool haze builds up over the first few hundred metres,
// so each line of hills and trees sits a little paler than the one in front.
THREE.ShaderChunk.fog_fragment = THREE.ShaderChunk.fog_fragment.replace(
  'gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );',
  `float hazeAmt = (1.0 - exp(-vFogDepth * 0.003)) * 0.24;
	gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor * vec3(0.86, 0.95, 1.1), hazeAmt);
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );`,
);

// ---- the fog that hides Calm Island ------------------------------------------
// One small texture covers the island: 0 where fog still lies, 1 where it has
// been cleared. Every material that uses fog samples it at the fragment's own
// position, so uncleared land fades into mist while cleared land stays crisp.
export const FOG_RES = 256;
const fogData = new Uint8Array(FOG_RES * FOG_RES);
export const fogMask = new THREE.DataTexture(fogData, FOG_RES, FOG_RES, THREE.RedFormat, THREE.UnsignedByteType);
fogMask.minFilter = fogMask.magFilter = THREE.LinearFilter;
fogMask.needsUpdate = true;

/** Start again: fog everywhere except where `open` says the air is naturally clear (open sea). */
export function resetFog(open: (x: number, z: number) => boolean): void {
  for (let j = 0; j < FOG_RES; j++) {
    for (let i = 0; i < FOG_RES; i++) {
      const x = ((i + 0.5) / FOG_RES - 0.5) * WORLD_SIZE;
      const z = ((j + 0.5) / FOG_RES - 0.5) * WORLD_SIZE;
      fogData[j * FOG_RES + i] = open(x, z) ? 255 : 0;
    }
  }
  fogMask.needsUpdate = true;
}

/** Clear a soft-edged circle. Clearing only ever adds; fog never creeps back. */
export function clearFog(x: number, z: number, r: number): void {
  const k = FOG_RES / WORLD_SIZE;
  const cx = (x / WORLD_SIZE + 0.5) * FOG_RES;
  const cz = (z / WORLD_SIZE + 0.5) * FOG_RES;
  const rr = r * k;
  for (let j = Math.max(0, Math.floor(cz - rr)); j <= Math.min(FOG_RES - 1, Math.ceil(cz + rr)); j++) {
    for (let i = Math.max(0, Math.floor(cx - rr)); i <= Math.min(FOG_RES - 1, Math.ceil(cx + rr)); i++) {
      const d = Math.hypot(i + 0.5 - cx, j + 0.5 - cz) / rr;
      if (d >= 1) continue;
      const t = d < 0.6 ? 1 : 1 - (d - 0.6) / 0.4;
      const v = Math.round(t * t * (3 - 2 * t) * 255);
      const idx = j * FOG_RES + i;
      if (v > fogData[idx]) fogData[idx] = v;
    }
  }
  fogMask.needsUpdate = true;
}

/** How clear the air is at a point, 0..1 (for sound, hints and tests). */
export function fogClearAt(x: number, z: number): number {
  const i = Math.min(FOG_RES - 1, Math.max(0, Math.floor((x / WORLD_SIZE + 0.5) * FOG_RES)));
  const j = Math.min(FOG_RES - 1, Math.max(0, Math.floor((z / WORLD_SIZE + 0.5) * FOG_RES)));
  return fogData[j * FOG_RES + i] / 255;
}

THREE.ShaderChunk.fog_pars_vertex = THREE.ShaderChunk.fog_pars_vertex.replace('varying float vFogDepth;', 'varying float vFogDepth;\n\tvarying vec3 vFogWorld;');
THREE.ShaderChunk.fog_vertex = THREE.ShaderChunk.fog_vertex.replace(
  'vFogDepth = - mvPosition.z;',
  'vFogDepth = - mvPosition.z;\n\tvFogWorld = cameraPosition + mvPosition.xyz * mat3(viewMatrix);',
);
THREE.ShaderChunk.fog_pars_fragment = THREE.ShaderChunk.fog_pars_fragment.replace(
  'varying float vFogDepth;',
  'varying float vFogDepth;\n\tvarying vec3 vFogWorld;\n\tuniform sampler2D uFogMask;',
);
THREE.ShaderChunk.fog_fragment = THREE.ShaderChunk.fog_fragment.replace(
  'gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );',
  `gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
	// the island's own fog: thick near the ground wherever it has not been cleared,
	// thinning with height so the mountain and the sky stand above it
	float islandClear = texture2D(uFogMask, vFogWorld.xz / ${WORLD_SIZE.toFixed(1)} + 0.5).r;
	float lowAir = 1.0 - smoothstep(50.0, 96.0, vFogWorld.y);
	float murk = (1.0 - islandClear) * lowAir * (1.0 - exp(-vFogDepth * 0.055));
	gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor * 1.04 + vec3(0.05, 0.055, 0.06), murk * 0.975);`,
);
// built-in materials copy their uniforms from ShaderLib, so the mask goes in there
for (const lib of Object.values(THREE.ShaderLib)) {
  if (lib.uniforms && 'fogColor' in lib.uniforms) (lib.uniforms as Record<string, THREE.IUniform>).uFogMask = { value: fogMask };
}

/** Uniforms shared by every animated material (wind, water, grass…). */
export const globalUniforms = {
  uTime: { value: 0 },
  uSunDir: { value: new THREE.Vector3(-0.5, 0.75, 0.45).normalize() },
  uWorldSize: { value: WORLD_SIZE },
  /** 1 in daylight, lower at night: dims things that light themselves */
  uDayLight: { value: 1 },
  /** where the player's Calmling is, for plants that react to it */
  uPlayer: { value: new THREE.Vector3() },
};

export const SUN_DIR = globalUniforms.uSunDir.value;

/** Terrain heights as a GPU texture so water and grass can read the ground. */
export function makeHeightTexture(island: Island): THREE.DataTexture {
  const data = new Uint16Array(GRID * GRID);
  for (let i = 0; i < data.length; i++) data[i] = THREE.DataUtils.toHalfFloat(island.height[i]);
  const tex = new THREE.DataTexture(data, GRID, GRID, THREE.RedFormat, THREE.HalfFloatType);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

/** World xz -> uv of the baked textures. Texel centres sit on grid nodes. */
export const WORLD_UV_GLSL = /* glsl */ `
vec2 worldUv(vec2 xz) { return (xz / uWorldSize + 0.5) * (${(GRID - 1).toFixed(1)} / ${GRID.toFixed(1)}) + 0.5 / ${GRID.toFixed(1)}; }
`;

export const NOISE_GLSL = /* glsl */ `
float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
             mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm2(vec2 p) {
  return vnoise(p) * 0.6 + vnoise(p * 2.13 + 7.0) * 0.3 + vnoise(p * 4.31 + 3.0) * 0.1;
}
`;
