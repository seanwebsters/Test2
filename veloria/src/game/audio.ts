/**
 * All sound is synthesised: a soft pad and music box that grow as time
 * returns to the city, water and birdsong once they are woken, and small
 * tactile sounds for the board and the book.
 */

let ctx: AudioContext | null = null;
let master: GainNode;
let music: GainNode;
let fx: GainNode;
let waterGain: GainNode;
let birdTimer = 0;
let tickTimer = 0;
let boxTimer = 0;
let padTimer = 0;
let level = 0;
let muted = false;
let started = false;

const PENT = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];
// F major-ish progression, as MIDI roots
const CHORDS = [
  [53, 57, 60, 64], // Fmaj7
  [57, 60, 64, 67], // Am7
  [50, 57, 60, 65], // Dm9-ish
  [46, 53, 57, 62], // Bbmaj7
];

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

export function unlockAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') void ctx.resume();
    return;
  }
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.9;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.ratio.value = 3;
  master.connect(comp).connect(ctx.destination);
  music = ctx.createGain();
  music.gain.value = 0.5;
  music.connect(master);
  fx = ctx.createGain();
  fx.gain.value = 0.7;
  fx.connect(master);
  buildWater();
  startLoops();
}

export function setMuted(m: boolean) {
  muted = m;
  if (ctx) master.gain.setTargetAtTime(m ? 0 : 0.9, ctx.currentTime, 0.2);
}

/** 0 frozen .. 5 fully alive */
export function setTimeLevel(l: number, fountain: boolean) {
  level = l;
  if (ctx) waterGain.gain.setTargetAtTime(fountain ? 0.05 : 0, ctx.currentTime, 1.5);
}

function noiseBuffer(seconds: number) {
  const c = ctx!;
  const buf = c.createBuffer(1, c.sampleRate * seconds, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

function buildWater() {
  const c = ctx!;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(3);
  src.loop = true;
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 900;
  bp.Q.value = 0.6;
  const lfo = c.createOscillator();
  const lfoG = c.createGain();
  lfo.frequency.value = 0.3;
  lfoG.gain.value = 300;
  lfo.connect(lfoG).connect(bp.frequency);
  lfo.start();
  waterGain = c.createGain();
  waterGain.gain.value = 0;
  src.connect(bp).connect(waterGain).connect(fx);
  src.start();
}

function pad(chord: number[], dur: number) {
  const c = ctx!;
  const t = c.currentTime;
  const out = c.createGain();
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 500 + level * 180;
  const amp = level === 0 ? 0.05 : 0.08 + level * 0.012;
  out.gain.setValueAtTime(0, t);
  out.gain.linearRampToValueAtTime(amp, t + dur * 0.35);
  out.gain.linearRampToValueAtTime(0, t + dur * 1.05);
  out.connect(lp).connect(music);
  for (const m of chord) {
    for (const det of [-6, 6]) {
      const o = c.createOscillator();
      o.type = level === 0 ? 'sine' : 'triangle';
      o.frequency.value = mtof(m + (level === 0 ? 12 : 0));
      o.detune.value = det;
      const g = c.createGain();
      g.gain.value = 0.18;
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + dur * 1.1);
    }
  }
}

function bell(freq: number, when: number, vol = 0.12, decay = 1.6, dest: AudioNode = music) {
  const c = ctx!;
  const o = c.createOscillator();
  const o2 = c.createOscillator();
  const g = c.createGain();
  o.type = 'sine';
  o2.type = 'sine';
  o.frequency.value = freq;
  o2.frequency.value = freq * 2.756;
  const g2 = c.createGain();
  g2.gain.value = 0.18;
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(vol, when + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0008, when + decay);
  o.connect(g);
  o2.connect(g2).connect(g);
  g.connect(dest);
  o.start(when);
  o2.start(when);
  o.stop(when + decay + 0.05);
  o2.stop(when + decay + 0.05);
}

function startLoops() {
  if (started) return;
  started = true;
  let ci = 0;
  const doPad = () => {
    if (!ctx) return;
    pad(CHORDS[ci % CHORDS.length], 9);
    const chord = CHORDS[ci % CHORDS.length];
    ci++;
    // music box phrase over the chord once the clock is ticking
    if (level >= 1) {
      const t0 = ctx.currentTime + 0.4;
      const notes = 3 + level * 2;
      let p = Math.floor(Math.random() * 4) + 2;
      for (let i = 0; i < notes; i++) {
        if (Math.random() < 0.25) continue;
        p = Math.max(0, Math.min(PENT.length - 1, p + Math.floor(Math.random() * 3) - 1));
        const m = chord[0] + 12 + PENT[p];
        bell(mtof(m), t0 + i * (8 / notes) + Math.random() * 0.05, 0.05 + level * 0.006, 2.2);
      }
    } else {
      // a single distant chime in the frozen city
      bell(mtof(chord[3] + 24), ctx.currentTime + 2 + Math.random() * 3, 0.02, 4);
    }
    padTimer = window.setTimeout(doPad, 8000);
  };
  doPad();
  const doTick = () => {
    if (ctx && level >= 1) {
      const t = ctx.currentTime;
      click(t, 2600, 0.025);
    }
    tickTimer = window.setTimeout(doTick, 1000);
  };
  doTick();
  const doBird = () => {
    if (ctx && level >= 3) chirp();
    birdTimer = window.setTimeout(doBird, 2500 + Math.random() * 6000);
  };
  doBird();
  void boxTimer;
}

function click(t: number, f: number, vol: number) {
  const c = ctx!;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'square';
  o.frequency.value = f;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
  const hp = c.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 1500;
  o.connect(hp).connect(g).connect(fx);
  o.start(t);
  o.stop(t + 0.04);
}

function chirp() {
  const c = ctx!;
  const t0 = c.currentTime;
  const n = 2 + Math.floor(Math.random() * 3);
  const base = 2800 + Math.random() * 1200;
  for (let i = 0; i < n; i++) {
    const t = t0 + i * 0.11;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(base, t);
    o.frequency.exponentialRampToValueAtTime(base * 1.5, t + 0.05);
    o.frequency.exponentialRampToValueAtTime(base * 0.9, t + 0.09);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.025, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    o.connect(g).connect(fx);
    o.start(t);
    o.stop(t + 0.12);
  }
}

function swish(dur = 0.35, from = 2000, to = 600, vol = 0.12) {
  const c = ctx!;
  const t = c.currentTime;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(dur + 0.1);
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 0.8;
  bp.frequency.setValueAtTime(from, t);
  bp.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + dur * 0.3);
  g.gain.linearRampToValueAtTime(0, t + dur);
  src.connect(bp).connect(g).connect(fx);
  src.start(t);
  src.stop(t + dur + 0.1);
}

function pluck(freq: number, when: number, vol = 0.12, decay = 0.35, type: OscillatorType = 'triangle') {
  const c = ctx!;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(vol, when + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, when + decay);
  o.connect(g).connect(fx);
  o.start(when);
  o.stop(when + decay + 0.02);
}

export type Sfx =
  | 'merge'
  | 'spawn'
  | 'place'
  | 'thaw'
  | 'collect'
  | 'quest'
  | 'restore'
  | 'page'
  | 'blip'
  | 'choose'
  | 'heart'
  | 'deny'
  | 'coin'
  | 'tab'
  | 'letter'
  | 'vanish'
  | 'step';

export function sfx(name: Sfx, arg = 1) {
  if (!ctx || muted) return;
  const t = ctx.currentTime;
  switch (name) {
    case 'merge': {
      const base = 72 + Math.min(arg, 6) * 2;
      pluck(mtof(base), t, 0.12, 0.4);
      pluck(mtof(base + 7), t + 0.07, 0.1, 0.5);
      bell(mtof(base + 12), t + 0.14, 0.07, 1.2, fx);
      break;
    }
    case 'spawn':
      pluck(mtof(79 + Math.floor(Math.random() * 3) * 2), t, 0.08, 0.18, 'sine');
      break;
    case 'place':
      pluck(420, t, 0.06, 0.08, 'sine');
      break;
    case 'thaw':
      for (let i = 0; i < 4; i++) bell(mtof(88 + PENT[i]), t + i * 0.05, 0.03, 0.8, fx);
      break;
    case 'collect':
      [0, 4, 7, 12].forEach((s, i) => bell(mtof(81 + s), t + i * 0.06, 0.05, 0.9, fx));
      break;
    case 'quest':
      [60, 64, 67, 72, 76].forEach((m, i) => bell(mtof(m + 5), t + i * 0.09, 0.08, 2.2, fx));
      break;
    case 'restore':
      for (let i = 0; i < 12; i++) bell(mtof(72 + PENT[i % PENT.length] + (i >= 10 ? 12 : 0)), t + i * 0.08, 0.06, 2.5, fx);
      swish(1.6, 400, 3000, 0.05);
      break;
    case 'page':
      swish(0.32, 3200, 900, 0.1);
      break;
    case 'blip':
      pluck(mtof(84), t, 0.025, 0.06, 'sine');
      break;
    case 'choose':
      pluck(mtof(76), t, 0.06, 0.2, 'sine');
      pluck(mtof(83), t + 0.06, 0.05, 0.3, 'sine');
      break;
    case 'heart':
      bell(mtof(77), t, 0.06, 1.2, fx);
      bell(mtof(81), t + 0.12, 0.06, 1.4, fx);
      bell(mtof(84), t + 0.24, 0.05, 1.8, fx);
      break;
    case 'deny':
      pluck(220, t, 0.06, 0.15, 'sine');
      pluck(196, t + 0.08, 0.06, 0.2, 'sine');
      break;
    case 'coin':
      pluck(mtof(88), t, 0.05, 0.15, 'sine');
      pluck(mtof(93), t + 0.05, 0.05, 0.25, 'sine');
      break;
    case 'tab':
      pluck(mtof(79), t, 0.03, 0.06, 'sine');
      break;
    case 'letter':
      swish(0.5, 1200, 2400, 0.06);
      bell(mtof(84), t + 0.2, 0.05, 1.5, fx);
      break;
    case 'vanish':
      for (let i = 0; i < 10; i++) bell(mtof(96 - PENT[i]), t + i * 0.12, 0.04, 2.4, fx);
      swish(2.5, 3000, 300, 0.05);
      break;
    case 'step':
      break;
  }
}

export function stopAudio() {
  clearTimeout(birdTimer);
  clearTimeout(tickTimer);
  clearTimeout(padTimer);
}
