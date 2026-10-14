/**
 * Procedural ambience synthesiser. Produces original, royalty-free soundscape
 * beds (rain, ocean, fire, wind, space…) so the prototype ships with testable
 * audio and no third-party recordings. A licensed ambience library or a
 * generative audio provider can replace it via the SoundProvider interface.
 */
import type { SoundLayer } from "@/lib/types";
import { prng } from "@/lib/util";
import { DEFAULT_RATE } from "./wav";

type Gen = (n: number) => Float32Array;

function onePole(input: Float32Array, coeff: number): Float32Array {
  const out = new Float32Array(input.length);
  let y = 0;
  for (let i = 0; i < input.length; i++) {
    y += coeff * ((input[i] ?? 0) - y);
    out[i] = y;
  }
  return out;
}

function highPass(input: Float32Array, coeff: number): Float32Array {
  const low = onePole(input, coeff);
  const out = new Float32Array(input.length);
  for (let i = 0; i < input.length; i++) out[i] = (input[i] ?? 0) - (low[i] ?? 0);
  return out;
}

function white(rand: () => number, n: number) {
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = rand() * 2 - 1;
  return out;
}

function brown(rand: () => number, n: number) {
  const out = new Float32Array(n);
  let y = 0;
  for (let i = 0; i < n; i++) {
    y = (y + 0.02 * (rand() * 2 - 1)) * 0.998;
    out[i] = y * 3.5;
  }
  return out;
}

function pink(rand: () => number, n: number) {
  const out = new Float32Array(n);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < n; i++) {
    const w = rand() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179;
    b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.969 * b2 + w * 0.153852;
    b3 = 0.8665 * b3 + w * 0.3104856;
    b4 = 0.55 * b4 + w * 0.5329522;
    b5 = -0.7616 * b5 - w * 0.016898;
    out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
    b6 = w * 0.115926;
  }
  return out;
}

function lfo(i: number, rate: number, hz: number, phase = 0) {
  return 0.5 + 0.5 * Math.sin((2 * Math.PI * hz * i) / rate + phase);
}

function layerGen(kind: SoundLayer["kind"], seed: number, rate: number): Gen {
  return (n) => {
    const rand = prng(seed);
    switch (kind) {
      case "rain": {
        const base = highPass(onePole(white(rand, n), 0.5), 0.02);
        for (let i = 0; i < n; i++) {
          base[i] = (base[i] ?? 0) * 0.5 * (0.8 + 0.2 * lfo(i, rate, 0.07));
          if (rand() < 0.0009) {
            const len = Math.floor(rate * 0.012);
            const amp = 0.15 + rand() * 0.2;
            for (let k = 0; k < len && i + k < n; k++) base[i + k] = (base[i + k] ?? 0) + amp * Math.exp(-k / (len / 4)) * (rand() * 2 - 1);
          }
        }
        return base;
      }
      case "ocean": {
        const noise = onePole(pink(rand, n), 0.15);
        for (let i = 0; i < n; i++) {
          const swell = Math.pow(lfo(i, rate, 1 / 9.5), 2.2) * 0.9 + 0.1 * lfo(i, rate, 1 / 23, 1.3);
          noise[i] = (noise[i] ?? 0) * swell * 1.6;
        }
        return noise;
      }
      case "fire": {
        const bed = onePole(brown(rand, n), 0.3);
        for (let i = 0; i < n; i++) {
          bed[i] = (bed[i] ?? 0) * 0.5;
          if (rand() < 0.0012) {
            const len = Math.floor(rate * (0.002 + rand() * 0.006));
            const amp = 0.1 + rand() * 0.35;
            for (let k = 0; k < len && i + k < n; k++) bed[i + k] = (bed[i + k] ?? 0) + amp * (rand() * 2 - 1) * (1 - k / len);
          }
        }
        return bed;
      }
      case "thunder": {
        const out = new Float32Array(n);
        const rumble = onePole(brown(rand, n), 0.01);
        let next = Math.floor(rate * (8 + rand() * 20));
        while (next < n) {
          const len = Math.floor(rate * (4 + rand() * 4));
          const amp = 0.5 + rand() * 0.5;
          for (let k = 0; k < len && next + k < n; k++) {
            const env = Math.sin((Math.PI * k) / len) * Math.exp(-k / (len * 0.6));
            out[next + k] = (rumble[next + k] ?? 0) * env * amp * 2.5;
          }
          next += len + Math.floor(rate * (20 + rand() * 30));
        }
        return out;
      }
      case "wind":
      case "village": {
        const noise = onePole(pink(rand, n), kind === "wind" ? 0.08 : 0.05);
        for (let i = 0; i < n; i++) noise[i] = (noise[i] ?? 0) * (0.35 + 0.65 * lfo(i, rate, 1 / 13, rand()) * lfo(i, rate, 1 / 5.3));
        if (kind === "village") {
          // occasional distant, soft bell
          let next = Math.floor(rate * (10 + rand() * 15));
          while (next < n) {
            const f = [523.25, 659.25, 783.99][Math.floor(rand() * 3)] ?? 523.25;
            const len = Math.floor(rate * 3);
            for (let k = 0; k < len && next + k < n; k++) noise[next + k] = (noise[next + k] ?? 0) + 0.04 * Math.sin((2 * Math.PI * f * k) / rate) * Math.exp(-k / (rate * 0.8));
            next += Math.floor(rate * (25 + rand() * 30));
          }
        }
        return noise;
      }
      case "forest": {
        const leaves = highPass(onePole(pink(rand, n), 0.3), 0.05);
        for (let i = 0; i < n; i++) leaves[i] = (leaves[i] ?? 0) * (0.4 + 0.6 * lfo(i, rate, 1 / 7, 0.4)) * 1.2;
        // soft cricket-like chirps
        let next = Math.floor(rate * 2);
        while (next < n) {
          const len = Math.floor(rate * 0.05);
          for (let r = 0; r < 3; r++) {
            const start = next + r * Math.floor(rate * 0.09);
            for (let k = 0; k < len && start + k < n; k++) leaves[start + k] = (leaves[start + k] ?? 0) + 0.015 * Math.sin((2 * Math.PI * 4200 * k) / rate) * Math.sin((Math.PI * k) / len);
          }
          next += Math.floor(rate * (2 + rand() * 4));
        }
        return leaves;
      }
      case "stream": {
        const s = highPass(onePole(white(rand, n), 0.35), 0.1);
        for (let i = 0; i < n; i++) s[i] = (s[i] ?? 0) * 0.35 * (0.7 + 0.3 * lfo(i, rate, 0.6, rand()));
        return s;
      }
      case "space":
      case "pad": {
        const out = new Float32Array(n);
        const root = kind === "space" ? 55 : 110;
        const chord = kind === "space" ? [1, 1.5, 2, 3.01] : [1, 1.25, 1.5, 2];
        const phases = chord.map(() => rand() * Math.PI * 2);
        for (let i = 0; i < n; i++) {
          let v = 0;
          chord.forEach((m, ci) => {
            const detune = 1 + 0.002 * Math.sin((2 * Math.PI * 0.05 * i) / rate + ci);
            v += Math.sin((2 * Math.PI * root * m * detune * i) / rate + (phases[ci] ?? 0)) * (0.5 + 0.5 * lfo(i, rate, 1 / (17 + ci * 4), ci));
          });
          out[i] = (v / chord.length) * 0.5;
        }
        return out;
      }
    }
  };
}

export interface RenderOptions {
  seconds: number;
  sampleRate?: number;
  seed?: number;
  fadeInSeconds?: number;
  fadeOutSeconds?: number;
  /** Target RMS in dBFS for the finished bed. */
  targetRmsDb?: number;
}

export function renderAmbience(layers: SoundLayer[], opts: RenderOptions): Float32Array {
  const rate = opts.sampleRate ?? DEFAULT_RATE;
  const n = Math.floor(opts.seconds * rate);
  const mix = new Float32Array(n);
  layers.forEach((layer, li) => {
    const buf = layerGen(layer.kind, (opts.seed ?? 7) * 31 + li * 7919, rate)(n);
    for (let i = 0; i < n; i++) mix[i] = (mix[i] ?? 0) + (buf[i] ?? 0) * layer.gain;
  });
  normaliseRms(mix, opts.targetRmsDb ?? -28);
  softLimit(mix, 0.5);
  applyFades(mix, rate, opts.fadeInSeconds ?? 4, opts.fadeOutSeconds ?? 8);
  return mix;
}

export function rmsDb(samples: Float32Array): number {
  let acc = 0;
  for (let i = 0; i < samples.length; i++) acc += (samples[i] ?? 0) ** 2;
  const rms = Math.sqrt(acc / Math.max(1, samples.length));
  return rms > 0 ? 20 * Math.log10(rms) : -120;
}

export function normaliseRms(samples: Float32Array, targetDb: number) {
  const current = rmsDb(samples);
  if (current <= -119) return;
  const gain = Math.pow(10, (targetDb - current) / 20);
  for (let i = 0; i < samples.length; i++) samples[i] = (samples[i] ?? 0) * gain;
}

/** Gentle tanh limiter so no sample exceeds `ceiling`. */
export function softLimit(samples: Float32Array, ceiling: number) {
  for (let i = 0; i < samples.length; i++) samples[i] = ceiling * Math.tanh((samples[i] ?? 0) / ceiling);
}

export function applyFades(samples: Float32Array, rate: number, inSec: number, outSec: number) {
  const fin = Math.min(samples.length, Math.floor(inSec * rate));
  const fout = Math.min(samples.length, Math.floor(outSec * rate));
  for (let i = 0; i < fin; i++) samples[i] = (samples[i] ?? 0) * Math.sin(((i / fin) * Math.PI) / 2) ** 2;
  for (let i = 0; i < fout; i++) {
    const idx = samples.length - 1 - i;
    samples[idx] = (samples[idx] ?? 0) * Math.sin(((i / fout) * Math.PI) / 2) ** 2;
  }
}
