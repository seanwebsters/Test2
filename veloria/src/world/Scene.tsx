import { Suspense, useCallback } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Lighting, Sky, Clouds, Ground } from './Environment';
import { ClockTower, Bookshop, House, Lamps, SquareDressing } from './Buildings';
import { Fountain } from './Fountain';
import { Garden } from './Garden';
import { Woodland, Undergrowth, GardenPlants, BlossomTrees, Wisteria } from './Nature';
import { Player, Him, CameraRig } from './Actors';
import { Petals, Birds, Butterflies, Glimmers, RestoreBursts, RootLetter, QuestMarker } from './Ambient';
import { PAL, W, updateFlow } from './common';
import { useGame, timeLevel } from '../game/store';
import { setTimeLevel } from '../game/audio';
import { collide, BLOSSOMS } from '../game/layout';
import { STEP } from '../game/story';

function Clock() {
  let last = -1;
  useFrame((_, dt) => {
    updateFlow(Math.min(dt, 0.1));
    const s = useGame.getState();
    const lvl = timeLevel(s.restored);
    const key = lvl * 10 + (s.restored.fountain ? 1 : 0);
    if (key !== last) {
      last = key;
      setTimeLevel(lvl, !!s.restored.fountain && Date.now() > (s.restored.fountain ?? 0));
    }
  });
  return null;
}

function Town() {
  return (
    <group>
      <ClockTower />
      <Bookshop />
      <House p={[-8.5, 0, -13.2]} w={4.6} d={4.2} h={5.4} wall="#eee0d2" roof={PAL.roofPlum} timber floors={2} />
      <House p={[8.5, 0, -13.2]} w={4.6} d={4.2} h={6.2} wall="#e9d3cf" roof={PAL.roofBlue} floors={2} />
      <House p={[-14.5, 0, -11.6]} rot={0.35} w={4.0} d={4.0} h={7.4} wall="#eadfcc" roof={PAL.midnight} timber floors={3} />
      <House p={[14.5, 0, -10.8]} rot={-0.35} w={4.0} d={4.0} h={6.6} wall="#e3d6e1" roof={PAL.roofPlum} floors={2} />
      <House p={[13.6, 0, 5.4]} rot={-0.2} w={4.6} d={3.6} h={5.2} wall="#efe2cf" roof={PAL.terracotta} timber floors={2} />
      <House p={[-13.6, 0, 6.0]} rot={0.2} w={4.6} d={3.6} h={5.6} wall="#e6dccf" roof={PAL.roofBlue} floors={2} />
      <House p={[10.6, 0, -8.6]} rot={-0.25} w={4.0} d={3.4} h={5.0} wall="#f1e3cf" roof={PAL.midnight} floors={2} />
      <House p={[-10.4, 0, -9.0]} rot={0.25} w={4.0} d={3.4} h={5.6} wall="#eedad6" roof={PAL.roofBlue} timber floors={2} />
      <BlossomTrees spots={BLOSSOMS as unknown as [number, number][]} />
      <Wisteria p={[-1.9, 3.3, -11.35]} width={1.6} n={6} />
      <Wisteria p={[1.9, 3.3, -11.35]} width={1.6} n={6} />
      <Wisteria p={[-10.4, 3.6, -7.2]} rot={0.25} width={3.2} n={9} />
      <Wisteria p={[10.6, 3.2, -6.8]} rot={-0.25} width={3.0} n={8} />
      <Fountain />
      <Garden />
      <Lamps />
      <SquareDressing />
    </group>
  );
}

export function Scene() {
  const onTap = useCallback((p: THREE.Vector3) => {
    const s = useGame.getState();
    if (s.screen !== 'game' || s.dialogue || s.focus || s.book.open || s.step < STEP.explore) return;
    const [x, z] = collide(p.x, p.z, 0.3);
    s.setWalkTo([x, z]);
  }, []);
  return (
    <Canvas
      shadows="soft"
      dpr={[1, 1.75]}
      camera={{ fov: 34, near: 0.5, far: 700, position: [18, 12, 22] }}
      gl={{ antialias: true, toneMapping: THREE.NeutralToneMapping, toneMappingExposure: 1.02, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.setClearColor('#2c2b4a');
      }}
    >
      <Clock />
      <Lighting />
      <Sky />
      <Clouds />
      <CameraRig />
      <Ground onTap={onTap} />
      <Town />
      <Suspense fallback={null}>
        <Woodland />
        <Undergrowth />
        <GardenPlants />
      </Suspense>
      <Player />
      <Him />
      <Petals />
      <Birds />
      <Butterflies />
      <Glimmers />
      <RestoreBursts />
      <RootLetter />
      <QuestMarker />
    </Canvas>
  );
}

export { W };
