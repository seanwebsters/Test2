import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Welds everything in `root` that never moves into one mesh per material.
 * A structure built from hundreds of boards, logs and props then costs a
 * handful of draw calls instead of hundreds, and looks exactly the same.
 *
 * Left alone: anything hidden (it is being switched on and off), anything
 * inside a node marked `userData.live` (it moves, grows or is picked),
 * instanced meshes, sprites and points.
 */
export function bakeStatic(root: THREE.Object3D): number {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map<string, { mat: THREE.Material; cast: boolean; receive: boolean; geos: THREE.BufferGeometry[]; order: number }>();
  const gone: THREE.Mesh[] = [];
  const walk = (o: THREE.Object3D): void => {
    if (!o.visible || o.userData.live) return;
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh && !(mesh as unknown as THREE.InstancedMesh).isInstancedMesh && !Array.isArray(mesh.material) && mesh.geometry.attributes.position) {
      const mat = mesh.material as THREE.Material;
      const colored = !!(mat as THREE.MeshStandardMaterial).vertexColors;
      const g = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
      // every piece must carry the same attributes to be welded
      for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(name) || (name === 'color' && !colored)) g.deleteAttribute(name);
      const n = g.attributes.position.count;
      if (!g.attributes.normal) g.computeVertexNormals();
      if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
      if (colored && !g.attributes.color) g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).fill(1), 3));
      g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, mesh.matrixWorld));
      const key = `${mat.uuid}|${mesh.castShadow ? 1 : 0}|${mesh.receiveShadow ? 1 : 0}|${mesh.renderOrder}`;
      let b = buckets.get(key);
      if (!b) buckets.set(key, (b = { mat, cast: mesh.castShadow, receive: mesh.receiveShadow, geos: [], order: mesh.renderOrder }));
      b.geos.push(g);
      gone.push(mesh);
    }
    for (const c of o.children) walk(c);
  };
  for (const c of [...root.children]) walk(c);
  for (const m of gone) m.parent?.remove(m);
  for (const b of buckets.values()) {
    const merged = mergeGeometries(b.geos);
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, b.mat);
    mesh.castShadow = b.cast;
    mesh.receiveShadow = b.receive;
    mesh.renderOrder = b.order;
    root.add(mesh);
  }
  return gone.length - buckets.size;
}
