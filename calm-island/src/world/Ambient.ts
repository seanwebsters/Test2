import * as THREE from 'three';
import { mulberry32 } from '../core/math';
import { globalUniforms } from './shared';

/** Small signs of life: drifting pollen around the player and birds wheeling overhead. */
export class Ambient {
  readonly group = new THREE.Group();
  private pollen: THREE.ShaderMaterial;
  private birds: { pivot: THREE.Group; wingL: THREE.Mesh; wingR: THREE.Mesh; r: number; speed: number; phase: number; y: number; cx: number; cz: number }[] = [];

  constructor() {
    const rnd = mulberry32(11);
    const N = 260;
    const BOX = 46;
    const pos = new Float32Array(N * 3);
    const seed = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = rnd() * BOX;
      pos[i * 3 + 1] = rnd() * 9;
      pos[i * 3 + 2] = rnd() * BOX;
      seed[i] = rnd();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    this.pollen = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uTime: globalUniforms.uTime, uCenter: { value: new THREE.Vector3() }, uScale: { value: 600 } },
      vertexShader: /* glsl */ `
        uniform float uTime;
        uniform vec3 uCenter;
        uniform float uScale;
        attribute float aSeed;
        varying float vAlpha;
        void main() {
          vec3 p = position;
          p.x += uTime * 0.35 + sin(uTime * 0.6 + aSeed * 40.0) * 0.7;
          p.y += sin(uTime * 0.4 + aSeed * 20.0) * 0.6;
          p.z += uTime * 0.18 + cos(uTime * 0.5 + aSeed * 30.0) * 0.7;
          p.xz = mod(p.xz - uCenter.xz + ${(BOX / 2).toFixed(1)}, ${BOX.toFixed(1)}) - ${(BOX / 2).toFixed(1)} + uCenter.xz;
          p.y += uCenter.y - 1.0;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          float edge = 1.0 - smoothstep(${(BOX * 0.36).toFixed(1)}, ${(BOX * 0.5).toFixed(1)}, distance(p.xz, uCenter.xz));
          vAlpha = edge * (0.35 + 0.45 * sin(uTime * 1.3 + aSeed * 90.0)) * smoothstep(1.5, 4.0, -mv.z);
          gl_PointSize = uScale * (0.035 + aSeed * 0.035) / -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          gl_FragColor = vec4(1.0, 0.98, 0.8, smoothstep(0.5, 0.1, d) * vAlpha);
        }`,
    });
    const points = new THREE.Points(geo, this.pollen);
    points.frustumCulled = false;
    points.renderOrder = 6;
    this.group.add(points);

    const wing = new THREE.BufferGeometry();
    wing.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.28, 0, 0, -0.22, 1.25, 0, -0.1], 3));
    wing.computeVertexNormals();
    const birdMat = new THREE.MeshBasicMaterial({ color: 0xfafcff, side: THREE.DoubleSide, fog: true });
    for (let i = 0; i < 9; i++) {
      const pivot = new THREE.Group();
      const wingR = new THREE.Mesh(wing, birdMat);
      const wingL = new THREE.Mesh(wing, birdMat);
      wingL.scale.x = -1;
      pivot.add(wingL, wingR);
      pivot.scale.setScalar(0.9 + rnd() * 0.5);
      const flock = i < 5 ? { x: 70, z: -70 } : { x: 10, z: 250 };
      this.birds.push({ pivot, wingL, wingR, r: 26 + rnd() * 46, speed: (0.12 + rnd() * 0.1) * (rnd() < 0.5 ? 1 : -1), phase: rnd() * 6.3, y: 42 + rnd() * 32, cx: flock.x, cz: flock.z });
      this.group.add(pivot);
    }
  }

  setViewport(heightPx: number): void {
    this.pollen.uniforms.uScale.value = heightPx;
  }

  update(time: number, center: THREE.Vector3): void {
    (this.pollen.uniforms.uCenter.value as THREE.Vector3).copy(center);
    for (const b of this.birds) {
      const a = time * b.speed + b.phase;
      b.pivot.position.set(b.cx + Math.cos(a) * b.r, b.y + Math.sin(a * 2.3) * 3, b.cz + Math.sin(a) * b.r);
      b.pivot.rotation.y = -a + (b.speed > 0 ? 0 : Math.PI);
      b.pivot.rotation.z = b.speed > 0 ? -0.25 : 0.25;
      const glide = Math.sin(time * 0.35 + b.phase) > 0.55 ? 0.15 : 1;
      const flap = Math.sin(time * 7.5 + b.phase * 3) * 0.6 * glide + 0.15;
      b.wingR.rotation.z = flap;
      b.wingL.rotation.z = -flap;
    }
  }
}
