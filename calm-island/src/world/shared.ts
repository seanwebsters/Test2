import * as THREE from 'three';
import { GRID, WORLD_SIZE, type Island } from './islandMap';

// Aerial perspective for everything that uses fog: besides the far fade to the
// horizon colour, a thin cool haze builds up over the first few hundred metres,
// so each line of hills and trees sits a little paler than the one in front.
THREE.ShaderChunk.fog_fragment = THREE.ShaderChunk.fog_fragment.replace(
  'gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );',
  `// Sunlight through leaves: under a tree's crown the light breaks into moving flecks.
	// It is applied to everything near the ground there (earth, grass, rocks, the Calmling),
	// so the dapple holds together from any camera angle.
	vec4 dSky = texture2D(uSkyTex, vec2(0.25, 0.5));
	float dSun = texture2D(uSkyTex, vec2(0.75, 0.5)).a;
	float canopy = texture2D(uCanopy, vFogWorld.xz / ${WORLD_SIZE.toFixed(1)} + 0.5).r * dSun;
	if (canopy > 0.01) {
		vec2 dp = vFogWorld.xz * 1.5 + vFogWorld.y * 0.4 + vec2(sin(dSky.a * 0.6), cos(dSky.a * 0.47)) * 0.22;
		float fl = czNoise(dp) * 0.62 + czNoise(dp * 2.7 + 11.0) * 0.38;
		float fleck = smoothstep(0.5, 0.66, fl);
		gl_FragColor.rgb *= mix(vec3(1.0), mix(vec3(0.84, 0.88, 0.96), vec3(1.14, 1.07, 0.92), fleck), canopy);
	}
	// Aerial perspective: each line of hills sits bluer and paler than the one in front,
	// while the first hundred metres or so stay clear.
	float hazeAmt = (1.0 - exp(-vFogDepth * 0.0024)) * 0.46 * (1.0 - 0.6 * smoothstep(25.0, 90.0, cameraPosition.y - vFogWorld.y));
	gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor * vec3(0.78, 0.88, 1.16), hazeAmt);
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

// The sky's two colours, kept in a tiny texture so every material can read
// them live (plain colour uniforms are copied per material and would go stale).
const skyData = new Float32Array(8);

/** Where tree crowns hang over the ground: 0 open sky, 1 deep under leaves. */
export const CANOPY_RES = 1024;
const canopyData = new Uint8Array(CANOPY_RES * CANOPY_RES);
export const canopyTex = new THREE.DataTexture(canopyData, CANOPY_RES, CANOPY_RES, THREE.RedFormat, THREE.UnsignedByteType);
canopyTex.minFilter = canopyTex.magFilter = THREE.LinearFilter;
canopyTex.needsUpdate = true;
/** Paint the canopy map from a flat list of x, z, radius for every tree crown. */
export function paintCanopy(spots: number[]): void {
  canopyData.fill(0);
  const k = CANOPY_RES / WORLD_SIZE;
  for (let n = 0; n < spots.length; n += 3) {
    if (spots[n + 2] < 2.6) continue; // rocks and bushes cast no dapple
    const cx = (spots[n] / WORLD_SIZE + 0.5) * CANOPY_RES;
    const cz = (spots[n + 1] / WORLD_SIZE + 0.5) * CANOPY_RES;
    const rr = spots[n + 2] * 1.35 * k;
    for (let j = Math.max(0, Math.floor(cz - rr)); j <= Math.min(CANOPY_RES - 1, Math.ceil(cz + rr)); j++) {
      for (let i = Math.max(0, Math.floor(cx - rr)); i <= Math.min(CANOPY_RES - 1, Math.ceil(cx + rr)); i++) {
        const d = Math.hypot(i + 0.5 - cx, j + 0.5 - cz) / rr;
        if (d >= 1) continue;
        const v = Math.round((1 - d * d) * 235);
        const idx = j * CANOPY_RES + i;
        if (v > canopyData[idx]) canopyData[idx] = v;
      }
    }
  }
  canopyTex.needsUpdate = true;
}
export const skyTex = new THREE.DataTexture(skyData, 2, 1, THREE.RGBAFormat, THREE.FloatType);
skyTex.minFilter = skyTex.magFilter = THREE.NearestFilter;
export function setFogSky(horizon: THREE.Color, top: THREE.Color, time = 0, sun = 1): void {
  // the two spare channels carry the clock and the strength of direct sun, for the dappled light
  skyData.set([horizon.r, horizon.g, horizon.b, time % 1000, top.r, top.g, top.b, sun]);
  skyTex.needsUpdate = true;
}

THREE.ShaderChunk.fog_pars_vertex = THREE.ShaderChunk.fog_pars_vertex.replace('varying float vFogDepth;', 'varying float vFogDepth;\n\tvarying vec3 vFogWorld;');
THREE.ShaderChunk.fog_vertex = THREE.ShaderChunk.fog_vertex.replace(
  'vFogDepth = - mvPosition.z;',
  'vFogDepth = - mvPosition.z;\n\tvFogWorld = cameraPosition + mvPosition.xyz * mat3(viewMatrix);',
);
THREE.ShaderChunk.fog_pars_fragment = THREE.ShaderChunk.fog_pars_fragment.replace(
  'varying float vFogDepth;',
  `varying float vFogDepth;
	varying vec3 vFogWorld;
	uniform sampler2D uFogMask;
	uniform sampler2D uSkyTex;
	uniform sampler2D uCanopy;
	float czHash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
	float czNoise(vec2 p) { vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(czHash(i), czHash(i + vec2(1.0, 0.0)), f.x), mix(czHash(i + vec2(0.0, 1.0)), czHash(i + vec2(1.0, 1.0)), f.x), f.y); }`,
);
THREE.ShaderChunk.fog_fragment = THREE.ShaderChunk.fog_fragment.replace(
  'gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );',
  `gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
	// the island's own fog: thick near the ground wherever it has not been cleared,
	// thinning with height so the mountain and the sky stand above it
	float islandClear = texture2D(uFogMask, vFogWorld.xz / ${WORLD_SIZE.toFixed(1)} + 0.5).r;
	float lowAir = 1.0 - smoothstep(50.0, 96.0, vFogWorld.y);
	// kept very sheer: a light haze that hints at what is undiscovered without hiding it
	float murk = (1.0 - islandClear) * lowAir * (1.0 - exp(-vFogDepth * 0.02)) * 0.3;
	// seen from high above (falling in, or from the summit) the island lies clear below
	murk *= 1.0 - smoothstep(25.0, 90.0, cameraPosition.y - vFogWorld.y);
	// Close by, fog is a pale veil. Further in, it takes exactly the colour of the
	// sky behind, so trees dissolve into the air instead of standing out as white shapes.
	vec3 fogDir = normalize(vFogWorld - cameraPosition);
	vec3 skyHor = texture2D(uSkyTex, vec2(0.25, 0.5)).rgb;
	vec3 skyTop = texture2D(uSkyTex, vec2(0.75, 0.5)).rgb;
	vec3 skyBehind = mix(skyHor, skyTop, pow(clamp(fogDir.y, 0.0, 1.0), 0.5));
	// (a trace of mist is kept even at full depth, so the mountain's foot fades out rather than floating)
	vec3 veil = mix(mix(skyHor, skyBehind, 0.5) * 1.03 + vec3(0.02), mix(skyBehind, skyHor * 1.03 + vec3(0.02), 0.13), smoothstep(0.45, 0.97, murk));
	gl_FragColor.rgb = mix(gl_FragColor.rgb, veil, murk);`,
);
// built-in materials copy their uniforms from ShaderLib, so the mask goes in there
for (const lib of Object.values(THREE.ShaderLib)) {
  if (lib.uniforms && 'fogColor' in lib.uniforms) {
    (lib.uniforms as Record<string, THREE.IUniform>).uFogMask = { value: fogMask };
    (lib.uniforms as Record<string, THREE.IUniform>).uSkyTex = { value: skyTex };
    (lib.uniforms as Record<string, THREE.IUniform>).uCanopy = { value: canopyTex };
  }
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
