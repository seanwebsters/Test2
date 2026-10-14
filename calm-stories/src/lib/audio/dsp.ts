/** Tiny DSP toolkit used by the synthesiser, mixer and QA. */

export const dbToGain = (db: number) => Math.pow(10, db / 20);
export const gainToDb = (g: number) => (g <= 1e-9 ? -120 : 20 * Math.log10(g));

export function onePoleCoeff(cutoffHz: number, sampleRate: number): number {
  return 1 - Math.exp((-2 * Math.PI * cutoffHz) / sampleRate);
}

export class OnePole {
  private y = 0;
  constructor(private a: number) {}
  setCoeff(a: number) {
    this.a = a;
  }
  lp(x: number): number {
    this.y += this.a * (x - this.y);
    return this.y;
  }
  hp(x: number): number {
    return x - this.lp(x);
  }
}

export class PinkNoise {
  private b = [0, 0, 0, 0, 0, 0, 0];
  constructor(private rand: () => number) {}
  next(): number {
    const w = this.rand() * 2 - 1;
    const b = this.b;
    b[0] = 0.99886 * b[0]! + w * 0.0555179;
    b[1] = 0.99332 * b[1]! + w * 0.0750759;
    b[2] = 0.969 * b[2]! + w * 0.153852;
    b[3] = 0.8665 * b[3]! + w * 0.3104856;
    b[4] = 0.55 * b[4]! + w * 0.5329522;
    b[5] = -0.7616 * b[5]! - w * 0.016898;
    const out = b[0]! + b[1]! + b[2]! + b[3]! + b[4]! + b[5]! + b[6]! + w * 0.5362;
    b[6] = w * 0.115926;
    return out * 0.11;
  }
}

export class BrownNoise {
  private last = 0;
  constructor(private rand: () => number) {}
  next(): number {
    const w = this.rand() * 2 - 1;
    this.last = (this.last + 0.02 * w) / 1.02;
    return this.last * 3.5;
  }
}

export function rms(samples: Float32Array, start = 0, end = samples.length): number {
  let acc = 0;
  const n = Math.max(1, end - start);
  for (let i = start; i < end; i++) acc += (samples[i] ?? 0) ** 2;
  return Math.sqrt(acc / n);
}

export function peak(samples: Float32Array): number {
  let p = 0;
  for (let i = 0; i < samples.length; i++) p = Math.max(p, Math.abs(samples[i] ?? 0));
  return p;
}

export function applyFades(samples: Float32Array, sampleRate: number, fadeInSec: number, fadeOutSec: number) {
  const fi = Math.min(samples.length, Math.round(fadeInSec * sampleRate));
  const fo = Math.min(samples.length, Math.round(fadeOutSec * sampleRate));
  for (let i = 0; i < fi; i++) samples[i] = (samples[i] ?? 0) * Math.sin(((i / fi) * Math.PI) / 2) ** 2;
  for (let i = 0; i < fo; i++) {
    const idx = samples.length - 1 - i;
    samples[idx] = (samples[idx] ?? 0) * Math.sin(((i / fo) * Math.PI) / 2) ** 2;
  }
}

export function normalizeRms(samples: Float32Array, targetDb: number) {
  const current = rms(samples);
  if (current <= 1e-9) return;
  const g = dbToGain(targetDb) / current;
  for (let i = 0; i < samples.length; i++) samples[i] = (samples[i] ?? 0) * g;
}

/** Smooth soft-knee limiter keeping peaks under the ceiling without clipping. */
export function softLimit(samples: Float32Array, ceilingDb = -1) {
  const c = dbToGain(ceilingDb);
  for (let i = 0; i < samples.length; i++) {
    const x = samples[i] ?? 0;
    const ax = Math.abs(x);
    if (ax > c * 0.7) {
      const knee = c * 0.7;
      const over = (ax - knee) / (c - knee);
      samples[i] = Math.sign(x) * (knee + (c - knee) * Math.tanh(over));
    }
  }
}
