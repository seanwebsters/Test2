/**
 * Mixing and mastering in pure TypeScript: narration sections are joined with
 * gentle pauses, laid over an ambience bed (ducked slightly under the voice)
 * and an optional soft music pad, then levelled, limited and faded.
 */
import type { SoundLayer } from "@/lib/types";
import { applyFades, renderAmbience, rmsDb } from "./synth";
import { DEFAULT_RATE, resample } from "./wav";

export interface MixInput {
  sections: { samples: Float32Array; sampleRate: number }[];
  ambience: SoundLayer[];
  ambienceVolume: number; // 0 – 1
  musicVolume: number; // 0 – 1
  seed: number;
  rate?: number;
  introSeconds?: number;
  gapSeconds?: number;
  outroSeconds?: number;
}

export interface MixResult {
  mix: Float32Array;
  narration: Float32Array;
  bed: Float32Array;
  rate: number;
  /** Sample offsets where each section starts in the mix. */
  joins: number[];
  narrationSeconds: number;
}

export const VOICE_RMS_DB = -20;
export const CEILING = 0.89; // ≈ -1 dBFS

/**
 * Renders a ~75 s ambience loop once and tiles it with equal-power
 * crossfades, so long episodes mix quickly without audible seams.
 */
export function loopedAmbience(layers: SoundLayer[], seconds: number, rate: number, seed: number, targetRmsDb: number, fadeIn: number, fadeOut: number): Float32Array {
  const total = Math.floor(seconds * rate);
  const loopSec = Math.min(seconds, 75);
  const loop = renderAmbience(layers, { seconds: loopSec, sampleRate: rate, seed, targetRmsDb, fadeInSeconds: 0, fadeOutSeconds: 0 });
  const out = new Float32Array(total);
  const xf = Math.min(Math.floor(rate * 5), Math.floor(loop.length / 4));
  const hop = loop.length - xf;
  for (let start = 0; start < total; start += hop) {
    for (let i = 0; i < loop.length && start + i < total; i++) {
      let g = 1;
      if (start > 0 && i < xf) g = Math.sin(((i / xf) * Math.PI) / 2);
      else if (i >= hop && start + hop < total) g = Math.cos((((i - hop) / xf) * Math.PI) / 2);
      out[start + i] = (out[start + i] ?? 0) + (loop[i] ?? 0) * g;
    }
  }
  applyFades(out, rate, fadeIn, fadeOut);
  return out;
}

function dbToGain(db: number) {
  return Math.pow(10, db / 20);
}

function activeRmsDb(x: Float32Array, rate: number): number {
  // RMS over 50 ms windows that contain speech (ignores pauses).
  const win = Math.floor(rate * 0.05);
  let acc = 0;
  let n = 0;
  for (let i = 0; i + win <= x.length; i += win) {
    let e = 0;
    for (let k = 0; k < win; k++) e += (x[i + k] ?? 0) ** 2;
    const db = 10 * Math.log10(e / win + 1e-12);
    if (db > -50) {
      acc += e;
      n += win;
    }
  }
  return n ? 10 * Math.log10(acc / n + 1e-12) : -120;
}

export function mixEpisode(input: MixInput): MixResult {
  const rate = input.rate ?? DEFAULT_RATE;
  const intro = Math.floor((input.introSeconds ?? 5) * rate);
  const gap = Math.floor((input.gapSeconds ?? 1.4) * rate);
  const outro = Math.floor((input.outroSeconds ?? 25) * rate);
  const parts = input.sections.map((s) => resample(s.samples, s.sampleRate, rate));
  const speechLen = parts.reduce((a, p) => a + p.length, 0) + gap * Math.max(0, parts.length - 1);
  const total = intro + speechLen + outro;

  // 1. Narration track with short edge fades so joins never click.
  const narration = new Float32Array(total);
  const joins: number[] = [];
  let at = intro;
  const edge = Math.floor(rate * 0.03);
  for (const p of parts) {
    joins.push(at);
    for (let i = 0; i < p.length; i++) {
      const g = Math.min(1, i / edge, (p.length - 1 - i) / edge);
      narration[at + i] = (p[i] ?? 0) * Math.max(0, g);
    }
    at += p.length + gap;
  }
  const active = activeRmsDb(narration, rate);
  if (active > -119) {
    const g = dbToGain(VOICE_RMS_DB - active);
    for (let i = 0; i < narration.length; i++) narration[i] = (narration[i] ?? 0) * g;
  }

  // 2. Ambience bed and music pad, relative to the voice.
  const seconds = total / rate;
  const ambDb = VOICE_RMS_DB - 14 + 20 * Math.log10(Math.max(0.02, input.ambienceVolume) / 0.35);
  const bed = input.ambience.length ? loopedAmbience(input.ambience, seconds, rate, input.seed, ambDb, 4, 10) : new Float32Array(total);
  if (input.musicVolume > 0.01) {
    const padDb = VOICE_RMS_DB - 20 + 20 * Math.log10(input.musicVolume / 0.15);
    const pad = loopedAmbience([{ kind: "pad", gain: 1 }], seconds, rate, input.seed + 17, padDb, 8, 12);
    for (let i = 0; i < total; i++) bed[i] = (bed[i] ?? 0) + (pad[i] ?? 0);
  }

  // 3. Gentle ducking: the bed dips ~3 dB while the narrator speaks.
  const mix = new Float32Array(total);
  const attack = 1 - Math.exp(-1 / (rate * 0.08));
  const release = 1 - Math.exp(-1 / (rate * 0.6));
  const duck = dbToGain(-3);
  let envl = 0;
  for (let i = 0; i < total; i++) {
    const a = Math.abs(narration[i] ?? 0);
    envl += (a > envl ? attack : release) * (a - envl);
    const speaking = Math.min(1, envl * 20);
    const g = 1 - speaking * (1 - duck);
    mix[i] = (narration[i] ?? 0) + (bed[i] ?? 0) * g;
  }

  // 4. Master: soft-knee limiter to -1 dBFS, then long, gentle fades.
  for (let i = 0; i < total; i++) {
    const x = mix[i] ?? 0;
    const ax = Math.abs(x);
    const knee = CEILING * 0.8;
    mix[i] = ax <= knee ? x : Math.sign(x) * (knee + (CEILING - knee) * Math.tanh((ax - knee) / (CEILING - knee)));
  }
  applyFades(mix, rate, 3, 15);
  return { mix, narration, bed, rate, joins, narrationSeconds: speechLen / rate };
}

export { rmsDb };
