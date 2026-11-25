import { useMemo, useRef, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import { W, PAL, mat, restoreProgress, easeOutBack } from './common';
import { PLACES } from '../game/layout';

const nr = () => null;
const PETALS = 5;
const COLORS = ['#e3a3b0', '#c9b3e0', '#f4e2e2', '#eab6a0', '#d68f9e', '#b9a6d9'];

interface Flower {
  x: number;
  z: number;
  h: number;
  c: THREE.Color;
  delay: number;
  s: number;
}

/**
 * His mother's garden: hedges, beds of flowers that stay closed while
 * time is frozen, a rose arch and a sundial whose shadow begins to move.
 */
export function Garden() {
  const [gx, gz] = PLACES.garden;
  const flowers = useMemo<Flower[]>(() => {
    const out: Flower[] = [];
    let seed = 41;
    const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const beds = [
      [-3, -2.6],
      [3, -2.6],
      [-3, 2.6],
      [3, 2.6],
    ];
    for (const [bx, bz] of beds) {
      for (let i = 0; i < 26; i++) {
        const x = gx + bx + (r() - 0.5) * 2.6;
        const z = gz + bz + (r() - 0.5) * 1.6;
        const dist = Math.hypot(x - PLACES.gardenGate[0], z - PLACES.gardenGate[1]);
        out.push({ x, z, h: 0.35 + r() * 0.35, c: new THREE.Color(COLORS[Math.floor(r() * COLORS.length)]), delay: dist * 0.06 + r() * 0.1, s: 0.8 + r() * 0.5 });
      }
    }
    return out;
  }, [gx, gz]);

  const stems = useRef<THREE.InstancedMesh>(null);
  const heads = useRef<THREE.InstancedMesh>(null);
  const petals = useRef<THREE.InstancedMesh>(null);
  const hearts = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const petalGeo = useMemo(() => {
    const g = new THREE.SphereGeometry(1, 8, 6);
    g.scale(0.5, 0.12, 1);
    g.translate(0, 0, 0.9);
    return g;
  }, []);
  const lastP = useRef(-1);

  const write = (p: number) => {
    const sm = stems.current;
    const hm = heads.current;
    const pm = petals.current;
    const cm = hearts.current;
    if (!sm || !hm || !pm || !cm) return;
    flowers.forEach((f, i) => {
      const local = THREE.MathUtils.clamp((p * 2.2 - f.delay) / 0.9, 0, 1);
      const open = easeOutBack(local);
      const sway = Math.sin(W.alive * 1.8 + i) * 0.06 * Math.min(1, W.flow - 2);
      dummy.position.set(f.x, f.h / 2, f.z);
      dummy.rotation.set(0, 0, sway * 0.5);
      dummy.scale.set(1, f.h, 1);
      dummy.updateMatrix();
      sm.setMatrixAt(i, dummy.matrix);
      // closed bud shrinks as petals open
      dummy.position.set(f.x, f.h + 0.06, f.z);
      dummy.rotation.set(0, 0, 0);
      const bud = 1 - open * 0.7;
      dummy.scale.set(0.07 * f.s * bud, 0.12 * f.s * bud, 0.07 * f.s * bud);
      dummy.updateMatrix();
      hm.setMatrixAt(i, dummy.matrix);
      for (let k = 0; k < PETALS; k++) {
        dummy.position.set(f.x, f.h + 0.05, f.z);
        // closed: petals fold upwards; open: they lie flat
        dummy.rotation.set(0, (k / PETALS) * Math.PI * 2 + i, 0);
        dummy.rotateX(-(1 - open) * 1.35 - 0.12);
        const ps = 0.06 + open * 0.07 * f.s;
        dummy.scale.set(ps, ps, ps);
        dummy.updateMatrix();
        pm.setMatrixAt(i * PETALS + k, dummy.matrix);
      }
      dummy.position.set(f.x, f.h + 0.08, f.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(0.035 * open * f.s + 0.0001);
      dummy.updateMatrix();
      cm.setMatrixAt(i, dummy.matrix);
    });
    sm.instanceMatrix.needsUpdate = hm.instanceMatrix.needsUpdate = pm.instanceMatrix.needsUpdate = cm.instanceMatrix.needsUpdate = true;
  };

  useLayoutEffect(() => {
    const pm = petals.current;
    const hm = heads.current;
    if (!pm || !hm) return;
    const c = new THREE.Color();
    flowers.forEach((f, i) => {
      hm.setColorAt(i, c.copy(f.c).multiplyScalar(0.85));
      for (let k = 0; k < PETALS; k++) pm.setColorAt(i * PETALS + k, c.copy(f.c).offsetHSL(0, 0, (k % 2) * 0.03));
    });
    pm.instanceColor!.needsUpdate = true;
    hm.instanceColor!.needsUpdate = true;
    write(restoreProgress('garden', 4200));
  });

  useFrame(() => {
    const p = restoreProgress('garden', 4200);
    if (p !== lastP.current || (p >= 1 && W.flow > 2)) {
      write(p);
      lastP.current = p;
    }
  });

  const n = flowers.length;
  return (
    <group>
      <Hedges />
      {/* gravel walk */}
      <mesh rotation-x={-Math.PI / 2} position={[gx, 0.02, gz]} receiveShadow raycast={nr}>
        <planeGeometry args={[9, 1.6]} />
        <meshStandardMaterial color="#e2d6c6" roughness={1} polygonOffset polygonOffsetFactor={-1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[gx, 0.021, gz]} receiveShadow raycast={nr}>
        <planeGeometry args={[1.6, 8]} />
        <meshStandardMaterial color="#e2d6c6" roughness={1} polygonOffset polygonOffsetFactor={-1} />
      </mesh>
      {[
        [-3, -2.6],
        [3, -2.6],
        [-3, 2.6],
        [3, 2.6],
      ].map(([bx, bz], i) => (
        <RoundedBox key={i} args={[3.0, 0.22, 2.0]} radius={0.08} position={[gx + bx, 0.08, gz + bz]} receiveShadow material={mat(PAL.soil)} raycast={nr} />
      ))}
      <instancedMesh ref={stems} args={[undefined, undefined, n]} castShadow raycast={nr}>
        <cylinderGeometry args={[0.018, 0.024, 1, 4]} />
        <meshStandardMaterial color="#6f8c60" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={heads} args={[undefined, undefined, n]} raycast={nr}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshStandardMaterial roughness={1} />
      </instancedMesh>
      <instancedMesh ref={petals} args={[petalGeo, undefined, n * PETALS]} castShadow raycast={nr}>
        <meshStandardMaterial roughness={1} />
      </instancedMesh>
      <instancedMesh ref={hearts} args={[undefined, undefined, n]} raycast={nr}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshStandardMaterial color="#f2d488" roughness={1} />
      </instancedMesh>
      <Sundial />
      <RoseArch />
      <Bench />
    </group>
  );
}

function Hedges() {
  const m = mat(PAL.hedge);
  const top = mat('#7d9a70');
  const [gx, gz] = PLACES.garden;
  const segs: [number, number, number, number][] = [
    [gx, gz - 4.5, 9.8, 0.9],
    [gx, gz + 4.5, 9.8, 0.9],
    [gx - 4.8, gz, 0.9, 9.8],
    [-7.8, gz - 3.1, 0.9, 2.8],
    [-7.8, gz + 3.1, 0.9, 2.8],
  ];
  return (
    <group>
      {segs.map(([x, z, w, d], i) => (
        <group key={i}>
          <RoundedBox args={[w, 1.15, d]} radius={0.32} smoothness={3} position={[x, 0.58, z]} castShadow receiveShadow material={m} raycast={nr} />
          <RoundedBox args={[w - 0.2, 0.2, d - 0.2]} radius={0.1} position={[x, 1.12, z]} material={top} raycast={nr} />
        </group>
      ))}
    </group>
  );
}

function Sundial() {
  const [gx, gz] = PLACES.garden;
  const shadow = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (shadow.current) shadow.current.rotation.y = -0.6 - W.alive * 0.03;
  });
  return (
    <group position={[gx, 0, gz]}>
      <mesh position={[0, 0.45, 0]} castShadow raycast={nr}>
        <cylinderGeometry args={[0.22, 0.32, 0.9, 10]} />
        <meshStandardMaterial color="#d8cbc2" roughness={1} />
      </mesh>
      <mesh position={[0, 0.94, 0]} castShadow receiveShadow raycast={nr}>
        <cylinderGeometry args={[0.55, 0.5, 0.1, 20]} />
        <meshStandardMaterial color="#e3d8cd" roughness={1} />
      </mesh>
      <mesh position={[0, 1.08, 0]} rotation-z={0.5} castShadow raycast={nr}>
        <boxGeometry args={[0.03, 0.3, 0.3]} />
        <meshStandardMaterial color="#8d7b6a" roughness={0.7} metalness={0.3} />
      </mesh>
      <mesh ref={shadow} position={[0, 1.0, 0]} raycast={nr}>
        <boxGeometry args={[0.03, 0.005, 0.42]} />
        <meshBasicMaterial color="#6e6074" transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

function RoseArch() {
  const [ax, az] = PLACES.gardenGate;
  const roses = useRef<THREE.Group>(null);
  const leaves = useMemo(() => {
    const out: [number, number, number, number][] = [];
    for (let i = 0; i < 34; i++) {
      const a = (i / 33) * Math.PI;
      out.push([Math.cos(a) * 1.55, 2.1 + Math.sin(a) * 1.0, (i % 3) * 0.08 - 0.08, 0.14 + (i % 4) * 0.03]);
    }
    for (let i = 0; i < 10; i++) {
      out.push([-1.55 + (i % 2) * 0.1, 0.3 + i * 0.2, 0.06, 0.14]);
      out.push([1.55 - (i % 2) * 0.1, 0.3 + i * 0.2, -0.06, 0.14]);
    }
    return out;
  }, []);
  const roseSpots = useMemo(() => leaves.filter((_, i) => i % 3 === 0), [leaves]);
  useFrame(() => {
    const p = restoreProgress('garden', 4200);
    roses.current?.children.forEach((c, i) => {
      const k = THREE.MathUtils.clamp(p * 2 - i * 0.03, 0, 1);
      c.scale.setScalar(0.05 + easeOutBack(k) * 0.12);
    });
  });
  const post = mat('#efe6da');
  return (
    <group position={[ax, 0, az]} rotation-y={Math.PI / 2}>
      {[-1.55, 1.55].map((x) => (
        <mesh key={x} position={[x, 1.05, 0]} castShadow material={post} raycast={nr}>
          <cylinderGeometry args={[0.07, 0.08, 2.1, 8]} />
        </mesh>
      ))}
      <mesh position={[0, 2.1, 0]} castShadow material={post} raycast={nr}>
        <torusGeometry args={[1.55, 0.07, 8, 32, Math.PI]} />
      </mesh>
      {leaves.map(([x, y, z, s], i) => (
        <mesh key={i} position={[x, y, z]} scale={[s, s * 0.8, s]} raycast={nr}>
          <sphereGeometry args={[1, 7, 5]} />
          <meshStandardMaterial color={i % 2 ? PAL.hedge : '#7f9c72'} roughness={1} />
        </mesh>
      ))}
      <group ref={roses}>
        {roseSpots.map(([x, y, z], i) => (
          <mesh key={i} position={[x, y + 0.05, z + 0.1]} raycast={nr}>
            <sphereGeometry args={[1, 10, 8]} />
            <meshStandardMaterial color={i % 2 ? '#d98a99' : '#eeb7c0'} roughness={1} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function Bench() {
  const [x, z] = PLACES.bench;
  const wood = mat('#8a6a5a');
  const iron = mat('#4a4256');
  return (
    <group position={[x, 0, z]} rotation-y={Math.PI / 4}>
      <RoundedBox args={[1.8, 0.1, 0.5]} radius={0.04} position={[0, 0.48, 0]} castShadow material={wood} raycast={nr} />
      <RoundedBox args={[1.8, 0.45, 0.08]} radius={0.04} position={[0, 0.8, -0.22]} castShadow material={wood} raycast={nr} />
      {[-0.75, 0.75].map((lx) => (
        <mesh key={lx} position={[lx, 0.24, 0]} material={iron} raycast={nr}>
          <boxGeometry args={[0.08, 0.48, 0.45]} />
        </mesh>
      ))}
    </group>
  );
}
