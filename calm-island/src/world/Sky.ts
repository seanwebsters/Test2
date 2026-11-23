import * as THREE from 'three';
import { mulberry32 } from '../core/math';
import { SUN_DIR, globalUniforms, paintTexture } from './shared';

export const SKY_TOP = new THREE.Color(0x2f86ea);
export const SKY_HORIZON = new THREE.Color(0xbfe6ff);

/** Gradient sky dome, sun glow and slow, fat cumulus clouds. */
export class Sky {
  readonly group = new THREE.Group();
  private dome: THREE.Mesh;
  private clouds: { mesh: THREE.InstancedMesh; speed: number }[] = [];
  private stars: THREE.Points;

  constructor() {
    // a painted cloudscape wrapped right round the horizon: towering cumulus, lit by the day's own colours
    const painted = new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}textures/sky.webp`);
    painted.wrapS = THREE.RepeatWrapping;
    painted.wrapT = THREE.ClampToEdgeWrapping;
    painted.generateMipmaps = false;
    painted.minFilter = THREE.LinearFilter;
    this.dome = new THREE.Mesh(
      new THREE.SphereGeometry(3500, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          uTop: { value: SKY_TOP },
          uHorizon: { value: SKY_HORIZON },
          uSunDir: globalUniforms.uSunDir,
          uDayLight: globalUniforms.uDayLight,
          uClouds: { value: painted },
          uTime: globalUniforms.uTime,
        },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uTop;
          uniform vec3 uHorizon;
          uniform vec3 uSunDir;
          uniform float uDayLight;
          uniform sampler2D uClouds;
          uniform float uTime;
          varying vec3 vDir;
          void main() {
            vec3 d = normalize(vDir);
            float h = clamp(d.y, 0.0, 1.0);
            vec3 col = mix(uHorizon, uTop, pow(h, 0.5));
            col = mix(col, col * 1.08 + vec3(0.03, 0.05, 0.06), pow(h, 0.7)); // a bright, airy blue overhead, never heavy
            col = mix(col, uHorizon, smoothstep(0.02, -0.1, d.y));
            float s = max(dot(d, uSunDir), 0.0);
            // warmth pooling in the sky around the sun
            col += vec3(1.0, 0.72, 0.42) * pow(s, 3.0) * 0.16 * uDayLight * (1.0 - h * 0.6);
            // the painted clouds
            float el = asin(clamp(d.y, -1.0, 1.0));
            vec2 cuv = vec2(atan(d.z, d.x) / 6.2831853 * 2.0 + uTime * 0.0005, clamp(el / 0.8 + 0.04, 0.0, 1.0));
            vec4 cl = texture2D(uClouds, cuv);
            float ca = cl.a * (1.0 - smoothstep(0.92, 1.0, cuv.y)) * smoothstep(-0.06, 0.0, el);
            vec3 cloudLit = mix(vec3(1.0, 0.985, 0.96), uHorizon * 1.2, 0.3) + vec3(1.0, 0.82, 0.55) * pow(s, 5.0) * 0.4;
            vec3 cloudShade = mix(mix(uTop, uHorizon, 0.8), vec3(1.0), 0.3) * vec3(0.98, 0.96, 1.03); // pale, luminous shadows
            vec3 cloudCol = mix(cloudShade, cloudLit, smoothstep(0.05, 0.95, cl.r)) * mix(0.45, 1.0, uDayLight);
            // the bases melt into the haze along the horizon
            cloudCol = mix(cloudCol, uHorizon, smoothstep(0.2, 0.0, el) * 0.55);
            col = mix(col, cloudCol, ca);
            s *= 1.0 - ca * 0.85;
            // a warm sun by day, a small cool moon by night
            vec3 disc = mix(vec3(0.75, 0.85, 1.0), vec3(1.0, 0.93, 0.78), uDayLight);
            col += disc * (pow(s, 1400.0) * 6.0 + (pow(s, 40.0) * 0.22 + pow(s, 5.0) * 0.07) * uDayLight);
            gl_FragColor = vec4(col, 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }`,
      }),
    );
    this.dome.renderOrder = -10;
    this.dome.frustumCulled = false;
    this.group.add(this.dome);

    // stars, hidden until dusk
    const sr = mulberry32(4);
    const sp = new Float32Array(1400 * 3);
    for (let i = 0; i < 1400; i++) {
      const y = sr() * 0.95 + 0.03;
      const r = Math.sqrt(1 - y * y);
      const a2 = sr() * Math.PI * 2;
      sp.set([Math.cos(a2) * r * 3200, y * 3200, Math.sin(a2) * r * 3200], i * 3);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false }));
    this.stars.frustumCulled = false;
    this.stars.renderOrder = -9;
    this.group.add(this.stars);

    // a veil of high cirrus drifting far above the cumulus
    const cirrus = new THREE.Mesh(
      new THREE.PlaneGeometry(9000, 9000).rotateX(Math.PI / 2),
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        fog: false,
        uniforms: { uTime: globalUniforms.uTime, uDayLight: globalUniforms.uDayLight, uHorizon: { value: SKY_HORIZON } },
        vertexShader: /* glsl */ `
          varying vec2 vP;
          void main() {
            vP = position.xz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          uniform float uTime;
          uniform float uDayLight;
          uniform vec3 uHorizon;
          varying vec2 vP;
          float h(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
          float n(vec2 p) { vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
            return mix(mix(h(i), h(i + vec2(1.0, 0.0)), f.x), mix(h(i + vec2(0.0, 1.0)), h(i + vec2(1.0, 1.0)), f.x), f.y); }
          void main() {
            // stretched noise makes long combed streaks
            vec2 p = vP * vec2(0.0011, 0.0034) + vec2(uTime * 0.004, 0.0);
            float c = n(p) * 0.55 + n(p * 2.3 + 4.0) * 0.3 + n(p * 5.1 + 9.0) * 0.15;
            float a = smoothstep(0.52, 0.86, c) * 0.5 * (1.0 - smoothstep(2200.0, 4400.0, length(vP)));
            gl_FragColor = vec4(mix(uHorizon, vec3(1.0), 0.75) * mix(0.35, 1.0, uDayLight), a);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }`,
      }),
    );
    cirrus.position.y = 900;
    cirrus.renderOrder = -8;
    cirrus.frustumCulled = false;
    this.group.add(cirrus);

    const cloudMat = new THREE.ShaderMaterial({
      fog: false,
      uniforms: {
        uSunDir: globalUniforms.uSunDir,
        uDayLight: globalUniforms.uDayLight,
        uHorizon: { value: SKY_HORIZON },
        uPaint: { value: paintTexture('brush') },
      },
      vertexShader: /* glsl */ `
        varying vec3 vN;
        varying vec3 vW;
        varying vec3 vL;
        void main() {
          vL = position;
          vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
          vN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
          vW = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uSunDir;
        uniform float uDayLight;
        uniform vec3 uHorizon;
        uniform sampler2D uPaint;
        varying vec3 vN;
        varying vec3 vW;
        varying vec3 vL;
        void main() {
          vec3 n = normalize(vN);
          // brushwork breaks up the smooth shading, as in a painted sky
          float brush = (texture2D(uPaint, vL.xy * 0.55 + vL.z * 0.3).r + texture2D(uPaint, vL.zy * 0.9 + 0.37).r) * 0.5;
          float l = dot(n, uSunDir) * 0.45 + n.y * 0.4 + 0.4 + (brush - 0.8) * 0.9;
          l = smoothstep(0.05, 0.85, l);
          vec3 col = mix(vec3(0.68, 0.78, 0.93), vec3(1.0), l) * mix(vec3(0.3, 0.36, 0.6), vec3(1.0), uDayLight);
          float far = smoothstep(900.0, 3000.0, length(vW.xz - cameraPosition.xz));
          col = mix(col, uHorizon, far * 0.75);
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });

    const puff = new THREE.IcosahedronGeometry(1, 3);
    const rnd = mulberry32(99);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    for (let c = 0; c < 44; c++) {
      const puffs = 9 + Math.floor(rnd() * 9);
      const mesh = new THREE.InstancedMesh(puff, cloudMat, puffs);
      const horizon = c % 2 === 0; // half the clouds are big banks low on the horizon
      const size = horizon ? 1.8 + rnd() * 1.8 : 0.7 + rnd() * 1.1;
      const len = (60 + rnd() * 80) * size;
      for (let i = 0; i < puffs; i++) {
        const t = i / (puffs - 1);
        const mid = 1 - Math.abs(t * 2 - 1);
        const r = (16 + 26 * mid * (0.6 + rnd() * 0.6)) * size;
        p.set((t - 0.5) * len + (rnd() - 0.5) * 12, r * 0.55 + rnd() * 6 * mid, (rnd() - 0.5) * 34 * size);
        s.set(r, r * 0.78, r);
        m.compose(p, q, s);
        mesh.setMatrixAt(i, m);
      }
      const ang = rnd() * Math.PI * 2;
      const dist = horizon ? 1700 + rnd() * 900 : 400 + rnd() * 1500;
      mesh.position.set(Math.cos(ang) * dist, horizon ? 90 + rnd() * 160 : 230 + rnd() * 170, Math.sin(ang) * dist);
      mesh.rotation.y = (rnd() - 0.5) * 0.6;
      mesh.frustumCulled = false;
      mesh.visible = !horizon; // the painted cloudscape is the horizon now; only the drifting clouds overhead are modelled
      this.clouds.push({ mesh, speed: 2 + rnd() * 2.5 });
      this.group.add(mesh);
    }
    void SUN_DIR;
  }

  update(dt: number, camera: THREE.Camera, night = 0): void {
    this.dome.position.copy(camera.position);
    this.stars.position.copy(camera.position);
    (this.stars.material as THREE.PointsMaterial).opacity = night * 0.95;
    this.stars.visible = night > 0.01;
    for (const c of this.clouds) {
      c.mesh.position.x += c.speed * dt;
      if (c.mesh.position.x > 2700) c.mesh.position.x = -2700;
    }
  }
}
