import * as THREE from 'three';
import { Npc } from '../npc/Npc';
import { RESIDENTS } from '../npc/roster';
import { CameraRig } from '../player/CameraRig';
import { Player } from '../player/Player';
import { UI, type LogEntry } from '../ui/UI';
import { Ambient } from '../world/Ambient';
import { DayCycle } from '../world/DayCycle';
import { Garden } from '../world/Garden';
import { Seeds } from '../world/Seeds';
import { Skimming } from '../world/Skimming';
import { Fishing } from '../world/Fishing';
import { FRUITS, Home, KEEPSAKES } from '../world/Home';
import { Springs } from '../world/Springs';
import { SEASON, currentSeason, setSeason } from '../world/season';
import { Cairns, Kite, Viewpoints } from '../world/Places';
import { CELL, GRID, HALF, WORLD_SIZE } from '../world/islandMap';
import { Weather } from '../world/Weather';
import { Grass } from '../world/Grass';
import { SPAWN, getIsland, type Island, type Region } from '../world/islandMap';
import { SKY_HORIZON, Sky } from '../world/Sky';
import { Terrain, bakeGroundTexture } from '../world/Terrain';
import { loadNatureModels } from '../world/NatureModels';
import { Vegetation } from '../world/Vegetation';
import { Water } from '../world/Water';
import { SUN_DIR, clearFog, fogClearAt, globalUniforms, makeHeightTexture, resetFog, paintCanopy } from '../world/shared';
import { Ambience } from './Ambience';
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
  /** play the fall-from-the-sky opening even in test mode */
  intro?: boolean;
  /** allow ambient sound even in test mode */
  sound?: boolean;
  quality?: Quality;
  /** force a season instead of following the calendar */
  season?: string | null;
  /** skip the imported nature models and use the built-in plants */
  plainPlants?: boolean;
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
  private bonds = new Map<string, number>();
  private day = new DayCycle();
  private weather!: Weather;
  private fishing!: Fishing;
  private home!: Home;
  private keepsakes = new Set<string>();
  private sleeping = false;
  private sleptFor = 0;
  private daily!: { npc: Npc; kind: 'thought' | 'breathe'; text: string; key: string };
  private dailyDone = '';
  private dailyAnnounced = false;
  private garden!: Garden;
  private seeds!: Seeds;
  private ambience = new Ambience();
  private skimming!: Skimming;
  private viewpoints!: Viewpoints;
  private cairns!: Cairns;
  private kite = new Kite();
  private rested = new Set<string>();
  private flags = new Set<string>();
  private hand = new THREE.Vector3();
  private bestSkips = 0;
  private waterNear = 0;
  private waterCheck = 0;
  private stride = 0;
  private wasAir = false;
  private musicClock = 0;
  private reveals: number[][] = [[0, 6, 34]];
  /** circles of fog still rolling back: x, z, final radius, seconds elapsed */
  private lifting: number[][] = [];
  private hummed = new Set<string>();
  /** fruit carried, seconds left of each fruit's effect, and who has had a gift */
  private basket = [0, 0, 0];
  private effects = [0, 0, 0];
  private gifted = new Set<string>();
  private inside = false;
  private homePrompt = false;
  private baseFov = 50;
  private springs!: Springs;
  private springHinted = new Set<number>();
  private glow = new THREE.PointLight(0xa8ecff, 0, 12, 1.5);
  private ducked = false;
  private gatherCheck = 0;
  private gatherTold = false;
  private guests = 0;
  private momentUntil = 0;
  private momentYaw = 0;
  private arrivingIntro = false;
  private mapBase: HTMLCanvasElement | null = null;
  private groundTex!: THREE.DataTexture;
  private photo = false;
  private gardenPlot = -1;
  private learned = new Set<string>();
  private practice: { npc: Npc; t: number; count: number; motes: THREE.Mesh[]; wasGrounded: boolean } | null = null;
  private moteMat = new THREE.MeshBasicMaterial({ color: 0xfff2a8 });
  private moteGeo = new THREE.SphereGeometry(0.16, 12, 10);
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
    // Neutral tone mapping keeps the sky and sea their true colours; ACES was
    // tried and washed the whole scene toward grey.
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
      onMap: () => this.openMap(),
      onSeason: () => {
        this.save();
        location.reload(); // the island is repainted for the new season
      },
      onWake: () => this.wake(false),
      onJournal: () => this.openJournal(),
      onPhoto: () => this.enterPhoto(),
      onPhotoSave: () => this.savePhoto(),
      onLogClose: () => this.play(),
      onResume: () => this.play(),
      onArrive: () => {
        if (this.inside) this.leaveHome();
        this.player.dropFromSky(0, 6, 170);
        this.arrivingIntro = true;
        this.rig.yaw = 0.6;
        this.rig.pitch = 0.62;
        this.rig.dist = 9;
        this.rig.snap(this.player);
        this.play();
      },
      onEat: (kind) => {
        this.input.press(`eat${kind}`);
        this.input.release(`eat${kind}`);
      },
      onHome: () => {
        if (this.inside) this.leaveHome();
        this.player.teleport(SPAWN.x, SPAWN.z, 0.5);
        this.rig.yaw = 0;
        this.rig.snap(this.player);
        this.play();
      },
      onReset: () => {
        clearSave();
        if (this.inside) this.leaveHome();
        this.basket = [0, 0, 0];
        this.effects = [0, 0, 0];
        this.gifted.clear();
        this.home.loadFruit([]);
        this.home.setLanterns([]);
        this.home.lit = false;
        this.springs.load([]);
        this.springHinted.clear();
        this.discovered.clear();
        this.currentRegion = null;
        this.playTime = 0;
        this.breathsDone = 0;
        this.met.clear();
        this.bonds.clear();
        this.learned.clear();
        this.garden.clear();
        this.seeds.reset();
        this.rested.clear();
        this.keepsakes.clear();
        this.home.show(this.keepsakes);
        this.dailyDone = '';
        this.flags.clear();
        this.cairns.load([]);
        this.kite.flying = false;
        this.bestSkips = 0;
        this.reveals = [[0, 6, 34]];
        this.lifting = [];
        this.hummed.clear();
        this.paintFog();
        this.ui.seeds(0, this.seeds.spots.length);
        this.endPractice();
        this.day.hour = 9;
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
    if (opts.test) this.ui.introMinimum = 0;
    document.body.classList.toggle('is-touch', touch);
    new TouchControls(this.input, canvas, () => this.pause());
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('keydown', (e) => {
      if (e.code !== 'Escape' || !this.ready) return;
      if (this.playing) this.pause();
      else if (this.ui.menuOpen || this.ui.logOpen) this.play();
    });
    window.addEventListener('keydown', (e) => {
      if (!this.ready || e.repeat) return;
      if (e.code === 'KeyJ') {
        if (this.playing) this.openJournal();
        else if (this.ui.logOpen && !this.photo) this.play();
      } else if (e.code === 'KeyM') {
        if (this.playing) this.openMap();
        else if (this.ui.logOpen && !this.photo) this.play();
      } else if (e.code === 'KeyP') {
        if (this.playing) this.enterPhoto();
        else if (this.photo) this.play();
      } else if (e.code === 'Enter' && this.photo) this.savePhoto();
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

    setSeason(currentSeason(this.opts.season ?? (this.settings.tropical ? 'spring' : this.settings.season === 'auto' ? null : this.settings.season)));
    this.weather = new Weather(SEASON === 'winter');
    await step(0.08, 'Raising hills from the sea…');
    this.island = getIsland();
    const heightTex = makeHeightTexture(this.island);

    await step(0.25, 'Planting trees and wildflowers…');
    const base = import.meta.env.BASE_URL;
    const models = this.opts.plainPlants ? null : await loadNatureModels(base);
    this.vegetation = new Vegetation(this.island, models, base);
    this.scene.add(this.vegetation.group);

    await step(0.55, 'Painting meadows and beaches…');
    paintCanopy(this.vegetation.shade);
    const groundTex = bakeGroundTexture(this.island, low ? 1024 : 2048, this.vegetation.shade);
    groundTex.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    this.groundTex = groundTex;
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
    this.grassNear = new Grass(heightTex, groundTex, { patch: 42, maxBlades: 190000, bladeHeight: 0.46, bladeWidth: 0.062, seed: 1 });
    this.grassFar = new Grass(heightTex, groundTex, { patch: 110, maxBlades: 110000, bladeHeight: 0.5, bladeWidth: 0.2, seed: 2, simple: true, inner: 15 });
    this.scene.add(this.grassFar.mesh, this.grassNear.mesh);
    this.ambient = new Ambient(this.island);
    this.garden = new Garden(this.island);
    this.seeds = new Seeds(this.island);
    this.skimming = new Skimming(this.island);
    this.fishing = new Fishing(this.island);
    this.home = new Home(this.island);
    this.vegetation.colliders.add(this.home.x, this.home.z, 3.7);
    for (const [sx, sz, sr] of this.home.solids) this.vegetation.colliders.add(sx, sz, sr);
    this.springs = new Springs(this.island, this.vegetation.colliders);
    this.scene.add(this.springs.group, this.glow);
    this.scene.add(this.fishing.group, this.home.group);
    this.viewpoints = new Viewpoints(this.island);
    this.cairns = new Cairns(this.island);
    this.scene.add(this.viewpoints.group, this.cairns.group, this.kite.group);
    this.scene.add(this.skimming.group);
    this.scene.add(this.seeds.group);
    this.scene.add(this.garden.group, this.weather.mesh);
    this.scene.add(this.ambient.group);

    this.sun.castShadow = true;
    this.sun.shadow.radius = 3;
    this.sun.shadow.blurSamples = 12;
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
    this.pickDaily();

    const save = this.opts.test ? null : loadSave();
    if (save) {
      this.player.teleport(save.pos[0], save.pos[2], save.yaw);
      this.rig.yaw = save.cam.yaw;
      this.rig.pitch = save.cam.pitch;
      this.rig.dist = save.cam.dist;
      this.playTime = save.playTime;
      this.breathsDone = save.breaths ?? 0;
      for (const id of save.met ?? []) this.met.add(id);
      for (const [id, t] of Object.entries(save.bonds ?? {})) this.bonds.set(id, t);
      if (typeof save.hour === 'number') this.day.hour = save.hour;
      for (const id of save.practices ?? []) this.learned.add(id);
      this.garden.load(save.garden);
      this.seeds.load(save.seeds);
      if (save.reveals?.length) this.reveals = save.reveals;
      this.bestSkips = save.bestSkips ?? 0;
      this.dailyDone = save.dailyDone ?? '';
      for (const k of save.keepsakes ?? []) this.keepsakes.add(k);
      for (const id of save.viewpoints ?? []) this.rested.add(id);
      for (const f of save.flags ?? []) this.flags.add(f);
      this.cairns.load(save.cairns);
      if (Array.isArray(save.basket)) this.basket = [0, 1, 2].map((i) => Math.max(0, Math.floor(Number(save.basket![i]) || 0)));
      this.home.loadFruit(save.fruit);
      for (const id of save.gifted ?? []) this.gifted.add(id);
      this.springs.load(save.springs);
      const friend = this.npcs.find((n) => n.who.id === save.companion);
      if (friend) {
        this.setCompanion(friend);
        friend.pos.set(save.pos[0] + 1.2, 0, save.pos[2] + 1.2);
      }
      for (const id of save.discovered) this.discovered.add(id);
    }
    this.rig.snap(this.player);
    this.ui.seeds(this.seeds.foundIds.length, this.seeds.spots.length);
    if ((!save && !this.opts.test) || this.opts.intro) {
      this.player.dropFromSky(0, 6, 170);
      this.arrivingIntro = true;
      this.rig.yaw = 0.6;
      this.rig.pitch = 0.62;
      this.rig.dist = 9;
      this.rig.snap(this.player);
    }
    this.paintFog();
    this.hangLanterns();
    this.updateKeepsakes();
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
    this.photo = false;
    this.input.cameraOnly = false;
    this.input.enabled = true;
    if (!this.opts.test) void this.music.start();
    if (!this.opts.test || this.opts.sound) this.ambience.start();
    this.music.duck(false);
    this.ducked = false;
    this.ambience.duck(false);
    this.ui.showGame();
    if (!this.dailyAnnounced && this.dailyDone !== this.daily.key) {
      this.dailyAnnounced = true;
      const d = this.daily.npc;
      window.setTimeout(() => this.playing && this.ui.toast('Today', `${d.who.name} has something for you`, `Near ${this.nearestRegionName(d.home.x, d.home.z)}`), 6000);
    }
    this.input.requestLock();
    this.canvas.focus();
  }

  pause(): void {
    if (!this.playing) return;
    this.playing = false;
    this.input.enabled = false;
    this.input.releaseLock();
    this.music.duck(true);
    this.ambience.duck(true);
    this.save();
    const mins = Math.max(1, Math.round(this.playTime / 60));
    this.stopBreathing();
    this.ui.prompt(null);
    this.ui.prompt2(null);
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
    this.ambience.setVolume(s.soundVolume);
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
    // held upright, a phone shows a tall slice of the world: widen the lens so the sides are not lost
    this.baseFov = w < h ? Math.min(72, (2 * Math.atan(Math.tan((50 * Math.PI) / 360) / Math.max(0.4, (w / h) * 1.25)) * 180) / Math.PI) : 50;
    this.camera.fov = this.inside ? Math.min(86, this.baseFov + 24) : this.baseFov;
    this.camera.updateProjectionMatrix();
    const px = h * this.renderer.getPixelRatio();
    this.water?.setViewport(px);
    this.water?.setResolution(w * this.renderer.getPixelRatio(), px);
    this.ambient?.setViewport(px);
  }

  private frame(): void {
    this.timer.update();
    const dt = Math.min(this.timer.getDelta(), 1 / 20);
    if (this.photo) this.rig.update(dt, this.input, this.player, this.settings);
    if (this.playing) {
      this.updateBreathing(dt);
      this.player.update(dt, this.input, this.rig.yaw);
      const now = globalUniforms.uTime.value;
      if (this.inside) {
        // indoors the camera sits in one corner of the room
        this.camera.position.copy(this.home.inside.cam);
        this.camera.lookAt(this.home.inside.look);
      } else this.rig.update(dt, this.input, this.player, this.settings, this.breathing.active ? this.player.yaw : now < this.momentUntil ? this.momentYaw : null);
      this.updateFog(dt);
      this.updateHums();
      if (this.arrivingIntro && !this.player.arriving) {
        this.arrivingIntro = false;
        this.ui.moment('Welcome to', 'Calm Island', 'It is lost in fog. Somewhere close, a warm light is glowing.');
        this.ambience.chime();
      }
      this.updateMeetings();
      this.updateFriendship(dt);
      this.updatePractice(dt);
      this.updateShore(dt);
      this.updateFootsteps(dt);
      this.updateFishing(dt);
      this.updateSleep(dt);
      this.updateFruit(dt);
      this.updateEvening(dt);
      if (this.input.kitePressed() && !this.inside) {
        this.kite.flying = !this.kite.flying;
        if (this.kite.flying) this.flags.add('kite');
      }
      if (this.player.gliding) this.flags.add('glide');
      if (this.day.night > 0.9) this.flags.add('night');
      if (this.player.swimming) this.kite.flying = false;
      const seed = this.seeds.update(globalUniforms.uTime.value, this.player.pos);
      if (seed >= 0) {
        const n = this.seeds.foundIds.length;
        this.ui.seeds(n, this.seeds.spots.length);
        this.ui.toast('Calm seed', `${n} of ${this.seeds.spots.length}`, n === 1 ? 'There are more, hidden all over the island' : 'Well spotted');
        this.save();
      }
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
    this.drawReflection();
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
      if (!npc.absent && d < bestD && Math.abs(npc.pos.y - p.y) < 2.5) {
        bestD = d;
        best = npc;
      }
    }
    if (this.breathing.active || this.practice) best = null;
    if (this.inside) {
      this.nearby = null;
      this.gardenPlot = -1;
      this.ui.prompt2(null);
      this.ui.prompt(this.sleeping || this.breathing.active ? null : 'Step outside');
      if (!this.sleeping && !this.breathing.active && this.input.interactPressed()) this.leaveHome();
      return;
    }
    // garden plots share the E key when no Calmling is in reach
    this.gardenPlot = best || this.practice ? -1 : this.garden.near(p);
    if (this.gardenPlot >= 0) {
      this.nearby = null;
      this.ui.prompt(this.garden.prompt(this.gardenPlot, Date.now()));
      this.ui.prompt2(null);
      if (this.input.interactPressed()) {
        const did = this.garden.tend(this.gardenPlot, Date.now());
        if (did === 'planted') this.ui.toast('', 'Seed planted', 'It grows while you are away. Come back and see.');
        if (did === 'watered') this.ui.toast('', 'Watered', 'That will help it along.');
        if (did) this.save();
      }
      return;
    }
    if (!best && !this.practice && this.updateHome(p)) {
      this.homePrompt = true;
      return;
    }
    if (this.homePrompt) {
      // walked away from the treehouse: its prompt goes too
      this.homePrompt = false;
      this.ui.prompt(null);
    }
    // resting logs and pebble towers, when nothing else is in reach
    const view = best || this.practice ? null : this.viewpoints.near(p);
    const cairn = best || this.practice || view ? -1 : this.cairns.near(p);
    if (view || cairn >= 0) {
      this.nearby = null;
      this.ui.prompt2(null);
      if (view) {
        this.ui.prompt(this.player.sitting ? null : 'Rest and take in the view');
        if (this.input.interactPressed() && this.player.sit()) {
          const fresh = !this.rested.has(view.id);
          this.rested.add(view.id);
          this.player.yaw = view.yaw + Math.PI;
          this.rig.yaw = view.yaw;
          this.rig.pitch = 0.26;
          this.rig.dist = 13;
          if (fresh) this.reveal(view.x, view.z, 130);
          this.ui.toast(fresh ? `Viewpoint · ${this.rested.size} of ${this.viewpoints.spots.length}` : 'Viewpoint', view.name, 'Stay as long as you like');
          this.save();
        }
      } else {
        this.ui.prompt(this.cairns.canAdd(cairn) ? 'Balance a pebble on top' : null);
        if (this.input.interactPressed() && this.cairns.canAdd(cairn)) {
          const n = this.cairns.add(cairn);
          if (n === this.cairns.max) this.ui.toast('', 'A tidy little tower', 'Seven stones, perfectly balanced');
          this.save();
        }
      }
      return;
    }
    const like = best ? this.npcs.indexOf(best) % 3 : 0;
    const canGive = !!best && this.met.has(best.who.id) && !this.gifted.has(best.who.id) && this.basket[like] > 0 && !this.practice;
    const canLearn = best && this.met.has(best.who.id) && !this.practice && !canGive;
    if (canGive) {
      this.ui.prompt2(`Give ${best!.who.name} a ${FRUITS[like].name}`);
      if (this.input.practisePressed()) {
        this.giveGift(best!, like);
        return;
      }
    } else this.ui.prompt2(canLearn ? `${this.learned.has(best!.who.id) ? 'Practise again' : 'Learn'}: ${best!.who.practice.title}` : null);
    if (canLearn && this.input.practisePressed()) {
      this.startPractice(best!);
      return;
    }
    if (best !== this.nearby || best) {
      this.nearby = best;
      const name = best?.who.name;
      this.ui.prompt(!best ? null : !this.met.has(best.who.id) ? 'Say hello' : best === this.companion ? `Say goodbye to ${name}` : `Invite ${name} along`);
    }
    if (best && best === this.daily.npc && this.dailyDone !== this.daily.key) {
      this.ui.prompt(`Today’s moment with ${best.who.name}`);
      if (this.input.interactPressed()) this.giveDaily();
      return;
    }
    if (!best || !this.input.interactPressed()) return;
    if (!this.met.has(best.who.id)) {
      this.meetMoment(best);
    } else if (best === this.companion) {
      this.setCompanion(null);
      this.ui.toast('', `Goodbye, ${best.who.name}`, 'They are heading home');
    } else {
      this.setCompanion(best);
      this.ui.toast('Walking with you', best.who.name, `“${best.who.hello}”`);
    }
    this.save();
  }

  /** Everything E does around the treehouse. Returns true when it has taken over the prompt. */
  private updateHome(p: THREE.Vector3): boolean {
    const home = this.home;
    const close = home.near(p);
    if (Math.hypot(home.x - p.x, home.z - p.z) > 16) return false;
    if (close && !this.flags.has('home')) {
      // the first time you reach the light in the fog
      this.flags.add('home');
      this.reveal(home.x, home.z, 78);
      this.ambience.chime();
      this.ui.moment('You found', 'Home', 'A little house in an old tree, with fruit growing beside it.');
      this.save();
    }
    const now = Date.now();
    const plant = home.fruitNear(p, now);
    const evening = this.day.hour >= 17 || this.day.hour < 6;
    let text: string | null = null;
    let act: (() => void) | null = null;
    if (plant >= 0) {
      text = 'Pick the fruit';
      act = () => {
        const kind = home.pick(plant, now);
        this.basket[kind]++;
        this.ambience.plip(0.5);
        const first = !this.flags.has('pick');
        this.flags.add('pick');
        this.ui.toast(first ? 'Into your basket' : '', `A ${FRUITS[kind].name}`, first ? `Press ${kind + 1} (or tap it) to eat it, or take it to a friend who loves them` : `${this.basket[kind]} in your basket. It will grow back in a few minutes`);
        this.save();
      };
    } else if (home.fireNear(p)) {
      if (!home.lit && evening) {
        text = 'Light the fire';
        act = () => {
          home.lit = true;
          this.flags.add('fire');
          this.ui.toast('', 'The fire is lit', this.met.size ? 'Friends you have made may come and sit a while' : 'It will burn until morning');
        };
      } else if (!this.player.sitting) {
        text = home.lit ? 'Sit by the fire' : 'Sit a while';
        act = () => {
          if (this.player.sit() && !home.lit) this.ui.toast('', 'The fire ring', 'Come back in the evening to light it');
        };
      }
    } else if (home.ladderNear(p)) {
      text = 'Climb up and go inside';
      act = () => this.enterHome();
    } else if (close && !this.player.sitting) {
      text = 'Rest at home';
      act = () => {
        const n = this.keepsakes.size;
        if (this.player.sit()) this.ui.toast('Your nook', 'Home', n ? `${n} of ${KEEPSAKES.length} keepsakes gathered` : 'Bare for now. It fills with the things you do');
      };
    } else if (!close) return false;
    this.nearby = null;
    this.ui.prompt2(null);
    this.ui.prompt(text);
    if (act && this.input.interactPressed()) act();
    return true;
  }

  /** Up the ladder and through the door: you sit on the rug in your own small room. */
  private enterHome(): void {
    if (this.inside || !this.player.grounded) return;
    this.inside = true;
    this.kite.flying = false;
    this.player.hold = this.home.inside.pos;
    this.player.pos.copy(this.home.inside.pos);
    this.player.yaw = this.home.inside.yaw;
    this.player.sitting = true;
    this.camera.fov = Math.min(86, this.baseFov + 24);
    this.camera.updateProjectionMatrix();
    const first = !this.flags.has('inside');
    this.flags.add('inside');
    this.ui.toast(first ? 'Your own room' : '', 'Home', 'Warm and quiet. Press Z to sleep in your bed, B to breathe');
    this.save();
  }

  private leaveHome(): void {
    if (!this.inside) return;
    if (this.sleeping) this.wake(false);
    this.inside = false;
    this.ui.prompt(null);
    this.player.hold = null;
    const l = this.home.ladderSpot;
    this.player.teleport(l.x + (l.x - this.home.x) * 0.25, l.z + (l.z - this.home.z) * 0.25, Math.atan2(l.x - this.home.x, l.z - this.home.z));
    this.camera.fov = this.baseFov;
    this.camera.updateProjectionMatrix();
    this.rig.yaw = this.player.yaw + Math.PI;
    this.rig.snap(this.player);
  }

  /** A friend is given the fruit they love: their lantern goes up at the treehouse. */
  private giveGift(npc: Npc, kind: number): void {
    this.basket[kind]--;
    this.gifted.add(npc.who.id);
    this.bonds.set(npc.who.id, (this.bonds.get(npc.who.id) ?? 0) + 60);
    this.hangLanterns();
    this.ambience.chime();
    this.ui.moment(`${npc.who.name} loves ${FRUITS[kind].plural}`, 'A gift, gladly taken', `${npc.who.name} has hung a lantern at your treehouse · ${this.gifted.size} of ${this.npcs.length}`);
    this.save();
  }

  private hangLanterns(): void {
    this.home.setLanterns(this.npcs.map((n) => (this.gifted.has(n.who.id) ? n.who.look.fur : null)));
  }

  /** Eating fruit (keys 1–3 or the basket buttons) and the effects it leaves for a while. */
  private updateFruit(dt: number): void {
    const k = this.input.eatPressed();
    if (k >= 0 && !this.sleeping) {
      if (this.basket[k] > 0) {
        this.basket[k]--;
        this.effects[k] = 120;
        this.flags.add('eat');
        this.ambience.plip(0.7);
        this.ui.toast('', `You eat a ${FRUITS[k].name}`, FRUITS[k].effect);
        this.save();
      } else this.ui.toast('', `No ${FRUITS[k].plural} in your basket`, 'They grow in the patch beside your treehouse');
    }
    for (let i = 0; i < 3; i++) this.effects[i] = Math.max(0, this.effects[i] - dt);
    this.player.glideBoost = this.effects[0] > 0;
    this.player.speedBoost = this.effects[2] > 0 ? 1.3 : 1;
    this.glow.intensity = this.effects[1] > 0 ? (5 + 22 * this.day.night) * Math.min(1, this.effects[1] / 4) : 0;
    this.glow.position.copy(this.player.pos);
    this.glow.position.y += 1.1;
    this.ui.basket(this.basket, this.effects);
  }

  /** Evening at the treehouse: friends come to sit by the fire, which crackles; springs give a hint. */
  private updateEvening(dt: number): void {
    const p = this.player.pos;
    const home = this.home;
    const fireD = Math.hypot(home.fireSpot.x - p.x, home.fireSpot.z - p.z);
    if (home.lit && fireD < 20 && Math.random() < dt * 5) this.ambience.crackle(Math.min(1, 5 / (fireD + 2)));
    this.gatherCheck -= dt;
    if (this.gatherCheck > 0) return;
    this.gatherCheck = 1.5;
    const h = this.day.hour;
    const evening = h >= 17.5 || h < 5.5;
    if (h > 8 && h < 16.5) {
      home.lit = false;
      this.gatherTold = false;
    }
    const guests = evening
      ? this.npcs
          .filter((n) => this.met.has(n.who.id) && n !== this.companion && !n.absent)
          .sort((a, b) => (this.bonds.get(b.who.id) ?? 0) - (this.bonds.get(a.who.id) ?? 0))
          .slice(0, home.gatherSpots.length)
      : [];
    this.guests = guests.length;
    let arrived = 0;
    for (const npc of this.npcs) {
      const i = guests.indexOf(npc);
      if (i >= 0) {
        const spot = home.gatherSpots[i];
        npc.gather ??= new THREE.Vector3();
        npc.gather.set(spot.x, this.island.heightAt(spot.x, spot.z), spot.z);
        npc.gatherFace.set(home.fireSpot.x, 0, home.fireSpot.z);
        npc.returning = false;
        if (Math.hypot(npc.pos.x - spot.x, npc.pos.z - spot.z) < 3) arrived++;
      } else if (npc.gather) {
        npc.gather = null;
        npc.returning = true;
      }
    }
    if (arrived && !this.gatherTold && fireD < 20 && !this.inside) {
      this.gatherTold = true;
      this.flags.add('gathering');
      this.ui.toast('Evening at home', arrived === 1 ? `${guests[0].who.name} has come by` : `${arrived} friends have come by`, home.lit ? 'The fire is warm. Sit with them a while' : 'Light the fire and sit with them a while');
    }
    const s = this.springs.near(p);
    if (s >= 0 && !this.springs.isAwake(s) && !this.springHinted.has(s)) {
      this.springHinted.add(s);
      this.ui.toast('A sleeping spring', this.springs.spots[s].name, 'Sit beside it and take three deep breaths to wake it');
    }
  }

  /** Walking together slowly fills three hearts; the second one earns a story. */
  private hearts(id: string): number {
    const t = this.bonds.get(id) ?? 0;
    return t >= 300 ? 3 : t >= 120 ? 2 : t >= 30 ? 1 : 0;
  }

  private updateFriendship(dt: number): void {
    const c = this.companion;
    if (!c || this.player.speed < 1) return;
    const before = this.hearts(c.who.id);
    this.bonds.set(c.who.id, (this.bonds.get(c.who.id) ?? 0) + dt);
    const now = this.hearts(c.who.id);
    if (now === before) return;
    if (now === 2) this.ui.toast('A story for the log', c.who.name, `“${c.who.story}”`);
    else this.ui.toast('', now === 3 ? 'Best of friends' : 'Friendship grew', `${c.who.name} ${'♥'.repeat(now)}`);
    this.save();
  }

  /** Finding a Calmling: the fog rolls back around them, bells ring, and their name fills the sky. */
  private meetMoment(npc: Npc): void {
    this.met.add(npc.who.id);
    this.reveal(npc.pos.x, npc.pos.z, 96);
    this.ambience.chime();
    this.ui.moment(`You found a friend · ${this.met.size} of ${this.npcs.length}`, npc.who.name, npc.who.meaning);
    // swing the camera round so they are framed beyond the player
    this.momentYaw = Math.atan2(this.player.pos.x - npc.pos.x, this.player.pos.z - npc.pos.z);
    this.momentUntil = globalUniforms.uTime.value + 4.5;
    // take their picture once the air has cleared
    window.setTimeout(() => this.portraits.set(npc.who.id, this.snapPortrait(npc)), 4800);
  }

  /** A hint that someone is close by in the fog. */
  private updateHums(): void {
    const p = this.player.pos;
    for (const npc of this.npcs) {
      if (npc.absent || this.met.has(npc.who.id) || this.hummed.has(npc.who.id)) continue;
      const d = Math.hypot(npc.pos.x - p.x, npc.pos.z - p.z);
      if (d > 34 || d < 6 || fogClearAt(npc.pos.x, npc.pos.z) > 0.5) continue;
      this.hummed.add(npc.who.id);
      this.ui.toast('', 'Someone is humming nearby', 'Follow the sound through the fog');
      this.ambience.chime();
      break;
    }
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
    this.player.model.root.visible = false; // keep the photographer out of the shot
    npc.sync();
    const fog = this.scene.fog;
    this.renderer.setRenderTarget(this.portraitTarget);
    this.renderer.render(this.scene, cam);
    const px = new Uint8Array(size * size * 4);
    this.renderer.readRenderTargetPixels(this.portraitTarget, 0, 0, size, size, px);
    this.renderer.setRenderTarget(null);
    this.scene.fog = fog;
    npc.model.root.visible = wasVisible;
    this.player.model.root.visible = true;
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

  /** Today's Calmling, chosen by the date so it is the same all day and new tomorrow. */
  private pickDaily(): void {
    const d = new Date();
    const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    let hash = 0;
    for (const ch of key) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
    const pool = this.npcs.filter((n) => !n.who.hours);
    const thoughts = [
      'You don’t have to earn a rest. It is already yours.',
      'Nothing on this island is in a hurry. You needn’t be either.',
      'Whatever today was, the tide has already taken some of it.',
      'Notice one small good thing. That is enough for now.',
      'You can put it down for a while. It will keep.',
      'Slow is still moving.',
      'Somebody is glad you are here. I am, for one.',
      'A breath is the shortest holiday there is.',
      'Not every day needs to be remembered. Some just need to be gentle.',
      'Look how far the light travels to land on you.',
      'It’s all right to simply watch the water today.',
      'You were kind to someone recently. Be that kind to yourself.',
      'The mountain doesn’t rush, and it still gets to see everything.',
      'Start small. A sip of water. A stretch. A walk to the garden.',
    ];
    this.daily = { npc: pool[hash % pool.length], kind: hash % 3 === 0 ? 'breathe' : 'thought', text: thoughts[(hash >>> 5) % thoughts.length], key };
  }

  private giveDaily(): void {
    const { npc, kind, text, key } = this.daily;
    if (!this.met.has(npc.who.id)) {
      this.met.add(npc.who.id);
      this.portraits.set(npc.who.id, this.snapPortrait(npc));
    }
    this.dailyDone = key;
    this.bonds.set(npc.who.id, (this.bonds.get(npc.who.id) ?? 0) + 45);
    this.save(); // first, so a new keepsake never talks over the moment itself
    if (kind === 'breathe' && this.player.sit()) {
      this.breathing.start();
      this.ui.toast(`Today’s moment · ${npc.who.name}`, 'Breathe with me', 'Three slow breaths, together');
    } else {
      this.ui.toast(`Today’s moment · ${npc.who.name}`, 'A thought for today', text);
    }
  }

  /** Cast, wait, watch the float. Whatever bites is greeted and let go. */
  private updateFishing(dt: number): void {
    const f = this.fishing;
    this.hand.copy(this.player.pos);
    this.hand.y += 0.95;
    if (this.input.fishPressed()) {
      if (f.active) {
        const fish = f.reel();
        this.ui.breath(null);
        if (fish) {
          this.flags.add('fish');
          this.save();
          this.ui.toast('', fish, 'You say hello, and let it swim away');
          this.ambience.plip(0.6);
        }
      } else if (this.waterNear > 0.12 && this.player.grounded && !this.practice && !this.breathing.active && !this.sleeping) {
        if (f.cast(this.player.pos, this.player.yaw) && this.player.sit()) this.ui.toast('', 'Line cast', 'Now there is nothing to do but wait');
        else {
          f.stop();
          this.ui.toast('', 'No water there', 'Face the water and try again');
        }
      }
    }
    if (!f.active) return;
    if (!this.player.sitting) {
      f.stop();
      this.ui.breath(null);
      return;
    }
    const time = globalUniforms.uTime.value;
    const event = f.update(dt, time, this.hand);
    if (event === 'bite') this.ambience.plip(1);
    if (f.state === 'bite') this.ui.breath('A nibble! Reel in', 1, 0, 0);
    else this.ui.breath('Waiting…', 0.22 + Math.sin(time * 1.2) * 0.08, 0, 0);
  }

  /** At night, or at home, lie down and let the hours pass until morning. */
  private updateSleep(dt: number): void {
    const can = !this.sleeping && this.player.grounded && !this.practice && !this.breathing.active && !this.fishing.active && (this.day.night > 0.5 || this.inside || this.home.near(this.player.pos));
    this.ui.sleepButton(can);
    if (!this.sleeping) {
      if (!this.input.sleepPressed()) return;
      if (!can) {
        this.ui.toast('', 'Not sleepy yet', 'Sleep comes after dark, or any time at your nook');
        return;
      }
      if (!this.player.sit()) return;
      this.sleeping = true;
      this.sleptFor = 0;
      this.player.sleeping = true;
      this.ui.prompt(null);
      this.ui.prompt2(null);
      this.ui.sleeping(true);
      if (this.inside) {
        this.player.hold = this.home.inside.bed;
        this.player.yaw = this.home.inside.bedYaw;
      }
      return;
    }
    this.sleptFor += dt;
    this.rig.yaw += dt * 0.04;
    const morning = this.sleptFor > 2.5 && this.day.hour >= 6.9 && this.day.hour < 9.5;
    if (morning || !this.player.sitting || (this.sleptFor > 1 && this.input.anyPressed())) this.wake(morning);
  }

  private wake(morning: boolean): void {
    if (!this.sleeping) return;
    this.sleeping = false;
    this.player.sleeping = false;
    this.ui.sleeping(false);
    if (this.inside) {
      this.player.hold = this.home.inside.pos;
      this.player.yaw = this.home.inside.yaw;
      this.player.sitting = true;
    }
    if (morning) {
      this.flags.add('sleep');
      this.ui.toast('', 'Good morning', 'A whole night, slept through');
      this.save();
    }
  }

  /** Things you have done turn up as keepsakes in your nook. */
  private updateKeepsakes(): void {
    const best = Math.max(0, ...[...this.bonds.keys()].map((id) => this.hearts(id)));
    const earned: [string, boolean][] = [
      ['lantern', this.seeds.foundIds.length >= 5], ['bloom', this.garden.blooms > 0], ['stones', this.cairns.tallest >= this.cairns.max],
      ['kite', this.flags.has('kite')], ['skimmer', this.bestSkips >= 3], ['shell', this.discovered.has('bay')],
      ['feather', this.rested.has('summit')], ['garland', best >= 2], ['bowl', this.flags.has('fish')], ['picture', this.flags.has('photo')],
    ];
    for (const [id, ok] of earned) {
      if (!ok || this.keepsakes.has(id)) continue;
      this.keepsakes.add(id);
      if (this.playing) this.ui.toast('Something new for your nook', KEEPSAKES.find((k) => k.id === id)!.name, 'It is waiting at home, near the garden');
    }
    this.home.show(this.keepsakes);
  }

  /** Footsteps that match the ground, a thump on landing, and music that comes and goes. */
  private updateFootsteps(dt: number): void {
    const pl = this.player;
    const p = pl.pos;
    const I = this.island;
    if (this.wasAir && pl.grounded) this.ambience.land(0.7);
    this.wasAir = !pl.grounded && !pl.swimming;
    if (pl.grounded && pl.speed > 0.6) {
      this.stride += pl.speed * dt;
      const length = 0.72 + Math.min(pl.speed, 8) * 0.07; // longer strides at a run
      if (this.stride >= length) {
        this.stride = 0;
        const ground = I.heightAt(p.x, p.z);
        const surface =
          I.waterLevelAt(p.x, p.z) > ground + 0.08 ? 'water'
          : I.sample(I.sand, p.x, p.z) > 0.5 || ground > 104 ? 'sand'
          : I.sample(I.path, p.x, p.z) > 0.4 ? 'path'
          : I.gradientAt(p.x, p.z, this.footGrad) > 0.75 ? 'rock'
          : 'grass';
        this.ambience.step(surface, Math.min(1, pl.speed / 8));
      }
    } else if (pl.speed < 0.3) this.stride = 0.5; // the first step lands soon after setting off
    // like a good walk, the music is not constant: four minutes on, two and a half of quiet
    this.musicClock += dt;
    this.music.rest(this.musicClock % 390 > 240);
  }
  private footGrad = { x: 0, z: 0 };

  /** How close water is (for sound and skimming), and stones thrown across it. */
  private updateShore(dt: number): void {
    const p = this.player.pos;
    const I = this.island;
    this.waterCheck -= dt;
    if (this.waterCheck <= 0) {
      this.waterCheck = 0.25;
      let near = 0;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const r = i % 2 ? 5 : 11;
        const x = p.x + Math.cos(a) * r;
        const z = p.z + Math.sin(a) * r;
        if (I.waterLevelAt(x, z) > I.heightAt(x, z) + 0.15 && Math.abs(I.waterLevelAt(x, z) - p.y) < 4) near += i % 2 ? 2 : 1;
      }
      this.waterNear = Math.min(1, near / 7);
      this.ui.skim(this.waterNear > 0.12 && this.player.grounded && !this.practice && !this.breathing.active && !this.fishing.active, this.fishing.state === 'bite' ? 'Reel!' : this.fishing.active ? 'Reel in' : 'Fish');
    }
    if (this.input.skimPressed() && this.waterNear > 0.12 && this.player.grounded && !this.player.sitting) this.skimming.throw(p, this.player.yaw);
    const event = this.skimming.update(dt);
    if (event) this.ambience.plip(event === 'skip' ? 1 : 0.2);
    if (event === 'done' && this.skimming.skips > 0) {
      const n = this.skimming.skips;
      const best = n > this.bestSkips;
      if (best) this.bestSkips = n;
      this.ui.toast(best && n > 1 ? 'A new best' : '', `${n} skip${n === 1 ? '' : 's'}`, n >= 5 ? 'Beautiful throw' : n >= 3 ? 'Nicely done' : 'Try a longer stretch of water');
      if (best) this.save();
    }
    const fx = I.falls.base.x - p.x;
    const fz = I.falls.base.z - p.z;
    this.ambience.update(
      {
        water: this.waterNear,
        falls: Math.max(0, 1 - Math.hypot(fx, fz) / 110),
        height: Math.min(1, Math.max(0, p.y / 120)),
        night: this.day.night,
        rain: this.weather.rain,
        trees: I.sample(I.forest, p.x, p.z),
      },
      globalUniforms.uTime.value,
    );
  }

  /** Lift the fog from a circle of the island. It rolls back over a few seconds. */
  private reveal(x: number, z: number, r: number): void {
    this.reveals.push([Math.round(x), Math.round(z), Math.round(r)]);
    if (this.reveals.length > 140) this.reveals.splice(1, 1);
    this.lifting.push([x, z, r, 0]);
  }

  /** Rebuild the fog from scratch: open sea is clear, land is hidden until revealed. */
  private paintFog(): void {
    resetFog((x, z) => this.island.heightAt(x, z) < -2.5);
    for (const [x, z, r] of this.reveals) clearFog(x, z, r);
  }

  private updateFog(dt: number): void {
    for (const c of this.lifting) {
      c[3] += dt;
      const t = Math.min(1, c[3] / 4.5);
      clearFog(c[0], c[1], c[2] * (1 - (1 - t) * (1 - t)));
    }
    this.lifting = this.lifting.filter((c) => c[3] < 4.5);
  }

  /** The island from above; mist covers what you have not yet explored. */
  openMap(): void {
    if (!this.ready) return;
    this.playing = false;
    this.input.enabled = false;
    this.input.releaseLock();
    this.stopBreathing();
    this.endPractice();
    this.ui.prompt(null);
    this.ui.prompt2(null);
    const canvas = this.ui.showMap(`${this.discovered.size} of ${this.island.regions.length} places · ${this.seeds.foundIds.length} of ${this.seeds.spots.length} calm seeds · ${this.day.label}. Sit and breathe to clear more mist.`);
    const S = canvas.width;
    const ctx = canvas.getContext('2d')!;
    if (!this.mapBase) {
      // paint the ground texture once, with the sea drawn in
      const B = 360;
      const base = document.createElement('canvas');
      base.width = base.height = B;
      const bctx = base.getContext('2d')!;
      const img = bctx.createImageData(B, B);
      const tex = this.groundTex.image as { data: Uint8Array; width: number };
      for (let j = 0; j < B; j++) {
        for (let i = 0; i < B; i++) {
          const x = ((i + 0.5) / B) * WORLD_SIZE - HALF;
          const z = ((j + 0.5) / B) * WORLD_SIZE - HALF;
          const h = this.island.heightAt(x, z);
          const o = (j * B + i) * 4;
          if (h < 0.15 || this.island.waterLevelAt(x, z) > h + 0.3) {
            const deep = Math.min(1, Math.max(0, -h / 14));
            img.data.set([90 - deep * 50, 196 - deep * 70, 226 - deep * 20, 255], o);
          } else {
            const t = (Math.floor(((j + 0.5) / B) * tex.width) * tex.width + Math.floor(((i + 0.5) / B) * tex.width)) * 4;
            const shade = 0.86 + Math.min(0.3, h / 320);
            img.data.set([tex.data[t] * shade, tex.data[t + 1] * shade, tex.data[t + 2] * shade, 255], o);
          }
        }
      }
      bctx.putImageData(img, 0, 0);
      this.mapBase = base;
    }
    const at = (x: number, z: number): [number, number] => [((x + HALF) / WORLD_SIZE) * S, ((z + HALF) / WORLD_SIZE) * S];
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(this.mapBase, 0, 0, S, S);
    // mist, with soft holes wherever you have been
    const mist = document.createElement('canvas');
    mist.width = mist.height = S;
    const m = mist.getContext('2d')!;
    m.fillStyle = 'rgba(232,242,250,0.84)';
    m.fillRect(0, 0, S, S);
    m.globalCompositeOperation = 'destination-out';
    for (const [x, z, r] of this.reveals) {
      const [cx, cy] = at(x, z);
      const rr = (r / WORLD_SIZE) * S;
      const g = m.createRadialGradient(cx, cy, rr * 0.55, cx, cy, rr);
      g.addColorStop(0, 'rgba(0,0,0,1)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      m.fillStyle = g;
      m.beginPath();
      m.arc(cx, cy, rr, 0, Math.PI * 2);
      m.fill();
    }
    ctx.drawImage(mist, 0, 0);
    const dot = (x: number, z: number, r: number, fill: string, ring = '#fff'): void => {
      const [cx, cy] = at(x, z);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = ring;
      ctx.stroke();
    };
    for (const s of this.seeds.spots) if (s.found) dot(s.x, s.z, 3.5, '#eaff8a', '#7a9a2a');
    ctx.font = '700 13px ui-rounded, system-ui, sans-serif';
    ctx.textAlign = 'center';
    for (const npc of this.npcs) {
      if (!this.met.has(npc.who.id)) continue;
      const q = npc === this.companion ? npc.pos : npc.home;
      dot(q.x, q.z, 7, `#${npc.who.look.fur.toString(16).padStart(6, '0')}`);
      const [cx, cy] = at(q.x, q.z);
      ctx.fillStyle = '#17406b';
      ctx.strokeStyle = 'rgba(255,255,255,.9)';
      ctx.lineWidth = 3;
      ctx.strokeText(npc.who.name, cx, cy - 12);
      ctx.fillText(npc.who.name, cx, cy - 12);
    }
    dot(this.home.x, this.home.z, 6, '#fff', '#8a5a36');
    this.springs.spots.forEach((sp, i) => {
      if (this.springs.isAwake(i)) dot(sp.x, sp.z, 5, '#8fe9ff', '#ffffff');
    });
    if (this.dailyDone !== this.daily.key) {
      const [dx, dy] = at(this.daily.npc.home.x, this.daily.npc.home.z);
      ctx.beginPath();
      ctx.arc(dx, dy, 15, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffb03a';
      ctx.lineWidth = 4;
      ctx.stroke();
    }
    const p = this.player.pos;
    const [px, py] = at(p.x, p.z);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-this.player.yaw + Math.PI);
    ctx.beginPath();
    ctx.moveTo(0, -15);
    ctx.lineTo(8, 6);
    ctx.lineTo(-8, 6);
    ctx.closePath();
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.restore();
    dot(p.x, p.z, 8, '#3d9fea');
    void CELL;
    void GRID;
  }

  /** Freeze the moment: the HUD hides and the camera is free to frame a picture. */
  enterPhoto(): void {
    this.playing = false;
    this.photo = true;
    this.input.releaseLock();
    this.input.enabled = true;
    this.input.cameraOnly = true;
    this.stopBreathing();
    this.endPractice();
    this.ui.prompt(null);
    this.ui.prompt2(null);
    this.ui.showPhoto();
  }

  savePhoto(): void {
    this.renderer.info.reset();
    this.post.render(); // draw, then read the canvas before the browser clears it
    const link = document.createElement('a');
    link.download = `calm-island-${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
    this.photosSaved++;
    this.flags.add('photo');
    this.save();
  }

  /** A gentle list of things the island offers; it ticks itself off as you go. */
  openJournal(): void {
    if (!this.ready) return;
    this.playing = false;
    this.input.enabled = false;
    this.input.releaseLock();
    this.stopBreathing();
    this.endPractice();
    this.ui.prompt(null);
    this.ui.prompt2(null);
    const best = Math.max(0, ...[...this.bonds.keys()].map((id) => this.hearts(id)));
    this.ui.showJournal([
      { title: `Today’s moment: find ${this.daily.npc.who.name}`, hint: `Near ${this.nearestRegionName(this.daily.npc.home.x, this.daily.npc.home.z)}. A new one each day`, done: this.dailyDone === this.daily.key },
      { title: 'Take three deep breaths', hint: 'Press B anywhere', done: this.breathsDone > 0 },
      { title: 'Say hello to a Calmling', hint: 'Walk up to one and press E', done: this.met.size > 0 },
      { title: 'Go for a walk with a friend', hint: 'Press E again to invite them', done: best >= 1 },
      { title: 'Hear a friend’s story', hint: 'Keep walking together until two hearts fill', done: best >= 2 },
      { title: 'Learn a practice', hint: 'Press Q beside a Calmling you have met', done: this.learned.size > 0 },
      { title: 'Glide', hint: 'Jump from somewhere high and keep holding Space', done: this.flags.has('glide') },
      { title: 'Rest at a viewpoint', hint: 'Look for a mossy log with a view', done: this.rested.size > 0 },
      { title: 'Plant a seed in the garden', hint: 'Find the soil plots near where you began', done: this.garden.serialize().some((g) => g.t > 0) },
      { title: 'See your flower in bloom', hint: 'It takes a few hours. Come back later', done: this.garden.blooms > 0 },
      { title: 'Find five calm seeds', hint: 'They glow, and hide in out-of-the-way places', done: this.seeds.foundIds.length >= 5 },
      { title: 'Skim a stone three times', hint: 'Press F at the edge of a lake', done: this.bestSkips >= 3 },
      { title: 'Build a pebble tower', hint: 'Small stacks of stones wait on the shores', done: this.cairns.tallest >= this.cairns.max },
      { title: 'Fly a kite', hint: 'Press K, then run', done: this.flags.has('kite') },
      { title: 'Catch a fish, and let it go', hint: 'Press R beside water, then wait', done: this.flags.has('fish') },
      { title: 'Sleep through a night', hint: 'Press Z after dark', done: this.flags.has('sleep') },
      { title: 'Fill your nook', hint: `${this.keepsakes.size} of ${KEEPSAKES.length} keepsakes. Home is just south-east of the garden`, done: this.keepsakes.size >= KEEPSAKES.length },
      { title: 'Pick fruit from your patch', hint: 'Beside the treehouse. It grows back in a few minutes', done: this.flags.has('pick') },
      { title: 'Eat a magical fruit', hint: 'Press 1, 2 or 3. Each one does something different', done: this.flags.has('eat') },
      { title: 'Bring a friend the fruit they love', hint: `${this.gifted.size} of ${this.npcs.length} lanterns hung. The log says who loves what`, done: this.gifted.size > 0 },
      { title: 'Go inside your treehouse', hint: 'Press E at the foot of the ladder', done: this.flags.has('inside') },
      { title: 'Light the fire', hint: 'At the fire ring by the treehouse, once evening comes', done: this.flags.has('fire') },
      { title: 'Spend an evening with friends', hint: 'Friends you have met come to the fire after dark', done: this.flags.has('gathering') },
      { title: 'Wake a calm spring', hint: `${this.springs.awakeCount} of ${this.springs.spots.length} awake. Breathe beside the ring of stones in each place`, done: this.springs.awakeCount > 0 },
      { title: 'Watch night fall', hint: 'Stay sitting and the day drifts by', done: this.flags.has('night') },
      { title: 'Take a photo', hint: 'Press P, frame it, press Enter', done: this.flags.has('photo') },
      { title: 'Visit every corner of the island', hint: 'Eight places to discover', done: this.discovered.size >= this.island.regions.length },
    ]);
  }
  photosSaved = 0;

  openLog(): void {
    if (!this.ready) return;
    this.playing = false;
    this.input.enabled = false;
    this.input.releaseLock();
    this.stopBreathing();
    this.endPractice();
    this.ui.prompt(null);
    this.ui.prompt2(null);
    const entries: LogEntry[] = this.npcs.map((npc) => {
      const met = this.met.has(npc.who.id);
      if (met && !this.portraits.has(npc.who.id)) this.portraits.set(npc.who.id, this.snapPortrait(npc));
      return {
        name: npc.who.name,
        meaning: npc.who.meaning,
        hello: npc.who.hello,
        hint: `Someone lives near ${this.nearestRegionName(npc.home.x, npc.home.z)}${npc.who.hours ? (npc.who.hours[0] > npc.who.hours[1] ? ', but only comes out after dark' : ', but only in the early morning') : ''}.`,
        met,
        companion: npc === this.companion,
        hearts: this.hearts(npc.who.id),
        story: this.hearts(npc.who.id) >= 2 ? npc.who.story : null,
        practice: this.learned.has(npc.who.id) ? npc.who.practice.title : null,
        likes: FRUITS[this.npcs.indexOf(npc) % 3].plural,
        gifted: this.gifted.has(npc.who.id),
        portrait: this.portraits.get(npc.who.id) ?? null,
      };
    });
    this.ui.showLog(entries);
  }

  /** Sit down and take three slow breaths, guided by the ring on screen. */
  private updateBreathing(dt: number): void {
    const b = this.breathing;
    if (this.input.breathePressed() && !b.active && !this.practice && this.player.sit()) b.start();
    if (!b.active) return;
    if (!this.player.sitting) {
      this.stopBreathing(); // the player moved: stand up, no fuss
      return;
    }
    const finished = b.update(dt);
    this.player.breath = b.fill;
    if (finished) {
      this.breathsDone++;
      this.reveal(this.player.pos.x, this.player.pos.z, 62); // three breaths push the fog back around you
      this.ambience.chime();
      this.ui.breath(null);
      const spring = this.springs.near(this.player.pos);
      if (this.practice?.npc.who.practice.type === 'breathe') this.completePractice();
      else if (spring >= 0 && this.springs.wake(spring)) {
        const sp = this.springs.spots[spring];
        const n = this.springs.awakeCount;
        this.reveal(sp.x, sp.z, 150);
        this.ui.moment(`A calm spring wakes · ${n} of ${this.springs.spots.length}`, sp.name, n === this.springs.spots.length ? 'Every spring is awake. The whole island is calm.' : 'Its light can be seen from far away');
        this.save();
      } else this.ui.toast('', 'Three deep breaths', 'Carry that calm with you');
      return;
    }
    const label = b.phase === 'in' ? 'Breathe in' : b.phase === 'hold' ? 'Hold' : 'Breathe out';
    this.ui.breath(label, b.fill, b.breath + (b.phase === 'out' ? 1 : 0), BREATHS);
  }

  /** Begin the small exercise a Calmling teaches. */
  private startPractice(npc: Npc): void {
    const pr = npc.who.practice;
    this.practice = { npc, t: 0, count: 0, motes: [], wasGrounded: true };
    this.ui.prompt(null);
    this.ui.prompt2(null);
    this.ui.toast(`${npc.who.name} shows you`, pr.title, pr.type === 'gather' ? `Find five ${pr.thing} nearby` : pr.type === 'hop' ? 'Hop five times. Go on!' : 'Sit, and take your time');
    if (pr.type === 'breathe') {
      if (this.player.sit()) this.breathing.start();
      else this.practice = null;
    } else if (pr.type === 'still') {
      if (!this.player.sit()) this.practice = null;
    } else if (pr.type === 'gather') {
      // five glowing things scattered within a short walk
      for (let i = 0; i < 5; i++) {
        let x = npc.pos.x;
        let z = npc.pos.z;
        for (let tries = 0; tries < 12; tries++) {
          const a = (i / 5) * Math.PI * 2 + Math.random();
          const r = 6 + Math.random() * 8;
          x = npc.pos.x + Math.cos(a) * r;
          z = npc.pos.z + Math.sin(a) * r;
          if (this.island.heightAt(x, z) > this.island.waterLevelAt(x, z) + 0.3) break;
        }
        const m = new THREE.Mesh(this.moteGeo, this.moteMat);
        m.position.set(x, this.island.heightAt(x, z) + 0.9, z);
        this.scene.add(m);
        this.practice.motes.push(m);
      }
    }
  }

  private updatePractice(dt: number): void {
    const pr = this.practice;
    if (!pr) return;
    const def = pr.npc.who.practice;
    const p = this.player.pos;
    pr.t += dt;
    if (def.type === 'breathe') {
      if (!this.breathing.active) this.endPractice(); // stood up early
      return;
    }
    if (def.type === 'still') {
      if (!this.player.sitting) {
        this.endPractice();
        return;
      }
      const total = 30;
      this.ui.breath(def.lines[Math.min(def.lines.length - 1, Math.floor((pr.t / total) * def.lines.length))], pr.t / total, 0, 0);
      if (pr.t >= total) this.completePractice();
      return;
    }
    if (def.type === 'gather') {
      const time = globalUniforms.uTime.value;
      pr.motes.forEach((m, i) => {
        if (!m.visible) return;
        m.position.y += Math.sin(time * 2 + i) * 0.004;
        m.scale.setScalar(1 + Math.sin(time * 4 + i * 2) * 0.18);
        if (Math.hypot(m.position.x - p.x, m.position.z - p.z) < 1.5) {
          m.visible = false;
          pr.count++;
        }
      });
      this.ui.breath(`${def.thing[0].toUpperCase()}${def.thing.slice(1)}: ${pr.count} of 5`, pr.count / 5, pr.count, 5);
    } else {
      if (pr.wasGrounded && !this.player.grounded && this.player.vel.y > 2) pr.count++;
      pr.wasGrounded = this.player.grounded;
      this.ui.breath(`Hop! ${pr.count} of 5`, pr.count / 5, pr.count, 5);
    }
    if (pr.count >= 5) this.completePractice();
    else if (Math.hypot(pr.npc.pos.x - p.x, pr.npc.pos.z - p.z) > 70) this.endPractice(); // wandered off
  }

  private completePractice(): void {
    const pr = this.practice;
    if (!pr) return;
    const first = !this.learned.has(pr.npc.who.id);
    this.learned.add(pr.npc.who.id);
    this.bonds.set(pr.npc.who.id, (this.bonds.get(pr.npc.who.id) ?? 0) + 60); // practising together brings you closer
    this.reveal(this.player.pos.x, this.player.pos.z, 55);
    this.ui.toast(first ? `Practice learned · ${this.learned.size} of ${this.npcs.length}` : 'Practice complete', pr.npc.who.practice.title, `With ${pr.npc.who.name}`);
    this.endPractice();
    this.save();
  }

  private endPractice(): void {
    const pr = this.practice;
    if (!pr) return;
    for (const m of pr.motes) this.scene.remove(m);
    this.practice = null;
    if (!this.breathing.active) this.ui.breath(null);
  }

  private stopBreathing(): void {
    this.breathing.cancel();
    this.player.breath = 0;
    this.ui.breath(null);
  }

  /** Mirror the scene for the water. Only on the best preset: it costs a second, lighter draw. */
  private drawReflection(): void {
    if (this.settings.quality !== 'high') {
      this.water.disableReflection();
      return;
    }
    const dist = QUALITY_PRESETS[this.settings.quality].distance;
    this.water.renderReflection(this.renderer, this.scene, this.camera, this.player.pos, (on) => {
      // the mirror image needs no grass, particles or fine plants, and trees can be stand-ins
      this.grassNear.mesh.visible = this.grassFar.mesh.visible = !on;
      this.ambient.group.visible = !on;
      this.weather.mesh.visible = !on && this.weather.rain > 0.02;
      this.vegetation.update(this.camera.position, on ? 0.02 : dist);
    });
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
    this.weather.update(dt, this.camera.position);
    // stay sitting after your breaths and the day drifts by ten times faster
    const drift = this.sleeping ? 40 : this.playing && this.player?.sitting && !this.breathing.active && !this.practice && !this.fishing.active ? 10 : 1;
    this.day.update(dt * drift, this.sun, this.hemi, this.scene.fog as THREE.FogExp2, this.weather.rain);
    this.garden.update(Date.now(), globalUniforms.uTime.value);
    this.home.update(globalUniforms.uTime.value, this.day.night, Date.now(), this.inside);
    this.springs.update(globalUniforms.uTime.value, this.day.night);
    // the music hushes for sleep, and beside a lit fire
    const hush = this.sleeping || (this.home.lit && !!this.player && Math.hypot(this.home.fireSpot.x - p.x, this.home.fireSpot.z - p.z) < 14);
    if (this.playing && hush !== this.ducked) {
      this.ducked = hush;
      this.music.duck(hush);
    }
    if (this.player) {
      this.hand.copy(this.player.pos);
      this.hand.y += 1.1;
      this.kite.update(dt, globalUniforms.uTime.value, this.hand, this.player.yaw, this.player.speed);
    }
    this.sky.update(dt, this.camera, this.day.night);
    globalUniforms.uPlayer.value.copy(p);
    this.camera.getWorldDirection(this.fwd);
    this.fwd.y = 0;
    this.fwd.normalize();
    this.grassNear.update(this.grassCenter.copy(p).addScaledVector(this.fwd, 4), p);
    this.grassFar.update(this.grassCenter.copy(p).addScaledVector(this.fwd, 36), p);
    this.vegetation.update(this.camera.position, QUALITY_PRESETS[this.settings.quality].distance);
    this.ambient.update(dt, globalUniforms.uTime.value, p, this.player.speed, this.player.grounded, this.day.night);
    for (const npc of this.npcs) npc.update(dt, globalUniforms.uTime.value, this.player, this.camera.position, this.day.hour);
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
    if (found && fogClearAt(p.x, p.z) < 0.5) found = null; // still lost in the fog here
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
    if (this.ready) this.updateKeepsakes();
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
      bonds: Object.fromEntries(this.bonds),
      hour: this.day.hour,
      practices: [...this.learned],
      garden: this.garden.serialize(),
      seeds: this.seeds.foundIds,
      reveals: this.reveals,
      bestSkips: this.bestSkips,
      viewpoints: [...this.rested],
      cairns: this.cairns.serialize(),
      flags: [...this.flags],
      dailyDone: this.dailyDone,
      keepsakes: [...this.keepsakes],
      basket: this.basket,
      fruit: this.home.serializeFruit(),
      gifted: [...this.gifted],
      springs: this.springs.serialize(),
    });
  }

  /** Read-only snapshot for the smoke test and the debug console. */
  debugState(): Record<string, unknown> {
    const p = this.player.pos;
    const info = this.renderer.info.render;
    return {
      basket: [...this.basket], effects: this.effects.map((e) => Math.round(e)), gifted: [...this.gifted], inside: this.inside,
      fireLit: this.home.lit, guests: this.guests, springs: this.springs.spots.length, springsAwake: this.springs.awakeCount,
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
      gliding: this.player.gliding,
      rain: this.weather.rain,
      practice: this.practice ? this.practice.npc.who.practice.type : null,
      practiceCount: this.practice?.count ?? 0,
      learned: [...this.learned],
      gardenPrompt: this.gardenPlot >= 0 ? this.garden.prompt(this.gardenPlot, Date.now()) : null,
      blooms: this.garden.blooms,
      seedsFound: this.seeds.foundIds.length,
      seedsTotal: this.seeds.spots.length,
      reveals: this.reveals.length,
      photo: this.photo,
      photosSaved: this.photosSaved,
      waterNear: this.waterNear,
      season: SEASON,
      fogHere: fogClearAt(p.x, p.z),
      arriving: this.player.arriving,
      reveals2: this.reveals.length,
      fishing: this.fishing.state,
      sleeping: this.sleeping,
      keepsakes: [...this.keepsakes],
      daily: { who: this.daily.npc.who.id, kind: this.daily.kind, done: this.dailyDone === this.daily.key },
      rested: [...this.rested],
      kite: this.kite.flying,
      cairnTallest: this.cairns.tallest,
      flags: [...this.flags],
      prompt: document.getElementById('prompt')!.classList.contains('hidden') ? null : document.getElementById('prompt-text')!.textContent,
      skips: this.skimming.skips,
      stoneFlying: this.skimming.flying,
      birdCalls: this.ambience.calls,
      footsteps: this.ambience.steps,
      absent: this.npcs.filter((n) => n.absent).map((n) => n.who.id),
      hour: this.day.hour,
      vy: this.player.vel.y,
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
