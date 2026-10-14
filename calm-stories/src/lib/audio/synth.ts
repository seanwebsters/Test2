/**
 * Procedural ambience synthesiser. Every soundscape in the prototype is
 * generated from these recipes, so there are no third-party recordings and
 * no licensing questions. A licensed ambience library or generative audio
 * provider can replace this behind the `AmbienceProvider` interface.
 */
import type { SoundLayer } from "@/lib/types";
import { prng } from "@/lib/util";
import { BrownNoise, OnePole, PinkNoise, applyFades, normalizeRms, onePoleCoeff, softLimit } from "./dsp";
import { SAMPLE_RATE } from "./wav";

type LayerFn = (n: number, sr: number, rand: () => number) => Float32Array;

const TAU = Math.PI * 2;

const rain: LayerFn = (n, sr, rand) => {
  const out = new Float32Array(n);
  const pink = new PinkNoise(rand);
  const hp = new OnePole(onePoleCoeff(900, sr));
  const lp = new OnePole(onePoleCoeff(6000, sr));
  let drop = 0;
  let dropEnv = 0;
  const dropLp = new OnePole(onePoleCoeff(2500, sr));
  for (let i = 0; i < n; i++) {
    const flutter = 0.85 + 0.15 * Math.sin((i / sr) * TAU * 0.07);
    let s = lp.lp(hp.hp(pink.next())) * 0.9 * flutter;
    if (rand() < 18 / sr) {
      dropEnv = 0.25 + rand() * 0.5;
      drop = 0;
    }
    dropEnv *= 0.9985;
    drop = dropLp.lp((rand() * 2 - 1) * dropEnv);
    s += drop * 0.6;
    out[i] = s;
  }
  return out;
};

const crickets = (out: Float32Array, sr: number, rand: () => number, density: number, gain: number) => {
  const voices = Array.from({ length: 3 }, () => ({
    freq: 3800 + rand() * 1400,
    next: Math.floor(rand() * sr * 2),
    pulses: 0,
    pulseLen: Math.floor(sr * 0.045),
    gap: Math.floor(sr * 0.06),
    t: 0,
    level: 0.4 + rand() * 0.6,
  }));
  for (const v of voices) {
    let i = v.next;
    while (i < out.length) {
      const count = 2 + Math.floor(rand() * 3);
      for (let p = 0; p < count; p++) {
        const start = i + p * (v.pulseLen + v.gap);
        for (let k = 0; k < v.pulseLen && start + k < out.length; k++) {
          const env = Math.sin((k / v.pulseLen) * Math.PI);
          out[start + k] = (out[start + k] ?? 0) + Math.sin(((start + k) / sr) * TAU * v.freq) * env * gain * v.level;
        }
      }
      i += Math.floor(sr * (0.9 + rand() * 2.5) / density);
    }
  }
};

const forest: LayerFn = (n, sr, rand) => {
  const out = new Float32Array(n);
  const brown = new BrownNoise(rand);
  const lp = new OnePole(onePoleCoeff(700, sr));
  for (let i = 0; i < n; i++) {
    const lfo = 0.6 + 0.4 * Math.sin((i / sr) * TAU * 0.05 + 1.3);
    out[i] = lp.lp(brown.next()) * 0.5 * lfo;
  }
  crickets(out, sr, rand, 1, 0.05);
  return out;
};

const ocean: LayerFn = (n, sr, rand) => {
  const out = new Float32Array(n);
  const pink = new PinkNoise(rand);
  const brown = new BrownNoise(rand);
  const lp = new OnePole(onePoleCoeff(1200, sr));
  let period = 9 + rand() * 4;
  let phase = 0;
  for (let i = 0; i < n; i++) {
    phase += 1 / (period * sr);
    if (phase >= 1) {
      phase -= 1;
      period = 8 + rand() * 6;
    }
    // Slow rise, gentle crest, long retreat.
    const env = phase < 0.35 ? Math.pow(phase / 0.35, 2) : Math.exp(-(phase - 0.35) * 4.2);
    lp.setCoeff(onePoleCoeff(400 + env * 2200, sr));
    out[i] = lp.lp(pink.next() * 0.9 + brown.next() * 0.3) * (0.25 + env * 0.9);
  }
  return out;
};

const fire: LayerFn = (n, sr, rand) => {
  const out = new Float32Array(n);
  const brown = new BrownNoise(rand);
  const lp = new OnePole(onePoleCoeff(300, sr));
  const crackleHp = new OnePole(onePoleCoeff(1500, sr));
  let env = 0;
  for (let i = 0; i < n; i++) {
    let s = lp.lp(brown.next()) * 0.7;
    if (rand() < 9 / sr) env = 0.3 + rand() * 0.7;
    env *= 0.993;
    s += crackleHp.hp((rand() * 2 - 1) * env) * 0.55;
    out[i] = s;
  }
  return out;
};

const thunder: LayerFn = (n, sr, rand) => {
  const out = new Float32Array(n);
  const brown = new BrownNoise(rand);
  const lp = new OnePole(onePoleCoeff(140, sr));
  let next = Math.floor(sr * (8 + rand() * 12));
  let t = -1;
  let len = 0;
  for (let i = 0; i < n; i++) {
    if (i === next) {
      t = 0;
      len = Math.floor(sr * (6 + rand() * 4));
      next = i + Math.floor(sr * (35 + rand() * 30));
    }
    let env = 0;
    if (t >= 0 && t < len) {
      const x = t / len;
      env = x < 0.15 ? x / 0.15 : Math.exp(-(x - 0.15) * 3.5);
      env *= 0.8 + 0.2 * Math.sin(t / sr * TAU * 1.7);
      t++;
    }
    out[i] = lp.lp(brown.next()) * env * 1.4;
  }
  return out;
};

const space: LayerFn = (n, sr, rand) => {
  const out = new Float32Array(n);
  const freqs = [55, 82.41, 110, 164.81];
  const detune = freqs.map(() => 0.2 + rand() * 0.4);
  const brown = new BrownNoise(rand);
  const lp = new OnePole(onePoleCoeff(220, sr));
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    let s = 0;
    freqs.forEach((f, k) => {
      const breathe = 0.5 + 0.5 * Math.sin(t * TAU * (0.03 + k * 0.011) + k);
      s += Math.sin(t * TAU * (f + (detune[k] ?? 0) * Math.sin(t * 0.1))) * breathe * (0.3 / (k + 1));
    });
    out[i] = s + lp.lp(brown.next()) * 0.25;
  }
  return out;
};

const wind: LayerFn = (n, sr, rand) => {
  const out = new Float32Array(n);
  const pink = new PinkNoise(rand);
  const hp = new OnePole(onePoleCoeff(150, sr));
  const lp = new OnePole(onePoleCoeff(800, sr));
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const gust = 0.5 + 0.35 * Math.sin(t * TAU * 0.045) + 0.15 * Math.sin(t * TAU * 0.13 + 2);
    lp.setCoeff(onePoleCoeff(300 + gust * 900, sr));
    out[i] = lp.lp(hp.hp(pink.next())) * gust * 1.6;
  }
  return out;
};

const bell = (out: Float32Array, sr: number, at: number, freq: number, gain: number) => {
  const len = Math.floor(sr * 6);
  const partials = [1, 2.0, 2.76, 5.4];
  for (let k = 0; k < len && at + k < out.length; k++) {
    const t = k / sr;
    let s = 0;
    partials.forEach((p, j) => (s += Math.sin(t * TAU * freq * p) * Math.exp(-t * (0.8 + j * 0.9)) / (j + 1)));
    out[at + k] = (out[at + k] ?? 0) + s * gain * Math.min(1, k / (sr * 0.01));
  }
};

const village: LayerFn = (n, sr, rand) => {
  const out = forest(n, sr, rand);
  for (let i = 0; i < n; i++) out[i] = (out[i] ?? 0) * 0.6;
  let at = Math.floor(sr * (10 + rand() * 10));
  while (at < n) {
    bell(out, sr, at, 392 + rand() * 30, 0.05);
    at += Math.floor(sr * (40 + rand() * 30));
  }
  return out;
};

const stream: LayerFn = (n, sr, rand) => {
  const out = new Float32Array(n);
  const hp = new OnePole(onePoleCoeff(600, sr));
  const lp = new OnePole(onePoleCoeff(3500, sr));
  const amp = new OnePole(onePoleCoeff(9, sr));
  for (let i = 0; i < n; i++) {
    const a = amp.lp(rand());
    out[i] = lp.lp(hp.hp(rand() * 2 - 1)) * (0.3 + a * 0.9);
  }
  return out;
};

const pad: LayerFn = (n, sr, rand) => {
  const out = new Float32Array(n);
  const chords = [
    [220, 277.18, 329.63, 415.3],
    [196, 246.94, 293.66, 369.99],
    [174.61, 220, 261.63, 329.63],
  ];
  const chordLen = sr * (16 + rand() * 6);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const ci = Math.floor(i / chordLen) % chords.length;
    const pos = (i % chordLen) / chordLen;
    const xf = Math.sin(pos * Math.PI); // crossfade each chord in and out
    let s = 0;
    for (const f of chords[ci] ?? []) s += Math.sin(t * TAU * f) * 0.12 + Math.sin(t * TAU * f * 2.001) * 0.03;
    out[i] = s * xf;
  }
  return out;
};

const RECIPES: Record<SoundLayer["kind"], LayerFn> = { rain, forest, ocean, fire, thunder, space, wind, village, stream, pad };

/** Render a soundscape (stack of layers) to a normalised mono buffer. */
export function renderAmbience(
  layers: SoundLayer[],
  seconds: number,
  opts: { seed?: number; sampleRate?: number; targetRmsDb?: number; fade?: number } = {},
): Float32Array {
  const sr = opts.sampleRate ?? SAMPLE_RATE;
  const n = Math.max(1, Math.round(seconds * sr));
  const out = new Float32Array(n);
  layers.forEach((layer, idx) => {
    const fn = RECIPES[layer.kind];
    const buf = fn(n, sr, prng((opts.seed ?? 7) + idx * 101));
    normalizeRms(buf, -24);
    for (let i = 0; i < n; i++) out[i] = (out[i] ?? 0) + (buf[i] ?? 0) * layer.gain;
  });
  normalizeRms(out, opts.targetRmsDb ?? -26);
  applyFades(out, sr, opts.fade ?? 4, opts.fade ?? 4);
  softLimit(out, -3);
  return out;
}

export const SOUND_LAYER_KINDS = Object.keys(RECIPES) as SoundLayer["kind"][];
