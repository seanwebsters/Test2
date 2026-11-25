import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { W, glowTexture } from './common';
import { useGame } from '../game/store';
import { GLIMMERS, PLACES } from '../game/layout';
import { STEP } from '../game/story';
import { RestoreId } from '../game/quests';

const nr = () => null;

/** Blossom petals: suspended mid-air while frozen, drifting once time returns. */
export function Petals() {
  const N = 220;
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const data = useMemo(() => {
    let seed = 77;
    const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    return Array.from({ length: N }, () => ({
      x: -24 + r() * 48,
      y: 0.4 + r() * 7,
      z: -18 + r() * 40,
      rx: r() * 6,
      ry: r() * 6,
      sp: 0.4 + r() * 0.6,
      ph: r() * 10,
    }));
  }, []);
  const geo = useMemo(() => {
    const g = new THREE.SphereGeometry(1, 6, 4);
    g.scale(0.09, 0.015, 0.06);
    return g;
  }, []);
  useFrame(() => {
    const m = ref.current;
    if (!m) return;
    const t = W.alive;
    const k = Math.min(1, W.flow);
    data.forEach((p, i) => {
      // fall and wrap, sway sideways
      const fall = (t * p.sp * 0.55) % 7.5;
      let y = p.y - fall * k;
      if (y < 0.05) y += 7.5;
      const x = p.x + Math.sin(t * 0.7 + p.ph) * 0.6 * k + t * 0.25 * k;
      const wx = ((x + 24) % 48 + 48) % 48 - 24;
      dummy.position.set(wx, y, p.z + Math.cos(t * 0.5 + p.ph) * 0.4 * k);
      dummy.rotation.set(p.rx + t * 1.5 * k, p.ry + t * k, 0);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[geo, undefined, N]} raycast={nr} frustumCulled={false}>
      <meshStandardMaterial color="#f2b9c4" emissive="#e89aac" emissiveIntensity={0.25} roughness={1} side={THREE.DoubleSide} />
    </instancedMesh>
  );
}

function Bird({ i }: { i: number }) {
  const g = useRef<THREE.Group>(null);
  const wl = useRef<THREE.Mesh>(null);
  const wr = useRef<THREE.Mesh>(null);
  const frozen = useMemo(
    () =>
      [
        [-3.6, 2.4, 3.0, 0.4],
        [2.8, 3.6, -3.5, 2.0],
        [-1.6, 4.4, -6.5, -1.0],
        [5.2, 5.0, 2.2, 1.4],
      ][i] as [number, number, number, number],
    [i],
  );
  useFrame(() => {
    const grp = g.current;
    if (!grp) return;
    const free = THREE.MathUtils.clamp(W.flow - 2.2, 0, 1);
    const t = W.alive * 0.35 + i * 1.6;
    const r = 7 + i * 2.5;
    const fx = Math.cos(t) * r;
    const fz = Math.sin(t) * r - 6;
    const fy = 11 + Math.sin(t * 2) * 1.5 + i;
    grp.position.set(
      THREE.MathUtils.lerp(frozen[0], fx, free),
      THREE.MathUtils.lerp(frozen[1], fy, free),
      THREE.MathUtils.lerp(frozen[2], fz, free),
    );
    grp.rotation.y = THREE.MathUtils.lerp(frozen[3], -t - Math.PI / 2, free);
    const flap = free > 0 ? Math.sin(W.t * 14 + i) * 0.9 : 0.55;
    if (wl.current) wl.current.rotation.z = flap;
    if (wr.current) wr.current.rotation.z = -flap;
  });
  return (
    <group ref={g} scale={0.9}>
      <mesh scale={[0.12, 0.11, 0.2]} castShadow raycast={nr}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshStandardMaterial color="#8f7a70" roughness={1} />
      </mesh>
      <mesh position={[0, 0.05, 0.16]} raycast={nr}>
        <sphereGeometry args={[0.08, 10, 8]} />
        <meshStandardMaterial color="#8f7a70" roughness={1} />
      </mesh>
      <mesh position={[0, 0.0, 0.12]} scale={[0.08, 0.06, 0.06]} raycast={nr}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshStandardMaterial color="#e8d2c2" roughness={1} />
      </mesh>
      <mesh position={[0, 0.04, 0.25]} rotation-x={Math.PI / 2} raycast={nr}>
        <coneGeometry args={[0.025, 0.07, 5]} />
        <meshStandardMaterial color="#d8a65e" />
      </mesh>
      <mesh ref={wl} position={[-0.08, 0.04, 0]} raycast={nr}>
        <boxGeometry args={[0.24, 0.02, 0.14]} />
        <meshStandardMaterial color="#7a665e" roughness={1} />
      </mesh>
      <mesh ref={wr} position={[0.08, 0.04, 0]} raycast={nr}>
        <boxGeometry args={[0.24, 0.02, 0.14]} />
        <meshStandardMaterial color="#7a665e" roughness={1} />
      </mesh>
    </group>
  );
}

export function Birds() {
  return (
    <>
      {[0, 1, 2, 3].map((i) => (
        <Bird key={i} i={i} />
      ))}
    </>
  );
}

export function Butterflies() {
  const N = 10;
  const refs = useRef<(THREE.Group | null)[]>([]);
  const data = useMemo(
    () =>
      Array.from({ length: N }, (_, i) => ({
        cx: i < 6 ? PLACES.garden[0] + (i - 3) * 1.4 : (i - 7) * 4,
        cz: i < 6 ? PLACES.garden[1] + ((i * 37) % 5) - 2 : 4 + (i % 2) * 2,
        ph: i * 1.7,
        col: ['#f3c6d0', '#c9b6e6', '#f6e3b4', '#bfd4e8'][i % 4],
      })),
    [],
  );
  useFrame(() => {
    const vis = THREE.MathUtils.clamp(W.flow - 2.5, 0, 1);
    refs.current.forEach((g, i) => {
      if (!g) return;
      const d = data[i];
      g.visible = vis > 0.01;
      const t = W.t * 0.6 + d.ph;
      g.position.set(d.cx + Math.sin(t) * 1.5, 0.8 + Math.sin(t * 2.3) * 0.35 + vis * 0.3, d.cz + Math.cos(t * 0.8) * 1.2);
      g.rotation.y = -t;
      g.scale.setScalar(vis);
      const flap = Math.sin(W.t * 18 + i) * 0.9;
      (g.children[0] as THREE.Mesh).rotation.z = flap;
      (g.children[1] as THREE.Mesh).rotation.z = -flap;
    });
  });
  return (
    <>
      {data.map((d, i) => (
        <group key={i} ref={(g) => (refs.current[i] = g)}>
          <mesh position={[-0.07, 0, 0]} raycast={nr}>
            <circleGeometry args={[0.09, 10]} />
            <meshStandardMaterial color={d.col} side={THREE.DoubleSide} roughness={1} emissive={d.col} emissiveIntensity={0.2} />
          </mesh>
          <mesh position={[0.07, 0, 0]} raycast={nr}>
            <circleGeometry args={[0.09, 10]} />
            <meshStandardMaterial color={d.col} side={THREE.DoubleSide} roughness={1} emissive={d.col} emissiveIntensity={0.2} />
          </mesh>
        </group>
      ))}
    </>
  );
}

const GLIMMER_COLOR: Record<string, string> = {
  bloom: '#f4a9bb',
  clock: '#f0cf98',
  crystal: '#c7b2f2',
  key: '#e8d6a8',
  ink: '#f4ecdc',
  time: '#a9d2ec',
};

/** the small lights that follow her into the city: walk through one to gather it */
export function Glimmers() {
  const refs = useRef<(THREE.Group | null)[]>([]);
  const tex = glowTexture();
  useFrame(() => {
    const s = useGame.getState();
    const on = s.step >= STEP.q1;
    const now = Date.now();
    refs.current.forEach((g, i) => {
      if (!g) return;
      const gl = GLIMMERS[i];
      const ready = on && (s.glimmers[gl.id] ?? 0) <= now;
      const target = ready ? 1 : 0;
      const sc = THREE.MathUtils.lerp(g.scale.x, target, 0.08);
      g.scale.setScalar(sc);
      g.visible = sc > 0.02;
      g.position.y = 0.9 + Math.sin(W.t * 2 + i) * 0.15;
      g.children[2].rotation.y = W.t * 1.5 + i;
    });
  });
  return (
    <>
      {GLIMMERS.map((gl, i) => (
        <group key={gl.id} ref={(g) => (refs.current[i] = g)} position={[gl.pos[0], 0.9, gl.pos[1]]} scale={0}>
          <mesh raycast={nr}>
            <icosahedronGeometry args={[0.13, 1]} />
            <meshStandardMaterial color={GLIMMER_COLOR[gl.chain]} emissive={GLIMMER_COLOR[gl.chain]} emissiveIntensity={1.6} roughness={0.4} />
          </mesh>
          <sprite scale={[1.4, 1.4, 1]} raycast={nr}>
            <spriteMaterial map={tex} color={GLIMMER_COLOR[gl.chain]} transparent opacity={0.65} depthWrite={false} blending={THREE.AdditiveBlending} />
          </sprite>
          <group>
            {[0, 1, 2].map((k) => (
              <mesh key={k} position={[Math.cos((k / 3) * Math.PI * 2) * 0.35, Math.sin(k * 2) * 0.1, Math.sin((k / 3) * Math.PI * 2) * 0.35]} raycast={nr}>
                <octahedronGeometry args={[0.035, 0]} />
                <meshBasicMaterial color="#fff6e8" />
              </mesh>
            ))}
          </group>
        </group>
      ))}
    </>
  );
}

const BURST_AT: Record<RestoreId, [number, number, number]> = {
  clock: [0, 12, -11.5],
  fountain: [0, 1.5, 0],
  garden: [-12.5, 0.8, -1.5],
  bookshop: [10, 2, -1.2],
  bell: [0, 16, -14],
};

/** rising motes of light when a place is restored */
export function RestoreBursts() {
  const N = 90;
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const seeds = useMemo(() => Array.from({ length: N }, (_, i) => ({ a: i * 2.399, r: 0.3 + ((i * 0.618) % 1) * 3, sp: 0.6 + ((i * 0.37) % 1) })), []);
  useFrame(() => {
    const m = ref.current;
    if (!m) return;
    const s = useGame.getState();
    let id: RestoreId | null = null;
    let at = 0;
    for (const k of Object.keys(s.restored) as RestoreId[]) {
      const t = s.restored[k]!;
      if (t > at) {
        at = t;
        id = k;
      }
    }
    const age = (Date.now() - at) / 1000;
    const active = id && age > 0 && age < 4.5;
    m.visible = !!active;
    if (!active || !id) return;
    const [bx, by, bz] = BURST_AT[id];
    seeds.forEach((sd, i) => {
      const t = age * sd.sp;
      const r = sd.r * (0.4 + Math.min(1, age) * 0.6);
      dummy.position.set(bx + Math.cos(sd.a + t) * r, by + t * 1.6, bz + Math.sin(sd.a + t) * r);
      dummy.scale.setScalar(0.06 * Math.max(0, 1 - age / 4.5));
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, N]} raycast={nr} frustumCulled={false}>
      <octahedronGeometry args={[1, 0]} />
      <meshBasicMaterial color="#fff2d6" />
    </instancedMesh>
  );
}

/** the folded note among the tree roots */
export function RootLetter() {
  const letters = useGame((s) => s.letters);
  const step = useGame((s) => s.step);
  const g = useRef<THREE.Group>(null);
  useFrame(() => {
    if (g.current) g.current.position.y = 0.12 + Math.sin(W.t * 2) * 0.02;
  });
  if (letters.includes('roots') || step < STEP.explore) return null;
  return (
    <group ref={g} position={[3.7, 0.12, 15.6]} rotation-y={0.4}>
      <mesh rotation-x={-Math.PI / 2 + 0.25} castShadow raycast={nr}>
        <planeGeometry args={[0.34, 0.24]} />
        <meshStandardMaterial color="#f8efdf" emissive="#f6dcb0" emissiveIntensity={0.4} side={THREE.DoubleSide} />
      </mesh>
      <sprite scale={[0.9, 0.9, 1]} raycast={nr}>
        <spriteMaterial map={glowTexture()} color="#ffe6bd" transparent opacity={0.5} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
    </group>
  );
}

/** a small speech-bubble marker over whatever the story wants you to find */
export function QuestMarker() {
  const step = useGame((s) => s.step);
  const dialogue = useGame((s) => s.dialogue);
  const screen = useGame((s) => s.screen);
  const g = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!g.current) return;
    if (step === STEP.explore) g.current.position.set(W.him.x, 2.4 + Math.sin(W.t * 3) * 0.08, W.him.z);
  });
  if (screen !== 'game' || dialogue || step !== STEP.explore) return null;
  return (
    <group ref={g}>
      <Html center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
        <div className="marker">!</div>
      </Html>
    </group>
  );
}
