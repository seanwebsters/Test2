import { useMemo, useRef, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useTexture } from '@react-three/drei';
import { W } from './common';
import { TREES, PLACES } from '../game/layout';

const BASE = `${import.meta.env.BASE_URL}models/`;
const nr = () => null;

interface Part {
  geo: THREE.BufferGeometry;
  mat: THREE.Material;
  leaf: boolean;
}

/** Bake a glTF scene into world-space parts, scaled so its size matches `size` (height or width). */
function useParts(url: string, size: { height?: number; width?: number }): Part[] {
  const gltf = useGLTF(url);
  return useMemo(() => {
    const parts: Part[] = [];
    const box = new THREE.Box3();
    gltf.scene.updateMatrixWorld(true);
    gltf.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const geo = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
      if (geo.getAttribute('color')) geo.deleteAttribute('color');
      geo.computeBoundingBox();
      box.union(geo.boundingBox!);
      const src = mesh.material as THREE.MeshStandardMaterial;
      const m = src.clone();
      m.vertexColors = false;
      m.roughness = 1;
      m.metalness = 0;
      const leaf = /leaf|leaves|flower/i.test(src.name) || src.alphaTest > 0 || src.transparent;
      if (leaf) {
        m.alphaTest = 0.45;
        m.transparent = false;
        m.side = THREE.DoubleSide;
      }
      parts.push({ geo, mat: m, leaf });
    });
    const s = box.getSize(new THREE.Vector3());
    const k = size.height ? size.height / box.max.y : size.width! / Math.max(s.x, s.z);
    for (const p of parts) p.geo.scale(k, k, k);
    return parts;
  }, [gltf, size.height, size.width]);
}

interface Inst {
  x: number;
  y?: number;
  z: number;
  s: number;
  rot: number;
}

function Instanced({ parts, items, sway = 0, tint }: { parts: Part[]; items: Inst[]; sway?: number; tint?: (p: Part) => THREE.Material | null }) {
  const refs = useRef<(THREE.InstancedMesh | null)[]>([]);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const phases = useMemo(() => items.map((_, i) => (i * 2.399) % (Math.PI * 2)), [items]);
  const write = (t: number, k: number) => {
    refs.current.forEach((m) => {
      if (!m) return;
      items.forEach((it, i) => {
        dummy.position.set(it.x, it.y ?? 0, it.z);
        dummy.rotation.set(Math.sin(t * 1.1 + phases[i]) * sway * k, it.rot, Math.cos(t * 0.9 + phases[i]) * sway * k);
        dummy.scale.setScalar(it.s);
        dummy.updateMatrix();
        m.setMatrixAt(i, dummy.matrix);
      });
      m.instanceMatrix.needsUpdate = true;
    });
  };
  useLayoutEffect(() => {
    write(0, 0);
    refs.current.forEach((m) => m?.computeBoundingSphere());
  });
  useFrame(() => {
    if (sway > 0 && W.flow > 0.01) write(W.alive, Math.min(1, W.flow));
  });
  return (
    <>
      {parts.map((p, i) => (
        <instancedMesh
          key={i}
          ref={(m) => {
            refs.current[i] = m;
          }}
          args={[p.geo, tint?.(p) ?? p.mat, items.length]}
          castShadow
          receiveShadow
          frustumCulled={false}
          raycast={nr}
        />
      ))}
    </>
  );
}

export function Woodland() {
  const t1 = useParts(`${BASE}nature/CommonTree_1.gltf`, { height: 8.5 });
  const t2 = useParts(`${BASE}nature/CommonTree_2.gltf`, { height: 9 });
  const t3 = useParts(`${BASE}nature/CommonTree_3.gltf`, { height: 8 });
  const pink = useTexture(`${BASE}nature/Leaves_NormalTree_C_pink.webp`);
  pink.colorSpace = THREE.SRGBColorSpace;
  pink.flipY = false;
  const pinkMats = useMemo(() => new Map<THREE.Material, THREE.Material>(), []);
  const pinkTint = (p: Part) => {
    if (!p.leaf) return null;
    let m = pinkMats.get(p.mat);
    if (!m) {
      const c = (p.mat as THREE.MeshStandardMaterial).clone();
      c.map = pink;
      c.color.set('#ffffff');
      c.emissive.set('#c27a92');
      c.emissiveMap = pink;
      c.emissiveIntensity = 0.45;
      pinkMats.set(p.mat, c);
      m = c;
    }
    return m;
  };
  const greenTint = useMemo(() => new Map<THREE.Material, THREE.Material>(), []);
  const sage = (p: Part) => {
    if (!p.leaf) return null;
    let m = greenTint.get(p.mat);
    if (!m) {
      const c = (p.mat as THREE.MeshStandardMaterial).clone();
      c.color.set('#d9e6c8');
      greenTint.set(p.mat, c);
      m = c;
    }
    return m;
  };
  const kinds = [t1, t2, t3];
  const groups = useMemo(() => {
    const g: Record<string, Inst[]> = {};
    for (const t of TREES) {
      const k = `${t.kind}${t.pink ? 'p' : 'g'}`;
      (g[k] ??= []).push({ x: t.x, z: t.z, s: t.s, rot: t.rot });
    }
    return g;
  }, []);
  const wake: Inst[] = useMemo(() => [{ x: PLACES.tree[0], z: PLACES.tree[1], s: 1.12, rot: 0.6 }], []);
  return (
    <group>
      {Object.entries(groups).map(([k, items]) => (
        <Instanced key={k} parts={kinds[Number(k[0])]} items={items} sway={0.025} tint={k[1] === 'p' ? pinkTint : sage} />
      ))}
      {/* the blossom tree she wakes beneath */}
      <Instanced parts={t2} items={wake} sway={0.015} tint={pinkTint} />
    </group>
  );
}

export function Undergrowth() {
  const bush = useParts(`${BASE}nature/Bush_Common_Flowers.gltf`, { width: 2.2 });
  const bush2 = useParts(`${BASE}nature/Bush_Common.gltf`, { width: 2.0 });
  const fl3 = useParts(`${BASE}nature/Flower_3_Group.gltf`, { width: 0.9 });
  const fl4 = useParts(`${BASE}nature/Flower_4_Group.gltf`, { width: 0.9 });
  const fern = useParts(`${BASE}nature/Fern_1.gltf`, { width: 1.6 });
  const mush = useParts(`${BASE}nature/Mushroom_Common.gltf`, { width: 0.5 });
  const rock = useParts(`${BASE}nature/Rock_Medium_1.gltf`, { width: 1.6 });
  const rock2 = useParts(`${BASE}nature/Rock_Medium_2.gltf`, { width: 1.3 });
  const layout = useMemo(() => {
    let seed = 99;
    const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const scatter = (n: number, area: (u: number, v: number) => [number, number] | null, s0: number, s1: number): Inst[] => {
      const out: Inst[] = [];
      let tries = 0;
      while (out.length < n && tries < n * 30) {
        tries++;
        const p = area(r(), r());
        if (!p) continue;
        out.push({ x: p[0], z: p[1], s: s0 + r() * (s1 - s0), rot: r() * Math.PI * 2 });
      }
      return out;
    };
    const woods = (u: number, v: number): [number, number] | null => {
      const x = -22 + u * 44;
      const z = 11.6 + v * 9;
      if (Math.abs(x - (z - 10.5) * 0.35) < 1.6) return null;
      if (Math.hypot(x - PLACES.tree[0], z - PLACES.tree[1]) < 1.6) return null;
      return [x, z];
    };
    const edges = (u: number, v: number): [number, number] | null => {
      const a = u * Math.PI * 2;
      const d = 20 + v * 6;
      const x = Math.cos(a) * d;
      const z = Math.sin(a) * d;
      if (z > 8 && z < 11) return null;
      return [x, z];
    };
    return {
      bush: [...scatter(10, woods, 0.7, 1.1), ...scatter(14, edges, 0.9, 1.4), { x: -6.5, z: -9.2, s: 0.8, rot: 1 }, { x: 6.2, z: -9.4, s: 0.85, rot: 2 }],
      bush2: scatter(14, edges, 1, 1.5),
      fl3: [...scatter(26, woods, 0.8, 1.2), ...scatter(8, (u, v) => [PLACES.tree[0] - 3 + u * 6, PLACES.tree[1] - 3 + v * 4], 0.8, 1.1)],
      fl4: scatter(22, woods, 0.8, 1.2),
      fern: scatter(16, woods, 0.7, 1.2),
      mush: scatter(14, woods, 0.7, 1.3),
      rock: [...scatter(6, woods, 0.6, 1.0), ...scatter(8, edges, 0.9, 1.5)],
      rock2: scatter(6, woods, 0.6, 1.0),
    };
  }, []);
  return (
    <group>
      <Instanced parts={bush} items={layout.bush} />
      <Instanced parts={bush2} items={layout.bush2} />
      <Instanced parts={fl3} items={layout.fl3} />
      <Instanced parts={fl4} items={layout.fl4} />
      <Instanced parts={fern} items={layout.fern} />
      <Instanced parts={mush} items={layout.mush} />
      <Instanced parts={rock} items={layout.rock} />
      <Instanced parts={rock2} items={layout.rock2} />
    </group>
  );
}

export function GardenPlants() {
  const bush = useParts(`${BASE}nature/Bush_Common_Flowers.gltf`, { width: 1.8 });
  const fl3 = useParts(`${BASE}nature/Flower_3_Group.gltf`, { width: 0.8 });
  const items = useMemo<Inst[]>(
    () => [
      { x: -16.2, z: -5.0, s: 1, rot: 0.3 },
      { x: -16.3, z: 1.9, s: 1.1, rot: 1.3 },
      { x: -9.2, z: 2.0, s: 0.9, rot: 2.1 },
      { x: -9.0, z: -5.0, s: 0.9, rot: 0.8 },
    ],
    [],
  );
  const fl = useMemo<Inst[]>(
    () => Array.from({ length: 10 }, (_, i) => ({ x: -16.6 + (i % 2) * 0.3, z: -4 + i * 0.6, s: 0.8, rot: i })),
    [],
  );
  return (
    <group>
      <Instanced parts={bush} items={items} />
      <Instanced parts={fl3} items={fl} />
    </group>
  );
}

for (const f of ['CommonTree_1', 'CommonTree_2', 'CommonTree_3', 'Bush_Common_Flowers', 'Bush_Common', 'Flower_3_Group', 'Flower_4_Group', 'Fern_1', 'Mushroom_Common', 'Rock_Medium_1', 'Rock_Medium_2'])
  useGLTF.preload(`${BASE}nature/${f}.gltf`);

const PINKS = ['#f4b8c6', '#eea6b9', '#f8cdd6', '#e898ae', '#f2c2d8'];

/** Soft, round blossom trees: the town's signature pink, in stylised puffs. */
export function BlossomTrees({ spots }: { spots: [number, number][] }) {
  const crown = useRef<THREE.InstancedMesh>(null);
  const trunk = useRef<THREE.InstancedMesh>(null);
  const puffs = useMemo(() => {
    const out: { tree: number; p: THREE.Vector3; s: number; c: string }[] = [];
    let seed = 17;
    const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    spots.forEach(([x, z], t) => {
      const h = 3.1 + r() * 0.9;
      const k = 0.85 + r() * 0.35;
      for (let i = 0; i < 9; i++) {
        const a = i * 2.399 + t;
        const rr = i === 0 ? 0 : 0.75 + r() * 0.55;
        const y = h + (i === 0 ? 0.35 : (r() - 0.35) * 0.9);
        out.push({ tree: t, p: new THREE.Vector3(x + Math.cos(a) * rr * k, y * k, z + Math.sin(a) * rr * k), s: (i === 0 ? 1.25 : 0.72 + r() * 0.35) * k, c: PINKS[Math.floor(r() * PINKS.length)] });
      }
    });
    return out;
  }, [spots]);
  const crownGeo = useMemo(() => new THREE.IcosahedronGeometry(1, 2), []);
  const trunkGeo = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.13, 0.22, 3, 7);
    g.translate(0, 1.5, 0);
    return g;
  }, []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const write = (t: number, k: number) => {
    const m = crown.current;
    if (!m) return;
    puffs.forEach((p, i) => {
      const sway = Math.sin(t * 1.2 + p.tree * 1.7) * 0.06 * k;
      dummy.position.set(p.p.x + sway * p.p.y * 0.3, p.p.y, p.p.z);
      dummy.rotation.set(0, i, 0);
      dummy.scale.set(p.s, p.s * 0.86, p.s);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  };
  useLayoutEffect(() => {
    const m = crown.current;
    const tm = trunk.current;
    if (!m || !tm) return;
    const c = new THREE.Color();
    puffs.forEach((p, i) => m.setColorAt(i, c.set(p.c)));
    m.instanceColor!.needsUpdate = true;
    spots.forEach(([x, z], i) => {
      dummy.position.set(x, 0, z);
      dummy.rotation.set(0.05 * Math.sin(i * 3), i * 1.3, 0.05 * Math.cos(i * 2));
      dummy.scale.set(1, 0.95 + (i % 3) * 0.08, 1);
      dummy.updateMatrix();
      tm.setMatrixAt(i, dummy.matrix);
    });
    tm.instanceMatrix.needsUpdate = true;
    write(0, 0);
  });
  useFrame(() => {
    if (W.flow > 0.01) write(W.alive, Math.min(1, W.flow));
  });
  return (
    <group>
      <instancedMesh ref={trunk} args={[trunkGeo, undefined, spots.length]} castShadow raycast={nr}>
        <meshStandardMaterial color="#7b5a4e" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={crown} args={[crownGeo, undefined, puffs.length]} castShadow receiveShadow raycast={nr} frustumCulled={false}>
        <meshStandardMaterial roughness={1} emissive="#b86a86" emissiveIntensity={0.2} />
      </instancedMesh>
    </group>
  );
}

/** hanging wisteria strands, lavender, swaying once time moves */
export function Wisteria({ p, rot = 0, width = 2.4, n = 7 }: { p: [number, number, number]; rot?: number; width?: number; n?: number }) {
  const g = useRef<THREE.Group>(null);
  const strands = useMemo(
    () =>
      Array.from({ length: n }, (_, i) => ({
        x: -width / 2 + (i / (n - 1)) * width + Math.sin(i * 3.1) * 0.08,
        len: 0.7 + ((i * 0.618) % 1) * 0.8,
        c: i % 3 === 0 ? '#c9b3e3' : i % 3 === 1 ? '#b7a0d8' : '#dccbf0',
      })),
    [n, width],
  );
  useFrame(() => {
    const k = Math.min(1, W.flow);
    g.current?.children.forEach((c, i) => {
      if (i === 0) return;
      c.rotation.x = Math.sin(W.alive * 1.6 + i) * 0.08 * k;
    });
  });
  return (
    <group ref={g} position={p} rotation-y={rot}>
      <mesh raycast={nr} scale={[width / 2 + 0.2, 0.22, 0.28]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshStandardMaterial color="#7f9c72" roughness={1} />
      </mesh>
      {strands.map((s, i) => (
        <group key={i} position={[s.x, 0, 0.1]}>
          {[0, 1, 2, 3, 4].map((k) => {
            const t = k / 4;
            const r = 0.13 * (1 - t * 0.6);
            return (
              <mesh key={k} position={[0, -t * s.len - 0.08, 0]} raycast={nr}>
                <sphereGeometry args={[r, 8, 6]} />
                <meshStandardMaterial color={s.c} roughness={1} emissive="#8f78b8" emissiveIntensity={0.15} />
              </mesh>
            );
          })}
        </group>
      ))}
    </group>
  );
}
