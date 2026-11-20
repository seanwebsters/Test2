import * as THREE from 'three';
import { globalUniforms } from './shared';

/** Now and then a soft shower passes over: grey light, mist, and rain around the camera. */
export class Weather {
  /** 0 = clear, 1 = raining steadily */
  rain = 0;
  readonly mesh: THREE.LineSegments;
  private raining = false;
  private timer = 240 + Math.random() * 200;
  private uniforms = { uSnow: { value: 0 }, uRain: { value: 0 }, uCam: { value: new THREE.Vector3() }, uTime: globalUniforms.uTime };

  /** In winter the showers fall as snow. */
  constructor(snow = false) {
    this.uniforms.uSnow.value = snow ? 1 : 0;
    const N = 1100;
    const pos = new Float32Array(N * 6);
    const end = new Float32Array(N * 2);
    for (let i = 0; i < N; i++) {
      const x = Math.random() * 40;
      const y = Math.random() * 26;
      const z = Math.random() * 40;
      pos.set([x, y, z, x, y, z], i * 6);
      end[i * 2 + 1] = 1;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
    this.mesh = new THREE.LineSegments(
      geo,
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: this.uniforms,
        vertexShader: /* glsl */ `
          uniform float uTime;
          uniform vec3 uCam;
          uniform float uSnow;
          attribute float aEnd;
          void main() {
            vec3 p = position;
            p.y = mod(p.y - uTime * mix(15.0 + fract(position.x * 7.3) * 6.0, 1.6 + fract(position.x * 7.3) * 1.2, uSnow), 26.0);
            p.x += sin(uTime * 0.9 + position.z * 3.0) * 0.5 * uSnow;
            p.xz = mod(p.xz - uCam.xz + 20.0, 40.0) - 20.0 + uCam.xz;
            p.y += uCam.y - 9.0 + aEnd * mix(0.75, 0.14, uSnow);
            p.x += aEnd * 0.09;
            gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          uniform float uRain;
          uniform float uSnow;
          void main() { gl_FragColor = vec4(mix(vec3(0.82, 0.9, 1.0), vec3(1.0), uSnow), mix(0.34, 0.95, uSnow) * uRain); }`,
      }),
    );
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 7;
    this.mesh.visible = false;
  }

  /** Start or stop a shower right away (used by tests and the debug console). */
  force(on: boolean): void {
    this.raining = on;
    this.timer = on ? 120 : 400;
  }

  update(dt: number, camera: THREE.Vector3): void {
    this.timer -= dt;
    if (this.timer <= 0) {
      this.raining = !this.raining;
      this.timer = this.raining ? 90 + Math.random() * 70 : 360 + Math.random() * 400;
    }
    this.rain += ((this.raining ? 1 : 0) - this.rain) * (1 - Math.exp(-0.25 * dt));
    this.uniforms.uRain.value = this.rain;
    this.uniforms.uCam.value.copy(camera);
    this.mesh.visible = this.rain > 0.02;
  }
}
