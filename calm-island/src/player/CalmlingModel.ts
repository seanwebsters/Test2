import * as THREE from 'three';
import { clamp, damp, lerp, mulberry32, smoothstep } from '../core/math';
import { SUN_DIR, globalUniforms } from '../world/shared';

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
  sitting: boolean;
  /** 0..1 lung fill during a breathing exercise */
  breath: number;
  gliding: boolean;
  sleeping?: boolean;
}

/** Everything that makes one Calmling look different from another. */
export interface CalmlingLook {
  /** main fur colour (the top of the body when there is a gradient) */
  fur: number;
  /** fur colour toward the bottom of the body */
  furLow?: number;
  /** where the two fur colours meet (-1 bottom … 1 top) and how sharply */
  lowAt?: number;
  lowSoft?: number;
  /** pale beard / belly patch down the front */
  belly?: number;
  /** colour the tufts fade to at their tips */
  tip?: number;
  /** every other tuft takes this colour (stripes, rainbow fur) */
  alt?: number;
  limbs?: number;
  /** hands and feet, when different from the limbs */
  paws?: number;
  iris?: number;
  style?: 'spiky' | 'shaggy' | 'fluffy' | 'smooth';
  extras?: string[];
  scale?: number;
}

export const BLUE_LOOK: CalmlingLook = { fur: 0x3f9de4, tip: 0xb4e2fb, style: 'spiky' };

const BODY_Y = 0.78;
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
  private glints: THREE.Object3D[] = [];
  private shine = new THREE.MeshBasicMaterial({ color: 0xffffff });
  private blob: THREE.Mesh;
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
  private sit = 0;
  private breath = 0;
  private eyesShut = 0;
  private glide = 0;
  private sleep = 0;
  private leaf: THREE.Group | null = null;

  constructor(readonly look: CalmlingLook = BLUE_LOOK, hero = true) {
    const base = new THREE.Color(0xffffff);
    const cTop = new THREE.Color(look.fur);
    const cLow = new THREE.Color(look.furLow ?? look.fur);
    const cBelly = look.belly !== undefined ? new THREE.Color(look.belly) : null;
    const lowAt = look.lowAt ?? 0;
    const lowSoft = look.lowSoft ?? 0.6;
    /** fur colour for a point on the body, by its direction from the centre */
    const colorAt = (d: THREE.Vector3, out: THREE.Color): THREE.Color => {
      out.copy(cLow).lerp(cTop, smoothstep(lowAt - lowSoft, lowAt + lowSoft, d.y));
      if (cBelly) out.lerp(cBelly, smoothstep(0.15, 0.6, d.z) * smoothstep(0.12, -0.22, d.y) * 0.95);
      return out;
    };
    const limbColor = new THREE.Color(look.limbs ?? look.furLow ?? look.fur).multiplyScalar(0.88);
    const has = (x: string): boolean => !!look.extras?.includes(x);
    const furMat = new THREE.MeshStandardMaterial({ color: base, roughness: 0.95, metalness: 0, vertexColors: true });
    furMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = globalUniforms.uTime;
      shader.uniforms.uFurSway = this.furUniforms.uFurSway;
      shader.uniforms.uSunDirW = globalUniforms.uSunDir;
      shader.uniforms.uDayLight = globalUniforms.uDayLight;
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
          uniform vec3 uSunDirW;
          uniform float uDayLight;
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
          vec3 fq = normalize(vDir) * 70.0;
          vec3 fcell = floor(fq);
          float frnd = furHash(fcell);
          float strand = 0.6 + 0.4 * frnd;
          if (vShell > 0.001) {
            if (vShell > strand) discard;
            float taper = 1.0 - vShell / strand;
            if (length(fract(fq) - 0.5) > 0.22 + 0.62 * taper) discard;
          }
          diffuseColor.rgb *= mix(0.86, 1.08, smoothstep(0.0, 0.9, vShell)) * (0.94 + 0.12 * frnd);`,
        )
        .replace(
          '#include <opaque_fragment>',
          /* glsl */ `
          float rim = pow(1.0 - clamp(dot(normalize(vViewPosition), normal), 0.0, 1.0), 2.4);
          vec3 sunV = normalize((viewMatrix * vec4(uSunDirW, 0.0)).xyz);
          float toSun = dot(normal, sunV);
          // sky light wraps the silhouette; where the sun is behind, the fine edges catch it warm
          outgoingLight += diffuseColor.rgb * rim * 0.3 + vec3(0.6, 0.82, 1.0) * rim * 0.08;
          outgoingLight += vec3(1.0, 0.84, 0.58) * rim * smoothstep(-0.25, 0.7, toSun) * 0.42 * uDayLight;
          // the side turned from the sun keeps a rich, cool blue instead of going grey
          outgoingLight += diffuseColor.rgb * vec3(0.05, 0.1, 0.24) * smoothstep(0.2, -0.6, toSun);
          #include <opaque_fragment>`,
        );
    };
    const limbMat = new THREE.MeshStandardMaterial({ color: limbColor, roughness: 0.85 });
    const pawMat = look.paws !== undefined ? new THREE.MeshStandardMaterial({ color: look.paws, roughness: 0.85 }) : limbMat;

    // ---- body + fur ------------------------------------------------------
    const fur = new THREE.Mesh(buildFur(hero ? 18 : 9, hero, colorAt), furMat);
    fur.receiveShadow = true;
    this.body.add(fur);
    const tuftMat = new THREE.MeshStandardMaterial({ color: base, roughness: 0.95, vertexColors: true });
    tuftMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = globalUniforms.uTime;
      shader.uniforms.uFurSway = this.furUniforms.uFurSway;
      shader.uniforms.uSunDirW = globalUniforms.uSunDir;
      shader.uniforms.uDayLight = globalUniforms.uDayLight;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform vec3 uFurSway;\nattribute vec2 aTuft;\nvarying vec2 vTuft;')
        .replace(
          '#include <begin_vertex>',
          /* glsl */ `#include <begin_vertex>
          float tt = aTuft.x * aTuft.x;
          transformed += uFurSway * tt * 1.6;
          transformed.x += sin(uTime * 2.0 + position.y * 6.0 + position.z * 4.0) * 0.012 * tt;
          transformed.y += sin(uTime * 1.6 + position.x * 5.0) * 0.008 * tt;
          vTuft = aTuft;`,
        );
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec2 vTuft;\nuniform vec3 uSunDirW;\nuniform float uDayLight;')
        .replace(
          '#include <color_fragment>',
          /* glsl */ `#include <color_fragment>
          // fine hair lines running the length of each tuft
          float hair = sin(vTuft.y * 46.0) * 0.5 + 0.5;
          diffuseColor.rgb *= 0.95 + 0.09 * hair * hair;`,
        )
        .replace(
          '#include <opaque_fragment>',
          /* glsl */ `
          float rim = pow(1.0 - clamp(dot(normalize(vViewPosition), normal), 0.0, 1.0), 2.4);
          vec3 sunV = normalize((viewMatrix * vec4(uSunDirW, 0.0)).xyz);
          float toSun = dot(normal, sunV);
          // sky light wraps the silhouette; where the sun is behind, the fine edges catch it warm
          outgoingLight += diffuseColor.rgb * rim * 0.3 + vec3(0.6, 0.82, 1.0) * rim * 0.08;
          outgoingLight += vec3(1.0, 0.84, 0.58) * rim * smoothstep(-0.25, 0.7, toSun) * 0.42 * uDayLight;
          // the side turned from the sun keeps a rich, cool blue instead of going grey
          outgoingLight += diffuseColor.rgb * vec3(0.05, 0.1, 0.24) * smoothstep(0.2, -0.6, toSun);
          #include <opaque_fragment>`,
        );
    };
    const tufts = new THREE.Mesh(buildTufts(look.style ?? 'spiky', colorAt, look.tip, look.alt), tuftMat);
    tufts.castShadow = true;
    this.body.add(tufts);
    // an invisible stand-in casts the fur's shadow
    const caster = new THREE.Mesh(
      new THREE.SphereGeometry(1, 20, 14).scale(RX * 1.2, RY * 1.2, RZ * 1.2),
      new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }),
    );
    caster.castShadow = true;
    this.body.add(caster);

    // ---- face ------------------------------------------------------------
    const white = new THREE.MeshStandardMaterial({ color: 0xf2f4ff, roughness: 0.16, emissive: 0x8c92a8 });
    const iris = new THREE.MeshStandardMaterial({ color: look.iris ?? 0x4a9cf0, roughness: 0.1, emissive: new THREE.Color(look.iris ?? 0x4a9cf0).multiplyScalar(0.35) });
    const pupil = new THREE.MeshStandardMaterial({ color: 0x0a1638, roughness: 0.06 });
    const shine = this.shine;
    for (const side of [-1, 1]) {
      const eye = new THREE.Group();
      eye.position.set(side * 0.178, 0.2, 0.34);
      eye.rotation.y = side * 0.3;
      eye.rotation.x = -0.1;
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.196, 32, 22), white);
      ball.scale.set(1, 1.03, 0.66);
      eye.add(ball);
      const look = new THREE.Group();
      look.position.set(-side * 0.05, -0.02, 0.095);
      const irisMesh = new THREE.Mesh(new THREE.SphereGeometry(0.112, 24, 16), iris);
      irisMesh.scale.set(1, 1, 0.42);
      const pupilMesh = new THREE.Mesh(new THREE.SphereGeometry(0.076, 20, 14), pupil);
      pupilMesh.scale.set(1, 1, 0.42);
      pupilMesh.position.z = 0.02;
      const glint = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 10), shine);
      glint.position.set(0.034, 0.04, 0.05);
      const glint2 = new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 6), shine);
      glint2.position.set(-0.03, -0.034, 0.05);
      look.add(irisMesh, pupilMesh, glint, glint2);
      this.glints.push(glint);
      eye.add(look);
      this.pupils.push(look);
      this.eyes.add(eye);
    }
    this.body.add(this.eyes);

    // a small smile, laid along the curve of the face
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 10; i++) {
      const a = lerp(-0.2, 0.2, i / 10);
      const y = -0.085 + 0.036 * (a / 0.2) ** 2;
      const k = Math.sqrt(Math.max(0, 1 - (y / RY) ** 2));
      pts.push(new THREE.Vector3(Math.sin(a) * RX * k * 0.98, y, Math.cos(a) * RZ * k * 1.12));
    }
    const smile = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.0065, 6),
      new THREE.MeshStandardMaterial({ color: 0x2c64a8, roughness: 0.7 }),
    );
    this.body.add(smile);

    // ---- limbs -----------------------------------------------------------
    const armGeo = new THREE.CapsuleGeometry(0.108, 0.19, 6, 14).translate(0, -0.17, 0);
    for (const [arm, side] of [[this.armL, -1], [this.armR, 1]] as const) {
      arm.position.set(side * 0.53, -0.15, 0.04);
      const mesh = new THREE.Mesh(armGeo, limbMat);
      mesh.scale.set(1, 1, 0.9);
      mesh.castShadow = true;
      arm.add(mesh);
      this.body.add(arm);
    }
    const legGeo = new THREE.CapsuleGeometry(0.165, 0.12, 8, 18).translate(0, -0.15, 0);
    const footGeo = new THREE.SphereGeometry(1, 16, 12).scale(0.185, 0.1, 0.2).translate(0, -0.27, 0.025);
    for (const [leg, side] of [[this.legL, -1], [this.legR, 1]] as const) {
      leg.position.set(side * 0.2, 0.37, 0);
      const mesh = new THREE.Mesh(legGeo, limbMat);
      const foot = new THREE.Mesh(footGeo, pawMat);
      mesh.castShadow = foot.castShadow = true;
      leg.add(mesh, foot);
      this.tilt.add(leg);
    }

    if (look.paws !== undefined) {
      for (const arm of [this.armL, this.armR]) {
        const hand = new THREE.Mesh(new THREE.SphereGeometry(0.112, 14, 10), pawMat);
        hand.position.y = -0.3;
        arm.add(hand);
      }
    }
    addExtras(look, has, this.body, this.armL, this.armR, this.legL, this.legR, smile);
    this.root.scale.setScalar(look.scale ?? 1);

    this.body.position.y = BODY_Y;
    this.tilt.add(this.body);
    this.root.add(this.tilt);
    // a soft pool of contact shade under the feet, so the Calmling sits on the ground
    this.blob = new THREE.Mesh(blobGeo, new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false, opacity: 0.5, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    this.blob.rotation.x = -Math.PI / 2;
    this.blob.position.y = 0.035;
    this.blob.renderOrder = 1;
    this.root.add(this.blob);
  }

  /** Give the fur a kick (landing, jumping). Positive stretches, negative squashes. */
  impulse(amount: number): void {
    this.furVel.y += amount * 0.3; // the fur carries on after the body stops, then settles
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
    this.sit = damp(this.sit, pose.sitting ? 1 : 0, 5, dt);
    this.breath = damp(this.breath, pose.sitting ? pose.breath : 0, 10, dt);
    this.sleep = damp(this.sleep, pose.sleeping ? 1 : 0, 1.5, dt);
    this.eyesShut = damp(this.eyesShut, pose.sleeping || (pose.sitting && pose.breath > 0.001) ? 1 : 0, 3, dt);

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
    // a deep breath fills the whole body
    const swell = 1 + this.breath * 0.075;
    this.body.scale.set(sxz * swell, sy * swell, sxz * swell);

    const stride = lerp(0.62, 1.0, this.run) * this.move;
    const bounce = Math.abs(c) * lerp(0.035, 0.085, this.run) * this.move;
    this.body.position.y = BODY_Y + bounce + (sy - 1) * 0.3 + Math.sin(t * 2.2) * 0.03 * this.swim - this.sit * 0.27 + this.breath * 0.04;
    // standing still, the weight drifts slowly from one foot to the other
    const idle = (1 - this.move) * (1 - this.sit) * (1 - this.air) * (1 - this.swim);
    const shift = Math.sin(t * 0.55) * idle;
    this.body.position.x = shift * 0.022;
    this.tilt.rotation.z = s * lerp(0.075, 0.04, this.run) * this.move - clamp(pose.turnRate * 0.035, -0.22, 0.22) * this.move + shift * 0.03;
    this.blob.visible = this.air < 0.6 && this.swim < 0.5;
    (this.blob.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - this.air) * (0.35 + 0.65 * globalUniforms.uDayLight.value);
    this.tilt.rotation.x = -1.15 * this.sleep - 0.06 * this.sit - 0.03 * this.breath + 0.07 * this.move + 0.15 * this.run + this.air * clamp(-pose.verticalSpeed * 0.02, -0.15, 0.2) + this.swim * 0.25;

    const tuck = this.air * 0.55;
    this.legL.rotation.x = s * stride * (1 - this.air) - tuck + Math.sin(t * 5) * 0.5 * this.swim;
    this.legR.rotation.x = -s * stride * (1 - this.air) - tuck * 0.5 - Math.sin(t * 5) * 0.5 * this.swim;
    // sitting: legs swing out in front, feet up, arms resting
    this.legL.rotation.x = lerp(this.legL.rotation.x, -1.38, this.sit);
    this.legR.rotation.x = lerp(this.legR.rotation.x, -1.38, this.sit);
    this.legL.rotation.z = -0.22 * this.sit;
    this.legR.rotation.z = 0.22 * this.sit;
    this.legL.position.z = this.legR.position.z = 0.14 * this.sit;
    this.legL.position.y = 0.37 + Math.max(0, c) * 0.05 * this.move + bounce * 0.4 - this.sit * 0.2;
    this.legR.position.y = 0.37 + Math.max(0, -c) * 0.05 * this.move + bounce * 0.4 - this.sit * 0.2;

    const armSwing = lerp(0.55, 1.05, this.run) * this.move;
    this.glide = damp(this.glide, pose.gliding ? 1 : 0, 9, dt);
    if (this.glide > 0.01 && !this.leaf) this.tilt.add((this.leaf = makeLeaf()));
    if (this.leaf) {
      this.leaf.visible = this.glide > 0.01;
      this.leaf.scale.setScalar(this.glide);
      this.leaf.rotation.z = Math.sin(t * 2.1) * 0.08;
      this.leaf.rotation.x = 0.1 + Math.sin(t * 1.6) * 0.05;
    }
    const lift = this.air * 1.15 + this.run * 0.18 + this.swim * 0.9 + this.glide * 1.5;
    const idleSway = Math.sin(t * 1.9) * 0.04 * (1 - this.move);
    this.armL.rotation.x = -s * armSwing + Math.sin(t * 4) * 0.5 * this.swim;
    this.armR.rotation.x = s * armSwing - Math.sin(t * 4) * 0.5 * this.swim;
    this.armL.rotation.x -= 0.35 * this.sit;
    this.armR.rotation.x -= 0.35 * this.sit;
    this.armL.rotation.z = -(0.14 + lift + idleSway + this.breath * 0.12);
    this.armR.rotation.z = 0.14 + lift + idleSway + this.breath * 0.12;

    // blinking and a glance into turns
    this.blinkIn -= dt;
    if (this.blinkIn <= 0) {
      this.blink = 0.15;
      this.blinkIn = 1.8 + Math.random() * 3.8;
      if (Math.random() < 0.2) this.blinkIn = 0.3;
    }
    this.blink = Math.max(0, this.blink - dt);
    const lid = Math.min(this.blink > 0 ? 1 - Math.sin((this.blink / 0.15) * Math.PI) * 0.92 : 1, 1 - this.eyesShut * 0.9);
    this.eyes.scale.y = lid;
    this.eyes.position.y = (1 - lid) * 0.1;
    const glance = this.move > 0.1 ? 0 : Math.sin(t * 0.43) * Math.sin(t * 0.17 + 1) * 0.6;
    this.lookX = damp(this.lookX, clamp(pose.turnRate * 0.25 + glance, -1, 1), 6, dt);
    // catchlights sit on the side of each eye the sun is on, and dim when it is gone
    const sunSide = clamp(SUN_DIR.x * Math.cos(pose.yaw) - SUN_DIR.z * Math.sin(pose.yaw), -1, 1);
    for (const g of this.glints) g.position.set(0.006 + sunSide * 0.036, 0.022 + clamp(SUN_DIR.y, 0, 1) * 0.026, 0.05);
    this.shine.color.setScalar(0.5 + 0.5 * globalUniforms.uDayLight.value);
    this.pupils[0].position.x = 0.05 + this.lookX * 0.026;
    this.pupils[1].position.x = -0.05 + this.lookX * 0.026;

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

const blobGeo = new THREE.PlaneGeometry(1.7, 1.7);
let blobTex: THREE.CanvasTexture | null = null;
function blobTexture(): THREE.CanvasTexture {
  if (blobTex) return blobTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(10,30,20,0.9)');
  g.addColorStop(0.45, 'rgba(10,30,20,0.5)');
  g.addColorStop(1, 'rgba(10,30,20,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return (blobTex = new THREE.CanvasTexture(c));
}

/**
 * Shell fur: the body surface repeated in thin layers. Strands gather into
 * a couple of hundred pointed tufts — long and upswept on the crown, hanging
 * down the sides, clipped short across the face so the eyes and smile stay clear.
 */
type ColorAt = (d: THREE.Vector3, out: THREE.Color) => THREE.Color;

interface FurBase {
  attrs: Record<string, THREE.BufferAttribute>;
  index: THREE.BufferAttribute;
  dirs: Float32Array;
  tone: Float32Array;
  count: number;
  shells: number;
}
const furBases = new Map<string, FurBase>();

/** Fur shells share their shape between Calmlings; only the colours differ. */
function buildFur(shells: number, hero: boolean, colorAt: ColorAt): THREE.BufferGeometry {
  const key = `${shells}${hero}`;
  let fb = furBases.get(key);
  if (!fb) furBases.set(key, (fb = furBase(shells, hero)));
  const col = new Float32Array(fb.count * fb.shells * 3);
  const d = new THREE.Vector3();
  const c = new THREE.Color();
  for (let i = 0; i < fb.count; i++) {
    colorAt(d.fromArray(fb.dirs, i * 3), c);
    const t = fb.tone[i];
    for (let s = 0; s < fb.shells; s++) {
      const o = (s * fb.count + i) * 3;
      col[o] = c.r * t;
      col[o + 1] = c.g * t;
      col[o + 2] = c.b * t;
    }
  }
  const g = new THREE.BufferGeometry();
  for (const [name, attr] of Object.entries(fb.attrs)) g.setAttribute(name, attr);
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(fb.index);
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1.1);
  return g;
}

function furBase(SHELLS: number, hero: boolean): FurBase {
  const rnd = mulberry32(7);
  const base = hero ? new THREE.SphereGeometry(1, 80, 54) : new THREE.SphereGeometry(1, 46, 30);
  const bp = base.attributes.position;
  const count = bp.count;

  // tuft centres, evenly spread then jittered
  const TUFTS = 78;
  const golden = Math.PI * (3 - Math.sqrt(5));
  const tuftDir: THREE.Vector3[] = [];
  const tuftTip: THREE.Vector3[] = [];
  const tuftLen: number[] = [];
  const surface = (d: THREE.Vector3, out: THREE.Vector3): THREE.Vector3 => {
    const pear = 1 - 0.07 * d.y;
    return out.set(d.x * RX * pear, d.y * RY, d.z * RZ * pear);
  };
  const faceMask = (d: THREE.Vector3): number =>
    smoothstep(0.3, 0.72, d.z) * smoothstep(0.88, 0.58, d.y);
  const flow = new THREE.Vector3();
  for (let i = 0; i < TUFTS; i++) {
    const y = 1 - ((i + 0.5) / TUFTS) * 2;
    const r = Math.sqrt(1 - y * y);
    const a = i * golden;
    const d = new THREE.Vector3(Math.cos(a) * r + (rnd() - 0.5) * 0.1, y + (rnd() - 0.5) * 0.1, Math.sin(a) * r + (rnd() - 0.5) * 0.1).normalize();
    const crown = smoothstep(0.5, 0.95, d.y);
    const skirt = smoothstep(-0.25, -0.8, d.y);
    const len = lerp(0.26, 0.4, rnd()) * (1 + crown * 0.2) * (1 - skirt * 0.5);
    // fur flows out and down the sides and sweeps up into a quiff on top
    flow.copy(d);
    flow.y += lerp(-0.28, 0.6, crown);
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
    const peak = 1 - smoothstep(0, 0.36, ang);
    const face = faceMask(d);
    const l = lerp(0.07 + 0.035 * peak, 0.034, face);
    tip.copy(p).addScaledVector(n, l);
    const pull = 0.0;
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
    }
    for (let k = 0; k < baseIndex.length; k++) index[s * baseIndex.length + k] = baseIndex[k] + o;
  }
  return {
    attrs: {
      position: new THREE.BufferAttribute(pos, 3),
      normal: new THREE.BufferAttribute(nor, 3),
      aDir: new THREE.BufferAttribute(dir, 3),
      aLean: new THREE.BufferAttribute(lean, 3),
      aFur: new THREE.BufferAttribute(fur, 2),
    },
    index: new THREE.BufferAttribute(index, 1),
    dirs: D,
    tone,
    count,
    shells: SHELLS,
  };
}

/**
 * The bold, pointed tufts that give a Calmling its outline: broad flattened
 * flames lying over one another like feathers. They sweep up on the crown,
 * out and slightly down on the sides, and leave the face clear.
 */
const TUFT_STYLES = {
  spiky: { count: 190, len: [0.24, 0.38], width: [0.12, 0.17], side: -0.42, crown: 0.45 },
  shaggy: { count: 210, len: [0.3, 0.46], width: [0.11, 0.15], side: -0.85, crown: 0.05 },
  fluffy: { count: 270, len: [0.14, 0.22], width: [0.15, 0.2], side: -0.2, crown: 0.3 },
  smooth: { count: 140, len: [0.09, 0.14], width: [0.15, 0.19], side: -0.3, crown: 0.2 },
};
interface TuftBase {
  attrs: Record<string, THREE.BufferAttribute>;
  index: number[];
  /** per vertex: root direction xyz, distance along the tuft, tuft number, tone */
  meta: Float32Array;
}
const tuftBases = new Map<string, TuftBase>();

function buildTufts(style: keyof typeof TUFT_STYLES, colorAt: ColorAt, tip?: number, alt?: number): THREE.BufferGeometry {
  let tb = tuftBases.get(style);
  if (!tb) tuftBases.set(style, (tb = tuftBase(style)));
  const n = tb.meta.length / 6;
  const col = new Float32Array(n * 3);
  const d = new THREE.Vector3();
  const c = new THREE.Color();
  const tipC = tip !== undefined ? new THREE.Color(tip) : null;
  const altC = alt !== undefined ? new THREE.Color(alt) : null;
  for (let i = 0; i < n; i++) {
    const m = i * 6;
    const t = tb.meta[m + 3];
    if (altC && tb.meta[m + 4] % 2 === 1) c.copy(altC);
    else colorAt(d.fromArray(tb.meta, m), c);
    c.multiplyScalar(tb.meta[m + 5] * lerp(0.93, 1.13, t));
    if (tipC) c.lerp(tipC, smoothstep(0.3, 1, t) * 0.85);
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  }
  const g = new THREE.BufferGeometry();
  for (const [name, attr] of Object.entries(tb.attrs)) g.setAttribute(name, attr);
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(tb.index);
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1.2);
  return g;
}

function tuftBase(style: keyof typeof TUFT_STYLES): TuftBase {
  const S = TUFT_STYLES[style];
  const rnd = mulberry32(21);
  const COUNT = S.count;
  const meta: number[] = [];
  const RINGS = 6;
  const SIDES = 8;
  const pos: number[] = [];
  const nor: number[] = [];
  const tuft: number[] = [];
  const idx: number[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  const n = new THREE.Vector3();
  const root = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const side = new THREE.Vector3();
  const up = new THREE.Vector3();
  const centre = new THREE.Vector3();
  const p = new THREE.Vector3();
  const vn = new THREE.Vector3();
  for (let i = 0; i < COUNT; i++) {
    const y = 1 - ((i + 0.5) / COUNT) * 2;
    const r = Math.sqrt(1 - y * y);
    const a = i * golden;
    n.set(Math.cos(a) * r + (rnd() - 0.5) * 0.12, y + (rnd() - 0.5) * 0.12, Math.sin(a) * r + (rnd() - 0.5) * 0.12).normalize();
    const face = smoothstep(0.38, 0.7, n.z) * smoothstep(0.9, 0.62, n.y);
    if (face > 0.55) continue;
    const crown = smoothstep(0.35, 0.9, n.y);
    const skirt = smoothstep(-0.3, -0.8, n.y);
    const length = lerp(S.len[0], S.len[1], rnd()) * (1 + crown * 0.2) * (1 - skirt * 0.35) * (1 - face * 0.5);
    const width = lerp(S.width[0], S.width[1], rnd()) * (1 - face * 0.3);
    const pear = 1 - 0.07 * n.y;
    root.set(n.x * RX * pear, n.y * RY, n.z * RZ * pear).multiplyScalar(0.9);
    // sweep: up and out on the crown, out and a little down on the sides
    dir.copy(n).multiplyScalar(0.8);
    dir.y += lerp(S.side, S.crown, crown) - skirt * 0.2;
    dir.x += (rnd() - 0.5) * 0.3;
    dir.z += (rnd() - 0.5) * 0.3 - face * 0.5;
    dir.normalize();
    side.crossVectors(dir, n);
    if (side.lengthSq() < 1e-4) side.set(1, 0, 0);
    side.normalize();
    up.crossVectors(side, dir).normalize(); // roughly away from the body
    const curl = (rnd() - 0.3) * 0.22;
    const tone = 0.96 + rnd() * 0.07;
    const start = pos.length / 3;
    for (let k = 0; k <= RINGS; k++) {
      const t = k / RINGS;
      const radius = width * Math.pow(1 - t, 0.8) * (0.55 + 0.45 * Math.sin(Math.min(1, t * 2.2 + 0.25) * Math.PI * 0.5));
      // tips droop back toward the body a touch, like real fur
      centre.copy(root).addScaledVector(dir, length * t).addScaledVector(up, -curl * length * t * t).addScaledVector(n, 0.05 * Math.sin(t * Math.PI));
      for (let j = 0; j < SIDES; j++) {
        const ang = (j / SIDES) * Math.PI * 2;
        const cx = Math.cos(ang);
        const cy = Math.sin(ang);
        p.copy(centre).addScaledVector(side, cx * radius).addScaledVector(up, cy * radius * 0.5);
        pos.push(p.x, p.y, p.z);
        vn.copy(side).multiplyScalar(cx * 0.5).addScaledVector(up, cy).multiplyScalar(0.3).addScaledVector(n, 0.9).normalize();
        nor.push(vn.x, vn.y, vn.z);
        meta.push(n.x, n.y, n.z, t, i, tone);
        tuft.push(t, ang + i);
      }
    }
    for (let k = 0; k < RINGS; k++) {
      for (let j = 0; j < SIDES; j++) {
        const a0 = start + k * SIDES + j;
        const a1 = start + k * SIDES + ((j + 1) % SIDES);
        idx.push(a0, a1, a0 + SIDES, a1, a1 + SIDES, a0 + SIDES);
      }
    }
  }
  return {
    attrs: {
      position: new THREE.Float32BufferAttribute(pos, 3),
      normal: new THREE.Float32BufferAttribute(nor, 3),
      aTuft: new THREE.Float32BufferAttribute(tuft, 2),
    },
    index: idx,
    meta: Float32Array.from(meta),
  };
}

// ------------------------------------------------------------------ extras

const mat = (color: number, extra: THREE.MeshStandardMaterialParameters = {}): THREE.MeshStandardMaterial =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra });

/** A point on the body surface (pushed out by `lift`) for a direction. */
function onBody(x: number, y: number, z: number, lift = 1): THREE.Vector3 {
  const d = new THREE.Vector3(x, y, z).normalize();
  const pear = 1 - 0.07 * d.y;
  return new THREE.Vector3(d.x * RX * pear, d.y * RY, d.z * RZ * pear).multiplyScalar(lift);
}

function antler(color: number, side: number): THREE.Group {
  const g = new THREE.Group();
  const m = mat(color);
  const seg = (from: [number, number, number], to: [number, number, number], r: number): void => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.6, r, a.distanceTo(b), 7).translate(0, a.distanceTo(b) / 2, 0), m);
    mesh.position.copy(a);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    mesh.castShadow = true;
    g.add(mesh);
  };
  seg([0, 0, 0], [0.1 * side, 0.26, 0], 0.035);
  seg([0.1 * side, 0.26, 0], [0.24 * side, 0.46, 0.02], 0.028);
  seg([0.06 * side, 0.15, 0], [-0.07 * side, 0.34, 0.03], 0.024);
  seg([0.16 * side, 0.34, 0], [0.34 * side, 0.36, 0], 0.022);
  seg([0.2 * side, 0.4, 0.01], [0.16 * side, 0.58, 0], 0.02);
  return g;
}

/** Hats, ears, antlers, glasses and the other things individual Calmlings wear. */
function addExtras(
  look: CalmlingLook,
  has: (x: string) => boolean,
  body: THREE.Group,
  armL: THREE.Group,
  armR: THREE.Group,
  legL: THREE.Group,
  legR: THREE.Group,
  smile: THREE.Mesh,
): void {
  const add = (mesh: THREE.Object3D, parent: THREE.Object3D = body): void => {
    mesh.traverse((o) => ((o as THREE.Mesh).castShadow = true));
    parent.add(mesh);
  };
  const face = (mesh: THREE.Mesh, x: number, y: number, z: number, lift: number): void => {
    mesh.position.copy(onBody(x, y, z, lift));
    mesh.lookAt(mesh.position.clone().multiplyScalar(3));
    add(mesh);
  };

  if (has('blush')) {
    for (const s of [-1, 1]) {
      const m = new THREE.Mesh(new THREE.CircleGeometry(0.075, 16), new THREE.MeshBasicMaterial({ color: 0xff8fa8, transparent: true, opacity: 0.55, depthWrite: false }));
      face(m, s * 0.62, -0.02, 0.78, 1.13);
    }
  }
  if (has('openSmile')) {
    smile.visible = false;
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).scale(0.085, 0.075, 0.03), mat(0x8a2338));
    m.position.copy(onBody(0, -0.2, 1, 1.12));
    add(m);
  }
  if (has('lashes')) {
    for (const s of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const m = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.1, 5).translate(0, 0.05, 0), mat(0x1a1a22));
        m.position.set(s * (0.25 + i * 0.045), 0.36 - i * 0.03, 0.4 - i * 0.03);
        m.rotation.z = -s * (0.5 + i * 0.35);
        add(m);
      }
    }
  }
  if (has('brows')) {
    for (const s of [-1, 1]) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8).scale(0.13, 0.045, 0.06), mat(0xe9e9ee));
      m.position.set(s * 0.19, 0.4, 0.42);
      m.rotation.z = -s * 0.25;
      add(m);
    }
  }
  if (has('catEars')) {
    for (const s of [-1, 1]) {
      const ear = new THREE.Group();
      ear.add(new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.34, 14).scale(1, 1, 0.55), mat(0x8a5fc8)));
      const inner = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.22, 12).scale(1, 1, 0.4), mat(0xf7a8d8));
      inner.position.set(0, -0.03, 0.05);
      ear.add(inner);
      ear.position.set(s * 0.33, 0.56, 0.02);
      ear.rotation.z = -s * 0.42;
      add(ear);
    }
  }
  if (has('smallEars')) {
    for (const s of [-1, 1]) {
      const m = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.24, 10).scale(1, 1, 0.5), mat(look.fur));
      m.position.set(s * 0.5, 0.36, 0);
      m.rotation.z = -s * 1.15;
      add(m);
    }
  }
  if (has('antlers') || has('antlersPale')) {
    for (const s of [-1, 1]) {
      const a = antler(has('antlers') ? 0x8a5a36 : 0xf0e2b0, s);
      a.position.set(s * 0.2, 0.5, 0);
      add(a);
    }
  }
  if (has('partyHat')) {
    const hat = new THREE.Group();
    hat.add(new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.44, 20).translate(0, 0.22, 0), mat(0x8a55d8, { emissive: 0x2a1060 })));
    const pom = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 10), mat(0xf0483a));
    pom.position.y = 0.46;
    hat.add(pom);
    for (let i = 0; i < 7; i++) {
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 5), mat([0xffd23c, 0x6fe0ff, 0xff8fd0][i % 3]));
      const a = i * 2.4;
      const h = 0.06 + (i % 4) * 0.08;
      dot.position.set(Math.cos(a) * 0.17 * (1 - h / 0.44), h, Math.sin(a) * 0.17 * (1 - h / 0.44));
      hat.add(dot);
    }
    hat.position.set(0.06, 0.52, 0.02);
    hat.rotation.z = -0.16;
    add(hat);
  }
  if (has('hood')) {
    const navy = mat(0x2f2f8f, { side: THREE.DoubleSide });
    const open = 1.75;
    const hood = new THREE.Mesh(new THREE.SphereGeometry(1, 30, 18, Math.PI / 2 + open / 2, Math.PI * 2 - open, 0, Math.PI * 0.6).scale(RX * 1.34, RY * 1.36, RZ * 1.36), navy);
    hood.position.y = 0.03;
    add(hood);
    const cape = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.74, 0.66, 26, 1, true, open / 2, Math.PI * 2 - open), navy);
    cape.position.y = -0.42;
    add(cape);
  }
  if (has('glasses')) {
    const gold = mat(0xd9a441, { metalness: 0.6, roughness: 0.35 });
    for (const s of [-1, 1]) {
      const m = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.014, 8, 26), gold);
      m.position.set(s * 0.17, 0.2, 0.52);
      m.rotation.y = s * 0.28;
      add(m);
    }
  }
  if (has('moustache')) {
    for (const s of [-1, 1]) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10).scale(0.15, 0.055, 0.06), mat(0xb5622a));
      m.position.set(s * 0.12, -0.02, 0.5);
      m.rotation.z = s * 0.35;
      add(m);
    }
  }
  if (has('heart')) {
    const sh = new THREE.Shape();
    sh.moveTo(0, -0.1);
    sh.bezierCurveTo(-0.16, 0.0, -0.13, 0.13, 0, 0.05);
    sh.bezierCurveTo(0.13, 0.13, 0.16, 0.0, 0, -0.1);
    const m = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.02, bevelEnabled: false }), mat(0xf79ab0, { emissive: 0x5a1a2a }));
    m.position.copy(onBody(0, -0.42, 1, 1.13));
    m.rotation.x = 0.35;
    add(m);
  }
  if (has('cracks')) {
    const gold = mat(0xffc92e, { emissive: 0xffa800, emissiveIntensity: 1.6 });
    const rnd = mulberry32(55);
    for (let k = 0; k < 9; k++) {
      let az = rnd() * Math.PI * 2;
      let el = (rnd() - 0.4) * 1.6;
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i < 7; i++) {
        pts.push(onBody(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el), 1.2));
        az += (rnd() - 0.5) * 0.5;
        el += (rnd() - 0.5) * 0.5 - 0.12;
      }
      add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 18, 0.011, 5), gold));
    }
  }
  if (has('patches')) {
    const rnd = mulberry32(91);
    for (let k = 0; k < 5; k++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.18), mat([0x8a5a36, 0xc49a62, 0x6f4a2c][k % 3], { side: THREE.DoubleSide }));
      const az = rnd() * Math.PI * 2;
      face(m, Math.sin(az), -0.25 - rnd() * 0.5, Math.cos(az), 1.16);
      m.rotateZ(rnd() * 2);
    }
  }
  if (has('sparkles')) {
    const rnd = mulberry32(13);
    const sm = mat(0xffffff, { emissive: 0xcfe8ff, emissiveIntensity: 2.2 });
    for (let k = 0; k < 26; k++) {
      const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.012 + rnd() * 0.016), sm);
      const az = rnd() * Math.PI * 2;
      m.position.copy(onBody(Math.sin(az), rnd() * 1.3 - 0.9, Math.cos(az), 1.2 + rnd() * 0.1));
      add(m);
    }
  }
  if (has('stick')) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.038, 1.15, 8), mat(0x8a5a36));
    m.position.set(0.02, -0.02, 0.1);
    m.rotation.x = 0.1;
    add(m, armR);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), mat(0x7a4d2c));
    knob.position.set(0.02, 0.56, 0.16);
    add(knob, armR);
  }
  if (has('pouch')) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10).scale(1, 1.1, 0.9), mat(0x7fb89a));
    m.position.set(0, -0.44, 0.03);
    add(m, armL);
  }
  if (has('stripes')) {
    const dark = mat(0x5a2a10);
    for (const limb of [armL, armR]) {
      for (const y of [-0.1, -0.2, -0.3]) {
        const m = new THREE.Mesh(new THREE.TorusGeometry(0.104, 0.016, 6, 18), dark);
        m.rotation.x = Math.PI / 2;
        m.position.y = y;
        add(m, limb);
      }
    }
    for (const limb of [legL, legR]) {
      const m = new THREE.Mesh(new THREE.TorusGeometry(0.163, 0.018, 6, 20), dark);
      m.rotation.x = Math.PI / 2;
      m.position.y = -0.14;
      add(m, limb);
    }
  }
}

/** The big leaf a Calmling holds overhead to glide. */
function makeLeaf(): THREE.Group {
  const g = new THREE.Group();
  const blade = new THREE.CircleGeometry(1, 28);
  const p = blade.attributes.position;
  const col = new Float32Array(p.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    // a pointed leaf, domed like an umbrella, with a pale midrib
    const taper = 1 - 0.55 * Math.max(0, y) ** 2;
    p.setXYZ(i, x * 0.95 * taper, -(x * x + y * y) * 0.34 + Math.abs(x) * 0.06, y * 1.25);
    c.set(0x4fb04a).lerp(new THREE.Color(0xa6e06a), Math.max(0, 1 - Math.abs(x) * 5) * 0.7 + (x * x + y * y) * 0.25);
    col.set([c.r, c.g, c.b], i * 3);
  }
  blade.setAttribute('color', new THREE.BufferAttribute(col, 3));
  blade.computeVertexNormals();
  const leaf = new THREE.Mesh(blade, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  leaf.castShadow = true;
  leaf.position.y = 0.62;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.028, 0.62, 6).translate(0, 0.31, 0), new THREE.MeshLambertMaterial({ color: 0x3f9a40 }));
  g.add(leaf, stem);
  g.position.set(0, 1.42, 0.02);
  return g;
}
