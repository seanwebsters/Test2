import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import { W, PAL, mat, clockTexture, signTexture, bannerTexture, restoreProgress, ease } from './common';
import { LAMPS, PLACES } from '../game/layout';

const nr = () => null;

function gableRoof(w: number, d: number, h: number) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2 - 0.25, 0);
  s.lineTo(0, h);
  s.lineTo(w / 2 + 0.25, 0);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: d + 0.4, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 2 });
  g.translate(0, 0, -(d + 0.4) / 2);
  return g;
}

function archShape(w: number, h: number) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(-w / 2, h - w / 2);
  s.absarc(0, h - w / 2, w / 2, Math.PI, 0, true);
  s.lineTo(w / 2, 0);
  s.closePath();
  return new THREE.ShapeGeometry(s, 12);
}

/** a glowing window that lights up as the city warms */
function Window({ p, w = 0.55, h = 0.8, arch = true, lit = 0.5, rot = 0 }: { p: [number, number, number]; w?: number; h?: number; arch?: boolean; lit?: number; rot?: number }) {
  const geo = useMemo(() => (arch ? archShape(w, h) : new THREE.PlaneGeometry(w, h).translate(0, h / 2, 0)), [w, h, arch]);
  const frame = useMemo(() => (arch ? archShape(w + 0.16, h + 0.1) : new THREE.PlaneGeometry(w + 0.16, h + 0.16).translate(0, h / 2, 0)), [w, h, arch]);
  const m = useMemo(() => new THREE.MeshStandardMaterial({ color: '#4d4a6e', emissive: '#ffbf7a', emissiveIntensity: 0, roughness: 0.6 }), []);
  useFrame(() => {
    const k = (0.55 + 0.45 * THREE.MathUtils.clamp(W.flow / 4, 0, 1)) * lit;
    m.emissiveIntensity = 0.25 + k * 1.2;
    m.color.setRGB(0.55 + k * 0.4, 0.42 + k * 0.4, 0.4 + k * 0.1);
  });
  return (
    <group position={p} rotation-y={rot}>
      <mesh geometry={frame} position={[0, -0.05, 0.005]} raycast={nr}>
        <meshStandardMaterial color="#f4ebdc" roughness={1} />
      </mesh>
      <mesh geometry={geo} material={m} position={[0, 0, 0.012]} raycast={nr} />
    </group>
  );
}

export function ClockTower() {
  const [x, z] = PLACES.tower;
  const minute = useRef<THREE.Mesh>(null);
  const hour = useRef<THREE.Mesh>(null);
  const bell = useRef<THREE.Group>(null);
  const faceMat = useMemo(() => new THREE.MeshStandardMaterial({ map: clockTexture(), roughness: 0.8, emissive: '#ffe1b0', emissiveMap: clockTexture(), emissiveIntensity: 0 }), []);
  const roofGeo = useMemo(() => new THREE.ConeGeometry(3.5, 6.2, 4, 1).rotateY(Math.PI / 4), []);
  const doorGeo = useMemo(() => archShape(1.6, 2.6), []);
  const clockStart = useRef(0);
  useFrame((_, dt) => {
    const running = restoreProgress('clock', 1500);
    if (running > 0) clockStart.current += dt * (0.2 + running * 0.8);
    // frozen at 11:15 — the hour the city stopped
    const mins = 15 + clockStart.current * 2; // 2 "minutes" a second so you can see it move
    if (minute.current) minute.current.rotation.z = -(mins / 60) * Math.PI * 2;
    if (hour.current) hour.current.rotation.z = -((11 + mins / 60) / 12) * Math.PI * 2;
    faceMat.emissiveIntensity = 0.05 + running * 0.25 + Math.min(1, Math.max(0, W.flow - 3)) * 0.2;
    const b = restoreProgress('bell', 2000);
    if (bell.current) bell.current.rotation.x = b > 0 ? Math.sin(W.t * 2.2) * 0.35 * (b < 1 ? b : 0.25 + 0.75 * Math.max(0, Math.sin(W.t * 0.25))) : 0;
  });
  const stone = mat('#e8dccc');
  const trim = mat('#d2c3b6');
  const dark = mat(PAL.plum);
  return (
    <group position={[x, 0, z]}>
      <RoundedBox args={[6.4, 0.7, 6.4]} radius={0.12} position={[0, 0.35, 0]} castShadow receiveShadow material={trim} raycast={nr} />
      {/* steps */}
      {[0, 1, 2].map((i) => (
        <RoundedBox key={i} args={[3.6 - i * 0.3, 0.22, 0.6]} radius={0.06} position={[0, 0.11 + i * 0.22, 3.35 - i * 0.35]} castShadow receiveShadow material={trim} raycast={nr} />
      ))}
      <RoundedBox args={[5, 9.2, 5]} radius={0.18} position={[0, 0.7 + 4.6, 0]} castShadow receiveShadow material={stone} raycast={nr} />
      {/* corner buttresses */}
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <RoundedBox key={`${sx}${sz}`} args={[0.7, 9.6, 0.7]} radius={0.12} position={[sx * 2.5, 0.7 + 4.8, sz * 2.5]} castShadow material={trim} raycast={nr} />
        )),
      )}
      <mesh geometry={doorGeo} position={[0, 0.7, 2.52]} material={dark} raycast={nr} />
      <Window p={[0, 4.4, 2.52]} w={0.7} h={1.5} lit={0.6} />
      <Window p={[0, 7.0, 2.52]} w={0.6} h={1.1} lit={0.6} />
      <Window p={[2.52, 5.4, 0]} w={0.6} h={1.3} lit={0.5} rot={Math.PI / 2} />
      <Window p={[-2.52, 5.4, 0]} w={0.6} h={1.3} lit={0.5} rot={-Math.PI / 2} />
      {/* cornice */}
      <RoundedBox args={[5.8, 0.45, 5.8]} radius={0.1} position={[0, 10.1, 0]} castShadow material={trim} raycast={nr} />
      {/* clock stage */}
      <RoundedBox args={[4.6, 3.8, 4.6]} radius={0.15} position={[0, 12.2, 0]} castShadow material={stone} raycast={nr} />
      {[0, Math.PI / 2, -Math.PI / 2, Math.PI].map((r, i) => (
        <group key={i} rotation-y={r}>
          <group position={[0, 12.2, 2.32]}>
            <mesh material={faceMat} raycast={nr}>
              <circleGeometry args={[1.55, 48]} />
            </mesh>
            <mesh position={[0, 0, -0.02]} raycast={nr}>
              <torusGeometry args={[1.6, 0.13, 10, 48]} />
              <meshStandardMaterial color={PAL.roofPlum} roughness={0.9} />
            </mesh>
            {i === 0 && (
              <>
                <mesh ref={hour} position={[0, 0, 0.04]} raycast={nr}>
                  <boxGeometry args={[0.1, 0.8, 0.04]} />
                  <meshStandardMaterial color={PAL.ink} />
                </mesh>
                <mesh ref={minute} position={[0, 0, 0.07]} raycast={nr}>
                  <boxGeometry args={[0.06, 1.2, 0.04]} />
                  <meshStandardMaterial color={PAL.ink} />
                </mesh>
              </>
            )}
            {i !== 0 && (
              <>
                <mesh position={[0.18, 0.18, 0.04]} rotation-z={-Math.PI / 4} raycast={nr}>
                  <boxGeometry args={[0.08, 0.7, 0.04]} />
                  <meshStandardMaterial color={PAL.ink} />
                </mesh>
                <mesh position={[0.28, 0, 0.06]} rotation-z={-Math.PI / 2} raycast={nr}>
                  <boxGeometry args={[0.05, 1.1, 0.04]} />
                  <meshStandardMaterial color={PAL.ink} />
                </mesh>
              </>
            )}
            <mesh position={[0, 0, 0.1]} raycast={nr}>
              <sphereGeometry args={[0.09, 10, 8]} />
              <meshStandardMaterial color={PAL.ink} />
            </mesh>
          </group>
        </group>
      ))}
      <RoundedBox args={[5.2, 0.35, 5.2]} radius={0.08} position={[0, 14.2, 0]} castShadow material={trim} raycast={nr} />
      {/* belfry: four pillars and a bell */}
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => <RoundedBox key={`b${sx}${sz}`} args={[0.55, 2.4, 0.55]} radius={0.1} position={[sx * 1.9, 15.6, sz * 1.9]} castShadow material={stone} raycast={nr} />),
      )}
      <group ref={bell} position={[0, 16.4, 0]}>
        <mesh position={[0, -0.7, 0]} castShadow raycast={nr}>
          <cylinderGeometry args={[0.45, 0.85, 1.2, 16, 1, true]} />
          <meshStandardMaterial color="#9b8a7a" roughness={0.6} metalness={0.3} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, -0.05, 0]} raycast={nr}>
          <sphereGeometry args={[0.45, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#9b8a7a" roughness={0.6} metalness={0.3} />
        </mesh>
      </group>
      <RoundedBox args={[5.0, 0.4, 5.0]} radius={0.1} position={[0, 17.0, 0]} castShadow material={trim} raycast={nr} />
      <mesh geometry={roofGeo} position={[0, 20.25, 0]} castShadow raycast={nr}>
        <meshStandardMaterial color={PAL.midnight} roughness={0.9} flatShading />
      </mesh>
      {/* finial and crescent */}
      <mesh position={[0, 23.6, 0]} raycast={nr}>
        <cylinderGeometry args={[0.05, 0.05, 1, 6]} />
        <meshStandardMaterial color="#d9c49f" roughness={0.6} />
      </mesh>
      <mesh position={[0, 24.4, 0]} rotation-z={0.5} raycast={nr}>
        <torusGeometry args={[0.38, 0.09, 8, 24, Math.PI * 1.25]} />
        <meshStandardMaterial color="#efdcb6" emissive="#f3d7a1" emissiveIntensity={0.4} roughness={0.6} />
      </mesh>
      {/* ivy climbing the front */}
      <Ivy />
      {/* banners either side of the door */}
      {[-1.6, 1.6].map((bx) => (
        <Banner key={bx} p={[bx, 5.2, 2.6]} />
      ))}
    </group>
  );
}

function Ivy() {
  const leaves = useMemo(() => {
    const out: [number, number, number, number][] = [];
    let seed = 5;
    const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 70; i++) {
      const side = r() < 0.5 ? -1 : 1;
      const y = 0.8 + Math.pow(r(), 1.6) * 7.5;
      out.push([side * (1.9 + r() * 0.9), y, 2.55 + r() * 0.12, 0.16 + r() * 0.16]);
    }
    return out;
  }, []);
  return (
    <group>
      {leaves.map(([x, y, z, s], i) => (
        <mesh key={i} position={[x, y, z]} scale={[s, s * 0.8, s * 0.5]} raycast={nr}>
          <sphereGeometry args={[1, 7, 5]} />
          <meshStandardMaterial color={i % 3 ? PAL.hedge : PAL.sageDark} roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

/** cloth banner: hangs still while the city is frozen, ripples once it breathes */
export function Banner({ p, rot = 0, h = 2.2 }: { p: [number, number, number]; rot?: number; h?: number }) {
  const geo = useMemo(() => new THREE.PlaneGeometry(0.9, h, 6, 10).translate(0, -h / 2, 0), [h]);
  const base = useMemo(() => Float32Array.from(geo.attributes.position.array as Float32Array), [geo]);
  const m = useMemo(() => new THREE.MeshStandardMaterial({ map: bannerTexture(), roughness: 1, side: THREE.DoubleSide }), []);
  const phase = useMemo(() => Math.random() * 10, []);
  useFrame(() => {
    const k = Math.min(1, W.flow);
    if (k <= 0.001) return;
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const y = base[i * 3 + 1];
      const d = -y / h;
      pos.setZ(i, Math.sin(W.alive * 2.4 + d * 4 + phase + base[i * 3] * 2) * 0.12 * d * k);
    }
    pos.needsUpdate = true;
  });
  return (
    <group position={p} rotation-y={rot}>
      <mesh position={[0, 0.05, 0]} rotation-z={Math.PI / 2} raycast={nr}>
        <cylinderGeometry args={[0.04, 0.04, 1.1, 6]} />
        <meshStandardMaterial color="#6b5049" />
      </mesh>
      <mesh geometry={geo} material={m} castShadow raycast={nr} />
    </group>
  );
}

interface HouseProps {
  p: [number, number, number];
  rot?: number;
  w: number;
  d: number;
  h: number;
  wall: string;
  roof: string;
  timber?: boolean;
  floors?: number;
  chimney?: boolean;
  boxes?: boolean;
}

export function House({ p, rot = 0, w, d, h, wall, roof, timber, floors = 2, chimney = true, boxes = true }: HouseProps) {
  const roofGeo = useMemo(() => gableRoof(w, d, Math.min(w * 0.75, 3)), [w, d]);
  const doorGeo = useMemo(() => archShape(0.9, 1.6), []);
  const wallM = mat(wall);
  const beam = mat(PAL.timber);
  const fh = h / floors;
  return (
    <group position={p} rotation-y={rot}>
      <RoundedBox args={[w, h, d]} radius={0.14} position={[0, h / 2, 0]} castShadow receiveShadow material={wallM} raycast={nr} />
      <RoundedBox args={[w + 0.15, 0.3, d + 0.15]} radius={0.08} position={[0, 0.15, 0]} material={mat('#c9bab4')} raycast={nr} />
      {timber &&
        Array.from({ length: floors - 1 }, (_, i) => (
          <mesh key={i} position={[0, fh * (i + 1), d / 2 + 0.03]} raycast={nr} material={beam}>
            <boxGeometry args={[w + 0.02, 0.14, 0.06]} />
          </mesh>
        ))}
      {timber &&
        [-w / 2 + 0.1, w / 2 - 0.1].map((bx) => (
          <mesh key={bx} position={[bx, h / 2 + fh / 2, d / 2 + 0.03]} raycast={nr} material={beam}>
            <boxGeometry args={[0.14, h - fh, 0.06]} />
          </mesh>
        ))}
      <mesh geometry={roofGeo} position={[0, h, 0]} castShadow raycast={nr}>
        <meshStandardMaterial color={roof} roughness={0.95} />
      </mesh>
      {chimney && (
        <RoundedBox args={[0.6, 1.6, 0.6]} radius={0.08} position={[w * 0.28, h + 1.3, -d * 0.15]} castShadow material={mat(PAL.terracotta)} raycast={nr} />
      )}
      <mesh geometry={doorGeo} position={[w * -0.22, 0.28, d / 2 + 0.02]} material={mat(PAL.plum)} raycast={nr} />
      {Array.from({ length: floors }, (_, f) =>
        [-1, 1].map((sx) =>
          f === 0 && sx === -1 ? null : (
            <group key={`${f}${sx}`}>
              <Window p={[sx * w * 0.24, f * fh + fh * 0.32 + 0.15, d / 2 + 0.01]} w={0.55} h={0.8} lit={(f + sx + 3) % 3 ? 0.8 : 0.3} />
              {boxes && f > 0 && <WindowBox p={[sx * w * 0.24, f * fh + fh * 0.32 + 0.12, d / 2 + 0.16]} />}
            </group>
          ),
        ),
      )}
    </group>
  );
}

function WindowBox({ p }: { p: [number, number, number] }) {
  return (
    <group position={p}>
      <RoundedBox args={[0.8, 0.18, 0.24]} radius={0.05} material={mat(PAL.terracotta)} raycast={nr} />
      {[-0.27, -0.09, 0.09, 0.27].map((x, i) => (
        <mesh key={x} position={[x, 0.15, 0]} raycast={nr}>
          <sphereGeometry args={[0.1, 8, 6]} />
          <meshStandardMaterial color={i % 2 ? PAL.rose : PAL.lilac} roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

export function Bookshop() {
  const [x, z] = PLACES.bookshop;
  const sign = useMemo(() => signTexture('Hollow & Quill'), []);
  const shop = useRef<THREE.MeshStandardMaterial>(null);
  const awning = useRef<THREE.Group>(null);
  const smoke = useRef<THREE.Group>(null);
  const lamp = useRef<THREE.PointLight>(null);
  const roofGeo = useMemo(() => gableRoof(6.2, 5.2, 3.4), []);
  const doorGeo = useMemo(() => archShape(1.1, 2.1), []);
  useFrame(() => {
    const p = ease(restoreProgress('bookshop', 3500));
    if (shop.current) {
      shop.current.emissiveIntensity = 0.08 + p * 1.25;
    }
    if (awning.current) awning.current.scale.set(1, 1, 0.05 + 0.95 * p);
    if (lamp.current) lamp.current.intensity = p * 4;
    if (smoke.current) {
      smoke.current.visible = p > 0.5;
      smoke.current.children.forEach((c, i) => {
        const t = (W.t * 0.25 + i / 4) % 1;
        c.position.set(Math.sin(t * 6 + i) * 0.2, t * 2.4, 0);
        c.scale.setScalar(0.25 + t * 0.5);
        ((c as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = 0.5 * (1 - t);
      });
    }
  });
  const sage = mat('#93a891');
  const upper = mat('#f0e4d3');
  const beam = mat(PAL.timber);
  return (
    // local +z faces the square (west-south-west)
    <group position={[x, 0, z]} rotation-y={-1.12}>
      <RoundedBox args={[6.2, 0.3, 5.4]} radius={0.08} position={[0, 0.15, 0]} material={mat('#c9bab4')} raycast={nr} />
      <RoundedBox args={[6.0, 2.9, 5.0]} radius={0.14} position={[0, 1.45, 0]} castShadow receiveShadow material={sage} raycast={nr} />
      <RoundedBox args={[6.3, 2.6, 5.3]} radius={0.14} position={[0, 4.15, 0]} castShadow receiveShadow material={upper} raycast={nr} />
      {/* timbers */}
      {[-2.9, -1, 1, 2.9].map((bx) => (
        <mesh key={bx} position={[bx, 4.15, 2.67]} material={beam} raycast={nr}>
          <boxGeometry args={[0.16, 2.6, 0.06]} />
        </mesh>
      ))}
      <mesh position={[0, 2.95, 2.67]} material={beam} raycast={nr}>
        <boxGeometry args={[6.3, 0.18, 0.08]} />
      </mesh>
      <mesh geometry={roofGeo} position={[0, 5.45, 0]} rotation-y={Math.PI / 2} castShadow raycast={nr}>
        <meshStandardMaterial color={PAL.roofBlue} roughness={0.95} />
      </mesh>
      {/* dormer */}
      <group position={[0, 6.2, 1.6]}>
        <RoundedBox args={[1.5, 1.3, 1.3]} radius={0.08} castShadow material={upper} raycast={nr} />
        <mesh position={[0, 0.65, 0]} castShadow raycast={nr} geometry={useMemo(() => gableRoof(1.5, 1.3, 0.8), [])}>
          <meshStandardMaterial color={PAL.roofBlue} roughness={0.95} />
        </mesh>
        <Window p={[0, -0.45, 0.66]} w={0.55} h={0.8} lit={0.9} />
      </group>
      <RoundedBox args={[0.7, 2.2, 0.7]} radius={0.08} position={[-2.0, 7.2, -1.0]} castShadow material={mat(PAL.terracotta)} raycast={nr} />
      <group ref={smoke} position={[-2.0, 8.4, -1.0]}>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} raycast={nr}>
            <sphereGeometry args={[1, 10, 8]} />
            <meshStandardMaterial color="#efe6ee" transparent opacity={0.4} roughness={1} depthWrite={false} />
          </mesh>
        ))}
      </group>
      {/* bay window full of books */}
      <group position={[1.2, 0.5, 2.55]}>
        <RoundedBox args={[2.8, 0.4, 0.7]} radius={0.08} position={[0, 0.0, 0.2]} material={mat('#7f9480')} raycast={nr} />
        <mesh position={[0, 1.05, 0.5]} raycast={nr}>
          <boxGeometry args={[2.5, 1.6, 0.05]} />
          <meshStandardMaterial ref={shop} color="#5a5272" emissive="#ffc67e" emissiveIntensity={0.08} roughness={0.5} />
        </mesh>
        {/* book spines behind the glass */}
        {Array.from({ length: 14 }, (_, i) => (
          <mesh key={i} position={[-1.1 + i * 0.165, 0.55 + (i % 3) * 0.02, 0.42]} raycast={nr}>
            <boxGeometry args={[0.13, 0.42 + (i % 4) * 0.06, 0.12]} />
            <meshStandardMaterial color={['#a3606b', '#5d6c8e', '#8a9a74', '#c49a6c', '#7c5a85'][i % 5]} roughness={1} />
          </mesh>
        ))}
        {[-1.25, 0, 1.25].map((mx) => (
          <mesh key={mx} position={[mx, 1.05, 0.55]} material={upper} raycast={nr}>
            <boxGeometry args={[0.08, 1.7, 0.08]} />
          </mesh>
        ))}
        <mesh position={[0, 1.9, 0.55]} material={upper} raycast={nr}>
          <boxGeometry args={[2.7, 0.1, 0.1]} />
        </mesh>
        <pointLight ref={lamp} position={[0, 1.2, 1.2]} color="#ffbf80" intensity={0} distance={6} decay={2} />
      </group>
      {/* door */}
      <mesh geometry={doorGeo} position={[-1.6, 0.3, 2.52]} raycast={nr}>
        <meshStandardMaterial color="#6a4c63" roughness={0.9} />
      </mesh>
      <mesh position={[-1.6, 2.6, 2.6]} raycast={nr}>
        <planeGeometry args={[1.4, 0.35]} />
        <meshStandardMaterial map={sign} roughness={1} />
      </mesh>
      {/* sign board over the window */}
      <mesh position={[1.2, 2.65, 2.56]} raycast={nr}>
        <planeGeometry args={[2.6, 0.62]} />
        <meshStandardMaterial map={sign} roughness={1} />
      </mesh>
      {/* awning unfurls on restoration */}
      <group ref={awning} position={[1.2, 2.3, 2.6]}>
        {Array.from({ length: 7 }, (_, i) => (
          <mesh key={i} position={[-1.2 + i * 0.4, -0.18, 0.45]} rotation-x={0.45} castShadow raycast={nr}>
            <boxGeometry args={[0.4, 0.05, 1.0]} />
            <meshStandardMaterial color={i % 2 ? '#f3e8d8' : '#c98a93'} roughness={1} />
          </mesh>
        ))}
      </group>
      <Window p={[-1.8, 3.4, 2.68]} w={0.6} h={0.9} lit={0.8} />
      <Window p={[1.6, 3.4, 2.68]} w={0.6} h={0.9} lit={0.8} />
      {/* book stacks and a crate outside */}
      <group position={[-0.25, 0.3, 3.1]}>
        {[0, 1, 2, 3].map((i) => (
          <RoundedBox key={i} args={[0.55 - i * 0.04, 0.12, 0.4]} radius={0.03} position={[0, 0.06 + i * 0.12, 0]} rotation-y={i * 0.3} castShadow material={mat(['#a3606b', '#5d6c8e', '#d8c3a5', '#7c5a85'][i])} raycast={nr} />
        ))}
      </group>
    </group>
  );
}

export function Lamps() {
  return (
    <>
      {LAMPS.map(([x, z], i) => (
        <Lamp key={i} p={[x, 0, z]} />
      ))}
    </>
  );
}

function Lamp({ p }: { p: [number, number, number] }) {
  const flame = useRef<THREE.MeshStandardMaterial>(null);
  const halo = useRef<THREE.Mesh>(null);
  const seed = useMemo(() => Math.random() * 100, []);
  useFrame(() => {
    const alive = THREE.MathUtils.clamp(W.flow - 1, 0, 1);
    const lit = 0.7 + alive * 0.3;
    const fl = 1 + Math.sin(W.t * 9 + seed) * 0.08 * alive + Math.sin(W.t * 13.7 + seed) * 0.05 * alive;
    if (flame.current) flame.current.emissiveIntensity = (1.4 + alive * 0.8) * fl * lit;
    if (halo.current) {
      halo.current.scale.setScalar(0.8 + alive * 0.5 * fl);
      ((halo.current.material as THREE.MeshBasicMaterial).opacity = 0.18 + alive * 0.22);
    }
  });
  const iron = mat('#4a4256');
  return (
    <group position={p}>
      <mesh position={[0, 0.12, 0]} material={iron} castShadow raycast={nr}>
        <cylinderGeometry args={[0.18, 0.24, 0.24, 8]} />
      </mesh>
      <mesh position={[0, 1.4, 0]} material={iron} castShadow raycast={nr}>
        <cylinderGeometry args={[0.05, 0.07, 2.6, 6]} />
      </mesh>
      <mesh position={[0, 2.85, 0]} raycast={nr}>
        <cylinderGeometry args={[0.16, 0.12, 0.42, 6]} />
        <meshStandardMaterial ref={flame} color="#ffe3b3" emissive="#ffb766" emissiveIntensity={1} roughness={0.5} />
      </mesh>
      <mesh position={[0, 3.12, 0]} material={iron} castShadow raycast={nr}>
        <coneGeometry args={[0.24, 0.24, 6]} />
      </mesh>
      <mesh ref={halo} position={[0, 2.85, 0]} raycast={nr}>
        <sphereGeometry args={[0.55, 12, 10]} />
        <meshBasicMaterial color="#ffd49a" transparent opacity={0.2} depthWrite={false} />
      </mesh>
    </group>
  );
}

/** benches, planters and banners round the square */
export function SquareDressing() {
  const wood = mat('#8a6a5a');
  const iron = mat('#4a4256');
  return (
    <group>
      {[
        [5.6, 6.6, -0.7],
        [-5.6, 6.6, 0.7],
      ].map(([bx, bz, r], i) => (
        <group key={i} position={[bx, 0, bz]} rotation-y={r + Math.PI}>
          <RoundedBox args={[1.8, 0.1, 0.5]} radius={0.04} position={[0, 0.48, 0]} castShadow material={wood} raycast={nr} />
          <RoundedBox args={[1.8, 0.45, 0.08]} radius={0.04} position={[0, 0.8, -0.22]} castShadow material={wood} raycast={nr} />
          {[-0.75, 0.75].map((lx) => (
            <mesh key={lx} position={[lx, 0.24, 0]} material={iron} raycast={nr}>
              <boxGeometry args={[0.08, 0.48, 0.45]} />
            </mesh>
          ))}
        </group>
      ))}
      {[
        [7.2, -7.4],
        [-7.2, -7.4],
        [8.6, 4.2],
        [-8.6, 4.4],
      ].map(([px, pz], i) => (
        <group key={i} position={[px, 0, pz]}>
          <mesh position={[0, 0.35, 0]} castShadow material={mat(PAL.terracotta)} raycast={nr}>
            <cylinderGeometry args={[0.55, 0.42, 0.7, 12]} />
          </mesh>
          {[0, 1, 2, 3, 4].map((k) => (
            <mesh key={k} position={[Math.cos(k * 1.3) * 0.25, 0.85 + (k % 2) * 0.1, Math.sin(k * 1.3) * 0.25]} raycast={nr}>
              <sphereGeometry args={[0.26, 10, 8]} />
              <meshStandardMaterial color={k % 2 ? PAL.sageDark : PAL.hedge} roughness={1} />
            </mesh>
          ))}
          {[0, 1, 2].map((k) => (
            <mesh key={`f${k}`} position={[Math.cos(k * 2.1) * 0.3, 1.05, Math.sin(k * 2.1) * 0.3]} raycast={nr}>
              <sphereGeometry args={[0.1, 8, 6]} />
              <meshStandardMaterial color={k % 2 ? PAL.rose : '#f2dfe3'} roughness={1} />
            </mesh>
          ))}
        </group>
      ))}
      {/* banner poles at the square's mouth to the bridge */}
      {[-2.6, 2.6].map((bx) => (
        <group key={bx} position={[bx, 0, 6.8]}>
          <mesh position={[0, 1.9, 0]} material={iron} castShadow raycast={nr}>
            <cylinderGeometry args={[0.06, 0.08, 3.8, 6]} />
          </mesh>
          <Banner p={[0.5, 3.6, 0]} rot={0} h={1.8} />
        </group>
      ))}
    </group>
  );
}
