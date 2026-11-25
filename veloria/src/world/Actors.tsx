import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Chibi, HEROINE, LUCIEN, makeAnim } from './Characters';
import { W } from './common';
import { useGame } from '../game/store';
import { collide, GLIMMERS, PLACES, SPOTS, V2 } from '../game/layout';
import { STEP } from '../game/story';

const keys = new Set<string>();
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => keys.add(e.key.toLowerCase()));
  window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur', () => keys.clear());
}

const SPEED = 4.4;

function angleLerp(a: number, b: number, t: number) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

export function Player() {
  const g = useRef<THREE.Group>(null);
  const anim = useMemo(makeAnim, []);
  const vel = useRef(new THREE.Vector2());
  const saveT = useRef(0);
  const init = useRef(false);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const s = useGame.getState();
    const grp = g.current;
    if (!grp) return;
    if (!init.current || s.screen === 'title') {
      grp.position.set(s.player[0], 0, s.player[1]);
      init.current = true;
    }
    // a script can move her (waking, chapter two)
    const want = s.player;
    if (Math.hypot(want[0] - grp.position.x, want[1] - grp.position.z) > 6 && !s.dialogue) {
      grp.position.set(want[0], 0, want[1]);
    }
    const locked = !!s.dialogue || s.screen !== 'game' || s.book.open || s.tab !== 'explore' || s.vanish > 0 || !!s.focus || s.step < STEP.explore;
    let dir = new THREE.Vector2();
    if (!locked) {
      if (keys.has('w') || keys.has('arrowup')) dir.y -= 1;
      if (keys.has('s') || keys.has('arrowdown')) dir.y += 1;
      if (keys.has('a') || keys.has('arrowleft')) dir.x -= 1;
      if (keys.has('d') || keys.has('arrowright')) dir.x += 1;
      if (dir.lengthSq() > 0) {
        dir.normalize();
        if (s.walkTo) s.setWalkTo(null);
      } else if (s.walkTo) {
        const dx = s.walkTo[0] - grp.position.x;
        const dz = s.walkTo[1] - grp.position.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.25) s.setWalkTo(null);
        else dir = new THREE.Vector2(dx / d, dz / d).multiplyScalar(Math.min(1, d / 0.8));
      }
    } else if (s.walkTo) s.setWalkTo(null);

    vel.current.lerp(dir.multiplyScalar(SPEED), Math.min(1, dt * 9));
    const nx = grp.position.x + vel.current.x * dt;
    const nz = grp.position.z + vel.current.y * dt;
    const [cx, cz] = collide(nx, nz, 0.38);
    grp.position.x = cx;
    grp.position.z = cz;
    const sp = vel.current.length();
    anim.speed = THREE.MathUtils.lerp(anim.speed, Math.min(1, sp / SPEED), Math.min(1, dt * 10));
    anim.phase += dt * sp * 2.6;
    if (sp > 0.3) W.playerFacing = angleLerp(W.playerFacing, Math.atan2(vel.current.x, vel.current.y), Math.min(1, dt * 12));
    // face him while talking
    if (s.dialogue && s.step >= STEP.explore) {
      const a = Math.atan2(W.him.x - grp.position.x, W.him.z - grp.position.z);
      if (W.him.distanceTo(grp.position) < 6) W.playerFacing = angleLerp(W.playerFacing, a, Math.min(1, dt * 6));
    }
    grp.rotation.y = W.playerFacing;
    anim.fade = THREE.MathUtils.lerp(anim.fade, s.vanish, Math.min(1, dt * 0.5));
    // waking up: lying on the grass at first
    const lying = s.step <= STEP.wake || (s.step === STEP.wake2 && !s.dialogue && s.focus === 'tree');
    grp.rotation.x = THREE.MathUtils.lerp(grp.rotation.x, lying ? -Math.PI / 2 + 0.2 : 0, Math.min(1, dt * 1.5));
    grp.position.y = THREE.MathUtils.lerp(grp.position.y, lying ? 0.3 : 0, Math.min(1, dt * 1.5));
    anim.lookUp = THREE.MathUtils.lerp(anim.lookUp, s.focus === 'tower' ? 1 : 0, dt * 2);
    W.player.copy(grp.position);

    // proximity
    if (s.screen === 'game' && !s.dialogue && !locked) {
      if (s.step >= STEP.q1) {
        const now = Date.now();
        for (const gl of GLIMMERS) {
          if ((s.glimmers[gl.id] ?? 0) > now) continue;
          if (Math.hypot(gl.pos[0] - cx, gl.pos[1] - cz) < 1.1) s.collectGlimmer(gl.id);
        }
      }
      if (s.step === STEP.explore && Math.hypot(PLACES.himSeat[0] - cx, PLACES.himSeat[1] - cz) < 4.2) {
        s.setWalkTo(null);
        s.talkToHim();
      }
      let near: string | null = null;
      let best = Infinity;
      for (const sp2 of SPOTS) {
        const d = Math.hypot(sp2.pos[0] - cx, sp2.pos[1] - cz);
        if (d < sp2.r && d < best) {
          best = d;
          near = sp2.id;
        }
      }
      if (s.step >= STEP.q1 && W.him.distanceTo(grp.position) < 2.2) near = 'him';
      s.setNear(near);
    } else if (s.near) s.setNear(null);

    saveT.current += dt;
    if (saveT.current > 2 && !locked) {
      saveT.current = 0;
      const p: V2 = [Math.round(cx * 100) / 100, Math.round(cz * 100) / 100];
      if (p[0] !== s.player[0] || p[1] !== s.player[1]) s.setPlayer(p);
    }
  });

  return (
    <group ref={g}>
      <Chibi look={HEROINE} anim={anim} />
      <Shadow />
    </group>
  );
}

function Shadow({ s = 0.5 }: { s?: number }) {
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, 0.03, 0]} raycast={() => null}>
      <circleGeometry args={[s, 20]} />
      <meshBasicMaterial color="#2b2540" transparent opacity={0.18} depthWrite={false} />
    </mesh>
  );
}

type HimMode = 'seat' | 'follow' | 'alone' | 'tree';

export function Him() {
  const g = useRef<THREE.Group>(null);
  const anim = useMemo(makeAnim, []);
  const vel = useRef(new THREE.Vector2());
  const facing = useRef(0);
  const placed = useRef<HimMode | null>(null);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const s = useGame.getState();
    const grp = g.current;
    if (!grp) return;
    let mode: HimMode = 'follow';
    if (s.step <= STEP.explore) mode = 'seat';
    else if (s.step === STEP.ch1End) mode = 'alone';
    else if (s.step === STEP.wake2 && s.dialogue?.id !== 'wake2' && s.focus === 'tree') mode = 'tree';
    else if (s.step === STEP.wake2 && !s.dialogue) mode = 'tree';
    if (s.dialogue?.id === 'ending1' && s.focus === 'alone') mode = 'alone';

    if (placed.current !== mode) {
      if (mode === 'seat') {
        grp.position.set(PLACES.himSeat[0], 0, PLACES.himSeat[1]);
        facing.current = 0;
      } else if (mode === 'tree') {
        grp.position.set(PLACES.wake[0] + 1.4, 0, PLACES.wake[1] - 1.6);
        facing.current = Math.atan2(PLACES.wake[0] - grp.position.x, PLACES.wake[1] - grp.position.z);
      } else if (mode === 'alone' && placed.current !== null) {
        // stays where she left him
      } else if (mode === 'alone') {
        grp.position.set(PLACES.garden[0] + 1.5, 0, PLACES.garden[1] + 1.2);
      } else if (placed.current === null) {
        grp.position.set(s.player[0] + 1.2, 0, s.player[1] - 0.8);
      }
      placed.current = mode;
    }

    let dir = new THREE.Vector2();
    let speed = 0;
    if (mode === 'follow' && !s.dialogue && s.vanish === 0) {
      const dx = W.player.x - grp.position.x;
      const dz = W.player.z - grp.position.z;
      const d = Math.hypot(dx, dz);
      if (d > 9) {
        grp.position.set(W.player.x - dx / d * 2, 0, W.player.z - dz / d * 2);
      } else if (d > 1.9) {
        dir.set(dx / d, dz / d);
        speed = Math.min(SPEED * 1.08, (d - 1.6) * 3.2);
      }
    }
    vel.current.lerp(dir.multiplyScalar(speed), Math.min(1, dt * 7));
    const [cx, cz] = collide(grp.position.x + vel.current.x * dt, grp.position.z + vel.current.y * dt, 0.4);
    grp.position.x = cx;
    grp.position.z = cz;
    const sp = vel.current.length();
    anim.speed = THREE.MathUtils.lerp(anim.speed, Math.min(1, sp / SPEED), Math.min(1, dt * 10));
    anim.phase += dt * sp * 2.4;
    if (sp > 0.3) facing.current = angleLerp(facing.current, Math.atan2(vel.current.x, vel.current.y), Math.min(1, dt * 10));
    const talking = !!s.dialogue && W.player.distanceTo(grp.position) < 7 && s.focus !== 'alone';
    if (talking || (mode === 'tree' && s.step === STEP.wake2)) {
      const a = Math.atan2(W.player.x - cx, W.player.z - cz);
      facing.current = angleLerp(facing.current, a, Math.min(1, dt * 5));
    }
    if (mode === 'alone') facing.current = angleLerp(facing.current, Math.PI * 0.85, dt * 1.5);
    grp.rotation.y = facing.current;
    // seated on the tower steps until he stands to meet her
    const d = s.dialogue;
    const standing = d?.id === 'meet' ? d.i >= 7 : false;
    anim.sit = THREE.MathUtils.lerp(anim.sit, mode === 'seat' && !standing ? 1 : 0, Math.min(1, dt * 3));
    anim.lookUp = THREE.MathUtils.lerp(anim.lookUp, mode === 'alone' || s.focus === 'tower' ? 0.8 : 0, dt * 2);
    W.him.copy(grp.position);
  });

  return (
    <group
      ref={g}
      onPointerDown={(e) => {
        e.stopPropagation();
        const s = useGame.getState();
        if (s.dialogue || s.step < STEP.explore) return;
        if (W.player.distanceTo(W.him) < 2.6) s.talkToHim();
        else s.setWalkTo([W.him.x, W.him.z + 1]);
      }}
    >
      <Chibi look={LUCIEN} anim={anim} />
      <Shadow s={0.55} />
      {/* generous invisible hit area for fingers */}
      <mesh position={[0, 0.8, 0]} visible={false}>
        <cylinderGeometry args={[0.7, 0.7, 1.8, 8]} />
      </mesh>
    </group>
  );
}

/** cinematic shots: what to look at, and the direction the camera sits from it */
const FOCI: Record<string, { look: [number, number, number]; off: [number, number, number] }> = {
  square: { look: [0, 1.2, 0], off: [-4, 9, 6.5] },
  garden: { look: [-12.5, 0.4, -1.4], off: [5, 8, 2.6] },
  bookshop: { look: [11, 2.2, -1.2], off: [-7.5, 3.5, 6.5] },
  tower: { look: [0, 10, -12], off: [3, -6, 13] },
  tree: { look: [3.4, 0.7, 14.0], off: [-2, 3.2, -5.5] },
};

export function CameraRig() {
  const { camera, size, gl } = useThree();
  const look = useRef(new THREE.Vector3(0, 1, 0));
  const zoom = useRef(1);
  const snapped = useRef(false);
  useEffect(() => {
    const el = gl.domElement;
    const wheel = (e: WheelEvent) => {
      zoom.current = THREE.MathUtils.clamp(zoom.current + e.deltaY * 0.0008, 0.65, 1.35);
    };
    let pinch = 0;
    const touches = new Map<number, { x: number; y: number }>();
    const down = (e: PointerEvent) => touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const move = (e: PointerEvent) => {
      if (!touches.has(e.pointerId)) return;
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.size === 2) {
        const [a, b] = [...touches.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch) zoom.current = THREE.MathUtils.clamp(zoom.current * (pinch / d), 0.65, 1.35);
        pinch = d;
      }
    };
    const up = (e: PointerEvent) => {
      touches.delete(e.pointerId);
      pinch = 0;
    };
    el.addEventListener('wheel', wheel, { passive: true });
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      el.removeEventListener('wheel', wheel);
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [gl]);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const s = useGame.getState();
    const portrait = size.width / size.height < 0.85;
    const pc = camera as THREE.PerspectiveCamera;
    const fov = portrait ? 46 : 36;
    if (Math.abs(pc.fov - fov) > 0.01) {
      pc.fov = fov;
      pc.updateProjectionMatrix();
    }
    (window as unknown as { __cam: THREE.Camera }).__cam = camera;
    const pos = new THREE.Vector3();
    const tgt = new THREE.Vector3();
    let k = 2.2;
    if (s.screen === 'title') {
      const t = W.t * 0.06;
      pos.set(Math.sin(t) * 6, 2.6 + Math.sin(t * 0.7) * 0.4, (portrait ? 15 : 11) + Math.cos(t) * 1.5);
      tgt.set(0, portrait ? 8.5 : 7, -12);
      k = 1;
    } else if (s.focus === 'alone') {
      pos.set(W.him.x + 2.8, 2.2, W.him.z + 4.6);
      tgt.set(W.him.x, 1.4, W.him.z);
      k = 1.2;
    } else if (s.focus && FOCI[s.focus]) {
      const f = FOCI[s.focus];
      tgt.set(...f.look);
      pos.set(...f.off).multiplyScalar(portrait ? 1.35 : 1).add(tgt);
      pos.y = Math.max(pos.y, 1.5);
      k = 1.4;
    } else if (s.dialogue && s.step >= STEP.explore && W.him.distanceTo(W.player) < 7) {
      // over-the-shoulder two-shot
      const mid = W.player.clone().add(W.him).multiplyScalar(0.5);
      const axis = W.him.clone().sub(W.player).setY(0);
      const perp = new THREE.Vector3(-axis.z, 0, axis.x).normalize();
      if (perp.z < 0) perp.negate();
      const dist = portrait ? 7.8 : 6.2;
      pos.copy(mid).addScaledVector(perp, dist).add(new THREE.Vector3(0, 2.8, 0));
      tgt.copy(mid).add(new THREE.Vector3(0, portrait ? -0.9 : 0.4, 0));
      k = 2.2;
    } else {
      const z = zoom.current;
      const off = portrait ? new THREE.Vector3(0, 10.5, 15.5) : new THREE.Vector3(0, 8.5, 14);
      off.multiplyScalar(z);
      pos.copy(W.player).add(off);
      tgt.copy(W.player).add(new THREE.Vector3(0, portrait ? 2.6 : 2.0, -4));
      k = 3;
    }
    let a = 1 - Math.exp(-k * dt);
    if (!snapped.current) {
      a = 1;
      snapped.current = true;
    }
    camera.position.lerp(pos, a);
    look.current.lerp(tgt, a);
    camera.lookAt(look.current);
  });
  return null;
}
