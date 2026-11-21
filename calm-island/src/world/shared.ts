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
