import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/** The building pieces and furniture the treehouse and the market stall are made from. */
const NAMES = [
  'Floor_WoodLight', 'DoorFrame_Round_WoodDark', 'Door_1_Round', 'Window_Wide_Round1',
  'WindowShutters_Wide_Round_Open', 'Prop_Vine1', 'Prop_Vine4',
  'Bed_Twin1', 'Bookcase_2', 'Chair_1', 'Chest_Wood', 'Nightstand_Shelf', 'Chandelier', 'Stool', 'Stall_Empty', 'Stall_Cart_Empty',
  'Barrel', 'Barrel_Apples', 'Crate_Wooden', 'FarmCrate_Apple', 'Candle_1', 'Vase_2', 'BookGroup_Medium_1', 'Book_Stack_1', 'Mug', 'Bag',
  'Cabinet', 'Banner_1', 'Pot_1', 'Lantern_Wall',
];

/**
 * Authored models (Quaternius Medieval Village and Fantasy Props MegaKits, CC0).
 * Every copy of a piece shares its geometry and materials, so a whole cottage
 * costs a few dozen draw calls.
 */
export class Kit {
  private pieces = new Map<string, { geo: THREE.BufferGeometry; mat: THREE.Material }[]>();
  private mats = new Map<string, THREE.Material>();
  /** bark from the island's own trees, for logs and the great stump */
  bark: THREE.Texture | null = null;
  barkDark: THREE.Texture | null = null;

  add(name: string, scene: THREE.Object3D): void {
    const parts: { geo: THREE.BufferGeometry; mat: THREE.Material }[] = [];
    scene.updateMatrixWorld(true);
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const src = mesh.material as THREE.MeshStandardMaterial;
      const painted = /Vertex/.test(src.name); // a few props are coloured per vertex rather than by texture
      const geo = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
      if (!painted) geo.deleteAttribute('color');
      let mat = this.mats.get(src.name);
      if (!mat) {
        if (src.map) {
          src.map.colorSpace = THREE.SRGBColorSpace;
          src.map.anisotropy = 4;
        }
        const glass = /Glass/.test(src.name);
        mat = new THREE.MeshLambertMaterial({
          name: src.name,
          map: src.map,
          color: glass ? 0xbfe2f2 : src.map || painted ? 0xffffff : src.color,
          vertexColors: painted,
          transparent: glass,
          opacity: glass ? 0.28 : 1,
          alphaTest: /Vine/.test(src.name) ? 0.5 : 0,
          side: THREE.DoubleSide,
        });
        this.mats.set(src.name, mat);
      }
      parts.push({ geo, mat });
    });
    this.pieces.set(name, parts);
  }

  /** A fresh copy of a piece. `swap` replaces one of its materials by name (to tint the bed's quilt, say). */
  make(name: string, swap?: { name: string; mat: THREE.Material }): THREE.Group {
    const g = new THREE.Group();
    for (const p of this.pieces.get(name) ?? []) {
      const m = new THREE.Mesh(p.geo, swap && p.mat.name === swap.name ? swap.mat : p.mat);
      m.castShadow = !(p.mat as THREE.MeshLambertMaterial).transparent;
      m.receiveShadow = true;
      g.add(m);
    }
    return g;
  }

  material(name: string): THREE.MeshLambertMaterial | null {
    return (this.mats.get(name) as THREE.MeshLambertMaterial) ?? null;
  }
}

/** Resolves to null if anything fails; the house and stall then fall back to their built-in shapes. */
export async function loadKit(base: string): Promise<Kit | null> {
  try {
    const loader = new GLTFLoader().setPath(`${base}models/home/`);
    const kit = new Kit();
    const files = await Promise.all(NAMES.map((n) => loader.loadAsync(`${n}.gltf`)));
    files.forEach((gltf, i) => kit.add(NAMES[i], gltf.scene));
    const tex = new THREE.TextureLoader().setPath(`${base}models/nature/`);
    const [bark, barkDark] = await Promise.all([tex.loadAsync('Bark_NormalTree.webp'), tex.loadAsync('Bark_TwistedTree.webp')]);
    for (const t of [bark, barkDark]) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
    }
    kit.bark = bark;
    kit.barkDark = barkDark;
    return kit;
  } catch (err) {
    console.info('House models unavailable, using built-in shapes:', err);
    return null;
  }
}
