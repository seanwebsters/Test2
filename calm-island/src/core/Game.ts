import * as THREE from 'three';
import { Npc } from '../npc/Npc';
import { RESIDENTS } from '../npc/roster';
import { CameraRig } from '../player/CameraRig';
import { Player } from '../player/Player';
import { UI, type LogEntry } from '../ui/UI';
import { Ambient } from '../world/Ambient';
import { Grass } from '../world/Grass';
import { SPAWN, getIsland, type Island, type Region } from '../world/islandMap';
import { SKY_HORIZON, Sky } from '../world/Sky';
import { Terrain, bakeGroundTexture } from '../world/Terrain';
import { Vegetation } from '../world/Vegetation';
import { Water } from '../world/Water';
import { SUN_DIR, globalUniforms, makeHeightTexture } from '../world/shared';
import { BREATHS, Breathing } from './Breathing';
import { Input } from './Input';
import { Music } from './Music';
import { PostFX } from './PostFX';
import { clearSave, loadSave, writeSave } from './Save';
import { QUALITY_PRESETS, hasStoredSettings, loadSettings, saveSettings, type Quality, type Settings } from './Settings';
import { TouchControls, isTouchDevice } from './TouchControls';

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
  private breathing = new Breathing();
  private breathsDone = 0;
  private npcs: Npc[] = [];
  private met = new Set<string>();
  private companion: Npc | null = null;
  private nearby: Npc | null = null;
  private portraits = new Map<string, string>();
  private portraitTarget = new THREE.WebGLRenderTarget(256, 256);
  private portraitCam = new THREE.PerspectiveCamera(32, 1, 0.2, 3000);
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
    const touch = isTouchDevice();
    const fresh = !hasStoredSettings();
    this.settings = loadSettings();
    if (touch && fresh) this.settings.quality = 'medium'; // phones start lighter
    if (opts.quality) this.settings.quality = opts.quality;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.info.autoReset = false; // counted across all passes of a frame
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    this.input = new Input(canvas);
    this.input.allowPointerLock = !opts.test && !touch;
    this.input.onLockChange = (locked) => {
      if (!locked && this.playing) this.pause();
    };
    this.ui = new UI(this.settings, {
      onPlay: () => this.play(),
      onLog: () => this.openLog(),
      onLogClose: () => this.play(),
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
        this.breathsDone = 0;
        this.met.clear();
        this.setCompanion(null);
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
    this.ui.touch = touch;
    document.body.classList.toggle('is-touch', touch);
    new TouchControls(this.input, canvas, () => this.pause());
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('keydown', (e) => {
      if (e.code !== 'Escape' || !this.ready) return;
      if (this.playing) this.pause();
      else if (this.ui.menuOpen || this.ui.logOpen) this.play();
    });
    window.addEventListener('keydown', (e) => {
      if (e.code !== 'KeyL' || !this.ready || e.repeat) return;
      if (this.playing) this.openLog();
      else if (this.ui.logOpen) this.play();
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
    this.ambient = new Ambient(this.island);
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
    RESIDENTS.forEach((who, i) => {
      const npc = new Npc(who, this.island, i);
      this.npcs.push(npc);
      this.scene.add(npc.model.root);
    });

    const save = this.opts.test ? null : loadSave();
    if (save) {
      this.player.teleport(save.pos[0], save.pos[2], save.yaw);
      this.rig.yaw = save.cam.yaw;
      this.rig.pitch = save.cam.pitch;
      this.rig.dist = save.cam.dist;
      this.playTime = save.playTime;
      this.breathsDone = save.breaths ?? 0;
      for (const id of save.met ?? []) this.met.add(id);
      const friend = this.npcs.find((n) => n.who.id === save.companion);
      if (friend) {
        this.setCompanion(friend);
        friend.pos.set(save.pos[0] + 1.2, 0, save.pos[2] + 1.2);
      }
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
    this.stopBreathing();
    this.ui.prompt(null);
    const calm = this.breathsDone ? ` · ${this.breathsDone * BREATHS} deep breaths` : '';
    this.ui.showMenu(`${this.discovered.size} of ${this.island.regions.length} places · ${this.met.size} of ${this.npcs.length} Calmlings met · ${mins} min of wandering${calm}`);
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
      this.updateBreathing(dt);
      this.player.update(dt, this.input, this.rig.yaw);
      this.rig.update(dt, this.input, this.player, this.settings, this.breathing.active ? this.player.yaw : null);
      this.updateMeetings();
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

  /** Who is close enough to greet, and what E does about it. */
  private updateMeetings(): void {
    const p = this.player.pos;
    let best: Npc | null = null;
    let bestD = 3.4;
    for (const npc of this.npcs) {
      const d = Math.hypot(npc.pos.x - p.x, npc.pos.z - p.z);
      if (d < bestD && Math.abs(npc.pos.y - p.y) < 2.5) {
        bestD = d;
        best = npc;
      }
    }
    if (this.breathing.active) best = null;
    if (best !== this.nearby || best) {
      this.nearby = best;
      const name = best?.who.name;
      this.ui.prompt(!best ? null : !this.met.has(best.who.id) ? 'Say hello' : best === this.companion ? `Say goodbye to ${name}` : `Invite ${name} along`);
    }
    if (!best || !this.input.interactPressed()) return;
    if (!this.met.has(best.who.id)) {
      this.met.add(best.who.id);
      this.ui.toast(`You met · ${this.met.size} of ${this.npcs.length}`, best.who.name, best.who.meaning);
      this.portraits.set(best.who.id, this.snapPortrait(best));
    } else if (best === this.companion) {
      this.setCompanion(null);
      this.ui.toast('', `Goodbye, ${best.who.name}`, 'They are heading home');
    } else {
      this.setCompanion(best);
      this.ui.toast('Walking with you', best.who.name, `“${best.who.hello}”`);
    }
    this.save();
  }

  /** Only one friend walks with you; the previous one wanders home. */
  private setCompanion(npc: Npc | null): void {
    if (this.companion && this.companion !== npc) {
      this.companion.following = false;
      this.companion.returning = true;
    }
    this.companion = npc;
    if (npc) {
      npc.following = true;
      npc.returning = false;
    }
  }

  /** A little photo of a Calmling where they stand, for the log. */
  private snapPortrait(npc: Npc): string {
    const size = this.portraitTarget.width;
    const cam = this.portraitCam;
    const s = npc.who.look.scale ?? 1;
    const fx = Math.sin(npc.yaw);
    const fz = Math.cos(npc.yaw);
    cam.position.set(npc.pos.x + fx * 4.2 * s + fz * 0.9, npc.pos.y + 1.15 * s, npc.pos.z + fz * 4.2 * s - fx * 0.9);
    cam.lookAt(npc.pos.x, npc.pos.y + 0.95 * s, npc.pos.z);
    const wasVisible = npc.model.root.visible;
    npc.model.root.visible = true;
    npc.sync();
    const fog = this.scene.fog;
    this.renderer.setRenderTarget(this.portraitTarget);
    this.renderer.render(this.scene, cam);
    const px = new Uint8Array(size * size * 4);
    this.renderer.readRenderTargetPixels(this.portraitTarget, 0, 0, size, size, px);
    this.renderer.setRenderTarget(null);
    this.scene.fog = fog;
    npc.model.root.visible = wasVisible;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const img = ctx.createImageData(size, size);
    // the target holds linear light, upside down: brighten to display values and flip
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = ((size - 1 - y) * size + x) * 4;
        const o = (y * size + x) * 4;
        for (let c = 0; c < 3; c++) img.data[o + c] = Math.min(255, Math.pow(px[i + c] / 255, 1 / 2.2) * 255 * 1.04);
        img.data[o + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.86);
  }

  private nearestRegionName(x: number, z: number): string {
    let name = 'the island';
    let best = Infinity;
    for (const r of this.island.regions) {
      const d = Math.hypot(r.x - x, r.z - z) - r.r;
      if (d < best) {
        best = d;
        name = r.name;
      }
    }
    return name;
  }

  openLog(): void {
    if (!this.ready) return;
    this.playing = false;
    this.input.enabled = false;
    this.input.releaseLock();
    this.stopBreathing();
    this.ui.prompt(null);
    const entries: LogEntry[] = this.npcs.map((npc) => {
      const met = this.met.has(npc.who.id);
      if (met && !this.portraits.has(npc.who.id)) this.portraits.set(npc.who.id, this.snapPortrait(npc));
      return {
        name: npc.who.name,
        meaning: npc.who.meaning,
        hello: npc.who.hello,
        hint: `Someone lives near ${this.nearestRegionName(npc.home.x, npc.home.z)}.`,
        met,
        companion: npc === this.companion,
        portrait: this.portraits.get(npc.who.id) ?? null,
      };
    });
    this.ui.showLog(entries);
  }

  /** Sit down and take three slow breaths, guided by the ring on screen. */
  private updateBreathing(dt: number): void {
    const b = this.breathing;
    if (this.input.breathePressed() && !b.active && this.player.sit()) b.start();
    if (!b.active) return;
    if (!this.player.sitting) {
      this.stopBreathing(); // the player moved: stand up, no fuss
      return;
    }
    const finished = b.update(dt);
    this.player.breath = b.fill;
    if (finished) {
      this.breathsDone++;
      this.ui.breath(null);
      this.ui.toast('', 'Three deep breaths', 'Carry that calm with you');
      return;
    }
    const label = b.phase === 'in' ? 'Breathe in' : b.phase === 'hold' ? 'Hold' : 'Breathe out';
    this.ui.breath(label, b.fill, b.breath + (b.phase === 'out' ? 1 : 0), BREATHS);
  }

  private stopBreathing(): void {
    this.breathing.cancel();
    this.player.breath = 0;
    this.ui.breath(null);
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
    for (const npc of this.npcs) npc.update(dt, globalUniforms.uTime.value, this.player, this.camera.position);
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
      breaths: this.breathsDone,
      met: [...this.met],
      companion: this.companion?.who.id ?? null,
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
      sitting: this.player.sitting,
      breathing: this.breathing.active,
      breathPhase: this.breathing.phase,
      breathsDone: this.breathsDone,
      met: [...this.met],
      companion: this.companion?.who.id ?? null,
      nearby: this.nearby?.who.id ?? null,
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
