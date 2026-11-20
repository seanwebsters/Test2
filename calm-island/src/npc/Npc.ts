import * as THREE from 'three';
import { angleDelta, damp } from '../core/math';
import { CalmlingModel, type CalmlingPose } from '../player/CalmlingModel';
import type { Player } from '../player/Player';
import type { Island } from '../world/islandMap';
import type { Resident } from './roster';

const WALK = 2.0;
const FLOAT_DEPTH = 0.62;

/** A resident Calmling: potters around home, greets you, and can tag along. */
export class Npc {
  readonly model: CalmlingModel;
  readonly pos = new THREE.Vector3();
  readonly home = new THREE.Vector3();
  yaw = 0;
  following = false;
  /** on the way back home after being a companion */
  returning = false;
  private target = new THREE.Vector3();
  private wait = 1;
  private speed = 0;
  private accel = new THREE.Vector3();
  private pose: CalmlingPose;
  private seed: number;

  constructor(readonly who: Resident, private island: Island, index: number) {
    this.model = new CalmlingModel(who.look, false);
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
    this.sync();
  }

  private dry(x: number, z: number): boolean {
    return this.island.heightAt(x, z) > this.island.waterLevelAt(x, z) + 0.3;
  }

  update(dt: number, time: number, player: Player, camera: THREE.Vector3): void {
    const toPlayer = Math.hypot(player.pos.x - this.pos.x, player.pos.z - this.pos.z);
    let want = 0;
    let faceX = 0;
    let faceZ = 0;
    let sitting = false;

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
    } else if (toPlayer < 4.2 && !this.returning) {
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
        }
      } else {
        want = this.returning ? 4.5 : WALK;
        faceX = this.target.x - this.pos.x;
        faceZ = this.target.z - this.pos.z;
      }
    }

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
    this.pose.breath = sitting ? player.breath : 0;
    this.model.update(dt, this.pose);
    this.sync();
  }

  sync(): void {
    this.model.root.position.copy(this.pos);
    this.model.root.rotation.y = this.yaw;
  }
}
