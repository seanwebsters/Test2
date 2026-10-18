"use client";

import type { Rarity } from "@/lib/content/types";

/**
 * Synthesised sound effects (Web Audio) — no audio files to load. Respects
 * the collector's sound setting and a local mute toggle.
 */
let ctx: AudioContext | undefined;
const MUTE_KEY = "nx-muted";

export function isMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}
export function setMuted(m: boolean) {
  try {
    localStorage.setItem(MUTE_KEY, m ? "1" : "0");
  } catch {
    /* ignore */
  }
}

function ac() {
  if (typeof window === "undefined") return undefined;
  ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = "sine", gain = 0.12) {
  const c = ac();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, c.currentTime + start);
  g.gain.setValueAtTime(0, c.currentTime + start);
  g.gain.linearRampToValueAtTime(gain, c.currentTime + start + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
  o.connect(g).connect(c.destination);
  o.start(c.currentTime + start);
  o.stop(c.currentTime + start + dur + 0.05);
}

function noise(start: number, dur: number, freq = 1800, gain = 0.25) {
  const c = ac();
  if (!c) return;
  const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const s = c.createBufferSource();
  s.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = freq;
  const g = c.createGain();
  g.gain.value = gain;
  s.connect(f).connect(g).connect(c.destination);
  s.start(c.currentTime + start);
}

export type Sfx = "hover" | "tear" | "flip" | "deal" | Rarity | "summary";

export function play(name: Sfx, enabled: boolean) {
  if (!enabled || isMuted()) return;
  switch (name) {
    case "hover":
      tone(880, 0, 0.08, "sine", 0.03);
      break;
    case "tear":
      noise(0, 0.35, 2400, 0.35);
      noise(0.05, 0.25, 900, 0.2);
      tone(140, 0, 0.4, "triangle", 0.12);
      break;
    case "deal":
      noise(0, 0.08, 3200, 0.12);
      break;
    case "flip":
      noise(0, 0.06, 5000, 0.15);
      tone(660, 0, 0.06, "square", 0.03);
      break;
    case "common":
      tone(523, 0, 0.35);
      break;
    case "uncommon":
      tone(523, 0, 0.3);
      tone(784, 0.08, 0.4);
      break;
    case "rare":
      [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.07, 0.5, "triangle", 0.1));
      break;
    case "epic":
      [392, 494, 587, 784, 988].forEach((f, i) => tone(f, i * 0.08, 0.7, "triangle", 0.1));
      tone(196, 0, 0.9, "sine", 0.12);
      break;
    case "legendary":
      tone(98, 0, 1.6, "sine", 0.2);
      [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, 0.15 + i * 0.09, 1.2, "triangle", 0.09));
      noise(0.1, 1.2, 7000, 0.06);
      break;
    case "mythic":
      tone(55, 0, 2.4, "sawtooth", 0.08);
      tone(82, 0, 2.4, "sine", 0.2);
      [440, 554, 659, 880, 1109, 1319, 1760, 2217].forEach((f, i) => tone(f, 0.4 + i * 0.11, 1.8, "sine", 0.08));
      noise(0.3, 2, 8000, 0.08);
      break;
    case "summary":
      [659, 784, 988].forEach((f, i) => tone(f, i * 0.06, 0.4, "sine", 0.06));
      break;
  }
}

export function haptic(pattern: number | number[], enabled: boolean) {
  if (!enabled) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* unsupported */
  }
}

export const RARITY_HAPTICS: Record<Rarity, number[]> = {
  common: [8],
  uncommon: [12],
  rare: [20, 40, 20],
  epic: [30, 40, 30, 40, 40],
  legendary: [40, 60, 40, 60, 120],
  mythic: [60, 80, 60, 80, 60, 120, 260],
};
