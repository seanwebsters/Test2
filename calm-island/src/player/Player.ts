import * as THREE from 'three';
import { angleDelta, clamp, damp, lerp, smoothstep } from '../core/math';
import type { Input } from '../core/Input';
import type { Colliders } from '../world/Colliders';
import { SPAWN, type Island } from '../world/islandMap';
import { CalmlingModel, type CalmlingPose } from './CalmlingModel';

const WALK = 3.6;
const RUN = 7.8;
const SWIM = 3.0;
const GRAVITY = 26;
const JUMP = 9.2;
const RADIUS = 0.42;
const MAX_SLOPE = 1.15; // rise over run a Calmling can climb (~49°)
/** How far below the water surface a floating Calmling's feet sit. */
const FLOAT_DEPTH = 0.62;
const WORLD_LIMIT = 640;

/** The player's Calmling: movement, jumping, swimming and collisions. */
export class Player {
  readonly model = new CalmlingModel();
  readonly pos = new THREE.Vector3();
  readonly vel = new THREE.Vector3();
  yaw = 0.5;
  grounded = true;
  swimming = false;
  /** resting on the ground; any movement stands back up */
  sitting = false;
  /** floating down under a leaf: hold jump while falling */
  gliding = false;
  sleeping = false;
  /** drifting down from the sky at the very start: the leaf opens by itself */
  arriving = false;
  /** held still at this spot (indoors): no walking, no falling */
  hold: THREE.Vector3 | null = null;
  /** walking about indoors: a flat floor with walls, instead of the island */
  room: { x: number; z: number; hw: number; hd: number; cos: number; sin: number; y: number; solids: [number, number, number][] } | null = null;
  /** fruit effects: a faster run, and a longer, flatter glide */
  speedBoost = 1;
  glideBoost = false;
  /** 0..1 lung fill while breathing, read by the model */
  breath = 0;
  private moveTime = 0;
  private axis = { x: 0, y: 0 };
  private coyote = 0;
  private jumpBuffer = 0;
  private prevVel = new THREE.Vector3();
  private accel = new THREE.Vector3();
  private turnRate = 0;
  private grad = { x: 0, z: 0 };
  private pose: CalmlingPose;

  constructor(private island: Island, private colliders: Colliders) {
    this.pose = {
      speed: 0, walkSpeed: WALK, runSpeed: RUN, grounded: true, swimming: false,
      verticalSpeed: 0, turnRate: 0, accel: this.accel, yaw: 0, sitting: false, breath: 0, gliding: false,
    };
    this.teleport(SPAWN.x, SPAWN.z);
  }

  teleport(x: number, z: number, yaw = this.yaw): void {
    const ground = this.island.heightAt(x, z);
    const water = this.island.waterLevelAt(x, z);
    this.pos.set(x, Math.max(ground, water - FLOAT_DEPTH), z);
    this.vel.set(0, 0, 0);
    this.prevVel.set(0, 0, 0);
    this.yaw = yaw;
    this.grounded = true;
    this.swimming = false;
    this.sitting = false;
    this.sync();
  }

  /** Begin high above a point and float down to it. */
  dropFromSky(x: number, z: number, height: number): void {
    this.teleport(x, z, 0.5);
    this.pos.y += height;
    this.grounded = false;
    this.vel.set(0, -2, 0);
    this.arriving = true;
    this.sync();
  }

  /** Sit down where we stand. Returns false in the air or in water. */
  sit(): boolean {
    if (!this.grounded || this.swimming) return false;
    this.sitting = true;
    return true;
  }

  get speed(): number {
    return Math.hypot(this.vel.x, this.vel.z);
  }

  update(dt: number, input: Input, camYaw: number): void {
    const I = this.island;
    if (this.hold) {
      this.pos.copy(this.hold);
      this.vel.set(0, 0, 0);
      this.prevVel.set(0, 0, 0);
      this.accel.set(0, 0, 0);
      this.grounded = true;
      this.swimming = false;
      this.gliding = false;
      this.pose.speed = 0;
      this.pose.grounded = true;
      this.pose.swimming = false;
      this.pose.verticalSpeed = 0;
      this.pose.turnRate = 0;
      this.pose.yaw = this.yaw;
      this.pose.gliding = false;
      if (!this.sitting) this.sleeping = false;
      this.pose.sleeping = this.sleeping;
      this.pose.sitting = this.sitting;
      this.pose.breath = this.breath;
      this.model.update(dt, this.pose);
      this.sync();
      return;
    }
    let amount = input.moveAxis(this.axis);
    let jump = input.jumpPressed();
    if (this.sitting) {
      if (amount > 0.25 || jump || !this.grounded) this.sitting = false; // stand up first
      amount = 0;
      jump = false;
    }
    let wx = 0;
    let wz = 0;
    if (amount > 0.08) {
      wx = -Math.sin(camYaw) * this.axis.y + Math.cos(camYaw) * this.axis.x;
      wz = -Math.cos(camYaw) * this.axis.y - Math.sin(camYaw) * this.axis.x;
    }
    // sets off at a stroll and settles into a run if you keep going;
    // a gentle push on the thumb stick stays a walk
    this.moveTime = amount > 0.08 ? this.moveTime + dt : 0;
    const run = smoothstep(0.8, 1.7, this.moveTime) * smoothstep(0.6, 0.95, amount);
    const top = this.swimming ? SWIM : this.gliding ? (this.glideBoost ? 11 : 8.6) : lerp(WALK, RUN, run) * this.speedBoost;
    const hasInput = wx !== 0 || wz !== 0;
    // quick to start, a touch longer to settle: weighty but never sluggish
    const rate = this.swimming ? 4 : this.grounded ? (hasInput ? 11 : 9) : this.gliding ? 3.2 : 2.5;
    this.vel.x = damp(this.vel.x, wx * top, rate, dt);
    this.vel.z = damp(this.vel.z, wz * top, rate, dt);

    const room = this.room;
    if (room) {
      // indoors: stroll on the boards, kept in by the walls and nudged round the furniture
      this.vel.x *= 0.55;
      this.vel.z *= 0.55;
      this.pos.x += this.vel.x * dt;
      this.pos.z += this.vel.z * dt;
      for (const [sx, sz, sr] of room.solids) {
        const dx = this.pos.x - sx;
        const dz = this.pos.z - sz;
        const d = Math.hypot(dx, dz);
        if (d < sr + RADIUS && d > 1e-4) {
          this.pos.x = sx + (dx / d) * (sr + RADIUS);
          this.pos.z = sz + (dz / d) * (sr + RADIUS);
        }
      }
      const dx = this.pos.x - room.x;
      const dz = this.pos.z - room.z;
      const lx = clamp(dx * room.cos - dz * room.sin, -room.hw, room.hw);
      const lz = clamp(dx * room.sin + dz * room.cos, -room.hd, room.hd);
      this.pos.x = room.x + lx * room.cos + lz * room.sin;
      this.pos.z = room.z - lx * room.sin + lz * room.cos;
      this.pos.y = room.y;
      this.vel.y = 0;
      this.grounded = true;
      this.swimming = false;
    } else {
    // jumping, with a little forgiveness either side of the edge
    this.jumpBuffer = jump ? 0.14 : this.jumpBuffer - dt;
    this.coyote = this.grounded ? 0.12 : this.coyote - dt;
    if (this.jumpBuffer > 0 && this.coyote > 0 && !this.swimming) {
      this.vel.y = JUMP;
      this.model.impulse(2.4);
      this.grounded = false;
      this.coyote = 0;
      this.jumpBuffer = 0;
    }
    if (!this.grounded && !this.swimming && this.vel.y > 3 && !input.jumpHeld()) this.vel.y = damp(this.vel.y, 3, 14, dt);

    // steep ground: no climbing, and a gentle slide back down
    const steep = I.gradientAt(this.pos.x, this.pos.z, this.grad);
    if (this.grounded && steep > MAX_SLOPE) {
      const ux = this.grad.x / steep;
      const uz = this.grad.z / steep;
      const uphill = this.vel.x * ux + this.vel.z * uz;
      if (uphill > 0) {
        this.vel.x -= ux * uphill;
        this.vel.z -= uz * uphill;
      }
      const slide = Math.min(steep - MAX_SLOPE, 1.5) * 16 * dt;
      this.vel.x -= ux * slide;
      this.vel.z -= uz * slide;
    }

    // horizontal move, refusing steps that are really walls
    const from = this.pos.y;
    let nx = this.pos.x + this.vel.x * dt;
    let nz = this.pos.z + this.vel.z * dt;
    const stepLen = Math.hypot(nx - this.pos.x, nz - this.pos.z);
    if (stepLen > 1e-6 && (this.grounded || this.swimming)) {
      const rise = I.heightAt(nx, nz) - Math.max(from, I.heightAt(this.pos.x, this.pos.z));
      if (rise > Math.max(0.12, stepLen * 2.2) && !this.swimming) {
        // try sliding along each axis before giving up
        if (I.heightAt(nx, this.pos.z) - from <= stepLen * 2.2) nz = this.pos.z;
        else if (I.heightAt(this.pos.x, nz) - from <= stepLen * 2.2) nx = this.pos.x;
        else {
          nx = this.pos.x;
          nz = this.pos.z;
        }
      }
    }
    this.pos.x = nx;
    this.pos.z = nz;
    this.colliders.resolve(this.pos, RADIUS);

    // the sea is endless, but a soft current turns wanderers home
    const far = Math.hypot(this.pos.x, this.pos.z);
    if (far > WORLD_LIMIT) {
      this.pos.x *= WORLD_LIMIT / far;
      this.pos.z *= WORLD_LIMIT / far;
    }

    // vertical: walk, fall or float
    const ground = I.heightAt(this.pos.x, this.pos.z);
    const water = I.waterLevelAt(this.pos.x, this.pos.z);
    const floatY = water - FLOAT_DEPTH;
    const deep = ground < floatY - 0.08;
    if (this.swimming) {
      if (!deep) {
        this.swimming = false;
        this.grounded = true;
        this.pos.y = Math.max(ground, this.pos.y);
      } else {
        this.pos.y = damp(this.pos.y, floatY, 7, dt);
        this.vel.y = 0;
      }
    } else if (this.grounded) {
      if (deep && this.pos.y <= floatY + 0.1) {
        this.swimming = true;
        this.grounded = false;
      } else if (ground < this.pos.y - 0.45 - stepLen) {
        this.grounded = false; // walked off a ledge
        this.vel.y = 0;
      } else {
        this.pos.y = damp(this.pos.y, ground, 28, dt);
        this.vel.y = 0;
      }
    }
    if (!this.grounded && !this.swimming) {
      // under the leaf the fall eases to a gentle drift instead of accelerating
      this.gliding = (this.arriving || input.jumpHeld()) && this.vel.y < -0.8;
      // arriving: a long fall through the cloud, slowing to a float for the last stretch
      const sink = this.arriving ? (this.pos.y - ground > 26 ? -13 : -2.6) : this.glideBoost ? -0.55 : -1.5;
      if (this.gliding) this.vel.y = damp(this.vel.y, sink, this.arriving ? 2.2 : 6, dt);
      else this.vel.y -= GRAVITY * dt;
      this.pos.y += this.vel.y * dt;
      if (deep && this.pos.y <= floatY) {
        this.swimming = true;
        this.model.impulse(-1.2);
        this.pos.y = Math.max(this.pos.y, floatY - 0.5);
        this.vel.y = 0;
      } else if (this.pos.y <= ground) {
        this.pos.y = ground;
        this.grounded = true;
        this.model.impulse(-clamp(-this.vel.y * 0.28, 0.6, 3.2));
        this.vel.y = 0;
      }
    }

    }

    // face where we are going
    const sp = this.speed;
    const before = this.yaw;
    if (sp > 0.4 && hasInput) this.yaw += angleDelta(this.yaw, Math.atan2(this.vel.x, this.vel.z)) * (1 - Math.exp(-11 * dt));
    this.turnRate = damp(this.turnRate, dt > 0 ? angleDelta(before, this.yaw) / dt : 0, 10, dt);

    if (dt > 0) {
      this.accel.copy(this.vel).sub(this.prevVel).divideScalar(dt);
      this.accel.clampLength(0, 60);
    }
    this.prevVel.copy(this.vel);

    this.pose.speed = sp;
    this.pose.grounded = this.grounded;
    this.pose.swimming = this.swimming;
    this.pose.verticalSpeed = this.vel.y;
    this.pose.turnRate = this.turnRate;
    this.pose.yaw = this.yaw;
    if (this.grounded || this.swimming) {
      this.gliding = false;
      this.arriving = false;
    }
    this.pose.gliding = this.gliding;
    if (!this.sitting) this.sleeping = false;
    this.pose.sleeping = this.sleeping;
    this.pose.sitting = this.sitting;
    this.pose.breath = this.breath;
    this.model.update(dt, this.pose);
    this.sync();
  }

  private sync(): void {
    this.model.root.position.copy(this.pos);
    this.model.root.rotation.y = this.yaw;
  }
}
