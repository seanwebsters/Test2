import * as THREE from 'three';
import { angleDelta, damp } from '../core/math';
import { CalmlingModel, type CalmlingAct, type CalmlingPose } from '../player/CalmlingModel';
import type { Player } from '../player/Player';
import type { Island } from '../world/islandMap';
import type { Resident } from './roster';

const WALK = 2.0;
const FLOAT_DEPTH = 0.62;

/** Something calm a Calmling does on the spot for a while. */
interface Activity {
  /** reads after "<name> is …" */
  label: string;
  act?: CalmlingAct;
  sit?: boolean;
  closed?: boolean;
  /** breathes slowly and deeply while at it */
  breathe?: boolean;
  spin?: boolean;
  /** a slow, noticing walk instead of staying put */
  stroll?: boolean;
  prop?: 'pot' | 'stones' | 'bed' | 'leaves' | 'dandelion';
}

/** Each Calmling's own way of being calm, after what their name means. */
const SIGNATURE: Record<string, Activity> = {
  apricus: { label: 'soaking up the sun', act: 'lie', closed: true },
  dadirri: { label: 'listening, very quietly', sit: true, act: 'listen', closed: true },
  shu: { label: 'moving slowly, like water', act: 'stretch' },
  kupuna: { label: 'telling an old story', sit: true, act: 'tend' },
  gokotta: { label: 'listening for the first birdsong', sit: true, act: 'listen' },
  morgenfrisk: { label: 'stretching awake', act: 'stretch' },
  komorebi: { label: 'watching light through the leaves', act: 'reach' },
  extrawunsch: { label: 'making a wish on a dandelion', sit: true, act: 'tend', prop: 'dandelion' },
  genkaku: { label: 'cloud-watching', act: 'lie' },
  shinrin: { label: 'forest bathing', stroll: true },
  psithuros: { label: 'feeling the wind', act: 'open', closed: true },
  misogi: { label: 'washing the day away', act: 'open', closed: true, breathe: true },
  desbundar: { label: 'dancing, just because', act: 'dance', spin: true },
  kintsugi: { label: 'mending a pot with gold', sit: true, act: 'tend', prop: 'pot' },
  harmonia: { label: 'balancing stones', sit: true, act: 'tend', prop: 'stones' },
  meraki: { label: 'tending a flower bed', sit: true, act: 'tend', prop: 'bed' },
  mangata: { label: 'watching the light on the water', sit: true },
  wabisabi: { label: 'arranging fallen leaves', sit: true, act: 'tend', prop: 'leaves' },
};

/** Things any of them might do between times. */
const GENERAL: Activity[] = [
  { label: 'sitting quietly', sit: true },
  { label: 'taking slow, deep breaths', sit: true, closed: true, breathe: true },
  { label: 'having a good stretch', act: 'stretch' },
  { label: 'lying in the grass', act: 'lie', closed: true },
  { label: 'cloud-watching', act: 'lie' },
  { label: 'feeling the breeze', act: 'open', closed: true },
  { label: 'listening to the island', sit: true, act: 'listen' },
];

function makeProp(kind: NonNullable<Activity['prop']>): THREE.Group {
  const g = new THREE.Group();
  const L = (c: number): THREE.MeshLambertMaterial => new THREE.MeshLambertMaterial({ color: c });
  const ball = new THREE.SphereGeometry(1, 12, 9);
  const orb = (mat: THREE.Material, sx: number, sy: number, sz: number, x: number, y: number, z: number): THREE.Mesh => {
    const m = new THREE.Mesh(ball, mat);
    m.scale.set(sx, sy, sz);
    m.position.set(x, y, z);
    m.castShadow = true;
    g.add(m);
    return m;
  };
  if (kind === 'pot') {
    orb(L(0xb5683a), 0.24, 0.26, 0.24, 0, 0.24, 0);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.1, 12), L(0xb5683a));
    neck.position.y = 0.5;
    g.add(neck);
    const gold = new THREE.MeshBasicMaterial({ color: 0xffd65a });
    for (let i = 0; i < 4; i++) {
      const seam = new THREE.Mesh(new THREE.TorusGeometry(0.245, 0.012, 5, 18, 1.6 + i * 0.3), gold);
      seam.position.y = 0.24;
      seam.rotation.set(i * 0.9, i * 1.7, i * 0.5);
      g.add(seam);
    }
  } else if (kind === 'stones') {
    [0.24, 0.19, 0.15, 0.11, 0.08].forEach((r, k) => orb(L([0x8d8a86, 0xb8b0a2, 0x77736e][k % 3]), r, r * 0.5, r * 0.85, (k % 2) * 0.02, 0.1 + k * 0.17 - k * k * 0.008, 0));
  } else if (kind === 'bed') {
    orb(L(0x6b4630), 0.6, 0.12, 0.45, 0, 0.03, 0).castShadow = false;
    for (let i = 0; i < 6; i++) {
      const x = -0.38 + (i % 3) * 0.38;
      const z = i < 3 ? -0.15 : 0.15;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 5), L(0x4f9a3a));
      stem.position.set(x, 0.25, z);
      g.add(stem);
      orb(L([0xff8fb8, 0xffd65a, 0xb9a0ff][i % 3]), 0.075, 0.075, 0.075, x, 0.42, z);
    }
  } else if (kind === 'leaves') {
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * Math.PI * 2;
      const leaf = orb(L([0xe8a13a, 0xd9603a, 0xf0c060, 0xb5683a][i % 4]), 0.11, 0.012, 0.06, Math.cos(a) * 0.42, 0.02, Math.sin(a) * 0.42);
      leaf.rotation.y = -a;
      leaf.castShadow = false;
    }
    orb(L(0x8d8a86), 0.07, 0.04, 0.07, 0, 0.03, 0);
  } else {
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.5, 5), L(0x6fae4a));
    stem.position.y = 0.25;
    g.add(stem);
    orb(new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 }), 0.11, 0.11, 0.11, 0, 0.56, 0).castShadow = false;
  }
  // everything stands on a flat stone, proud of the grass, so it can be seen from the path
  g.scale.setScalar(1.6);
  const slab = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.56, 0.3, 9), L(0x9a958e));
  slab.position.y = -0.14;
  slab.receiveShadow = true;
  g.add(slab);
  g.position.y = 0.42;
  const wrap = new THREE.Group();
  wrap.add(g);
  return wrap;
}

/** how long a wave hello lasts, in seconds */
const GREET = 2.8;

/** A resident Calmling: potters around home, greets you, and can tag along. */
export class Npc {
  readonly model: CalmlingModel;
  readonly pos = new THREE.Vector3();
  readonly home = new THREE.Vector3();
  yaw = 0;
  following = false;
  /** on the way back home after being a companion */
  returning = false;
  /** tucked away because it is the wrong time of day for them */
  absent = false;
  /** a place to go and sit for the evening (by the fire at the treehouse), and what to face there */
  gather: THREE.Vector3 | null = null;
  gatherFace = new THREE.Vector3();
  /** what they are doing just now, for the game to mention (null while pottering) */
  doing: string | null = null;
  /** the little thing they keep busy with, if they have one */
  readonly prop: THREE.Group | null;
  private now: Activity | null = null;
  private nowFor = 0;
  private propAt = new THREE.Vector3();
  private target = new THREE.Vector3();
  private wait = 1;
  private speed = 0;
  private accel = new THREE.Vector3();
  private pose: CalmlingPose;
  private greeted = false;
  private greetT = 0;
  private seed: number;

  constructor(readonly who: Resident, private island: Island, index: number) {
    this.model = new CalmlingModel(who.look, false);
    const sig = SIGNATURE[who.id];
    this.prop = sig?.prop ? makeProp(sig.prop) : null;
    this.seed = index * 7.13;
    // nudge the home spot onto dry, gentle ground if the map put it somewhere awkward
    let [x, z] = who.home;
    const grad = { x: 0, z: 0 };
    for (let i = 0; i < 60; i++) {
      const h = island.heightAt(x, z);
      if (h > island.waterLevelAt(x, z) + 0.6 && island.gradientAt(x, z, grad) < 0.45) break;
      const a = i * 2.4;
      x = who.home[0] + Math.cos(a) * (2 + i * 0.7);
      z = who.home[1] + Math.sin(a) * (2 + i * 0.7);
    }
    this.home.set(x, island.heightAt(x, z), z);
    this.pos.copy(this.home);
    this.target.copy(this.home);
    this.yaw = index * 1.7;
    this.pose = {
      speed: 0, walkSpeed: 3.6, runSpeed: 7.8, grounded: true, swimming: false, verticalSpeed: 0,
      turnRate: 0, accel: this.accel, yaw: 0, sitting: false, breath: 0, gliding: false,
    };
    this.placeProp();
    this.sync();
  }

  private placeProp(): void {
    const a = this.seed * 1.3;
    const x = this.home.x + Math.cos(a) * 1.05;
    const z = this.home.z + Math.sin(a) * 1.05;
    this.propAt.set(x, this.island.heightAt(x, z), z);
    this.prop?.position.copy(this.propAt);
  }

  /** Settle somewhere new for good. */
  moveHome(x: number, z: number): void {
    this.home.set(x, this.island.heightAt(x, z), z);
    this.pos.copy(this.home);
    this.target.copy(this.home);
    this.placeProp();
    this.sync();
  }

  private dry(x: number, z: number): boolean {
    return this.island.heightAt(x, z) > this.island.waterLevelAt(x, z) + 0.3;
  }

  update(dt: number, time: number, player: Player, camera: THREE.Vector3, hour: number): void {
    const w = this.who.hours;
    const out = !w || (w[0] <= w[1] ? hour >= w[0] && hour < w[1] : hour >= w[0] || hour < w[1]);
    this.absent = !out && !this.following;
    if (this.absent) {
      this.pos.copy(this.home);
      this.model.root.visible = false;
      return;
    }
    const toPlayer = Math.hypot(player.pos.x - this.pos.x, player.pos.z - this.pos.z);
    // noticing you: the first time you come near on a visit, they look up, turn and wave
    if (toPlayer > 16) this.greeted = false;
    else if (toPlayer < 9 && !this.greeted && !this.following && !this.gather) {
      this.greeted = true;
      this.greetT = GREET;
      this.model.impulse(1.1);
    }
    if (this.greetT > 0) this.greetT -= dt;
    let want = 0;
    let faceX = 0;
    let faceZ = 0;
    let sitting = false;
    let act: CalmlingAct | null = null;
    let closed = false;
    let breathe = false;
    const busy = !this.following && !this.gather && !this.returning && this.now;
    const there = !!this.now && (!this.now.prop || Math.hypot(this.home.x - this.pos.x, this.home.z - this.pos.z) < 0.8);

    if (this.following) {
      // trot along just behind one shoulder
      const side = Math.sin(time * 0.23 + this.seed) > 0 ? 1 : -1;
      const bx = player.pos.x - Math.sin(player.yaw) * 1.5 + Math.cos(player.yaw) * 1.1 * side;
      const bz = player.pos.z - Math.cos(player.yaw) * 1.5 - Math.sin(player.yaw) * 1.1 * side;
      const d = Math.hypot(bx - this.pos.x, bz - this.pos.z);
      if (toPlayer > 45) {
        this.pos.set(bx, 0, bz); // left far behind: catch up in one hop
      } else if (d > 0.9 && toPlayer > 1.7) {
        want = Math.min(8.6, 1.5 + d * 1.8);
        faceX = bx - this.pos.x;
        faceZ = bz - this.pos.z;
      } else if (player.sitting) {
        sitting = true; // sit down beside you and breathe along
      }
      if (want === 0) {
        faceX = Math.sin(player.yaw);
        faceZ = Math.cos(player.yaw);
      }
    } else if (this.gather) {
      const d = Math.hypot(this.gather.x - this.pos.x, this.gather.z - this.pos.z);
      if (d > 70 && toPlayer > 70) {
        this.pos.copy(this.gather); // nobody is watching: just be there
      } else if (d > 0.7) {
        want = Math.min(4.4, 1 + d * 1.5);
        faceX = this.gather.x - this.pos.x;
        faceZ = this.gather.z - this.pos.z;
      } else {
        sitting = true;
        faceX = this.gatherFace.x - this.pos.x;
        faceZ = this.gatherFace.z - this.pos.z;
      }
    } else if (busy && there && !this.now!.stroll) {
      // absorbed in something calm, even with a visitor standing by
      const a = this.now!;
      this.nowFor -= dt;
      if (this.nowFor <= 0) this.now = null;
      sitting = !!a.sit;
      act = a.act ?? null;
      closed = !!a.closed;
      breathe = !!a.breathe;
      if (a.spin) this.yaw += dt * 1.6;
      else if (a.prop) {
        faceX = this.propAt.x - this.pos.x;
        faceZ = this.propAt.z - this.pos.z;
      }
    } else if (toPlayer < 4.2 && !this.returning && !busy) {
      // stop and look at the visitor
      faceX = player.pos.x - this.pos.x;
      faceZ = player.pos.z - this.pos.z;
    } else {
      if (this.returning) {
        this.target.copy(this.home);
        if (Math.hypot(this.home.x - this.pos.x, this.home.z - this.pos.z) < 1.2) this.returning = false;
        else if (toPlayer > 60) this.pos.copy(this.home); // out of sight: just be home
      }
      const d = Math.hypot(this.target.x - this.pos.x, this.target.z - this.pos.z);
      if (d < 0.5) {
        this.wait -= dt;
        if (this.wait <= 0) {
          // pick a new spot to potter to, staying on dry land near home
          for (let i = 0; i < 6; i++) {
            const a = Math.random() * Math.PI * 2;
            const r = 2 + Math.random() * 6;
            const x = this.home.x + Math.cos(a) * r;
            const z = this.home.z + Math.sin(a) * r;
            if (this.dry(x, z)) {
              this.target.set(x, 0, z);
              break;
            }
          }
          this.wait = 2 + Math.random() * 6;
          // most pauses turn into a while spent doing something calm: usually their own thing
          if (!this.returning && Math.random() < 0.7) {
            const sig = SIGNATURE[this.who.id];
            this.now = sig && Math.random() < 0.62 ? sig : GENERAL[Math.floor(Math.random() * GENERAL.length)];
            this.nowFor = 16 + Math.random() * 26;
            if (this.now.prop) this.target.copy(this.home); // their things are kept at home
            else if (!this.now.stroll) this.target.copy(this.pos);
          }
        }
      } else {
        want = this.returning ? 4.5 : this.now?.stroll ? 0.75 : this.now && !this.now.prop ? 0 : WALK;
        faceX = this.target.x - this.pos.x;
        faceZ = this.target.z - this.pos.z;
      }
    }

    if (this.greetT > 0 && !this.following && !this.gather) {
      // whatever they were doing waits a moment
      want = 0;
      faceX = player.pos.x - this.pos.x;
      faceZ = player.pos.z - this.pos.z;
      act = null;
      closed = false;
      breathe = false;
    }
    if (this.now?.stroll) {
      this.nowFor -= dt;
      if (this.nowFor <= 0) this.now = null;
    }
    if (this.following || this.gather || this.returning) this.now = null;
    // (with a prop, they are only 'doing' once they have walked back to it)
    this.doing = this.now && (!this.now.prop || Math.hypot(this.home.x - this.pos.x, this.home.z - this.pos.z) < 0.8) ? this.now.label : null;
    const before = this.speed;
    this.speed = damp(this.speed, want, 6, dt);
    if (faceX !== 0 || faceZ !== 0) this.yaw += angleDelta(this.yaw, Math.atan2(faceX, faceZ)) * (1 - Math.exp(-7 * dt));
    if (this.speed > 0.05) {
      this.pos.x += Math.sin(this.yaw) * this.speed * dt;
      this.pos.z += Math.cos(this.yaw) * this.speed * dt;
    }
    const ground = this.island.heightAt(this.pos.x, this.pos.z);
    const floatY = this.island.waterLevelAt(this.pos.x, this.pos.z) - FLOAT_DEPTH;
    const swimming = ground < floatY - 0.08;
    this.pos.y = swimming ? floatY : ground;

    // only animate the ones you can actually see
    const visible = Math.hypot(camera.x - this.pos.x, camera.z - this.pos.z) < 170;
    this.model.root.visible = visible;
    if (!visible) return;
    this.accel.set(Math.sin(this.yaw), 0, Math.cos(this.yaw)).multiplyScalar(dt > 0 ? (this.speed - before) / dt : 0);
    this.pose.speed = this.speed;
    this.pose.swimming = swimming;
    this.pose.grounded = !swimming;
    this.pose.yaw = this.yaw;
    this.pose.sitting = sitting;
    this.pose.breath = breathe ? 0.5 + 0.5 * Math.sin(time * 0.9 + this.seed) : sitting && this.following ? player.breath : 0;
    this.pose.act = act;
    this.pose.eyesClosed = closed;
    this.pose.wave = this.greetT > 0 ? Math.min(1, (GREET - this.greetT) * 4, this.greetT * 3) : 0;
    this.model.update(dt, this.pose);
    this.sync();
  }

  sync(): void {
    this.model.root.position.copy(this.pos);
    this.model.root.rotation.y = this.yaw;
  }
}
