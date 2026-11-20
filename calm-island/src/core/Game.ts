import * as THREE from 'three';
import { CameraRig } from '../player/CameraRig';
import { Player } from '../player/Player';
import { UI } from '../ui/UI';
import { Ambient } from '../world/Ambient';
import { Grass } from '../world/Grass';
import { SPAWN, getIsland, type Island, type Region } from '../world/islandMap';
import { SKY_HORIZON, Sky } from '../world/Sky';
import { Terrain, bakeGroundTexture } from '../world/Terrain';
import { Vegetation } from '../world/Vegetation';
import { Water } from '../world/Water';
import { SUN_DIR, globalUniforms, makeHeightTexture } from '../world/shared';
import { Input } from './Input';
import { Music } from './Music';
import { PostFX } from './PostFX';
import { clearSave, loadSave, writeSave } from './Save';
import { QUALITY_PRESETS, loadSettings, saveSettings, type Quality, type Settings } from './Settings';

const nextFrame = (): Promise<void> => new Promise((r) => requestAnimationFrame(() => r()));

export interface GameOptions {
  /** automated runs: no pointer lock, no persistence */
  test: boolean;
  quality?: Quality;
}

export class Game {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(50, 1, 0.3, 5000);
  readonly input: Input;
  readonly settings: Settings;
  readonly ui: UI;
  island!: Island;
  player!: Player;
  rig!: CameraRig;
  private post!: PostFX;
  private sky!: Sky;
  private water!: Water;
  private grassNear!: Grass;
  private grassFar!: Grass;
  private vegetation!: Vegetation;
  private ambient!: Ambient;
  private sun = new THREE.DirectionalLight(0xffecc8, 3.0);
  private hemi = new THREE.HemisphereLight(0xcfe6ff, 0x9cc76a, 1.55);
  private timer = new THREE.Timer();
  private music = new Music(`${import.meta.env.BASE_URL}audio/woodland-walk.wav`);
  private playing = false;
  private discovered = new Set<string>();
  private currentRegion: Region | null = null;
  private playTime = 0;
  private saveIn = 5;
  private grassCenter = new THREE.Vector3();
  private fwd = new THREE.Vector3();
  private fpsFrames = 0;
  private fpsTime = 0;
  fps = 0;
  frames = 0;
  private slowFor = 0;
  ready = false;

  constructor(private canvas: HTMLCanvasElement, private opts: GameOptions) {
    this.settings = loadSettings();
    if (opts.quality) this.settings.quality = opts.quality;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.info.autoReset = false; // counted across all passes of a frame
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    this.input = new Input(canvas);
    this.input.allowPointerLock = !opts.test;
    this.input.onLockChange = (locked) => {
      if (!locked && this.playing) this.pause();
    };
    this.ui = new UI(this.settings, {
      onPlay: () => this.play(),
      onResume: () => this.play(),
      onHome: () => {
        this.player.teleport(SPAWN.x, SPAWN.z, 0.5);
        this.rig.yaw = 0;
        this.rig.snap(this.player);
        this.play();
      },
      onReset: () => {
        clearSave();
        this.discovered.clear();
        this.currentRegion = null;
        this.playTime = 0;
        this.player.teleport(SPAWN.x, SPAWN.z, 0.5);
        this.rig.yaw = 0;
        this.rig.snap(this.player);
        this.play();
      },
      onSettings: (s) => {
        saveSettings(s);
        this.applySettings();
      },
    });
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('keydown', (e) => {
      if (e.code !== 'Escape' || !this.ready) return;
      if (this.playing) this.pause();
      else if (this.ui.menuOpen) this.play();
    });
    window.addEventListener('beforeunload', () => this.save());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.save();
    });
  }

  async init(): Promise<void> {
    const step = async (f: number, text: string): Promise<void> => {
      this.ui.progress(f, text);
      await nextFrame();
      await nextFrame();
    };
    const low = this.settings.quality === 'low';

    await step(0.08, 'Raising hills from the sea…');
    this.island = getIsland();
    const heightTex = makeHeightTexture(this.island);

    await step(0.25, 'Planting trees and wildflowers…');
    this.vegetation = new Vegetation(this.island);
    this.scene.add(this.vegetation.group);

    await step(0.55, 'Painting meadows and beaches…');
    const groundTex = bakeGroundTexture(this.island, low ? 1024 : 2048, this.vegetation.shade);
    groundTex.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    const terrain = new Terrain(this.island, groundTex, low ? 2 : 1);
    this.scene.add(terrain.group);

    await step(0.78, 'Filling the lakes…');
    this.scene.fog = new THREE.FogExp2(SKY_HORIZON, 0.00105);
    this.sky = new Sky();
    this.scene.add(this.sky.group);
    this.water = new Water(this.island, heightTex, SKY_HORIZON);
    this.scene.add(this.water.group);
    this.post = new PostFX(this.renderer, this.scene, this.camera);

    await step(0.86, 'Combing the grass…');
    this.grassNear = new Grass(heightTex, groundTex, { patch: 44, maxBlades: 120000, bladeHeight: 0.42, bladeWidth: 0.09, seed: 1 });
    this.grassFar = new Grass(heightTex, groundTex, { patch: 110, maxBlades: 110000, bladeHeight: 0.5, bladeWidth: 0.2, seed: 2, simple: true, inner: 15 });
    this.scene.add(this.grassFar.mesh, this.grassNear.mesh);
    this.ambient = new Ambient();
    this.scene.add(this.ambient.group);

    this.sun.castShadow = true;
    this.sun.shadow.bias = -0.0012;
    this.sun.shadow.normalBias = 0.22;
    const sc = this.sun.shadow.camera;
    sc.left = sc.bottom = -46;
    sc.right = sc.top = 46;
    sc.near = 1;
    sc.far = 260;
    this.scene.add(this.sun, this.sun.target, this.hemi);

    await step(0.95, 'Waking your Calmling…');
    this.player = new Player(this.island, this.vegetation.colliders);
    this.scene.add(this.player.model.root);
    this.rig = new CameraRig(this.camera, this.island);

    const save = this.opts.test ? null : loadSave();
    if (save) {
      this.player.teleport(save.pos[0], save.pos[2], save.yaw);
      this.rig.yaw = save.cam.yaw;
      this.rig.pitch = save.cam.pitch;
      this.rig.dist = save.cam.dist;
      this.playTime = save.playTime;
      for (const id of save.discovered) this.discovered.add(id);
    }
    this.rig.snap(this.player);
    this.applySettings();
    this.resize();

    // compile shaders and draw one frame behind the loading card
    this.updateWorld(0);
    this.renderer.compile(this.scene, this.camera);
    this.post.render();
    await step(1, 'Ready');

    this.ready = true;
    this.ui.showStart(!!save);
    this.renderer.setAnimationLoop(() => this.frame());
  }

  play(): void {
    this.playing = true;
    this.input.enabled = true;
    if (!this.opts.test) void this.music.start();
    this.music.duck(false);
    this.ui.showGame();
    this.input.requestLock();
    this.canvas.focus();
  }

  pause(): void {
    if (!this.playing) return;
    this.playing = false;
    this.input.enabled = false;
    this.input.releaseLock();
    this.music.duck(true);
    this.save();
    const mins = Math.max(1, Math.round(this.playTime / 60));
    this.ui.showMenu(`${this.discovered.size} of ${this.island.regions.length} places discovered · ${mins} min of wandering`);
  }

  private applySettings(): void {
    const s = this.settings;
    const preset = QUALITY_PRESETS[s.quality];
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, preset.maxPixelRatio) * s.renderScale);
    const shadows = s.shadows;
    if (this.sun.castShadow !== shadows || this.sun.shadow.mapSize.x !== preset.shadowMap) {
      this.sun.castShadow = shadows;
      this.sun.shadow.mapSize.set(preset.shadowMap, preset.shadowMap);
      this.sun.shadow.map?.dispose();
      this.sun.shadow.map = null;
      this.scene.traverse((o) => {
        const m = (o as THREE.Mesh).material as THREE.Material | undefined;
        if (m) m.needsUpdate = true;
      });
    }
    this.music.setVolume(s.musicVolume);
    if (this.post) this.post.enabled = s.quality !== 'low';
    this.grassNear?.setDensity(preset.grass * s.grassDensity);
    this.grassFar?.setDensity(preset.grass * s.grassDensity);
    this.ui.syncSettings();
    this.resize();
  }

  private resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.post?.setSize(w, h, this.renderer.getPixelRatio());
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    const px = h * this.renderer.getPixelRatio();
    this.water?.setViewport(px);
    this.ambient?.setViewport(px);
  }

  private frame(): void {
    this.timer.update();
    const dt = Math.min(this.timer.getDelta(), 1 / 20);
    if (this.playing) {
      this.player.update(dt, this.input, this.rig.yaw);
      this.rig.update(dt, this.input, this.player, this.settings);
      this.playTime += dt;
      this.checkRegion();
      this.saveIn -= dt;
      if (this.saveIn <= 0) {
        this.saveIn = 5;
        this.save();
      }
    }
    this.input.endFrame();
    this.updateWorld(dt);
    this.renderer.info.reset();
    this.post.render();

    this.frames++;
    this.fpsFrames++;
    this.fpsTime += dt;
    if (this.fpsTime >= 0.5) {
      this.fps = this.fpsFrames / this.fpsTime;
      this.fpsFrames = 0;
      this.fpsTime = 0;
      this.autoQuality();
      if (this.settings.showFps) {
        const info = this.renderer.info.render;
        this.ui.fps(`${this.fps.toFixed(0)} fps · ${(info.triangles / 1000).toFixed(0)}k tris · ${info.calls} draws`);
      }
    }
  }

  /** Step the graphics down once if the machine is clearly struggling. */
  private autoQuality(): void {
    if (!this.settings.autoQuality || !this.playing || this.opts.test || document.hidden) return;
    this.slowFor = this.fps < 42 ? this.slowFor + 1 : 0;
    if (this.slowFor < 8) return; // four seconds below target
    this.slowFor = 0;
    if (this.settings.quality === 'high') this.settings.quality = 'medium';
    else if (this.settings.quality === 'medium') this.settings.quality = 'low';
    else return;
    saveSettings(this.settings);
    this.applySettings();
  }

  /** Everything that keeps moving even while the menu is open. */
  private updateWorld(dt: number): void {
    globalUniforms.uTime.value += dt;
    const p = this.player.pos;
    this.sky.update(dt, this.camera);
    this.camera.getWorldDirection(this.fwd);
    this.fwd.y = 0;
    this.fwd.normalize();
    this.grassNear.update(this.grassCenter.copy(p).addScaledVector(this.fwd, 4), p);
    this.grassFar.update(this.grassCenter.copy(p).addScaledVector(this.fwd, 36), p);
    this.vegetation.update(this.camera.position, QUALITY_PRESETS[this.settings.quality].distance);
    this.ambient.update(globalUniforms.uTime.value, p);
    // keep the shadow box centred on the Calmling, snapped so edges don't shimmer
    const snap = 92 / this.sun.shadow.mapSize.x * 4;
    this.sun.target.position.set(Math.round(p.x / snap) * snap, Math.round(p.y / snap) * snap, Math.round(p.z / snap) * snap);
    this.sun.position.copy(this.sun.target.position).addScaledVector(SUN_DIR, 130);
  }

  private checkRegion(): void {
    const p = this.player.pos;
    let found: Region | null = null;
    for (const r of this.island.regions) {
      if (Math.hypot(p.x - r.x, p.z - r.z) < r.r) {
        found = r;
        break;
      }
    }
    if (found && found !== this.currentRegion) {
      const fresh = !this.discovered.has(found.id);
      this.discovered.add(found.id);
      this.ui.toast(fresh ? 'Discovered' : '', found.name, found.blurb);
    }
    if (found || !this.currentRegion || Math.hypot(p.x - this.currentRegion.x, p.z - this.currentRegion.z) > this.currentRegion.r + 12) {
      this.currentRegion = found;
    }
  }

  private save(): void {
    if (this.opts.test || !this.ready) return;
    const p = this.player.pos;
    writeSave({
      v: 1,
      pos: [p.x, p.y, p.z],
      yaw: this.player.yaw,
      cam: { yaw: this.rig.yaw, pitch: this.rig.pitch, dist: this.rig.dist },
      discovered: [...this.discovered],
      playTime: this.playTime,
    });
  }

  /** Read-only snapshot for the smoke test and the debug console. */
  debugState(): Record<string, unknown> {
    const p = this.player.pos;
    const info = this.renderer.info.render;
    return {
      pos: [p.x, p.y, p.z],
      ground: this.island.heightAt(p.x, p.z),
      grounded: this.player.grounded,
      swimming: this.player.swimming,
      speed: this.player.speed,
      playing: this.playing,
      fps: this.fps,
      frames: this.frames,
      quality: this.settings.quality,
      triangles: info.triangles,
      calls: info.calls,
      discovered: [...this.discovered],
      plants: this.vegetation.counts,
    };
  }
}
