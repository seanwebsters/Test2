/* Calm Island – world, simulation, rendering, input and interface. */
"use strict";

const N = 34, KEY = "calm-island-save-v1";
const $ = (s, el = document) => el.querySelector(s);
const now = () => Date.now();
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const cv = $("#world"), ctx = cv.getContext("2d");
let VW = 0, VH = 0, DPR = 1;
const RIDX = Object.fromEntries(REGIONS.map((r, i) => [r.id, i]));
const LAND = new Set(["g", "s", "p", "r"]);
const MAXB = { plot: 36, beehive: 3, coop: 2, goatpen: 2 };
const BH = { home: 2.2, board: 1.15, teahouse: 1.9, beehive: 1, florist: 1.6, coop: 0.95, bakery: 2.15, workshop: 1.7, greenhouse: 1.6, goatpen: 0.9, meditation: 0.55, bathhouse: 1.45, lighthouse: 5, plot: 0.12 };
const DH = { arch: 1.35, umbrella: 1.7, cherry: 2.7, fairylights: 1.15, chimepost: 1.2, starlantern: 1.1, fountain: 1, lantern: 1, cottage: 1, flowerbed: 0.45, koi: 0.3, mushrooms: 0.4 };
const CANOPY = { jungle0: 0.6, jungle1: 0.7, jungle2: 0.6, jungle3: 0.6, jungle4: 0.6, jungle5: 1.5, palm: 2.55, round: 1.55, meadow: 1.55, magic: 1.55, cherry: 1.55, pine: 1.45 };
const TREE_H = { palm: 3.2, round: 2.7, meadow: 2.7, magic: 2.9, pine: 2.9, cherry: 2.7 };
const PATH_COST = 3;
const fmt = (n) => (n >= 10000 ? (n / 1000).toFixed(1) + "k" : String(Math.floor(n)));
const fmtT = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return s >= 60 ? `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s` : `${s}s`; };
const CH = Object.fromEntries(CALMLINGS.map((c) => [c.id, c]));

/* =================== terrain =================== */
let T, HT, RG, DIST, COAST = [], FALLS = [], POOLS = [];
function genTerrain() {
  T = new Array(N * N).fill("w"); HT = new Float32Array(N * N); RG = new Int8Array(N * N).fill(-1);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let best = -1e9, bi = 0;
    REGIONS.forEach((R, i) => { const v = R.r - Math.hypot(x + 0.5 - R.cx, y + 0.5 - R.cy); if (v > best) { best = v; bi = i; } });
    const noise = 0.55 * Math.sin(x * 0.83 + y * 0.37) + 0.45 * Math.sin(y * 0.91 - x * 0.29 + 1.7) + 0.3 * Math.sin((x + y) * 1.37 + 0.5);
    const s = best + noise * 0.55;
    if (s <= 0 || x < 1 || y < 1 || x > N - 2 || y > N - 2) continue;
    const i = y * N + x, id = REGIONS[bi].id;
    RG[i] = bi;
    let t = s < 1.15 ? "s" : "g", h = 0.5;
    if (id === "beach" && s < 3.2) { t = "s"; h = 0.5; }
    if (id === "mountain") { const k = clamp(best / REGIONS[bi].r, 0, 1); h = 0.5 + Math.round(k * 2.4 * 4) / 4; t = h >= 2 || s < 1.15 ? "r" : "g"; }
    if (id === "springs") { h = 0.5 + Math.round(clamp(best, 0, 1.2) * 0.5 * 4) / 4; t = s < 1.15 ? "r" : "g"; if (best > 2.1) { t = "h"; h -= 0.12; } }
    if (id === "village" && t === "g" && (x === 15 || y === 26)) t = "p";
    T[i] = t; HT[i] = h;
  }
  const set = (x, y, t, h) => { const i = y * N + x; T[i] = t; HT[i] = h; RG[i] = 0; };
  for (const y of [16, 17, 18]) { set(11, y, "c", 2.3); set(12, y, y === 16 ? "c" : "f", 2.0); set(13, y, y === 16 ? "c" : "f", 1.5); }
  for (const [x, y] of [[14, 17], [15, 17], [14, 18], [15, 18]]) set(x, y, "o", 0.3);
  for (const [x, y] of [[16, 17], [17, 17], [17, 18], [17, 19], [17, 20], [17, 21]]) set(x, y, "p", 0.5);
  for (const [x, y] of [[16, 15], [17, 15], [16, 16], [17, 16], [18, 15], [18, 16], [19, 18], [20, 18], [19, 19], [20, 19], [15, 16], [14, 16], [14, 19], [15, 19]]) set(x, y, "g", 0.5);
  for (const [x, y] of [[29, 6], [30, 6], [29, 7], [30, 7]]) { const i = y * N + x; T[i] = "g"; HT[i] = 0.5; RG[i] = RIDX.point; }
  if (S && S.tmod) for (const k in S.tmod) T[+k] = S.tmod[k];
  computeWater();
}
function computeWater() {
  DIST = new Int16Array(N * N).fill(99); const q = [];
  for (let i = 0; i < N * N; i++) if (T[i] !== "w") { DIST[i] = 0; q.push(i); }
  while (q.length) { const i = q.shift(), x = i % N, y = (i / N) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue; const j = ny * N + nx; if (DIST[j] > DIST[i] + 1) { DIST[j] = DIST[i] + 1; q.push(j); } } }
  COAST = []; FALLS = []; POOLS = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x; if (T[i] === "w") continue;
    const w = (dx, dy) => { const nx = x + dx, ny = y + dy; return nx < 0 || ny < 0 || nx >= N || ny >= N || T[ny * N + nx] === "w"; };
    if (w(0, -1)) COAST.push([x, y, x + 1, y, 0, -1]);
    if (w(1, 0)) COAST.push([x + 1, y, x + 1, y + 1, 1, 0]);
    if (w(0, 1)) COAST.push([x, y + 1, x + 1, y + 1, 0, 1]);
    if (w(-1, 0)) COAST.push([x, y, x, y + 1, -1, 0]);
    if (T[i] === "f") {
      if (x + 1 < N && HT[i + 1] < HT[i] && "fo".includes(T[i + 1])) FALLS.push({ x, y, side: "x", z0: HT[i + 1], z1: HT[i] });
      if (y + 1 < N && HT[i + N] < HT[i] && "fo".includes(T[i + N])) FALLS.push({ x, y, side: "y", z0: HT[i + N], z1: HT[i] });
    }
    if (T[i] === "h") POOLS.push([x, y]);
  }
}
const regionOf = (x, y) => (x < 0 || y < 0 || x >= N || y >= N || RG[y * N + x] < 0 ? null : REGIONS[RG[y * N + x]]);
const unlockedAt = (x, y) => { const r = regionOf(x, y); return !!(r && S.regions[r.id]); };

const SIDE = { g: "#b98a62", s: "#e6c995", p: "#b98a62", r: "#a9a1b4", c: "#9e97ad", f: "#9e97ad", o: "#b98a62", h: "#a9a1b4" };
function tileTop(x, y) {
  const i = y * N + x, t = T[i], R = REGIONS[RG[i]] || REGIONS[0], v = ((x * 928371 + y * 1237) % 7) / 7;
  switch (t) {
    case "g": return shade(R.grass, (x + y) % 2 ? 0.035 + v * 0.03 : v * 0.03 - 0.01);
    case "s": return shade("#f3dfb2", (x + y) % 2 ? 0.04 : v * 0.03);
    case "p": return shade("#e9dcc4", v * 0.04);
    case "r": return shade("#bdb6c6", (x + y) % 2 ? 0.05 : 0);
    case "c": return "#a9b98e";
    case "f": return "#86d8e0";
    case "o": return "#6fcbd3";
    case "h": return "#a7e6df";
  }
  return "#000";
}
let TER = null;
function buildTerrain() {
  const minX = -N * HW - 40, maxX = N * HW + 40, minY = -3.2 * ZS - 40, maxY = N * 2 * HH + 40;
  const CS = Math.min(1.6, Math.max(1, DPR));
  const w = maxX - minX, h = maxY - minY;
  if (!TER) TER = { cv: document.createElement("canvas") };
  TER.cv.width = Math.ceil(w * CS); TER.cv.height = Math.ceil(h * CS);
  Object.assign(TER, { x: minX, y: minY, w, h });
  const c = TER.cv.getContext("2d"); c.setTransform(CS, 0, 0, CS, 0, 0); c.clearRect(0, 0, w, h);
  const sv = [G, OX, OY]; G = c; OX = -minX; OY = -minY;
  for (let i = 0; i < N * N; i++) if (T[i] === "w") drawTile(i % N, (i / N) | 0);
  for (let s = 0; s < 2 * N - 1; s++) for (let x = 0; x <= s; x++) { const y = s - x; if (x < N && y < N && T[y * N + x] !== "w") drawTile(x, y); }
  [G, OX, OY] = sv;
}
/* Painted ground: seamless textures (mirrored so edges always meet) mapped onto the isometric planes. */
const PAT = {};
function texPat(key, perTile = 100) {
  const k = key + perTile; if (PAT[k] !== undefined) return PAT[k];
  const s = typeof SKINNED !== "undefined" && SKINNED[key]; if (!s) return (PAT[k] = null);
  const w = s.cv.width, h = s.cv.height, c = document.createElement("canvas"); c.width = w * 2; c.height = h * 2;
  const g = c.getContext("2d");
  for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { g.save(); g.translate(sx < 0 ? 2 * w : 0, sy < 0 ? 2 * h : 0); g.scale(sx, sy); g.drawImage(s.cv, 0, 0); g.restore(); }
  const p = g.createPattern(c, "repeat"); p.setTransform(new DOMMatrix().scale(perTile ? 1 / perTile : 1));
  return (PAT[k] = p);
}
function texTop(pat, x, y, h) {
  G.save(); G.beginPath(); const q = [P(x, y, h), P(x + 1, y, h), P(x + 1, y + 1, h), P(x, y + 1, h)];
  G.moveTo(q[0][0], q[0][1] - 0.4); G.lineTo(q[1][0] + 0.6, q[1][1]); G.lineTo(q[2][0], q[2][1] + 0.4); G.lineTo(q[3][0] - 0.6, q[3][1]); G.closePath(); G.clip();
  const [ox, oy] = P(0, 0, h); G.transform(HW, HH, -HW, HH, ox, oy); G.fillStyle = pat; G.fillRect(x - 0.05, y - 0.05, 1.1, 1.1); G.restore();
}
function texFace(pat, side, x, y, z0, z1) {
  G.save();
  if (side === "y") { const [ox, oy] = P(0, y + 1, 0); G.transform(HW, HH, 0, -ZS, ox, oy); G.fillStyle = pat; G.fillRect(x, z0, 1, z1 - z0); }
  else { const [ox, oy] = P(x + 1, 0, 0); G.transform(-HW, HH, 0, -ZS, ox, oy); G.fillStyle = pat; G.fillRect(y, z0, 1, z1 - z0); }
  G.restore();
}
function topTex(t, reg) {
  if (t === "g") return reg === "forest" ? texPat("tex:forest", 70) : reg === "meadow" ? texPat("tex:meadow", 60) : texPat("tex:grass", 45);
  if (t === "s") return texPat("tex:sand");
  if (t === "p") return texPat("tex:path", 80);
  if (t === "r" || t === "c") return texPat("tex:rock");
  if (t === "o" || t === "f" || t === "h") return texPat("tex:water", 140);
  return null;
}
const sideTex = (t) => ("gop".includes(t) ? texPat("tex:cliff", 90) : t === "s" ? texPat("tex:sand") : texPat("tex:stone", 90));
function drawTile(x, y) {
  const i = y * N + x, t = T[i];
  if (t === "w") {
    const d = DIST[i];
    if (d <= 4) { const [cx, cy] = P(x + 0.5, y + 0.5, 0), a = [0, 0.42, 0.24, 0.12, 0.05][d]; G.save(); G.translate(cx, cy); G.scale(1, 0.5); const g = G.createRadialGradient(0, 0, 0, 0, 0, 64); g.addColorStop(0, `rgba(200,255,244,${a})`); g.addColorStop(1, "rgba(200,255,244,0)"); G.fillStyle = g; G.fillRect(-64, -64, 128, 128); G.restore(); }
    return;
  }
  const h = HT[i], R = rnd(i * 7 + 3);
  const nb = (j, ok) => (ok && T[j] !== "w" ? HT[j] : -0.3);
  const hl = nb(i + N, y + 1 < N), hr = nb(i + 1, x + 1 < N);
  const side = SIDE[t];
  const face = (pts, col, low, sd, z0) => {
    const g = G.createLinearGradient(0, pts[0][1], 0, pts[3][1] + 4);
    g.addColorStop(0, col); g.addColorStop(0.7, shade(col, -0.12)); g.addColorStop(1, low < 0 ? "#6fb6b5" : shade(col, -0.2));
    poly(pts, g, EDGE, 0.6);
    const st = sideTex(t); if (!st) return;
    texFace(st, sd, x, y, z0, h);
    const o = G.createLinearGradient(0, pts[0][1], 0, pts[3][1] + 4);
    o.addColorStop(0, sd === "x" ? "rgba(40,30,60,.22)" : "rgba(40,30,60,.04)"); o.addColorStop(0.75, sd === "x" ? "rgba(40,30,60,.32)" : "rgba(40,30,60,.16)"); o.addColorStop(1, low < 0 ? "rgba(90,190,195,.85)" : "rgba(40,30,60,.3)");
    poly(pts, o, EDGE, 0.6);
  };
  if (hl < h) {
    face([P(x, y + 1, h), P(x + 1, y + 1, h), P(x + 1, y + 1, hl), P(x, y + 1, hl)], side, hl, "y", hl);
    if (t === "g") poly([P(x, y + 1, h), P(x + 1, y + 1, h), P(x + 1, y + 1, h - 0.07), P(x, y + 1, h - 0.07)], shade(tileTop(x, y), -0.12));
    if (t === "c" || t === "f" || t === "r") for (let k = 1; k < (h - hl) * 3; k++) line(P(x + 0.05, y + 1, h - k / 3), P(x + 0.95, y + 1, h - k / 3 + 0.05), "rgba(70,60,90,.15)", 0.8);
  }
  if (hr < h) {
    face([P(x + 1, y, h), P(x + 1, y + 1, h), P(x + 1, y + 1, hr), P(x + 1, y, hr)], shade(side, -0.14), hr, "x", hr);
    if (t === "g") poly([P(x + 1, y, h), P(x + 1, y + 1, h), P(x + 1, y + 1, h - 0.07), P(x + 1, y, h - 0.07)], shade(tileTop(x, y), -0.2));
    if (t === "c" || t === "f" || t === "r") for (let k = 1; k < (h - hr) * 3; k++) line(P(x + 1, y + 0.05, h - k / 3), P(x + 1, y + 0.95, h - k / 3 + 0.05), "rgba(60,50,80,.18)", 0.8);
  }
  const top = tileTop(x, y);
  poly([P(x, y, h), P(x + 1, y, h), P(x + 1, y + 1, h), P(x, y + 1, h)], top, "rgba(60,80,50,.06)", 0.6);
  const reg = REGIONS[RG[i]] ? REGIONS[RG[i]].id : "garden";
  const tp = topTex(t, reg);
  if (tp) {
    texTop(tp, x, y, h);
    if (t === "g" && !["garden", "meadow", "forest"].includes(reg)) { G.globalAlpha = 0.14; poly([P(x, y, h), P(x + 1, y, h), P(x + 1, y + 1, h), P(x, y + 1, h)], REGIONS[RG[i]].grass); G.globalAlpha = 1; }
    if ("ofh".includes(t)) { G.globalAlpha = t === "h" ? 0.4 : 0.2; poly([P(x, y, h), P(x + 1, y, h), P(x + 1, y + 1, h), P(x, y + 1, h)], t === "h" ? "#c8f4ec" : "#bff2f2"); G.globalAlpha = 1; }
    if (t === "g" && SKINNED["scatter:0"] && R() < (reg === "meadow" ? 0.7 : reg === "forest" ? 0.25 : 0.45)) {
      for (let k = 0, n = 1 + (R() < 0.4 ? 1 : 0); k < n; k++) {
        const im = SKINNED["scatter:" + (R() < 0.5 ? 0 : 1)].cv, w = 13 + R() * 8, hh = w * (im.height / im.width);
        const [px, py] = P(x + 0.2 + R() * 0.6, y + 0.2 + R() * 0.6, h); G.drawImage(im, px - w / 2, py - hh + 2, w, hh);
      }
    }
    if (h > 0.6 && t !== "h") { G.globalAlpha = Math.min(0.12, (h - 0.5) * 0.05); poly([P(x, y, h), P(x + 1, y, h), P(x + 1, y + 1, h), P(x, y + 1, h)], "#fffaf0"); G.globalAlpha = 1; }
    return;
  }
  if (t === "g") {
    for (let k = 0; k < 4; k++) { const [px, py] = P(x + 0.15 + R() * 0.7, y + 0.15 + R() * 0.7, h); line([px, py], [px - 1.5, py - 3.5], shade(top, -0.14), 1); line([px + 1.5, py], [px + 2.5, py - 3], shade(top, -0.1), 1); }
    const fl = reg === "meadow" ? 0.7 : reg === "village" ? 0.4 : reg === "forest" ? 0.25 : 0.3;
    if (R() < fl) for (let k = 0; k < 2 + R() * 3; k++) { const [px, py] = P(x + 0.15 + R() * 0.7, y + 0.15 + R() * 0.7, h); const cols = reg === "forest" ? ["#bff3e6", "#d9c9ff"] : reg === "meadow" ? ["#ffe07a", "#ffffff", "#f6b0c4", "#ffc36b"] : ["#ffffff", "#f6b0c4", "#fff1a1", "#cbb6f2"]; circ(px, py - 1, 1.5, cols[Math.floor(R() * cols.length)]); }
  } else if (t === "s") {
    for (let k = 0; k < 5; k++) { const [px, py] = P(x + R(), y + R(), h); circ(px, py, 0.8, "rgba(180,150,100,.35)"); }
  } else if (t === "p") {
    for (let k = 0; k < 5; k++) { const [px, py] = P(x + 0.2 + (k % 3) * 0.3 + R() * 0.08, y + 0.2 + Math.floor(k / 2) * 0.3 + R() * 0.08, h); ell(px, py, 5.5, 2.8, shade("#d8c8aa", R() * 0.15)); ell(px, py - 0.6, 4.5, 2, shade("#f1e6d2", R() * 0.1)); }
  } else if (t === "r") {
    for (let k = 0; k < 2; k++) { const [px, py] = P(x + 0.2 + R() * 0.6, y + 0.2 + R() * 0.6, h); line([px, py], [px + 5, py + 1.5], "rgba(80,70,100,.2)", 1); }
    if (R() < 0.3) { const [px, py] = P(x + 0.5, y + 0.5, h); ell(px, py, 6, 2.5, "#9cc48a"); }
  } else if (t === "c") {
    for (let k = 0; k < 3; k++) { const [px, py] = P(x + 0.2 + R() * 0.6, y + 0.2 + R() * 0.6, h); ball(px, py - 2, 4 + R() * 3, "#8fb77a", 0.25); }
  } else if (t === "o" || t === "f" || t === "h") {
    const [px, py] = P(x + 0.5, y + 0.5, h); ell(px - 4, py - 1, 9, 2.4, "rgba(255,255,255,.35)");
  }
}

/* =================== state =================== */
let S = null;
const U = { spawnT: {}, panel: null, panelFn: null, brush: null, pathBrush: false, place: null, popup: null, unlocking: {}, fx: [], fliers: [], confetti: [], sel: null, camAnim: null, hint: true };
let occ = new Int32Array(N * N);
const objById = new Map();
function rebuildOcc() {
  occ.fill(0); objById.clear();
  for (const o of S.objs) { objById.set(o.id, o); for (let dx = 0; dx < (o.w || 1); dx++) for (let dy = 0; dy < (o.d || 1); dy++) { const x = o.x + dx, y = o.y + dy; if (x >= 0 && y >= 0 && x < N && y < N) occ[y * N + x] = o.id; } }
}
function newObjects() {
  const objs = []; let nid = 1; const R = rnd(20261027); const taken = new Set();
  const add = (o) => { o.id = nid++; o.w = o.w || 1; o.d = o.d || 1; objs.push(o); for (let dx = 0; dx < o.w; dx++) for (let dy = 0; dy < o.d; dy++) taken.add((o.y + dy) * N + o.x + dx); return o; };
  const free = (x, y, w = 1, d = 1) => { for (let dx = 0; dx < w; dx++) for (let dy = 0; dy < d; dy++) { const i = (y + dy) * N + x + dx; if (x + dx >= N || y + dy >= N || taken.has(i) || !["g", "s", "r"].includes(T[i])) return false; } return true; };
  add({ k: "b", t: "home", x: 16, y: 15, w: 2, d: 2 });
  add({ k: "b", t: "board", x: 19, y: 15 });
  const t0 = now();
  [[19, 18], [20, 18], [19, 19], [20, 19]].forEach(([x, y], k) => add({ k: "b", t: "plot", x, y, crop: k < 2 ? { id: "strawberry", t0: t0 - (k ? 9000 : 30000), dur: 20000 } : null }));
  add({ k: "d", t: "flowerbed", x: 15, y: 16 }); add({ k: "d", t: "flowerbed", x: 18, y: 16 });
  for (const [x, y] of [[14, 16], [14, 19], [15, 19], [16, 18], [18, 17], [18, 18], [18, 19], [19, 17], [20, 17], [18, 20], [16, 19], [15, 14], [16, 14], [17, 14], [18, 14], [15, 15], [19, 15], [19, 16], [19, 14]]) taken.add(y * N + x);
  for (const [x, y, k] of [[15, 20, "wild"], [16, 21, "wild"], [18, 21, "wild"], [21, 16, "wild"], [13, 20, "wild"], [20, 21, "wild"], [21, 15, "rock"], [15, 21, "rock"], [22, 18, "rock"]]) if (free(x, y)) add({ k, x, y, seed: x * 7 + y });
  for (let y = 17; y <= 21; y++) for (let x = 19; x <= 22; x++) taken.add(y * N + x);
  add({ k: "b", t: "lighthouse", x: 29, y: 6, w: 2, d: 2 });
  const counts = {};
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x; if (!free(x, y)) continue;
    const reg = REGIONS[RG[i]].id, t = T[i], r = R(), cx = REGIONS[RG[i]].cx, cy = REGIONS[RG[i]].cy, d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
    const tree = (k) => add({ k: "tree", t: k, x, y, seed: Math.floor(R() * 1000) });
    const node = (k) => add({ k, x, y, seed: Math.floor(R() * 1000) });
    counts[reg] = counts[reg] || 0;
    if (reg === "garden") { if ((d > 3.7 && r < 0.5) || (t === "s" && r < 0.6)) tree("palm"); else if (r < 0.15) node("wild"); else if (r < 0.19) node("rock"); else if (r < 0.215) tree("round"); }
    else if (reg === "meadow") { if (t === "s" && r < 0.3) tree("palm"); else if (r < 0.12) tree("meadow"); else if (r < 0.22) node("wild"); else if (r < 0.27) node("rock"); }
    else if (reg === "forest") { if (r < 0.46) tree("magic"); else if (r < 0.53) node("moss"); else if (r < 0.58) node("wild"); }
    else if (reg === "beach") { if (r < 0.12) tree("palm"); else if (r < 0.16) node("rock"); else if (r < 0.22) node("shell"); }
    else if (reg === "village") {
      const nearPath = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => T[(y + dy) * N + x + dx] === "p");
      if (nearPath && r < 0.34) add({ k: "d", t: "cottage", x, y, fixed: true }); else if (r < 0.16) tree("cherry"); else if (r < 0.2) add({ k: "d", t: "lantern", x, y, fixed: true });
    }
    else if (reg === "mountain") { if (t === "g" && r < 0.42) tree("pine"); else if (t === "r" && r < 0.14) node("rock"); else if (t === "r" && r < 0.2) node("crystal"); }
    else if (reg === "springs") { if (t === "g" && r < 0.22) tree("pine"); else if (r < 0.1) node("rock"); }
    else if (reg === "point") { if (r < 0.14) tree("palm"); else if (r < 0.22) node("rock"); else if (r < 0.28) node("wild"); }
  }
  REGIONS.slice(1).forEach((Rg, ri) => {
    let best = null, bd = 1e9;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = y * N + x; if (RG[i] !== ri + 1 || !["g", "s", "r", "p"].includes(T[i]) || (x >= 18 && x <= 23 && y >= 16 && y <= 22)) continue;
      const adj = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const j = (y + dy) * N + x + dx; return RG[j] >= 0 && RG[j] !== ri + 1 && T[j] !== "w"; });
      const dd = Math.hypot(x - 17, y - 17) - (adj ? 4 : 0);
      if (dd < bd) { bd = dd; best = [x, y]; }
    }
    if (best) {
      const [x, y] = best, j = y * N + x;
      const blocker = objs.findIndex((o) => o.x === x && o.y === y && o.k !== "b");
      if (blocker >= 0) objs.splice(blocker, 1);
      if (!objs.some((o) => o.k === "b" && x >= o.x && x < o.x + o.w && y >= o.y && y < o.y + o.d)) { add({ k: "sign", region: Rg.id, x, y }); taken.add(j); }
    }
  });
  return { objs, nid };
}
function growJungle() {
  rebuildOcc();
  const R = rnd(777), near = (x, y) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const o = objById.get(occ[(y + dy) * N + x + dx]); if (o && (o.k === "b" || o.k === "sign")) return true; } return false; };
  for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) {
    const i = y * N + x; if (!["g", "s"].includes(T[i]) || occ[i] || RG[i] < 0) continue;
    const reg = REGIONS[RG[i]].id; if (reg === "village" || reg === "mountain") continue;
    if (x >= 15 && x <= 21 && y >= 15 && y <= 21) continue;
    let coast = false; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (T[(y + dy) * N + x + dx] === "w") coast = true;
    const p = coast ? (T[i] === "s" ? 0.4 : 0.8) : reg === "garden" ? 0.55 : reg === "forest" ? 0.25 : reg === "meadow" || reg === "point" ? 0.12 : 0.07;
    if (R() > p || near(x, y)) continue;
    const kinds = T[i] === "s" ? [0, 3, 4] : reg === "forest" ? [0, 0, 1, 3, 5] : [0, 1, 2, 3, 4, 5];
    S.objs.push({ id: S.nid++, k: "tree", t: "jungle" + kinds[Math.floor(R() * kinds.length)], x, y, w: 1, d: 1, seed: Math.floor(R() * 1000) });
    occ[i] = -1;
  }
  S.jungle = 2; rebuildOcc();
}
function orderValue(items) { let v = 0; for (const k in items) v += ITEMS[k].value * items[k]; return v; }
function makeOrder(who, items) { const v = orderValue(items); const craft = Object.keys(items).some((k) => ITEMS[k].kind === "craft"); return { who, items, coins: Math.round(v * 1.45 + 4), hearts: craft ? 2 : 1 }; }
function newGame() {
  S = null; genTerrain();
  const { objs, nid } = newObjects();
  S = {
    v: 1, coins: 60, hearts: 5, inv: { strawberry: 2, wood: 4, stone: 2, fibre: 2 }, level: 1, qp: [0, 0, 0], levelReady: false,
    regions: { garden: true }, tmod: {}, objs, nid, orders: [makeOrder("apricus", { strawberry: 2 }), makeOrder("apricus", { carrot: 2, wood: 2 }), null], orderNext: [0, 0, now() + 25000],
    friends: { apricus: 0 }, chatT: {}, lighthouse: 0, lhGiven: {}, finale: false, intro: false, sfx: true, music: true, stats: { deliver: 0, harvest: 0, made: 0 },
  };
  genTerrain(); growJungle();
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage unavailable */ } }
function load() {
  try { const raw = localStorage.getItem(KEY); if (raw) { const d = JSON.parse(raw); if (d && d.v === 1 && d.objs) { S = d; genTerrain(); return true; } } } catch (e) { /* ignore */ }
  return false;
}

/* =================== inventory & economy =================== */
const inv = (id) => (id === "coins" ? S.coins : id === "hearts" ? S.hearts : S.inv[id] || 0);
function give(id, n) { if (id === "coins") S.coins += n; else if (id === "hearts") S.hearts += n; else S.inv[id] = (S.inv[id] || 0) + n; }
function has(cost) { for (const k in cost) if (inv(k) < cost[k]) return false; return true; }
function pay(cost) { if (!has(cost)) return false; for (const k in cost) give(k, -cost[k]); return true; }
function costHTML(cost, mult = 1) {
  return Object.keys(cost).map((k) => { const n = cost[k] * mult, ok = inv(k) >= n; return `<span class="chip ${ok ? "" : "short"}"><img src="${iconURL(k)}" alt="">${k === "coins" || k === "hearts" ? fmt(n) : `${Math.min(inv(k), n)}/${n}`}</span>`; }).join("");
}
const serenity = () => S.objs.reduce((a, o) => a + (o.k === "d" && !o.fixed && DECOR[o.t] ? DECOR[o.t].s : 0), 0) + Object.keys(S.tmod).length * 0.25 | 0;
const friendLevel = (id) => { const p = S.friends[id] || 0; let l = 0; FRIEND_LEVELS.forEach((v, i) => { if (p >= v) l = i; }); return l; };
const arrived = () => CALMLINGS.filter((c) => (c.visitor ? S.finale : c.lvl <= S.level));
const countB = (t) => S.objs.filter((o) => o.k === "b" && o.t === t).length;
const greenhouse = () => countB("greenhouse") > 0;

/* =================== quests & levels =================== */
const LV = () => LEVELS[S.level - 1];
function questDone(q, i) {
  if (q.ev) return (S.qp[i] || 0) >= q.n;
  if (q.build) return countB(q.build) > 0;
  if (q.region) return !!S.regions[q.region];
  if (q.friend) return arrived().some((c) => friendLevel(c.id) >= q.friend);
  if (q.serenity) return serenity() >= q.serenity;
  if (q.lighthouse) return S.lighthouse >= q.lighthouse;
  return false;
}
function questProgress(q, i) {
  if (q.ev) return `${Math.min(S.qp[i] || 0, q.n)}/${q.n}`;
  if (q.serenity) return `${Math.min(serenity(), q.serenity)}/${q.serenity}`;
  if (q.lighthouse) return `${Math.min(S.lighthouse, 3)}/3`;
  return "";
}
function fire(ev, n = 1) {
  if (S.finale) return;
  LV().quests.forEach((q, i) => { if (q.ev === ev) S.qp[i] = (S.qp[i] || 0) + n; });
  checkLevel();
}
function checkLevel() {
  if (S.finale) return renderQuests();
  const done = LV().quests.every(questDone);
  if (done && !S.levelReady) { S.levelReady = true; sfx("level"); setTimeout(openLevelComplete, 700); }
  renderQuests();
}
function unlocksFor(l) {
  const out = [];
  for (const k in CROPS) if (CROPS[k].lvl === l) out.push({ icon: iconURL(k), name: ITEMS[k].name, kind: "Crop" });
  for (const k in BUILDINGS) if (BUILDINGS[k].lvl === l) out.push({ icon: buildThumb(k), name: BUILDINGS[k].name, kind: "Building" });
  for (const k in BUILDINGS) (BUILDINGS[k].recipes || []).forEach((r) => { if (r.lvl === l && BUILDINGS[k].lvl < l && r.out !== "hearts") out.push({ icon: iconURL(r.out), name: ITEMS[r.out].name, kind: "Recipe" }); });
  for (const k in DECOR) if (DECOR[k].lvl === l) out.push({ icon: decorThumb(k), name: DECOR[k].name, kind: "Decoration" });
  for (const R of REGIONS) if (R.lvl === l && R.id !== "garden") out.push({ icon: iconURL("serenity"), name: R.name, kind: "New region" });
  return out;
}
function claimLevel() {
  if (!S.levelReady) return;
  const L = LV();
  give("coins", L.reward.coins); give("hearts", L.reward.hearts);
  flyFromScreen("coins", VW / 2, VH / 2, 6); flyFromScreen("hearts", VW / 2, VH / 2, 4);
  if (S.level === 12) { S.levelReady = false; closeSheet(); save(); return finale(); }
  S.level++; S.qp = LV().quests.map(() => 0); S.levelReady = false;
  const newbie = CALMLINGS.find((c) => c.lvl === S.level && !c.visitor);
  if (newbie) { S.friends[newbie.id] = S.friends[newbie.id] || 0; spawnCalmling(newbie, true); }
  refillOrders(true);
  save(); updateHUD(); renderQuests(); confetti();
  openSheet(`Level ${S.level}`, () => {
    const L2 = LV();
    return `<div class="levelup"><p class="eyebrow">A new chapter</p><h3>${L2.name}</h3><p>${L2.intro}</p>
      ${newbie ? `<div class="newbie"><img src="${portrait(newbie)}" alt=""><div><b>${newbie.name} has arrived</b><span>${newbie.word}</span><p>${newbie.mood}</p></div></div>` : ""}
      <h4>Now unlocked</h4><div class="unlocks">${unlocksFor(S.level).map((u) => `<div class="unl"><img src="${u.icon}" alt=""><b>${u.name}</b><span>${u.kind}</span></div>`).join("")}</div>
      <button class="btn primary wide" data-act="close">Let's go</button></div>`;
  });
  checkLevel();
}

/* =================== orders =================== */
function availableItems() {
  const out = [];
  for (const k in CROPS) if (CROPS[k].lvl <= S.level) out.push(k);
  out.push("wood", "stone", "fibre");
  if (S.regions.beach) out.push("shell");
  if (S.regions.forest) out.push("moss");
  if (S.regions.mountain) out.push("crystal");
  for (const k in BUILDINGS) { if (!countB(k)) continue; for (const r of BUILDINGS[k].recipes || []) if (r.lvl <= S.level && r.out !== "hearts") out.push(r.out); }
  return [...new Set(out)];
}
function genOrder() {
  const who = arrived(); const ch = who[Math.floor(Math.random() * who.length)];
  const pool = availableItems(); const items = {};
  const k = 1 + (Math.random() < 0.55 ? 1 : 0) + (S.level >= 4 && Math.random() < 0.3 ? 1 : 0);
  const weight = (id) => ({ crop: 3, animal: 2.4, craft: 2.6, gather: 1 })[ITEMS[id].kind];
  if (pool.includes(ch.fav) && Math.random() < 0.35) items[ch.fav] = 1;
  let guard = 0;
  while (Object.keys(items).length < k && guard++ < 40) {
    const tot = pool.reduce((a, id) => a + weight(id), 0); let r = Math.random() * tot, pick = pool[0];
    for (const id of pool) { r -= weight(id); if (r <= 0) { pick = id; break; } }
    if (items[pick]) continue;
    const kind = ITEMS[pick].kind;
    items[pick] = kind === "crop" ? 2 + Math.floor(Math.random() * (2 + S.level / 3)) : kind === "gather" ? 2 + Math.floor(Math.random() * 3) : kind === "animal" ? 1 + Math.floor(Math.random() * 2) : 1 + (S.level >= 6 && Math.random() < 0.35 ? 1 : 0);
  }
  return makeOrder(ch.id, items);
}
const orderSlots = () => Math.min(6, 3 + Math.floor(S.level / 4));
function refillOrders(force) {
  while (S.orders.length < orderSlots()) { S.orders.push(null); S.orderNext.push(now() + 8000); }
  S.orders.forEach((o, i) => { if (!o && (force || now() >= S.orderNext[i])) S.orders[i] = genOrder(); });
}
function canDeliver(o) { return o && has(o.items); }
function deliver(i) {
  const o = S.orders[i]; if (!o || !pay(o.items)) return;
  const bonus = Math.min(50, serenity()) / 100, coins = Math.round(o.coins * (1 + bonus));
  give("coins", coins); give("hearts", o.hearts);
  const before = friendLevel(o.who); S.friends[o.who] = (S.friends[o.who] || 0) + 1;
  S.orders[i] = null; S.orderNext[i] = now() + 14000; S.stats.deliver++;
  const b = S.objs.find((x) => x.t === "board");
  const [sx, sy] = b ? worldToScreen(...P(b.x + 0.5, b.y + 0.5, 1)) : [VW / 2, VH / 2];
  flyFromScreen("coins", sx, sy, 5); flyFromScreen("hearts", sx, sy, 2);
  sfx("coin"); toast(`${CH[o.who].name} says thank you · +${coins} coins${bonus ? ` (${Math.round(bonus * 100)}% serenity bonus)` : ""}`);
  const cl = CL.find((c) => c.ch.id === o.who); if (cl) { cl.happy = 2.5; for (let k = 0; k < 4; k++) U.fx.push({ type: "heart", x: P(cl.x, cl.y, 0)[0] + (Math.random() - 0.5) * 18, y: P(cl.x, cl.y, groundZ(cl.x, cl.y))[1] - 30, vy: -26 - Math.random() * 10, life: 1.6, max: 1.6 }); }
  if (friendLevel(o.who) > before) friendUp(o.who);
  fire("deliver"); updateHUD(); save();
}
function friendUp(id) { const l = friendLevel(id); toast(`You and ${CH[id].name} are now ${FRIEND_NAMES[l].toLowerCase()}s${l <= 3 ? " · a new story chapter is open" : ""}`, "hearts"); sfx("level"); checkLevel(); }

/* =================== production =================== */
const queueCap = (o) => (BUILDINGS[o.t].animal ? 3 : 3 + (S.level >= 8 ? 1 : 0));
function startJob(o, ri) {
  const B = BUILDINGS[o.t], r = B.recipes[ri];
  if (r.lvl > S.level) return;
  o.q = o.q || [];
  if (o.q.length >= queueCap(o)) return toast("This queue is full. Collect finished goods first.");
  if (!pay(r.inp)) return toast("You need a few more ingredients.");
  const last = o.q.length ? o.q[o.q.length - 1].e : now();
  const s = Math.max(now(), last);
  o.q.push({ r: ri, s, e: s + r.time * 1000 });
  sfx("pop"); updateHUD(); save();
}
function collect(o) {
  const t = now(), done = (o.q || []).filter((j) => j.e <= t);
  if (!done.length) return false;
  o.q = o.q.filter((j) => j.e > t);
  const [sx, sy] = worldToScreen(...P(o.x + o.w / 2, o.y + o.d / 2, groundZ(o.x, o.y) + (BH[o.t] || 1)));
  for (const j of done) {
    const r = BUILDINGS[o.t].recipes[j.r];
    give(r.out, r.n); S.stats.made++;
    flyFromScreen(r.out, sx, sy, Math.min(3, r.n));
    fire("make:" + r.out, 1);
  }
  sfx("harvest"); updateHUD(); save();
  return true;
}
function speedUp(o) {
  const t = now(), j = (o.q || []).find((x) => x.e > t); if (!j) return;
  const rem = j.e - t, cost = Math.max(1, Math.ceil(rem / 30000));
  if (S.hearts < cost) return toast("Not enough hearts. Deliver requests or meditate to earn more.");
  S.hearts -= cost; for (const x of o.q) if (x.e > t) { x.e -= rem; x.s -= rem; }
  sfx("pop"); updateHUD(); save();
}

/* =================== farming & gathering =================== */
function cropReady(o) { return o.crop && now() >= o.crop.t0 + o.crop.dur; }
function cropStage(o) { if (!o.crop) return -1; const p = (now() - o.crop.t0) / o.crop.dur; return p >= 1 ? 3 : p > 0.6 ? 2 : p > 0.25 ? 1 : 0; }
function plant(o, id) {
  if (o.crop) return false;
  const C = CROPS[id]; if (C.lvl > S.level) return false;
  if (S.coins < C.seed) { toast("Not enough coins for seeds."); U.brush = null; renderBrush(); return false; }
  S.coins -= C.seed; o.crop = { id, t0: now(), dur: C.time * 1000 * (greenhouse() ? 0.8 : 1) };
  const [x, y] = P(o.x + 0.5, o.y + 0.5, groundZ(o.x, o.y)); for (let k = 0; k < 5; k++) U.fx.push({ type: "dust", x: x + (Math.random() - 0.5) * 20, y: y - 3, vx: (Math.random() - 0.5) * 20, vy: -10 - Math.random() * 10, life: 0.6, max: 0.6 });
  sfx("plant"); updateHUD();
  return true;
}
function harvest(o) {
  if (!cropReady(o)) return false;
  const id = o.crop.id, n = CROPS[id].yield; give(id, n); o.crop = null; S.stats.harvest += n;
  const [sx, sy] = worldToScreen(...P(o.x + 0.5, o.y + 0.5, groundZ(o.x, o.y) + 0.3));
  flyFromScreen(id, sx, sy, n);
  const [x, y] = P(o.x + 0.5, o.y + 0.5, groundZ(o.x, o.y)); for (let k = 0; k < 6; k++) U.fx.push({ type: "spark", x: x + (Math.random() - 0.5) * 26, y: y - 8 - Math.random() * 10, vx: (Math.random() - 0.5) * 30, vy: -20 - Math.random() * 20, life: 0.8, max: 0.8 });
  sfx("harvest"); fire("harvest:" + id, n); updateHUD();
  return true;
}
function gather(o) {
  const [x, y] = P(o.x + 0.5, o.y + 0.5, groundZ(o.x, o.y));
  const [sx, sy] = worldToScreen(x, y - 20);
  const gain = {};
  if (o.k === "tree") {
    if (o.cd && now() < o.cd) { toast(`This tree is resting · ${fmtT(o.cd - now())}`); o.shake = 0.3; return; }
    if (o.t.startsWith("jungle")) gain.fibre = 1 + (Math.random() < 0.5 ? 1 : 0); else gain.wood = 1 + (Math.random() < 0.5 ? 1 : 0);
    if (o.t === "palm" && Math.random() < 0.35) gain.coconut = 1;
    o.cd = now() + 45000; o.shake = 1; sfx("wood");
    for (let k = 0; k < 6; k++) U.fx.push({ type: "leaf", x: x + (Math.random() - 0.5) * 40, y: y - 60 - Math.random() * 30, vx: (Math.random() - 0.5) * 30, vy: 10 + Math.random() * 20, life: 1.4, max: 1.4, c: o.t === "cherry" ? "#f6b6cc" : o.t === "magic" ? "#7fd0b8" : "#6cbb5e" });
  } else {
    if (o.k === "wild") { gain.fibre = 1 + (Math.random() < 0.6 ? 1 : 0); if (Math.random() < 0.3) gain.wood = 1; fire("clear"); }
    if (o.k === "rock") { gain.stone = 2; fire("clear"); }
    if (o.k === "shell") gain.shell = 1;
    if (o.k === "moss") gain.moss = 1 + (Math.random() < 0.3 ? 1 : 0);
    if (o.k === "crystal") gain.crystal = 1;
    for (const id in gain) if (["shell", "moss", "crystal"].includes(id)) fire("gather:" + id, gain[id]);
    S.objs = S.objs.filter((x2) => x2 !== o); rebuildOcc();
    for (let k = 0; k < 10; k++) U.fx.push({ type: o.k === "rock" ? "dust" : "leaf", x: x + (Math.random() - 0.5) * 26, y: y - 10, vx: (Math.random() - 0.5) * 60, vy: -30 - Math.random() * 30, life: 0.9, max: 0.9, c: o.k === "wild" ? "#5fa25c" : "#b6b0c2" });
    sfx(o.k === "rock" ? "stone" : "pop");
  }
  for (const id in gain) { give(id, gain[id]); flyFromScreen(id, sx, sy, gain[id]); }
  updateHUD(); save();
}
function respawnTick() {
  const cap = { garden: 7, meadow: 7, forest: 6, beach: 5, village: 3, mountain: 6, springs: 3, point: 4 };
  const kinds = { garden: ["wild", "rock"], meadow: ["wild", "wild", "rock"], forest: ["moss", "moss", "wild"], beach: ["shell", "shell", "rock"], village: ["wild"], mountain: ["crystal", "rock"], springs: ["rock"], point: ["wild", "rock"] };
  for (const R of REGIONS) {
    if (!S.regions[R.id]) continue;
    const ri = RIDX[R.id];
    const n = S.objs.filter((o) => ["wild", "rock", "shell", "moss", "crystal"].includes(o.k) && RG[o.y * N + o.x] === ri).length;
    if (n >= cap[R.id] || now() - (U.spawnT[R.id] || 0) < 40000) continue;
    U.spawnT[R.id] = now();
    for (let tries = 0; tries < 20; tries++) {
      const x = Math.floor(R.cx - R.r + Math.random() * R.r * 2), y = Math.floor(R.cy - R.r + Math.random() * R.r * 2);
      if (x < 0 || y < 0 || x >= N || y >= N) continue;
      const i = y * N + x;
      if (RG[i] !== ri || !["g", "s", "r"].includes(T[i]) || occ[i] || CL.some((c) => Math.floor(c.x) === x && Math.floor(c.y) === y)) continue;
      const hidden = [[1, 1], [0, 1], [1, 0], [1, 2], [2, 1], [2, 2], [0, 2], [2, 0], [1, 3], [3, 1], [2, 3], [3, 2]].some(([dx, dy]) => { const o = objById.get(occ[(y + dy) * N + x + dx]); return o && o.k === "b" && (BH[o.t] || 1) > 1; });
      if (hidden) continue;
      const k = kinds[R.id][Math.floor(Math.random() * kinds[R.id].length)];
      if (k === "shell" && T[i] !== "s") continue;
      S.objs.push({ id: S.nid++, k, x, y, w: 1, d: 1, seed: Math.floor(Math.random() * 1000), born: performance.now() });
      rebuildOcc(); break;
    }
  }
}

/* =================== regions & placement =================== */
function unlockRegion(id) {
  const R = REGIONS[RIDX[id]];
  if (S.regions[id] || S.level < R.lvl) return;
  if (!pay(R.cost)) return toast("You need a little more to open this region.");
  S.regions[id] = true; U.unlocking[id] = performance.now();
  S.objs = S.objs.filter((o) => !(o.k === "sign" && o.region === id)); rebuildOcc();
  sfx("unlock"); confetti(); toast(`${R.name} is now part of your sanctuary`, "serenity");
  closeSheet(); updateHUD(); checkLevel(); save();
  panTo(...P(R.cx, R.cy, 0.5), 1200);
}
// Buildings keep a clear one-tile ring of space from every other building.
const isBuilding = (o) => o && o.k === "b" && o.t !== "plot";
function buildingGapOk(x, y, w, d, ignore) {
  for (let ty = y - 1; ty <= y + d; ty++) for (let tx = x - 1; tx <= x + w; tx++) {
    if (tx < 0 || ty < 0 || tx >= N || ty >= N) continue;
    const o = objById.get(occ[ty * N + tx]);
    if (isBuilding(o) && o !== ignore) return false;
  }
  return true;
}
function canPlace(x, y, w, d, ignore, kind, t) {
  if (kind === "b" && t !== "plot" && !buildingGapOk(x, y, w, d, ignore)) return false;
  for (let dx = 0; dx < w; dx++) for (let dy = 0; dy < d; dy++) {
    const tx = x + dx, ty = y + dy; if (tx < 0 || ty < 0 || tx >= N || ty >= N) return false;
    const i = ty * N + tx;
    if (!LAND.has(T[i]) || !unlockedAt(tx, ty)) return false;
    if (occ[i] && occ[i] !== (ignore && ignore.id)) return false;
  }
  return true;
}
function startPlace(kind, t, at) {
  closeSheet(); closePopup(); U.brush = null; U.pathBrush = false; renderBrush();
  const w = kind === "b" ? BUILDINGS[t].w : 1, d = kind === "b" ? BUILDINGS[t].d : 1;
  let [x, y] = at || screenToTile(VW / 2, VH / 2);
  if (!at) { const sp = findSpot(x, y, w, d, kind, t); if (sp) [x, y] = sp; }
  U.place = { kind, t, x, y, w, d, moving: null };
  renderPlacebar();
}
function startMove(o) {
  closeSheet(); closePopup();
  U.place = { kind: o.k, t: o.t, x: o.x, y: o.y, w: o.w, d: o.d, moving: o };
  renderPlacebar();
}
function findSpot(cx, cy, w, d, kind, t) {
  for (let r = 0; r < 14; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; if (canPlace(cx + dx, cy + dy, w, d, null, kind, t)) return [cx + dx, cy + dy]; }
  return null;
}
function confirmPlace() {
  const p = U.place; if (!p) return;
  if (!canPlace(p.x, p.y, p.w, p.d, p.moving, p.kind, p.t)) return toast(p.kind === "b" && p.t !== "plot" && !buildingGapOk(p.x, p.y, p.w, p.d, p.moving) ? "Leave a tile of space between buildings." : "That spot isn't free. Choose an open patch of land.");
  if (p.moving) { p.moving.x = p.x; p.moving.y = p.y; sfx("build"); }
  else {
    const cost = p.kind === "b" ? BUILDINGS[p.t].cost : DECOR[p.t].cost;
    if (!pay(cost)) return toast("You need a little more for this.");
    const o = { id: S.nid++, k: p.kind, t: p.t, x: p.x, y: p.y, w: p.w, d: p.d, born: performance.now() };
    if (p.t === "plot") o.crop = null;
    S.objs.push(o);
    sfx("build");
    const [x, y] = P(p.x + p.w / 2, p.y + p.d / 2, groundZ(p.x, p.y));
    for (let k = 0; k < 14; k++) U.fx.push({ type: "spark", x: x + (Math.random() - 0.5) * 50 * p.w, y: y - Math.random() * 30, vx: (Math.random() - 0.5) * 50, vy: -30 - Math.random() * 40, life: 1, max: 1 });
    if (p.kind === "d") fire("decor");
    if (p.kind === "b" && p.t !== "plot") toast(`${BUILDINGS[p.t].name} built`, "serenity");
    rebuildOcc(); checkLevel();
    // keep placing plots in a row for convenience
    if (p.t === "plot" && countB("plot") < MAXB.plot && has(BUILDINGS.plot.cost)) { const sp = findSpot(p.x + 1, p.y, 1, 1); if (sp) { p.x = sp[0]; p.y = sp[1]; updateHUD(); save(); renderPlacebar(); return; } }
  }
  rebuildOcc(); U.place = null; renderPlacebar(); updateHUD(); save();
}
function cancelPlace() { U.place = null; renderPlacebar(); }
function storeDecor(o) {
  const c = DECOR[o.t].cost; for (const k in c) give(k, Math.floor(c[k] * 0.5));
  S.objs = S.objs.filter((x) => x !== o); rebuildOcc(); closePopup(); sfx("pop"); toast(`${DECOR[o.t].name} stored · half its cost refunded`); updateHUD(); save();
}
function paintPath(x, y) {
  const i = y * N + x; if (!unlockedAt(x, y) || occ[i]) return;
  if (T[i] === "g" || T[i] === "s") {
    if (S.coins < PATH_COST) { toast("Not enough coins for more path stones."); U.pathBrush = false; renderBrush(); return; }
    S.coins -= PATH_COST; S.tmod[i] = "p"; S.tmod_orig = S.tmod_orig || {}; S.tmod_orig[i] = T[i]; T[i] = "p"; sfx("stone");
  } else if (T[i] === "p" && S.tmod[i]) {
    T[i] = (S.tmod_orig && S.tmod_orig[i]) || "g"; delete S.tmod[i]; give("coins", 1); sfx("pop");
  } else return;
  computeWater(); buildTerrain(); updateHUD();
}

/* =================== Calmlings (runtime) =================== */
const CL = [];
const walkable = (x, y) => x >= 0 && y >= 0 && x < N && y < N && LAND.has(T[y * N + x]) && !occ[y * N + x] && unlockedAt(x, y);
function groundZ(x, y) { const tx = clamp(Math.floor(x), 0, N - 1), ty = clamp(Math.floor(y), 0, N - 1); return HT[ty * N + tx]; }
function spawnCalmling(ch, fanfare) {
  if (CL.some((c) => c.ch.id === ch.id)) return;
  let sx = 17, sy = 18;
  if (ch.visitor) { const lh = S.objs.find((o) => o.t === "lighthouse"); sx = lh.x; sy = lh.y + 2; }
  const sp = findWalk(sx, sy) || [17, 18];
  const c = { ch, x: sp[0] + 0.5, y: sp[1] + 0.5, path: [], wait: 1 + Math.random() * 3, hop: 0, phase: Math.random() * 6, blinkT: 2 + Math.random() * 3, blink: 0, wave: 0, happy: 0, step: 0, from: null };
  CL.push(c);
  if (fanfare) { c.happy = 4; c.wave = 3; const [x, y] = P(c.x, c.y, groundZ(c.x, c.y)); for (let k = 0; k < 16; k++) U.fx.push({ type: "spark", x: x + (Math.random() - 0.5) * 40, y: y - Math.random() * 40, vx: (Math.random() - 0.5) * 40, vy: -20 - Math.random() * 40, life: 1.4, max: 1.4 }); }
}
function findWalk(x, y) { for (let r = 0; r < 8; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (walkable(x + dx, y + dy)) return [x + dx, y + dy]; return null; }
function planWalk(c) {
  const sx = Math.floor(c.x), sy = Math.floor(c.y), prev = new Map(), q = [[sx, sy, 0]], seen = new Set([sy * N + sx]), cands = [];
  while (q.length) {
    const [x, y, d] = q.shift(); if (d > 0) cands.push([x, y, d]); if (d >= 7) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = ny * N + nx; if (seen.has(k) || !walkable(nx, ny)) continue; seen.add(k); prev.set(k, [x, y]); q.push([nx, ny, d + 1]); }
  }
  if (!cands.length) return;
  const far = cands.filter((p) => p[2] >= 2); const pick = (far.length ? far : cands)[Math.floor(Math.random() * (far.length || cands.length))];
  const path = []; let cur = [pick[0], pick[1]];
  while (cur && !(cur[0] === sx && cur[1] === sy)) { path.unshift(cur); cur = prev.get(cur[1] * N + cur[0]); }
  c.path = path.slice(0, 10);
}
function updateCalmlings(dt) {
  for (const c of CL) {
    c.blinkT -= dt; if (c.blinkT < 0) { c.blink = 0.14; c.blinkT = 2 + Math.random() * 4; } c.blink = Math.max(0, c.blink - dt);
    c.wave = Math.max(0, c.wave - dt); c.happy = Math.max(0, c.happy - dt);
    if (c.path.length) {
      const [tx, ty] = c.path[0];
      if (!c.from) { c.from = [c.x, c.y]; c.step = 0; }
      c.step += dt * 1.6;
      const k = Math.min(1, c.step);
      c.x = c.from[0] + (tx + 0.5 - c.from[0]) * k; c.y = c.from[1] + (ty + 0.5 - c.from[1]) * k;
      c.hop = Math.abs(Math.sin(k * Math.PI)) * 5;
      if (k >= 1) { c.path.shift(); c.from = null; c.hop = 0; if (c.path.length && !walkable(...c.path[0])) c.path = []; }
    } else {
      c.wait -= dt;
      if (c.wait <= 0) { planWalk(c); c.wait = 2 + Math.random() * 5; }
    }
  }
}

/* =================== camera =================== */
const cam = { x: 0, y: 0, z: 1, vx: 0, vy: 0 };
const worldToScreen = (wx, wy) => [(wx - cam.x) * cam.z + VW / 2, (wy - cam.y) * cam.z + VH / 2];
const screenToWorld = (sx, sy) => [(sx - VW / 2) / cam.z + cam.x, (sy - VH / 2) / cam.z + cam.y];
function screenToTile(sx, sy) {
  const [wx, wy] = screenToWorld(sx, sy);
  let best = null, bd = -1;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x, h = T[i] === "w" ? 0 : HT[i];
    const u = (wx / HW + (wy + h * ZS) / HH) / 2, v = ((wy + h * ZS) / HH - wx / HW) / 2;
    if (u >= x && u < x + 1 && v >= y && v < y + 1 && x + y > bd) { bd = x + y; best = [x, y]; }
  }
  if (best) return best;
  const u = (wx / HW + wy / HH) / 2, v = (wy / HH - wx / HW) / 2;
  return [Math.floor(u), Math.floor(v)];
}
function clampCam() {
  let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
  for (const R of REGIONS) { if (!S.regions[R.id] && !REGIONS.some((q) => S.regions[q.id] && Math.hypot(q.cx - R.cx, q.cy - R.cy) < 11)) continue; const [x, y] = P(R.cx, R.cy, 0); minx = Math.min(minx, x - R.r * HW * 1.4); maxx = Math.max(maxx, x + R.r * HW * 1.4); miny = Math.min(miny, y - R.r * HH * 1.4 - 80); maxy = Math.max(maxy, y + R.r * HH * 1.4); }
  cam.x = clamp(cam.x, minx, maxx); cam.y = clamp(cam.y, miny, maxy);
}
function panTo(wx, wy, ms = 900, z) { U.camAnim = { fx: cam.x, fy: cam.y, fz: cam.z, tx: wx, ty: wy, tz: z || cam.z, t0: performance.now(), dur: ms }; }

/* =================== sprites =================== */
const SP = {};
const PAL = { round: ["#77c06a", "#6bb563", "#86c972"], meadow: ["#a6cf62", "#97c65b", "#b8d970"], magic: Object.assign(["#4fa58f", "#5ab09a", "#8f7ccf", "#62b8a4"], { accent: "#e6fff7" }), cherry: Object.assign(["#f6b6cc", "#f9c7d8", "#efa1bd"], { accent: "#fff0f5" }) };
function sprite(key, w, d, hu, fn) { return SP[key] || (SP[key] = makeSprite(w, d, hu, fn)); }
/* Painted skin: images listed in skin.js replace the code-drawn art key by key. */
const SKINNED = {};
function loadSkin(done) {
  const list = typeof SKIN === "undefined" ? {} : SKIN, keys = Object.keys(list); let left = keys.length;
  if (!left) return done();
  const finish = () => { if (--left === 0) done(); };
  for (const k of keys) {
    const e = list[k], img = new Image();
    img.onload = () => { const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight; c.getContext("2d").drawImage(img, 0, 0); SKINNED[k] = { cv: c, e, fit: {} }; finish(); };
    img.onerror = () => { console.warn(`Skin image not found: ${e.src}`); finish(); };
    img.src = e.src;
  }
}
function skinSprite(key, w = 1, d = 1) {
  const s = SKINNED[key]; if (!s) return null;
  const f = w + "x" + d; if (s.fit[f]) return s.fit[f];
  // Fit the image to its own footprint: never wider than the ground it stands on, base resting on the front edge.
  const W = (w + d) * HW * (s.e.scale ?? (key.startsWith("b:") ? 0.8 : 0.86)), H = s.cv.height * (W / s.cv.width), lift = s.e.lift ?? 0.12;
  return (s.fit[f] = { cv: s.cv, w: W, h: H, ox: W / 2 - ((w - d) / 2) * HW, oy: H - (w + d) * HH * (1 - lift) });
}
const skinKey = (o) => (o.k === "b" ? (o.t === "lighthouse" ? `b:lighthouse:${S.lighthouse}` : `b:${o.t}`) : o.k === "d" ? `d:${o.t}` : o.k === "tree" ? `tree:${o.t}` : o.k === "sign" ? "sign" : `node:${o.k}`);
function objSprite(o) {
  const sk = skinSprite(skinKey(o), o.w || 1, o.d || 1); if (sk) return sk;
  switch (o.k) {
    case "tree": { const v = o.seed % 4; if (o.t.startsWith("jungle")) return sprite("tjungle", 1, 1, 2, drawBush); return sprite("t" + o.t + v, 1, 1, 5, () => (o.t === "palm" ? drawPalm(v * 31 + 7) : o.t === "pine" ? drawPine(v * 13 + 3) : drawRoundTree(v * 17 + 5, PAL[o.t]))); }
    case "wild": return sprite("wild", 1, 1, 1.5, drawBush);
    case "rock": return sprite("rock" + (o.seed % 2), 1, 1, 1.5, () => drawRock(o.seed % 2 ? "#b6b0c2" : "#c3bba9"));
    case "shell": return sprite("shell", 1, 1, 1, drawShell);
    case "moss": return sprite("moss", 1, 1, 1, drawMossNode);
    case "crystal": return sprite("crystal", 1, 1, 1.5, drawCrystalNode);
    case "sign": return sprite("sign", 1, 1, 1.5, BUILD_DRAW.sign);
    case "b": if (o.t === "lighthouse") return sprite("lh" + S.lighthouse, 2, 2, 6, () => drawLighthouse(S.lighthouse)); return sprite("b" + o.t, o.w, o.d, 3, BUILD_DRAW[o.t]);
    case "d": if (o.t === "cherry") return sprite("dcherry", 1, 1, 5, () => drawRoundTree(11, PAL.cherry)); return sprite("d" + o.t, 1, 1, 2.6, DECOR_DRAW[o.t]);
  }
  return null;
}
const plotSprite = () => skinSprite("b:plot") || sprite("plot", 1, 1, 0.5, () => { box(0.06, 0.06, 0, 0.88, 0.88, 0.07, "#9b6b4e", { top: "#8a5c43" }); const sp = texPat("tex:soil", 80); if (sp) { G.save(); G.beginPath(); for (const [u, v] of [[0.06, 0.06], [0.94, 0.06], [0.94, 0.94], [0.06, 0.94]]) G.lineTo(...P(u, v, 0.07)); G.closePath(); G.clip(); const [ox, oy] = P(0, 0, 0.07); G.transform(HW, HH, -HW, HH, ox, oy); G.fillStyle = sp; G.fillRect(0, 0, 1, 1); G.restore(); return; } for (let k = 1; k < 4; k++) line(P(0.12, 0.06 + k * 0.22, 0.07), P(0.92, 0.06 + k * 0.22, 0.07), "rgba(60,35,25,.35)", 1.4); for (let k = 1; k < 4; k++) line(P(0.12, 0.08 + k * 0.22, 0.07), P(0.92, 0.08 + k * 0.22, 0.07), "rgba(255,220,180,.12)", 1); });
const cropSprite = (id, st) => skinSprite(`crop:${id}:${st}`) || skinSprite(`crop:any:${st}`) || sprite("c" + id + st, 1, 1, 2.2, () => drawCrop(id, st));
let CLOUDS = [];
function cloudSprites() {
  if (typeof SKINNED !== "undefined" && SKINNED["cloud:0"]) { CLOUDS = [0, 1, 2].map((v) => (SKINNED["cloud:" + v] || SKINNED["cloud:0"]).cv); return; }
  CLOUDS = [0, 1, 2].map((v) => { const cvs = document.createElement("canvas"); cvs.width = 220 * SPR; cvs.height = 120 * SPR; const c = cvs.getContext("2d"); c.scale(SPR, SPR); const sv = [G, OX, OY]; G = c; c.translate(110, 64); drawCloud(v * 9 + 1); [G, OX, OY] = sv; return cvs; });
}
const thumbs = {};
function thumbOf(key, s) {
  if (thumbs[key]) return thumbs[key];
  const W = s.cv.width, H = s.cv.height, d = s.cv.getContext("2d").getImageData(0, 0, W, H).data;
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) if (d[(y * W + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 <= x0) { x0 = 0; y0 = 0; x1 = W; y1 = H; }
  const bw = x1 - x0 + 2, bh = y1 - y0 + 2, k = Math.min(200 / bw, 200 / bh, 2.2);
  const c = document.createElement("canvas"); c.width = c.height = 240; const g = c.getContext("2d");
  g.drawImage(s.cv, x0, y0, bw, bh, (240 - bw * k) / 2, (240 - bh * k) / 2 + 6, bw * k, bh * k);
  return (thumbs[key] = c.toDataURL());
}
function buildThumb(t) { if (t === "plot") return thumbOf("plot", sprite("plotthumb", 1, 1, 1.4, () => { box(0.06, 0.06, 0, 0.88, 0.88, 0.07, "#9b6b4e", { top: "#8a5c43" }); drawCrop("strawberry", 3); })); return thumbOf("b" + t, objSprite({ k: "b", t, w: BUILDINGS[t].w, d: BUILDINGS[t].d })); }
function decorThumb(t) { return thumbOf("d" + t, objSprite({ k: "d", t })); }
const portraits = {};
function portrait(ch, size = 120) {
  const key = ch.id + size; if (portraits[key]) return portraits[key];
  const c = document.createElement("canvas"); c.width = c.height = size * 2; const g = c.getContext("2d"); g.scale(2, 2);
  const gr = g.createRadialGradient(size / 2, size * 0.45, 4, size / 2, size / 2, size * 0.55); gr.addColorStop(0, shade(ch.body, 0.55)); gr.addColorStop(1, shade(ch.body, 0.2));
  g.fillStyle = gr; g.beginPath(); g.arc(size / 2, size / 2, size / 2, 0, 7); g.fill();
  const pc = SKINNED["calm:" + ch.id];
  if (pc) drawPaintedCalmling(g, pc.cv, size / 2, size * 0.95, 0, { h: size * 0.86, noShadow: true });
  else drawCalmling(g, size / 2, size * 0.84, ch, 0.6, { scale: size / 44, noShadow: true, happy: true });
  return (portraits[key] = c.toDataURL());
}

/* =================== rendering =================== */
let tPrev = performance.now(), T0 = performance.now();
const SPARK = Array.from({ length: 70 }, (_, i) => { const R = rnd(i * 13 + 5); return { x: (R() - 0.5) * N * HW * 2.4, y: R() * N * HH * 2.2 - 40, p: R() * 6, s: 0.6 + R() }; });
function frame(tn) {
  const dt = Math.min(0.05, (tn - tPrev) / 1000); tPrev = tn; const t = (tn - T0) / 1000;
  if (U.camAnim) { const a = U.camAnim, k = clamp((tn - a.t0) / a.dur, 0, 1), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; cam.x = a.fx + (a.tx - a.fx) * e; cam.y = a.fy + (a.ty - a.fy) * e; cam.z = a.fz + (a.tz - a.fz) * e; if (k >= 1) U.camAnim = null; }
  else if (!drag.active && (Math.abs(cam.vx) > 0.01 || Math.abs(cam.vy) > 0.01)) { cam.x -= cam.vx * dt * 60; cam.y -= cam.vy * dt * 60; cam.vx *= 0.9; cam.vy *= 0.9; clampCam(); }
  updateCalmlings(dt);
  render(t, dt);
  requestAnimationFrame(frame);
}
function render(t, dt) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const bg = ctx.createLinearGradient(0, 0, cv.width * 0.3, cv.height);
  bg.addColorStop(0, "#9be3dc"); bg.addColorStop(0.45, "#62c6cf"); bg.addColorStop(1, "#3d9fbd");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, cv.width, cv.height);
  const z = cam.z * DPR;
  ctx.setTransform(z, 0, 0, z, DPR * (VW / 2 - cam.x * cam.z), DPR * (VH / 2 - cam.y * cam.z));
  const wp = texPat("tex:water", 0);
  if (wp) {
    const sw = SKINNED["tex:water"].cv.width;
    wp.setTransform(new DOMMatrix().translate(t * 0.04, t * 0.025).scale(3.2 / sw));
    ctx.save(); ctx.transform(HW, HH, -HW, HH, 0, 0); ctx.fillStyle = wp; ctx.fillRect(-60, -60, N + 120, N + 120); ctx.restore();
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); const ov = ctx.createLinearGradient(0, 0, 0, cv.height); ov.addColorStop(0, "rgba(150,235,230,.18)"); ov.addColorStop(1, "rgba(30,110,150,.22)"); ctx.fillStyle = ov; ctx.fillRect(0, 0, cv.width, cv.height); ctx.restore();
  }
  G = ctx; OX = 0; OY = 0;
  const [vx0, vy0] = screenToWorld(0, 0), [vx1, vy1] = screenToWorld(VW, VH);
  const vis = (x, y, m = 120) => x > vx0 - m && x < vx1 + m && y > vy0 - m && y < vy1 + m * 1.6;
  // ocean glints
  for (const s of SPARK) { const a = Math.max(0, Math.sin(t * 1.3 + s.p)); if (a < 0.05 || !vis(s.x, s.y)) continue; ctx.globalAlpha = a * 0.7; ctx.fillStyle = "#ffffff"; ctx.fillRect(s.x - 5 * s.s, s.y, 10 * s.s, 1.4); ctx.fillRect(s.x - 1.5 * s.s, s.y - 1.2, 3 * s.s, 3.8); }
  ctx.globalAlpha = 1;
  // wave rings around the island
  for (let k = 0; k < 2; k++) {
    const f = (t * 0.18 + k * 0.5) % 1, o = 0.1 + f * 0.45;
    ctx.strokeStyle = `rgba(255,255,255,${Math.sin(f * Math.PI) * 0.07})`; ctx.lineWidth = 3; ctx.beginPath();
    for (const [x0, y0, x1, y1, nx, ny] of COAST) { const a = P(x0 + nx * o, y0 + ny * o, 0), b = P(x1 + nx * o, y1 + ny * o, 0); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
    ctx.stroke();
  }
  ctx.drawImage(TER.cv, TER.x, TER.y, TER.w, TER.h);
  // shore foam
  ctx.strokeStyle = `rgba(255,255,255,${0.32 + Math.sin(t * 2) * 0.1})`; ctx.lineWidth = 3.4; ctx.lineCap = "round"; ctx.beginPath();
  for (const [x0, y0, x1, y1, nx, ny] of COAST) { const o = 0.05 + Math.sin(t * 1.8 + x0 * 0.7 + y0) * 0.03; const a = P(x0 + nx * o, y0 + ny * o, 0), b = P(x1 + nx * o, y1 + ny * o, 0); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
  ctx.stroke();
  drawWaterFx(t);
  // plots (flat)
  const ps = plotSprite();
  for (const o of S.objs) if (o.t === "plot" && !(U.place && U.place.moving === o)) { const [x, y] = P(o.x, o.y, groundZ(o.x, o.y)); if (vis(x, y)) ctx.drawImage(ps.cv, x - ps.ox, y - ps.oy, ps.w, ps.h); }
  // sorted scene
  const list = [];
  for (const o of S.objs) {
    if (o.k === "sign" || (U.place && U.place.moving === o)) continue;
    if (o.t === "plot" && !o.crop) continue;
    const [x, y] = P(o.x, o.y, groundZ(o.x, o.y));
    if (!vis(x, y, 200)) continue;
    list.push({ dp: o.x + o.w / 2 + o.y + o.d / 2 + (o.t === "plot" ? -0.3 : 0), o });
  }
  for (const c of CL) list.push({ dp: c.x + c.y + 0.05, c });
  list.sort((a, b) => a.dp - b.dp);
  for (const e of list) e.o ? drawObj(e.o, t, dt) : drawCL(e.c, t);
  drawAmbient(t, dt);
  drawFog(t);
  for (const o of S.objs) if (o.k === "sign") drawSign(o, t);
  drawHint(t);
  drawGhost(t);
  drawFx(dt);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const sun = ctx.createRadialGradient(VW * 0.15, -VH * 0.1, 0, VW * 0.15, -VH * 0.1, Math.max(VW, VH) * 1.1);
  sun.addColorStop(0, "rgba(255,236,186,.22)"); sun.addColorStop(0.5, "rgba(255,230,180,.06)"); sun.addColorStop(1, "rgba(255,230,180,0)");
  ctx.fillStyle = sun; ctx.fillRect(0, 0, VW, VH);
  const vg = ctx.createRadialGradient(VW / 2, VH / 2, Math.min(VW, VH) * 0.45, VW / 2, VH / 2, Math.max(VW, VH) * 0.8);
  vg.addColorStop(0, "rgba(20,40,40,0)"); vg.addColorStop(1, "rgba(20,40,40,.16)"); ctx.fillStyle = vg; ctx.fillRect(0, 0, VW, VH);
  drawFliers(dt);
}
function drawObj(o, t, dt) {
  const z = groundZ(o.x, o.y), [x, y] = P(o.x, o.y, z);
  if (o.t === "plot") {
    const st = cropStage(o), s = cropSprite(o.crop.id, st);
    const sway = Math.sin(t * 2 + o.x + o.y) * 0.03;
    ctx.save(); const [bx, by] = P(o.x + 0.5, o.y + 0.5, z + 0.07); ctx.translate(bx, by); ctx.transform(1, 0, sway, 1, 0, 0); ctx.translate(-bx, -by);
    ctx.drawImage(s.cv, x - s.ox, y - s.oy - 0.07 * ZS, s.w, s.h); ctx.restore();
    if (st === 3 && Math.sin(t * 3 + o.id) > 0.85) { const [sx, sy] = P(o.x + 0.3 + ((o.id * 37) % 5) / 10, o.y + 0.5, z + 0.6); star(sx, sy, 3, "#fff6c9"); }
    return;
  }
  const s = objSprite(o); if (!s) return;
  let grow = 1;
  if (o.born) { const k = (performance.now() - o.born) / 450; if (k < 1) grow = 0.6 + 0.4 * (1 - Math.pow(1 - k, 3)) + Math.sin(k * Math.PI) * 0.12; else delete o.born; }
  if (o.k === "tree" || (o.k === "d" && o.t === "cherry")) {
    o.shake = Math.max(0, (o.shake || 0) - dt * 1.8);
    const sway = Math.sin(t * 1.2 + o.x * 0.7 + o.y * 0.3) * 0.035 + Math.sin(t * 25) * 0.06 * (o.shake || 0);
    const [bx, by] = P(o.x + 0.5, o.y + 0.5, z);
    ctx.save(); ctx.translate(bx, by); ctx.transform(1, 0, sway, 1, 0, 0); ctx.scale(grow, grow); ctx.translate(-bx, -by);
    if (o.cd && now() < o.cd) ctx.globalAlpha = 0.92;
    ctx.drawImage(s.cv, x - s.ox, y - s.oy, s.w, s.h); ctx.restore();
    return;
  }
  if (grow !== 1) { const [bx, by] = P(o.x + o.w / 2, o.y + o.d / 2, z); ctx.save(); ctx.translate(bx, by); ctx.scale(grow, grow); ctx.translate(-bx, -by); ctx.drawImage(s.cv, x - s.ox, y - s.oy, s.w, s.h); ctx.restore(); }
  else ctx.drawImage(s.cv, x - s.ox, y - s.oy, s.w, s.h);
  if (o.k === "b") drawBuildingLive(o, t, z);
  else if (o.k === "d") drawDecorLive(o, t, z);
  else if (["shell", "crystal", "moss"].includes(o.k) && Math.sin(t * 2.4 + o.id) > 0.7) { const [sx, sy] = P(o.x + 0.5, o.y + 0.4, z + 0.5); star(sx, sy, 3.2, "#ffffff"); }
}
function smoke(x, y, k = 1) { if (Math.random() < 0.05 * k) U.fx.push({ type: "smoke", x, y, vx: 6 + Math.random() * 4, vy: -14, life: 3, max: 3 }); }
function drawBuildingLive(o, t, z) {
  const P2 = (u, v, h) => P(o.x + u, o.y + v, z + h), painted = !!SKINNED[skinKey(o)];
  if (painted) { drawPaintedLive(o, t, z, P2); return; }
  if (o.t === "home") { const [cx, cy] = P2(1.37, 0.54, 2.15); smoke(cx, cy); }
  if (o.t === "bakery") { const [cx, cy] = P2(0.56, 0.56, 2.18); smoke(cx, cy, 1.6); }
  if (o.t === "bathhouse") { const [cx, cy] = P2(1.05, 1.42, 0.4); if (Math.random() < 0.12) U.fx.push({ type: "steam", x: cx + (Math.random() - 0.5) * 30, y: cy, vx: 0, vy: -12, life: 2.4, max: 2.4 }); }
  if (o.t === "beehive") for (let k = 0; k < 3; k++) { const a = t * (1.6 + k * 0.4) + k * 2; const [bx, by] = P2(0.5 + Math.cos(a) * 0.55, 0.5 + Math.sin(a) * 0.55, 0.6 + Math.sin(a * 2) * 0.2); circ(bx, by, 2.2, "#f6c445"); circ(bx + 1, by, 1, "#3d3040"); G.globalAlpha = 0.6; ell(bx - 1, by - 2, 1.8, 1, "#ffffff"); G.globalAlpha = 1; }
  if (o.t === "coop") for (let k = 0; k < 3; k++) { const u = 1.1 + Math.sin(t * 0.4 + k * 2.1) * 0.5, v = 0.9 + Math.cos(t * 0.33 + k * 1.7) * 0.6; const [hx, hy] = P2(u, v, 0); const peck = Math.max(0, Math.sin(t * 3 + k * 4)) * 2; ell(hx, hy, 6, 2.2, "rgba(40,50,40,.15)"); ball(hx, hy - 6, 5.5, "#fffaf1", 0.15); ball(hx + 4, hy - 10 + peck, 3.2, "#fffaf1", 0.15); circ(hx + 4, hy - 13 + peck, 1.4, "#e8604f"); circ(hx + 7, hy - 9.5 + peck, 1, "#f2a23a"); circ(hx + 5, hy - 10.5 + peck, 0.6, "#2f2a3a"); }
  if (o.t === "goatpen") { const u = 1.2 + Math.sin(t * 0.25) * 0.35, v = 1.25 + Math.cos(t * 0.2) * 0.3; const [gx, gy] = P2(u, v, 0); const nod = Math.sin(t * 2) * 1.2; ell(gx, gy, 11, 3.5, "rgba(40,50,40,.15)"); for (const dx of [-6, -2, 3, 7]) G.fillRect(gx + dx - 1, gy - 7, 2, 7); ball(gx, gy - 11, 9, "#f7f3ea", 0.15); ball(gx + 9, gy - 16 + nod, 5, "#f7f3ea", 0.15); line([gx + 7, gy - 20 + nod], [gx + 5, gy - 25 + nod], "#9b8a7a", 1.6); line([gx + 11, gy - 20 + nod], [gx + 12, gy - 25 + nod], "#9b8a7a", 1.6); circ(gx + 11, gy - 16 + nod, 0.9, "#2f2a3a"); }
  if (o.t === "teahouse") for (const [u, v] of [[0.1, 2.0], [2.0, 2.0]]) { const [lx, ly] = P2(u, v, 0.66); G.globalAlpha = 0.25 + Math.sin(t * 2 + u) * 0.08; circ(lx, ly, 10, "#ffcf8a"); G.globalAlpha = 1; }
  if (o.t === "lighthouse" && S.lighthouse >= 3) {
    const [lx, ly] = P2(1, 1, U.paintedLH ? 5.7 : 3.95);
    const g = G.createRadialGradient(lx, ly, 2, lx, ly, 60); g.addColorStop(0, "rgba(255,244,190,.9)"); g.addColorStop(1, "rgba(255,244,190,0)"); G.fillStyle = g; G.beginPath(); G.arc(lx, ly, 60, 0, 7); G.fill();
    const a = t * 0.8; G.save(); G.translate(lx, ly); G.scale(1, 0.5); G.rotate(a);
    const bg = G.createLinearGradient(0, 0, 420, 0); bg.addColorStop(0, "rgba(255,246,200,.55)"); bg.addColorStop(1, "rgba(255,246,200,0)");
    G.fillStyle = bg; G.beginPath(); G.moveTo(0, 0); G.lineTo(420, -40); G.lineTo(420, 40); G.closePath(); G.fill(); G.rotate(Math.PI); G.beginPath(); G.moveTo(0, 0); G.lineTo(420, -40); G.lineTo(420, 40); G.closePath(); G.fill(); G.restore();
  }
  if (o.t === "board") {
    const ready = S.orders.filter(Boolean);
    ready.slice(0, 4).forEach((ord, k) => { const u0 = 0.22 + (k % 2) * 0.32, z0 = 0.5 + Math.floor(k / 2) * 0.2; faceY(o.y + 0.522, o.x + u0, o.x + u0 + 0.24, z + z0, z + z0 + 0.15, canDeliver(ord) ? "#fff6d6" : "#fbf3e6", EDGE); });
    if (ready.some(canDeliver)) bubble(...P2(0.5, 0.5, 1.6), t, "!", null);
  }
  if (BUILDINGS[o.t] && BUILDINGS[o.t].recipes) {
    const q = o.q || [], tn = now(), done = q.filter((j) => j.e <= tn);
    if (done.length) bubble(...P2(o.w / 2, o.d / 2, (BH[o.t] || 1) + 0.35), t, done.length > 1 ? done.length : "", iconCanvas(BUILDINGS[o.t].recipes[done[0].r].out, 48));
    else if (q.length) { const j = q[0], k = clamp((tn - j.s) / (j.e - j.s), 0, 1); const [bx, by] = P2(o.w / 2, o.d / 2, (BH[o.t] || 1) + 0.3); G.beginPath(); G.arc(bx, by, 9, 0, 7); G.fillStyle = "rgba(255,250,241,.92)"; G.fill(); G.beginPath(); G.arc(bx, by, 7, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); G.strokeStyle = "#7fb39b"; G.lineWidth = 3; G.stroke(); }
  }
}
/* Overlays kept for painted art: animals, production bubbles and the lighthouse beam. */
function drawPaintedLive(o, t, z, P2) {
  const keep = ["beehive", "lighthouse"];
  if (keep.includes(o.t)) { const k = skinKey(o), sv = SKINNED[k]; delete SKINNED[k]; U.paintedLH = o.t === "lighthouse"; try { drawBuildingLive(o, t, z); } finally { SKINNED[k] = sv; U.paintedLH = false; } return; }
  if (o.t === "board" && S.orders.some(canDeliver)) bubble(...P2(0.5, 0.5, 1.6), t, "!", null);
  if (BUILDINGS[o.t] && BUILDINGS[o.t].recipes) {
    const q = o.q || [], tn = now(), done = q.filter((j) => j.e <= tn), h = (BH[o.t] || 1) + 0.35;
    if (done.length) bubble(...P2(o.w / 2, o.d / 2, h), t, done.length > 1 ? done.length : "", iconCanvas(BUILDINGS[o.t].recipes[done[0].r].out, 48));
    else if (q.length) { const j = q[0], k = clamp((tn - j.s) / (j.e - j.s), 0, 1); const [bx, by] = P2(o.w / 2, o.d / 2, h - 0.05); G.beginPath(); G.arc(bx, by, 9, 0, 7); G.fillStyle = "rgba(255,250,241,.92)"; G.fill(); G.beginPath(); G.arc(bx, by, 7, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); G.strokeStyle = "#7fb39b"; G.lineWidth = 3; G.stroke(); }
  }
}
function bubble(x, y, t, label, img) {
  const by = y + Math.sin(t * 3) * 2.5;
  G.save(); G.shadowColor = "rgba(60,40,70,.25)"; G.shadowBlur = 6; G.shadowOffsetY = 2;
  G.beginPath(); G.arc(x, by - 4, 14, 0, 7); G.fillStyle = "#fffaf1"; G.fill();
  G.beginPath(); G.moveTo(x - 5, by + 7); G.lineTo(x, by + 14); G.lineTo(x + 5, by + 7); G.fill(); G.restore();
  if (img) G.drawImage(img, x - 11, by - 15, 22, 22);
  if (label) { if (!img) { G.fillStyle = "#ef8a6f"; G.font = "800 17px Nunito, system-ui, sans-serif"; G.textAlign = "center"; G.fillText(String(label), x, by + 2); } else { circ(x + 11, by - 14, 6.5, "#ef8a6f"); G.fillStyle = "#fff"; G.font = "800 9px Nunito, system-ui, sans-serif"; G.textAlign = "center"; G.fillText(String(label), x + 11, by - 11); } }
}
function drawDecorLive(o, t, z) {
  if (SKINNED[skinKey(o)]) return;
  const P2 = (u, v, h) => P(o.x + u, o.y + v, z + h);
  if (o.t === "fairylights") { const a = P2(0.15, 0.5, 1.0), b = P2(0.85, 0.5, 1.0); for (let i = 0; i <= 8; i++) { const k = i / 8, x = a[0] + (b[0] - a[0]) * k, y = a[1] + (b[1] - a[1]) * k + Math.sin(k * Math.PI) * 12; const tw = 0.6 + Math.sin(t * 3 + i) * 0.4; G.globalAlpha = 0.35 * tw; circ(x, y + 2, 5, ["#ffe39e", "#ffc6d6", "#cfe9ff"][i % 3]); G.globalAlpha = 1; circ(x, y + 2, 1.8, ["#ffe39e", "#ffc6d6", "#cfe9ff"][i % 3]); } }
  if (o.t === "lantern" || o.t === "starlantern") { const [lx, ly] = P2(0.5, 0.5, o.t === "lantern" ? 0.65 : 1.05); G.globalAlpha = 0.22 + Math.sin(t * 2 + o.id) * 0.06; circ(lx, ly, 14, "#ffd98a"); G.globalAlpha = 1; if (o.t === "starlantern") { const yy = ly + Math.sin(t * 2) * 2; G.globalAlpha = 0.4; circ(lx, yy, 9, "#fff3b0"); G.globalAlpha = 1; star(lx, yy, 7, "#ffd86b", "#fff7d6"); } }
  if (o.t === "fountain") { const [fx, fy] = P2(0.5, 0.5, 0.88); for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + t; G.strokeStyle = "rgba(220,250,255,.8)"; G.lineWidth = 1.4; G.beginPath(); G.moveTo(fx, fy); G.quadraticCurveTo(fx + Math.cos(a) * 8, fy - 10, fx + Math.cos(a) * 12, fy + 6 + Math.sin(a) * 3); G.stroke(); } if (Math.random() < 0.2) U.fx.push({ type: "mist", x: fx + (Math.random() - 0.5) * 20, y: fy + 10, vx: 0, vy: -4, life: 0.8, max: 0.8 }); }
  if (o.t === "chimepost") { const [cx, cy] = P2(0.5, 0.5, 1.07); for (let i = 0; i < 4; i++) { const sw = Math.sin(t * 1.5 + i) * 3; line([cx - 9 + i * 6, cy], [cx - 9 + i * 6 + sw, cy + 14 + i * 2], "#cfe3ef", 2.4); } }
  if (o.t === "koi") { for (let i = 0; i < 2; i++) { const a = t * 0.6 + i * Math.PI; const [kx, ky] = P2(0.5 + Math.cos(a) * 0.26, 0.5 + Math.sin(a) * 0.26, 0.02); G.save(); G.translate(kx, ky); G.rotate(a + Math.PI / 2); ell(0, 0, 4.5, 2, i ? "#ffffff" : "#f28a3a"); circ(-1, 0, 1.2, "#f28a3a"); G.restore(); } }
  if (o.t === "mushrooms") { G.globalAlpha = 0.18 + Math.sin(t * 1.5) * 0.08; const [mx, my] = P2(0.5, 0.5, 0.2); ell(mx, my, 22, 10, "#9feede"); G.globalAlpha = 1; }
  if (o.t === "birdbath" && Math.sin(t * 0.7 + o.id) > 0.6) { const [bx, by] = P2(0.5, 0.5, 0.62); U.fx.length < 200 && Math.random() < 0.05 && U.fx.push({ type: "mist", x: bx, y: by, vx: (Math.random() - 0.5) * 10, vy: -8, life: 0.6, max: 0.6 }); }
}
function drawWaterFx(t) {
  for (const f of FALLS) {
    const pts = f.side === "x" ? [P(f.x + 1, f.y + 0.1, f.z1), P(f.x + 1, f.y + 0.9, f.z1), P(f.x + 1, f.y + 0.9, f.z0), P(f.x + 1, f.y + 0.1, f.z0)] : [P(f.x + 0.1, f.y + 1, f.z1), P(f.x + 0.9, f.y + 1, f.z1), P(f.x + 0.9, f.y + 1, f.z0), P(f.x + 0.1, f.y + 1, f.z0)];
    const g = ctx.createLinearGradient(0, pts[0][1], 0, pts[2][1]); g.addColorStop(0, "rgba(180,240,248,.95)"); g.addColorStop(1, "rgba(120,215,228,.9)");
    poly(pts, g);
    ctx.save(); ctx.beginPath(); ctx.moveTo(...pts[0]); for (const p of pts.slice(1)) ctx.lineTo(...p); ctx.closePath(); ctx.clip();
    ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.lineWidth = 1.6; ctx.setLineDash([7, 9]); ctx.lineDashOffset = -t * 60;
    for (let k = 0; k < 6; k++) { const u = (k + 0.5) / 6; const a = [pts[0][0] + (pts[1][0] - pts[0][0]) * u, pts[0][1] + (pts[1][1] - pts[0][1]) * u], b = [pts[3][0] + (pts[2][0] - pts[3][0]) * u, pts[3][1] + (pts[2][1] - pts[3][1]) * u]; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1] + 4); ctx.stroke(); }
    ctx.setLineDash([]); ctx.restore();
    const bx = (pts[2][0] + pts[3][0]) / 2, by = (pts[2][1] + pts[3][1]) / 2;
    for (let k = 0; k < 4; k++) { ctx.globalAlpha = 0.5 + Math.sin(t * 4 + k * 1.7) * 0.2; ell(bx - 12 + k * 8, by + 1 + Math.sin(t * 3 + k) * 1.5, 6, 3, "#ffffff"); }
    ctx.globalAlpha = 1;
    if (Math.random() < 0.15) U.fx.push({ type: "mist", x: bx + (Math.random() - 0.5) * 24, y: by, vx: (Math.random() - 0.5) * 8, vy: -10, life: 1.2, max: 1.2 });
  }
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x; if (T[i] !== "o" && T[i] !== "f" && T[i] !== "h") continue;
    const [px, py] = P(x + 0.5, y + 0.5, HT[i]);
    ctx.globalAlpha = 0.3 + Math.sin(t * 2 + x * 1.3 + y) * 0.2; ell(px + Math.sin(t + x) * 6, py + 2, 7, 1.6, "#ffffff"); ctx.globalAlpha = 1;
    if (T[i] === "h" && unlockedAt(x, y) && Math.random() < 0.018) U.fx.push({ type: "steam", x: px + (Math.random() - 0.5) * 30, y: py, vx: 2, vy: -12, life: 2.6, max: 2.6 });
    if (T[i] === "o" && Math.random() < 0.004) U.fx.push({ type: "ripple", x: px + (Math.random() - 0.5) * 24, y: py + (Math.random() - 0.5) * 8, life: 1.5, max: 1.5 });
  }
}
const BUTTERFLIES = Array.from({ length: 7 }, (_, i) => ({ p: i * 1.7, c: ["#ffd3de", "#fff1a1", "#cbb6f2", "#ffffff", "#ffc69a"][i % 5], r: 2 + (i % 3) }));
function drawAmbient(t, dt) {
  // butterflies around the garden and unlocked lands
  const open = REGIONS.filter((R) => S.regions[R.id]);
  BUTTERFLIES.forEach((b, i) => {
    const R = open[i % open.length], a = t * 0.25 + b.p;
    const [x, y] = P(R.cx + Math.cos(a * 1.3) * R.r * 0.6, R.cy + Math.sin(a) * R.r * 0.6, 1.4 + Math.sin(t * 2 + i) * 0.2);
    const flap = Math.abs(Math.sin(t * 14 + i)) * 0.9 + 0.1;
    ctx.globalAlpha = 0.95; ell(x - 2.6 * flap, y, 2.6 * flap, 2.2, b.c); ell(x + 2.6 * flap, y, 2.6 * flap, 2.2, b.c); ctx.globalAlpha = 1;
  });
  // fireflies in the forest
  if (S.regions.forest) { const R = REGIONS[RIDX.forest]; for (let i = 0; i < 14; i++) { const a = t * 0.3 + i * 2.3; const [x, y] = P(R.cx + Math.cos(a + i) * R.r * 0.7, R.cy + Math.sin(a * 0.8 + i * 1.3) * R.r * 0.7, 1 + Math.sin(t + i) * 0.4); const tw = Math.max(0, Math.sin(t * 2 + i * 1.7)); ctx.globalAlpha = tw * 0.4; circ(x, y, 6, "#c9fff0"); ctx.globalAlpha = tw; circ(x, y, 1.6, "#f4fff9"); } ctx.globalAlpha = 1; }
  // petals in the village
  if (S.regions.village && Math.random() < 0.12) { const R = REGIONS[RIDX.village]; const [x, y] = P(R.cx + (Math.random() - 0.5) * R.r * 2, R.cy + (Math.random() - 0.5) * R.r * 2, 2.5); U.fx.push({ type: "petal", x, y, vx: 8, vy: 10, life: 3, max: 3, c: Math.random() < 0.5 ? "#f9c7d8" : "#ffe3ec" }); }
  // drifting cloud shadows
  for (let i = 0; i < 3; i++) { const [x, y] = P(((t * 0.35 + i * 13) % (N + 16)) - 8, ((t * 0.12 + i * 9) % (N + 8)) - 4, 0); ctx.globalAlpha = 0.06; ell(x, y, 120, 46, "#2c4a55"); ctx.globalAlpha = 1; }
  // gulls
  for (let i = 0; i < 2; i++) { const k = ((t * 0.03 + i * 0.5) % 1); const x = -900 + k * 1800, y = -160 + i * 220 + Math.sin(t * 0.6 + i) * 20, f = Math.sin(t * 6 + i) * 4; ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x - 7, y - f); ctx.quadraticCurveTo(x - 3, y - 4, x, y); ctx.quadraticCurveTo(x + 3, y - 4, x + 7, y - f); ctx.stroke(); }
}
let FOG = [];
function buildFog() {
  FOG = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const i = y * N + x; if (RG[i] < 0 || RG[i] === 0) continue; if (T[i] === "w" || (x + y) % 2) continue; const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => RG[(y + dy) * N + x + dx] !== RG[i]); FOG.push({ x, y, r: REGIONS[RG[i]].id, v: (x * 3 + y) % 3, s: (edge ? 0.5 : 0.68) + ((x * 13 + y * 7) % 5) / 16, p: x * 0.7 + y }); }
}
/* Fog: a soft cached haze bank over locked regions, topped with a few large painted clouds. */
let FOGC = null, FOGKEY = "";
function fogCache() {
  const key = REGIONS.filter((R) => !S.regions[R.id]).map((R) => R.id).join(",");
  if (FOGC && FOGKEY === key) return FOGC;
  FOGKEY = key; const sc = Math.min(1.25, DPR), w = TER.w, h = TER.h + 200;
  const c = FOGC && FOGC.cv || document.createElement("canvas"); c.width = Math.ceil(w * sc); c.height = Math.ceil(h * sc);
  const g = c.getContext("2d"); g.setTransform(sc, 0, 0, sc, -TER.x * sc, (-TER.y + 200) * sc);
  const edgeOf = (f) => { for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const j = (f.y + dy) * N + f.x + dx, R = REGIONS[RG[j]]; if (R && S.regions[R.id] && T[j] !== "w") return true; } return false; };
  for (const f of FOG) {
    if (S.regions[f.r]) continue;
    f.edge = edgeOf(f); const rr = f.edge ? 55 : 95;
    const [x, y] = P(f.x + 0.5, f.y + 0.5, HT[f.y * N + f.x] + 0.6);
    const gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, "rgba(255,252,248,.95)"); gr.addColorStop(0.55, "rgba(250,246,252,.7)"); gr.addColorStop(1, "rgba(245,242,252,0)");
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill();
  }
  FOG.forEach((f, i) => {
    if (S.regions[f.r] || i % 3 || f.edge) return;
    const img = CLOUDS[f.v], [x, y] = P(f.x + 0.5, f.y + 0.5, HT[f.y * N + f.x] + 1.1), cw = 230 * f.s, ch = cw * (img.height / img.width);
    g.globalAlpha = 0.85; g.drawImage(img, x - cw / 2, y - ch * 0.6, cw, ch);
  });
  g.globalAlpha = 1;
  return (FOGC = { cv: c, x: TER.x, y: TER.y - 200, w, h });
}
function drawFog(t) {
  const pn = performance.now(), fc = fogCache();
  ctx.save(); ctx.globalAlpha = 0.96; ctx.drawImage(fc.cv, fc.x + Math.sin(t * 0.15) * 6, fc.y, fc.w, fc.h); ctx.restore();
  FOG.forEach((f, i) => {
    const u = U.unlocking[f.r]; if (!u || !S.regions[f.r]) return;
    const k = (pn - u) / 1800; if (k >= 1) return;
    const [x, y] = P(f.x + 0.5, f.y + 0.5, HT[f.y * N + f.x] + 0.6);
    const gr = ctx.createRadialGradient(x, y - k * 50, 0, x, y - k * 50, 95 * (1 + k * 0.6)); gr.addColorStop(0, `rgba(255,252,248,${0.9 * (1 - k)})`); gr.addColorStop(1, "rgba(255,252,248,0)");
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y - k * 50, 95 * (1 + k * 0.6), 0, 7); ctx.fill();
    if (i % 3 === 0) { const img = CLOUDS[f.v], cw = 230 * f.s * (1 + k * 0.6), ch = cw * (img.height / img.width); ctx.globalAlpha = 0.85 * (1 - k); ctx.drawImage(img, x - cw / 2, y - ch * 0.6 - k * 60, cw, ch); ctx.globalAlpha = 1; }
  });
}
function drawSign(o, t) {
  const z = groundZ(o.x, o.y), [x, y] = P(o.x, o.y, z), s = objSprite(o);
  ctx.drawImage(s.cv, x - s.ox, y - s.oy, s.w, s.h);
  const R = REGIONS[RIDX[o.region]], ready = S.level >= R.lvl, [bx, by] = P(o.x + 0.5, o.y + 0.5, z + 1.45);
  const yy = by + Math.sin(t * 2.5 + o.x) * 2;
  ctx.save(); ctx.shadowColor = "rgba(60,40,70,.25)"; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2;
  ctx.font = "800 11px Nunito, system-ui, sans-serif"; const label = ready ? "Open" : `Lv ${R.lvl}`; const w = ctx.measureText(label).width + 26;
  ctx.beginPath(); ctx.roundRect(bx - w / 2, yy - 11, w, 22, 11); ctx.fillStyle = ready ? "#ef8a6f" : "#fffaf1"; ctx.fill(); ctx.restore();
  ctx.fillStyle = ready ? "#fff" : "#6f6679"; ctx.textAlign = "center"; ctx.font = "800 11px Nunito, system-ui, sans-serif"; ctx.fillText(label, bx + 6, yy + 4);
  // padlock / sparkle
  if (ready) star(bx - w / 2 + 10, yy, 5, "#fff6c9"); else { ctx.strokeStyle = "#9a8fa6"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(bx - w / 2 + 10, yy - 2, 3, Math.PI, 0); ctx.stroke(); ctx.fillStyle = "#9a8fa6"; ctx.fillRect(bx - w / 2 + 6, yy - 2, 8, 6); }
}
/* Painted Calmlings: breathe, squash on landing, lean into a walk, bounce when happy. */
function drawPaintedCalmling(g, img, x, y, t, o) {
  const h = o.h || 46, w = h * (img.width / img.height), hop = o.hop || 0, ph = o.phase || 0;
  const breathe = Math.sin(t * 2.2 + ph) * 0.022, land = hop < 1.5 && o.walking ? 0.05 : 0, happy = o.happy ? Math.abs(Math.sin(t * 9)) * 5 : 0;
  if (!o.noShadow) { g.save(); g.globalAlpha = 0.22 - hop * 0.008; g.beginPath(); g.ellipse(x, y, w * 0.36, w * 0.13, 0, 0, 7); g.fillStyle = "#2b3a3a"; g.fill(); g.restore(); }
  g.save(); g.translate(x, y - hop - happy); g.rotate((o.lean || 0) * 0.06 + (o.wave ? Math.sin(t * 10) * 0.06 : 0));
  g.scale(1 + land - breathe * 0.6, 1 - land + breathe); g.drawImage(img, -w / 2, -h, w, h); g.restore();
}
function drawCL(c, t) {
  const z = groundZ(c.x, c.y), [x, y] = P(c.x, c.y, z);
  const pc = SKINNED["calm:" + c.ch.id];
  if (pc) {
    const lean = c.path.length ? clamp((c.path[0][0] + 0.5 - c.x - (c.path[0][1] + 0.5 - c.y)) * 2, -1, 1) : 0;
    drawPaintedCalmling(ctx, pc.cv, x, y + 2, t, { hop: c.hop * 2, phase: c.phase, wave: c.wave > 0, happy: c.happy > 0, lean, walking: c.path.length > 0 });
    if (c.happy > 0 && Math.random() < 0.03) U.fx.push({ type: "heart", x: x + (Math.random() - 0.5) * 14, y: y - 48, vy: -22, life: 1.4, max: 1.4 });
    return;
  }
  drawCalmling(ctx, x, y + 2, c.ch, t, { hop: c.hop * 2, blink: c.blink > 0, wave: c.wave > 0, happy: c.happy > 0, phase: c.phase, scale: 0.92, look: c.path.length ? clamp((c.path[0][0] + 0.5 - c.x - (c.path[0][1] + 0.5 - c.y)) * 3, -1.5, 1.5) : 0 });
  if (c.happy > 0 && Math.random() < 0.03) U.fx.push({ type: "heart", x: x + (Math.random() - 0.5) * 14, y: y - 34, vy: -22, life: 1.4, max: 1.4 });
}
function drawHint(t) {
  if (S.level > 2 || U.place || !S.intro) return;
  const qs = LV().quests; let target = null;
  for (let i = 0; i < qs.length; i++) {
    if (questDone(qs[i], i)) continue;
    const q = qs[i];
    if (q.ev === "clear") target = nearest((o) => o.k === "wild" || o.k === "rock");
    else if (q.ev && q.ev.startsWith("harvest")) { target = nearest((o) => o.t === "plot" && cropReady(o)) || nearest((o) => o.t === "plot" && !o.crop); }
    else if (q.ev === "deliver") target = S.orders.some(canDeliver) ? S.objs.find((o) => o.t === "board") : nearest((o) => o.t === "plot" && (cropReady(o) || !o.crop));
    else if (q.ev && q.ev.startsWith("make")) target = S.objs.find((o) => o.t === "teahouse");
    if (target) break;
  }
  if (!target) return;
  const h = target.k === "b" ? BH[target.t] || 1 : target.k === "tree" ? 2 : 0.9;
  const [x, y] = P(target.x + target.w / 2, target.y + target.d / 2, groundZ(target.x, target.y) + h + 0.5);
  const b = Math.abs(Math.sin(t * 3)) * 8;
  ctx.save(); ctx.shadowColor = "rgba(60,40,70,.3)"; ctx.shadowBlur = 6;
  ctx.beginPath(); ctx.moveTo(x - 9, y - 18 - b); ctx.lineTo(x + 9, y - 18 - b); ctx.lineTo(x + 9, y - 8 - b); ctx.lineTo(x + 15, y - 8 - b); ctx.lineTo(x, y + 4 - b); ctx.lineTo(x - 15, y - 8 - b); ctx.lineTo(x - 9, y - 8 - b); ctx.closePath();
  ctx.fillStyle = "#ef8a6f"; ctx.fill(); ctx.strokeStyle = "#fffaf1"; ctx.lineWidth = 2.5; ctx.stroke(); ctx.restore();
}
function nearest(fn) { let best = null, bd = 1e9; for (const o of S.objs) if (fn(o)) { const d = Math.hypot(o.x - 17, o.y - 17); if (d < bd) { bd = d; best = o; } } return best; }
function drawGhost(t) {
  const p = U.place; if (!p) return;
  const ok = canPlace(p.x, p.y, p.w, p.d, p.moving, p.kind, p.t);
  for (let dx = 0; dx < p.w; dx++) for (let dy = 0; dy < p.d; dy++) { const x = p.x + dx, y = p.y + dy; if (x < 0 || y < 0 || x >= N || y >= N) continue; const h = HT[y * N + x]; poly([P(x, y, h), P(x + 1, y, h), P(x + 1, y + 1, h), P(x, y + 1, h)], ok ? "rgba(140,230,170,.45)" : "rgba(240,120,120,.45)", ok ? "#e9fff0" : "#ffe1e1", 2); }
  const fake = p.moving || { k: p.kind, t: p.t, w: p.w, d: p.d, x: p.x, y: p.y };
  const s = p.t === "plot" ? plotSprite() : objSprite(fake); if (!s) return;
  const [x, y] = P(p.x, p.y, groundZ(p.x, p.y) + 0.05 + Math.sin(t * 4) * 0.04);
  ctx.globalAlpha = 0.8; ctx.drawImage(s.cv, x - s.ox, y - s.oy, s.w, s.h); ctx.globalAlpha = 1;
}
function drawFx(dt) {
  const keep = [];
  for (const f of U.fx) {
    f.life -= dt; if (f.life <= 0) continue; keep.push(f);
    const k = f.life / f.max;
    f.x += (f.vx || 0) * dt; f.y += (f.vy || 0) * dt;
    if (f.type === "spark") { f.vy += 60 * dt; ctx.globalAlpha = k; star(f.x, f.y, 3.5 * k + 1, "#fff3b0", "#ffffff"); }
    else if (f.type === "smoke") { ctx.globalAlpha = k * 0.45; circ(f.x, f.y, 5 + (1 - k) * 10, "#f5f1ec"); }
    else if (f.type === "steam" || f.type === "mist") { ctx.globalAlpha = Math.sin(k * Math.PI) * (f.type === "steam" ? 0.3 : 0.45); circ(f.x, f.y, 3 + (1 - k) * (f.type === "steam" ? 9 : 6), "#ffffff"); }
    else if (f.type === "heart") { ctx.globalAlpha = Math.min(1, k * 2); const sv = [G]; G = ctx; ICON_DRAW.hearts(f.x, f.y, 0.38 + (1 - k) * 0.12); [G] = sv; }
    else if (f.type === "leaf" || f.type === "petal") { f.vy += (f.type === "leaf" ? 40 : 4) * dt; f.vx *= 0.98; ctx.globalAlpha = Math.min(1, k * 2); ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.life * 5); ell(0, 0, 3.4, 1.6, f.c || "#6cbb5e"); ctx.restore(); }
    else if (f.type === "dust") { f.vy += 80 * dt; ctx.globalAlpha = k * 0.7; circ(f.x, f.y, 2.6, f.c || "#b28a62"); }
    else if (f.type === "ripple") { ctx.globalAlpha = k * 0.6; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(f.x, f.y, 3 + (1 - k) * 12, 1.5 + (1 - k) * 5, 0, 0, 7); ctx.stroke(); }
  }
  ctx.globalAlpha = 1; U.fx = keep.slice(-260);
}

/* =================== screen-space fliers & confetti =================== */
function targetFor(id) { const el = id === "coins" ? $("#pCoins") : id === "hearts" ? $("#pHearts") : $("#bPantry"); const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, el]; }
function flyFromScreen(id, sx, sy, n = 1) {
  const img = iconCanvas(id, 64);
  for (let k = 0; k < Math.min(n, 6); k++) U.fliers.push({ img, id, sx: sx + (Math.random() - 0.5) * 30, sy: sy + (Math.random() - 0.5) * 20, t: -k * 0.07, dur: 0.75 + Math.random() * 0.2, lift: 60 + Math.random() * 40 });
}
function drawFliers(dt) {
  const keep = [];
  for (const f of U.fliers) {
    f.t += dt; if (f.t < 0) { keep.push(f); continue; }
    const [tx, ty, el] = targetFor(f.id), k = Math.min(1, f.t / f.dur), e = k * k * (3 - 2 * k);
    const x = f.sx + (tx - f.sx) * e, y = f.sy + (ty - f.sy) * e - Math.sin(k * Math.PI) * f.lift, s = 34 * (1 - k * 0.35) * (k < 0.15 ? 0.6 + k * 2.6 : 1);
    ctx.drawImage(f.img, x - s / 2, y - s / 2, s, s);
    if (k >= 1) { el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); sfx("tick"); } else keep.push(f);
  }
  U.fliers = keep;
  const ck = [];
  for (const c of U.confetti) { c.t += dt; if (c.t > c.life) continue; ck.push(c); c.vy += 140 * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.vx *= 0.99; ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.t * c.spin); ctx.globalAlpha = Math.min(1, (c.life - c.t) * 2); ctx.fillStyle = c.c; ctx.beginPath(); ctx.ellipse(0, 0, 5, 2.6, 0, 0, 7); ctx.fill(); ctx.restore(); }
  U.confetti = ck;
}
function confetti() { const cols = ["#f6a5c0", "#ffe08a", "#c8b2f0", "#8fd3c4", "#ffb69a", "#ffffff"]; for (let i = 0; i < 90; i++) U.confetti.push({ x: VW / 2 + (Math.random() - 0.5) * 80, y: VH * 0.4, vx: (Math.random() - 0.5) * 700, vy: -250 - Math.random() * 420, c: cols[i % cols.length], t: 0, life: 2.2 + Math.random(), spin: (Math.random() - 0.5) * 12 }); }

/* =================== input =================== */
const drag = { active: false, pointers: new Map(), mode: null, sx: 0, sy: 0, lx: 0, ly: 0, pinch: 0, moved: 0 };
function pickAt(sx, sy) {
  const [wx, wy] = screenToWorld(sx, sy);
  let best = null, bd = -1e9;
  for (const c of CL) { const z = groundZ(c.x, c.y), [x, y] = P(c.x, c.y, z); if (Math.abs(wx - x) < 19 && wy < y + 4 && wy > y - 48) { const d = c.x + c.y + 0.6; if (d > bd) { bd = d; best = { c }; } } }
  const inPoly = (pts) => { let ins = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if (yi > wy !== yj > wy && wx < ((xj - xi) * (wy - yi)) / (yj - yi) + xi) ins = !ins; } return ins; };
  for (const o of S.objs) {
    if (o.t === "plot") continue;
    let x = o.x, y = o.y, w = o.w, d = o.d, h;
    const z = groundZ(o.x, o.y);
    if (o.k === "tree") {
      const [cx, cy] = P(o.x + 0.5, o.y + 0.5, z + (CANOPY[o.t] || 1.6)), r = o.t === "pine" ? 20 : 27;
      if (Math.hypot(wx - cx, (wy - cy) * 1.15) < r) { const dp = o.x + o.y + 1; if (dp > bd) { bd = dp; best = { o }; } }
      continue;
    }
    if (o.k === "b") { h = BH[o.t] || 1; if (o.w > 1) { x += 0.2; y += 0.2; w -= 0.4; d -= 0.4; } } else if (o.k === "d") h = DH[o.t] || 0.8; else h = 0.8;
    const hex = [P(x, y, z + h), P(x + w, y, z + h), P(x + w, y, z), P(x + w, y + d, z), P(x, y + d, z), P(x, y + d, z + h)];
    if (inPoly(hex)) { const dp = o.x + o.w / 2 + o.y + o.d / 2; if (dp > bd) { bd = dp; best = { o }; } }
  }
  const [tx, ty] = screenToTile(sx, sy);
  const under = tx >= 0 && ty >= 0 && tx < N && ty < N ? objById.get(occ[ty * N + tx]) : null;
  if (best && best.o && (best.o.k === "tree" || best.o.k === "sign") && under && (under.t === "plot" || ["wild", "rock", "shell", "moss", "crystal"].includes(under.k))) return { o: under };
  if (best) return best;
  const id = tx >= 0 && ty >= 0 && tx < N && ty < N ? occ[ty * N + tx] : 0;
  return { tile: [tx, ty], o: id ? objById.get(id) : null };
}
function plotAt(sx, sy) { const [tx, ty] = screenToTile(sx, sy); if (tx < 0 || ty < 0 || tx >= N || ty >= N) return null; const o = objById.get(occ[ty * N + tx]); return o && o.t === "plot" ? o : null; }
cv.addEventListener("pointerdown", (e) => {
  audioInit(); cv.setPointerCapture(e.pointerId);
  drag.pointers.set(e.pointerId, [e.clientX, e.clientY]);
  if (drag.pointers.size === 2) { const [a, b] = [...drag.pointers.values()]; drag.pinch = Math.hypot(a[0] - b[0], a[1] - b[1]); drag.mode = "pinch"; return; }
  drag.active = true; drag.sx = drag.lx = e.clientX; drag.sy = drag.ly = e.clientY; drag.moved = 0; drag.mode = "tap"; cam.vx = cam.vy = 0; U.camAnim = null;
  const pl = plotAt(e.clientX, e.clientY);
  if (U.place) { const [tx, ty] = screenToTile(e.clientX, e.clientY); const p = U.place; if (tx >= p.x && tx < p.x + p.w && ty >= p.y && ty < p.y + p.d) drag.mode = "ghost"; }
  else if (U.pathBrush) drag.mode = "path";
  else if (pl && cropReady(pl)) drag.mode = "harvest";
  else if (pl && !pl.crop && U.brush) drag.mode = "plant";
});
cv.addEventListener("pointermove", (e) => {
  if (!drag.pointers.has(e.pointerId)) return;
  drag.pointers.set(e.pointerId, [e.clientX, e.clientY]);
  if (drag.mode === "pinch" && drag.pointers.size === 2) { const [a, b] = [...drag.pointers.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); zoomAt((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, d / drag.pinch); drag.pinch = d; return; }
  if (!drag.active) return;
  const dx = e.clientX - drag.lx, dy = e.clientY - drag.ly; drag.lx = e.clientX; drag.ly = e.clientY; drag.moved += Math.abs(dx) + Math.abs(dy);
  if (drag.mode === "tap" && drag.moved > 8) { drag.mode = "pan"; closePopup(); }
  if (drag.mode === "pan") { cam.x -= dx / cam.z; cam.y -= dy / cam.z; cam.vx = dx / cam.z; cam.vy = dy / cam.z; clampCam(); }
  else if (drag.mode === "harvest") { const o = plotAt(e.clientX, e.clientY); if (o) harvest(o); }
  else if (drag.mode === "plant") { const o = plotAt(e.clientX, e.clientY); if (o && !o.crop) plant(o, U.brush); }
  else if (drag.mode === "ghost") { const [tx, ty] = screenToTile(e.clientX, e.clientY); U.place.x = tx - Math.floor(U.place.w / 2); U.place.y = ty - Math.floor(U.place.d / 2); renderPlacebar(); }
  else if (drag.mode === "path") { const [tx, ty] = screenToTile(e.clientX, e.clientY); if (tx !== drag.pt0 || ty !== drag.pt1) { drag.pt0 = tx; drag.pt1 = ty; if (T[ty * N + tx] !== "p" || drag.moved < 9) paintPath(tx, ty); } }
});
function endPointer(e) {
  if (!drag.pointers.has(e.pointerId)) return;
  drag.pointers.delete(e.pointerId);
  if (drag.mode === "pinch") { if (drag.pointers.size === 0) { drag.mode = null; drag.active = false; } return; }
  if (drag.mode === "tap" || ((drag.mode === "harvest" || drag.mode === "plant" || drag.mode === "ghost") && drag.moved <= 8)) onTap(e.clientX, e.clientY);
  else if (drag.mode === "path" && drag.moved <= 8) { const [tx, ty] = screenToTile(e.clientX, e.clientY); paintPath(tx, ty); }
  if (drag.mode !== "pan") { cam.vx = cam.vy = 0; }
  if (drag.mode === "harvest" || drag.mode === "plant" || drag.mode === "path") save();
  drag.active = false; drag.mode = null; drag.pt0 = drag.pt1 = null;
}
cv.addEventListener("pointerup", endPointer);
cv.addEventListener("pointercancel", endPointer);
cv.addEventListener("wheel", (e) => { e.preventDefault(); zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.0015)); }, { passive: false });
function zoomAt(sx, sy, f) { const [wx, wy] = screenToWorld(sx, sy); cam.z = clamp(cam.z * f, 0.5, 2.4); const [nx, ny] = screenToWorld(sx, sy); cam.x += wx - nx; cam.y += wy - ny; clampCam(); closePopup(); }
function onTap(sx, sy) {
  closePopup();
  if (U.place) { const [tx, ty] = screenToTile(sx, sy); U.place.x = tx - Math.floor(U.place.w / 2); U.place.y = ty - Math.floor(U.place.d / 2); sfx("tick"); renderPlacebar(); return; }
  const hit = pickAt(sx, sy);
  if (hit.c) return tapCalmling(hit.c);
  const o = hit.o;
  if (o && o.t === "plot") return tapPlot(o, sx, sy);
  if (U.brush) { U.brush = null; renderBrush(); }
  if (!o) {
    if (!hit.tile) return;
    const [tx, ty] = hit.tile, R = regionOf(tx, ty);
    if (R && !S.regions[R.id]) return openRegion(R.id);
    if (R && LAND.has(T[ty * N + tx]) && canPlace(tx, ty, 1, 1) && countB("plot") < MAXB.plot) popup(sx, sy, `<p class="pop-title">Open ground</p><button class="btn small primary" data-act="plothere" data-x="${tx}" data-y="${ty}"><img src="${iconURL("coins")}" alt="">15 · Add a garden plot</button>`);
    return;
  }
  if (o.k === "sign") return openRegion(o.region);
  if (o.k === "tree" || ["wild", "rock", "shell", "moss", "crystal"].includes(o.k)) { if (!unlockedAt(o.x, o.y)) return openRegion(regionOf(o.x, o.y).id); return gather(o); }
  if (o.k === "d") { if (o.fixed) return toast(o.t === "boat" ? "Hiraeth's little boat, still salty from the long voyage." : o.t === "cottage" ? "A Calmling cottage. Someone's kettle is on." : "An old village lantern, still glowing."); return popup(sx, sy, `<p class="pop-title">${DECOR[o.t].name}</p><p class="pop-sub">+${DECOR[o.t].s} serenity</p><div class="row"><button class="btn small" data-act="move" data-id="${o.id}">Move</button><button class="btn small" data-act="store" data-id="${o.id}">Store</button></div>`); }
  if (o.k === "b") {
    if (!unlockedAt(o.x, o.y)) return openRegion(regionOf(o.x, o.y).id);
    if (o.t === "board") return openOrders();
    if (o.t === "home") return openCalmlings();
    if (o.t === "lighthouse") return openLighthouse();
    if (collect(o)) return;
    return openBuilding(o);
  }
}
function tapPlot(o, sx, sy) {
  if (cropReady(o)) { harvest(o); save(); return; }
  if (o.crop) { const left = o.crop.t0 + o.crop.dur - now(); return popup(sx, sy, `<p class="pop-title">${ITEMS[o.crop.id].name}</p><p class="pop-sub">Ready in <b data-live="crop" data-id="${o.id}">${fmtT(left)}</b></p><div class="row"><button class="btn small" data-act="cropspeed" data-id="${o.id}"><img src="${iconURL("hearts")}" alt="">${Math.max(1, Math.ceil(left / 30000))} · Grow now</button><button class="btn small" data-act="move" data-id="${o.id}">Move</button></div>`); }
  if (U.brush) { plant(o, U.brush); save(); return; }
  const seeds = Object.keys(CROPS).filter((k) => CROPS[k].lvl <= S.level);
  popup(sx, sy, `<p class="pop-title">Plant something calming</p><div class="seeds">${seeds.map((k) => `<button class="seed" data-act="plant" data-id="${o.id}" data-crop="${k}"><img src="${iconURL(k)}" alt=""><b>${ITEMS[k].name}</b><span>${fmtT(CROPS[k].time * 1000 * (greenhouse() ? 0.8 : 1))} · ${CROPS[k].seed}c</span></button>`).join("")}</div><button class="btn small ghost" data-act="move" data-id="${o.id}">Move plot</button>`, true);
}
function tapCalmling(c) {
  c.wave = 1.4; c.happy = 1.5; c.path = []; sfx("calm");
  openCalmling(c.ch.id);
}

/* =================== interface =================== */
function updateHUD() {
  $("#vCoins").textContent = fmt(S.coins); $("#vHearts").textContent = fmt(S.hearts); $("#vSerenity").textContent = serenity();
  $("#lvlNum").textContent = S.level; $("#lvlName").textContent = S.finale ? "Sanctuary" : LV().name;
  const qs = LV().quests, d = qs.filter(questDone).length; $("#lvlBar").style.width = S.finale ? "100%" : `${(d / qs.length) * 100}%`;
  $("#bOrders").classList.toggle("alert", S.orders.some(canDeliver));
}
function renderQuests() {
  const el = $("#quests");
  if (S.finale) { U.questHTML = null; el.innerHTML = `<p class="q-eyebrow">Chapter One complete</p><p class="q-done">The lighthouse shines. Keep tending your sanctuary while Hiraeth tells of the Far Isles.</p>`; updateHUD(); return; }
  const L = LV();
  const html = `<p class="q-eyebrow">Level ${S.level} of 12</p><p class="q-title">${L.name}</p><ul>${(() => { const next = L.quests.findIndex((q, i) => !questDone(q, i)); const left = L.quests.filter((q, i) => !questDone(q, i)).length; return L.quests.map((q, i) => { const ok = questDone(q, i); return `<li class="${ok ? "ok" : ""}${i === next ? " next" : ""}"><i></i><span>${q.text}</span><b>${ok ? "" : questProgress(q, i)}</b></li>`; }).join("") + (left > 1 ? `<li class="more"><span>+${left - 1} more · tap to see all</span></li>` : ""); })()}</ul>${S.levelReady ? `<button class="btn primary small glow" data-act="claim">Claim reward</button>` : ""}`;
  if (html !== U.questHTML) { U.questHTML = html; el.innerHTML = html; }
  updateHUD();
}
function toast(msg, icon) {
  const el = document.createElement("div"); el.className = "toast";
  el.innerHTML = `${icon ? `<img src="${iconURL(icon)}" alt="">` : ""}<span>${msg}</span>`;
  $("#toasts").appendChild(el); setTimeout(() => el.classList.add("out"), 2600); setTimeout(() => el.remove(), 3100);
  while ($("#toasts").children.length > 3) $("#toasts").firstChild.remove();
}
function popup(sx, sy, html, wide) {
  const el = $("#popup"); el.innerHTML = html; el.hidden = false; el.classList.toggle("wide", !!wide);
  const r = el.getBoundingClientRect();
  el.style.left = `${clamp(sx - r.width / 2, 12, VW - r.width - 12)}px`; el.style.top = `${clamp(sy - r.height - 24, 70, VH - r.height - 90)}px`;
  U.popup = true;
}
function closePopup() { $("#popup").hidden = true; U.popup = null; }
function openSheet(title, fn, opts = {}) {
  closePopup(); U.panelFn = fn; U.panelTitle = title; U.panelLive = !!opts.live;
  $("#sheetTitle").textContent = title; $("#sheetBody").innerHTML = fn(); $("#sheet").hidden = false; $("#sheet").classList.toggle("tall", !!opts.tall);
  requestAnimationFrame(() => $("#sheet").classList.add("open"));
}
function refreshSheet() { if (!$("#sheet").hidden && U.panelFn) { const b = $("#sheetBody"), st = b.scrollTop; b.innerHTML = U.panelFn(); b.scrollTop = st; } }
function closeSheet() { $("#sheet").classList.remove("open"); $("#sheet").hidden = true; U.panelFn = null; }
function renderPlacebar() {
  const p = U.place, el = $("#placebar");
  if (!p) { el.hidden = true; return; }
  const name = p.kind === "b" ? BUILDINGS[p.t].name : DECOR[p.t].name, ok = canPlace(p.x, p.y, p.w, p.d, p.moving, p.kind, p.t);
  el.hidden = false;
  el.innerHTML = `<div><b>${p.moving ? "Moving" : "Placing"} ${name}</b><span>${ok ? "Tap or drag to choose a spot" : p.kind === "b" && p.t !== "plot" && !buildingGapOk(p.x, p.y, p.w, p.d, p.moving) ? "Too close. Leave a tile of space between buildings." : "That spot is taken. Try open land."}</span>${!p.moving ? `<span class="cost">${costHTML(p.kind === "b" ? BUILDINGS[p.t].cost : DECOR[p.t].cost)}</span>` : ""}</div><button class="btn round" data-act="cancelplace" aria-label="Cancel">✕</button><button class="btn round primary" data-act="confirmplace" ${ok ? "" : "disabled"} aria-label="Place here">✓</button>`;
}
function renderBrush() {
  const el = $("#brushbar");
  if (U.brush) { el.hidden = false; el.innerHTML = `<img src="${iconURL(U.brush)}" alt=""><div><b>Planting ${ITEMS[U.brush].name}</b><span>Tap or swipe across empty plots</span></div><button class="btn small primary" data-act="brushdone">Done</button>`; }
  else if (U.pathBrush) { el.hidden = false; el.innerHTML = `<img src="${iconURL("stone")}" alt=""><div><b>Laying stone paths</b><span>${PATH_COST} coins a tile · tap a path to lift it</span></div><button class="btn small primary" data-act="brushdone">Done</button>`; }
  else el.hidden = true;
}

/* ---------- panels ---------- */
function openOrders() {
  refillOrders();
  openSheet("Request Board", () => {
    const bonus = Math.min(50, serenity());
    return `<p class="lead">Gentle requests from your Calmlings. Your serenity adds <b>${bonus}%</b> to every reward.</p><div class="orders">${S.orders.map((o, i) => {
      if (!o) return `<div class="order empty"><p>A new request is on its way</p><span data-live="slot" data-i="${i}">${fmtT(S.orderNext[i] - now())}</span></div>`;
      const ch = CH[o.who], ok = canDeliver(o);
      return `<div class="order ${ok ? "ready" : ""}"><header><img src="${portrait(ch, 64)}" alt=""><div><b>${ch.name}</b><span>${ch.word.split("·")[1].trim()}</span></div><button class="x" data-act="skip" data-i="${i}" aria-label="Skip request">✕</button></header>
        <div class="needs">${Object.keys(o.items).map((k) => `<div class="need ${inv(k) >= o.items[k] ? "have" : ""}"><img src="${iconURL(k)}" alt=""><span>${Math.min(inv(k), o.items[k])}/${o.items[k]}</span><i>${ITEMS[k].name}</i></div>`).join("")}</div>
        <footer><span class="reward"><img src="${iconURL("coins")}" alt="">${Math.round(o.coins * (1 + bonus / 100))}<img src="${iconURL("hearts")}" alt="">${o.hearts}</span><button class="btn small ${ok ? "primary" : ""}" data-act="deliver" data-i="${i}" ${ok ? "" : "disabled"}>Deliver</button></footer></div>`;
    }).join("")}</div>`;
  }, { live: true });
}
function openBuilding(o) {
  const B = BUILDINGS[o.t];
  openSheet(B.name, () => {
    const tn = now(), q = o.q || [];
    const slots = Array.from({ length: queueCap(o) }, (_, k) => {
      const j = q[k]; if (!j) return `<div class="slot empty"></div>`;
      const r = B.recipes[j.r], done = j.e <= tn, p = clamp((tn - j.s) / (j.e - j.s), 0, 1);
      return `<div class="slot ${done ? "done" : ""}"><img src="${iconURL(r.out)}" alt=""><i style="--p:${tn < j.s ? 0 : p}"></i><span>${done ? "Ready" : tn < j.s ? "Waiting" : fmtT(j.e - tn)}</span></div>`;
    }).join("");
    const working = q.find((j) => j.e > tn && j.s <= tn);
    return `<p class="lead">${B.desc}</p><div class="queue">${slots}</div>
      <div class="row">${q.some((j) => j.e <= tn) ? `<button class="btn small primary" data-act="collect" data-id="${o.id}">Collect</button>` : ""}${working ? `<button class="btn small" data-act="speed" data-id="${o.id}"><img src="${iconURL("hearts")}" alt="">${Math.max(1, Math.ceil((working.e - tn) / 30000))} · Finish now</button>` : ""}<button class="btn small ghost" data-act="move" data-id="${o.id}">Move</button></div>
      <h4>${B.animal ? "Care" : "Make"}</h4><div class="recipes">${B.recipes.map((r, ri) => {
        const locked = r.lvl > S.level, out = r.out === "hearts" ? (o.t === "meditation" ? "Meditate" : "Warm soak") : ITEMS[r.out].name;
        const okk = !locked && has(r.inp) && q.length < queueCap(o);
        return `<div class="recipe ${locked ? "locked" : ""}"><img src="${iconURL(r.out)}" alt=""><div class="r-main"><b>${out}${r.n > 1 ? ` <em>×${r.n}</em>` : ""}</b><span>${locked ? `Unlocks at level ${r.lvl}` : `${fmtT(r.time * 1000)}${Object.keys(r.inp).length ? "" : " · free"}`}</span><div class="chips">${costHTML(r.inp)}</div></div><button class="btn small ${okk ? "primary" : ""}" data-act="make" data-id="${o.id}" data-r="${ri}" ${okk ? "" : "disabled"}>${B.animal ? "Feed" : r.out === "hearts" ? "Begin" : "Make"}</button></div>`;
      }).join("")}</div>`;
  }, { live: true });
}
function openBuild(tab = U.buildTab || "b") {
  U.buildTab = tab;
  openSheet("Build & Decorate", () => {
    const tabs = `<div class="tabs"><button class="${tab === "b" ? "on" : ""}" data-act="tab" data-tab="b">Buildings</button><button class="${tab === "d" ? "on" : ""}" data-act="tab" data-tab="d">Decorations</button></div>`;
    if (tab === "b") {
      const keys = Object.keys(BUILDINGS).filter((k) => !BUILDINGS[k].fixed).sort((a, b) => BUILDINGS[a].lvl - BUILDINGS[b].lvl);
      return tabs + `<div class="shop">${keys.map((k) => { const B = BUILDINGS[k], locked = B.lvl > S.level, n = countB(k), max = MAXB[k] || 1, full = n >= max; return `<button class="card ${locked ? "locked" : ""}" data-act="${locked || full ? "" : "buy"}" data-kind="b" data-t="${k}" ${locked || full ? "disabled" : ""}><img src="${buildThumb(k)}" alt=""><b>${B.name}</b><span class="desc">${B.desc}</span>${locked ? `<span class="tag">Level ${B.lvl}</span>` : full ? `<span class="tag ok">${max > 1 ? `${n}/${max} built` : "Built"}</span>` : `<span class="chips">${costHTML(B.cost)}</span>`}</button>`; }).join("")}</div>`;
    }
    const keys = Object.keys(DECOR).sort((a, b) => DECOR[a].lvl - DECOR[b].lvl);
    return tabs + `<p class="lead">Decorations raise your island's serenity: <b>${serenity()}</b>. Each point adds 1% to request rewards, up to 50%.</p><div class="shop"><button class="card" data-act="pathbrush"><img src="${thumbOf("path", sprite("paththumb", 1, 1, 0.6, () => { poly([P(0, 0, 0.05), P(1, 0, 0.05), P(1, 1, 0.05), P(0, 1, 0.05)], "#e9dcc4"); for (let k = 0; k < 5; k++) { const [px, py] = P(0.2 + (k % 3) * 0.3, 0.2 + Math.floor(k / 2) * 0.3, 0.05); ell(px, py, 6, 3, "#d8c8aa"); } }))}" alt=""><b>Stone Path</b><span class="desc">Lay winding paths between your buildings.</span><span class="chips"><span class="chip"><img src="${iconURL("coins")}" alt="">${PATH_COST} each</span></span></button>${keys.map((k) => { const D = DECOR[k], locked = D.lvl > S.level; return `<button class="card ${locked ? "locked" : ""}" data-act="${locked ? "" : "buy"}" data-kind="d" data-t="${k}" ${locked ? "disabled" : ""}><img src="${decorThumb(k)}" alt=""><b>${D.name}</b><span class="desc">+${D.s} serenity</span>${locked ? `<span class="tag">Level ${D.lvl}</span>` : `<span class="chips">${costHTML(D.cost)}</span>`}</button>`; }).join("")}</div>`;
  }, { tall: true });
}
function openPantry() {
  openSheet("Pantry", () => {
    const groups = [["crop", "Crops"], ["animal", "From the animals"], ["gather", "Gathered"], ["craft", "Handmade"]];
    const body = groups.map(([kind, label]) => { const ids = Object.keys(ITEMS).filter((k) => ITEMS[k].kind === kind && inv(k) > 0); if (!ids.length) return ""; return `<h4>${label}</h4><div class="pantry">${ids.map((k) => `<button class="item" data-act="sell" data-id="${k}" title="Sell one ${ITEMS[k].name} for ${ITEMS[k].value} coins"><img src="${iconURL(k)}" alt=""><b>${inv(k)}</b><span>${ITEMS[k].name}</span><em><img src="${iconURL("coins")}" alt="">${ITEMS[k].value}</em></button>`).join("")}</div>`; }).join("");
    return `<p class="lead">Tap an item to sell one at the market stall.</p>${body || `<p class="empty-note">Your pantry is empty. Harvest a few crops to fill it.</p>`}`;
  }, { tall: true });
}
function openCalmlings() {
  openSheet("Calmlings", () => `<p class="lead">Every Calmling is named for a beautiful word. Fulfil their requests, chat and bring gifts to grow your friendship.</p><div class="clist">${CALMLINGS.map((c) => {
    const here = c.visitor ? S.finale : c.lvl <= S.level, fl = friendLevel(c.id);
    if (!here) return `<div class="cl locked"><div class="sil"></div><div><b>${c.visitor ? "A mysterious visitor" : "Someone new"}</b><span>${c.visitor ? "Restore the lighthouse" : `Arrives at level ${c.lvl}`}</span></div></div>`;
    return `<button class="cl" data-act="calmling" data-id="${c.id}"><img src="${portrait(c, 72)}" alt=""><div><b>${c.name}</b><span>${c.word}</span><i class="hearts">${[1, 2, 3, 4].map((k) => `<em class="${fl >= k ? "on" : ""}"></em>`).join("")}</i></div></button>`;
  }).join("")}</div>`, { tall: true });
}
function openCalmling(id) {
  const c = CH[id];
  if (now() - (S.chatT[id] || 0) > 5 * 60000) { S.chatT[id] = now(); const before = friendLevel(id); S.friends[id] = (S.friends[id] || 0) + 1; if (friendLevel(id) > before) friendUp(id); save(); }
  const line = c.lines[Math.floor(Math.random() * c.lines.length)];
  openSheet(c.name, () => {
    const fl = friendLevel(id), pts = S.friends[id] || 0, next = FRIEND_LEVELS[fl + 1];
    return `<div class="profile"><img src="${portrait(c, 120)}" alt=""><div><p class="word">${c.word}</p><p class="mood">${c.mood}</p><p class="say">“${line}”</p></div></div>
      <div class="friend"><b>${FRIEND_NAMES[fl]}</b><i class="meter"><i style="width:${next ? ((pts - FRIEND_LEVELS[fl]) / (next - FRIEND_LEVELS[fl])) * 100 : 100}%"></i></i><span>${next ? `${pts}/${next} to ${FRIEND_NAMES[fl + 1].toLowerCase()}` : "Friends for always"}</span></div>
      <div class="row"><button class="btn small ${inv(c.fav) > 0 ? "primary" : ""}" data-act="gift" data-id="${id}" ${inv(c.fav) > 0 ? "" : "disabled"}><img src="${iconURL(c.fav)}" alt="">Give ${ITEMS[c.fav].name} · +3</button></div>
      <h4>${c.name}'s story</h4><ol class="story">${c.story.map((s, k) => (fl >= k + 1 ? `<li>${s}</li>` : `<li class="locked">Become ${FRIEND_NAMES[k + 1].toLowerCase()}s to read this chapter.</li>`)).join("")}</ol>`;
  });
}
function openRegion(id) {
  const R = REGIONS[RIDX[id]];
  openSheet(R.name, () => {
    const ready = S.level >= R.lvl;
    return `<div class="region"><p class="lead">${R.desc}</p>${ready ? `<div class="chips big">${costHTML(R.cost)}</div><button class="btn primary wide" data-act="unlock" data-id="${id}" ${has(R.cost) ? "" : "disabled"}>Clear the mist</button>` : `<p class="tag">Reach level ${R.lvl} to explore this region</p>`}</div>`;
  });
}
function openLighthouse() {
  openSheet("Ancient Lighthouse", () => {
    if (S.lighthouse >= 3) return `<p class="lead">The light turns slowly over the sea, and every boat can find its way home.</p>`;
    if (S.level < 12) return `<p class="lead">Its lens is cracked and its lamp is cold. Reach level 12 to begin the restoration.</p>`;
    const st = LIGHTHOUSE_STAGES[S.lighthouse], given = S.lhGiven[S.lighthouse] || {};
    return `<p class="eyebrow">Stage ${S.lighthouse + 1} of 3 · ${st.name}</p><p class="lead">${st.text}</p><div class="recipes">${Object.keys(st.need).map((k) => { const g = given[k] || 0, n = st.need[k], left = n - g; return `<div class="recipe"><img src="${iconURL(k)}" alt=""><div class="r-main"><b>${ITEMS[k].name}</b><span>${g}/${n} given · you have ${inv(k)}</span><i class="meter"><i style="width:${(g / n) * 100}%"></i></i></div><button class="btn small ${left > 0 && inv(k) > 0 ? "primary" : ""}" data-act="lhgive" data-id="${k}" ${left > 0 && inv(k) > 0 ? "" : "disabled"}>${left > 0 ? "Give" : "Done"}</button></div>`; }).join("")}</div>`;
  }, { live: true });
}
function lhGive(k) {
  const st = LIGHTHOUSE_STAGES[S.lighthouse]; const g = (S.lhGiven[S.lighthouse] = S.lhGiven[S.lighthouse] || {});
  const n = Math.min(inv(k), st.need[k] - (g[k] || 0)); if (n <= 0) return;
  give(k, -n); g[k] = (g[k] || 0) + n; sfx("pop");
  if (Object.keys(st.need).every((x) => (g[x] || 0) >= st.need[x])) {
    S.lighthouse++; sfx("level"); confetti();
    toast(S.lighthouse >= 3 ? "The lighthouse shines again" : `${st.name} restored`, "serenity");
    const lh = S.objs.find((o) => o.t === "lighthouse"); lh.born = performance.now();
    checkLevel();
  }
  updateHUD(); save(); refreshSheet();
}
function openSettings() {
  openSheet("Settings", () => `<div class="settings"><label><input type="checkbox" id="optSfx" ${S.sfx ? "checked" : ""}> Sound effects</label><label><input type="checkbox" id="optMusic" ${S.music ? "checked" : ""}> Ambient music and waves</label></div>
    <h4>How to play</h4><ul class="howto"><li><b>Tap</b> overgrowth, rocks and trees to gather wood, stone and fibre.</li><li><b>Tap a plot</b> to plant. <b>Swipe</b> across ripe crops to harvest them all at once.</li><li><b>Tap a building</b> to make goods. Tap it again when the bubble appears to collect.</li><li><b>Deliver</b> requests at the board to earn coins, hearts and friendship.</li><li><b>Clear the mist</b> at signposts to open new regions as you level up.</li><li><b>Drag</b> to look around, <b>pinch</b> or scroll to zoom.</li></ul>
    <h4>Start over</h4><p class="lead">This erases your island and begins again from a tiny garden.</p><div class="row" id="resetRow"><button class="btn small ghost" data-act="reset1">Start a new island</button></div>`);
}
function finale() {
  S.finale = true;
  const lh = S.objs.find((o) => o.t === "lighthouse");
  let spot = [lh.x + 3, lh.y + 3], sd = 1e9;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { if (T[y * N + x] !== "w" || DIST[y * N + x] !== 1) continue; const d = Math.hypot(x - lh.x - 1, y - lh.y - 1) - (x + y > lh.x + lh.y + 2 ? 1 : 0); if (d < sd) { sd = d; spot = [x, y]; } }
  S.objs.push({ id: S.nid++, k: "d", t: "boat", x: spot[0], y: spot[1], w: 1, d: 1, fixed: true });
  S.friends.hiraeth = S.friends.hiraeth || 0; rebuildOcc(); spawnCalmling(CH.hiraeth, true);
  panTo(...P(lh.x + 1, lh.y + 1, 2), 2200, 1.1); sfx("unlock"); setTimeout(confetti, 1200);
  save(); renderQuests();
  setTimeout(() => openSheet("A light across the sea", () => `<div class="levelup finale"><p class="eyebrow">Chapter One complete</p><h3>Welcome home, Hiraeth</h3><p>The old lamp catches, flickers and blooms into gold. Far out on the dark water a little boat turns toward it.</p><div class="newbie"><img src="${portrait(CH.hiraeth)}" alt=""><div><b>Hiraeth has arrived</b><span>${CH.hiraeth.word}</span><p>“I followed your light across the whole dark sea. There are other islands out there, still waiting for theirs.”</p></div></div><p class="next">Chapter Two · <em>The Far Isles</em> is on the horizon. Until then, Calm Island is yours to tend.</p><button class="btn primary wide" data-act="close">Stay a while</button></div>`), 2600);
}
function openLevelComplete() {
  if (!S.levelReady) return;
  const L = LV();
  openSheet("Level complete", () => `<div class="levelup"><p class="eyebrow">Level ${S.level} · ${L.name}</p><h3>Beautifully done</h3><p>Every Calmling on the island feels a little lighter today.</p><div class="chips big"><span class="chip"><img src="${iconURL("coins")}" alt="">${L.reward.coins}</span><span class="chip"><img src="${iconURL("hearts")}" alt="">${L.reward.hearts}</span></div><button class="btn primary wide glow" data-act="claim">Claim reward</button></div>`);
}

/* ---------- click delegation ---------- */
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-act]"); if (!b || b.disabled) return;
  const a = b.dataset.act, id = b.dataset.id, o = id && objById.get(+id);
  audioInit();
  switch (a) {
    case "close": closeSheet(); break;
    case "claim": claimLevel(); break;
    case "orders": openOrders(); break;
    case "build": openBuild(); break;
    case "pantry": openPantry(); break;
    case "calmlings": openCalmlings(); break;
    case "settings": openSettings(); break;
    case "quests": $("#quests").classList.toggle(window.innerWidth < 600 ? "open" : "collapsed"); break;
    case "tab": openBuild(b.dataset.tab); break;
    case "buy": { const kind = b.dataset.kind, t = b.dataset.t, cost = kind === "b" ? BUILDINGS[t].cost : DECOR[t].cost; if (!has(cost)) { toast("You need a little more for this."); break; } startPlace(kind, t); break; }
    case "pathbrush": closeSheet(); U.pathBrush = true; U.brush = null; renderBrush(); break;
    case "plothere": closePopup(); if (!has(BUILDINGS.plot.cost)) { toast("A plot costs 15 coins."); break; } startPlace("b", "plot", [+b.dataset.x, +b.dataset.y]); break;
    case "confirmplace": confirmPlace(); break;
    case "cancelplace": cancelPlace(); break;
    case "move": if (o) startMove(o); break;
    case "store": if (o) storeDecor(o); break;
    case "plant": if (o && plant(o, b.dataset.crop)) { U.brush = b.dataset.crop; renderBrush(); closePopup(); save(); } break;
    case "brushdone": U.brush = null; U.pathBrush = false; renderBrush(); save(); break;
    case "cropspeed": if (o && o.crop) { const left = o.crop.t0 + o.crop.dur - now(), c = Math.max(1, Math.ceil(left / 30000)); if (S.hearts < c) { toast("Not enough hearts."); break; } S.hearts -= c; o.crop.t0 -= left; closePopup(); sfx("pop"); updateHUD(); save(); } break;
    case "make": if (o) { startJob(o, +b.dataset.r); refreshSheet(); } break;
    case "collect": if (o) { collect(o); refreshSheet(); } break;
    case "speed": if (o) { speedUp(o); refreshSheet(); } break;
    case "deliver": deliver(+b.dataset.i); refreshSheet(); break;
    case "skip": S.orders[+b.dataset.i] = null; S.orderNext[+b.dataset.i] = now() + 30000; sfx("pop"); save(); refreshSheet(); updateHUD(); break;
    case "sell": if (inv(id) > 0) { give(id, -1); give("coins", ITEMS[id].value); sfx("coin"); updateHUD(); save(); refreshSheet(); } break;
    case "calmling": openCalmling(id); break;
    case "gift": { const c = CH[id]; if (inv(c.fav) < 1) break; give(c.fav, -1); const before = friendLevel(id); S.friends[id] = (S.friends[id] || 0) + 3; sfx("calm"); const cl = CL.find((x) => x.ch.id === id); if (cl) { cl.happy = 3; cl.wave = 1.5; } toast(`${c.name} loves it`, "hearts"); if (friendLevel(id) > before) friendUp(id); updateHUD(); save(); refreshSheet(); break; }
    case "unlock": unlockRegion(id); break;
    case "lhgive": lhGive(id); break;
    case "reset1": $("#resetRow").innerHTML = `<span class="warn">Erase everything?</span><button class="btn small" data-act="close">Keep my island</button><button class="btn small danger" data-act="reset2">Yes, start over</button>`; break;
    case "reset2": try { localStorage.removeItem(KEY); } catch (err) { /* ignore */ } newGame(); bootWorld(); closeSheet(); showIntro(); break;
    case "begin": $("#intro").classList.add("gone"); setTimeout(() => ($("#intro").hidden = true), 700); S.intro = true; save(); audioInit(); sfx("level"); if (!U.greeted) { U.greeted = true; setTimeout(() => toast("Apricus: Welcome to Calm Island! Let's tidy the garden together.", "serenity"), 700); } break;
  }
});
document.addEventListener("change", (e) => {
  if (e.target.id === "optSfx") { S.sfx = e.target.checked; save(); }
  if (e.target.id === "optMusic") { S.music = e.target.checked; save(); musicGain(); }
});
$("#sheet").addEventListener("pointerdown", (e) => { if (e.target.id === "sheet") closeSheet(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") { if (U.place) cancelPlace(); else if (!$("#sheet").hidden) closeSheet(); else closePopup(); } });

/* =================== audio =================== */
const AU = { ctx: null, out: null, mus: null, noise: null };
function audioInit() {
  if (AU.ctx) { if (AU.ctx.state === "suspended") AU.ctx.resume(); return; }
  try {
    const A = window.AudioContext || window.webkitAudioContext; if (!A) return;
    AU.ctx = new A(); AU.out = AU.ctx.createGain(); AU.out.gain.value = 0.5; AU.out.connect(AU.ctx.destination);
    AU.mus = AU.ctx.createGain(); AU.mus.connect(AU.out);
    const len = AU.ctx.sampleRate * 4, buf = AU.ctx.createBuffer(1, len, AU.ctx.sampleRate), d = buf.getChannelData(0);
    let last = 0; for (let i = 0; i < len; i++) { last = (last + (Math.random() * 2 - 1) * 0.02) * 0.995; d[i] = last; }
    const src = AU.ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const lp = AU.ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 500;
    const wg = AU.ctx.createGain(); wg.gain.value = 0.9;
    const lfo = AU.ctx.createOscillator(), lg = AU.ctx.createGain(); lfo.frequency.value = 0.09; lg.gain.value = 0.6; lfo.connect(lg); lg.connect(wg.gain); lfo.start();
    src.connect(lp); lp.connect(wg); wg.connect(AU.mus); src.start();
    musicGain(); setInterval(musicNote, 2300);
  } catch (e) { AU.ctx = null; }
}
function musicGain() { if (AU.mus) AU.mus.gain.setTargetAtTime(S.music ? 0.5 : 0, AU.ctx.currentTime, 0.4); }
const SCALE = [261.6, 293.7, 329.6, 392, 440, 523.3, 587.3, 659.3];
function note(f, dur, vol, type = "sine", dest, delay = 0) {
  if (!AU.ctx) return;
  const t = AU.ctx.currentTime + delay, o = AU.ctx.createOscillator(), g = AU.ctx.createGain();
  o.type = type; o.frequency.value = f; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(dest || AU.out); o.start(t); o.stop(t + dur + 0.05);
}
function musicNote() {
  if (!AU.ctx || !S.music || document.hidden) return;
  if (Math.random() < 0.65) note(SCALE[Math.floor(Math.random() * SCALE.length)] / (Math.random() < 0.3 ? 2 : 1), 3.2, 0.045, "sine", AU.mus);
  if (Math.random() < 0.18) { const r = SCALE[Math.floor(Math.random() * 4)] / 2; [1, 1.25, 1.5].forEach((m, k) => note(r * m, 5, 0.02, "triangle", AU.mus, k * 0.12)); }
}
function sfx(k) {
  if (!AU.ctx || !S || !S.sfx) return;
  switch (k) {
    case "pop": note(660, 0.12, 0.12, "sine"); note(990, 0.1, 0.05, "sine", null, 0.03); break;
    case "tick": note(1320 + Math.random() * 200, 0.06, 0.03, "sine"); break;
    case "plant": note(392, 0.12, 0.08, "triangle"); break;
    case "harvest": [523.3, 659.3, 784].forEach((f, i) => note(f, 0.22, 0.08, "sine", null, i * 0.05)); break;
    case "coin": [987.8, 1318.5].forEach((f, i) => note(f, 0.18, 0.07, "square", null, i * 0.07)); break;
    case "wood": note(180, 0.12, 0.15, "triangle"); note(140, 0.1, 0.1, "triangle", null, 0.06); break;
    case "stone": note(240, 0.08, 0.12, "square"); break;
    case "build": [392, 523.3, 659.3, 784].forEach((f, i) => note(f, 0.3, 0.07, "triangle", null, i * 0.07)); break;
    case "calm": [659.3, 784, 987.8].forEach((f, i) => note(f, 0.5, 0.05, "sine", null, i * 0.09)); break;
    case "level": [523.3, 659.3, 784, 1046.5].forEach((f, i) => note(f, 0.7, 0.07, "sine", null, i * 0.11)); break;
    case "unlock": [392, 493.9, 587.3, 784, 987.8].forEach((f, i) => note(f, 0.9, 0.06, "sine", null, i * 0.1)); break;
  }
}

/* =================== boot =================== */
function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1); VW = window.innerWidth; VH = window.innerHeight;
  cv.width = Math.round(VW * DPR); cv.height = Math.round(VH * DPR); cv.style.width = VW + "px"; cv.style.height = VH + "px";
}
function bootWorld() {
  CL.length = 0; U.fx = []; U.place = null; U.brush = null; U.pathBrush = false; renderPlacebar(); renderBrush();
  rebuildOcc(); buildTerrain(); buildFog();
  for (const c of arrived()) spawnCalmling(c);
  const [hx, hy] = P(18, 18.5, 0.5); cam.x = hx; cam.y = hy - (VW < 600 ? 50 : 20); cam.z = clamp(Math.min(VW, VH) / 520, 1, 1.6);
  refillOrders(); updateHUD(); renderQuests(); checkLevel();
}
function showIntro() {
  const el = $("#intro"); el.hidden = false; el.classList.remove("gone");
  $("#introArt").src = portrait(CH.apricus, 160);
  $("#introBtn").textContent = S.intro ? "Return to the island" : "Begin";
}
function start() { loadSkin(boot); }
function boot() {
  resize(); cloudSprites();
  if (!load()) newGame();
  if (!S.tmod) S.tmod = {};
  if ((S.jungle || 0) < 2) { S.objs = S.objs.filter((o) => !(o.k === "tree" && o.t.startsWith("jungle"))); growJungle(); }
  const board = S.objs.find((o) => o.t === "board");
  if (board && board.x === 18 && board.y === 15 && !S.objs.some((o) => o !== board && o.x === 19 && o.y === 15)) board.x = 19;
  bootWorld();
  $("#pCoins img").src = iconURL("coins"); $("#pHearts img").src = iconURL("hearts"); $("#pSerenity img").src = iconURL("serenity");
  showIntro();
  requestAnimationFrame(frame);
  setInterval(() => {
    refillOrders(); respawnTick(); updateHUD();
    if (U.panelLive) refreshSheet();
    document.querySelectorAll("[data-live=crop]").forEach((el) => { const o = objById.get(+el.dataset.id); if (o && o.crop) el.textContent = fmtT(o.crop.t0 + o.crop.dur - now()); });
    if (!S.levelReady) checkLevel(); else renderQuests();
  }, 1000);
  setInterval(save, 8000);
  window.addEventListener("resize", () => { resize(); buildTerrain(); clampCam(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden) save(); });
  window.addEventListener("pagehide", save);
}
start();
