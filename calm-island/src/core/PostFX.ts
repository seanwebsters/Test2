import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { FullScreenQuad, Pass } from 'three/examples/jsm/postprocessing/Pass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

/**
 * Depth-aware light, applied to the HDR image before the glow:
 *  - ambient occlusion from the depth buffer, so plants, rocks and the Calmling
 *    sit into the ground and creases darken softly;
 *  - shafts of sunlight, streaming from the sun between whatever stands in front of it.
 */
class LightPass extends Pass {
  readonly uniforms = {
    tDiffuse: { value: null as THREE.Texture | null },
    tDepth: { value: null as THREE.Texture | null },
    uTexel: { value: new THREE.Vector2(1 / 1280, 1 / 720) },
    uNear: { value: 0.3 },
    uFar: { value: 5000 },
    uAspect: { value: 1.6 },
    uTan: { value: 0.46 },
    uAo: { value: 0 },
    uRays: { value: 0 },
    uSun: { value: new THREE.Vector2(0.5, 0.8) },
    uSunColor: { value: new THREE.Color(1, 0.86, 0.6) },
    uDof: { value: 0 },
    uFocus: { value: 8 },
  };
  private quad: FullScreenQuad;

  constructor() {
    super();
    this.quad = new FullScreenQuad(
      new THREE.ShaderMaterial({
        uniforms: this.uniforms,
        depthTest: false,
        depthWrite: false,
        vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
        fragmentShader: /* glsl */ `
          uniform sampler2D tDiffuse;
          uniform sampler2D tDepth;
          uniform vec2 uTexel;
          uniform float uNear, uFar, uAspect, uTan, uAo, uRays;
          uniform vec2 uSun;
          uniform vec3 uSunColor;
          uniform float uDof, uFocus;
          varying vec2 vUv;
          float lin(float d) { float z = d * 2.0 - 1.0; return 2.0 * uNear * uFar / (uFar + uNear - z * (uFar - uNear)); }
          float depthAt(vec2 uv) { return lin(texture2D(tDepth, uv).r); }
          vec3 viewPos(vec2 uv, float z) { vec2 n = uv * 2.0 - 1.0; return vec3(n.x * uAspect * uTan * z, n.y * uTan * z, -z); }
          float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
          void main() {
            vec4 c = texture2D(tDiffuse, vUv);
            float z = depthAt(vUv);
            if (uDof > 0.0) {
              // a long lens: the far distance and anything right against the glass soften a little
              float coc = max(smoothstep(uFocus * 5.0, uFocus * 28.0, z), 1.0 - smoothstep(0.0, uFocus * 0.22, z)) * uDof;
              if (coc > 0.02) {
                vec3 sum = c.rgb;
                float wsum = 1.0;
                for (int i = 0; i < 8; i++) {
                  float a = float(i) * 0.7854 + 0.4;
                  vec2 o = vec2(cos(a), sin(a)) * uTexel * (2.2 + mod(float(i), 2.0) * 1.8) * coc * 2.6;
                  // only gather from things that are themselves out of focus, so sharp edges do not bleed
                  float zs = depthAt(vUv + o);
                  float ws = max(smoothstep(uFocus * 5.0, uFocus * 28.0, zs), 1.0 - smoothstep(0.0, uFocus * 0.22, zs)) + 0.05;
                  sum += texture2D(tDiffuse, vUv + o).rgb * ws;
                  wsum += ws;
                }
                c.rgb = sum / wsum;
              }
            }
            if (uAo > 0.0 && z < 150.0) {
              vec3 p = viewPos(vUv, z);
              // the surface's facing, rebuilt from its neighbours in the depth buffer
              vec3 px = viewPos(vUv + vec2(uTexel.x, 0.0), depthAt(vUv + vec2(uTexel.x, 0.0)));
              vec3 mx = viewPos(vUv - vec2(uTexel.x, 0.0), depthAt(vUv - vec2(uTexel.x, 0.0)));
              vec3 py = viewPos(vUv + vec2(0.0, uTexel.y), depthAt(vUv + vec2(0.0, uTexel.y)));
              vec3 my = viewPos(vUv - vec2(0.0, uTexel.y), depthAt(vUv - vec2(0.0, uTexel.y)));
              vec3 dx = abs(px.z - p.z) < abs(mx.z - p.z) ? px - p : p - mx;
              vec3 dy = abs(py.z - p.z) < abs(my.z - p.z) ? py - p : p - my;
              vec3 n = normalize(cross(dx, dy));
              float spin = hash(gl_FragCoord.xy) * 6.2831;
              float occ = 0.0;
              const float R = 0.75;
              for (int i = 0; i < 10; i++) {
                float fi = float(i);
                float a = spin + fi * 2.39996;
                float r = R * sqrt((fi + 0.5) / 10.0);
                vec2 o = vec2(cos(a) / uAspect, sin(a)) * r / (z * uTan) * 0.5;
                vec3 s = viewPos(vUv + o, depthAt(vUv + o));
                vec3 v = s - p;
                float d = length(v);
                occ += max(0.0, dot(n, v) / max(d, 1e-4) - 0.18) * smoothstep(R * 1.7, R * 0.25, d);
              }
              float ao = clamp(1.0 - occ / 10.0 * 1.9 * uAo, 0.0, 1.0);
              // shade leans cool and keeps a little colour rather than going to grey
              vec3 shade = mix(vec3(0.5, 0.56, 0.72), vec3(1.0), ao);
              c.rgb *= mix(vec3(1.0), shade, 1.0 - smoothstep(60.0, 150.0, z));
            }
            if (uRays > 0.0) {
              vec2 toSun = uSun - vUv;
              float light = 0.0;
              float jit = hash(gl_FragCoord.xy + 3.7) / 16.0;
              for (int i = 0; i < 16; i++) {
                float t = (float(i) / 16.0 + jit);
                vec2 uv = vUv + toSun * t;
                if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) continue;
                light += step(2500.0, depthAt(uv)) * (1.0 - t * 0.55);
              }
              float nearSun = 1.0 - smoothstep(0.0, 0.95, length(toSun * vec2(uAspect, 1.0)));
              // strongest where something stands between you and the sun: light spilling round its edges
              float blocked = 1.0 - step(2500.0, z) * 0.55;
              c.rgb += uSunColor * (light / 16.0) * nearSun * nearSun * blocked * uRays;
            }
            gl_FragColor = c;
          }`,
      }),
    );
  }

  render(renderer: THREE.WebGLRenderer, writeBuffer: THREE.WebGLRenderTarget, readBuffer: THREE.WebGLRenderTarget): void {
    this.uniforms.tDiffuse.value = readBuffer.texture;
    this.uniforms.tDepth.value = readBuffer.depthTexture;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.quad.render(renderer);
  }
}

/** Final colour grade, applied on the display-ready image. */
const GradeShader = {
  uniforms: { tDiffuse: { value: null as THREE.Texture | null }, uTexel: { value: new THREE.Vector2(1 / 1280, 1 / 720) } },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 uTexel;
    varying vec2 vUv;
    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      // crisp up fine detail (grass, fur, leaves) without halos
      vec3 around = texture2D(tDiffuse, vUv + vec2(uTexel.x, 0.0)).rgb + texture2D(tDiffuse, vUv - vec2(uTexel.x, 0.0)).rgb
        + texture2D(tDiffuse, vUv + vec2(0.0, uTexel.y)).rgb + texture2D(tDiffuse, vUv - vec2(0.0, uTexel.y)).rgb;
      c = clamp(c + (c - around * 0.25) * 0.45, 0.0, 1.0);
      if (!(c.r >= 0.0 && c.g >= 0.0 && c.b >= 0.0)) c = vec3(0.5, 0.6, 0.7);
      float luma = dot(c, vec3(0.2126, 0.7152, 0.0722));
      // a little more colour, with sunlit areas leaning warm and shade leaning cool
      c = mix(vec3(luma), c, 1.02);
      c *= mix(vec3(0.94, 0.98, 1.09), vec3(1.07, 1.02, 0.93), smoothstep(0.15, 0.8, luma));
      // gentle S-curve for depth without crushing anything
      c = mix(c, c * c * (3.0 - 2.0 * c), 0.28);
      // soft vignette draws the eye to the Calmling
      vec2 d = vUv - 0.5;
      c *= 1.0 - dot(d, d) * 0.32;
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
    }`,
};

/**
 * The finishing pass: renders the scene in HDR with multisampling, lets the
 * brightest things (sun, foam, blossom, clouds) glow softly, then tone maps
 * and grades. `enabled = false` falls back to a plain render for slow machines.
 */
export class PostFX {
  enabled = true;
  private composer: EffectComposer;
  private bloom: UnrealBloomPass;
  private grade!: ShaderPass;
  private light = new LightPass();
  /** how strong the ambient occlusion and the sun shafts are (0 turns each off) */
  ao = 0;
  rays = 0;
  dof = 0;
  /** how far away the Calmling is, which is where the lens is focused */
  focus = 8;
  private sunNdc = new THREE.Vector3();

  constructor(private renderer: THREE.WebGLRenderer, private scene: THREE.Scene, private camera: THREE.Camera) {
    const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
    target.depthTexture = new THREE.DepthTexture(1, 1);
    this.composer = new EffectComposer(renderer, target);
    this.composer.addPass(new RenderPass(scene, camera));
    this.composer.addPass(this.light);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.26, 0.8, 0.84);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.grade = new ShaderPass(GradeShader);
    this.composer.addPass(this.grade);
  }

  setSize(width: number, height: number, pixelRatio: number): void {
    this.composer.setPixelRatio(pixelRatio);
    this.composer.setSize(width, height);
    (this.grade.uniforms.uTexel.value as THREE.Vector2).set(1 / (width * pixelRatio), 1 / (height * pixelRatio));
    this.light.uniforms.uTexel.value.set(1 / (width * pixelRatio), 1 / (height * pixelRatio));
  }

  /** Where the sun is and how bright, so the shafts know where to stream from. */
  setSun(dir: THREE.Vector3, color: THREE.Color, strength: number): void {
    const cam = this.camera as THREE.PerspectiveCamera;
    this.sunNdc.copy(cam.position).addScaledVector(dir, 2000).project(cam);
    const behind = this.sunNdc.z > 1 || Math.abs(this.sunNdc.x) > 1.8 || Math.abs(this.sunNdc.y) > 1.8;
    const u = this.light.uniforms;
    u.uSun.value.set(this.sunNdc.x * 0.5 + 0.5, this.sunNdc.y * 0.5 + 0.5);
    u.uSunColor.value.copy(color);
    u.uRays.value = behind ? 0 : this.rays * strength;
    u.uAo.value = this.ao;
    u.uDof.value = this.dof;
    u.uFocus.value = this.focus;
    u.uNear.value = cam.near;
    u.uFar.value = cam.far;
    u.uAspect.value = cam.aspect;
    u.uTan.value = Math.tan((cam.fov * Math.PI) / 360);
    this.light.enabled = this.ao > 0 || this.rays > 0 || this.dof > 0;
  }

  render(): void {
    if (this.enabled) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }
}
