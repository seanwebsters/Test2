import { useEffect, useRef } from 'react';
import { useGame, timeLevel } from '../game/store';
import { herSuffix } from '../ui/Art';
import { RestoreId } from '../game/quests';
import { STEP } from '../game/story';
import { setTimeLevel } from '../game/audio';
import { GLIMMERS, LAMPS, MAP_H, MAP_W, PLACES, REGIONS, SPOTS, V2, clearLine, depthScale, findPath, move, snap } from '../game/layout';

const BANTER = [
  'The fountain used to be the loudest thing in the square.',
  'You walk like someone who has somewhere to be. I like it.',
  'I had forgotten what footsteps sound like. Two sets.',
  'Mind the third cobble. It has opinions.',
  'Every light you find, the air gets warmer. Have you noticed?',
  'I used to race the lamplighter to the bridge.',
  'Stay on this side of the canal. The woods are for later.',
  'You hum when you think. Did you know?',
];
const BANTER2 = [
  'Six days. I would wait sixty.',
  'Someone locked that bookshop. I keep thinking about it.',
  'If the bell rings, everyone will hear it. Even me.',
];
const PICKUP = ['Another one!', 'There, by your feet.', 'That one was warm.', 'They like you.'];

const CANAL_LANTERNS: V2[] = [
  [60, 1200], [150, 1225], [240, 1265], [300, 1330], [350, 1400], [390, 1470], [110, 1320], [200, 1380], [280, 1455], [40, 1440],
];
/** [from, to, sag] */
const GARLANDS: [V2, V2, number][] = [
  [[110, 600], [650, 530], 70],
  [[650, 530], [965, 780], 60],
  [[60, 815], [965, 790], 90],
  [[110, 600], [60, 815], 30],
  [[400, 640], [968, 790], 80],
];

/** the lamplighter's evening round */
const LAMP_ROUND: V2[] = [
  [300, 1040],
  [120, 1015],
  [90, 900],
  [600, 1000],
  [930, 1000],
  [700, 1060],
];

/** what she means to do when she arrives */
type Intent = { kind: 'spot'; id: string } | { kind: 'him' } | { kind: 'cass' } | null;
const intent: { v: Intent } = { v: null };

const ART = `${import.meta.env.BASE_URL}art/`;
const SPEED = 300; // map px per second

function img(src: string) {
  const i = new Image();
  i.src = ART + src;
  return i;
}

/** progress 0..1 of a restoration's animation */
function prog(id: RestoreId, dur = 3200) {
  const at = useGame.getState().restored[id];
  if (!at) return 0;
  return Math.min(1, Math.max(0, (Date.now() - at) / dur));
}
const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

interface Actor {
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  face: 'front' | 'back';
  flip: boolean;
  fade: number;
}

const FOCI: Record<string, { at: V2; zoom: number }> = {
  canal: { at: [230, 1220], zoom: 1.25 },
  square: { at: [508, 780], zoom: 1.25 },
  garden: { at: [180, 650], zoom: 1.3 },
  bookshop: { at: [830, 600], zoom: 1.3 },
  tower: { at: [410, 380], zoom: 1.2 },
  tree: { at: [720, 1330], zoom: 1.3 },
};

export function Town() {
  const root = useRef<HTMLDivElement>(null);
  const world = useRef<HTMLDivElement>(null);
  const base = useRef<HTMLCanvasElement>(null);
  const fx = useRef<HTMLCanvasElement>(null);
  const herEl = useRef<HTMLDivElement>(null);
  const himEl = useRef<HTMLDivElement>(null);
  const cassEl = useRef<HTMLDivElement>(null);
  const hourEl = useRef<HTMLDivElement>(null);
  const minEl = useRef<HTMLDivElement>(null);
  const glimEls = useRef<(HTMLDivElement | null)[]>([]);
  const lampEls = useRef<(HTMLDivElement | null)[]>([]);
  const shopGlow = useRef<HTMLDivElement>(null);
  const bellRing = useRef<HTMLDivElement>(null);
  const marker = useRef<HTMLDivElement>(null);
  const letter = useRef<HTMLDivElement>(null);
  const ripple = useRef<HTMLDivElement>(null);
  const bubble = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const alive = img('town_alive.webp');
    const frozen = img('town_frozen.webp');
    const sprites = {
      herFront: img('her_front.webp'),
      herBack: img('her_back.webp'),
      herSleep: img('her_sleep.webp'),
      himFront: img('him_front.webp'),
      himBack: img('him_back.webp'),
      himSit: img('him_sit.webp'),
    };
    void sprites;
    const s0 = useGame.getState();
    const her: Actor = { x: s0.player[0], y: s0.player[1], vx: 0, vy: 0, phase: 0, face: 'front', flip: false, fade: 0 };
    const cass = { x: 0, y: 0, vx: 0, vy: 0, phase: 0, face: 'front' as 'front' | 'back', flip: false, fade: 0, init: false, leg: 0, wait: 2, path: [] as V2[] };
    const him: Actor = { x: PLACES.himSeat[0], y: PLACES.himSeat[1], vx: 0, vy: 0, phase: 0, face: 'front', flip: false, fade: 0 };
    let himMode = '';
    const cam = { x: her.x, y: her.y - 120, z: 1 };
    let flow = 0;
    let aliveT = 0;
    let clockT = 0;
    let lastSig = '';
    let path: V2[] = [];
    let knownPlayer = s0.player;
    let himPlanT = 0;
    // little things he says while you walk together
    let chatT = 9;
    let bubbleT = 0;
    const say = (text: string, secs = 4) => {
      const b = bubble.current;
      if (!b || himMode !== 'follow') return;
      b.textContent = text;
      b.classList.add('on');
      bubbleT = secs;
    };
    let himWp: V2 | null = null;
    let pathFor: V2 | null = null;
    const arrive = () => {
      const it = intent.v;
      intent.v = null;
      if (!it) return;
      const st = useGame.getState();
      if (it.kind === 'him') {
        if (Math.hypot(her.x - him.x, her.y - him.y) < 140) st.talkToHim();
      } else if (it.kind === 'cass') {
        if (Math.hypot(her.x - cass.x, her.y - cass.y) < 140) st.talkToCass();
      } else st.inspect(it.id);
    };
    let saveT = 0;
    let level = -1;
    let last = performance.now();
    let raf = 0;
    let scale = 1;
    const keys = new Set<string>();
    const kd = (e: KeyboardEvent) => keys.add(e.key.toLowerCase());
    const ku = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);

    // composite buffers
    const mask = document.createElement('canvas');
    mask.width = MAP_W / 2;
    mask.height = MAP_H / 2;
    const tmp = document.createElement('canvas');
    tmp.width = MAP_W;
    tmp.height = MAP_H;

    const petals = Array.from({ length: 70 }, (_, i) => ({
      x: (i * 197) % MAP_W,
      y: 200 + ((i * 331) % 1300),
      r: (i * 0.77) % 6.28,
      s: 0.6 + ((i * 0.37) % 0.6),
      ph: i * 1.3,
    }));
    const birds = [
      { fx: 640, fy: 470, a: 0.3 },
      { fx: 300, fy: 540, a: -0.4 },
      { fx: 720, fy: 300, a: 0.1 },
    ];

    function drawBase() {
      const c = base.current;
      if (!c || !alive.complete || !frozen.complete || !alive.naturalWidth || !frozen.naturalWidth) return false;
      const s = useGame.getState();
      const p = {
        clock: ease(prog('clock', 2500)),
        fountain: ease(prog('fountain', 3500)),
        garden: ease(prog('garden', 4200)),
        bookshop: ease(prog('bookshop', 3500)),
        bell: ease(prog('bell', 5000)),
      };
      const sig = JSON.stringify(p) + Object.keys(s.restored).join();
      if (sig === lastSig) return true;
      lastSig = sig;
      const m = mask.getContext('2d')!;
      m.globalCompositeOperation = 'source-over';
      m.clearRect(0, 0, mask.width, mask.height);
      // the frozen veil: lighter as more of the city wakes, gone once the bell rings
      const lvl = timeLevel(s.restored);
      m.fillStyle = `rgba(0,0,0,${0.56 * (1 - lvl * 0.06) * (1 - p.bell)})`;
      m.fillRect(0, 0, mask.width, mask.height);
      m.globalCompositeOperation = 'destination-out';
      (Object.keys(REGIONS) as (keyof typeof REGIONS)[]).forEach((k) => {
        const amt = p[k];
        if (amt <= 0) return;
        const r = REGIONS[k];
        m.save();
        m.translate(r.x / 2, r.y / 2);
        m.scale(r.rx / 2, r.ry / 2);
        const g = m.createRadialGradient(0, 0, 0, 0, 0, 1);
        g.addColorStop(0, `rgba(0,0,0,${amt})`);
        g.addColorStop(0.55, `rgba(0,0,0,${amt})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        m.fillStyle = g;
        m.beginPath();
        m.arc(0, 0, 1, 0, Math.PI * 2);
        m.fill();
        m.restore();
      });
      const ctx = c.getContext('2d')!;
      ctx.drawImage(alive, 0, 0, MAP_W, MAP_H);
      const t = tmp.getContext('2d')!;
      t.globalCompositeOperation = 'source-over';
      t.clearRect(0, 0, MAP_W, MAP_H);
      t.drawImage(frozen, 0, 0, MAP_W, MAP_H);
      t.globalCompositeOperation = 'destination-in';
      t.drawImage(mask, 0, 0, MAP_W, MAP_H);
      ctx.drawImage(tmp, 0, 0);
      return true;
    }

    function drawFx(dt: number) {
      const c = fx.current;
      if (!c) return;
      const ctx = c.getContext('2d')!;
      ctx.clearRect(0, 0, MAP_W, MAP_H);
      const k = Math.min(1, flow);
      // blossom petals: hung in the air while frozen, drifting once time moves
      for (const p of petals) {
        if (k > 0) {
          p.y += dt * 18 * p.s * k;
          p.x += Math.sin(aliveT * 0.8 + p.ph) * dt * 14 * k + dt * 8 * k;
          p.r += dt * 1.6 * k;
          if (p.y > MAP_H) p.y = 150;
          if (p.x > MAP_W) p.x = 0;
        }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.fillStyle = 'rgba(246,190,204,0.9)';
        ctx.beginPath();
        ctx.ellipse(0, 0, 5 * p.s + 2, 2.6 * p.s + 1, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      // fountain spray
      const fp = ease(prog('fountain', 3500));
      const [fx0, fy0] = PLACES.fountain;
      for (let a = 0; a < 10; a++) {
        const ang = (a / 10) * Math.PI * 2;
        for (let i = 0; i < 7; i++) {
          const u = fp > 0 ? (i / 7 + aliveT * 0.9 * fp) % 1 : i / 7;
          const r = 48 + u * 70;
          const x = fx0 + Math.cos(ang) * r;
          const y = fy0 - 100 + Math.sin(ang) * r * 0.42 + u * u * 95 - Math.sin(u * Math.PI) * 18;
          ctx.fillStyle = fp > 0 ? `rgba(240,248,255,${0.75 * (1 - u * 0.5)})` : 'rgba(225,232,255,0.8)';
          ctx.beginPath();
          ctx.arc(x, y, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      if (fp > 0) {
        for (let i = 0; i < 3; i++) {
          const t = (aliveT * 0.45 + i / 3) % 1;
          ctx.strokeStyle = `rgba(255,255,255,${0.35 * (1 - t) * fp})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(fx0, fy0 + 4, 50 + t * 70, (50 + t * 70) * 0.36, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      // light on the canal once the city moves
      if (k > 0) {
        for (let i = 0; i < 16; i++) {
          const t = (aliveT * 0.12 + i / 16) % 1;
          const x = 20 + ((i * 67) % 330) + t * 40;
          const y = 1170 + ((i * 53) % 330) * (0.6 + t * 0.3);
          if (x > 420 - (y - 1150) * 0.1) continue;
          ctx.fillStyle = `rgba(255,240,220,${0.5 * Math.sin(t * Math.PI) * k})`;
          ctx.beginPath();
          ctx.ellipse(x, y, 9, 2, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // birds: suspended mid-flight, then wheeling round the tower
      const free = Math.min(1, Math.max(0, flow - 2.2));
      birds.forEach((b, i) => {
        const t = aliveT * 0.35 + i * 2.1;
        const bx = 410 + Math.cos(t) * (170 + i * 50);
        const by = 260 + Math.sin(t) * (60 + i * 15) + i * 30;
        const x = b.fx + (bx - b.fx) * free;
        const y = b.fy + (by - b.fy) * free;
        const flap = free > 0 ? Math.sin(performance.now() / 70 + i) * 6 : 4;
        ctx.strokeStyle = '#5a4a5e';
        ctx.lineWidth = 2.4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x - 10, y - flap);
        ctx.quadraticCurveTo(x - 4, y - 2, x, y + 1);
        ctx.quadraticCurveTo(x + 4, y - 2, x + 10, y - flap);
        ctx.stroke();
      });
      // butterflies in the woken garden
      const gp = ease(prog('garden', 4200));
      if (gp > 0) {
        for (let i = 0; i < 6; i++) {
          const t = performance.now() / 1000 * 0.7 + i * 1.7;
          const x = 120 + i * 32 + Math.sin(t) * 40;
          const y = 640 + Math.sin(t * 1.9) * 26 + (i % 3) * 20;
          const w = Math.abs(Math.sin(performance.now() / 90 + i)) * 6 + 2;
          ctx.fillStyle = ['#f6c6d2', '#cbb8ea', '#f8e3b6'][i % 3];
          ctx.globalAlpha = gp;
          ctx.beginPath();
          ctx.ellipse(x - w / 2, y, w, 5, 0, 0, Math.PI * 2);
          ctx.ellipse(x + w / 2, y, w, 5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
      // lanterns set floating on the canal
      const lp = ease(prog('lanterns', 3500));
      if (lp > 0) {
        const now = performance.now() / 1000;
        CANAL_LANTERNS.forEach(([lx, ly], i) => {
          const k2 = Math.min(1, Math.max(0, lp * 1.6 - i * 0.07));
          if (k2 <= 0) return;
          const x = lx + Math.sin(now * 0.4 + i) * 10;
          const y = ly + Math.sin(now * 0.9 + i * 2) * 3;
          const g = ctx.createRadialGradient(x, y, 0, x, y, 46);
          g.addColorStop(0, `rgba(255,214,150,${0.55 * k2})`);
          g.addColorStop(1, 'rgba(255,200,140,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(x, y, 46, 0, Math.PI * 2);
          ctx.fill();
          // reflection
          ctx.fillStyle = `rgba(255,210,150,${0.35 * k2})`;
          ctx.beginPath();
          ctx.ellipse(x, y + 16, 9, 3, 0, 0, Math.PI * 2);
          ctx.fill();
          // the paper lantern
          ctx.fillStyle = `rgba(255,236,200,${k2})`;
          ctx.beginPath();
          ctx.moveTo(x - 9, y + 6);
          ctx.lineTo(x + 9, y + 6);
          ctx.lineTo(x + 6, y - 9);
          ctx.lineTo(x - 6, y - 9);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = `rgba(255,170,110,${0.8 * k2})`;
          ctx.fillRect(x - 3, y - 4, 6, 7);
        });
      }
      // the Lantern Festival: strings of light over the square
      const fp2 = ease(prog('festival', 3500));
      if (fp2 > 0) {
        const now = performance.now() / 1000;
        const cols = ['255,222,160', '255,190,205', '214,196,255'];
        GARLANDS.forEach(([a, b, sag], gi) => {
          const n = Math.floor(Math.hypot(b[0] - a[0], b[1] - a[1]) / 26);
          ctx.strokeStyle = `rgba(70,50,70,${0.45 * fp2})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          for (let i = 0; i <= n; i++) {
            const t = i / n;
            const x = a[0] + (b[0] - a[0]) * t;
            const y = a[1] + (b[1] - a[1]) * t + Math.sin(t * Math.PI) * sag;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
          for (let i = 1; i < n; i++) {
            const t = i / n;
            if (t > fp2 * 1.3) break;
            const x = a[0] + (b[0] - a[0]) * t;
            const y = a[1] + (b[1] - a[1]) * t + Math.sin(t * Math.PI) * sag + 4;
            const tw = 0.7 + 0.3 * Math.sin(now * 3 + i * 1.7 + gi);
            const c = cols[(i + gi) % 3];
            const g = ctx.createRadialGradient(x, y, 0, x, y, 22);
            g.addColorStop(0, `rgba(${c},${tw * fp2})`);
            g.addColorStop(1, `rgba(${c},0)`);
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(x, y, 22, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = `rgba(255,252,240,${tw * fp2})`;
            ctx.beginPath();
            ctx.arc(x, y, 3.6, 0, Math.PI * 2);
            ctx.fill();
          }
        });
      }

      // rising light where a place has just been restored
      const s = useGame.getState();
      let latest: RestoreId | null = null;
      let at = 0;
      for (const id of Object.keys(s.restored) as RestoreId[]) if (s.restored[id]! > at) (at = s.restored[id]!), (latest = id);
      const age = (Date.now() - at) / 1000;
      if (latest && age > 0 && age < 4.5) {
        const centre: Record<RestoreId, V2> = { clock: PLACES.clockFace as V2, fountain: [508, 760], garden: [160, 660], bookshop: [840, 620], bell: [405, 220], lanterns: [220, 1300], festival: [508, 700] };
        const [cx, cy] = centre[latest];
        for (let i = 0; i < 60; i++) {
          const a = i * 2.399;
          const sp = 0.6 + ((i * 0.37) % 1);
          const r = (20 + ((i * 0.618) % 1) * 160) * Math.min(1, age);
          const x = cx + Math.cos(a + age * sp) * r;
          const y = cy + Math.sin(a + age * sp) * r * 0.5 - age * sp * 70;
          ctx.fillStyle = `rgba(255,244,214,${Math.max(0, 1 - age / 4.5)})`;
          ctx.beginPath();
          ctx.arc(x, y, 2.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    function layout() {
      const el = root.current;
      if (!el) return;
      const vw = el.clientWidth;
      const vh = el.clientHeight;
      const portrait = vw / vh < 0.85;
      scale = portrait ? Math.max((vh * 1.12) / MAP_H, (vw * 1.25) / MAP_W) : (vh * 1.2) / MAP_H;
    }
    layout();
    const ro = new ResizeObserver(layout);
    if (root.current) ro.observe(root.current);

    function place(el: HTMLElement | null, a: Actor, h: number, sprite: string, extra = '') {
      if (!el) return;
      const ds = depthScale(a.y);
      const bob = -Math.abs(Math.sin(a.phase)) * 7 * Math.min(1, Math.hypot(a.vx, a.vy) / SPEED);
      el.style.transform = `translate(${a.x}px, ${a.y + bob}px) scale(${ds})`;
      el.style.zIndex = String(Math.round(a.y));
      el.style.opacity = String(1 - a.fade);
      const im = el.firstElementChild as HTMLImageElement;
      if (im.dataset.s !== sprite) {
        im.src = ART + sprite;
        im.dataset.s = sprite;
      }
      im.style.height = `${h}px`;
      im.style.transform = `translateX(-50%) ${a.flip ? 'scaleX(-1)' : ''} rotate(${Math.sin(a.phase) * 3 * Math.min(1, Math.hypot(a.vx, a.vy) / SPEED)}deg) ${extra}`;
    }

    function frame(now: number) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const s = useGame.getState();
      const lvl = timeLevel(s.restored);
      if (lvl !== level) {
        level = lvl;
        setTimeLevel(lvl, !!s.restored.fountain);
      }
      flow += (lvl - flow) * Math.min(1, dt * 0.6);
      aliveT += dt * Math.min(1, flow);

      // ---- her ----
      const locked = !!s.dialogue || s.screen !== 'game' || s.book.open || s.tab !== 'explore' || s.vanish > 0 || !!s.focus || s.step < STEP.explore;
      // the story can move her (waking, chapter two): follow only real changes to the saved spot
      if (s.player !== knownPlayer) {
        knownPlayer = s.player;
        if (Math.hypot(s.player[0] - her.x, s.player[1] - her.y) > 4) {
          her.x = s.player[0];
          her.y = s.player[1];
          pathFor = null;
        }
      }
      let dx = 0;
      let dy = 0;
      if (!locked) {
        if (keys.has('w') || keys.has('arrowup')) dy -= 1;
        if (keys.has('s') || keys.has('arrowdown')) dy += 1;
        if (keys.has('a') || keys.has('arrowleft')) dx -= 1;
        if (keys.has('d') || keys.has('arrowright')) dx += 1;
        if (dx || dy) {
          const l = Math.hypot(dx, dy);
          dx /= l;
          dy /= l;
          if (s.walkTo) s.setWalkTo(null);
          intent.v = null;
        } else if (s.walkTo) {
          if (s.walkTo !== pathFor) {
            pathFor = s.walkTo;
            path = findPath([her.x, her.y], s.walkTo) ?? [];
            if (!path.length) s.setWalkTo(null);
          }
          let wp = path[0];
          while (wp && Math.hypot(wp[0] - her.x, wp[1] - her.y) < (path.length > 1 ? 22 : 6)) {
            path.shift();
            wp = path[0];
          }
          if (!wp) {
            s.setWalkTo(null);
            arrive();
          } else {
            const ex = wp[0] - her.x;
            const ey = wp[1] - her.y;
            const d = Math.hypot(ex, ey);
            const k = path.length > 1 ? 1 : Math.min(1, d / 26);
            dx = (ex / d) * k;
            dy = (ey / d) * k;
          }
        }
      } else if (s.walkTo) s.setWalkTo(null);
      her.vx += (dx * SPEED - her.vx) * Math.min(1, dt * 14);
      her.vy += (dy * SPEED * 0.9 - her.vy) * Math.min(1, dt * 14);
      const [nx, ny] = move(her.x, her.y, her.x + her.vx * dt, her.y + her.vy * dt);
      if (nx === her.x && ny === her.y && s.walkTo && Math.hypot(her.vx, her.vy) > 40) {
        // nudged into a corner: plan again from here
        pathFor = null;
      }
      her.x = nx;
      her.y = ny;
      const hs = Math.hypot(her.vx, her.vy);
      her.phase += dt * hs * 0.055;
      if (hs > 30) {
        if (Math.abs(her.vy) > Math.abs(her.vx) * 0.6) her.face = her.vy < 0 ? 'back' : 'front';
        if (Math.abs(her.vx) > 20) her.flip = her.vx > 0;
      }
      if (s.dialogue && s.step >= STEP.explore && Math.hypot(him.x - her.x, him.y - her.y) < 400) {
        her.face = 'front';
        her.flip = him.x > her.x;
      }
      her.fade += (s.vanish - her.fade) * Math.min(1, dt * 0.5);
      const lying = s.step <= STEP.wake || (s.step === STEP.wake2 && !s.dialogue && s.focus === 'tree') || (s.step === STEP.wake3 && !s.dialogue);

      // ---- him ----
      let mode = 'follow';
      if (s.step <= STEP.explore) mode = 'seat';
      else if (s.step === STEP.ch1End) mode = 'alone';
      else if (s.step === STEP.wake2 && (s.focus === 'tree' || !s.dialogue)) mode = 'tree';
      else if (s.step === STEP.wake3 || s.step === STEP.q6) mode = 'away';
      if (mode !== himMode) {
        if (mode === 'seat') [him.x, him.y] = PLACES.himSeat;
        else if (mode === 'away') [him.x, him.y] = [300, 1040];
        else if (mode === 'tree') [him.x, him.y] = [PLACES.wake[0] + 90, PLACES.wake[1] - 40];
        else if (mode === 'alone') [him.x, him.y] = [180, 700];
        else if (!himMode) [him.x, him.y] = [her.x + 70, her.y - 20];
        himMode = mode;
      }
      let hx = 0;
      let hy = 0;
      if (mode === 'follow' && !s.dialogue && s.vanish === 0) {
        const ex = her.x - him.x;
        const ey = her.y - him.y;
        const d = Math.hypot(ex, ey);
        if (d > 520) {
          him.x = her.x - (ex / d) * 90;
          him.y = her.y - (ey / d) * 60;
        } else if (d > 85) {
          // re-plan a few times a second so he goes round things rather than into them
          himPlanT -= dt;
          if (himPlanT <= 0) {
            himPlanT = 0.35;
            himWp = clearLine([him.x, him.y], [her.x, her.y]) ? null : (findPath([him.x, him.y], [her.x, her.y])?.[0] ?? null);
          }
          const gx = himWp ? himWp[0] - him.x : ex;
          const gy = himWp ? himWp[1] - him.y : ey;
          const gd = Math.hypot(gx, gy) || 1;
          if (himWp && gd < 20) himPlanT = 0;
          const k = Math.min(1.08, (d - 70) / 90);
          hx = (gx / gd) * k;
          hy = (gy / gd) * k;
        }
      }
      him.vx += (hx * SPEED - him.vx) * Math.min(1, dt * 7);
      him.vy += (hy * SPEED * 0.85 - him.vy) * Math.min(1, dt * 7);
      [him.x, him.y] = move(him.x, him.y, him.x + him.vx * dt, him.y + him.vy * dt);
      const ms = Math.hypot(him.vx, him.vy);
      him.phase += dt * ms * 0.05;
      if (ms > 30) {
        if (Math.abs(him.vy) > Math.abs(him.vx) * 0.6) him.face = him.vy < 0 ? 'back' : 'front';
        if (Math.abs(him.vx) > 20) him.flip = him.vx > 0;
      }
      if (s.dialogue || mode === 'tree') {
        him.face = 'front';
        him.flip = her.x > him.x;
      }
      // he is up the tower while she meets the lamplighter, then waits on the bridge
      him.fade += ((mode === 'away' && !(s.dialogue?.id === 'q6_done') ? 1 : 0) - him.fade) * Math.min(1, dt * 3);

      // ---- the lamplighter ----
      const cassOn = s.step >= STEP.wake3 && s.step !== STEP.ch3End + 99;
      if (cassOn) {
        if (!cass.init) {
          [cass.x, cass.y] = [PLACES.wake[0] - 100, PLACES.wake[1] - 70];
          cass.init = true;
        }
        let cx = 0;
        let cy = 0;
        const talking = !!s.dialogue && Math.hypot(cass.x - her.x, cass.y - her.y) < 400;
        if (!talking && s.step > STEP.wake3) {
          const [wx, wy] = LAMP_ROUND[cass.leg % LAMP_ROUND.length];
          const dd = Math.hypot(wx - cass.x, wy - cass.y);
          if (dd < 10) {
            cass.wait -= dt;
            if (cass.wait <= 0) {
              cass.leg++;
              cass.wait = 3 + Math.random() * 3;
              cass.path = findPath([cass.x, cass.y], LAMP_ROUND[cass.leg % LAMP_ROUND.length]) ?? [];
            }
          } else {
            if (!cass.path.length) cass.path = findPath([cass.x, cass.y], [wx, wy]) ?? [[wx, wy]];
            const wp = cass.path[0];
            const ex = wp[0] - cass.x;
            const ey = wp[1] - cass.y;
            const d2 = Math.hypot(ex, ey) || 1;
            if (d2 < 14) cass.path.shift();
            // he stops to chat if she is right there
            const near = Math.hypot(her.x - cass.x, her.y - cass.y) < 90;
            if (!near) {
              cx = (ex / d2) * 0.55;
              cy = (ey / d2) * 0.55;
            }
          }
        }
        cass.vx += (cx * SPEED - cass.vx) * Math.min(1, dt * 6);
        cass.vy += (cy * SPEED * 0.85 - cass.vy) * Math.min(1, dt * 6);
        [cass.x, cass.y] = move(cass.x, cass.y, cass.x + cass.vx * dt, cass.y + cass.vy * dt);
        const cs = Math.hypot(cass.vx, cass.vy);
        cass.phase += dt * cs * 0.05;
        if (cs > 20) {
          if (Math.abs(cass.vy) > Math.abs(cass.vx) * 0.6) cass.face = cass.vy < 0 ? 'back' : 'front';
          if (Math.abs(cass.vx) > 15) cass.flip = cass.vx > 0;
        }
        if (talking) {
          cass.face = 'front';
          cass.flip = her.x > cass.x;
        }
      }
      if (cassEl.current) cassEl.current.style.display = cassOn ? 'block' : 'none';
      if (cassOn) place(cassEl.current, cass, 128, cass.face === 'back' ? 'cass_back.webp' : 'cass_front.webp');
      const d = s.dialogue;
      const seated = mode === 'seat' && !(d?.id === 'meet' && d.i >= 7);

      const sfx2 = herSuffix(s.look);
      place(herEl.current, her, lying ? 64 : 118, lying ? `her_sleep${sfx2}.webp` : her.face === 'back' ? `her_back${sfx2}.webp` : `her_front${sfx2}.webp`);
      place(himEl.current, him, seated ? 104 : 132, seated ? 'him_sit.webp' : him.face === 'back' ? 'him_back.webp' : 'him_front.webp');

      // ---- proximity ----
      if (s.screen === 'game' && !s.dialogue && !locked) {
        if (s.step >= STEP.q1) {
          const t = Date.now();
          for (const g of GLIMMERS)
            if ((s.glimmers[g.id] ?? 0) <= t && Math.hypot(g.pos[0] - her.x, g.pos[1] - her.y) < 46) {
              const el = root.current as (HTMLDivElement & { _view?: { ox: number; oy: number; sc: number } }) | null;
              if (el?._view) {
                const r = el.getBoundingClientRect();
                const v = el._view;
                window.dispatchEvent(new CustomEvent('veloria:collect', { detail: { x: r.left + g.pos[0] * v.sc + v.ox, y: r.top + (g.pos[1] - 40) * v.sc + v.oy, chain: g.chain } }));
              }
              s.collectGlimmer(g.id);
              if (Math.random() < 0.35) say(PICKUP[Math.floor(Math.random() * PICKUP.length)], 2.4);
            }
        }
        if (s.step === STEP.explore && Math.hypot(PLACES.himSeat[0] - her.x, PLACES.himSeat[1] - her.y) < 150) {
          s.setWalkTo(null);
          s.talkToHim();
        }
        let near: string | null = null;
        let best = Infinity;
        for (const sp of SPOTS) {
          const dd = Math.hypot(sp.pos[0] - her.x, sp.pos[1] - her.y);
          if (dd < sp.r && dd < best) (best = dd), (near = sp.id);
        }
        if (s.step >= STEP.q1 && him.fade < 0.5 && Math.hypot(him.x - her.x, him.y - her.y) < 95) near = 'him';
        if (s.step > STEP.wake3 && Math.hypot(cass.x - her.x, cass.y - her.y) < 95 && (near !== 'him' || Math.hypot(cass.x - her.x, cass.y - her.y) < Math.hypot(him.x - her.x, him.y - her.y))) near = 'cass';
        s.setNear(near);
      } else if (s.near) s.setNear(null);
      saveT += dt;
      if (saveT > 2 && !locked) {
        saveT = 0;
        const p: V2 = [Math.round(her.x), Math.round(her.y)];
        if (p[0] !== s.player[0] || p[1] !== s.player[1]) {
          s.setPlayer(p);
          knownPlayer = useGame.getState().player;
        }
      }
      (window as unknown as { __actors: unknown }).__actors = { her, him, path, cass };

      // ---- his asides ----
      if (bubbleT > 0) {
        bubbleT -= dt;
        if (bubbleT <= 0 || s.dialogue || locked) {
          bubbleT = 0;
          bubble.current?.classList.remove('on');
        }
      }
      if (mode === 'follow' && !s.dialogue && !locked) {
        chatT -= dt;
        if (chatT <= 0) {
          chatT = 22 + Math.random() * 18;
          const pool = s.step >= STEP.wake2 ? [...BANTER, ...BANTER2] : BANTER;
          say(pool[Math.floor(Math.random() * pool.length)], 4.5);
        }
      }
      if (bubble.current) bubble.current.style.transform = `translate(${him.x}px, ${him.y - 150 * depthScale(him.y)}px) translate(-50%, -100%)`;

      // ---- camera ----
      let tx = her.x;
      let ty = her.y - 110;
      let tz = 1;
      if (s.focus === 'alone') {
        tx = him.x;
        ty = him.y - 80;
        tz = 1.35;
      } else if (s.focus && FOCI[s.focus]) {
        [tx, ty] = FOCI[s.focus].at;
        tz = FOCI[s.focus].zoom;
      } else if (s.dialogue && s.step >= STEP.wake3 && (s.dialogue.lines[s.dialogue.i]?.who === 'cass' || s.dialogue.id === 'gift') && Math.hypot(cass.x - her.x, cass.y - her.y) < 400 && Math.hypot(cass.x - her.x, cass.y - her.y) < Math.hypot(him.x - her.x, him.y - her.y)) {
        tx = (her.x + cass.x) / 2;
        ty = (her.y + cass.y) / 2 + 40;
        tz = 1.3;
      } else if (s.dialogue && s.step >= STEP.explore && Math.hypot(him.x - her.x, him.y - her.y) < 400) {
        tx = (her.x + him.x) / 2;
        ty = (her.y + him.y) / 2 + 40;
        tz = 1.3;
      }
      const a = 1 - Math.exp(-dt * (s.focus ? 1.6 : 3.5));
      cam.x += (tx - cam.x) * a;
      cam.y += (ty - cam.y) * a;
      cam.z += (tz - cam.z) * a;
      const el = root.current;
      if (el && world.current) {
        const vw = el.clientWidth;
        const vh = el.clientHeight;
        const sc = scale * cam.z;
        const w = MAP_W * sc;
        const h = MAP_H * sc;
        let ox = vw / 2 - cam.x * sc;
        let oy = vh / 2 - cam.y * sc;
        ox = w <= vw ? (vw - w) / 2 : Math.min(0, Math.max(vw - w, ox));
        oy = h <= vh ? (vh - h) / 2 : Math.min(0, Math.max(vh - h, oy));
        world.current.style.transform = `translate(${ox}px, ${oy}px) scale(${sc})`;
        (el as HTMLDivElement & { _view?: unknown })._view = { ox, oy, sc };
      }

      // ---- overlays ----
      const running = prog('clock', 1500);
      if (running > 0) clockT += dt * (0.2 + running * 0.8);
      const mins = 15 + clockT * 2;
      if (minEl.current) minEl.current.style.transform = `rotate(${(mins / 60) * 360}deg)`;
      if (hourEl.current) hourEl.current.style.transform = `rotate(${((11 + mins / 60) / 12) * 360}deg)`;
      const lampOn = 0.45 + Math.min(1, flow / 2) * 0.55;
      lampEls.current.forEach((l, i) => {
        if (!l) return;
        const fl = flow > 1 ? 1 + Math.sin(now / 90 + i * 3) * 0.06 + Math.sin(now / 47 + i) * 0.04 : 1;
        l.style.opacity = String(lampOn * fl);
      });
      const bp = ease(prog('bookshop', 3500));
      if (shopGlow.current) shopGlow.current.style.opacity = String(bp * (0.75 + Math.sin(now / 900) * 0.15));
      const bell = prog('bell', 5000);
      if (bellRing.current) bellRing.current.style.display = bell > 0 ? 'block' : 'none';
      const t = Date.now();
      glimEls.current.forEach((g, i) => {
        if (!g) return;
        const gl = GLIMMERS[i];
        const ready = s.step >= STEP.q1 && (s.glimmers[gl.id] ?? 0) <= t;
        g.style.opacity = ready ? '1' : '0';
        g.style.transform = `translate(${gl.pos[0]}px, ${gl.pos[1] - 40 + Math.sin(now / 400 + i) * 6}px) scale(${ready ? 1 : 0.3})`;
      });
      if (marker.current) {
        const show = s.step === STEP.explore && !s.dialogue && s.screen === 'game';
        marker.current.style.display = show ? 'grid' : 'none';
        marker.current.style.transform = `translate(${him.x}px, ${him.y - 150 + Math.sin(now / 300) * 5}px)`;
      }
      if (letter.current) letter.current.style.display = s.letters.includes('roots') || s.step < STEP.explore ? 'none' : 'block';

      drawBase();
      drawFx(dt);
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
    };
  }, []);

  const toMap = (e: React.PointerEvent): V2 | null => {
    const el = root.current as (HTMLDivElement & { _view?: { ox: number; oy: number; sc: number } }) | null;
    if (!el?._view) return null;
    const r = el.getBoundingClientRect();
    const { ox, oy, sc } = el._view;
    return [(e.clientX - r.left - ox) / sc, (e.clientY - r.top - oy) / sc];
  };
  const down = useRef(false);
  const tap = (e: React.PointerEvent, first: boolean) => {
    const s = useGame.getState();
    if (s.screen !== 'game' || s.dialogue || s.focus || s.book.open || s.step < STEP.explore || s.tab !== 'explore') return;
    const p = toMap(e);
    if (!p) return;
    const actors = (window as unknown as { __actors?: { her: Actor; him: Actor } }).__actors;
    if (first && actors && s.step >= STEP.q1) {
      const { her, him } = actors;
      if (Math.hypot(p[0] - him.x, p[1] - (him.y - 60)) < 75) {
        if (Math.hypot(her.x - him.x, her.y - him.y) < 120) s.talkToHim();
        else {
          intent.v = { kind: 'him' };
          s.setWalkTo(snap(him.x + (her.x < him.x ? -60 : 60), him.y + 10));
        }
        return;
      }
    }
    const cs = (window as unknown as { __actors?: { cass?: { x: number; y: number } } }).__actors?.cass;
    if (first && cs && s.step > STEP.wake3 && Math.hypot(p[0] - cs.x, p[1] - (cs.y - 60)) < 75) {
      const her = (window as unknown as { __actors: { her: Actor } }).__actors.her;
      if (Math.hypot(her.x - cs.x, her.y - cs.y) < 120) s.talkToCass();
      else {
        intent.v = { kind: 'cass' };
        s.setWalkTo(snap(cs.x + (her.x < cs.x ? -60 : 60), cs.y + 10));
      }
      return;
    }
    if (first) {
      // tapping something worth looking at walks her there and looks
      const spot = SPOTS.find((sp) => Math.hypot(p[0] - sp.pos[0], p[1] - sp.pos[1]) < sp.r * 0.9);
      if (spot) {
        intent.v = { kind: 'spot', id: spot.id };
        s.setWalkTo(snap(spot.pos[0], spot.pos[1]));
        return;
      }
      intent.v = null;
    }
    const to = snap(p[0], p[1]);
    if (!to) return;
    if (first && ripple.current) {
      const r = ripple.current;
      r.style.left = `${to[0]}px`;
      r.style.top = `${to[1]}px`;
      r.classList.remove('go');
      void r.offsetWidth;
      r.classList.add('go');
    }
    const cur = s.walkTo;
    if (!first && cur && Math.hypot(cur[0] - to[0], cur[1] - to[1]) < 24) return;
    s.setWalkTo(to);
  };

  return (
    <div
      className="town"
      ref={root}
      onPointerDown={(e) => {
        down.current = true;
        tap(e, true);
      }}
      onPointerMove={(e) => down.current && tap(e, false)}
      onPointerUp={() => (down.current = false)}
      onPointerLeave={() => (down.current = false)}
    >
      <div className="town-backdrop" style={{ backgroundImage: `url(${ART}town_alive.webp)` }} />
      <div className="world" ref={world} style={{ width: MAP_W, height: MAP_H }}>
        <canvas ref={base} width={MAP_W} height={MAP_H} className="layer" />
        <div className="clock-hands" style={{ left: PLACES.clockFace[0], top: PLACES.clockFace[1] }}>
          <div className="hand hour" ref={hourEl} />
          <div className="hand minute" ref={minEl} />
          <div className="hand pin" />
        </div>
        <div className="bell-ring" ref={bellRing} style={{ left: 405, top: 215 }}>
          <i />
          <i />
          <i />
        </div>
        {LAMPS.map(([x, y], i) => (
          <div key={i} className="lamp-glow" ref={(el) => {
            lampEls.current[i] = el;
          }} style={{ left: x, top: y }} />
        ))}
        <div className="shop-glow" ref={shopGlow} style={{ left: 840, top: 672 }} />
        <div className="root-letter" ref={letter} style={{ left: 742, top: 1404 }} />
        {GLIMMERS.map((g, i) => (
          <div key={g.id} className={`glimmer ${g.chain}`} ref={(el) => {
            glimEls.current[i] = el;
          }} />
        ))}
        <div className="actor" ref={herEl}>
          <img alt="" draggable={false} />
          <div className="actor-shadow" />
        </div>
        <div className="actor" ref={cassEl} style={{ display: 'none' }}>
          <img alt="" draggable={false} />
          <div className="actor-shadow" />
        </div>
        <div className="actor" ref={himEl}>
          <img alt="" draggable={false} />
          <div className="actor-shadow" />
        </div>
        <div className="tap-ripple" ref={ripple} />
        <div className="him-bubble" ref={bubble} />
        <div className="marker map-marker" ref={marker}>
          !
        </div>
        <canvas ref={fx} width={MAP_W} height={MAP_H} className="layer fx" />
      </div>
    </div>
  );
}
