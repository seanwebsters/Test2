import * as THREE from 'three';
import { Npc } from '../npc/Npc';
import { RESIDENTS } from '../npc/roster';
import { CameraRig } from '../player/CameraRig';
import { Player } from '../player/Player';
import { BANDANA_RIG, BLUE_RIG, ELDER_RIG, HOODED_RIG, HORNED_RIG, SPARKLY_RIG, ORANGE_RIG, PINK_RIG, YETI_RIG } from '../player/CalmlingModel';
import { UI, type LogEntry } from '../ui/UI';
import { Ambient } from '../world/Ambient';
import { DayCycle } from '../world/DayCycle';
import { Garden } from '../world/Garden';
import { Seeds } from '../world/Seeds';
import { Skimming } from '../world/Skimming';
import { Fishing } from '../world/Fishing';
import { FRUITS, Home, KEEPSAKES } from '../world/Home';
import { Springs } from '../world/Springs';
import { Trail } from '../world/Trail';
import { LeafTrail } from '../world/LeafTrail';
import { Backdrop } from '../world/Backdrop';
import { ArrivalClouds } from '../world/Arrival';
import { SHOP_ITEMS, Shop } from '../world/Shop';
import { WildFruit } from '../world/WildFruit';
import { SEASON, currentSeason, setSeason } from '../world/season';
import { Cairns, Kite, Viewpoints } from '../world/Places';
import { CELL, GRID, HALF, WORLD_SIZE } from '../world/islandMap';
import { Weather } from '../world/Weather';
import { Grass } from '../world/Grass';
import { SPAWN, getIsland, type Island, type Region } from '../world/islandMap';
import { SKY_HORIZON, Sky } from '../world/Sky';
import { Terrain, bakeGroundTexture } from '../world/Terrain';
import { loadNatureModels } from '../world/NatureModels';
import { loadKit } from '../world/Kit';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
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

/** Small things to mean to do today. Three are offered each day; keeping any one counts the day. */
const INTENTS: Record<string, string> = {
  breathe: 'Take three slow breaths',
  water: 'Sit beside the water for a moment',
  fruit: 'Pick a fruit from your patch',
  friend: 'Walk a little way with a friend',
  fire: 'Light the fire this evening',
  view: 'Rest at a viewpoint',
  skim: 'Skim a stone',
  fish: 'Cast a line and wait',
  sleep: 'Lie down for a sleep',
  tend: 'Tend the garden',
};

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
  /** false while the title screen is up: the camera drifts round the treehouse instead of following the Calmling */
  private started = false;
  private titleFocus = new THREE.Vector3();
  private arrivalClouds = new ArrivalClouds();
  /** the guided introduction: 0 falling … 10 heading home, 99 finished */
  private tut = 99;
  private tutTimer = 0;
  private tutSpring = -1;
  private guide!: Npc;
  private trail!: Trail;
  private trailTarget: { x: number; z: number } | null = null;
  /** somewhere the player asked to be shown the way to */
  private wayTarget: { x: number; z: number } | null = null;
  private leafTrail = new LeafTrail();
  private nextCheck = 0;
  private days = 0;
  private streak = 0;
  private lastDay = '';
  private restWeek = -1;
  private intents: { key: string; ids: string[]; done: boolean[] } = { key: '', ids: [], done: [] };
  private introduced = new Set<string>();
  private toldDoing = new Map<string, string>();
  private shop!: Shop;
  private wild!: WildFruit;
  /** the springs in the order the chapters visit them: nearest home first, then on round the island */
  private chapters: number[] = [];
  private owned = new Set<string>();
  private decor = { rug: '', quilt: '', lamp: '' };
  private wantSleep = false;
  private camLook = new THREE.Vector3();
  private insideYaw = 0;
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
      onTitleTime: (hour) => {
        this.day.hour = hour;
      },
      onPause: () => this.pause(),
      onToday: () => this.openToday(),
      onSkipIntro: () => {
        this.tut = 99;
        this.ui.introRunning(false);
        this.pickIntents();
        this.save();
        this.play();
      },
      onArrive: () => {
        if (this.inside) this.leaveHome();
        this.player.dropFromSky(0, 6, 120);
        this.arrivingIntro = true;
        this.rig.yaw = -2.19; // facing the treehouse and its light
        this.rig.pitch = 0.36;
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
        this.day.hour = 15.4; // a fresh start arrives into the golden afternoon
        this.setCompanion(null);
        // a fresh start begins as the very first one did: down from the sky, with the introduction
        this.days = 0;
        this.streak = 0;
        this.lastDay = '';
        this.restWeek = -1;
        this.introduced.clear();
        this.owned.clear();
        this.wild.load([]);
        this.decor = { rug: '', quilt: '', lamp: '' };
        this.applyDecor();
        this.intents = { key: '', ids: [], done: [] };
        this.home.setVine(0);
        this.tut = 0;
        this.ui.introRunning(true);
        this.player.dropFromSky(0, 6, 120);
        this.arrivingIntro = true;
        this.rig.yaw = -2.19; // facing the treehouse and its light
        this.rig.pitch = 0.36;
        this.rig.dist = 9;
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
      }
    });
    window.addEventListener('keydown', (e) => {
      if (e.code !== 'KeyL' || !this.ready || e.repeat) return;
      if (this.playing) this.openLog();
      else if (this.ui.logOpen) this.play();
    });
    if (!opts.test) {
      // Music from the very start. Browsers hold sound back until the first tap, click or key,
      // so it is asked for now and again on the first touch of anything, loading screen included.
      void this.music.start();
      const wake = (): void => void this.music.start();
      for (const ev of ['pointerdown', 'touchend', 'keydown', 'click']) window.addEventListener(ev, wake, { passive: true });
    }
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
    const kit = this.opts.plainPlants ? null : await loadKit(base);
    this.home = new Home(this.island, kit);
    this.vegetation.colliders.add(this.home.x, this.home.z, 3.7);
    for (const [sx, sz, sr] of this.home.solids) this.vegetation.colliders.add(sx, sz, sr);
    this.springs = new Springs(this.island, this.vegetation.colliders);
    this.scene.add(this.springs.group, this.glow);
    this.shop = new Shop(this.island, this.vegetation.colliders, kit);
    this.scene.add(this.shop.group);
    this.wild = new WildFruit(this.island, this.vegetation.colliders, [
      { x: 0, z: 0, r: 18 },
      { x: this.home.x, z: this.home.z, r: 22 },
      { x: this.shop.x, z: this.shop.z, r: 9 },
      ...this.springs.spots.map((sp) => ({ x: sp.x, z: sp.z, r: 6 })),
    ]);
    this.scene.add(this.wild.group);
    {
      // each chapter leads on to the nearest spring not yet visited
      const left = this.springs.spots.map((_, i) => i);
      let cx = this.home.x;
      let cz = this.home.z;
      while (left.length) {
        left.sort((a, b) => Math.hypot(this.springs.spots[a].x - cx, this.springs.spots[a].z - cz) - Math.hypot(this.springs.spots[b].x - cx, this.springs.spots[b].z - cz));
        const i = left.shift()!;
        this.chapters.push(i);
        cx = this.springs.spots[i].x;
        cz = this.springs.spots[i].z;
      }
    }
    this.scene.add(new Backdrop().group, this.arrivalClouds.group);
    this.trail = new Trail(this.island);
    this.scene.add(this.trail.points, this.leafTrail.points);
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
    if (!this.opts.plainPlants) {
      // the sculpted Calmling; if it cannot be loaded the built-in one simply stays
      try {
        const sculpt = await new GLTFLoader().loadAsync(`${base}models/calmling/blue.glb`);
        this.player.model.useSculpt(sculpt.scene);
      } catch (err) {
        console.info('Sculpted Calmling unavailable, using the built-in one:', err);
      }
    }
    this.rig = new CameraRig(this.camera, this.island);
    RESIDENTS.forEach((who, i) => {
      const npc = new Npc(who, this.island, i);
      this.npcs.push(npc);
      this.scene.add(npc.model.root);
      if (npc.prop) this.scene.add(npc.prop);
    });
    if (!this.opts.plainPlants) {
      try {
        const glb = await new GLTFLoader().loadAsync(`${base}models/calmling/bandana.glb`);
        this.shop.useSculpt(glb.scene, BANDANA_RIG);
      } catch (err) {
        console.info('Sculpted Sampoyoshi unavailable, using the built-in one:', err);
      }
    }
    if (!this.opts.plainPlants) {
      // friends who have a sculpted model; anyone whose file cannot be loaded keeps the built-in one
      await Promise.all(
        ([['dadirri', 'pink', PINK_RIG], ['apricus', 'orange', ORANGE_RIG], ['psithuros', 'yeti', YETI_RIG], ['kintsugi', 'volcanic', BLUE_RIG], ['meraki', 'heart', BLUE_RIG], ['komorebi', 'sun', BLUE_RIG], ['wabisabi', 'patchwork', ORANGE_RIG], ['genkaku', 'hooded', HOODED_RIG], ['misogi', 'sparkly', SPARKLY_RIG], ['morgenfrisk', 'fluffy', BLUE_RIG], ['gokotta', 'spiky', BLUE_RIG], ['kupuna', 'elder', ELDER_RIG], ['desbundar', 'party', ORANGE_RIG], ['shinrin', 'mossy', BLUE_RIG], ['harmonia', 'eyelash', ORANGE_RIG], ['extrawunsch', 'scholar', ORANGE_RIG], ['mangata', 'horned', HORNED_RIG], ['shu', 'peach', BLUE_RIG]] as const).map(async ([id, file, rig]) => {
          try {
            const glb = await new GLTFLoader().loadAsync(`${base}models/calmling/${file}.glb`);
            this.npcs.find((n) => n.who.id === id)?.model.useSculpt(glb.scene, rig);
          } catch (err) {
            console.info(`Sculpted ${id} unavailable, using the built-in one:`, err);
          }
        }),
      );
    }
    this.pickDaily();
    // one friend lives close by, down the earth path by the river: the first you are sent to find
    {
      this.guide = [...this.npcs].filter((n) => !n.who.hours).sort((a, b) => Math.hypot(a.home.x - 62, a.home.z - 14) - Math.hypot(b.home.x - 62, b.home.z - 14))[0];
      const grad = { x: 0, z: 0 };
      for (let i = 0; i < 80; i++) {
        const x = 62 + Math.cos(i * 2.4) * i * 0.5;
        const z = 15 + Math.sin(i * 2.4) * i * 0.5;
        if (this.island.heightAt(x, z) > this.island.waterLevelAt(x, z) + 0.8 && this.island.gradientAt(x, z, grad) < 0.3) {
          this.guide.moveHome(x, z);
          break;
        }
      }
      let best = 1e9;
      this.springs.spots.forEach((sp, i) => {
        const d = Math.hypot(sp.x - this.home.x, sp.z - this.home.z);
        if (d < best && d < 160) {
          best = d;
          this.tutSpring = i;
        }
      });
    }

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
      this.tut = save.tut ?? 99;
      this.wild.load(save.wild);
      for (const id of save.owned ?? []) this.owned.add(id);
      if (save.decor) this.decor = { rug: save.decor.rug || '', quilt: save.decor.quilt || '', lamp: save.decor.lamp || '' };
      this.days = save.days ?? 0;
      this.streak = save.streak ?? 0;
      this.lastDay = save.lastDay ?? '';
      this.restWeek = save.restWeek ?? -1;
      if (save.intents && Array.isArray(save.intents.ids)) this.intents = save.intents;
      for (const id of save.introduced ?? []) this.introduced.add(id);
      const friend = this.npcs.find((n) => n.who.id === save.companion);
      if (friend) {
        this.setCompanion(friend);
        friend.pos.set(save.pos[0] + 1.2, 0, save.pos[2] + 1.2);
      }
      for (const id of save.discovered) this.discovered.add(id);
    }
    this.rig.snap(this.player);
    this.ui.seeds(this.seeds.foundIds.length, this.seeds.spots.length);
    if (!save && !this.opts.test) this.tut = 0;
    if (this.tut >= 9) this.pickIntents();
    this.home.setVine(this.days);
    this.applyDecor();
    this.ui.introRunning(this.tut < 99);
    if ((!save && !this.opts.test) || this.opts.intro) {
      this.player.dropFromSky(0, 6, 120);
      this.arrivingIntro = true;
      this.rig.yaw = -2.19; // facing the treehouse and its light
      this.rig.pitch = 0.36;
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
    this.started = true;
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
    if (this.post) {
      this.post.enabled = s.quality !== 'low';
      // contact shade and sun shafts come in with the better presets
      this.post.ao = s.quality === 'ultra' ? 1 : s.quality === 'high' ? 0.85 : 0;
      this.post.rays = s.quality === 'ultra' ? 0.3 : s.quality === 'high' ? 0.24 : s.quality === 'medium' ? 0.16 : 0;
      this.post.dof = s.quality === 'ultra' ? 1 : s.quality === 'high' ? 0.8 : 0;
    }
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
      this.player.update(dt, this.input, this.inside ? this.insideYaw : this.rig.yaw);
      const now = globalUniforms.uTime.value;
      if (this.player.arriving) {
        // falling in: the view is held on the island and the treehouse, whatever the mouse does
        // looking down at the treehouse and garden from on high, levelling out as the ground comes up
        const up = this.player.pos.y - this.island.heightAt(this.player.pos.x, this.player.pos.z);
        this.rig.yaw = -2.19;
        this.rig.pitch = Math.min(1.12, Math.max(0.3, Math.atan2(up, 62)));
        this.rig.dist = 12;
      }
      if (this.inside) {
        // indoors the camera sits in one corner of the room
        // (it turns a little to keep the Calmling in view as he potters about)
        this.camera.position.copy(this.home.inside.cam);
        this.camLook.copy(this.home.inside.look).lerp(this.player.pos, 0.42);
        this.camLook.y += 0.25;
        this.camera.lookAt(this.camLook);
        this.insideYaw = Math.atan2(this.camera.position.x - this.camLook.x, this.camera.position.z - this.camLook.z);
      } else this.rig.update(dt, this.input, this.player, this.settings, this.breathing.active ? this.player.yaw : now < this.momentUntil ? this.momentYaw : null);
      this.updateFog(dt);
      this.updateHums();
      if (this.arrivingIntro && !this.player.arriving) {
        this.arrivingIntro = false;
        this.ui.moment('Welcome to', 'Calm Island', 'A quiet place, all your own. Somewhere close, a warm light is glowing.');
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
      this.updateGuide(dt);
      // V (or the Leaf button): hop onto a big leaf and skim over the island
      if (this.player.surfing && (this.player.sitting || this.inside || this.sleeping || this.player.arriving)) this.player.surfing = false;
      if (this.input.surfPressed() && !this.inside && !this.sleeping && !this.player.sitting && !this.player.arriving && !this.fishing.active) {
        this.player.surfing = !this.player.surfing;
        this.ambience.whoosh();
        if (this.player.surfing) {
          this.kite.flying = false;
          this.player.model.impulse(1.6);
          if (!this.flags.has('surf')) {
            this.flags.add('surf');
            this.ui.toast('', 'Leaf riding', this.ui.touch ? 'Tap Leaf again to hop off' : 'Press V again to hop off');
          }
        }
      }
      if (this.input.kitePressed() && !this.inside) {
        this.kite.flying = !this.kite.flying;
        if (this.kite.flying) this.flags.add('kite');
      }
      if (this.player.gliding) this.flags.add('glide');
      if (this.day.hour > 18.2) this.flags.add('night');
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
    if (!this.started) {
      // the title screen: a slow drift round the treehouse and its fruit patch
      const t = globalUniforms.uTime.value;
      const a = Math.atan2(-0.746, -0.666) + 0.55 + Math.sin(t * 0.05) * 0.4;
      const cx = this.home.x + Math.sin(a) * 19;
      const cz = this.home.z + Math.cos(a) * 19;
      this.camera.position.set(cx, Math.max(this.island.heightAt(cx, cz) + 2.2, this.island.heightAt(this.home.x, this.home.z) + 4.6 + Math.sin(t * 0.07) * 0.8), cz);
      this.titleFocus.set(this.home.x + 3, this.island.heightAt(this.home.x, this.home.z) + 4.3, this.home.z - 2);
      this.camera.lookAt(this.titleFocus);
    }
    this.input.endFrame();
    this.updateWorld(dt);
    this.renderer.info.reset();
    this.drawReflection();
    this.post.focus = this.started ? Math.max(3, this.camera.position.distanceTo(this.player.pos)) : 18;
    this.post.setSun(SUN_DIR, this.sun.color, this.inside ? 0 : this.day.night > 0.5 ? 0.25 : Math.min(1, this.sun.intensity / 3));
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
      const busy = this.sleeping || this.breathing.active;
      const at = busy ? '' : this.home.doorNear(p) ? 'door' : this.home.chestNear(p) ? 'chest' : this.home.bedNear(p) ? 'bed' : '';
      this.ui.prompt(at === 'door' ? 'Step outside' : at === 'chest' ? 'Open your chest' : at === 'bed' ? 'Get into bed' : null);
      if (at && this.input.interactPressed()) {
        if (at === 'door') this.leaveHome();
        else if (at === 'chest') this.openChest();
        else this.wantSleep = true;
      }
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
        if (did) {
          this.did('tend');
          this.save();
        }
      }
      return;
    }
    if (!best && !this.practice && this.shop.near(p)) {
      this.nearby = null;
      this.homePrompt = true;
      this.ui.prompt2(null);
      const open = this.shop.open(this.day.hour);
      this.ui.prompt(open ? 'Browse Sampoyoshi’s stall' : null);
      if (!this.flags.has('shop')) {
        this.flags.add('shop');
        this.ui.toast('Sampoyoshi’s stall', open ? 'Come and have a look' : 'Shut for the night', 'He trades rugs, quilts and lanterns for fruit from your patch');
      }
      if (open && this.input.interactPressed()) this.openShop();
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
          this.did('view');
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
    if (!best && !this.practice && !this.breathing.active && !this.fishing.active && !this.player.sitting && this.player.grounded) {
      // E always does whatever fits where you stand: pick a wild bush, or at the water's edge skim (E) or fish (Q)
      const bush = this.wild.near(p, Date.now());
      if (bush >= 0) {
        this.nearby = null;
        this.homePrompt = true;
        this.ui.prompt(`Pick wild ${this.wild.name(bush)}`);
        this.ui.prompt2(null);
        if (this.input.interactPressed()) {
          const kind = this.wild.pick(bush, Date.now());
          this.basket[kind]++;
          this.flags.add('wild');
          this.did('fruit');
          this.ambience.plip(0.5);
          this.ui.toast('', `A ${FRUITS[kind].name}`, `${this.basket[kind]} in your basket. The bush will fruit again in a few minutes`);
          this.save();
        }
        return;
      }
      if (this.waterNear > 0.12) {
        this.nearby = null;
        this.homePrompt = true;
        this.ui.prompt('Skim a stone');
        this.ui.prompt2('Cast a line');
        if (this.input.interactPressed()) {
          this.input.press('skim');
          this.input.release('skim');
        } else if (this.input.practisePressed()) {
          this.input.press('fish');
          this.input.release('fish');
        }
        return;
      }
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
        this.did('fruit');
        this.ui.toast(first ? 'Into your basket' : '', `A ${FRUITS[kind].name}`, first ? `Press ${kind + 1} (or tap it) to eat it, or take it to a friend who loves them` : `${this.basket[kind]} in your basket. It will grow back in a few minutes`);
        this.save();
      };
    } else if (home.fireNear(p)) {
      if (!home.lit && evening) {
        text = 'Light the fire';
        act = () => {
          home.lit = true;
          this.flags.add('fire');
          this.did('fire');
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
    this.player.room = this.home.room;
    this.player.pos.copy(this.home.inside.pos);
    this.player.vel.set(0, 0, 0);
    this.player.yaw = this.home.inside.yaw;
    this.camera.fov = Math.min(86, this.baseFov + 24);
    this.camera.updateProjectionMatrix();
    const first = !this.flags.has('inside');
    this.flags.add('inside');
    this.ui.toast(first ? 'Your own room' : '', 'Home', 'Warm and quiet. Have a wander round');
    this.save();
  }

  private leaveHome(): void {
    if (!this.inside) return;
    if (this.sleeping) this.wake(false);
    this.inside = false;
    this.ui.prompt(null);
    this.player.hold = null;
    this.player.room = null;
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
    if (k >= 0 && !this.sleeping && !this.player.arriving) {
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
    {
      const ch = this.currentChapter();
      const left = this.tut >= 9 ? this.intents.done.filter((d) => !d).length : 0;
      let waiting = 0;
      for (const n of this.npcs) if (this.met.has(n.who.id) && !this.gifted.has(n.who.id)) waiting++;
      this.ui.hud(Math.max(1, this.days), ch >= 0 ? this.springs.spots[this.chapters[ch]].name : 'All awake', this.springs.awakeCount / Math.max(1, this.springs.spots.length), this.lastDay === this.dayKey() && left < 3 ? 0 : left, waiting);
    }
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
    // friends are found doing calm things; sit down near one and you are keeping them company
    for (const npc of this.npcs) {
      if (npc.absent || !npc.doing || !this.met.has(npc.who.id)) {
        continue;
      }
      const d = Math.hypot(npc.pos.x - p.x, npc.pos.z - p.z);
      if (d < 9 && !this.toldDoing.has(npc.who.id) && this.tut >= 9) {
        this.toldDoing.set(npc.who.id, npc.doing);
        this.ui.toast('', `${npc.who.name} is ${npc.doing}`, this.ui.touch ? 'Sit down beside them for a while' : 'Sit down beside them for a while (B)');
      }
      if (d < 5.5 && this.player.sitting) {
        this.bonds.set(npc.who.id, (this.bonds.get(npc.who.id) ?? 0) + 2.5);
        if (!this.flags.has('together')) {
          this.flags.add('together');
          this.ui.toast('', 'Sitting together', `Time spent beside ${npc.who.name} counts as time with a friend`);
        }
      }
    }
    if (this.player.sitting && this.waterNear > 0.12) this.did('water');
    if (this.companion && this.player.speed > 1) this.did('friend');
    const s = this.springs.near(p);
    if (s >= 0 && !this.springs.isAwake(s) && !this.springHinted.has(s) && this.tut >= 6) {
      this.springHinted.add(s);
      this.ui.toast('A sleeping spring', this.springs.spots[s].name, 'Sit beside it and take three deep breaths to wake it');
    }
  }

  private applyDecor(): void {
    const col = (id: string, plain: number): number => SHOP_ITEMS.find((i) => i.id === id)?.color ?? plain;
    this.home.setDecor(col(this.decor.rug, 0x6fa8c9), col(this.decor.quilt, 0x7fb7e6), col(this.decor.lamp, 0xffd27a));
    this.home.setExtras(this.owned);
  }

  private openCard(): void {
    this.playing = false;
    this.input.enabled = false;
    this.input.releaseLock();
    this.stopBreathing();
    this.ui.prompt(null);
    this.ui.prompt2(null);
  }

  /** Sampoyoshi's stall: this week's goods, paid for in fruit. */
  openShop(): void {
    this.openCard();
    const week = Math.floor(Number(this.dayKey()) / 7);
    // seven of the eleven things are out each week; the rest come round again
    const stock = SHOP_ITEMS.filter((_, i) => (i * 7 + week * 5) % 11 < 7);
    const hex = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;
    this.ui.showChoices(
      'Sampoyoshi’s stall',
      `“Take your time. Fruit will do nicely.” You have ${this.basket[0]} ${this.basket[0] === 1 ? 'starberry' : 'starberries'}, ${this.basket[1]} moon ${this.basket[1] === 1 ? 'melon' : 'melons'} and ${this.basket[2]} sun ${this.basket[2] === 1 ? 'pod' : 'pods'}. New things arrive each week.`,
      stock.map((it) => {
        const has = this.owned.has(it.id);
        const can = it.cost.every((n, i) => this.basket[i] >= n);
        return { id: it.id, name: it.name, note: it.note, color: hex(it.color), cost: has ? undefined : it.cost, action: has ? 'Yours' : can ? 'Trade' : 'Need fruit', enabled: !has && can };
      }),
      (id) => {
        const it = SHOP_ITEMS.find((i) => i.id === id)!;
        if (this.owned.has(id) || !it.cost.every((n, i) => this.basket[i] >= n)) return;
        it.cost.forEach((n, i) => (this.basket[i] -= n));
        this.owned.add(id);
        if (it.kind !== 'home') this.decor[it.kind] = id; // new things go straight into use
        this.applyDecor();
        this.ambience.chime();
        this.save();
        this.openShop();
      },
    );
  }

  /** Today's three intentions, from the gold star. */
  openToday(): void {
    if (!this.ready || !this.playing) return;
    this.openCard();
    if (this.tut < 9) {
      this.ui.showChoices('Today', 'Your first day is the introduction. Three small intentions arrive once it is done.', [], () => {});
      return;
    }
    this.pickIntents();
    const kept = this.intents.done.filter(Boolean).length;
    const icons: Record<string, string> = { breathe: 'drop', water: 'drop', fruit: 'berry', friend: 'heart', fire: 'lantern', view: 'star', skim: 'drop', fish: 'drop', sleep: 'lantern', tend: 'melon' };
    const where: Record<string, string> = { breathe: 'Anywhere you like', water: 'By the river, a lake or the sea', fruit: 'In the patch beside your treehouse', friend: 'Invite one along', fire: 'At the fire ring, once evening comes', view: 'Look for a mossy log with a view', skim: 'At the edge of any water', fish: 'Beside any water', sleep: 'In your bed, or anywhere after dark', tend: 'The plots in the Calm Garden' };
    const next = this.intents.ids.find((_, i) => !this.intents.done[i]);
    this.ui.showChoices(
      'Today',
      kept ? `${kept} of 3 kept. Day ${Math.max(1, this.days)} is counted, and the vine has its leaf.` : 'Keep any one of these and your vine grows a leaf.',
      this.intents.ids.map((id, i) => ({ id, name: INTENTS[id], note: where[id], color: '', icon: icons[id], action: '', enabled: false, done: this.intents.done[i] })),
      () => {},
      next
        ? {
            label: 'Show me the way',
            run: () => {
              // sparkles lead to the nearest place the next intention can be kept
              const p = this.player.pos;
              const nearest = (list: { x: number; z: number }[]): { x: number; z: number } | null => [...list].sort((a, b2) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b2.x - p.x, b2.z - p.z))[0] ?? null;
              const ch = this.currentChapter();
              this.wayTarget =
                next === 'fruit' ? this.home.plantSpot(0, Date.now())
                : next === 'fire' ? this.home.fireSpot
                : next === 'sleep' ? this.home.ladderSpot
                : next === 'tend' ? { x: 9, z: 3 }
                : next === 'view' ? nearest(this.viewpoints.spots)
                : next === 'friend' ? nearest(this.npcs.filter((n) => this.met.has(n.who.id) && !n.absent).map((n) => n.pos))
                : next === 'breathe' ? (ch >= 0 ? this.springs.spots[this.chapters[ch]] : null)
                : nearest(this.island.lakes);
              this.nextCheck = 0;
              this.play();
            },
          }
        : undefined,
    );
  }

  /** The chest indoors: choose which rug, quilt and lantern are out. */
  openChest(): void {
    this.openCard();
    const hex = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;
    const rows = (['rug', 'quilt', 'lamp'] as const).flatMap((kind) => {
      const plain = { rug: ['Sky-blue rug', 0x6fa8c9], quilt: ['Blue quilt', 0x7fb7e6], lamp: ['Candle lantern', 0xffd27a] }[kind] as [string, number];
      return [
        { id: `${kind}:`, name: plain[0], note: 'The one that came with the house', color: hex(plain[1]), action: this.decor[kind] === '' ? 'In use' : 'Use', enabled: this.decor[kind] !== '' },
        ...SHOP_ITEMS.filter((i) => i.kind === kind && this.owned.has(i.id)).map((i) => ({ id: `${kind}:${i.id}`, name: i.name, note: i.note, color: hex(i.color), action: this.decor[kind] === i.id ? 'In use' : 'Use', enabled: this.decor[kind] !== i.id })),
      ];
    });
    this.ui.showChoices('Your chest', this.owned.size ? 'Choose what to put out.' : 'Only the things that came with the house, for now. Sampoyoshi’s stall by the river has more.', rows, (id) => {
      const [kind, item] = id.split(':') as ['rug' | 'quilt' | 'lamp', string];
      this.decor[kind] = item;
      this.applyDecor();
      this.save();
      this.openChest();
    });
  }

  /** Today, as a whole number of local days. */
  private dayKey(): string {
    return String(Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 864e5));
  }

  /** Three intentions for today, the same all day and different tomorrow. */
  private pickIntents(): void {
    const key = this.dayKey();
    if (this.intents.key === key && this.intents.ids.length === 3) return;
    const pool = Object.keys(INTENTS).filter((id) => id !== 'friend' || this.met.size > 0);
    let h = Number(key) * 2654435761;
    const ids: string[] = [];
    while (ids.length < 3) {
      h = (h * 1103515245 + 12345) >>> 0;
      const id = pool[h % pool.length];
      if (!ids.includes(id)) ids.push(id);
    }
    this.intents = { key, ids, done: [false, false, false] };
  }

  /** Something was just done. If it is one of today's intentions, it is kept, and the first one counts the day. */
  private did(id: string): void {
    if (this.tut < 9) return;
    this.pickIntents();
    const i = this.intents.ids.indexOf(id);
    if (i < 0 || this.intents.done[i]) return;
    this.intents.done[i] = true;
    const kept = this.intents.done.filter(Boolean).length;
    // every intention kept leaves a fruit in the basket
    const gift = (Number(this.dayKey()) + i) % 3;
    this.basket[gift]++;
    if (!this.countDay()) this.ui.toast(`Intention kept · ${kept} of 3`, INTENTS[id], kept === 3 ? 'All three. A full, gentle day' : `A ${FRUITS[gift].name} for your basket`);
    this.save();
  }

  /**
   * Count today as a day on the island, once. Days only ever add up. The run of
   * days in a row forgives one missed day a week, and never punishes a longer gap:
   * it simply starts again while the vine keeps every leaf.
   */
  private countDay(): boolean {
    const today = this.dayKey();
    if (this.lastDay === today) return false;
    const gap = this.lastDay ? Number(today) - Number(this.lastDay) : 0;
    const week = Math.floor(Number(today) / 7);
    if (gap === 1) this.streak++;
    else if (gap === 2 && this.restWeek !== week) {
      this.streak++;
      this.restWeek = week;
    } else this.streak = 1;
    this.lastDay = today;
    this.days++;
    this.home.setVine(this.days);
    const milestone = [3, 7, 14, 30].includes(this.streak);
    if (milestone) for (let k = 0; k < 3; k++) this.basket[k]++;
    this.ambience.chime();
    this.ui.moment(
      this.streak > 1 ? `${this.streak} days in a row` : 'Your vine grows',
      `Day ${this.days} on the island`,
      milestone ? 'A gift for coming back: one of each fruit is in your basket' : this.days % 7 === 0 ? 'A flower has opened on the vine at your treehouse' : 'A new leaf has opened on the vine at your treehouse',
    );
    return true;
  }

  /** Which chapter the story has reached (an index into `chapters`), or -1 when every spring is awake. */
  private currentChapter(): number {
    return this.chapters.findIndex((i) => !this.springs.isAwake(i));
  }

  /** After a spring wakes, a letter arrives from a friend in the next region, and they go on your map. */
  private chapterLetter(woke: number): void {
    if (!this.playing) return;
    const ch = this.currentChapter();
    const here = this.springs.spots[woke].name;
    this.playing = false;
    this.input.enabled = false;
    this.input.releaseLock();
    this.ui.prompt(null);
    this.ui.prompt2(null);
    if (ch < 0) {
      this.ui.showLetter('A letter, signed by everyone', [
        'Dear friend,',
        'Every spring on the island is awake. We can see their lights from all our doors tonight.',
        'There is nothing left that needs doing, which is the best time of all to do things. Come and sit by the fire.',
        '— all of us',
      ]);
      return;
    }
    const sp = this.springs.spots[this.chapters[ch]];
    const writer = [...this.npcs].sort((a, b) => Math.hypot(a.home.x - sp.x, a.home.z - sp.z) - Math.hypot(b.home.x - sp.x, b.home.z - sp.z))[0];
    const known = this.met.has(writer.who.id);
    if (!known) this.introduced.add(writer.who.id);
    this.ui.showLetter(`Chapter ${ch + 1} · a letter by leaf`, [
      known ? `Dear friend,` : 'Dear neighbour (we have not met yet),',
      `We saw the light go up over ${here}. It reached all the way here.`,
      `There is a spring near me too, in ${sp.name}, and it has been asleep a long while. Would you come and wake it? I have ringed it on your map.`,
      'Bring your walking feet. There is wild fruit along the way.',
      `— ${writer.who.name}`,
    ]);
    this.save();
  }

  /** A friend mentions another Calmling: the nearest one you have not met gets a ? on the map. */
  private introduce(from: Npc): void {
    const next = this.npcs
      .filter((n) => n !== from && !this.met.has(n.who.id) && !this.introduced.has(n.who.id))
      .sort((a, b) => a.home.distanceTo(from.home) - b.home.distanceTo(from.home))[0];
    if (!next) return;
    this.introduced.add(next.who.id);
    this.ui.toast(`${from.who.name} tells you`, 'A friend lives nearby', `Near ${this.nearestRegionName(next.home.x, next.home.z)}. A ? on your map shows roughly where`);
    this.save();
  }

  /**
   * The guided first ten minutes, one step at a time, then the single line of
   * suggestion that stays under the logo. Also decides where the sparkle trail leads.
   */
  private updateGuide(dt: number): void {
    const p = this.player.pos;
    const g = this.guide;
    const like = this.npcs.indexOf(g) % 3;
    const fruit = FRUITS[like];
    const key = (k: string): string => (this.ui.touch ? '' : ` (${k})`);
    let text: string | null = null;
    let target: { x: number; z: number } | null = null;
    const go = (step: number): void => {
      this.tut = step;
      this.tutTimer = 0;
      this.save();
    };
    this.tutTimer += dt;
    switch (this.tut) {
      case 0:
        if (!this.arrivingIntro && !this.player.arriving) go(1);
        break;
      case 1:
        text = 'Walk toward the warm light';
        target = this.home;
        if (this.flags.has('home')) go(2);
        break;
      case 2:
        text = `Climb up and go inside${key('E at the ladder')}`;
        target = this.home.ladderSpot;
        if (this.inside) go(3);
        break;
      case 3:
        text = 'Make yourself at home';
        if (this.tutTimer > 2.2 || !this.inside) {
          go(4);
          this.playing = false;
          this.input.enabled = false;
          this.input.releaseLock();
          this.ui.prompt(null);
          this.ui.showLetter('A letter, left on your bed', [
            'Dear new neighbour,',
            'Welcome to Calm Island. I saw you float down and hoped you would find the little house. It has been waiting for someone.',
            `I live down by the river, just along the earth path. I would love a visitor. I am very fond of ${fruit.plural}, if any are ripe in your patch.`,
            'No hurry at all.',
            `— ${g.who.name}`,
          ]);
        }
        break;
      case 4:
        text = this.inside ? `Step outside${key('E')}, then pick a ${fruit.name} for ${g.who.name}` : `Pick a ${fruit.name} from your patch for ${g.who.name}${key('E')}`;
        target = this.inside ? null : this.home.plantSpot(like, Date.now());
        if (this.basket[like] > 0 || this.met.has(g.who.id)) go(this.tutSpring >= 0 && !this.springs.isAwake(this.tutSpring) ? 5 : 6);
        break;
      case 5: {
        const sp = this.springs.spots[this.tutSpring];
        text = Math.hypot(sp.x - p.x, sp.z - p.z) < 6.5 ? `Sit and take three slow breaths${key('B')}` : 'A spring is sleeping nearby. Follow the sparkles';
        target = sp;
        if (this.springs.isAwake(this.tutSpring) || this.met.has(g.who.id)) go(6);
        break;
      }
      case 6:
        text = `Someone is humming down by the river. Follow the sparkles`;
        target = g.pos;
        if (this.met.has(g.who.id)) go(7);
        break;
      case 7:
        text = `Give ${g.who.name} the ${fruit.name}${key('Q')}`;
        if (this.gifted.has(g.who.id) || this.basket[like] === 0 || this.tutTimer > 60) go(8);
        break;
      case 8:
        text = `Invite ${g.who.name} to walk with you${key('E')}`;
        if (this.companion === g || this.tutTimer > 45) {
          go(9);
          this.introduce(g);
        }
        break;
      case 9:
        if (this.tutTimer < 0.1) this.pickIntents();
        text = `Three small intentions for today are in your journal${key('J')}`;
        if (this.tutTimer > 9) go(10);
        break;
      case 10:
        text = 'Head home and see what has grown';
        target = this.home;
        if (this.home.near(p)) {
          go(99);
          this.ui.introRunning(false);
          this.countDay();
          this.save();
        }
        break;
      default: {
        // after the introduction: at most one quiet suggestion, refreshed now and then
        this.nextCheck -= dt;
        if (this.nextCheck > 0) return void this.trail.update(dt, globalUniforms.uTime.value, p, this.trailTarget, this.camera.position);
        this.nextCheck = 2;
        this.pickIntents();
        let near: Npc | null = null;
        let nearD = 60;
        for (const n of this.npcs) {
          const d = Math.hypot(n.pos.x - p.x, n.pos.z - p.z);
          if (!n.absent && !this.met.has(n.who.id) && d < nearD) {
            nearD = d;
            near = n;
          }
        }
        const undone = this.intents.ids.find((_, i) => !this.intents.done[i]);
        const told = this.npcs.find((n) => this.introduced.has(n.who.id) && !this.met.has(n.who.id));
        if (near) text = 'Someone is humming nearby. Follow the sparkles';
        else if (this.lastDay !== this.dayKey() && undone) text = `Today: ${INTENTS[undone].toLowerCase()}`;
        else if (told) text = `A friend is waiting near ${this.nearestRegionName(told.home.x, told.home.z)}. See the ? on your map`;
        target = near ? near.pos : null;
        // otherwise the story leads on: the next sleeping spring
        const ch = this.currentChapter();
        if (ch >= 0) {
          const sp = this.springs.spots[this.chapters[ch]];
          const d = Math.hypot(sp.x - p.x, sp.z - p.z);
          if (!text) text = d < 7 ? 'Sit and take three slow breaths to wake the spring' : `Chapter ${ch + 1}: a spring sleeps in ${sp.name}. It is ringed on your map`;
          if (!target && d < 140) target = sp;
        }
        if (this.wayTarget && Math.hypot(this.wayTarget.x - p.x, this.wayTarget.z - p.z) < 6) this.wayTarget = null;
        if (this.wayTarget) target = this.wayTarget;
        this.trailTarget = target;
        // after the introduction the screen stays quiet: the sparkles, the Today button and the chapter bar say enough
        void text;
        this.ui.next(null);
        this.trail.update(dt, globalUniforms.uTime.value, p, target, this.camera.position);
        return;
      }
    }
    this.ui.next(text);
    this.trail.update(dt, globalUniforms.uTime.value, p, this.inside ? null : target, this.camera.position);
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
    // a little later they mention someone else worth finding
    if (this.tut >= 9) window.setTimeout(() => this.introduce(npc), 9500);
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
        if (f.cast(this.player.pos, this.player.yaw) && this.player.sit()) {
          this.ui.toast('', 'Line cast', 'Now there is nothing to do but wait');
          this.did('fish');
        }
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

  /** At home, lie down and let the hours pass until morning. */
  private updateSleep(dt: number): void {
    const can = !this.sleeping && this.player.grounded && !this.practice && !this.breathing.active && !this.fishing.active && (this.day.night > 0.5 || this.inside || this.home.near(this.player.pos));
    this.ui.sleepButton(can);
    if (!this.sleeping) {
      if (!this.input.sleepPressed() && !this.wantSleep) return;
      this.wantSleep = false;
      if (!can) {
        this.ui.toast('', 'Not sleepy yet', 'You can rest any time at your nook');
        return;
      }
      if (!this.player.sit()) return;
      this.sleeping = true;
      this.sleptFor = 0;
      this.did('sleep');
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
      // out of bed, standing beside it
      this.player.hold = null;
      this.player.pos.copy(this.home.inside.bedside);
      this.player.sitting = false;
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
      ['feather', this.rested.has('summit')], ['garland', best >= 2], ['bowl', this.flags.has('fish')], ['picture', this.discovered.size >= 4],
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
    if (this.input.skimPressed() && this.waterNear > 0.12 && this.player.grounded && !this.player.sitting) {
      this.skimming.throw(p, this.player.yaw);
      this.did('skim');
    }
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
    if (!canvas.dataset.pin) {
      // tap the map to drop a pin: the sparkles lead there. Tap the pin again to lift it.
      canvas.dataset.pin = '1';
      canvas.style.cursor = 'pointer';
      canvas.addEventListener('click', (e) => {
        const r = canvas.getBoundingClientRect();
        const MV = 418;
        const x = ((e.clientX - r.left) / r.width) * 2 * MV - MV;
        const z = ((e.clientY - r.top) / r.height) * 2 * MV - MV;
        if (this.wayTarget && Math.hypot(this.wayTarget.x - x, this.wayTarget.z - z) < 26) this.wayTarget = null;
        else if (this.island.heightAt(x, z) >= 0.15) this.wayTarget = { x, z };
        else return;
        this.nextCheck = 0; // the sparkles turn toward it straight away
        this.openMap();
      });
    }
    if (!this.mapBase) {
      // Painted once: a storybook map. Each biome has its own flat colour, hills are softly shaded,
      // the coast drops away as a little cliff so the island looks like a model sitting in the sea.
      const B = 540;
      const base = document.createElement('canvas');
      base.width = base.height = B;
      const bctx = base.getContext('2d')!;
      const img = bctx.createImageData(B, B);
      const I = this.island;
      const land = new Uint8Array(B * B);
      const wx = (i: number): number => ((i + 0.5) / B) * WORLD_SIZE - HALF;
      for (let j = 0; j < B; j++) for (let i = 0; i < B; i++) land[j * B + i] = I.heightAt(wx(i), wx(j)) >= 0.15 ? 1 : 0;
      const hex = (c: number): [number, number, number] => [(c >> 16) & 255, (c >> 8) & 255, c & 255];
      const SEA_A = hex(0x6fd6f5);
      const SEA_B = hex(0x2f8fe6);
      for (let j = 0; j < B; j++) {
        for (let i = 0; i < B; i++) {
          const x = wx(i);
          const z = wx(j);
          const h = I.heightAt(x, z);
          const o = (j * B + i) * 4;
          let c: [number, number, number];
          if (!land[j * B + i]) {
            // is there land just above? then this is the cliff under the island's southern edge
            let cliff = 0;
            for (let k = 1; k <= 9 && j - k >= 0; k++) if (land[(j - k) * B + i]) { cliff = k; break; }
            if (cliff) c = cliff < 6 ? hex(0xd9b074) : hex(0xb98a52);
            else {
              const deep = Math.min(1, Math.max(0, -h / 16));
              c = [SEA_A[0] + (SEA_B[0] - SEA_A[0]) * deep, SEA_A[1] + (SEA_B[1] - SEA_A[1]) * deep, SEA_A[2] + (SEA_B[2] - SEA_A[2]) * deep];
            }
          } else if (I.waterLevelAt(x, z) > h + 0.3) c = hex(0x62dcee); // lakes and the river
          else {
            c = I.sample(I.sand, x, z) > 0.5 ? hex(0xf8e4a6)
              : h > 108 ? hex(0xffffff)
              : h > 74 ? hex(0xbcaed2)
              : h > 46 ? hex(0xc9e07c)
              : I.sample(I.forest, x, z) > 0.5 ? hex(0x46a84e)
              : hex(0x80d25c);
            if (I.sample(I.path, x, z) > 0.5) c = hex(0xe6bd84);
            // light from the top left: slopes facing it brighten, the far sides fall into shade
            const shade = Math.min(1.16, Math.max(0.8, 1 + (h - I.heightAt(x - 3, z - 3)) * 0.05));
            c = [c[0] * shade, c[1] * shade, c[2] * shade];
          }
          img.data.set([c[0], c[1], c[2], 255], o);
        }
      }
      bctx.putImageData(img, 0, 0);
      // little trees, blossom and peaks, like pieces set out on a board
      const rnd = (n: number): number => {
        const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
        return v - Math.floor(v);
      };
      for (let n = 0; n < 1500; n++) {
        const i = rnd(n) * B;
        const j = rnd(n + 5000) * B;
        const x = wx(i);
        const z = wx(j);
        const h = I.heightAt(x, z);
        if (h < 2 || I.waterLevelAt(x, z) > h + 0.3 || I.sample(I.sand, x, z) > 0.3 || I.sample(I.path, x, z) > 0.3) continue;
        const forest = I.sample(I.forest, x, z) > 0.5;
        if (!forest && rnd(n + 9000) > 0.16) continue;
        if (h > 74) continue;
        const r = 2.6 + rnd(n + 300) * 1.8;
        const pink = !forest || rnd(n + 700) < 0.08;
        bctx.fillStyle = 'rgba(30,80,40,.35)';
        bctx.beginPath();
        bctx.ellipse(i + 1, j + r * 0.9, r, r * 0.45, 0, 0, Math.PI * 2);
        bctx.fill();
        bctx.fillStyle = pink ? '#f58ab4' : h > 46 ? '#2f8a4a' : '#2f9a44';
        bctx.beginPath();
        bctx.arc(i, j, r, 0, Math.PI * 2);
        bctx.fill();
        bctx.fillStyle = pink ? '#ffc1d8' : '#6fcf62';
        bctx.beginPath();
        bctx.arc(i - r * 0.3, j - r * 0.35, r * 0.5, 0, Math.PI * 2);
        bctx.fill();
      }
      this.mapBase = base;
    }
    // the view is drawn in close on the island, leaving a rim of sea
    const V = 418;
    const at = (x: number, z: number): [number, number] => [((x + V) / (2 * V)) * S, ((z + V) / (2 * V)) * S];
    ctx.imageSmoothingQuality = 'high';
    const MB = this.mapBase.width;
    ctx.drawImage(this.mapBase, ((HALF - V) / WORLD_SIZE) * MB, ((HALF - V) / WORLD_SIZE) * MB, ((2 * V) / WORLD_SIZE) * MB, ((2 * V) / WORLD_SIZE) * MB, 0, 0, S, S);
    const FONT = "'Fredoka Variable', ui-rounded, system-ui, sans-serif";
    const label = (text: string, cx: number, cy: number, size: number, fill = '#fff'): void => {
      ctx.font = `600 ${size}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.lineJoin = 'round';
      ctx.lineWidth = size * 0.36;
      ctx.strokeStyle = '#1f3f7a';
      ctx.strokeText(text, cx, cy);
      ctx.fillStyle = fill;
      ctx.fillText(text, cx, cy);
    };
    // puffy clouds lie over everything you have not walked through yet
    const seen = (x: number, z: number): boolean => this.reveals.some(([rx, rz, rr]) => Math.hypot(x - rx, z - rz) < rr * 0.82);
    const hash = (n: number): number => {
      const v = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
      return v - Math.floor(v);
    };
    /** One cumulus: a row of rounded heads of different sizes over a flat base, shaded softly underneath. */
    const puff = (cx: number, cy: number, r: number, seed: number): void => {
      ctx.save();
      // its shadow on the land below
      ctx.fillStyle = 'rgba(30,70,60,.2)';
      ctx.beginPath();
      ctx.ellipse(cx + r * 0.25, cy + r * 0.95, r * 1.25, r * 0.36, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.rect(cx - r * 3, cy - r * 3, r * 6, r * 3.38); // everything below this line is cut away: the flat base
      ctx.clip();
      const g = ctx.createLinearGradient(0, cy - r * 1.1, 0, cy + r * 0.4);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.62, '#f6faff');
      g.addColorStop(1, '#cfdff2');
      ctx.fillStyle = g;
      const heads = 5 + Math.floor(hash(seed) * 3);
      ctx.beginPath();
      for (let k = 0; k < heads; k++) {
        const t = k / (heads - 1);
        const arch = Math.sin(t * Math.PI);
        const rad = r * (0.34 + arch * 0.42 + hash(seed + k * 7) * 0.14);
        const hx = cx + (t - 0.5) * r * 2.3;
        const hy = cy + r * 0.38 - rad * (0.75 + hash(seed + k * 13) * 0.3);
        ctx.moveTo(hx + rad, hy);
        ctx.arc(hx, hy, rad, 0, Math.PI * 2);
      }
      ctx.rect(cx - r * 1.2, cy - r * 0.1, r * 2.4, r * 0.5);
      ctx.fill();
      // a rim of light along the tops
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.ellipse(cx - r * 0.2, cy - r * 0.5, r * 0.55, r * 0.22, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };
    // banks of cloud of every size, scattered unevenly, drawn back to front
    const STEP = 62;
    for (let gj = 0; gj * STEP < S + STEP; gj++) {
      for (let gi = 0; gi * STEP < S + STEP; gi++) {
        const n = gi * 31 + gj * 17 + 3;
        if (hash(n + 400) < 0.14) continue;
        const cx = gi * STEP + (hash(n) - 0.5) * 44 + (gj % 2) * 30;
        const cy = gj * STEP + (hash(n + 100) - 0.5) * 34;
        const x = (cx / S) * 2 * V - V;
        const z = (cy / S) * 2 * V - V;
        if (this.island.heightAt(x, z) < 1.5 || seen(x, z)) continue;
        ctx.globalAlpha = 0.9 + hash(n + 200) * 0.1;
        puff(cx, cy, 15 + hash(n + 300) * hash(n + 301) * 26, n);
        ctx.globalAlpha = 1;
      }
    }
    // every place: its name once discovered, a question mark on a dark badge until then
    for (const r of this.island.regions) {
      const [cx, cy] = at(r.x, r.z);
      if (this.discovered.has(r.id)) {
        // discovered: a small gold star, no words
        ctx.save();
        ctx.translate(cx, cy - 26);
        ctx.beginPath();
        for (let k = 0; k < 10; k++) {
          const rr = k % 2 ? 4.5 : 10;
          ctx.lineTo(Math.sin((k / 10) * Math.PI * 2) * rr, -Math.cos((k / 10) * Math.PI * 2) * rr);
        }
        ctx.closePath();
        ctx.fillStyle = '#ffd24a';
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#fff';
        ctx.stroke();
        ctx.restore();
      } else {
        ctx.fillStyle = '#24407e';
        ctx.beginPath();
        ctx.arc(cx, cy, 19, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#fff';
        ctx.stroke();
        label('?', cx, cy + 8, 24);
      }
    }
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
    for (const npc of this.npcs) {
      if (!this.met.has(npc.who.id)) continue;
      const q = npc === this.companion ? npc.pos : npc.home;
      dot(q.x, q.z, 7, `#${npc.who.look.fur.toString(16).padStart(6, '0')}`);
      const [cx, cy] = at(q.x, q.z);
      void cx;
      void cy;
    }
    {
      // home: a little thatched house
      const [hx, hy] = at(this.home.x, this.home.z);
      ctx.fillStyle = '#c9975a';
      ctx.fillRect(hx - 9, hy - 4, 18, 13);
      ctx.fillStyle = '#f2cf66';
      ctx.beginPath();
      ctx.moveTo(hx - 14, hy - 3);
      ctx.lineTo(hx, hy - 17);
      ctx.lineTo(hx + 14, hy - 3);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#6a3a16';
      ctx.stroke();
      ctx.strokeRect(hx - 9, hy - 4, 18, 13);
    }
    dot(this.shop.x, this.shop.z, 5, '#ffd65a', '#6f4a8f');
    this.springs.spots.forEach((sp, i) => {
      if (this.springs.isAwake(i)) dot(sp.x, sp.z, 5, '#8fe9ff', '#ffffff');
    });
    {
      // the spring the story has reached: a ring to walk toward
      const ch = this.currentChapter();
      if (ch >= 0) {
        const sp = this.springs.spots[this.chapters[ch]];
        const [sx, sy] = at(sp.x, sp.z);
        ctx.beginPath();
        ctx.arc(sx, sy, 13, 0, Math.PI * 2);
        ctx.strokeStyle = '#8fe9ff';
        ctx.lineWidth = 4;
        ctx.setLineDash([6, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    // friends you have been told about: a question mark near (not on) where they live
    this.npcs.forEach((npc, i) => {
      if (!this.introduced.has(npc.who.id) || this.met.has(npc.who.id)) return;
      const [qx, qy] = at(npc.home.x + Math.sin(i * 2.3) * 16, npc.home.z + Math.cos(i * 2.3) * 16);
      ctx.save();
      ctx.font = '800 30px ui-rounded, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#4f2f1e';
      ctx.fillStyle = '#ffe9c6';
      ctx.strokeText('?', qx, qy + 10);
      ctx.fillText('?', qx, qy + 10);
      ctx.restore();
    });
    if (this.dailyDone !== this.daily.key) {
      const [dx, dy] = at(this.daily.npc.home.x, this.daily.npc.home.z);
      ctx.beginPath();
      ctx.arc(dx, dy, 15, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffb03a';
      ctx.lineWidth = 4;
      ctx.stroke();
    }
    if (this.wayTarget) {
      // your pin
      const [wx2, wy2] = at(this.wayTarget.x, this.wayTarget.z);
      ctx.save();
      ctx.translate(wx2, wy2);
      ctx.beginPath();
      ctx.ellipse(0, 2, 9, 4, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(40,30,60,.3)';
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-20, -22, -15, -44, 0, -44);
      ctx.bezierCurveTo(15, -44, 20, -22, 0, 0);
      ctx.closePath();
      ctx.fillStyle = '#ff5d7a';
      ctx.fill();
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = '#fff';
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -28, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.restore();
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
    const kept = this.intents.done.filter(Boolean).length;
    this.ui.showJournal([
      ...(this.tut >= 9
        ? [
            { title: this.days ? `Day ${this.days} on the island` : 'Your first day on the island', hint: this.lastDay === this.dayKey() ? (this.streak > 1 ? `${this.streak} days in a row. Today is counted: the vine has its leaf` : 'Today is counted: the vine has its leaf') : 'Keep any one of today’s intentions and the vine grows a leaf', done: this.lastDay === this.dayKey() },
            ...this.intents.ids.map((id, i) => ({ title: `Today: ${INTENTS[id]}`, hint: `One of three intentions for today. ${kept} kept so far`, done: this.intents.done[i] })),
          ]
        : []),
      { title: `Today’s moment: find ${this.daily.npc.who.name}`, hint: `Near ${this.nearestRegionName(this.daily.npc.home.x, this.daily.npc.home.z)}. A new one each day`, done: this.dailyDone === this.daily.key },
      { title: 'Take three deep breaths', hint: 'Press B anywhere', done: this.breathsDone > 0 },
      { title: 'Say hello to a Calmling', hint: 'Walk up to one and press E', done: this.met.size > 0 },
      { title: 'Sit with a friend while they do their calm thing', hint: 'Each Calmling has their own. Sit down beside them', done: this.flags.has('together') },
      { title: 'Go for a walk with a friend', hint: 'Press E again to invite them', done: best >= 1 },
      { title: 'Hear a friend’s story', hint: 'Keep walking together until two hearts fill', done: best >= 2 },
      { title: 'Learn a practice', hint: 'Press Q beside a Calmling you have met', done: this.learned.size > 0 },
      { title: 'Ride a leaf', hint: 'Press V, or the Leaf button, and steer', done: this.flags.has('surf') },
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
      { title: 'Buy something from Sampoyoshi', hint: 'His stall is by the river path, east of the garden. He takes fruit', done: this.owned.size > 0 },
      { title: 'Go inside your treehouse', hint: 'Press E at the foot of the ladder', done: this.flags.has('inside') },
      { title: 'Light the fire', hint: 'At the fire ring by the treehouse, once evening comes', done: this.flags.has('fire') },
      { title: 'Spend an evening with friends', hint: 'Friends you have met come to the fire after dark', done: this.flags.has('gathering') },
      { title: this.currentChapter() >= 0 ? `Chapter ${this.currentChapter() + 1} of ${this.chapters.length}: ${this.springs.spots[this.chapters[this.currentChapter()]].name}` : 'Every chapter told', hint: this.currentChapter() >= 0 ? 'A spring is sleeping there. Wake it and a letter will lead you on' : 'All eight springs are awake', done: this.currentChapter() < 0 },
      { title: 'Pick wild fruit', hint: `Bushes grow in every region: ${this.wild.count} across the island`, done: this.flags.has('wild') },
      { title: 'Wake a calm spring', hint: `${this.springs.awakeCount} of ${this.springs.spots.length} awake. Breathe beside the ring of stones in each place`, done: this.springs.awakeCount > 0 },
      { title: 'Watch the sun set', hint: 'Stay sitting and the day drifts by', done: this.flags.has('night') },
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
      this.did('breathe');
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
        for (let k = 0; k < 3; k++) this.basket[k]++; // the waking water leaves one of each fruit
        this.save();
        if (this.tut >= 9) window.setTimeout(() => this.chapterLetter(spring), 7000);
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
    if (this.settings.quality !== 'high' && this.settings.quality !== 'ultra') {
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
    if (this.settings.quality === 'ultra') this.settings.quality = 'high';
    else if (this.settings.quality === 'high') this.settings.quality = 'medium';
    else if (this.settings.quality === 'medium') this.settings.quality = 'low';
    else return;
    saveSettings(this.settings);
    this.applySettings();
  }

  /** Everything that keeps moving even while the menu is open. */
  private updateWorld(dt: number): void {
    globalUniforms.uTime.value += dt;
    // (on the title screen the world is drawn round the treehouse, where the camera is looking)
    const p = this.started ? this.player.pos : this.titleFocus;
    this.weather.update(dt, this.camera.position);
    // stay sitting after your breaths and the day drifts by ten times faster
    const drift = this.sleeping ? 40 : this.playing && this.player?.sitting && !this.breathing.active && !this.practice && !this.fishing.active ? 10 : 1;
    this.day.update(dt * drift, this.sun, this.hemi, this.scene.fog as THREE.FogExp2, this.weather.rain);
    this.garden.update(Date.now(), globalUniforms.uTime.value);
    this.home.update(globalUniforms.uTime.value, this.day.night, Date.now(), this.inside);
    this.shop.update(dt, this.day.night, this.day.hour);
    this.water.update();
    this.leafTrail.update(dt, !!this.player?.surfing, this.player.pos, this.player.yaw, this.player.speed);
    const falling = this.started && !!this.player?.arriving;
    this.arrivalClouds.update(dt, falling, this.player.pos, this.island.heightAt(this.player.pos.x, this.player.pos.z), globalUniforms.uDayLight.value);
    this.ui.arriving(falling);
    this.wild.update(globalUniforms.uTime.value, this.day.night, Date.now(), this.camera.position);
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
      wild: this.wild.serialize(),
      owned: [...this.owned],
      decor: this.decor,
      tut: this.tut,
      days: this.days,
      streak: this.streak,
      lastDay: this.lastDay,
      restWeek: this.restWeek,
      intents: this.intents,
      introduced: [...this.introduced],
    });
  }

  /** Read-only snapshot for the smoke test and the debug console. */
  debugState(): Record<string, unknown> {
    const p = this.player.pos;
    const info = this.renderer.info.render;
    return {
      basket: [...this.basket], effects: this.effects.map((e) => Math.round(e)), gifted: [...this.gifted], inside: this.inside,
      owned: [...this.owned], decor: this.decor, shopAt: [Math.round(this.shop.x), Math.round(this.shop.z)],
      tut: this.tut, days: this.days, streak: this.streak, intents: this.intents, introduced: [...this.introduced], guide: this.guide.who.name,
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
