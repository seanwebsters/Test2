import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

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
      float luma = dot(c, vec3(0.2126, 0.7152, 0.0722));
      // a little more colour, with sunlit areas leaning warm and shade leaning cool
      c = mix(vec3(luma), c, 1.08);
      c *= mix(vec3(0.96, 0.99, 1.06), vec3(1.05, 1.01, 0.95), smoothstep(0.15, 0.8, luma));
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

  constructor(private renderer: THREE.WebGLRenderer, private scene: THREE.Scene, private camera: THREE.Camera) {
    const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
    this.composer = new EffectComposer(renderer, target);
    this.composer.addPass(new RenderPass(scene, camera));
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
  }

  render(): void {
    if (this.enabled) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }
}
