import * as THREE from 'three';
import { clamp, damp, lerp, mulberry32, smoothstep } from '../core/math';
import { globalUniforms } from '../world/shared';

export interface CalmlingPose {
  /** horizontal speed in m/s */
  speed: number;
  walkSpeed: number;
  runSpeed: number;
  grounded: boolean;
  swimming: boolean;
  verticalSpeed: number;
  /** signed turning rate, rad/s */
  turnRate: number;
  /** world-space acceleration, used to make the fur lag behind */
  accel: THREE.Vector3;
  yaw: number;
}

const BODY_Y = 0.82;
const RX = 0.5;
const RY = 0.47;
const RZ = 0.46;

/**
 * A procedural Calmling: a round, shaggy body with big touching eyes, a small
 * smile and stubby felt limbs. It is a stand-in built to match the character
 * sheet — `root` can be swapped for an imported GLB with the same pivots.
 * Feet rest on y = 0 and the character looks down +z.
 */
export class CalmlingModel {
  readonly root = new THREE.Group();
  private tilt = new THREE.Group();
  private body = new THREE.Group();
  private armL = new THREE.Group();
  private armR = new THREE.Group();
  private legL = new THREE.Group();
  private legR = new THREE.Group();
  private eyes = new THREE.Group();
  private pupils: THREE.Object3D[] = [];
  private furUniforms = { uFurSway: { value: new THREE.Vector3() } };

  private phase = 0;
  private time = 0;
  private move = 0;
  private run = 0;
  private air = 0;
  private swim = 0;
  private squash = 0;
  private squashVel = 0;
  private blinkIn = 2;
  private blink = 0;
  private furOffset = new THREE.Vector3();
  private furVel = new THREE.Vector3();
  private lookX = 0;

  constructor(color = 0x45a9f0) {
    const base = new THREE.Color(color);
    const furMat = new THREE.MeshStandardMaterial({ color: base, roughness: 0.95, metalness: 0, vertexColors: true });
    furMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = globalUniforms.uTime;
      shader.uniforms.uFurSway = this.furUniforms.uFurSway;
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
          uniform float uTime;
          uniform vec3 uFurSway;
          attribute vec3 aDir;
          attribute vec3 aLean;
          attribute vec2 aFur; // x = shell height 0..1, y = strand length here
          varying vec3 vDir;
          varying float vShell;`,
        )
        .replace(
          '#include <begin_vertex>',
          /* glsl */ `#include <begin_vertex>
          float sh = aFur.x;
          float sh2 = sh * sh;
          transformed += normal * aFur.y * sh + aLean * sh2 + uFurSway * sh2;
          transformed.x += sin(uTime * 2.1 + position.y * 7.0 + position.z * 5.0) * 0.01 * sh2;
          transformed.y += sin(uTime * 1.7 + position.x * 6.0) * 0.007 * sh2;
          vDir = aDir;
          vShell = sh;`,
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
          varying vec3 vDir;
          varying float vShell;
          float furHash(vec3 p) {
            p = fract(p * vec3(0.1031, 0.1030, 0.0973));
            p += dot(p, p.yxz + 33.33);
            return fract((p.x + p.y) * p.z);
          }`,
        )
        .replace(
          '#include <color_fragment>',
          /* glsl */ `#include <color_fragment>
          // Each cell of the body grows one strand; shells slice it into a taper.
          vec3 fq = normalize(vDir) * 54.0;
          vec3 fcell = floor(fq);
          float frnd = furHash(fcell);
          float strand = 0.5 + 0.5 * frnd;
          if (vShell > 0.001) {
            if (vShell > strand) discard;
            float taper = 1.0 - vShell / strand;
            if (length(fract(fq) - 0.5) > 0.2 + 0.62 * taper) discard;
          }
          diffuseColor.rgb *= mix(0.6, 1.16, smoothstep(0.0, 0.9, vShell)) * (0.94 + 0.12 * frnd);`,
        )
        .replace(
          '#include <opaque_fragment>',
          /* glsl */ `
          float rim = pow(1.0 - clamp(dot(normalize(vViewPosition), normal), 0.0, 1.0), 2.4);
          outgoingLight += diffuseColor.rgb * rim * 0.5 + vec3(0.55, 0.8, 1.0) * rim * 0.1;
          #include <opaque_fragment>`,
        );
    };
    const limbMat = new THREE.MeshStandardMaterial({ color: base.clone().multiplyScalar(0.86), roughness: 0.85 });

    // ---- body + fur ------------------------------------------------------
    const fur = new THREE.Mesh(buildFur(), furMat);
    fur.receiveShadow = true;
    this.body.add(fur);
    // an invisible stand-in casts the fur's shadow
    const caster = new THREE.Mesh(
      new THREE.SphereGeometry(1, 20, 14).scale(RX * 1.2, RY * 1.2, RZ * 1.2),
      new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }),
    );
    caster.castShadow = true;
    this.body.add(caster);

    // ---- face ------------------------------------------------------------
    const white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25, emissive: 0x4a4f5c });
    const iris = new THREE.MeshStandardMaterial({ color: 0x2a78e0, roughness: 0.3, emissive: 0x0a2a66 });
    const pupil = new THREE.MeshStandardMaterial({ color: 0x0a1638, roughness: 0.2 });
    const shine = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (const side of [-1, 1]) {
      const eye = new THREE.Group();
      eye.position.set(side * 0.158, 0.13, 0.35);
      eye.rotation.y = side * 0.3;
      eye.rotation.x = -0.1;
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.2, 28, 20), white);
      ball.scale.set(1, 1.03, 0.66);
      eye.add(ball);
      const look = new THREE.Group();
      look.position.set(-side * 0.04, -0.012, 0.092);
      const irisMesh = new THREE.Mesh(new THREE.SphereGeometry(0.112, 24, 16), iris);
      irisMesh.scale.set(1, 1, 0.42);
      const pupilMesh = new THREE.Mesh(new THREE.SphereGeometry(0.076, 20, 14), pupil);
      pupilMesh.scale.set(1, 1, 0.42);
      pupilMesh.position.z = 0.02;
      const glint = new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 8), shine);
      glint.position.set(0.034, 0.04, 0.05);
      const glint2 = new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 6), shine);
      glint2.position.set(-0.03, -0.034, 0.05);
      look.add(irisMesh, pupilMesh, glint, glint2);
      eye.add(look);
      this.pupils.push(look);
      this.eyes.add(eye);
    }
    this.body.add(this.eyes);

    // a small smile, laid along the curve of the face
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 10; i++) {
      const a = lerp(-0.25, 0.25, i / 10);
      const y = -0.17 + 0.05 * (a / 0.25) ** 2;
      const k = Math.sqrt(Math.max(0, 1 - (y / RY) ** 2));
      pts.push(new THREE.Vector3(Math.sin(a) * RX * k * 0.98, y, Math.cos(a) * RZ * k * 1.085));
    }
    const smile = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.013, 6),
      new THREE.MeshStandardMaterial({ color: 0x17458f, roughness: 0.6 }),
    );
    this.body.add(smile);

    // ---- limbs -----------------------------------------------------------
    const armGeo = new THREE.CapsuleGeometry(0.1, 0.17, 6, 14).translate(0, -0.16, 0);
    for (const [arm, side] of [[this.armL, -1], [this.armR, 1]] as const) {
      arm.position.set(side * 0.5, -0.06, 0.05);
      const mesh = new THREE.Mesh(armGeo, limbMat);
      mesh.scale.set(1, 1, 0.9);
      mesh.castShadow = true;
      arm.add(mesh);
      this.body.add(arm);
    }
    const legGeo = new THREE.CapsuleGeometry(0.125, 0.14, 6, 14).translate(0, -0.14, 0);
    const footGeo = new THREE.SphereGeometry(1, 16, 12).scale(0.155, 0.1, 0.2).translate(0, -0.26, 0.05);
    for (const [leg, side] of [[this.legL, -1], [this.legR, 1]] as const) {
      leg.position.set(side * 0.17, 0.36, 0);
      const mesh = new THREE.Mesh(legGeo, limbMat);
      const foot = new THREE.Mesh(footGeo, limbMat);
      mesh.castShadow = foot.castShadow = true;
      leg.add(mesh, foot);
      this.tilt.add(leg);
    }

    this.body.position.y = BODY_Y;
    this.tilt.add(this.body);
    this.root.add(this.tilt);
  }

  /** Give the fur a kick (landing, jumping). Positive stretches, negative squashes. */
  impulse(amount: number): void {
    this.squashVel += amount;
  }

  update(dt: number, pose: CalmlingPose): void {
    this.time += dt;
    const t = this.time;
    const moving = clamp(pose.speed / pose.walkSpeed);
    const running = clamp((pose.speed - pose.walkSpeed) / (pose.runSpeed - pose.walkSpeed));
    this.move = damp(this.move, pose.grounded || pose.swimming ? moving : moving * 0.3, 12, dt);
    this.run = damp(this.run, running, 8, dt);
    this.air = damp(this.air, pose.grounded || pose.swimming ? 0 : 1, 14, dt);
    this.swim = damp(this.swim, pose.swimming ? 1 : 0, 6, dt);

    // steps keep pace with the ground so feet never skate
    this.phase += dt * (pose.swimming ? 5 : pose.speed * lerp(2.9, 1.75, this.run));
    const s = Math.sin(this.phase);
    const c = Math.cos(this.phase);

    // squash and stretch on a soft spring
    this.squashVel += (-this.squash * 190 - this.squashVel * 13) * dt;
    this.squash = clamp(this.squash + this.squashVel * dt, -0.3, 0.3);
    const breathe = Math.sin(t * 1.9) * 0.014 * (1 - this.move);
    const sy = 1 + this.squash + breathe + this.air * 0.04 * clamp(pose.verticalSpeed / 8, -1, 1);
    const sxz = 1 / Math.sqrt(Math.max(0.5, sy));
    this.body.scale.set(sxz, sy, sxz);

    const stride = lerp(0.62, 1.0, this.run) * this.move;
    const bounce = Math.abs(c) * lerp(0.035, 0.085, this.run) * this.move;
    this.body.position.y = BODY_Y + bounce + (sy - 1) * 0.3 + Math.sin(t * 2.2) * 0.03 * this.swim;
    this.tilt.rotation.z = s * lerp(0.075, 0.04, this.run) * this.move - clamp(pose.turnRate * 0.035, -0.22, 0.22) * this.move;
    this.tilt.rotation.x = 0.07 * this.move + 0.15 * this.run + this.air * clamp(-pose.verticalSpeed * 0.02, -0.15, 0.2) + this.swim * 0.25;

    const tuck = this.air * 0.55;
    this.legL.rotation.x = s * stride * (1 - this.air) - tuck + Math.sin(t * 5) * 0.5 * this.swim;
    this.legR.rotation.x = -s * stride * (1 - this.air) - tuck * 0.5 - Math.sin(t * 5) * 0.5 * this.swim;
    this.legL.position.y = 0.36 + Math.max(0, c) * 0.05 * this.move + bounce * 0.4;
    this.legR.position.y = 0.36 + Math.max(0, -c) * 0.05 * this.move + bounce * 0.4;

    const armSwing = lerp(0.55, 1.05, this.run) * this.move;
    const lift = this.air * 1.15 + this.run * 0.18 + this.swim * 0.9;
    const idleSway = Math.sin(t * 1.9) * 0.04 * (1 - this.move);
    this.armL.rotation.x = -s * armSwing + Math.sin(t * 4) * 0.5 * this.swim;
    this.armR.rotation.x = s * armSwing - Math.sin(t * 4) * 0.5 * this.swim;
    this.armL.rotation.z = -(0.3 + lift + idleSway);
    this.armR.rotation.z = 0.3 + lift + idleSway;

    // blinking and a glance into turns
    this.blinkIn -= dt;
    if (this.blinkIn <= 0) {
      this.blink = 0.15;
      this.blinkIn = 1.8 + Math.random() * 3.8;
      if (Math.random() < 0.2) this.blinkIn = 0.3;
    }
    this.blink = Math.max(0, this.blink - dt);
    const lid = this.blink > 0 ? 1 - Math.sin((this.blink / 0.15) * Math.PI) * 0.92 : 1;
    this.eyes.scale.y = lid;
    this.eyes.position.y = (1 - lid) * 0.1;
    const glance = this.move > 0.1 ? 0 : Math.sin(t * 0.43) * Math.sin(t * 0.17 + 1) * 0.6;
    this.lookX = damp(this.lookX, clamp(pose.turnRate * 0.25 + glance, -1, 1), 6, dt);
    this.pupils[0].position.x = 0.04 + this.lookX * 0.026;
    this.pupils[1].position.x = -0.04 + this.lookX * 0.026;

    // fur trails behind every change of velocity, then springs back
    const cy = Math.cos(-pose.yaw);
    const syaw = Math.sin(-pose.yaw);
    const ax = pose.accel.x * cy + pose.accel.z * syaw;
    const az = -pose.accel.x * syaw + pose.accel.z * cy;
    this.furVel.x += (-ax * 0.022 - this.furOffset.x * 150 - this.furVel.x * 11) * dt;
    this.furVel.y += (-pose.accel.y * 0.014 - this.furOffset.y * 150 - this.furVel.y * 11) * dt;
    this.furVel.z += (-az * 0.022 - this.furOffset.z * 150 - this.furVel.z * 11) * dt;
    this.furOffset.addScaledVector(this.furVel, dt);
    this.furOffset.clampLength(0, 0.16);
    this.furUniforms.uFurSway.value.copy(this.furOffset);
    void smoothstep;
  }
}

/**
 * Shell fur: the body surface repeated in thin layers. Strands gather into
 * a couple of hundred pointed tufts — long and upswept on the crown, hanging
 * down the sides, clipped short across the face so the eyes and smile stay clear.
 */
function buildFur(): THREE.BufferGeometry {
  const rnd = mulberry32(7);
  const SHELLS = 30;
  const base = new THREE.SphereGeometry(1, 80, 54);
  const bp = base.attributes.position;
  const count = bp.count;

  // tuft centres, evenly spread then jittered
  const TUFTS = 150;
  const golden = Math.PI * (3 - Math.sqrt(5));
  const tuftDir: THREE.Vector3[] = [];
  const tuftTip: THREE.Vector3[] = [];
  const tuftLen: number[] = [];
  const surface = (d: THREE.Vector3, out: THREE.Vector3): THREE.Vector3 => {
    const pear = 1 - 0.07 * d.y;
    return out.set(d.x * RX * pear, d.y * RY, d.z * RZ * pear);
  };
  const faceMask = (d: THREE.Vector3): number =>
    smoothstep(0.5, 0.82, d.z) * smoothstep(-0.62, -0.38, d.y) * smoothstep(0.8, 0.55, d.y);
  const flow = new THREE.Vector3();
  for (let i = 0; i < TUFTS; i++) {
    const y = 1 - ((i + 0.5) / TUFTS) * 2;
    const r = Math.sqrt(1 - y * y);
    const a = i * golden;
    const d = new THREE.Vector3(Math.cos(a) * r + (rnd() - 0.5) * 0.1, y + (rnd() - 0.5) * 0.1, Math.sin(a) * r + (rnd() - 0.5) * 0.1).normalize();
    const crown = smoothstep(0.5, 0.95, d.y);
    const skirt = smoothstep(-0.25, -0.8, d.y);
    const len = lerp(0.2, 0.31, rnd()) * (1 + crown * 0.3) * (1 - skirt * 0.55);
    // fur flows out and down the sides and sweeps up into a quiff on top
    flow.copy(d);
    flow.y += lerp(-0.6, 0.7, crown);
    flow.x += (rnd() - 0.5) * 0.3 + crown * 0.2;
    flow.z += (rnd() - 0.5) * 0.3 - crown * 0.12;
    flow.normalize();
    tuftDir.push(d);
    tuftLen.push(len);
    tuftTip.push(surface(d, new THREE.Vector3()).addScaledVector(flow, len));
  }

  const P = new Float32Array(count * 3);
  const N = new Float32Array(count * 3);
  const D = new Float32Array(count * 3);
  const L = new Float32Array(count * 3);
  const len = new Float32Array(count);
  const tone = new Float32Array(count);
  const d = new THREE.Vector3();
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  const tip = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    d.fromBufferAttribute(bp, i).normalize();
    surface(d, p);
    n.set(d.x / RX, d.y / RY, d.z / RZ).normalize();
    let best = 0;
    let bestDot = -2;
    for (let t = 0; t < TUFTS; t++) {
      const dot = d.dot(tuftDir[t]);
      if (dot > bestDot) {
        bestDot = dot;
        best = t;
      }
    }
    const ang = Math.acos(Math.min(1, bestDot));
    const peak = 1 - smoothstep(0, 0.25, ang);
    const face = faceMask(d);
    const l = lerp(tuftLen[best] * (0.24 + 0.76 * peak * peak), 0.03, face);
    tip.copy(p).addScaledVector(n, l);
    const pull = 0.93 * (1 - face);
    D.set([d.x, d.y, d.z], i * 3);
    P.set([p.x, p.y, p.z], i * 3);
    N.set([n.x, n.y, n.z], i * 3);
    L.set([(tuftTip[best].x - tip.x) * pull, (tuftTip[best].y - tip.y) * pull, (tuftTip[best].z - tip.z) * pull], i * 3);
    len[i] = l;
    tone[i] = 0.96 + 0.1 * smoothstep(0.1, 0.8, d.z) * smoothstep(-0.9, 0.2, d.y) + 0.05 * peak;
  }

  const total = count * SHELLS;
  const pos = new Float32Array(total * 3);
  const nor = new Float32Array(total * 3);
  const dir = new Float32Array(total * 3);
  const lean = new Float32Array(total * 3);
  const fur = new Float32Array(total * 2);
  const col = new Float32Array(total * 3);
  const baseIndex = base.index!.array;
  const index = new Uint32Array(baseIndex.length * SHELLS);
  for (let s = 0; s < SHELLS; s++) {
    const o = s * count;
    pos.set(P, o * 3);
    nor.set(N, o * 3);
    dir.set(D, o * 3);
    lean.set(L, o * 3);
    const t = s / (SHELLS - 1);
    for (let i = 0; i < count; i++) {
      fur[(o + i) * 2] = t;
      fur[(o + i) * 2 + 1] = len[i];
      col[(o + i) * 3] = tone[i] * 0.97;
      col[(o + i) * 3 + 1] = tone[i];
      col[(o + i) * 3 + 2] = tone[i] * 1.02;
    }
    for (let k = 0; k < baseIndex.length; k++) index[s * baseIndex.length + k] = baseIndex[k] + o;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('aDir', new THREE.BufferAttribute(dir, 3));
  g.setAttribute('aLean', new THREE.BufferAttribute(lean, 3));
  g.setAttribute('aFur', new THREE.BufferAttribute(fur, 2));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(new THREE.BufferAttribute(index, 1));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1.1);
  return g;
}
