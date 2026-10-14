/**
 * Pure-TypeScript mixing and mastering: narration bed + ambience with
 * side-chain ducking, gentle fades, loudness normalisation and a soft
 * limiter so nothing is ever sudden or loud. FFmpeg (when available) adds
 * EBU R128 loudnorm and MP3 encoding on top.
 */
import { applyFades, dbToGain, normalizeRms, rms, softLimit } from "./dsp";
import { resample, SAMPLE_RATE } from "./wav";

export interface MixOptions {
  ambience: Float32Array | null;
  ambienceVolume: number; // 0–1
  musicVolume: number; // 0–1 (pad layer, already inside ambience if present)
  gapSeconds?: number;
  preRollSeconds?: number;
  postRollSeconds?: number;
  targetRmsDb?: number;
}

export interface MixResult {
  samples: Float32Array;
  sampleRate: number;
  narrationSeconds: number;
  ambienceToNarrationDb: number | null;
}

export function concatSections(sections: { samples: Float32Array; sampleRate: number }[], gapSeconds: number): Float32Array {
  const sr = SAMPLE_RATE;
  const parts = sections.map((s) => resample(s.samples, s.sampleRate, sr));
  const gap = Math.round(gapSeconds * sr);
  const total = parts.reduce((n, p) => n + p.length, 0) + gap * Math.max(0, parts.length - 1);
  const out = new Float32Array(total);
  let pos = 0;
  parts.forEach((p, i) => {
    out.set(p, pos);
    pos += p.length + (i < parts.length - 1 ? gap : 0);
  });
  return out;
}

export function mixEpisode(narration: Float32Array, opts: MixOptions): MixResult {
  const sr = SAMPLE_RATE;
  const pre = Math.round((opts.preRollSeconds ?? 8) * sr);
  const post = Math.round((opts.postRollSeconds ?? 25) * sr);
  const total = pre + narration.length + post;
  const voice = new Float32Array(narration);
  normalizeRms(voice, -20);
  const out = new Float32Array(total);
  out.set(voice, pre);

  let ratio: number | null = null;
  if (opts.ambience && opts.ambienceVolume > 0) {
    // Loop ambience to length with short crossfades.
    const amb = opts.ambience;
    const bed = new Float32Array(total);
    const xf = Math.min(Math.round(2 * sr), Math.floor(amb.length / 4));
    for (let i = 0; i < total; i++) {
      const k = i % (amb.length - xf);
      let v = amb[k] ?? 0;
      if (k < xf && i >= amb.length - xf) {
        const t = k / xf;
        v = v * t + (amb[k + amb.length - xf] ?? 0) * (1 - t);
      }
      bed[i] = v;
    }
    normalizeRms(bed, -20);
    // Side-chain ducking: follow narration energy and pull ambience down 8 dB under speech.
    const bedGain = dbToGain(-14 + 14 * Math.min(1, opts.ambienceVolume)) * 0.5;
    const duck = dbToGain(-8);
    const attack = Math.exp(-1 / (0.05 * sr));
    const release = Math.exp(-1 / (0.8 * sr));
    let env = 0;
    for (let i = 0; i < total; i++) {
      const x = Math.abs(out[i] ?? 0);
      env = x > env ? attack * env + (1 - attack) * x : release * env + (1 - release) * x;
      const speaking = Math.min(1, env / 0.02);
      const g = bedGain * (1 - speaking * (1 - duck));
      out[i] = (out[i] ?? 0) + (bed[i] ?? 0) * g;
    }
    const voiceLevel = rms(voice);
    ratio = voiceLevel > 0 ? Math.round(20 * Math.log10((rms(bed) * bedGain * duck) / voiceLevel) * 10) / 10 : null;
  }
  normalizeRms(out, opts.targetRmsDb ?? -24);
  applyFades(out, sr, 4, Math.min(20, (opts.postRollSeconds ?? 25) - 2));
  softLimit(out, -2);
  return { samples: out, sampleRate: sr, narrationSeconds: narration.length / sr, ambienceToNarrationDb: ratio };
}
