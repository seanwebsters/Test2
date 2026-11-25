import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import { W, cobbleTexture } from './common';
import { PLACES } from '../game/layout';

const FROZEN = {
  top: '#3a3470',
  mid: '#8f6fae',
  horizon: '#f0b3b4',
  sun: '#ffd0bc',
  sunI: 2.5,
  hemiSky: '#e6c6dc',
  hemiGround: '#7a7a62',
  hemiI: 1.05,
  fog: '#c9a2c2',
};
const ALIVE = {
  top: '#3d3a7c',
  mid: '#b07fb4',
  horizon: '#ffc7a6',
  sun: '#ffdcb6',
  sunI: 3.0,
  hemiSky: '#f6d4dc',
  hemiGround: '#7f875e',
  hemiI: 1.2,
  fog: '#e2b0bf',
};

const tmpA = new THREE.Color();
const tmpB = new THREE.Color();
function mix(a: string, b: string, t: number, out: THREE.Color) {
  return out.copy(tmpA.set(a)).lerp(tmpB.set(b), t);
}

export function Lighting() {
  const sun = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const { scene } = useThree();
  const target = useMemo(() => new THREE.Object3D(), []);
  const fog = useMemo(() => new THREE.Fog(FROZEN.fog, 45, 130), []);
  scene.fog = fog;

  useFrame(() => {
    const t = Math.min(1, W.flow / 5);
    const k = t * t * (3 - 2 * t);
    if (sun.current) {
      mix(FROZEN.sun, ALIVE.sun, k, sun.current.color);
      sun.current.intensity = FROZEN.sunI + (ALIVE.sunI - FROZEN.sunI) * k;
      // follow the player so the shadow map stays crisp near her
      const p = W.player;
      sun.current.position.set(p.x - 22, 18, p.z - 6);
      target.position.set(p.x, 0, p.z);
      target.updateMatrixWorld();
    }
    if (hemi.current) {
      mix(FROZEN.hemiSky, ALIVE.hemiSky, k, hemi.current.color);
      mix(FROZEN.hemiGround, ALIVE.hemiGround, k, hemi.current.groundColor);
      hemi.current.intensity = FROZEN.hemiI + (ALIVE.hemiI - FROZEN.hemiI) * k;
    }
    mix(FROZEN.fog, ALIVE.fog, k, fog.color);
  });

  return (
    <>
      <hemisphereLight ref={hemi} args={[FROZEN.hemiSky, FROZEN.hemiGround, 1]} />
      <primitive object={target} />
      <directionalLight
        ref={sun}
        castShadow
        target={target}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-camera-near={1}
        shadow-camera-far={80}
      />
    </>
  );
}

const skyVert = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * p;
  gl_Position.z = gl_Position.w;
}`;
const skyFrag = /* glsl */ `
uniform vec3 top; uniform vec3 mid; uniform vec3 horizon; uniform float stars; uniform float time;
varying vec3 vDir;
float hash(vec3 p){ p = fract(p*0.3183099+.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
void main() {
  float h = clamp(vDir.y, -0.2, 1.0);
  vec3 c = mix(horizon, mid, smoothstep(0.0, 0.28, h));
  c = mix(c, top, smoothstep(0.25, 0.85, h));
  // stars, brighter while the city is frozen
  vec3 q = floor(vDir * 220.0);
  float s = step(0.9975, hash(q)) * smoothstep(0.15, 0.6, h);
  float tw = 0.6 + 0.4 * sin(time * 1.5 + hash(q + 3.0) * 30.0);
  c += vec3(1.0, 0.95, 0.9) * s * stars * tw;
  gl_FragColor = vec4(c, 1.0);
}`;

export function Sky() {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      top: { value: new THREE.Color(FROZEN.top) },
      mid: { value: new THREE.Color(FROZEN.mid) },
      horizon: { value: new THREE.Color(FROZEN.horizon) },
      stars: { value: 1 },
      time: { value: 0 },
    }),
    [],
  );
  const group = useRef<THREE.Group>(null);
  useFrame(({ camera }) => {
    const t = Math.min(1, W.flow / 5);
    mix(FROZEN.top, ALIVE.top, t, uniforms.top.value);
    mix(FROZEN.mid, ALIVE.mid, t, uniforms.mid.value);
    mix(FROZEN.horizon, ALIVE.horizon, t, uniforms.horizon.value);
    uniforms.stars.value = 1 - t * 0.75;
    uniforms.time.value = W.t;
    group.current?.position.copy(camera.position);
  });
  return (
    <group ref={group}>
      <mesh renderOrder={-10} frustumCulled={false}>
        <sphereGeometry args={[300, 32, 16]} />
        <shaderMaterial ref={matRef} args={[{ vertexShader: skyVert, fragmentShader: skyFrag, uniforms, side: THREE.BackSide, depthWrite: false, fog: false }]} />
      </mesh>
      {/* crescent moon */}
      <group position={[-90, 120, -220]}>
        <mesh>
          <circleGeometry args={[11, 48]} />
          <meshBasicMaterial color="#fbf1dc" fog={false} />
        </mesh>
        <mesh position={[4.5, 3, 0.1]}>
          <circleGeometry args={[10, 48]} />
          <meshBasicMaterial color="#3c3f78" fog={false} transparent opacity={0.98} />
        </mesh>
      </group>
    </group>
  );
}

/** cloud bank: soft flattened puffs that drift once time moves */
export function Clouds() {
  const g = useRef<THREE.Group>(null);
  const puffs = useMemo(() => {
    const out: { p: [number, number, number]; s: number }[] = [];
    let seed = 11;
    const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let c = 0; c < 9; c++) {
      const a = (c / 9) * Math.PI * 2 + r();
      const cx = Math.cos(a) * 95;
      const cz = Math.sin(a) * 95 - 20;
      const cy = 22 + r() * 16;
      for (let i = 0; i < 6; i++) out.push({ p: [cx + (r() - 0.5) * 22, cy + r() * 5, cz + (r() - 0.5) * 10], s: 5 + r() * 7 });
    }
    return out;
  }, []);
  useFrame(() => {
    if (g.current) g.current.rotation.y = W.alive * 0.004;
  });
  return (
    <group ref={g}>
      {puffs.map((c, i) => (
        <mesh key={i} position={c.p} scale={[c.s * 1.6, c.s * 0.7, c.s]}>
          <sphereGeometry args={[1, 14, 10]} />
          <meshStandardMaterial color="#f4e6ef" roughness={1} emissive="#b9a4c8" emissiveIntensity={0.35} />
        </mesh>
      ))}
    </group>
  );
}

function grassGeometry() {
  const g = new THREE.PlaneGeometry(160, 160, 90, 90);
  g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const colors: number[] = [];
  const a = new THREE.Color('#9fb487');
  const b = new THREE.Color('#b7c495');
  const d = new THREE.Color('#86a079');
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const r = Math.hypot(x, z * 0.9);
    // gentle hills beyond the walkable district
    const hill = Math.max(0, r - 30) * 0.18 + Math.sin(x * 0.11) * Math.cos(z * 0.09) * Math.max(0, r - 28) * 0.06;
    pos.setY(i, hill);
    const n = Math.sin(x * 0.35 + Math.cos(z * 0.21) * 2) * 0.5 + 0.5;
    c.copy(a).lerp(b, n * 0.5).lerp(d, Math.max(0, Math.sin(z * 0.17 + x * 0.05)) * 0.35);
    colors.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.computeVertexNormals();
  return g;
}

export function Ground({ onTap }: { onTap: (e: THREE.Vector3, down: boolean) => void }) {
  const grass = useMemo(grassGeometry, []);
  const cob = useMemo(() => {
    const t = cobbleTexture().clone();
    t.needsUpdate = true;
    t.repeat.set(5, 5);
    return t;
  }, []);
  const pathTex = useMemo(() => {
    const t = cobbleTexture().clone();
    t.needsUpdate = true;
    t.repeat.set(1, 5);
    return t;
  }, []);
  const pathTexH = useMemo(() => {
    const t = cobbleTexture().clone();
    t.needsUpdate = true;
    t.repeat.set(3.4, 1);
    return t;
  }, []);
  const down = useRef(false);
  return (
    <group>
      <mesh
        geometry={grass}
        receiveShadow
        onPointerDown={(e) => {
          down.current = true;
          onTap(e.point, true);
        }}
        onPointerMove={(e) => down.current && onTap(e.point, false)}
        onPointerUp={() => (down.current = false)}
        onPointerLeave={() => (down.current = false)}
      >
        <meshStandardMaterial vertexColors roughness={1} />
      </mesh>
      {/* the square */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]} receiveShadow raycast={() => null}>
        <circleGeometry args={[9.4, 64]} />
        <meshStandardMaterial map={cob} roughness={0.95} polygonOffset polygonOffsetFactor={-1} />
      </mesh>
      {/* kerb around the square */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.03, 0]} receiveShadow raycast={() => null}>
        <ringGeometry args={[9.3, 9.75, 64]} />
        <meshStandardMaterial color="#c4b6b2" roughness={1} polygonOffset polygonOffsetFactor={-2} />
      </mesh>
      {/* north to the tower */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.025, -10.5]} receiveShadow raycast={() => null}>
        <planeGeometry args={[4.4, 4]} />
        <meshStandardMaterial map={pathTex} roughness={0.95} polygonOffset polygonOffsetFactor={-1} />
      </mesh>
      {/* south to the bridge */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.025, 8.2]} receiveShadow raycast={() => null}>
        <planeGeometry args={[3.6, 3.2]} />
        <meshStandardMaterial map={pathTex} roughness={0.95} polygonOffset polygonOffsetFactor={-1} />
      </mesh>
      {/* east to the bookshop, west to the garden */}
      <mesh rotation-x={-Math.PI / 2} position={[9.4, 0.025, -1.5]} receiveShadow raycast={() => null}>
        <planeGeometry args={[3.4, 3.4]} />
        <meshStandardMaterial map={pathTexH} roughness={0.95} polygonOffset polygonOffsetFactor={-1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[-8.6, 0.025, -1.5]} receiveShadow raycast={() => null}>
        <planeGeometry args={[2.6, 3.0]} />
        <meshStandardMaterial map={pathTexH} roughness={0.95} polygonOffset polygonOffsetFactor={-1} />
      </mesh>
      {/* stepping stones through the woods to the blossom tree */}
      {Array.from({ length: 9 }, (_, i) => {
        const z = 11.6 + i * 0.85;
        const x = (z - 10.5) * 0.35 + Math.sin(i * 1.7) * 0.35;
        return (
          <mesh key={i} position={[x, 0.04, z]} rotation-y={i} receiveShadow raycast={() => null}>
            <cylinderGeometry args={[0.38 + (i % 3) * 0.06, 0.42, 0.08, 9]} />
            <meshStandardMaterial color={i % 2 ? '#cfc2bd' : '#d8ccc3'} roughness={1} />
          </mesh>
        );
      })}
      <Canal />
      <Backdrop />
    </group>
  );
}

const waterVert = /* glsl */ `
uniform float time; uniform float flow;
varying vec2 vUv; varying vec3 vPos;
void main(){
  vUv = uv; vec3 p = position;
  p.z += sin(p.x * 1.3 + time * 1.6) * 0.03 * flow + cos(p.y * 1.7 + time * 1.2) * 0.02 * flow;
  vPos = (modelMatrix * vec4(p,1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;
const waterFrag = /* glsl */ `
uniform float time; uniform float flow; uniform vec3 deep; uniform vec3 shallow; uniform vec3 frozen;
varying vec2 vUv; varying vec3 vPos;
void main(){
  float r = sin(vPos.x * 2.1 + time * 1.3) * sin(vPos.z * 2.7 - time * 1.1);
  float glint = smoothstep(0.86, 1.0, r) * flow;
  float edge = smoothstep(0.0, 0.22, vUv.y) * smoothstep(1.0, 0.78, vUv.y);
  vec3 alive = mix(shallow, deep, edge) + glint * 0.35;
  // frozen: glassy, pale, with a faint fixed sheen
  float sheen = smoothstep(0.6, 1.0, sin(vPos.x * 0.7 + vPos.z * 0.5)) * 0.18;
  vec3 still = mix(frozen, frozen * 0.82, edge) + sheen;
  gl_FragColor = vec4(mix(still, alive, flow), 0.92);
}`;

export function waterMaterial(deep = '#7e9fc0', shallow = '#a9c8cf', frozen = '#c8c4e4') {
  return new THREE.ShaderMaterial({
    vertexShader: waterVert,
    fragmentShader: waterFrag,
    transparent: true,
    uniforms: {
      time: { value: 0 },
      flow: { value: 0 },
      deep: { value: new THREE.Color(deep) },
      shallow: { value: new THREE.Color(shallow) },
      frozen: { value: new THREE.Color(frozen) },
    },
  });
}

function Canal() {
  const water = useMemo(() => waterMaterial(), []);
  useFrame(() => {
    water.uniforms.time.value = W.alive;
    water.uniforms.flow.value = Math.min(1, W.flow);
  });
  const z = PLACES.canalZ;
  const half = PLACES.canalHalf;
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.25, z]} material={water} raycast={() => null}>
        <planeGeometry args={[70, half * 2, 60, 4]} />
      </mesh>
      {/* stone banks */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, -0.1, z + s * (half + 0.18)]} receiveShadow castShadow raycast={() => null}>
          <boxGeometry args={[70, 0.42, 0.42]} />
          <meshStandardMaterial color="#cbbdb7" roughness={1} />
        </mesh>
      ))}
      <mesh position={[0, -0.55, z]} raycast={() => null}>
        <boxGeometry args={[70, 0.3, half * 2.2]} />
        <meshStandardMaterial color="#6e7896" roughness={1} />
      </mesh>
      <Bridge />
      {/* paper boat */}
      <PaperBoat />
    </group>
  );
}

function PaperBoat() {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!ref.current) return;
    const x = -4.5 + ((W.alive * 0.25) % 30);
    ref.current.position.set(x > 20 ? x - 30 : x, -0.16 + Math.sin(W.alive * 2) * 0.02, PLACES.canalZ - 0.2);
    ref.current.rotation.z = Math.sin(W.alive * 1.6) * 0.06;
  });
  return (
    <group ref={ref} raycast={() => null}>
      <mesh rotation-y={Math.PI / 2} castShadow>
        <coneGeometry args={[0.22, 0.32, 4, 1]} />
        <meshStandardMaterial color="#f7efe2" roughness={1} flatShading />
      </mesh>
      <mesh position={[0, -0.08, 0]} scale={[1.6, 0.35, 0.7]}>
        <boxGeometry args={[0.3, 0.2, 0.3]} />
        <meshStandardMaterial color="#efe4d4" roughness={1} />
      </mesh>
    </group>
  );
}

function Bridge() {
  const z = PLACES.canalZ;
  const arch = useMemo(() => {
    const s = new THREE.Shape();
    const w = 2.1;
    s.moveTo(-w, -0.4);
    s.lineTo(-w, 0.1);
    s.quadraticCurveTo(0, 0.75, w, 0.1);
    s.lineTo(w, -0.4);
    s.lineTo(1.1, -0.4);
    s.quadraticCurveTo(0, 0.3, -1.1, -0.4);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 3.4, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 2, curveSegments: 16 });
    g.translate(0, 0, -1.7);
    g.rotateY(Math.PI / 2);
    return g;
  }, []);
  return (
    <group position={[0, 0, z]}>
      <mesh geometry={arch} castShadow receiveShadow raycast={() => null}>
        <meshStandardMaterial color="#d9ccc2" roughness={1} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 1.75, 0.5, 0]}>
          <RoundedBox args={[0.3, 0.5, 3.8]} radius={0.08} castShadow raycast={() => null}>
            <meshStandardMaterial color="#cfc0b8" roughness={1} />
          </RoundedBox>
          {[-1.7, 1.7].map((zz) => (
            <mesh key={zz} position={[0, 0.4, zz]} castShadow raycast={() => null}>
              <sphereGeometry args={[0.2, 12, 10]} />
              <meshStandardMaterial color="#d8cbc2" roughness={1} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/** Distant city on the hills: towers and terraces dissolving into the haze. */
function Backdrop() {
  const items = useMemo(() => {
    const out: { p: [number, number, number]; w: number; h: number; roof: string; wall: string; spire: boolean }[] = [];
    let seed = 21;
    const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const walls = ['#e7d8cf', '#dccbd3', '#e9ddd0', '#d7c9d8'];
    const roofs = ['#4a5585', '#5f5180', '#7a5876', '#3f4a78'];
    for (let i = 0; i < 46; i++) {
      const a = -Math.PI * 0.95 + r() * Math.PI * 0.9;
      const d = 46 + r() * 22;
      const x = Math.cos(a) * d;
      const z = Math.sin(a) * d * 0.8 - 6;
      const base = Math.max(0, Math.hypot(x, z * 0.9) - 30) * 0.18;
      out.push({ p: [x, base, z], w: 2 + r() * 3, h: 3 + r() * 6 + (r() < 0.15 ? 8 : 0), roof: roofs[i % 4], wall: walls[i % 4], spire: r() < 0.35 });
    }
    return out;
  }, []);
  return (
    <group>
      {items.map((b, i) => (
        <group key={i} position={b.p}>
          <mesh position={[0, b.h / 2, 0]}>
            <boxGeometry args={[b.w, b.h, b.w]} />
            <meshStandardMaterial color={b.wall} roughness={1} />
          </mesh>
          <mesh position={[0, b.h + (b.spire ? 2.2 : 1), 0]} rotation-y={Math.PI / 4}>
            <coneGeometry args={[b.w * 0.78, b.spire ? 4.4 : 2, 4]} />
            <meshStandardMaterial color={b.roof} roughness={1} flatShading />
          </mesh>
          <mesh position={[0, b.h * 0.62, b.w / 2 + 0.01]}>
            <planeGeometry args={[b.w * 0.3, b.w * 0.4]} />
            <meshStandardMaterial color="#ffd9a0" emissive="#ffb870" emissiveIntensity={0.5} roughness={1} />
          </mesh>
        </group>
      ))}
      <Waterfall />
    </group>
  );
}

function Waterfall() {
  const m = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        uniforms: { time: { value: 0 }, flow: { value: 0 } },
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
        fragmentShader: `uniform float time; uniform float flow; varying vec2 vUv;
          void main(){
            float s = sin(vUv.x*40.0)*0.5+0.5;
            float stripes = smoothstep(0.4,1.0, sin((vUv.y*14.0 + time*2.4) + s*3.0));
            vec3 c = mix(vec3(0.82,0.86,0.96), vec3(0.97,0.98,1.0), stripes*0.7);
            float a = smoothstep(0.0,0.12,vUv.x)*smoothstep(1.0,0.88,vUv.x);
            gl_FragColor = vec4(c, a*0.9);
          }`,
      }),
    [],
  );
  useFrame(() => {
    m.uniforms.time.value = W.alive;
  });
  return (
    <group position={[26, 0, -44]}>
      <mesh position={[0, 7, 0]}>
        <boxGeometry args={[12, 14, 6]} />
        <meshStandardMaterial color="#8a86a8" roughness={1} />
      </mesh>
      <mesh position={[0, 6.5, 3.05]} material={m}>
        <planeGeometry args={[3, 13]} />
      </mesh>
      <mesh position={[0, 14.6, 0]} rotation-y={Math.PI / 4}>
        <coneGeometry args={[2.4, 5, 4]} />
        <meshStandardMaterial color="#4a5585" roughness={1} flatShading />
      </mesh>
      <mesh position={[3.5, 15.5, -1]}>
        <boxGeometry args={[2.2, 3, 2.2]} />
        <meshStandardMaterial color="#e6d7d2" roughness={1} />
      </mesh>
    </group>
  );
}

