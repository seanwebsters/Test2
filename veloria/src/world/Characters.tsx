import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

const nr = () => null;

export interface Anim {
  /** 0 idle .. 1 full walk */
  speed: number;
  phase: number;
  sit: number;
  /** 0 visible .. 1 gone */
  fade: number;
  /** look up at something (0..1) */
  lookUp: number;
}

export function makeAnim(): Anim {
  return { speed: 0, phase: 0, sit: 0, fade: 0, lookUp: 0 };
}

interface Look {
  skin: string;
  hair: string;
  hairHi: string;
  cloak: string;
  cloakIn: string;
  dress: string;
  boots: string;
  clasp: string;
  style: 'long' | 'curly';
  height: number;
}

export const HEROINE: Look = {
  skin: '#f4d9c8',
  hair: '#4b2f2c',
  hairHi: '#5d3b36',
  cloak: '#a3505a',
  cloakIn: '#7d3a45',
  dress: '#f1e4d1',
  boots: '#5a4340',
  clasp: '#e9cf9e',
  style: 'long',
  height: 1,
};

export const LUCIEN: Look = {
  skin: '#efd2c0',
  hair: '#2b2128',
  hairHi: '#3a2c33',
  cloak: '#2f2a3a',
  cloakIn: '#47405a',
  dress: '#3d3646',
  boots: '#262027',
  clasp: '#e2c99a',
  style: 'curly',
  height: 1.12,
};

function useMats(look: Look) {
  return useMemo(() => {
    const m = (c: string, r = 0.95) => new THREE.MeshStandardMaterial({ color: c, roughness: r, transparent: true, opacity: 1 });
    return {
      skin: m(look.skin, 0.8),
      hair: m(look.hair, 0.85),
      hairHi: m(look.hairHi, 0.85),
      cloak: m(look.cloak),
      cloakIn: m(look.cloakIn),
      dress: m(look.dress),
      boots: m(look.boots),
      clasp: m(look.clasp, 0.5),
      eye: m('#2a2230', 0.4),
      blush: new THREE.MeshBasicMaterial({ color: '#f0a6a8', transparent: true, opacity: 0.55 }),
      shine: new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9 }),
    };
  }, [look]);
}

/**
 * A miniature storybook character: big head, simple dot eyes, a cloak that
 * swings. Driven entirely by the `anim` object the parent updates.
 */
export function Chibi({ look, anim }: { look: Look; anim: Anim }) {
  const M = useMats(look);
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const cape = useRef<THREE.Mesh>(null);
  const blink = useRef(0);

  const cloakGeo = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.2, 0.42, 0.72, 20, 4, true, Math.PI * 0.18, Math.PI * 1.64);
    g.translate(0, -0.36, 0);
    return g;
  }, []);
  const skirtGeo = useMemo(() => {
    const pts = [
      [0.0, 0.0],
      [0.33, 0.0],
      [0.3, 0.12],
      [0.22, 0.5],
      [0.18, 0.62],
      [0.0, 0.62],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    return new THREE.LatheGeometry(pts, 20);
  }, []);
  const hairBits = useMemo(() => {
    const out: { p: [number, number, number]; s: number; hi: boolean }[] = [];
    if (look.style === 'curly') {
      // a crown of curls
      for (let i = 0; i < 26; i++) {
        const a = i * 2.399;
        const y = 0.12 + (i / 26) * 0.2;
        const r = 0.33 - (i / 26) * 0.16;
        out.push({ p: [Math.cos(a) * r, y, Math.sin(a) * r - 0.03], s: 0.12 + (i % 3) * 0.015, hi: i % 4 === 0 });
      }
      for (let i = 0; i < 8; i++) {
        const a = Math.PI * 0.2 + (i / 7) * Math.PI * 0.6;
        out.push({ p: [Math.cos(a) * 0.3 * (i % 2 ? 1 : -1), 0.05 - (i % 3) * 0.03, -Math.sin(a) * 0.26], s: 0.12, hi: false });
      }
      // a curl falling over the brow
      out.push({ p: [0.12, 0.22, 0.27], s: 0.1, hi: true });
      out.push({ p: [-0.05, 0.25, 0.28], s: 0.09, hi: false });
    } else {
      // long wavy hair down the back
      for (let i = 0; i < 14; i++) {
        const a = Math.PI * 0.15 + (i / 13) * Math.PI * 0.7;
        out.push({ p: [Math.cos(a) * 0.3, -0.12 - Math.sin(i * 1.3) * 0.02, -Math.sin(a) * 0.24], s: 0.13, hi: i % 3 === 0 });
      }
      for (let k = 0; k < 4; k++) {
        for (let i = 0; i < 6; i++) {
          const a = Math.PI * 0.2 + (i / 5) * Math.PI * 0.6;
          const wave = Math.sin(k * 1.4 + i) * 0.03;
          out.push({ p: [Math.cos(a) * (0.26 - k * 0.02) + wave, -0.3 - k * 0.13, -Math.sin(a) * (0.2 - k * 0.01) - 0.05], s: 0.12 - k * 0.006, hi: (i + k) % 3 === 0 });
        }
      }
      // side locks framing the face
      for (const sx of [-1, 1]) for (let k = 0; k < 4; k++) out.push({ p: [sx * (0.3 - k * 0.01), -0.05 - k * 0.12, 0.08 - k * 0.02], s: 0.1, hi: k % 2 === 0 });
    }
    return out;
  }, [look.style]);

  useFrame((_, dt) => {
    const a = anim;
    const sw = Math.sin(a.phase) * a.speed;
    const bob = Math.abs(Math.cos(a.phase)) * 0.05 * a.speed;
    const breathe = Math.sin(performance.now() / 700) * 0.008;
    if (body.current) {
      body.current.position.y = bob - a.sit * 0.36;
      body.current.rotation.z = sw * 0.04;
      body.current.rotation.x = a.speed * 0.08;
      body.current.scale.y = 1 + breathe;
    }
    if (legL.current) legL.current.rotation.x = sw * 0.7 - a.sit * 1.4;
    if (legR.current) legR.current.rotation.x = -sw * 0.7 - a.sit * 1.4;
    if (armL.current) armL.current.rotation.x = -sw * 0.6 - a.sit * 0.4;
    if (armR.current) armR.current.rotation.x = sw * 0.6 - a.sit * 0.4;
    if (head.current) {
      head.current.rotation.x = -a.lookUp * 0.5 + Math.sin(performance.now() / 1300) * 0.02;
      head.current.rotation.z = sw * -0.04;
    }
    if (cape.current) cape.current.rotation.x = -a.speed * 0.25 - Math.abs(sw) * 0.05;
    // blink every few seconds
    blink.current -= dt;
    const closing = blink.current < 0.12 && blink.current > 0;
    if (blink.current < 0) blink.current = 2.5 + Math.random() * 3;
    if (head.current) {
      const eyes = head.current.getObjectByName('eyes');
      if (eyes) eyes.scale.y = closing ? 0.15 : 1;
    }
    const op = 1 - a.fade;
    for (const k of Object.keys(M) as (keyof typeof M)[]) {
      const mm = M[k];
      mm.opacity = k === 'blush' ? 0.55 * op : op;
      mm.depthWrite = op > 0.98;
    }
    if (root.current) root.current.visible = op > 0.01;
  });

  return (
    <group ref={root} scale={look.height}>
      <group ref={body}>
        {/* legs */}
        {[
          [legL, -0.1],
          [legR, 0.1],
        ].map(([ref, x], i) => (
          <group key={i} ref={ref as React.RefObject<THREE.Group>} position={[x as number, 0.34, 0]}>
            <mesh position={[0, -0.16, 0]} material={M.boots} castShadow raycast={nr}>
              <capsuleGeometry args={[0.065, 0.2, 4, 8]} />
            </mesh>
            <mesh position={[0, -0.3, 0.04]} scale={[1, 0.7, 1.4]} material={M.boots} raycast={nr}>
              <sphereGeometry args={[0.075, 10, 8]} />
            </mesh>
          </group>
        ))}
        {/* dress / tunic */}
        <mesh geometry={skirtGeo} position={[0, 0.2, 0]} material={M.dress} castShadow raycast={nr} />
        {/* cloak */}
        <mesh ref={cape} geometry={cloakGeo} position={[0, 0.88, -0.02]} material={M.cloak} castShadow raycast={nr} />
        <mesh position={[0, 0.84, -0.01]} material={M.cloakIn} raycast={nr}>
          <torusGeometry args={[0.2, 0.07, 8, 18]} />
        </mesh>
        <mesh position={[0, 0.8, 0.2]} material={M.clasp} raycast={nr}>
          <octahedronGeometry args={[0.045, 0]} />
        </mesh>
        {/* arms */}
        {[
          [armL, -0.25],
          [armR, 0.25],
        ].map(([ref, x], i) => (
          <group key={i} ref={ref as React.RefObject<THREE.Group>} position={[x as number, 0.78, 0.02]}>
            <mesh position={[0, -0.16, 0]} rotation-z={(x as number) > 0 ? -0.18 : 0.18} material={M.cloak} castShadow raycast={nr}>
              <capsuleGeometry args={[0.07, 0.2, 4, 8]} />
            </mesh>
            <mesh position={[(x as number) > 0 ? 0.04 : -0.04, -0.33, 0]} material={M.skin} raycast={nr}>
              <sphereGeometry args={[0.06, 10, 8]} />
            </mesh>
          </group>
        ))}
        {/* head */}
        <group ref={head} position={[0, 1.18, 0]}>
          <mesh material={M.skin} castShadow raycast={nr}>
            <sphereGeometry args={[0.34, 24, 18]} />
          </mesh>
          {/* hair cap */}
          <mesh position={[0, 0.06, -0.03]} rotation-x={-0.35} scale={[1.07, 1.02, 1.07]} material={M.hair} castShadow raycast={nr}>
            <sphereGeometry args={[0.34, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.42]} />
          </mesh>
          <mesh position={[0, 0.02, -0.06]} scale={[1.06, 1.0, 1.0]} material={M.hair} raycast={nr}>
            <sphereGeometry args={[0.34, 20, 14, Math.PI * 0.75, Math.PI * 1.5]} />
          </mesh>
          {hairBits.map((b, i) => (
            <mesh key={i} position={b.p} material={b.hi ? M.hairHi : M.hair} castShadow raycast={nr}>
              <sphereGeometry args={[b.s, 10, 8]} />
            </mesh>
          ))}
          {/* face */}
          <group name="eyes">
            {[-0.11, 0.11].map((x) => (
              <group key={x} position={[x, -0.03, 0.31]}>
                <mesh scale={[1, 1.35, 0.6]} material={M.eye} raycast={nr}>
                  <sphereGeometry args={[0.04, 12, 10]} />
                </mesh>
                <mesh position={[0.012, 0.022, 0.025]} material={M.shine} raycast={nr}>
                  <sphereGeometry args={[0.011, 6, 6]} />
                </mesh>
              </group>
            ))}
          </group>
          {[-0.19, 0.19].map((x) => (
            <mesh key={x} position={[x, -0.11, 0.27]} rotation-y={x * 2.2} material={M.blush} raycast={nr}>
              <circleGeometry args={[0.05, 14]} />
            </mesh>
          ))}
          {look.style === 'curly' &&
            [-0.11, 0.11].map((x) => (
              <mesh key={`b${x}`} position={[x, 0.06, 0.315]} rotation-z={x > 0 ? -0.15 : 0.15} material={M.hair} raycast={nr}>
                <boxGeometry args={[0.08, 0.016, 0.01]} />
              </mesh>
            ))}
        </group>
      </group>
    </group>
  );
}
