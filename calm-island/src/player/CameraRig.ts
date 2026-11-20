import * as THREE from 'three';
import { clamp, damp } from '../core/math';
import type { Input } from '../core/Input';
import type { Settings } from '../core/Settings';
import type { Island } from '../world/islandMap';
import type { Player } from './Player';

/** Orbiting third-person camera that follows softly and never dips underground. */
export class CameraRig {
  yaw = 0;
  pitch = 0.22;
  dist = 6.2;
  private curDist = 6.2;
  private target = new THREE.Vector3();
  private dir = new THREE.Vector3();
  private probe = new THREE.Vector3();
  private look = new THREE.Vector3();
  private fov = 50;

  constructor(readonly camera: THREE.PerspectiveCamera, private island: Island) {}

  snap(player: Player): void {
    this.target.copy(player.pos).setY(player.pos.y + 1.0);
    this.curDist = this.dist;
    this.place(player);
  }

  update(dt: number, input: Input, player: Player, settings: Settings): void {
    const sens = 0.0024 * settings.sensitivity;
    this.yaw -= input.dx * sens;
    this.pitch += input.dy * sens * (settings.invertY ? -1 : 1);
    const keyTurn = (input.down('ArrowLeft', 'KeyQ') ? 1 : 0) - (input.down('ArrowRight', 'KeyE') ? 1 : 0);
    const keyTilt = (input.down('ArrowUp') ? 1 : 0) - (input.down('ArrowDown') ? 1 : 0);
    this.yaw += keyTurn * 1.9 * dt;
    this.pitch += keyTilt * 1.1 * dt;
    this.pitch = clamp(this.pitch, -0.4, 1.35);
    this.dist = clamp(this.dist * Math.exp(input.wheel * 0.0012), 2.8, 18);

    // follow tightly sideways, a little lazily in height so hops feel bouncy
    const k = 1 - Math.exp(-14 * dt);
    this.target.x += (player.pos.x - this.target.x) * k;
    this.target.z += (player.pos.z - this.target.z) * k;
    this.target.y = damp(this.target.y, player.pos.y + 1.0, player.grounded ? 9 : 5, dt);

    const running = clamp((player.speed - 4) / 4);
    this.fov = damp(this.fov, 50 + running * 5, 4, dt);
    if (Math.abs(this.camera.fov - this.fov) > 0.01) {
      this.camera.fov = this.fov;
      this.camera.updateProjectionMatrix();
    }
    this.place(player, dt);
  }

  private floor(x: number, z: number): number {
    return Math.max(this.island.heightAt(x, z), this.island.waterLevelAt(x, z)) + 0.45;
  }

  private place(_player: Player, dt = 0): void {
    const cp = Math.cos(this.pitch);
    this.dir.set(Math.sin(this.yaw) * cp, Math.sin(this.pitch), Math.cos(this.yaw) * cp);

    // pull in if a hill stands between the camera and the Calmling
    let allowed = this.dist;
    const STEPS = 12;
    for (let i = 2; i <= STEPS; i++) {
      const t = (i / STEPS) * this.dist;
      this.probe.copy(this.target).addScaledVector(this.dir, t);
      if (this.probe.y < this.island.heightAt(this.probe.x, this.probe.z) - 0.6) {
        allowed = Math.max(1.6, ((i - 1) / STEPS) * this.dist);
        break;
      }
    }
    this.curDist = dt > 0 ? damp(this.curDist, allowed, allowed < this.curDist ? 18 : 3.5, dt) : allowed;

    const pos = this.camera.position.copy(this.target).addScaledVector(this.dir, this.curDist);
    const min = this.floor(pos.x, pos.z);
    if (pos.y < min) pos.y = min;
    this.look.copy(this.target);
    this.look.y += 0.25;
    this.camera.lookAt(this.look);
  }
}
