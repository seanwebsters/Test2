import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { SEASON } from './season';

export interface ModelPart {
  geo: THREE.BufferGeometry;
  /** which of the pack's materials this piece uses, e.g. "Leaves_NormalTree" */
  material: string;
  map: THREE.Texture | null;
  /** true for leaf cards and other cut-out textures */
  cutout: boolean;
}
export type NatureModels = Map<string, ModelPart[]>;

/** What to load, and the size each model is scaled to (trees by height, the rest by width). */
const WANT: Record<string, { height?: number; width?: number }> = {
  CommonTree_1: { height: 9.2 }, CommonTree_2: { height: 9.6 }, CommonTree_3: { height: 8.6 },
  CommonTree_4: { height: 8.4 }, CommonTree_5: { height: 7.6 },
  Pine_1: { height: 10 }, Pine_2: { height: 10.5 },
  TwistedTree_1: { height: 15 },
  Bush_Common: { width: 2.3 }, Bush_Common_Flowers: { width: 2.3 },
  Fern_1: { width: 2.6 }, Plant_1_Big: { width: 2.0 },
  Rock_Medium_1: { width: 2.2 }, Rock_Medium_2: { width: 2.2 }, Rock_Medium_3: { width: 2.2 },
  Mushroom_Common: { width: 0.75 },
};

/**
 * Loads the Quaternius Stylized Nature MegaKit models (CC0) that replace the
 * hand-built plants. Resolves to null if anything fails, and the game falls
 * back to its procedural trees.
 */
export async function loadNatureModels(base: string): Promise<NatureModels | null> {
  try {
    const loader = new GLTFLoader().setPath(`${base}models/nature/`);
    const out: NatureModels = new Map();
    const names = Object.keys(WANT);
    const files = await Promise.all(names.map((n) => loader.loadAsync(`${n}.gltf`)));
    files.forEach((gltf, i) => {
      const name = names[i];
      const parts: ModelPart[] = [];
      const box = new THREE.Box3();
      gltf.scene.updateMatrixWorld(true);
      gltf.scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        const geo = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
        geo.deleteAttribute('color'); // the pack stores wind weights here, not colour
        geo.computeBoundingBox();
        box.union(geo.boundingBox!);
        const mat = mesh.material as THREE.MeshStandardMaterial;
        parts.push({ geo, material: mat.name, map: mat.map, cutout: mat.alphaTest > 0 || mat.transparent });
      });
      const want = WANT[name];
      const size = box.getSize(new THREE.Vector3());
      const k = want.height ? want.height / box.max.y : want.width! / Math.max(size.x, size.z);
      for (const p of parts) {
        p.geo.scale(k, k, k);
        p.geo.computeBoundingSphere();
        if (p.map) {
          p.map.colorSpace = THREE.SRGBColorSpace;
          p.map.anisotropy = 4;
        }
      }
      out.set(name, parts);
    });
    return out;
  } catch (err) {
    console.info('Nature models unavailable, using built-in plants:', err);
    return null;
  }
}

const tex = new THREE.TextureLoader();
const cache = new Map<string, THREE.Texture>();

/** The leaf texture for this season. `blossom` trees are pink in spring and red in autumn. */
export function seasonalLeaves(base: string, material: string, original: THREE.Texture | null, blossom: boolean): THREE.Texture | null {
  if (!original) return null;
  const file = { Leaves_NormalTree: 'Leaves_NormalTree_C', Leaves_TwistedTree: 'Leaves_TwistedTree_C', Leaves_Pine: 'Leaf_Pine_C' }[material];
  if (!file) return original;
  const twisted = file.startsWith('Leaves_Twisted'); // red in the pack; green here except in autumn
  const variant =
    SEASON === 'winter' ? 'winter'
    : file.startsWith('Leaf_Pine') ? ''
    : SEASON === 'autumn' ? (twisted ? '' : blossom ? 'red' : 'autumn')
    : SEASON === 'spring' && blossom ? 'pink'
    : twisted ? 'green'
    : '';
  if (!variant) return original;
  const url = `${base}models/nature/${file}_${variant}.webp`;
  let t = cache.get(url);
  if (!t) {
    t = tex.load(url);
    t.colorSpace = THREE.SRGBColorSpace;
    t.flipY = false; // glTF texture convention
    t.wrapS = original.wrapS;
    t.wrapT = original.wrapT;
    t.anisotropy = 4;
    cache.set(url, t);
  }
  return t;
}
