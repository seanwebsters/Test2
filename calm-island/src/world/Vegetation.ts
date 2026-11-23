import * as THREE from 'three';
import { mulberry32 } from '../core/math';
import { Colliders } from './Colliders';
import { GARDEN_HEIGHT, HALF, polylineAt, type Island } from './islandMap';
import { Noise2D } from './noise';
import { SEASON } from './season';
import * as plants from './plantGeometry';
import { HOME_SPOT } from './Home';
import { seasonalLeaves, type NatureModels } from './NatureModels';
import { globalUniforms, paintify } from './shared';

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
  /** extra pieces drawn with the main one (imported models have bark and leaves) */
  parts?: { geo: THREE.BufferGeometry; material: THREE.Material; shadow: boolean }[];
  /** material for the far-away stand-in, when the near model uses textures */
  loMaterial?: THREE.Material;
  /** the cheapest stand-in, for the far distance */
  far?: THREE.BufferGeometry;
  farDist?: number;
}

interface Batch {
  hi: THREE.InstancedMesh;
  extra: THREE.InstancedMesh[];
  far: THREE.InstancedMesh | null;
  lo: THREE.InstancedMesh | null;
  cx: number;
  cz: number;
  kind: Kind;
}

// Small sectors keep the detailed tree models to a tight ring around the camera.
const SECTOR = 64;
const SECTORS = (HALF * 2) / SECTOR;

/**
 * How a leafy crown casts its shadow: leaf-shaped, and with gaps opened right
 * through the crown so real flecks of sunlight reach the ground beneath.
 */
const leafShadows = new Map<THREE.Material, THREE.MeshDepthMaterial>();
function leafShadow(lm: THREE.MeshLambertMaterial): THREE.MeshDepthMaterial {
  let d = leafShadows.get(lm);
  if (d) return d;
  d = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: lm.map, alphaTest: lm.alphaTest });
  d.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vGapPos;')
      .replace(
        '#include <project_vertex>',
        /* glsl */ `#include <project_vertex>
        vec4 gapW = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          gapW = instanceMatrix * gapW;
        #endif
        vGapPos = (modelMatrix * gapW).xyz;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        /* glsl */ `#include <common>
        varying vec3 vGapPos;
        float gapHash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
        float gapNoise(vec2 p) { vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(gapHash(i), gapHash(i + vec2(1.0, 0.0)), f.x), mix(gapHash(i + vec2(0.0, 1.0)), gapHash(i + vec2(1.0, 1.0)), f.x), f.y); }`,
      )
      .replace(
        '#include <alphatest_fragment>',
        /* glsl */ `#include <alphatest_fragment>
        vec2 gp = vGapPos.xz * 1.15 + vGapPos.y * 0.37;
        if (gapNoise(gp) * 0.65 + gapNoise(gp * 2.6 + 5.0) * 0.35 > 0.55) discard;`,
      );
  };
  leafShadows.set(lm, d);
  return d;
}

/** Moss settles on whatever faces the sky: boulders wear soft green caps with ragged edges. */
function mossy<T extends THREE.Material>(mat: T): T {
  mat.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      /* glsl */ `#include <color_fragment>
      {
        vec3 upN = normalize((vec4(normalize(vNormal), 0.0) * viewMatrix).xyz);
        float ragged = sin(vFogWorld.x * 2.3 + vFogWorld.y * 1.1) * sin(vFogWorld.z * 2.7 - vFogWorld.y * 1.9) * 0.5 + sin(vFogWorld.x * 7.1 + vFogWorld.z * 5.3) * 0.18;
        float moss = smoothstep(0.5, 0.8, upN.y + ragged * 0.34);
        vec3 mossCol = mix(vec3(0.08, 0.15, 0.04), vec3(0.15, 0.23, 0.06), sin(vFogWorld.x * 3.1) * sin(vFogWorld.z * 3.7) * 0.5 + 0.5);
        diffuseColor.rgb = mix(diffuseColor.rgb, mossCol, moss * 0.88);
      }`,
    );
  };
  return mat;
}

/** Lambert material with vertex colours and a gentle wind sway above `base`. */
function foliageMaterial(sway: number, base: number, doubleSide = false, leafy = false, bloom = false, map: THREE.Texture | null = null, crownY = 0): THREE.MeshLambertMaterial {
  const mat = new THREE.MeshLambertMaterial({ vertexColors: !map, map, alphaTest: map ? 0.32 : 0, side: doubleSide ? THREE.DoubleSide : THREE.FrontSide });
  // crowns are painted with massed leaves; single leaves and fronds get their veins drawn below
  if (!map && (leafy || bloom)) paintify(mat, bloom ? 'brush' : 'foliage', bloom ? 6 : 0.42, bloom ? 0.9 : 1.0);
  const fronds = !map && !leafy && !bloom;
  const painted = mat.onBeforeCompile;
  mat.onBeforeCompile = (shader, renderer) => {
    painted.call(mat, shader, renderer);
    shader.uniforms.uTime = globalUniforms.uTime;
    shader.uniforms.uPlayer = globalUniforms.uPlayer;
    shader.uniforms.uSunThrough = globalUniforms.uSunDir;
    shader.uniforms.uDayThrough = globalUniforms.uDayLight;
    // Leaves are thin: seen against the sun they light up from behind, warm and yellow-green.
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uSunThrough;\nuniform float uDayThrough;')
      .replace(
        '#include <opaque_fragment>',
        /* glsl */ `{
          vec3 sunThroughV = normalize((viewMatrix * vec4(uSunThrough, 0.0)).xyz);
          float through = pow(max(dot(-normalize(vViewPosition), sunThroughV), 0.0), 3.0);
          outgoingLight += diffuseColor.rgb * vec3(1.25, 1.1, 0.5) * through * 0.75 * uDayThrough;
        }
        #include <opaque_fragment>`,
      );
    if (fronds) {
      // each frond: a pale midrib, fine veins sweeping out to the edge, and a lighter rim
      shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 aLeaf;\nvarying vec2 vLeafUv;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvLeafUv = aLeaf;');
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vLeafUv;').replace(
        '#include <color_fragment>',
        /* glsl */ `#include <color_fragment>
        if (vLeafUv.y > 0.005) {
          float ax = abs(vLeafUv.x);
          float rib = 1.0 - smoothstep(0.0, 0.09, ax);
          float veins = smoothstep(0.75, 1.0, sin((vLeafUv.y * 26.0 - ax * 3.2) * 6.2831) * 0.5 + 0.5) * smoothstep(0.05, 0.3, ax);
          diffuseColor.rgb *= 1.0 - 0.2 * veins;
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 1.5 + vec3(0.05, 0.07, 0.0), rib * 0.6);
          diffuseColor.rgb *= mix(0.82, 1.12, smoothstep(-1.0, 1.0, vLeafUv.x)) * (1.0 + 0.2 * smoothstep(0.8, 1.0, ax));
        }`,
      );
    }
    shader.uniforms.uSunDirW = globalUniforms.uSunDir;
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
          // (petals are also kept just under the glow threshold, so white flowers do not flare)
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
    if (map && crownY <= 0) {
      shader.vertexShader = shader.vertexShader.replace('#include <beginnormal_vertex>', 'vec3 objectNormal = normalize(normal * 0.25 + vec3(0.0, 1.0, 0.0));');
      shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_begin>', 'vec3 normal = normalize(vNormal);\nvec3 nonPerturbedNormal = normal;');
    }
    if (map && crownY > 0) {
      // Leaf cards face every which way; lighting them as one rounded crown keeps the shading soft.
      shader.vertexShader = shader.vertexShader.replace(
        '#include <beginnormal_vertex>',
        `vec3 objectNormal = normalize(mix(normal, normalize(position - vec3(0.0, ${crownY.toFixed(2)}, 0.0)) + vec3(0.0, 0.35, 0.0), 0.88));`,
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <normal_fragment_begin>',
        'vec3 normal = normalize(vNormal);\nvec3 nonPerturbedNormal = normal;',
      );
    }
    if (bloom) shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= 0.84;');
    if (leafy) {
      // Dappled clumps of lighter and darker leaves, so crowns read as foliage
      // rather than smooth balloons.
      shader.vertexShader = shader.vertexShader.replace('uniform float uTime;', 'uniform float uTime;\nvarying vec3 vLeafPos;');
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          /* glsl */ `#include <common>
          varying vec3 vLeafPos;
          uniform vec3 uSunDirW;
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
          diffuseColor.rgb *= mix(0.74, 1.16, smoothstep(0.3, 0.7, clump));
          // looking toward the sun, light glows through the leaves
          vec3 toEye = normalize(cameraPosition - vLeafPos);
          float glow = pow(max(dot(-toEye, uSunDirW), 0.0), 2.5);
          diffuseColor.rgb += diffuseColor.rgb * vec3(1.0, 0.95, 0.6) * glow * 0.7;
          // tiny bright flecks, like individual leaves catching the light
          diffuseColor.rgb *= 1.0 + step(0.86, leafNoise(vLeafPos * 14.0)) * 0.22;`,
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

  constructor(private island: Island, models: NatureModels | null = null, base = './') {
    const rnd = mulberry32(2024);
    const nz = new Noise2D(606);
    let greatTree: Kind | null = null;
    const tree = foliageMaterial(0.012, 2.2, false, true);
    const small = foliageMaterial(0.05, 0.1, false, true);
    const leafy = foliageMaterial(0.035, 0.2, true);
    const palmMat = foliageMaterial(0.014, 3, true);
    const flowerMat = foliageMaterial(0.16, 0.05, true, false, true);
    const rockMat = mossy(new THREE.MeshLambertMaterial({ vertexColors: true }));

    const treeKind = (make: (detail: number) => THREE.BufferGeometry): Kind => ({
      hi: make(4), lo: make(2), material: tree, shadow: true, lodDist: 62, farDist: 150, cullDist: 1e9, tint: false, receive: false,
    });
    const broad = [0, 1, 2].map((v) => treeKind((d) => plants.broadleafTree(v, d)));
    const cherry = [0, 1].map((v) => treeKind((d) => plants.cherryTree(v, d)));
    const pine = [0, 1].map((v) => treeKind((d) => plants.pineTree(v, d)));
    const palm = [0, 1, 2].map((v): Kind => ({ hi: plants.palmTree(v), lo: plants.palmTree(v, true), material: palmMat, shadow: true, lodDist: 60, cullDist: 1e9, tint: false }));
    broad.forEach((k, v) => (k.far = plants.farTree('leaf', v)));
    cherry.forEach((k, v) => (k.far = plants.farTree('blossom', v)));
    pine.forEach((k, v) => (k.far = plants.farTree('pine', v)));
    const bush = [0, 1].map((v): Kind => ({ hi: plants.bush(v), material: small, shadow: true, lodDist: 1e9, cullDist: 230, tint: false, receive: false }));
    const fern = [0, 1].map((v): Kind => ({ hi: plants.fern(v), material: leafy, shadow: false, lodDist: 1e9, cullDist: 230, tint: false }));
    const tropical: Kind = { hi: plants.tropicalPlant(), material: leafy, shadow: true, lodDist: 1e9, cullDist: 260, tint: false };
    const rock = [0, 1, 2].map((v): Kind => ({ hi: plants.rock(v), material: rockMat, shadow: true, lodDist: 1e9, cullDist: 1e9, tint: false }));
    let mushroom: Kind | null = null;
    let flowerModels: Kind[] = [];
    let cloverModels: Kind[] = [];
    let pebbleModels: Kind[] = [];
    let bigLeaf: Kind | null = null;
    const pebble: Kind = { hi: rock[1].hi, material: rockMat, shadow: false, lodDist: 1e9, cullDist: 110, tint: false };
    if (models) {
      // Swap the hand-built plants for the imported models, keeping the old
      // blob trees only as the far-away low-detail stand-ins.
      const mats = new Map<string, THREE.Material>();
      const use = (name: string, opts: { blossom?: boolean; sway?: number; base?: number; crown?: number; shadow?: boolean; leaf?: 'green' | 'red' | 'pink' } = {}): Kind['parts'] =>
        models.get(name)!.map((p) => {
          const leaves = p.cutout && /Leav|Leaf/.test(p.material);
          const key = `${p.material}|${opts.blossom ? 1 : 0}|${opts.crown ?? 0}|${opts.sway ?? 0}|${opts.leaf ?? ''}`;
          let material = mats.get(key);
          if (!material) {
            const map = leaves ? seasonalLeaves(base, p.material, p.map, !!opts.blossom, opts.leaf) : p.map;
            material = p.cutout
              ? foliageMaterial(opts.sway ?? 0.012, opts.base ?? 2.2, true, leaves && (opts.crown ?? 0) > 0, false, map, leaves ? opts.crown ?? 0 : 0)
              : /Rock/.test(name) ? mossy(new THREE.MeshLambertMaterial({ map })) : new THREE.MeshLambertMaterial({ map });
            // the reds and pinks are dusty and warm, never neon
            if (leaves && opts.leaf === 'red') (material as THREE.MeshLambertMaterial).color.setRGB(0.6, 0.36, 0.4); // deep crimson, with the lighter leaves doing the glowing
            else if (leaves && (opts.leaf === 'pink' || opts.blossom)) (material as THREE.MeshLambertMaterial).color.setRGB(0.98, 0.9, 0.92);
            mats.set(key, material);
          }
          return { geo: p.geo, material, shadow: opts.shadow ?? true };
        });
      const model = (kind: Kind, parts: Kind['parts']): void => {
        kind.hi = parts![0].geo;
        kind.loMaterial = kind.material;
        kind.material = parts![0].material;
        kind.parts = parts!.slice(1);
      };
      ['CommonTree_1', 'CommonTree_2', 'CommonTree_3'].forEach((n, i) => model(broad[i], use(n, { crown: 6.2 })));
      ['CommonTree_4', 'CommonTree_5'].forEach((n, i) => model(cherry[i], use(n, { blossom: true, crown: 5.6 })));
      ['Pine_1', 'Pine_2'].forEach((n, i) => model(pine[i], use(n, { crown: 5.5 })));
      ['Bush_Common', 'Bush_Common_Flowers'].forEach((n, i) => model(bush[i], use(n, { sway: 0.04, base: 0.2, crown: 0.7 })));
      model(fern[0], use('Fern_1', { sway: 0.035, base: 0.2, shadow: false }));
      model(fern[1], use('Fern_1', { sway: 0.035, base: 0.2, shadow: false }));
      model(tropical, use('Plant_1_Big', { sway: 0.03, base: 0.3 }));
      ['Rock_Medium_1', 'Rock_Medium_2', 'Rock_Medium_3'].forEach((n, i) => model(rock[i], use(n)));
      pebble.hi = rock[1].hi;
      pebble.material = rock[1].material;
      mushroom = { hi: plants.rock(0), material: rockMat, shadow: true, lodDist: 1e9, cullDist: 160, tint: false };
      model(mushroom, use('Mushroom_Common'));
      // Twisting, flat-crowned trees in three colours join the woods: green among the broadleaves,
      // pink and red among the blossom trees, so every valley has drifts of colour.
      const twisted = (name: string, leaf: 'green' | 'red' | 'pink', v: number): Kind => {
        const k = treeKind((d) => (leaf === 'green' ? plants.broadleafTree(v % 3, d) : plants.cherryTree(v % 2, d)));
        k.far = plants.farTree(leaf === 'green' ? 'leaf' : 'blossom', v % 2);
        k.lodDist = 32; // detailed only close by: these are the heaviest trees on the island
        model(k, use(name, { crown: 6.4, leaf }));
        return k;
      };
      broad.push(twisted('TwistedTree_2', 'green', 0), twisted('TwistedTree_4', 'green', 1), twisted('TwistedTree_3', 'green', 2));
      cherry.push(twisted('TwistedTree_3', 'pink', 0), twisted('TwistedTree_5', 'pink', 1), twisted('TwistedTree_2', 'red', 0), twisted('TwistedTree_4', 'red', 1), twisted('TwistedTree_5', 'red', 0));
      const small2 = (name: string, cull: number, sway = 0.03): Kind => {
        const k: Kind = { hi: plants.rock(0), material: rockMat, shadow: false, lodDist: 1e9, cullDist: cull, tint: false };
        model(k, use(name, { sway, base: 0.15, shadow: false }));
        return k;
      };
      flowerModels = [small2('Flower_3_Group', 75), small2('Flower_4_Group', 75)];
      cloverModels = [small2('Clover_1', 55, 0.015), small2('Clover_2', 55, 0.015)];
      bigLeaf = small2('Plant_7_Big', 200, 0.035);
      pebbleModels = ['Pebble_Round_1', 'Pebble_Round_2', 'Pebble_Round_3'].map((n) => small2(n, 90, 0));
      greatTree = { hi: plants.rock(0), material: rockMat, shadow: true, lodDist: 1e9, cullDist: 1e9, tint: false, receive: false };
      model(greatTree, use('TwistedTree_1', { crown: 11 }));
    }
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
      if (Math.hypot(x - HOME_SPOT.x, z - HOME_SPOT.z) < 16.5) return false; // a clearing around home
      if (spacing > 0 && !this.claim(x, z, spacing)) return false;
      this.put(kind, x, I.heightAt(x, z) - 0.15 * scale, z, rnd() * Math.PI * 2, scale, scale * (0.9 + rnd() * 0.25));
      if (colliderR > 0) this.colliders.add(x, z, colliderR * scale);
      this.shade.push(x, z, 3.6 * scale);
      return true;
    };

    // ---- the Calm Garden, composed by hand -------------------------------
    if (greatTree) {
      // the old tree at the heart of the garden
      this.put(greatTree, -11, GARDEN_HEIGHT - 0.2, -13, 2.2, 1.25);
      this.colliders.add(-11, -13, 1.1);
      this.shade.push(-11, -13, 9);
    } else tree1(broad[0], -11, -13, 2.3, 0.42, 6);
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
    if (flowerModels.length) {
      // the garden's beds are planted with the modelled flowers and clover
      const plain = [0xffffff];
      bed(11, 14, 0.5, 2.6, flowerModels[0], plain, 46, 0.8, 1.2);
      bed(11, 14, 3.4, 5.6, flowerModels[1], plain, 46, 0.8, 1.2);
      bed(15, 18.5, 0.2, 6.2, flowerModels[0], plain, 70, 0.7, 1.1);
      bed(15, 18.5, 0.2, 6.2, cloverModels[0], plain, 60, 0.8, 1.2);
      bed(19.5, 23, 1.2, 2.9, flowerModels[1], plain, 30, 0.8, 1.3);
      bed(19.5, 23, 4.0, 5.9, flowerModels[0], plain, 30, 0.8, 1.3);
      bed(2, 6.5, 0, 6.28, cloverModels[1], plain, 40, 0.7, 1.0);
    } else {
      bed(11, 14, 0.5, 2.6, lupine, LUPINE_TINTS, 150, 1.0, 1.7);
      bed(11, 14, 3.4, 5.6, lupine, [0xff8fd0, 0xffb3de, 0xd27bff], 150, 1.0, 1.7);
      bed(15, 18.5, 0.2, 6.2, daisy, DAISY_TINTS, 420, 0.9, 1.5);
      bed(19.5, 23, 1.2, 2.9, hibiscus, HIBISCUS_TINTS, 60, 1.0, 1.6);
      bed(19.5, 23, 4.0, 5.9, hibiscus, HIBISCUS_TINTS, 60, 1.0, 1.6);
      bed(2, 6.5, 0, 6.28, daisy, [0xffffff, 0xfff4c2], 90, 0.8, 1.2);
    }
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
    for (let i = 0; i < 24000; i++) {
      const x = (rnd() - 0.5) * 900;
      const z = (rnd() - 0.5) * 900;
      const f = at(I.forest, x, z);
      const lone = rnd() < 0.02;
      if (f < rnd() * 0.8 + 0.08 && !lone) continue;
      const h = I.heightAt(x, z);
      if (h < 3.6 || h > 92 || at(I.sand, x, z) > 0.1 || at(I.path, x, z) > 0.02 || !this.dry(x, z, 0.5)) continue;
      if (Math.hypot(x, z) < 33) continue;
      const high = h > 42;
      let kind: Kind;
      const r = rnd();
      if (high) kind = r < (h > 60 ? 0.95 : 0.62) ? pick(pine) : r < 0.9 ? pick(broad) : pick(cherry);
      else if (lone) kind = r < 0.3 ? pick(cherry) : r < 0.65 ? pick(palm) : pick(broad);
      else kind = r < 0.06 ? pick(cherry) : h < 30 && r < 0.3 ? pick(palm) : pick(broad);
      // a jungle: most trees tall, and now and then a giant that towers over the rest
      const giant = !high && rnd() < 0.05;
      const isPalm = palm.includes(kind);
      tree1(kind, x, z, isPalm ? 1.1 + rnd() * 0.8 : giant ? 1.8 + rnd() * 0.5 : 1.0 + rnd() * 0.8, giant ? 0.45 : 0.34, lone ? 8 : giant ? 7 : 4.0);
    }

    // ---- palms along the beaches -----------------------------------------
    for (let i = 0; i < 16000; i++) {
      const x = (rnd() - 0.5) * 940;
      const z = (rnd() - 0.5) * 940;
      const sd = at(I.sand, x, z);
      if (sd < 0.25 || sd > 0.97) continue;
      const h = I.heightAt(x, z);
      if (h < 1.3 || h > 5.5 || rnd() > 0.7) continue;
      tree1(pick(palm), x, z, 0.9 + rnd() * 0.8, 0.26, 4.2);
    }

    // ---- undergrowth ------------------------------------------------------
    for (let i = 0; i < 26000; i++) {
      const x = (rnd() - 0.5) * 900;
      const z = (rnd() - 0.5) * 900;
      const f = at(I.forest, x, z);
      const h = I.heightAt(x, z);
      if (h < 3.2 || h > 80 || at(I.sand, x, z) > 0.2 || at(I.path, x, z) > 0.1 || !this.dry(x, z, 0.6)) continue;
      if (I.gradientAt(x, z, grad) > 0.7 || Math.hypot(x - HOME_SPOT.x, z - HOME_SPOT.z) < 14) continue;
      const edge = f * (1 - f) * 4;
      const p = rnd();
      if (p < 0.1 + f * 0.35) this.put(pick(fern), x, h, z, rnd() * 6.3, 0.8 + rnd() * 0.9);
      else if (p < 0.14 + f * 0.3 + edge * 0.25) {
        const s = 0.8 + rnd() * 0.9;
        this.put(pick(bush), x, h - 0.1, z, rnd() * 6.3, s);
        this.shade.push(x, z, 1.3 * s);
      } else if (p > 0.93 - f * 0.1) this.put(tropical, x, h, z, rnd() * 6.3, 0.9 + rnd() * 1.3);
    }

    // ---- mushrooms under the trees (imported models only) ----------------
    if (mushroom) {
      for (let i = 0; i < 9000; i++) {
        const x = (rnd() - 0.5) * 900;
        const z = (rnd() - 0.5) * 900;
        if (at(I.forest, x, z) < 0.55 || rnd() > 0.2 || at(I.path, x, z) > 0.1 || !this.dry(x, z, 0.6)) continue;
        const h = I.heightAt(x, z);
        if (h < 3.4 || h > 70 || I.gradientAt(x, z, grad) > 0.5) continue;
        this.put(mushroom, x, h, z, rnd() * 6.3, 0.8 + rnd() * 1.4);
      }
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

    // ---- sculpted rock: boulders breaking up cliffs and mountain, sea stacks, landmark trees
    for (let i = 0; i < 60000; i++) {
      const x = (rnd() - 0.5) * 940;
      const z = (rnd() - 0.5) * 940;
      const h = I.heightAt(x, z);
      if (h < 2 || Math.hypot(x, z) < 40) continue;
      const slope = I.gradientAt(x, z, grad);
      // big blocks half-buried in every steep face, bigger still high on the mountain
      if (slope < 1.1 || slope > 5 || rnd() > 0.2) continue;
      if (at(I.wet, x, z) > 0 || !this.claim(x, z, 5)) continue;
      const s = (h > 70 ? 3.2 : 2.2) + Math.pow(rnd(), 1.6) * 4.2;
      this.put(pick(rock), x, h - 0.45 * s, z, rnd() * 6.3, s, s * (0.8 + rnd() * 0.8));
      this.colliders.add(x, z, s * 0.75);
    }
    // sea stacks: tall weathered rocks standing just offshore, landmarks from any beach
    for (let i = 0, placed = 0; i < 4000 && placed < 22; i++) {
      const a = rnd() * Math.PI * 2;
      const r = 380 + rnd() * 110;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const h = I.heightAt(x, z);
      if (h > -2.5 || h < -11 || !this.claim(x, z, 34)) continue;
      const s = 6 + rnd() * 8;
      this.put(pick(rock), x, h - 1, z, rnd() * 6.3, s, s * (1.5 + rnd() * 1.3));
      this.colliders.add(x, z, s * 0.8);
      // each one with a few smaller companions
      for (let k = 0; k < 3; k++) {
        const bx = x + (rnd() - 0.5) * s * 3.4;
        const bz = z + (rnd() - 0.5) * s * 3.4;
        const bh = I.heightAt(bx, bz);
        if (bh > -1.5) continue;
        const bs = s * (0.25 + rnd() * 0.3);
        this.put(pick(rock), bx, bh - 0.6, bz, rnd() * 6.3, bs, bs * (1 + rnd()));
        this.colliders.add(bx, bz, bs * 0.8);
      }
      placed++;
    }
    // pebbles and small stones strung along the paths
    for (const pth of I.paths) {
      for (let s = 2; s < pth.length; s += 1.6 + rnd() * 2.4) {
        const q = polylineAt(pth, s);
        const side = rnd() < 0.5 ? -1 : 1;
        const off = 1.5 + rnd() * 1.6;
        const x = q.x - q.tz * off * side;
        const z = q.z + q.tx * off * side;
        const h = I.heightAt(x, z);
        if (h < I.waterLevelAt(x, z) + 0.2) continue;
        const ps = 0.1 + Math.pow(rnd(), 2) * 0.34;
        this.put(pebble, x, h - ps * 0.2, z, rnd() * 6.3, ps, ps * (0.6 + rnd() * 0.5));
      }
    }
    // The paths are dressed like a garden walk: mossy boulders set back from the edge,
    // rounded pebbles at their feet, and clumps of flowers, clover and broad leaves between.
    if (flowerModels.length && bigLeaf) {
      for (const pth of I.paths) {
        for (let s = 5; s < pth.length; s += 2.2 + rnd() * 2.6) {
          const q = polylineAt(pth, s);
          const side = rnd() < 0.5 ? -1 : 1;
          const off = 2.6 + rnd() * 4.5;
          const x = q.x - q.tz * off * side;
          const z = q.z + q.tx * off * side;
          const h = I.heightAt(x, z);
          if (h < I.waterLevelAt(x, z) + 0.4 || at(I.path, x, z) > 0.08 || at(I.sand, x, z) > 0.2 || I.gradientAt(x, z, grad) > 0.5) continue;
          if (Math.hypot(x, z) < 20 || Math.hypot(x - HOME_SPOT.x, z - HOME_SPOT.z) < 17) continue;
          const r = rnd();
          if (r < 0.16) {
            const bs = 0.7 + rnd() * 1.0;
            if (!this.claim(x, z, 3.2)) continue;
            this.put(pick(rock), x, h - 0.28 * bs, z, rnd() * 6.3, bs, bs * (0.75 + rnd() * 0.3));
            this.colliders.add(x, z, bs * 0.85);
            this.shade.push(x, z, 1.5 * bs);
            for (let k = 0; k < 3; k++) {
              const a = rnd() * 6.3;
              const px = x + Math.cos(a) * (bs * 1.1 + 0.4);
              const pz = z + Math.sin(a) * (bs * 1.1 + 0.4);
              this.put(pick(pebbleModels), px, I.heightAt(px, pz) - 0.04, pz, rnd() * 6.3, 0.7 + rnd() * 0.9);
            }
          } else if (r < 0.5) this.put(pick(flowerModels), x, h - 0.03, z, rnd() * 6.3, 0.8 + rnd() * 0.6);
          else if (r < 0.74) this.put(pick(cloverModels), x, h - 0.02, z, rnd() * 6.3, 0.8 + rnd() * 0.7);
          else if (r < 0.9) this.put(bigLeaf, x, h - 0.05, z, rnd() * 6.3, 0.7 + rnd() * 0.7);
          else this.put(pick(pebbleModels), x, h - 0.04, z, rnd() * 6.3, 0.8 + rnd() * 1.2);
        }
      }
      // and the same flowers and clover carry on in loose drifts through the open meadows
      for (let i = 0; i < 13000; i++) {
        const x = (rnd() - 0.5) * 860;
        const z = (rnd() - 0.5) * 860;
        if (nz.simplex(x * 0.013 + 9, z * 0.013 - 4) < 0.18) continue;
        const h = I.heightAt(x, z);
        if (h < 3.4 || h > 75 || at(I.sand, x, z) > 0.1 || at(I.path, x, z) > 0.1 || !this.dry(x, z, 0.9)) continue;
        if (I.gradientAt(x, z, grad) > 0.5 || Math.hypot(x, z) < 22) continue;
        const r = rnd();
        this.put(r < 0.5 ? pick(flowerModels) : r < 0.85 ? pick(cloverModels) : bigLeaf, x, h - 0.03, z, rnd() * 6.3, 0.75 + rnd() * 0.7);
      }
    }
    // three great old trees you can steer by
    if (greatTree) {
      for (const [x0, z0, s] of [[150, 100, 1.5], [-205, 22, 1.7], [-40, -160, 1.3]] as const) {
        let x: number = x0;
        let z: number = z0;
        for (let k = 0; k < 40 && (I.gradientAt(x, z, grad) > 0.4 || !this.dry(x, z, 0.5)); k++) {
          x = x0 + Math.cos(k * 2.4) * (3 + k);
          z = z0 + Math.sin(k * 2.4) * (3 + k);
        }
        this.put(greatTree, x, I.heightAt(x, z) - 0.2, z, rnd() * 6.3, s);
        this.colliders.add(x, z, 1.0 * s);
        this.shade.push(x, z, 8 * s);
      }
    }

    // ---- wildflower drifts ------------------------------------------------
    // (only when the modelled flowers are missing: with them, the hand-built blooms would look like stand-ins)
    for (let i = 0; i < (flowerModels.length || SEASON === 'winter' ? 0 : SEASON === 'autumn' ? 30000 : 90000); i++) {
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
        const make = (geo: THREE.BufferGeometry, shadow: boolean, material: THREE.Material = kind.material): THREE.InstancedMesh => {
          const mesh = new THREE.InstancedMesh(geo, material, ids.length);
          const lm = material as THREE.MeshLambertMaterial;
          if (shadow && lm.map && lm.alphaTest > 0) {
            // leaf cards cast leaf-shaped shadows, not solid squares
            mesh.customDepthMaterial = leafShadow(lm);
          }
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
        const extra = (kind.parts ?? []).map((p) => make(p.geo, p.shadow, p.material));
        const lo = kind.lo ? make(kind.lo, false, kind.loMaterial ?? kind.material) : null;
        const far = kind.far ? make(kind.far, false, kind.loMaterial ?? kind.material) : null;
        this.batches.push({
          hi, lo, kind, extra, far,
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
      for (const e of b.extra) e.visible = b.hi.visible;
      const distant = !!b.far && d >= (b.kind.farDist ?? 1e9) * distanceScale;
      if (b.lo) b.lo.visible = visible && !near && !distant;
      if (b.far) b.far.visible = visible && distant;
    }
  }
}
