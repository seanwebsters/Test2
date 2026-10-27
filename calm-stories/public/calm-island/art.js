/* Calm Island – procedural art: isometric primitives, sprites, Calmlings and item icons. */
"use strict";

const HW = 32, HH = 16, ZS = 30, SPR = 2;
let G = null, OX = 0, OY = 0;
const P = (x, y, z = 0) => [OX + (x - y) * HW, OY + (x + y) * HH - z * ZS];

/* ---------- colour ---------- */
const _rgb = {};
function rgbOf(h) {
  if (_rgb[h]) return _rgb[h];
  const s = h.replace("#", "");
  return (_rgb[h] = [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)]);
}
const _mix = {};
function mix(a, b, t) {
  const k = a + b + t.toFixed(3);
  if (_mix[k]) return _mix[k];
  const A = rgbOf(a), B = rgbOf(b);
  const c = A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0"));
  return (_mix[k] = "#" + c.join(""));
}
const shade = (c, t) => (t >= 0 ? mix(c, "#fffaf0", t) : mix(c, "#2b2140", -t));
const rgba = (c, a) => { const [r, g, b] = rgbOf(c); return `rgba(${r},${g},${b},${a})`; };

/* ---------- primitives ---------- */
function poly(pts, fill, stroke, lw = 0.8) {
  G.beginPath();
  G.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) G.lineTo(pts[i][0], pts[i][1]);
  G.closePath();
  if (fill) { G.fillStyle = fill; G.fill(); }
  if (stroke) { G.strokeStyle = stroke; G.lineWidth = lw; G.lineJoin = "round"; G.stroke(); }
}
function line(a, b, col, lw = 1) { G.beginPath(); G.moveTo(a[0], a[1]); G.lineTo(b[0], b[1]); G.strokeStyle = col; G.lineWidth = lw; G.lineCap = "round"; G.stroke(); }
function ell(x, y, rx, ry, fill) { G.beginPath(); G.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, 7); G.fillStyle = fill; G.fill(); }
function circ(x, y, r, fill) { G.beginPath(); G.arc(x, y, Math.max(0.1, r), 0, 7); G.fillStyle = fill; G.fill(); }
function ball(x, y, rad, col, hi = 0.3) {
  const g = G.createRadialGradient(x - rad * 0.38, y - rad * 0.42, rad * 0.08, x, y, rad * 1.02);
  g.addColorStop(0, shade(col, hi)); g.addColorStop(0.55, col); g.addColorStop(1, shade(col, -0.22));
  G.fillStyle = g; G.beginPath(); G.arc(x, y, rad, 0, 7); G.fill();
}
const EDGE = "rgba(58,40,70,.22)";
function box(x, y, z, w, d, h, col, o = {}) {
  const top = o.top || shade(col, 0.16), left = o.left || col, right = o.right || shade(col, -0.17);
  const st = o.line === false ? null : EDGE;
  poly([P(x, y + d, z + h), P(x + w, y + d, z + h), P(x + w, y + d, z), P(x, y + d, z)], left, st);
  poly([P(x + w, y, z + h), P(x + w, y + d, z + h), P(x + w, y + d, z), P(x + w, y, z)], right, st);
  poly([P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)], top, st);
}
// quad on the +y face plane (front-left), u along x, v along z
function faceY(yp, x0, x1, z0, z1, col, st) { poly([P(x0, yp, z1), P(x1, yp, z1), P(x1, yp, z0), P(x0, yp, z0)], col, st); }
// quad on the +x face plane (front-right), u along y
function faceX(xp, y0, y1, z0, z1, col, st) { poly([P(xp, y0, z1), P(xp, y1, z1), P(xp, y1, z0), P(xp, y0, z0)], col, st); }
function windowY(yp, x0, x1, z0, z1, glow = "#ffe3a3", frame = "#8a6a58") {
  faceY(yp + 0.005, x0 - 0.04, x1 + 0.04, z0 - 0.04, z1 + 0.04, frame);
  faceY(yp + 0.01, x0, x1, z0, z1, glow);
  const xm = (x0 + x1) / 2, zm = (z0 + z1) / 2;
  line(P(xm, yp + 0.012, z0), P(xm, yp + 0.012, z1), frame, 1.2);
  line(P(x0, yp + 0.012, zm), P(x1, yp + 0.012, zm), frame, 1.2);
}
function windowX(xp, y0, y1, z0, z1, glow = "#f6d28f", frame = "#7a5a4a") {
  faceX(xp + 0.005, y0 - 0.04, y1 + 0.04, z0 - 0.04, z1 + 0.04, frame);
  faceX(xp + 0.01, y0, y1, z0, z1, glow);
  const ym = (y0 + y1) / 2, zm = (z0 + z1) / 2;
  line(P(xp + 0.012, ym, z0), P(xp + 0.012, ym, z1), frame, 1.2);
  line(P(xp + 0.012, y0, zm), P(xp + 0.012, y1, zm), frame, 1.2);
}
// gable roof, ridge along x
function roofX(x, y, z, w, d, rh, col, gable) {
  const ym = y + d / 2;
  poly([P(x, y, z), P(x + w, y, z), P(x + w, ym, z + rh), P(x, ym, z + rh)], shade(col, 0.1), EDGE);
  if (gable) poly([P(x + w - 0.1, y + 0.12, z), P(x + w - 0.1, y + d - 0.12, z), P(x + w - 0.1, ym, z + rh - 0.1)], gable, EDGE);
  poly([P(x, ym, z + rh), P(x + w, ym, z + rh), P(x + w, y + d, z), P(x, y + d, z)], col, EDGE);
  for (let i = 1; i < 5; i++) { const t = i / 5; line(P(x + 0.02, ym + (d / 2) * t, z + rh * (1 - t)), P(x + w - 0.02, ym + (d / 2) * t, z + rh * (1 - t)), shade(col, -0.1), 0.9); }
  line(P(x + w, ym, z + rh), P(x + w, y + d, z), shade(col, 0.18), 1.4);
  line(P(x, ym, z + rh), P(x + w, ym, z + rh), shade(col, 0.3), 2.2);
}
// gable roof, ridge along y
function roofY(x, y, z, w, d, rh, col, gable) {
  const xm = x + w / 2;
  poly([P(x, y, z), P(x, y + d, z), P(xm, y + d, z + rh), P(xm, y, z + rh)], shade(col, 0.14), EDGE);
  if (gable) poly([P(x + 0.12, y + d - 0.1, z), P(x + w - 0.12, y + d - 0.1, z), P(xm, y + d - 0.1, z + rh - 0.1)], gable, EDGE);
  poly([P(xm, y, z + rh), P(xm, y + d, z + rh), P(x + w, y + d, z), P(x + w, y, z)], shade(col, -0.12), EDGE);
  for (let i = 1; i < 5; i++) { const t = i / 5; line(P(xm + (w / 2) * t, y + 0.02, z + rh * (1 - t)), P(xm + (w / 2) * t, y + d - 0.02, z + rh * (1 - t)), shade(col, -0.24), 0.9); }
  line(P(xm, y, z + rh), P(xm, y + d, z + rh), shade(col, 0.3), 2.2);
}
function pyramid(x, y, z, w, d, h, col) {
  const a = P(x + w / 2, y + d / 2, z + h);
  poly([P(x, y, z), P(x + w, y, z), a], shade(col, 0.18), EDGE);
  poly([P(x, y, z), P(x, y + d, z), a], shade(col, 0.1), EDGE);
  poly([P(x + w, y, z), P(x + w, y + d, z), a], shade(col, -0.16), EDGE);
  poly([P(x, y + d, z), P(x + w, y + d, z), a], col, EDGE);
}
function cyl(cx, cy, z0, z1, r, col, topCol) {
  const [sx, sy0] = P(cx, cy, z0), sy1 = sy0 - (z1 - z0) * ZS, rx = r * HW * 1.414, ry = r * HH * 1.414;
  const g = G.createLinearGradient(sx - rx, 0, sx + rx, 0);
  g.addColorStop(0, shade(col, 0.06)); g.addColorStop(0.38, shade(col, 0.2)); g.addColorStop(1, shade(col, -0.24));
  G.beginPath(); G.moveTo(sx - rx, sy1); G.lineTo(sx - rx, sy0); G.ellipse(sx, sy0, rx, ry, 0, Math.PI, 0, true); G.lineTo(sx + rx, sy1); G.closePath();
  G.fillStyle = g; G.fill(); G.strokeStyle = EDGE; G.lineWidth = 0.8; G.stroke();
  G.beginPath(); G.ellipse(sx, sy1, rx, ry, 0, 0, 7); G.fillStyle = topCol || shade(col, 0.2); G.fill(); G.stroke();
}
function shadowAt(cx, cy, rx, ry, a = 0.2) { const [x, y] = P(cx, cy, 0); G.save(); G.globalAlpha = a; ell(x, y, rx, ry, "#2b3a3a"); G.restore(); }

/* ---------- sprite cache ---------- */
function makeSprite(w, d, hu, fn, pad = 26) {
  const cw = (w + d) * HW + pad * 2, ch = (w + d) * HH + hu * ZS + pad * 2;
  const cv = document.createElement("canvas");
  cv.width = Math.ceil(cw * SPR); cv.height = Math.ceil(ch * SPR);
  const c = cv.getContext("2d"); c.scale(SPR, SPR);
  const s = [G, OX, OY]; G = c; OX = d * HW + pad; OY = hu * ZS + pad;
  fn();
  const out = { cv, ox: OX, oy: OY, w: cw, h: ch };
  [G, OX, OY] = s;
  return out;
}
function rnd(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/* ---------- nature ---------- */
function drawPalm(seed) {
  const R = rnd(seed); shadowAt(0.5, 0.5, 22, 10, 0.16);
  const [bx, by] = P(0.5, 0.5, 0), bend = (R() - 0.5) * 30, hgt = 66 + R() * 18;
  const pt = (t) => [bx + bend * t * t, by - hgt * t];
  G.beginPath();
  for (let i = 0; i <= 12; i++) { const t = i / 12, [x, y] = pt(t); G.lineTo(x - (5 - 2.4 * t), y); }
  for (let i = 12; i >= 0; i--) { const t = i / 12, [x, y] = pt(t); G.lineTo(x + (5 - 2.4 * t), y); }
  const tg = G.createLinearGradient(bx - 6, 0, bx + 6, 0); tg.addColorStop(0, "#c99a6a"); tg.addColorStop(1, "#946a45");
  G.fillStyle = tg; G.fill();
  for (let i = 1; i < 12; i++) { const t = i / 12, [x, y] = pt(t), w = 5 - 2.4 * t; G.beginPath(); G.moveTo(x - w, y); G.quadraticCurveTo(x, y + 2.2, x + w, y); G.strokeStyle = "rgba(90,60,40,.45)"; G.lineWidth = 1; G.stroke(); }
  const [tx, ty] = pt(1);
  const leaves = 9;
  const order = [...Array(leaves).keys()].map((i) => ({ a: (i / leaves) * Math.PI * 2 + R() * 0.4, L: 34 + R() * 12 }))
    .sort((p, q) => Math.sin(p.a) - Math.sin(q.a));
  for (const lf of order) {
    const dx = Math.cos(lf.a), dy = Math.sin(lf.a) * 0.5, back = Math.sin(lf.a) < 0;
    const ex = tx + dx * lf.L, ey = ty + dy * lf.L + 16, mx = tx + dx * lf.L * 0.5, my = ty + dy * lf.L * 0.5 - 11;
    const c1 = back ? "#4a9758" : "#66bd66", c2 = back ? "#3a7f4e" : "#4c9f57";
    const g = G.createLinearGradient(tx, ty, ex, ey); g.addColorStop(0, c1); g.addColorStop(1, c2);
    const nl = Math.hypot(dx, dy) || 1, nx = (-dy / nl) * 8, ny = (dx / nl) * 8;
    G.beginPath(); G.moveTo(tx, ty); G.quadraticCurveTo(mx + nx, my + ny, ex, ey); G.quadraticCurveTo(mx - nx, my - ny, tx, ty);
    G.fillStyle = g; G.fill();
    G.strokeStyle = back ? "rgba(30,70,40,.25)" : "rgba(30,80,40,.22)"; G.lineWidth = 0.8;
    for (let k = 1; k < 6; k++) { const t = k / 6, qx = tx + (mx - tx) * 2 * t * (1 - t) + (ex - tx) * t * t, qy = ty + (my - ty) * 2 * t * (1 - t) + (ey - ty) * t * t, w = Math.sin(t * Math.PI) * 0.9; G.beginPath(); G.moveTo(qx + nx * w, qy + ny * w); G.lineTo(qx, qy); G.lineTo(qx - nx * w, qy - ny * w); G.stroke(); }
    G.beginPath(); G.moveTo(tx, ty); G.quadraticCurveTo(mx, my, ex, ey); G.strokeStyle = "rgba(240,255,210,.4)"; G.lineWidth = 1; G.stroke();
  }
  for (let i = 0; i < 3; i++) ball(tx - 4 + i * 4, ty + 4 + (i % 2) * 2, 3.8, "#8a6142", 0.25);
}
function drawRoundTree(seed, palette) {
  const R = rnd(seed); shadowAt(0.5, 0.5, 24, 11, 0.18);
  const [bx, by] = P(0.5, 0.5, 0);
  G.fillStyle = "#8d6a52"; G.beginPath(); G.moveTo(bx - 4, by); G.lineTo(bx - 2.5, by - 34); G.lineTo(bx + 2.5, by - 34); G.lineTo(bx + 4, by); G.fill();
  const blobs = [[-12, -40, 15], [12, -42, 15], [0, -54, 18], [-6, -34, 12], [8, -32, 12]];
  for (const [dx, dy, rr] of blobs) ball(bx + dx + (R() - 0.5) * 3, by + dy, rr + R() * 2, palette[Math.floor(R() * palette.length)], 0.32);
  if (palette.accent) for (let i = 0; i < 9; i++) circ(bx + (R() - 0.5) * 34, by - 30 - R() * 34, 1.6 + R(), palette.accent);
}
function drawPine(seed, col = "#4f9a72") {
  const R = rnd(seed); shadowAt(0.5, 0.5, 18, 9, 0.18);
  const [bx, by] = P(0.5, 0.5, 0), s = 0.85 + R() * 0.35;
  G.fillStyle = "#7d5b48"; G.fillRect(bx - 2.5, by - 14 * s, 5, 14 * s);
  for (let i = 0; i < 4; i++) {
    const w = (22 - i * 4.5) * s, yb = by - (10 + i * 15) * s, yt = yb - 26 * s;
    G.beginPath(); G.moveTo(bx - w, yb); G.lineTo(bx, yt); G.lineTo(bx, yb + 5 * s); G.closePath(); G.fillStyle = shade(col, 0.1); G.fill();
    G.beginPath(); G.moveTo(bx + w, yb); G.lineTo(bx, yt); G.lineTo(bx, yb + 5 * s); G.closePath(); G.fillStyle = shade(col, -0.16); G.fill();
  }
  if (R() < 0.5) { G.beginPath(); G.moveTo(bx - 6 * s, by - 61 * s); G.lineTo(bx, by - 76 * s); G.lineTo(bx + 6 * s, by - 61 * s); G.fillStyle = "#f4f7fb"; G.fill(); }
}
function drawBush() {
  shadowAt(0.5, 0.5, 20, 9, 0.16);
  const [x, y] = P(0.5, 0.5, 0);
  for (const [dx, dy, r, c] of [[-10, -6, 9, "#4f8f52"], [9, -7, 9, "#4a8a4f"], [0, -13, 11, "#5fa25c"], [-4, -3, 8, "#6caf63"], [7, -2, 7, "#5b9e58"]]) ball(x + dx, y + dy, r, c, 0.25);
  G.strokeStyle = "#7a5b45"; G.lineWidth = 1.2;
  for (const [a, b, c, d] of [[-14, -12, -20, -22], [12, -14, 19, -24], [2, -20, 4, -30]]) { G.beginPath(); G.moveTo(x + a, y + b); G.lineTo(x + c, y + d); G.stroke(); }
  for (const [dx, dy] of [[-7, -14], [6, -16], [0, -6], [11, -5]]) circ(x + dx, y + dy, 1.8, "#fff4f7");
  for (const [dx, dy] of [[-3, -18], [10, -10]]) circ(x + dx, y + dy, 1.5, "#f6a6b9");
}
function drawRock(col = "#b6b0c2") {
  shadowAt(0.5, 0.5, 18, 8, 0.2);
  const [x, y] = P(0.5, 0.5, 0);
  G.beginPath(); G.moveTo(x - 16, y); G.quadraticCurveTo(x - 18, y - 14, x - 6, y - 20); G.quadraticCurveTo(x + 6, y - 26, x + 15, y - 14); G.quadraticCurveTo(x + 19, y - 4, x + 12, y + 2); G.closePath();
  const g = G.createLinearGradient(x - 16, y - 22, x + 16, y); g.addColorStop(0, shade(col, 0.3)); g.addColorStop(1, shade(col, -0.25));
  G.fillStyle = g; G.fill();
  G.beginPath(); G.moveTo(x - 6, y - 20); G.lineTo(x - 1, y - 8); G.lineTo(x + 15, y - 14); G.strokeStyle = "rgba(60,50,80,.18)"; G.lineWidth = 1; G.stroke();
  ell(x - 8, y - 16, 6, 3, "#8fbf72");
}
function drawShell() {
  const [x, y] = P(0.5, 0.5, 0);
  ell(x, y + 1, 8, 3, "rgba(60,50,40,.15)");
  G.beginPath(); G.moveTo(x, y + 1); for (let i = 0; i <= 8; i++) { const a = Math.PI + (i / 8) * Math.PI; G.lineTo(x + Math.cos(a) * 8, y - 1 + Math.sin(a) * 7); } G.closePath();
  G.fillStyle = "#f7c7c0"; G.fill();
  for (let i = 1; i < 8; i++) { const a = Math.PI + (i / 8) * Math.PI; line([x, y + 1], [x + Math.cos(a) * 7.5, y - 1 + Math.sin(a) * 6.5], "#e39a95", 0.8); }
}
function drawMossNode() {
  const [x, y] = P(0.5, 0.5, 0);
  ell(x, y, 14, 6, "#3f8f72");
  ball(x - 5, y - 3, 6, "#5cae7d"); ball(x + 6, y - 2, 5, "#4fa071");
  for (const [dx, h, c] of [[-6, 10, "#9ff2df"], [3, 13, "#c7b1ff"], [9, 8, "#9ff2df"]]) {
    G.fillStyle = "#f4efe2"; G.fillRect(x + dx - 1, y - h, 2, h - 2);
    G.beginPath(); G.ellipse(x + dx, y - h, 4.5, 3, 0, Math.PI, 0); G.fillStyle = c; G.fill();
  }
}
function drawCrystalNode() {
  const [x, y] = P(0.5, 0.5, 0);
  ell(x, y, 15, 6, "rgba(60,50,80,.2)");
  const shard = (dx, h, w, c, lean) => {
    G.beginPath(); G.moveTo(x + dx - w, y); G.lineTo(x + dx - w * 0.7 + lean, y - h); G.lineTo(x + dx + lean * 1.2, y - h - 6); G.lineTo(x + dx + w * 0.7 + lean, y - h); G.lineTo(x + dx + w, y); G.closePath();
    const g = G.createLinearGradient(x + dx - w, 0, x + dx + w, 0); g.addColorStop(0, shade(c, 0.45)); g.addColorStop(0.5, c); g.addColorStop(1, shade(c, -0.25));
    G.fillStyle = g; G.fill(); line([x + dx + lean * 1.2, y - h - 6], [x + dx + lean * 0.3, y - 1], "rgba(255,255,255,.55)", 1);
  };
  shard(-7, 14, 5, "#b9a3f0", -3); shard(7, 12, 5, "#8fd9ef", 3); shard(0, 22, 6, "#c7b6ff", 0);
}
function drawCloud(seed) {
  const R = rnd(seed); const x = 0, y = 0;
  const puffs = [[-34, 6, 22], [30, 8, 22], [-12, -6, 28], [14, -10, 26], [0, 10, 26], [-46, 14, 14], [46, 16, 14]];
  for (const [dx, dy, r] of puffs) { const g = G.createRadialGradient(x + dx - r * 0.3, y + dy - r * 0.4, 2, x + dx, y + dy, r); g.addColorStop(0, "#ffffff"); g.addColorStop(0.75, "#f6f4ff"); g.addColorStop(1, "#e3dff2"); G.fillStyle = g; G.beginPath(); G.arc(x + dx + (R() - 0.5) * 6, y + dy, r, 0, 7); G.fill(); }
}

/* ---------- crops ---------- */
const CROP_SPOTS = [[0.3, 0.3], [0.7, 0.3], [0.3, 0.7], [0.7, 0.7]];
function sprout(x, y, s = 1) {
  G.strokeStyle = "#5a9a4e"; G.lineWidth = 1.2; G.beginPath(); G.moveTo(x, y); G.lineTo(x, y - 5 * s); G.stroke();
  ell(x - 3 * s, y - 6 * s, 3 * s, 1.6 * s, "#7cc56a"); ell(x + 3 * s, y - 6.5 * s, 3 * s, 1.6 * s, "#8fd178");
}
const CROP_DRAW = {
  strawberry(x, y, st) {
    if (st < 2) return sprout(x, y, 0.8 + st * 0.3);
    for (const [dx, dy] of [[-5, -3], [5, -3], [0, -7], [0, -1]]) ball(x + dx, y + dy, 4.4, "#5ea85a", 0.25);
    if (st === 3) for (const [dx, dy] of [[-6, -1], [5, 0], [1, -5], [-2, 2]]) { G.beginPath(); G.moveTo(x + dx - 2.6, y + dy - 2); G.quadraticCurveTo(x + dx, y + dy - 4, x + dx + 2.6, y + dy - 2); G.quadraticCurveTo(x + dx + 2, y + dy + 2, x + dx, y + dy + 3.5); G.quadraticCurveTo(x + dx - 2, y + dy + 2, x + dx - 2.6, y + dy - 2); G.fillStyle = "#ee4f5f"; G.fill(); circ(x + dx - 0.8, y + dy - 1.2, 0.8, "rgba(255,255,255,.7)"); }
  },
  carrot(x, y, st) {
    if (st < 2) return sprout(x, y, 0.8 + st * 0.3);
    G.strokeStyle = "#4f9b48"; G.lineWidth = 1.4;
    for (let i = -2; i <= 2; i++) { G.beginPath(); G.moveTo(x, y - 1); G.quadraticCurveTo(x + i * 3, y - 8, x + i * 4, y - 13 - Math.abs(i)); G.stroke(); circ(x + i * 4, y - 13 - Math.abs(i), 2.2, "#6dba5c"); }
    if (st === 3) { G.beginPath(); G.moveTo(x - 3.5, y - 1); G.lineTo(x + 3.5, y - 1); G.lineTo(x, y + 4); G.closePath(); G.fillStyle = "#f2913c"; G.fill(); }
  },
  tea(x, y, st) {
    if (st < 2) return sprout(x, y, 0.8 + st * 0.3);
    ball(x, y - 6, 7.5, st === 3 ? "#4e9c62" : "#5aa66a", 0.3);
    if (st === 3) for (const [dx, dy] of [[-4, -11], [3, -12], [6, -7], [-6, -6], [0, -9]]) ell(x + dx, y + dy, 2, 1.2, "#b6e58e");
  },
  lavender(x, y, st) {
    if (st < 2) return sprout(x, y, 0.8 + st * 0.3);
    for (let i = -2; i <= 2; i++) {
      const tx = x + i * 2.6, ty = y - 13 - (2 - Math.abs(i)) * 2;
      line([x, y], [tx, ty], "#8ea886", 1.1);
      if (st === 3) for (let k = 0; k < 4; k++) circ(tx, ty + k * 1.9, 1.7, k % 2 ? "#8f74c9" : "#a58ae0");
      else circ(tx, ty, 1.4, "#b8c9a8");
    }
  },
  sunflower(x, y, st) {
    if (st < 2) return sprout(x, y, 0.9 + st * 0.3);
    line([x, y], [x, y - 22], "#5f9b4a", 2);
    ell(x - 4, y - 9, 4, 2, "#6bb257"); ell(x + 4, y - 13, 4, 2, "#6bb257");
    if (st === 3) { for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; ell(x + Math.cos(a) * 5, y - 25 + Math.sin(a) * 5, 2.8, 2.8, i % 2 ? "#f7c637" : "#ffd654"); } circ(x, y - 25, 3.6, "#7b4f2e"); }
    else circ(x, y - 23, 3, "#9ac46a");
  },
  chamomile(x, y, st) {
    if (st < 2) return sprout(x, y, 0.8 + st * 0.3);
    ball(x, y - 4, 6, "#79b866", 0.2);
    if (st === 3) for (const [dx, dy] of [[-4, -8], [4, -9], [0, -11], [-6, -3], [6, -3]]) { for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; circ(x + dx + Math.cos(a) * 1.8, y + dy + Math.sin(a) * 1.8, 1.3, "#ffffff"); } circ(x + dx, y + dy, 1.2, "#f6c645"); }
  },
  mint(x, y, st) {
    if (st < 2) return sprout(x, y, 0.8 + st * 0.3);
    for (const [dx, dy] of [[-4, -3], [4, -4], [0, -8], [-3, -11], [3, -12]]) { ell(x + dx, y + dy, 4, 2.6, st === 3 ? "#5fcf8a" : "#78c58b"); line([x + dx - 2, y + dy], [x + dx + 2, y + dy], "rgba(255,255,255,.35)", 0.6); }
  },
  rose(x, y, st) {
    if (st < 2) return sprout(x, y, 0.8 + st * 0.3);
    ball(x, y - 6, 7, "#4f8f55", 0.2);
    if (st === 3) for (const [dx, dy] of [[-4, -9], [4, -8], [0, -12], [-1, -5]]) { ball(x + dx, y + dy, 2.8, "#e5577a", 0.35); circ(x + dx, y + dy, 1, "#b8325a"); }
  },
  pumpkin(x, y, st) {
    if (st < 2) return sprout(x, y, 0.9 + st * 0.3);
    for (const [dx, dy] of [[-6, -3], [6, -2], [0, -6]]) ell(x + dx, y + dy, 5.5, 3, "#5da25a");
    if (st === 3) { for (const dx of [-4, 4, 0]) ball(x + dx, y - 3, 5, "#f29a3a", 0.3); G.fillStyle = "#6b8b3c"; G.fillRect(x - 1, y - 10, 2, 3); }
  },
  starbloom(x, y, st) {
    if (st < 2) return sprout(x, y, 0.8 + st * 0.3);
    line([x, y], [x - 2, y - 13], "#6aa58a", 1.2); line([x, y], [x + 3, y - 11], "#6aa58a", 1.2);
    for (const [dx, dy] of [[-2, -14], [3, -12]]) {
      if (st === 3) { G.save(); G.globalAlpha = 0.35; circ(x + dx, y + dy, 6, "#f3d9ff"); G.restore(); }
      star(x + dx, y + dy, st === 3 ? 4 : 2.4, st === 3 ? "#e9c6ff" : "#c9d8c0", st === 3 ? "#fff1a8" : null);
    }
  },
};
function star(x, y, r, col, core) {
  G.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r; G.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  G.closePath(); G.fillStyle = col; G.fill(); if (core) circ(x, y, r * 0.3, core);
}
function drawCrop(id, st) {
  const spots = id === "pumpkin" ? [[0.5, 0.5]] : id === "sunflower" ? [[0.32, 0.4], [0.68, 0.42], [0.5, 0.72]] : CROP_SPOTS;
  for (const [u, v] of spots) { const [x, y] = P(u, v, 0); if (st === 0) { ell(x, y, 3.5, 1.8, "#7a5440"); circ(x, y - 1, 1.1, "#9ad07a"); } else CROP_DRAW[id](x, y, st); }
}

/* ---------- buildings ---------- */
function fenceRing(x0, y0, x1, y1, col = "#e9dcc8") {
  const posts = [];
  for (let t = x0; t <= x1 + 0.001; t += 0.25) posts.push([t, y0], [t, y1]);
  for (let t = y0 + 0.25; t < y1; t += 0.25) posts.push([x0, t], [x1, t]);
  posts.sort((a, b) => a[0] + a[1] - (b[0] + b[1]));
  line(P(x0, y0, 0.22), P(x1, y0, 0.22), shade(col, -0.2), 1.6); line(P(x0, y0, 0.22), P(x0, y1, 0.22), shade(col, -0.2), 1.6);
  for (const [px, py] of posts) box(px - 0.035, py - 0.035, 0, 0.07, 0.07, 0.3, col);
  line(P(x0, y1, 0.22), P(x1, y1, 0.22), col, 1.8); line(P(x1, y0, 0.22), P(x1, y1, 0.22), shade(col, -0.1), 1.8);
  line(P(x0, y1, 0.12), P(x1, y1, 0.12), col, 1.6); line(P(x1, y0, 0.12), P(x1, y1, 0.12), shade(col, -0.1), 1.6);
}
function awningY(yp, x0, x1, z, col1, col2, n = 6) {
  for (let i = 0; i < n; i++) {
    const a = x0 + ((x1 - x0) * i) / n, b = x0 + ((x1 - x0) * (i + 1)) / n;
    poly([P(a, yp, z), P(b, yp, z), P(b, yp + 0.28, z - 0.22), P(a, yp + 0.28, z - 0.22)], i % 2 ? col2 : col1, EDGE);
    const [cx, cy] = P((a + b) / 2, yp + 0.28, z - 0.22); G.beginPath(); G.arc(cx, cy, ((b - a) * HW) / 2.1, 0, Math.PI); G.fillStyle = i % 2 ? col2 : col1; G.fill();
  }
}
function flowersAt(u, v, cols) { const [x, y] = P(u, v, 0); for (let i = 0; i < 5; i++) { ball(x + (i - 2) * 3.5, y - 3 - (i % 2) * 2, 2.4, "#5fa55c", 0.2); circ(x + (i - 2) * 3.5, y - 5 - (i % 2) * 2, 1.8, cols[i % cols.length]); } }

const BUILD_DRAW = {
  home() {
    shadowAt(1, 1, 64, 30, 0.16);
    box(0.12, 0.12, 0, 1.76, 1.76, 0.16, "#d8c8b4");
    box(0.25, 0.25, 0.16, 1.5, 1.5, 0.95, "#fbeedb");
    for (const u of [0.25, 0.75, 1.25, 1.75]) faceY(1.752, u - 0.03, u + 0.03, 0.16, 1.11, "#b98d6f");
    faceY(1.752, 0.25, 1.75, 1.08, 1.12, "#b98d6f");
    windowY(1.75, 0.38, 0.66, 0.5, 0.85); windowY(1.75, 1.34, 1.62, 0.5, 0.85);
    faceY(1.755, 0.84, 1.16, 0.16, 0.86, "#a8705a"); faceY(1.758, 0.88, 1.12, 0.2, 0.82, "#b98068");
    const [kx, ky] = P(1.08, 1.76, 0.48); circ(kx, ky, 1.4, "#f2d08a");
    windowX(1.75, 0.7, 1.3, 0.5, 0.86);
    for (const [u, v] of [[0.52, 1.8], [1.48, 1.8]]) { box(u - 0.16, v - 0.04, 0.38, 0.32, 0.08, 0.08, "#9b6d55"); const [x, y] = P(u, v + 0.04, 0.47); for (let i = -2; i <= 2; i++) circ(x + i * 3.2, y - 1, 2.2, i % 2 ? "#f49ab4" : "#ffd3de"); }
    roofX(0.08, 0.1, 1.08, 1.84, 1.8, 0.78, "#e48a6f", shade("#fbeedb", -0.17));
    box(1.25, 0.42, 1.45, 0.24, 0.24, 0.62, "#c49a85"); box(1.21, 0.38, 2.05, 0.32, 0.32, 0.08, "#9d7766");
    for (const [u, v, z] of [[0.27, 1.76, 0.9], [0.3, 1.76, 0.7], [1.76, 1.72, 0.85], [1.76, 1.6, 0.6], [1.74, 1.4, 1.0]]) { const [x, y] = P(u, v, z); ball(x, y, 3.2, "#5fa35a", 0.2); circ(x + 1, y - 1, 1.6, "#ef7f9c"); }
    flowersAt(0.4, 1.95, ["#f6a5c0", "#fff1a1", "#c8b2f0"]); flowersAt(1.95, 0.6, ["#ffd3a1", "#f6a5c0"]);
  },
  board() {
    shadowAt(0.5, 0.5, 20, 8, 0.15);
    box(0.22, 0.48, 0, 0.07, 0.07, 0.95, "#8f6a52"); box(0.72, 0.48, 0, 0.07, 0.07, 0.95, "#8f6a52");
    box(0.16, 0.44, 0.38, 0.7, 0.08, 0.5, "#c9a27a");
    roofX(0.1, 0.36, 0.88, 0.82, 0.24, 0.14, "#7fae96");
  },
  teahouse() {
    shadowAt(1, 1, 64, 30, 0.16);
    box(0.05, 0.05, 0, 1.9, 1.9, 0.16, "#b88b67");
    for (let i = 0; i < 5; i++) line(P(0.05 + i * 0.47, 1.95, 0.16), P(0.05 + i * 0.47, 1.95, 0.02), "#99704f", 1);
    box(0.3, 0.3, 0.16, 1.4, 1.4, 0.74, "#f7eedb");
    for (let i = 1; i < 6; i++) { line(P(0.3 + i * 0.233, 1.702, 0.16), P(0.3 + i * 0.233, 1.702, 0.9), "#cdb594", 0.8); line(P(1.702, 0.3 + i * 0.233, 0.16), P(1.702, 0.3 + i * 0.233, 0.9), "#bba584", 0.8); }
    for (const z of [0.4, 0.65]) { line(P(0.3, 1.702, z), P(1.7, 1.702, z), "#cdb594", 0.8); line(P(1.702, 0.3, z), P(1.702, 1.7, z), "#bba584", 0.8); }
    faceY(1.705, 0.82, 1.18, 0.16, 0.78, "#fbe3a8");
    for (const [u, v] of [[0.12, 1.88], [1.88, 1.88], [1.88, 0.12]]) box(u - 0.05, v - 0.05, 0.16, 0.1, 0.1, 0.72, "#6f4f3f");
    pyramid(-0.05, -0.05, 0.88, 2.1, 2.1, 0.5, "#5b9a8b");
    box(0.72, 0.72, 1.32, 0.56, 0.56, 0.14, "#f7eedb");
    pyramid(0.6, 0.6, 1.46, 0.8, 0.8, 0.36, "#5b9a8b");
    const [fx, fy] = P(1, 1, 1.86); circ(fx, fy, 2.4, "#f2c45c");
    for (const [u, v] of [[0.1, 2.0], [2.0, 2.0]]) { const [x, y] = P(u, v, 0.78); line([x, y - 6], [x, y - 2], "#4b3a33", 1); ell(x, y + 3, 3.6, 5, "#ee8064"); ell(x, y + 3, 2, 3.4, "#ffb19a"); }
    flowersAt(2.05, 1.2, ["#c9b3f0", "#ffd9e4"]);
  },
  beehive() {
    shadowAt(0.5, 0.5, 22, 10, 0.16);
    for (const [u, v] of [[0.3, 0.3], [0.62, 0.3], [0.3, 0.62], [0.62, 0.62]]) box(u, v, 0, 0.08, 0.08, 0.14, "#8f6a52");
    box(0.24, 0.24, 0.14, 0.52, 0.52, 0.22, "#f2c25a"); box(0.24, 0.24, 0.36, 0.52, 0.52, 0.22, "#fbe5ae"); box(0.24, 0.24, 0.58, 0.52, 0.52, 0.18, "#f2c25a");
    faceY(0.762, 0.38, 0.62, 0.17, 0.21, "#5c3f2b");
    pyramid(0.18, 0.18, 0.76, 0.64, 0.64, 0.2, "#c98d5a");
    flowersAt(0.85, 0.95, ["#a58ae0", "#c9b3f0"]); flowersAt(0.1, 0.95, ["#a58ae0"]);
  },
  florist() {
    shadowAt(1, 1, 64, 30, 0.16);
    box(0.15, 0.15, 0, 1.7, 1.7, 0.12, "#e8d9cb");
    box(0.3, 0.3, 0.12, 1.4, 1.4, 0.86, "#fde9ee");
    windowY(1.7, 0.42, 1.0, 0.2, 0.68, "#fff4df"); faceY(1.705, 1.18, 1.5, 0.12, 0.7, "#c7869a");
    for (const [u, c] of [[0.5, "#f6a5c0"], [0.7, "#ffe08a"], [0.9, "#c8b2f0"]]) { const [x, y] = P(u, 1.71, 0.3); ball(x, y, 3.4, c, 0.3); }
    windowX(1.7, 0.6, 1.3, 0.42, 0.78, "#fff4df");
    awningY(1.7, 0.3, 1.7, 0.98, "#ee8fa6", "#fff6f1");
    roofX(0.18, 0.2, 0.98, 1.64, 1.6, 0.6, "#a493c0", shade("#fde9ee", -0.17));
    for (const [u, cols] of [[0.35, ["#f6a5c0", "#ff8fa7"]], [0.75, ["#ffe08a", "#ffd04a"]], [1.15, ["#c8b2f0", "#a58ae0"]], [1.55, ["#ffffff", "#ffd3de"]]]) { cyl(u, 1.98, 0, 0.16, 0.1, "#9db7c4"); const [x, y] = P(u, 1.98, 0.2); for (let i = 0; i < 5; i++) ball(x + (i - 2) * 2.6, y - (i % 2) * 2.5, 2.6, cols[i % 2], 0.3); }
  },
  coop() {
    shadowAt(1, 1, 60, 28, 0.12);
    box(0.02, 0.02, 0, 1.96, 1.96, 0.02, "#c9d98f", { line: false });
    box(0.15, 0.15, 0, 0.95, 0.8, 0.58, "#f3e3c8");
    faceY(0.952, 0.5, 0.78, 0.0, 0.34, "#8d5f48");
    windowX(1.1, 0.35, 0.65, 0.3, 0.5, "#fde7b0");
    roofX(0.08, 0.08, 0.58, 1.09, 0.94, 0.34, "#d9705b", shade("#f3e3c8", -0.17));
    poly([P(0.52, 0.95, 0.02), P(0.76, 0.95, 0.02), P(0.76, 1.3, 0), P(0.52, 1.3, 0)], "#b28a62");
    for (const [u, v] of [[1.5, 0.4], [1.6, 0.6]]) { const [x, y] = P(u, v, 0); ell(x, y, 8, 3.4, "#e6c46a"); }
    fenceRing(0.05, 0.05, 1.95, 1.95);
  },
  bakery() {
    shadowAt(1, 1, 64, 30, 0.16);
    box(0.12, 0.12, 0, 1.76, 1.76, 0.14, "#d9c3a6");
    box(0.25, 0.25, 0.14, 1.5, 1.5, 0.92, "#fff0cc");
    windowY(1.75, 0.38, 1.02, 0.24, 0.7, "#ffe6b0");
    for (const [u, c] of [[0.52, "#c98a4b"], [0.7, "#e0a86a"], [0.88, "#b9773f"]]) { const [x, y] = P(u, 1.76, 0.32); ell(x, y, 3.6, 2.4, c); }
    faceY(1.755, 1.18, 1.52, 0.14, 0.78, "#8c5a45");
    windowX(1.75, 0.5, 0.9, 0.5, 0.85); windowX(1.75, 1.1, 1.5, 0.5, 0.85);
    awningY(1.75, 0.25, 1.75, 0.96, "#8cc7ad", "#fff6e6");
    roofX(0.08, 0.1, 1.06, 1.84, 1.8, 0.72, "#b9735d", shade("#fff0cc", -0.17));
    box(0.42, 0.42, 1.3, 0.28, 0.28, 0.8, "#c66d57"); box(0.38, 0.38, 2.08, 0.36, 0.36, 0.08, "#8f4f40");
    const [sx, sy] = P(1.88, 1.4, 0.9); circ(sx, sy, 7, "#8c5a45"); circ(sx, sy, 5.6, "#fff0cc"); ball(sx, sy + 0.5, 3.4, "#d39a5c", 0.35);
  },
  workshop() {
    shadowAt(1, 1, 64, 30, 0.16);
    box(0.12, 0.12, 0, 1.76, 1.76, 0.12, "#c8b8a5");
    box(0.25, 0.25, 0.12, 1.5, 1.2, 0.85, "#e3c39b");
    for (const u of [0.25, 0.75, 1.25, 1.75]) faceY(1.452, u - 0.035, u + 0.035, 0.12, 0.97, "#9a6f52");
    faceY(1.452, 0.25, 1.75, 0.5, 0.56, "#9a6f52");
    faceY(1.455, 0.85, 1.32, 0.12, 0.76, "#6f4f3f"); faceY(1.458, 0.9, 1.27, 0.16, 0.72, "#8b634d");
    windowX(1.75, 0.5, 0.95, 0.45, 0.8);
    roofX(0.1, 0.1, 0.97, 1.8, 1.5, 0.66, "#7f92a8", shade("#e3c39b", -0.17));
    for (let i = 0; i < 3; i++) for (let k = 0; k < 3 - i; k++) { const [x, y] = P(1.95, 1.55 + k * 0.17 + i * 0.085, 0.1 + i * 0.14); circ(x, y, 4.2, "#a8794f"); circ(x, y, 3, "#e8c28f"); circ(x, y, 1, "#b88758"); }
    box(0.35, 1.6, 0, 0.6, 0.25, 0.28, "#b48760");
  },
  greenhouse() {
    shadowAt(1, 1, 64, 30, 0.14);
    box(0.15, 0.15, 0, 1.7, 1.7, 0.16, "#e3ddd2");
    for (const [u, v, c] of [[0.5, 0.5, "#5fae66"], [1.1, 0.45, "#7fca6c"], [0.55, 1.2, "#6cbb72"], [1.3, 1.25, "#f3a6b8"], [0.95, 0.9, "#5fae66"]]) { const [x, y] = P(u, v, 0.2); ball(x, y - 6, 9, c, 0.3); }
    const glass = "rgba(214,244,248,.42)", fr = "#ffffff";
    poly([P(0.25, 1.75, 0.95), P(1.75, 1.75, 0.95), P(1.75, 1.75, 0.16), P(0.25, 1.75, 0.16)], glass, fr, 1.4);
    poly([P(1.75, 0.25, 0.95), P(1.75, 1.75, 0.95), P(1.75, 1.75, 0.16), P(1.75, 0.25, 0.16)], "rgba(196,232,240,.38)", fr, 1.4);
    for (let i = 1; i < 4; i++) { line(P(0.25 + i * 0.375, 1.75, 0.16), P(0.25 + i * 0.375, 1.75, 0.95), fr, 1.2); line(P(1.75, 0.25 + i * 0.375, 0.16), P(1.75, 0.25 + i * 0.375, 0.95), fr, 1.2); }
    line(P(0.25, 1.75, 0.55), P(1.75, 1.75, 0.55), fr, 1); line(P(1.75, 0.25, 0.55), P(1.75, 1.75, 0.55), fr, 1);
    const ym = 1;
    poly([P(0.2, 0.2, 0.95), P(1.8, 0.2, 0.95), P(1.8, ym, 1.6), P(0.2, ym, 1.6)], "rgba(230,250,252,.5)", fr, 1.4);
    poly([P(1.8, 0.2, 0.95), P(1.8, 1.8, 0.95), P(1.8, ym, 1.6)], "rgba(210,240,246,.45)", fr, 1.4);
    poly([P(0.2, ym, 1.6), P(1.8, ym, 1.6), P(1.8, 1.8, 0.95), P(0.2, 1.8, 0.95)], "rgba(222,248,250,.48)", fr, 1.4);
    for (let i = 1; i < 4; i++) line(P(0.2 + i * 0.4, ym, 1.6), P(0.2 + i * 0.4, 1.8, 0.95), fr, 1.1);
    line(P(0.5, 1.76, 0.85), P(0.8, 1.76, 0.3), "rgba(255,255,255,.8)", 2.2);
  },
  goatpen() {
    shadowAt(1, 1, 60, 28, 0.12);
    box(0.02, 0.02, 0, 1.96, 1.96, 0.02, "#b9d77e", { line: false });
    box(0.15, 0.15, 0, 0.8, 0.8, 0.5, "#c49a76");
    faceY(0.952, 0.32, 0.78, 0, 0.36, "#5b4134");
    roofY(0.08, 0.08, 0.5, 0.94, 0.94, 0.34, "#8fa36a", shade("#c49a76", 0.05));
    box(1.3, 0.25, 0, 0.45, 0.3, 0.26, "#e9c766");
    for (let i = 0; i < 4; i++) line(P(1.3, 0.55, 0.06 + i * 0.06), P(1.75, 0.55, 0.06 + i * 0.06), "#c9a54a", 0.8);
    fenceRing(0.05, 0.05, 1.95, 1.95, "#f0e6d6");
  },
  meditation() {
    shadowAt(1, 1, 60, 28, 0.08);
    box(0.05, 0.05, 0, 1.9, 1.9, 0.06, "#efe5d1");
    G.save(); G.strokeStyle = "rgba(160,140,110,.45)"; G.lineWidth = 0.9;
    for (let i = 1; i < 8; i++) { G.beginPath(); for (let k = 0; k <= 20; k++) { const u = 0.1 + (k / 20) * 1.8, v = 0.1 + i * 0.22 + Math.sin(u * 3) * 0.05; const [x, y] = P(u, v, 0.06); k ? G.lineTo(x, y) : G.moveTo(x, y); } G.stroke(); }
    G.restore();
    for (const [u, v, r] of [[0.55, 0.55, 9], [0.75, 0.42, 6], [1.35, 1.35, 8]]) { const [x, y] = P(u, v, 0.06); ell(x, y + 2, r + 4, r * 0.45 + 2, "rgba(150,130,100,.3)"); ball(x, y - r * 0.35, r, "#a9a3b5", 0.35); ell(x - 2, y - r * 0.8, r * 0.4, r * 0.2, "#8fbf72"); }
    const [px, py] = P(1.45, 0.55, 0.06); ell(px, py, 18, 8, "#7cc6c9"); ell(px - 3, py - 1, 10, 3.5, "rgba(255,255,255,.4)");
    box(0.35, 1.45, 0.06, 0.18, 0.18, 0.3, "#c9c2b7"); box(0.3, 1.4, 0.36, 0.28, 0.28, 0.16, "#ddd6cc"); windowY(1.68, 0.38, 0.5, 0.4, 0.48, "#ffe3a3", "#b9b1a6"); pyramid(0.26, 1.36, 0.52, 0.36, 0.36, 0.16, "#b8b0a6");
    const [bx, by] = P(1.0, 1.0, 0.06); G.strokeStyle = "#7a5843"; G.lineWidth = 2.4; G.beginPath(); G.moveTo(bx, by); G.quadraticCurveTo(bx - 8, by - 10, bx + 2, by - 18); G.stroke();
    for (const [dx, dy, r] of [[-9, -12, 6], [6, -19, 7], [-2, -24, 5]]) ell(bx + dx, by + dy, r * 1.4, r * 0.7, "#5d9d6a");
  },
  bathhouse() {
    shadowAt(1, 1, 64, 30, 0.16);
    box(0.05, 0.05, 0, 1.9, 1.9, 0.1, "#cfc5b6");
    box(0.15, 0.15, 0.1, 1.7, 0.75, 0.8, "#8b6a56");
    for (let i = 1; i < 7; i++) line(P(0.15 + i * 0.243, 0.902, 0.1), P(0.15 + i * 0.243, 0.902, 0.9), "#77584a", 0.8);
    faceY(0.905, 0.75, 1.25, 0.1, 0.7, "#f2e6cf"); faceY(0.907, 0.98, 1.02, 0.1, 0.7, "#c7b393");
    roofX(0.05, 0.05, 0.9, 1.9, 0.95, 0.5, "#5b6f92", shade("#8b6a56", -0.17));
    cyl(1.05, 1.42, 0.1, 0.32, 0.5, "#a47a5a", "#9fe0d6");
    const [x, y] = P(1.05, 1.42, 0.32); ell(x - 5, y - 2, 12, 4, "rgba(255,255,255,.35)");
    for (const [u, v] of [[0.3, 1.8], [1.8, 1.0]]) { const [px, py] = P(u, v, 0.1); ball(px, py - 5, 6, "#aaa3b4", 0.35); }
  },
  sign() {
    shadowAt(0.5, 0.5, 14, 6, 0.15);
    box(0.46, 0.46, 0, 0.08, 0.08, 0.8, "#8f6a52");
    box(0.2, 0.42, 0.42, 0.62, 0.08, 0.32, "#d3ab7d");
    faceY(0.502, 0.26, 0.76, 0.48, 0.68, "#e7c597");
  },
};
function drawLighthouse(stage) {
  shadowAt(1, 1, 60, 28, 0.18);
  box(0.15, 0.15, 0, 1.7, 1.7, 0.28, "#b9b2a8");
  box(1.2, 1.3, 0.28, 0.5, 0.42, 0.42, "#ece3d6"); roofX(1.16, 1.26, 0.7, 0.58, 0.5, 0.2, "#e9816c");
  if (stage === 0) {
    cyl(0.95, 0.95, 0.28, 2.2, 0.56, "#cfc8bd");
    const [x, y] = P(0.95, 0.95, 2.2); G.beginPath(); G.moveTo(x - 20, y); G.lineTo(x - 12, y - 10); G.lineTo(x - 4, y - 3); G.lineTo(x + 4, y - 14); G.lineTo(x + 12, y - 4); G.lineTo(x + 20, y - 8); G.lineTo(x + 20, y + 3); G.lineTo(x - 20, y + 3); G.fillStyle = "#cfc8bd"; G.fill();
    ell(x, y + 1, 16, 6, "#6f6873");
    for (let i = 0; i < 16; i++) { const [vx, vy] = P(0.95 + (Math.sin(i * 7) * 0.4), 1.5, 0.3 + i * 0.11); ball(vx, vy, 3.2, i % 3 ? "#6aa860" : "#7fbf6e", 0.2); }
    return;
  }
  const segs = 6, zTop = 3.6;
  for (let i = 0; i < segs; i++) { const z0 = 0.28 + ((zTop - 0.28) * i) / segs, z1 = 0.28 + ((zTop - 0.28) * (i + 1)) / segs; cyl(0.95, 0.95, z0, z1, 0.58 - i * 0.035, i % 2 ? "#e9816c" : "#fbf6ee"); }
  cyl(0.95, 0.95, zTop, zTop + 0.08, 0.5, "#5c5a6e");
  windowY(1.36, 0.82, 0.98, 1.2, 1.45, "#3d3b52", "#5c5a6e");
  if (stage >= 2) {
    cyl(0.95, 0.95, zTop + 0.08, zTop + 0.6, 0.32, "#cde9f2", stage === 3 ? "#fff4c4" : "#d6eef5");
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; const [x0, y0] = P(0.95 + Math.cos(a) * 0.32, 0.95 + Math.sin(a) * 0.32, zTop + 0.08); if (Math.sin(a + 0.8) > -0.2) line([x0, y0], [x0, y0 - 0.52 * ZS], "#5c5a6e", 1.2); }
    pyramid(0.6, 0.6, zTop + 0.6, 0.7, 0.7, 0.42, "#e9816c");
    const [fx, fy] = P(0.95, 0.95, zTop + 1.08); circ(fx, fy, 2.6, "#f2c45c");
  } else {
    for (let i = 0; i < 4; i++) { const [x, y] = P(0.95 + (i - 1.5) * 0.15, 0.95, zTop + 0.1); line([x, y], [x, y - 14], "#9b7b61", 2); }
  }
}
const DECOR_DRAW = {
  flowerbed() { box(0.15, 0.15, 0, 0.7, 0.7, 0.1, "#9b7058"); const R = rnd(7); const cols = ["#f6a5c0", "#fff1a1", "#c8b2f0", "#ffb69a", "#ffffff"]; for (let i = 0; i < 9; i++) { const u = 0.25 + (i % 3) * 0.25, v = 0.25 + Math.floor(i / 3) * 0.25; const [x, y] = P(u, v, 0.1); ball(x, y - 3, 3.6, "#5fa55c", 0.2); ball(x, y - 6, 2.6, cols[Math.floor(R() * 5)], 0.35); } },
  lantern() { shadowAt(0.5, 0.5, 14, 6); box(0.36, 0.36, 0, 0.28, 0.28, 0.1, "#bdb6ab"); box(0.44, 0.44, 0.1, 0.12, 0.12, 0.42, "#cfc8bd"); box(0.32, 0.32, 0.52, 0.36, 0.36, 0.26, "#ddd6cc"); windowY(0.68, 0.4, 0.6, 0.56, 0.74, "#ffe39e", "#b6aea3"); windowX(0.68, 0.4, 0.6, 0.56, 0.74, "#f8d68c", "#a59d93"); pyramid(0.24, 0.24, 0.78, 0.52, 0.52, 0.24, "#b5ada2"); },
  bench() { shadowAt(0.5, 0.5, 20, 8); for (const [u, v] of [[0.2, 0.35], [0.75, 0.35], [0.2, 0.62], [0.75, 0.62]]) box(u, v, 0, 0.06, 0.06, 0.24, "#7d5a46"); box(0.16, 0.3, 0.24, 0.68, 0.38, 0.05, "#c9946a"); box(0.16, 0.28, 0.29, 0.68, 0.06, 0.3, "#b88559"); },
  birdbath() { shadowAt(0.5, 0.5, 14, 6); cyl(0.5, 0.5, 0, 0.1, 0.2, "#cfc8bd"); cyl(0.5, 0.5, 0.1, 0.5, 0.08, "#ddd6cc"); cyl(0.5, 0.5, 0.5, 0.62, 0.3, "#e4ddd3", "#8fd3dc"); const [x, y] = P(0.5, 0.5, 0.62); ell(x - 3, y - 1, 5, 2, "rgba(255,255,255,.5)"); ball(x + 8, y - 6, 3.4, "#8fb6e8", 0.4); circ(x + 10, y - 7, 0.8, "#2f2a3a"); },
  arch() { shadowAt(0.5, 0.5, 18, 7); box(0.1, 0.45, 0, 0.1, 0.1, 1.2, "#f0e6d6"); box(0.8, 0.45, 0, 0.1, 0.1, 1.2, "#f0e6d6"); G.strokeStyle = "#f0e6d6"; G.lineWidth = 3; const a = P(0.15, 0.5, 1.2), b = P(0.85, 0.5, 1.2); G.beginPath(); G.moveTo(a[0], a[1]); G.quadraticCurveTo((a[0] + b[0]) / 2, a[1] - 24, b[0], b[1]); G.stroke(); const R = rnd(3); for (let i = 0; i < 22; i++) { const t = i / 21; let x, y; if (t < 0.3) { [x, y] = P(0.15, 0.55, (t / 0.3) * 1.2); } else if (t > 0.7) { [x, y] = P(0.85, 0.55, ((1 - t) / 0.3) * 1.2); } else { const s = (t - 0.3) / 0.4; x = a[0] + (b[0] - a[0]) * s; y = a[1] + (b[1] - a[1]) * s - Math.sin(s * Math.PI) * 12; } ball(x + (R() - 0.5) * 4, y, 3.2, "#5fa35a", 0.2); if (i % 2) circ(x + (R() - 0.5) * 4, y - 1, 2, R() < 0.5 ? "#ef7f9c" : "#ffd3de"); } },
  fairylights() { for (const u of [0.15, 0.85]) box(u - 0.04, 0.46, 0, 0.08, 0.08, 1.05, "#8f6a52"); },
  mushrooms() { const [x, y] = P(0.5, 0.5, 0); ell(x, y, 20, 9, "rgba(90,160,120,.35)"); for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2, mx = x + Math.cos(a) * 15, my = y + Math.sin(a) * 6.5, h = 6 + (i % 3) * 2; G.fillStyle = "#f6efe0"; G.fillRect(mx - 1.2, my - h, 2.4, h); G.beginPath(); G.ellipse(mx, my - h, 4.6, 3.2, 0, Math.PI, 0); G.fillStyle = i % 2 ? "#e6735f" : "#9feede"; G.fill(); circ(mx - 1.5, my - h - 1.5, 0.8, "#ffffff"); } },
  umbrella() { shadowAt(0.5, 0.5, 26, 11, 0.15); poly([P(0.2, 0.45, 0.01), P(0.8, 0.45, 0.01), P(0.8, 0.8, 0.01), P(0.2, 0.8, 0.01)], "#9fd6e6"); for (let i = 0; i < 3; i++) poly([P(0.2 + i * 0.2, 0.45, 0.012), P(0.3 + i * 0.2, 0.45, 0.012), P(0.3 + i * 0.2, 0.8, 0.012), P(0.2 + i * 0.2, 0.8, 0.012)], "#fff6ea"); const [x, y] = P(0.5, 0.4, 0); line([x, y], [x, y - 44], "#8f6a52", 2); for (let i = 0; i < 8; i++) { const a0 = (i / 8) * Math.PI * 2, a1 = ((i + 1) / 8) * Math.PI * 2; G.beginPath(); G.moveTo(x, y - 50); G.lineTo(x + Math.cos(a0) * 26, y - 38 + Math.sin(a0) * 10); G.lineTo(x + Math.cos(a1) * 26, y - 38 + Math.sin(a1) * 10); G.closePath(); G.fillStyle = i % 2 ? "#ffffff" : "#f08a6c"; G.fill(); } },
  hammock() { shadowAt(0.5, 0.5, 20, 8); for (const u of [0.12, 0.88]) box(u - 0.05, 0.45, 0, 0.1, 0.1, 0.75, "#8f6a52"); const a = P(0.12, 0.5, 0.65), b = P(0.88, 0.5, 0.65); G.beginPath(); G.moveTo(a[0], a[1]); G.quadraticCurveTo((a[0] + b[0]) / 2, a[1] + 26, b[0], b[1]); G.quadraticCurveTo((a[0] + b[0]) / 2, a[1] + 14, a[0], a[1]); G.fillStyle = "#f3b38f"; G.fill(); G.strokeStyle = "#e18e6a"; G.lineWidth = 1; G.stroke(); for (let i = 1; i < 5; i++) { const t = i / 5; const [x, y] = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + Math.sin(t * Math.PI) * 17]; circ(x, y, 1.2, "#fff3e6"); } },
  bonsai() { shadowAt(0.5, 0.5, 14, 6); box(0.3, 0.3, 0, 0.4, 0.4, 0.14, "#5f7fa0"); const [x, y] = P(0.5, 0.5, 0.14); G.strokeStyle = "#6f4f3f"; G.lineWidth = 2.6; G.beginPath(); G.moveTo(x, y); G.quadraticCurveTo(x + 9, y - 8, x - 2, y - 16); G.stroke(); for (const [dx, dy, r] of [[-8, -15, 6], [7, -12, 5], [-1, -22, 6]]) ell(x + dx, y + dy, r * 1.5, r * 0.75, "#5d9d6a"); },
  fountain() { shadowAt(0.5, 0.5, 26, 11, 0.15); cyl(0.5, 0.5, 0, 0.22, 0.44, "#ddd6cc", "#8fd3dc"); cyl(0.5, 0.5, 0.22, 0.55, 0.08, "#e4ddd3"); cyl(0.5, 0.5, 0.55, 0.65, 0.22, "#e9e3da", "#a6e0e6"); cyl(0.5, 0.5, 0.65, 0.85, 0.05, "#efe9e0"); },
  chimepost() { shadowAt(0.5, 0.5, 12, 5); box(0.46, 0.46, 0, 0.08, 0.08, 1.1, "#8f6a52"); box(0.22, 0.46, 1.04, 0.56, 0.08, 0.05, "#8f6a52"); },
  crystals() { drawCrystalNode(); },
  koi() { const [x, y] = P(0.5, 0.5, 0); ell(x, y, 30, 14, "#c9c2b7"); ell(x, y, 26, 11.5, "#6fc1cb"); ell(x - 5, y - 3, 12, 4, "rgba(255,255,255,.3)"); for (const [dx, dy] of [[-14, 4], [12, -5], [18, 3]]) { ell(x + dx, y + dy, 5, 3, "#6bb06a"); circ(x + dx + 2, y + dy - 1, 1.6, "#ffd3de"); } },
  starlantern() { shadowAt(0.5, 0.5, 12, 5); box(0.46, 0.46, 0, 0.08, 0.08, 0.95, "#5c5a6e"); },
  cottage() { shadowAt(0.5, 0.5, 26, 12, 0.15); box(0.15, 0.2, 0, 0.7, 0.6, 0.5, "#fdf0e0"); windowY(0.8, 0.25, 0.42, 0.2, 0.36); faceY(0.802, 0.55, 0.72, 0, 0.36, "#a8705a"); windowX(0.85, 0.35, 0.6, 0.22, 0.38); roofX(0.1, 0.14, 0.5, 0.8, 0.72, 0.36, "#f0a2b4", shade("#fdf0e0", -0.17)); },
  boat() { const [x, y] = P(0.5, 0.5, 0); G.beginPath(); G.moveTo(x - 24, y - 6); G.quadraticCurveTo(x, y + 12, x + 24, y - 10); G.lineTo(x + 18, y - 2); G.quadraticCurveTo(x, y + 6, x - 18, y); G.closePath(); G.fillStyle = "#b9805f"; G.fill(); line([x - 2, y], [x - 2, y - 40], "#7a5843", 2); G.beginPath(); G.moveTo(x, y - 40); G.lineTo(x + 18, y - 10); G.lineTo(x, y - 8); G.closePath(); G.fillStyle = "#f6efe3"; G.fill(); },
};

/* ---------- Calmlings ---------- */
function drawTuft(c, kind, x, y, s, t, ch) {
  const g = c;
  const sv = [G]; G = g;
  switch (kind) {
    case "sun": { for (let i = 0; i < 7; i++) { const a = -Math.PI + (i / 6) * Math.PI; line([x + Math.cos(a) * 5 * s, y - 4 * s + Math.sin(a) * 5 * s], [x + Math.cos(a) * 8 * s, y - 4 * s + Math.sin(a) * 8 * s], "#ffb347", 1.8 * s); } ball(x, y - 4 * s, 4.2 * s, "#ffd166", 0.4); break; }
    case "swirl": { G.beginPath(); G.moveTo(x, y); G.bezierCurveTo(x - 6 * s, y - 6 * s, x + 2 * s, y - 13 * s, x + 6 * s, y - 8 * s); G.bezierCurveTo(x + 8 * s, y - 5 * s, x + 4 * s, y - 3 * s, x + 2 * s, y - 6 * s); G.strokeStyle = ch.deep; G.lineWidth = 2.8 * s; G.lineCap = "round"; G.stroke(); circ(x - 5 * s, y - 9 * s, 1.8 * s, "#8fc7e8"); break; }
    case "leaf": { G.save(); G.translate(x, y); G.rotate(-0.4 + Math.sin(t * 1.6) * 0.08); G.beginPath(); G.moveTo(0, 0); G.quadraticCurveTo(-8 * s, -7 * s, 0, -15 * s); G.quadraticCurveTo(8 * s, -7 * s, 0, 0); G.fillStyle = "#68b46f"; G.fill(); line([0, 0], [0, -13 * s], "#a9e0a0", 1 * s); circ(-2 * s, -8 * s, 1.2 * s, "rgba(255,250,200,.8)"); G.restore(); break; }
    case "bobble": { ell(x, y + 1 * s, 9 * s, 3.5 * s, "#e9a7a0"); for (let i = -2; i <= 2; i++) line([x + i * 3.2 * s, y - 1.5 * s], [x + i * 3.2 * s, y + 3.5 * s], "#d88f88", 1 * s); ball(x, y - 4 * s, 3.8 * s, "#fff7ef", 0.2); break; }
    case "lotus": { for (const [a, col] of [[-0.7, "#e7c3f2"], [0.7, "#e7c3f2"], [0, "#f6dcff"]]) { G.save(); G.translate(x, y); G.rotate(a); G.beginPath(); G.moveTo(0, 0); G.quadraticCurveTo(-4 * s, -6 * s, 0, -11 * s); G.quadraticCurveTo(4 * s, -6 * s, 0, 0); G.fillStyle = col; G.fill(); G.restore(); } break; }
    case "cloud": { const yy = y - 5 * s + Math.sin(t * 2) * 1.2 * s; ball(x - 4 * s, yy + 1 * s, 3.6 * s, "#ffffff", 0.1); ball(x + 4 * s, yy + 1 * s, 3.4 * s, "#ffffff", 0.1); ball(x, yy - 1.5 * s, 4.4 * s, "#ffffff", 0.1); break; }
    case "steam": { G.strokeStyle = "rgba(255,255,255,.95)"; G.lineWidth = 2.2 * s; G.lineCap = "round"; for (const dx of [-3, 3]) { G.beginPath(); for (let k = 0; k <= 8; k++) { const yy = y - k * 1.5 * s, xx = x + dx * s + Math.sin(k * 0.9 + t * 3 + dx) * 2 * s; k ? G.lineTo(xx, yy) : G.moveTo(xx, yy); } G.stroke(); } break; }
    case "blossom": { for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 - Math.PI / 2; ell(x + Math.cos(a) * 3.6 * s, y - 5 * s + Math.sin(a) * 3.6 * s, 3 * s, 3 * s, "#ffd6e5"); } circ(x, y - 5 * s, 2 * s, "#f6c645"); break; }
    case "peak": { G.beginPath(); G.moveTo(x - 7 * s, y + 1 * s); G.lineTo(x, y - 10 * s); G.lineTo(x + 7 * s, y + 1 * s); G.closePath(); G.fillStyle = "#8a97ad"; G.fill(); G.beginPath(); G.moveTo(x - 3 * s, y - 5 * s); G.lineTo(x, y - 10 * s); G.lineTo(x + 3 * s, y - 5 * s); G.lineTo(x + 1 * s, y - 6 * s); G.lineTo(x - 1 * s, y - 4.5 * s); G.closePath(); G.fillStyle = "#ffffff"; G.fill(); break; }
    case "drop": { G.beginPath(); G.moveTo(x, y - 12 * s); G.quadraticCurveTo(x + 6 * s, y - 4 * s, x, y); G.quadraticCurveTo(x - 6 * s, y - 4 * s, x, y - 12 * s); G.fillStyle = "#7fd4e6"; G.fill(); circ(x - 1.5 * s, y - 5 * s, 1.2 * s, "rgba(255,255,255,.8)"); break; }
    case "star": { const k = 1 + Math.sin(t * 3) * 0.08; G.save(); G.globalAlpha = 0.35; circ(x, y - 6 * s, 7 * s * k, "#fff3b0"); G.restore(); star(x, y - 6 * s, 6 * s * k, "#ffd86b", "#fff7d6"); break; }
    case "moon": { G.beginPath(); G.arc(x, y - 6 * s, 6 * s, 0, 7); G.fillStyle = "#ffe9a8"; G.fill(); G.beginPath(); G.arc(x + 3 * s, y - 8 * s, 5.4 * s, 0, 7); G.fillStyle = ch.body; G.fill(); break; }
  }
  [G] = sv;
}
/* Calmlings: soft gumdrop bodies, big glossy eyes, rosy cheeks. No noses, no tails. */
function drawCalmling(c, x, y, ch, t, o = {}) {
  const s = o.scale || 1, w = 26 * s, h = 28 * s;
  const breathe = Math.sin(t * 2.2 + (o.phase || 0)) * 0.025, hop = o.hop || 0;
  const sq = o.squash != null ? o.squash : breathe;
  const sv = [G]; G = c;
  if (!o.noShadow) { G.save(); G.globalAlpha = 0.22 - hop * 0.008; ell(x, y, 12 * s * (1 - hop * 0.02), 4.5 * s, "#2b3a3a"); G.restore(); }
  G.save(); G.translate(x, y - hop * s); G.scale(1 - sq * 0.6, 1 + sq);
  // feet
  ell(-6 * s, -1 * s, 4.6 * s, 2.6 * s, ch.deep); ell(6 * s, -1 * s, 4.6 * s, 2.6 * s, ch.deep);
  // body
  G.beginPath();
  G.moveTo(-w * 0.5, -h * 0.2);
  G.bezierCurveTo(-w * 0.56, -h * 0.78, -w * 0.3, -h * 1.0, 0, -h);
  G.bezierCurveTo(w * 0.3, -h * 1.0, w * 0.56, -h * 0.78, w * 0.5, -h * 0.2);
  G.quadraticCurveTo(w * 0.5, -h * 0.02, w * 0.3, -h * 0.02);
  G.lineTo(-w * 0.3, -h * 0.02);
  G.quadraticCurveTo(-w * 0.5, -h * 0.02, -w * 0.5, -h * 0.2);
  const gr = G.createRadialGradient(-w * 0.18, -h * 0.72, 2 * s, 0, -h * 0.45, w * 0.75);
  gr.addColorStop(0, shade(ch.body, 0.35)); gr.addColorStop(0.55, ch.body); gr.addColorStop(1, ch.deep);
  G.fillStyle = gr; G.fill();
  G.strokeStyle = rgba(ch.deep, 0.7); G.lineWidth = 1 * s; G.stroke();
  if (ch.visitor) { for (const [dx, dy] of [[-7, -18], [6, -22], [9, -10], [-9, -8], [2, -6]]) circ(dx * s, dy * s, 0.9 * s, "rgba(255,248,210,.9)"); }
  G.save(); G.globalAlpha = 0.35; ell(-w * 0.2, -h * 0.78, w * 0.16, h * 0.09, "#ffffff"); G.restore();
  // arms
  const wave = o.wave ? Math.sin(t * 12) * 0.5 : 0;
  G.save(); G.translate(-w * 0.48, -h * 0.34); G.rotate(0.5 + (o.wave ? -1.6 + wave : Math.sin(t * 2.2) * 0.08)); ell(0, 3 * s, 3 * s, 5 * s, ch.deep); G.restore();
  G.save(); G.translate(w * 0.48, -h * 0.34); G.rotate(-0.5 - Math.sin(t * 2.2) * 0.08); ell(0, 3 * s, 3 * s, 5 * s, ch.deep); G.restore();
  // face
  const look = o.look || 0, ey = -h * 0.52, blink = o.blink ? 0.12 : 1;
  for (const sx of [-1, 1]) {
    ell(sx * w * 0.18 + look, ey, 2.9 * s, 3.7 * s * blink, "#2f2a3a");
    if (blink > 0.5) { circ(sx * w * 0.18 + look - 0.9 * s, ey - 1.4 * s, 1.15 * s, "#ffffff"); circ(sx * w * 0.18 + look + 1 * s, ey + 1.2 * s, 0.55 * s, "rgba(255,255,255,.8)"); }
  }
  G.save(); G.globalAlpha = 0.5; ell(-w * 0.31, -h * 0.38, 3.6 * s, 2.1 * s, "#ff8f9e"); ell(w * 0.31, -h * 0.38, 3.6 * s, 2.1 * s, "#ff8f9e"); G.restore();
  G.beginPath(); if (o.happy) G.arc(look, -h * 0.42, 2.6 * s, 0.1, Math.PI - 0.1); else G.arc(look, -h * 0.44, 2 * s, 0.25, Math.PI - 0.25);
  G.strokeStyle = "#5a3a48"; G.lineWidth = 1.3 * s; G.lineCap = "round"; G.stroke();
  drawTuft(G, ch.tuft, 0, -h + 1 * s, s, t, ch);
  G.restore();
  [G] = sv;
}

/* ---------- item icons ---------- */
const ICON = {};
function cup(x, y, s, tea) {
  ell(x, y + 10 * s, 15 * s, 4.5 * s, "#e9e2d8");
  G.beginPath(); G.moveTo(x - 11 * s, y - 4 * s); G.quadraticCurveTo(x - 11 * s, y + 9 * s, x, y + 9 * s); G.quadraticCurveTo(x + 11 * s, y + 9 * s, x + 11 * s, y - 4 * s); G.closePath();
  G.fillStyle = "#fffaf3"; G.fill(); G.strokeStyle = "#d9cfc2"; G.lineWidth = 1.2 * s; G.stroke();
  G.beginPath(); G.arc(x + 12 * s, y + 1 * s, 4 * s, -1.2, 1.4); G.strokeStyle = "#e6dccf"; G.lineWidth = 2.4 * s; G.stroke();
  ell(x, y - 4 * s, 11 * s, 3.2 * s, tea);
  G.strokeStyle = "rgba(255,255,255,.85)"; G.lineWidth = 1.8 * s; G.lineCap = "round";
  for (const dx of [-4, 3]) { G.beginPath(); G.moveTo(x + dx * s, y - 9 * s); G.bezierCurveTo(x + (dx - 3) * s, y - 13 * s, x + (dx + 3) * s, y - 16 * s, x + dx * s, y - 20 * s); G.stroke(); }
}
function bouquet(x, y, s, cols, wrap = "#f7e7d8") {
  G.beginPath(); G.moveTo(x - 11 * s, y - 2 * s); G.lineTo(x + 11 * s, y - 2 * s); G.lineTo(x + 2 * s, y + 18 * s); G.lineTo(x - 2 * s, y + 18 * s); G.closePath(); G.fillStyle = wrap; G.fill();
  for (const [dx, dy, i] of [[-7, -4, 0], [7, -4, 1], [0, -9, 2], [-3, -1, 1], [4, 0, 0]]) ball(x + dx * s, y + dy * s, 5 * s, cols[i % cols.length], 0.35);
  G.beginPath(); G.moveTo(x - 5 * s, y + 8 * s); G.lineTo(x + 5 * s, y + 8 * s); G.strokeStyle = "#e27f86"; G.lineWidth = 2.2 * s; G.stroke();
}
function jar(x, y, s, col, lid = "#c98d5a") {
  G.beginPath(); G.roundRect(x - 10 * s, y - 8 * s, 20 * s, 22 * s, 6 * s); const g = G.createLinearGradient(x - 10 * s, 0, x + 10 * s, 0); g.addColorStop(0, shade(col, 0.25)); g.addColorStop(1, shade(col, -0.2)); G.fillStyle = g; G.fill();
  G.beginPath(); G.roundRect(x - 11 * s, y - 13 * s, 22 * s, 6 * s, 2 * s); G.fillStyle = lid; G.fill();
  ell(x - 5 * s, y, 2.4 * s, 5 * s, "rgba(255,255,255,.4)");
}
function slice(x, y, s, sponge, top, deco) {
  G.beginPath(); G.moveTo(x - 13 * s, y + 8 * s); G.lineTo(x + 13 * s, y + 8 * s); G.lineTo(x + 10 * s, y - 6 * s); G.lineTo(x - 13 * s, y - 2 * s); G.closePath(); G.fillStyle = sponge; G.fill();
  G.beginPath(); G.moveTo(x - 13 * s, y - 2 * s); G.lineTo(x + 10 * s, y - 6 * s); G.lineTo(x + 11 * s, y - 2 * s); G.lineTo(x - 13 * s, y + 2 * s); G.closePath(); G.fillStyle = top; G.fill();
  if (deco) deco();
}
const ICON_DRAW = {
  strawberry(x, y, s) { G.beginPath(); G.moveTo(x - 11 * s, y - 5 * s); G.quadraticCurveTo(x, y - 12 * s, x + 11 * s, y - 5 * s); G.quadraticCurveTo(x + 9 * s, y + 9 * s, x, y + 15 * s); G.quadraticCurveTo(x - 9 * s, y + 9 * s, x - 11 * s, y - 5 * s); const g = G.createRadialGradient(x - 4 * s, y - 3 * s, 1, x, y, 16 * s); g.addColorStop(0, "#ff7f86"); g.addColorStop(1, "#d93a4f"); G.fillStyle = g; G.fill(); for (const [dx, dy] of [[-5, -2], [3, -3], [-1, 3], [5, 4], [-4, 7], [1, 9]]) ell(x + dx * s, y + dy * s, 0.9 * s, 1.3 * s, "#ffe7a3"); for (const a of [-0.9, -0.3, 0.3, 0.9]) { G.save(); G.translate(x, y - 8 * s); G.rotate(a); ell(0, -4 * s, 2.6 * s, 6 * s, "#5fae5a"); G.restore(); } },
  carrot(x, y, s) { G.beginPath(); G.moveTo(x - 7 * s, y - 6 * s); G.quadraticCurveTo(x, y - 9 * s, x + 7 * s, y - 6 * s); G.lineTo(x + 1 * s, y + 16 * s); G.lineTo(x - 1 * s, y + 16 * s); G.closePath(); G.fillStyle = "#f2913c"; G.fill(); for (const dy of [-1, 4, 9]) line([x - 4 * s, y + dy * s], [x - 1 * s, y + dy * s], "#d4732a", 1.2 * s); for (const a of [-0.5, 0, 0.5]) { G.save(); G.translate(x, y - 7 * s); G.rotate(a); ell(0, -6 * s, 2.4 * s, 7 * s, "#5fae5a"); G.restore(); } },
  tea(x, y, s) { for (const [a, c] of [[-0.6, "#4f9c5f"], [0.5, "#6cbb6c"]]) { G.save(); G.translate(x, y + 6 * s); G.rotate(a); G.beginPath(); G.moveTo(0, 0); G.quadraticCurveTo(-10 * s, -10 * s, 0, -22 * s); G.quadraticCurveTo(10 * s, -10 * s, 0, 0); G.fillStyle = c; G.fill(); line([0, 0], [0, -20 * s], "rgba(255,255,255,.45)", 1.2 * s); G.restore(); } },
  lavender(x, y, s) { for (const dx of [-6, 0, 6]) { line([x + dx * 0.4 * s, y + 15 * s], [x + dx * s, y - 4 * s], "#8ea886", 1.6 * s); for (let k = 0; k < 6; k++) circ(x + dx * s + (k % 2 ? 1 : -1) * s, y - 4 * s - k * 2.6 * s + (dx === 0 ? -3 * s : 0), 2.3 * s, k % 2 ? "#8f74c9" : "#a58ae0"); } },
  sunflower(x, y, s) { for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; G.save(); G.translate(x, y); G.rotate(a); ell(0, -10 * s, 3.2 * s, 6 * s, i % 2 ? "#f7c637" : "#ffd654"); G.restore(); } ball(x, y, 7 * s, "#7b4f2e", 0.2); },
  chamomile(x, y, s) { for (const [dx, dy, r] of [[-6, 2, 0.8], [6, -3, 1]]) { for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; G.save(); G.translate(x + dx * s, y + dy * s); G.rotate(a); ell(0, -5.5 * s * r, 2 * s * r, 4 * s * r, "#ffffff"); G.restore(); } ball(x + dx * s, y + dy * s, 3.2 * s * r, "#f6c645", 0.3); } },
  mint(x, y, s) { for (const [dx, dy, a] of [[-6, 2, -0.6], [6, 2, 0.6], [0, -6, 0]]) { G.save(); G.translate(x + dx * s, y + dy * s); G.rotate(a); ell(0, 0, 6 * s, 9 * s, "#5fcf8a"); line([0, -8 * s], [0, 8 * s], "rgba(255,255,255,.5)", 1.2 * s); G.restore(); } },
  rose(x, y, s) { ell(x - 7 * s, y + 9 * s, 6 * s, 3 * s, "#5fae5a"); ell(x + 7 * s, y + 9 * s, 6 * s, 3 * s, "#5fae5a"); ball(x, y, 11 * s, "#e5577a", 0.35); G.strokeStyle = "#b8325a"; G.lineWidth = 1.6 * s; G.beginPath(); G.arc(x, y, 6 * s, 0.5, 4.5); G.stroke(); G.beginPath(); G.arc(x + 1 * s, y - 1 * s, 2.8 * s, 2, 6.5); G.stroke(); },
  pumpkin(x, y, s) { for (const [dx, r] of [[-7, 8], [7, 8], [0, 10]]) ball(x + dx * s, y + 2 * s, r * s, "#f29a3a", 0.3); G.fillStyle = "#6b8b3c"; G.fillRect(x - 1.5 * s, y - 13 * s, 3 * s, 6 * s); },
  starbloom(x, y, s) { G.save(); G.globalAlpha = 0.4; circ(x, y, 15 * s, "#f3d9ff"); G.restore(); star(x, y, 13 * s, "#e3b9ff", "#fff1a8"); },
  honey(x, y, s) { jar(x, y + 2 * s, s, "#f2b33d"); G.fillStyle = "#fff1c9"; G.beginPath(); G.roundRect(x - 6 * s, y + 1 * s, 12 * s, 7 * s, 2 * s); G.fill(); },
  egg(x, y, s) { G.beginPath(); G.ellipse(x, y + 2 * s, 10 * s, 13 * s, 0, 0, 7); const g = G.createRadialGradient(x - 4 * s, y - 4 * s, 1, x, y, 15 * s); g.addColorStop(0, "#fffdf6"); g.addColorStop(1, "#ecd6b7"); G.fillStyle = g; G.fill(); },
  milk(x, y, s) { G.beginPath(); G.roundRect(x - 8 * s, y - 6 * s, 16 * s, 22 * s, 5 * s); G.fillStyle = "#ffffff"; G.fill(); G.strokeStyle = "#d9e4ea"; G.lineWidth = 1.2 * s; G.stroke(); G.fillStyle = "#ffffff"; G.fillRect(x - 5 * s, y - 13 * s, 10 * s, 8 * s); G.fillStyle = "#7fb7d8"; G.fillRect(x - 6 * s, y - 15 * s, 12 * s, 4 * s); G.fillStyle = "#cfe6f2"; G.fillRect(x - 8 * s, y + 2 * s, 16 * s, 6 * s); },
  wood(x, y, s) { for (const [dx, dy] of [[-6, 4], [6, 4], [0, -6]]) { G.beginPath(); G.roundRect(x + dx * s - 9 * s, y + dy * s - 5 * s, 16 * s, 10 * s, 5 * s); G.fillStyle = "#a8794f"; G.fill(); circ(x + dx * s + 6 * s, y + dy * s, 5 * s, "#e8c28f"); circ(x + dx * s + 6 * s, y + dy * s, 2 * s, "#c49766"); } },
  stone(x, y, s) { G.beginPath(); G.moveTo(x - 13 * s, y + 8 * s); G.quadraticCurveTo(x - 14 * s, y - 6 * s, x - 3 * s, y - 10 * s); G.quadraticCurveTo(x + 10 * s, y - 13 * s, x + 13 * s, y - 1 * s); G.quadraticCurveTo(x + 15 * s, y + 9 * s, x + 4 * s, y + 10 * s); G.closePath(); const g = G.createLinearGradient(x - 10 * s, y - 10 * s, x + 10 * s, y + 10 * s); g.addColorStop(0, "#d8d3e0"); g.addColorStop(1, "#928ba3"); G.fillStyle = g; G.fill(); },
  fibre(x, y, s) { G.strokeStyle = "#a9b86a"; G.lineWidth = 1.8 * s; for (let i = -4; i <= 4; i++) { G.beginPath(); G.moveTo(x + i * 1.6 * s, y + 14 * s); G.quadraticCurveTo(x + i * 3 * s, y, x + i * 2.4 * s - 2 * s, y - 13 * s); G.stroke(); } G.fillStyle = "#c98d5a"; G.fillRect(x - 7 * s, y + 3 * s, 14 * s, 4 * s); },
  coconut(x, y, s) { ball(x, y, 12 * s, "#8a6142", 0.25); for (const [dx, dy] of [[-3, -3], [3, -3], [0, 2]]) circ(x + dx * s, y + dy * s, 1.8 * s, "#4f3626"); },
  shell(x, y, s) { G.beginPath(); G.moveTo(x, y + 12 * s); for (let i = 0; i <= 10; i++) { const a = Math.PI + (i / 10) * Math.PI; G.lineTo(x + Math.cos(a) * 14 * s, y + 2 * s + Math.sin(a) * 13 * s); } G.closePath(); G.fillStyle = "#f7c7c0"; G.fill(); for (let i = 1; i < 10; i++) { const a = Math.PI + (i / 10) * Math.PI; line([x, y + 12 * s], [x + Math.cos(a) * 13 * s, y + 2 * s + Math.sin(a) * 12 * s], "#e39a95", 1.2 * s); } },
  moss(x, y, s) { ball(x - 5 * s, y + 5 * s, 8 * s, "#5cae7d"); ball(x + 6 * s, y + 6 * s, 7 * s, "#4fa071"); for (const [dx, h, c] of [[-4, 10, "#9ff2df"], [5, 13, "#c7b1ff"]]) { G.fillStyle = "#f4efe2"; G.fillRect(x + dx * s - 1.4 * s, y - h * s + 4 * s, 2.8 * s, h * s - 2 * s); G.beginPath(); G.ellipse(x + dx * s, y - h * s + 4 * s, 6 * s, 4 * s, 0, Math.PI, 0); G.fillStyle = c; G.fill(); } },
  crystal(x, y, s) { for (const [dx, h, w, c, l] of [[-7, 14, 5, "#b9a3f0", -3], [7, 12, 5, "#8fd9ef", 3], [0, 22, 6, "#c7b6ff", 0]]) { G.beginPath(); G.moveTo(x + (dx - w) * s, y + 12 * s); G.lineTo(x + (dx - w * 0.7 + l) * s, y + (12 - h) * s); G.lineTo(x + (dx + l * 1.2) * s, y + (6 - h) * s); G.lineTo(x + (dx + w * 0.7 + l) * s, y + (12 - h) * s); G.lineTo(x + (dx + w) * s, y + 12 * s); G.closePath(); const g = G.createLinearGradient(x + (dx - w) * s, 0, x + (dx + w) * s, 0); g.addColorStop(0, shade(c, 0.45)); g.addColorStop(1, shade(c, -0.2)); G.fillStyle = g; G.fill(); } },
  herbaltea(x, y, s) { cup(x, y + 2 * s, s, "#c9a24b"); },
  honeylavtea(x, y, s) { cup(x, y + 2 * s, s, "#b893d8"); circ(x + 9 * s, y - 9 * s, 3 * s, "#f2b33d"); },
  chamomiletea(x, y, s) { cup(x, y + 2 * s, s, "#f1cf62"); circ(x - 2 * s, y - 2 * s, 2 * s, "#ffffff"); },
  minttea(x, y, s) { cup(x, y + 2 * s, s, "#8fd19e"); ell(x + 4 * s, y - 2 * s, 3 * s, 1.6 * s, "#3f9f5f"); },
  sunbouquet(x, y, s) { bouquet(x, y, s, ["#ffd654", "#f7c637", "#ffe48a"]); circ(x, y - 9 * s, 2 * s, "#7b4f2e"); },
  lavbouquet(x, y, s) { bouquet(x, y, s, ["#a58ae0", "#8f74c9", "#c8b2f0"], "#eef3e6"); },
  rosebouquet(x, y, s) { bouquet(x, y, s, ["#e5577a", "#f48aa5", "#ffd3de"], "#fff2e8"); },
  wreath(x, y, s) { for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; ball(x + Math.cos(a) * 11 * s, y + Math.sin(a) * 11 * s, 4.4 * s, i % 2 ? "#5cae7d" : "#4f9a6c", 0.25); } for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.4; star(x + Math.cos(a) * 11 * s, y + Math.sin(a) * 11 * s, 4.6 * s, "#ecc8ff", "#fff1a8"); } },
  tart(x, y, s) { slice(x, y + 2 * s, s, "#e9c08a", "#f6e3c2", () => { for (const dx of [-7, 0, 7]) { ball(x + dx * s, y - 4 * s, 3.8 * s, "#ee4f5f", 0.35); } }); },
  honeybun(x, y, s) { ball(x, y + 2 * s, 13 * s, "#d39a5c", 0.4); G.strokeStyle = "#f6cf6a"; G.lineWidth = 2.6 * s; G.beginPath(); G.arc(x, y + 2 * s, 6 * s, 0, 5); G.stroke(); },
  carrotcake(x, y, s) { slice(x, y + 2 * s, s, "#d8955a", "#fff5ea", () => { G.fillStyle = "#fff5ea"; G.fillRect(x - 13 * s, y + 4 * s, 24 * s, 2.4 * s); G.beginPath(); G.moveTo(x - 2 * s, y - 6 * s); G.lineTo(x + 4 * s, y - 6 * s); G.lineTo(x + 1 * s, y - 1 * s); G.fillStyle = "#f2913c"; G.fill(); }); },
  pumpkinpie(x, y, s) { slice(x, y + 2 * s, s, "#e2b47a", "#e9862e", () => { ell(x - 1 * s, y - 4 * s, 4 * s, 2 * s, "#fff5ea"); }); },
  basket(x, y, s) { G.beginPath(); G.arc(x, y - 2 * s, 11 * s, Math.PI, 0); G.strokeStyle = "#a8794f"; G.lineWidth = 2.6 * s; G.stroke(); G.beginPath(); G.moveTo(x - 14 * s, y - 2 * s); G.lineTo(x + 14 * s, y - 2 * s); G.lineTo(x + 10 * s, y + 14 * s); G.lineTo(x - 10 * s, y + 14 * s); G.closePath(); G.fillStyle = "#d9a96d"; G.fill(); for (let i = 0; i < 4; i++) line([x - 13 * s + i * 0.5 * s, y + 2 * s + i * 3.5 * s], [x + 13 * s - i * 0.5 * s, y + 2 * s + i * 3.5 * s], "#b98450", 1.2 * s); },
  candle(x, y, s) { G.save(); G.globalAlpha = 0.35; circ(x, y - 12 * s, 7 * s, "#ffe7a3"); G.restore(); G.beginPath(); G.roundRect(x - 8 * s, y - 6 * s, 16 * s, 20 * s, 3 * s); G.fillStyle = "#cdb9ef"; G.fill(); ell(x, y - 6 * s, 8 * s, 2.4 * s, "#e3d6fb"); G.beginPath(); G.moveTo(x, y - 18 * s); G.quadraticCurveTo(x + 4 * s, y - 11 * s, x, y - 8 * s); G.quadraticCurveTo(x - 4 * s, y - 11 * s, x, y - 18 * s); G.fillStyle = "#ffb347"; G.fill(); },
  chime(x, y, s) { line([x - 12 * s, y - 12 * s], [x + 12 * s, y - 12 * s], "#a8794f", 2.4 * s); line([x, y - 18 * s], [x, y - 12 * s], "#a8794f", 1.2 * s); for (const [dx, h] of [[-8, 18], [-3, 23], [3, 20], [8, 15]]) { line([x + dx * s, y - 12 * s], [x + dx * s, y - 9 * s], "#8a8a9a", 0.8 * s); G.fillStyle = "#cfe3ef"; G.fillRect(x + (dx - 1.5) * s, y - 9 * s, 3 * s, h * s); } star(x, y + 12 * s, 3 * s, "#f7c7c0"); },
  herbbundle(x, y, s) { for (const [a, c] of [[-0.4, "#5fcf8a"], [0, "#a58ae0"], [0.4, "#ffffff"]]) { G.save(); G.translate(x, y + 12 * s); G.rotate(a); line([0, 0], [0, -22 * s], "#6a9a5a", 1.6 * s); ball(0, -20 * s, 4.6 * s, c, 0.3); G.restore(); } G.fillStyle = "#e27f86"; G.fillRect(x - 5 * s, y + 4 * s, 10 * s, 3 * s); },
  orchid(x, y, s) { G.beginPath(); G.moveTo(x - 9 * s, y + 4 * s); G.lineTo(x + 9 * s, y + 4 * s); G.lineTo(x + 7 * s, y + 16 * s); G.lineTo(x - 7 * s, y + 16 * s); G.closePath(); G.fillStyle = "#7f9fc0"; G.fill(); line([x, y + 4 * s], [x + 2 * s, y - 14 * s], "#6a9a5a", 1.6 * s); for (const [dx, dy] of [[-4, -10], [5, -14], [3, -4]]) { for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; ell(x + dx * s + Math.cos(a) * 2.6 * s, y + dy * s + Math.sin(a) * 2.6 * s, 2.4 * s, 2.4 * s, "#f6b3d6"); } circ(x + dx * s, y + dy * s, 1.4 * s, "#c94d8a"); } },
  bathsalts(x, y, s) { jar(x, y + 2 * s, s, "#d6c6f2", "#9fd6c9"); for (const [dx, dy] of [[-4, 4], [3, 8], [2, 1]]) circ(x + dx * s, y + dy * s, 1.6 * s, "#ffffff"); },
  coins(x, y, s) { for (const [dx, dy] of [[-4, 5], [4, 3], [0, -3]]) { ell(x + dx * s, y + dy * s + 2 * s, 10 * s, 6 * s, "#d39a2e"); ell(x + dx * s, y + dy * s, 10 * s, 6 * s, "#f6cb4f"); ell(x + dx * s, y + dy * s, 6 * s, 3.4 * s, "#ffe48a"); } },
  hearts(x, y, s) { G.beginPath(); G.moveTo(x, y + 13 * s); G.bezierCurveTo(x - 18 * s, y, x - 10 * s, y - 15 * s, x, y - 6 * s); G.bezierCurveTo(x + 10 * s, y - 15 * s, x + 18 * s, y, x, y + 13 * s); const g = G.createRadialGradient(x - 5 * s, y - 6 * s, 1, x, y, 16 * s); g.addColorStop(0, "#ffb3c1"); g.addColorStop(1, "#ee5f84"); G.fillStyle = g; G.fill(); ell(x - 6 * s, y - 5 * s, 3 * s, 2 * s, "rgba(255,255,255,.6)"); },
  serenity(x, y, s) { for (const [a, c] of [[-1.1, "#c9b3f0"], [1.1, "#c9b3f0"], [-0.5, "#ddcdfa"], [0.5, "#ddcdfa"], [0, "#efe6ff"]]) { G.save(); G.translate(x, y + 9 * s); G.rotate(a); G.beginPath(); G.moveTo(0, 0); G.quadraticCurveTo(-6 * s, -9 * s, 0, -19 * s); G.quadraticCurveTo(6 * s, -9 * s, 0, 0); G.fillStyle = c; G.fill(); G.restore(); } ell(x, y + 10 * s, 12 * s, 3 * s, "#8fd3c4"); },
  seed(x, y, s) { ell(x, y + 3 * s, 7 * s, 10 * s, "#c99a6a"); line([x, y - 6 * s], [x, y - 12 * s], "#5fae5a", 1.6 * s); ell(x + 4 * s, y - 12 * s, 4 * s, 2 * s, "#7cc56a"); },
};
const iconCache = {};
function iconCanvas(id, px = 64) {
  const key = id + px;
  if (iconCache[key]) return iconCache[key];
  const cv = document.createElement("canvas"); cv.width = cv.height = px;
  const c = cv.getContext("2d"); const sv = [G]; G = c;
  const s = px / 44; c.save(); c.shadowColor = "rgba(70,40,60,.22)"; c.shadowBlur = 3 * s; c.shadowOffsetY = 1.5 * s;
  (ICON_DRAW[id] || ICON_DRAW.seed)(px / 2, px / 2, s);
  c.restore(); [G] = sv;
  return (iconCache[key] = cv);
}
const iconURLs = {};
function iconURL(id) { return iconURLs[id] || (iconURLs[id] = iconCanvas(id, 72).toDataURL()); }
