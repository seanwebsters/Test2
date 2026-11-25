import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { W, restoreProgress, ease } from './common';
import { waterMaterial } from './Environment';

const nr = () => null;

function lathe(points: [number, number][], seg = 40) {
  return new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(x, y)), seg);
}

const ARCS = 10;
const PER_ARC = 16;
const JET = 22;

/**
 * The fountain in the square. Frozen, its water hangs in glassy arcs of
 * motionless droplets; restored, the droplets fall and the pool ripples.
 */
export function Fountain() {
  const basin = useMemo(
    () =>
      lathe([
        [0, 0],
        [2.55, 0],
        [2.7, 0.15],
        [2.72, 0.62],
        [2.6, 0.78],
        [2.38, 0.78],
        [2.3, 0.62],
        [2.3, 0.3],
        [0, 0.3],
      ]),
    [],
  );
  const pillar = useMemo(
    () =>
      lathe([
        [0, 0.3],
        [0.55, 0.3],
        [0.42, 0.6],
        [0.3, 1.2],
        [0.34, 1.6],
        [0.0, 1.6],
      ]),
    [],
  );
  const bowl = useMemo(
    () =>
      lathe([
        [0, 1.55],
        [0.3, 1.55],
        [0.9, 1.75],
        [1.15, 1.95],
        [1.12, 2.05],
        [0.95, 2.0],
        [0.0, 1.9],
      ]),
    [],
  );
  const top = useMemo(
    () =>
      lathe([
        [0, 1.95],
        [0.16, 1.95],
        [0.12, 2.3],
        [0.22, 2.45],
        [0.12, 2.65],
        [0.0, 2.72],
      ]),
    [],
  );
  const pool = useMemo(() => waterMaterial('#86a7c6', '#b5d1d6', '#d3cdea'), []);
  const upper = useMemo(() => waterMaterial('#8fb0cc', '#bcd7dc', '#d8d2ee'), []);
  const drops = useRef<THREE.InstancedMesh>(null);
  const rings = useRef<THREE.Group>(null);
  const dropMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#e7ecf7', emissive: '#b9c6ef', emissiveIntensity: 0.55, roughness: 0.2, transparent: true, opacity: 0.85 }),
    [],
  );
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const phases = useMemo(() => Array.from({ length: ARCS * PER_ARC + JET }, (_, i) => (i * 0.6180339) % 1), []);
  const flowT = useRef(0);

  useFrame((_, dt) => {
    const p = ease(restoreProgress('fountain', 3500));
    flowT.current += dt * p;
    pool.uniforms.time.value = W.t;
    pool.uniforms.flow.value = p;
    upper.uniforms.time.value = W.t * 1.3;
    upper.uniforms.flow.value = p;
    dropMat.emissiveIntensity = 0.55 - p * 0.3;
    const m = drops.current;
    if (!m) return;
    let n = 0;
    for (let a = 0; a < ARCS; a++) {
      const ang = (a / ARCS) * Math.PI * 2;
      const cx = Math.cos(ang);
      const cz = Math.sin(ang);
      for (let i = 0; i < PER_ARC; i++) {
        // frozen: evenly along the arc; flowing: each drop travels the arc
        const base = i / PER_ARC;
        const u = (base + flowT.current * 0.9 + phases[n] * 0.02) % 1;
        const r = 1.12 + u * 0.95;
        const y = 2.0 + Math.sin(u * Math.PI * 0.55) * 0.35 - u * u * 1.55;
        dummy.position.set(cx * r, y, cz * r);
        const s = 0.055 + (1 - u) * 0.025;
        dummy.scale.set(s, s * (1 + p * 1.2), s);
        dummy.updateMatrix();
        m.setMatrixAt(n++, dummy.matrix);
      }
    }
    for (let i = 0; i < JET; i++) {
      const u = (i / JET + flowT.current * 1.1) % 1;
      const y = 2.72 + Math.sin(u * Math.PI) * 0.75;
      const spread = u * 0.18;
      dummy.position.set(Math.cos(i * 2.4) * spread, y, Math.sin(i * 2.4) * spread);
      dummy.scale.setScalar(0.05);
      dummy.updateMatrix();
      m.setMatrixAt(n++, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
    if (rings.current) {
      rings.current.visible = p > 0.05;
      rings.current.children.forEach((c, i) => {
        const t = (W.t * 0.4 + i / 4) % 1;
        c.scale.setScalar(1.2 + t * 1.0);
        ((c as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.35 * p;
      });
    }
  });

  return (
    <group position={[0, 0, 0]}>
      <mesh geometry={basin} castShadow receiveShadow raycast={nr}>
        <meshStandardMaterial color="#dacdc4" roughness={1} />
      </mesh>
      <mesh geometry={pillar} castShadow raycast={nr}>
        <meshStandardMaterial color="#d3c5bd" roughness={1} />
      </mesh>
      <mesh geometry={bowl} castShadow receiveShadow raycast={nr}>
        <meshStandardMaterial color="#dacdc4" roughness={1} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={top} castShadow raycast={nr}>
        <meshStandardMaterial color="#d3c5bd" roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.6, 0]} material={pool} raycast={nr}>
        <circleGeometry args={[2.32, 48]} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 1.96, 0]} material={upper} raycast={nr}>
        <circleGeometry args={[1.02, 32]} />
      </mesh>
      <instancedMesh ref={drops} args={[undefined, undefined, ARCS * PER_ARC + JET]} material={dropMat} raycast={nr}>
        <sphereGeometry args={[1, 8, 6]} />
      </instancedMesh>
      <group ref={rings} position={[0, 0.62, 0]}>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} rotation-x={-Math.PI / 2} raycast={nr}>
            <ringGeometry args={[0.9, 0.96, 40]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0} depthWrite={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
