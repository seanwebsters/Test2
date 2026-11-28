"use client";

import { useStore } from "./store";

// Tiny synthesised sound effects (no audio files to download) + haptics.
let ctx: AudioContext | null = null;

function tone(freqs: number[], dur = 0.12, type: OscillatorType = "sine", gap = 0.08, vol = 0.12) {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx = ctx ?? new AC();
    const now = ctx.currentTime;
    freqs.forEach((f, i) => {
      const o = ctx!.createOscillator();
      const g = ctx!.createGain();
      o.type = type;
      o.frequency.value = f;
      const t = now + i * gap;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(ctx!.destination);
      o.start(t);
      o.stop(t + dur + 0.02);
    });
  } catch {
    /* audio unavailable */
  }
}

function vibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* unsupported */
  }
}

export type Sfx = "tap" | "correct" | "wrong" | "complete" | "levelup" | "unlock";

export function play(sfx: Sfx) {
  const { sound, haptics } = useStore.getState().settings;
  if (haptics) {
    if (sfx === "wrong") vibrate([30, 40, 30]);
    else if (sfx === "tap") vibrate(8);
    else vibrate(18);
  }
  if (!sound) return;
  switch (sfx) {
    case "tap":
      return tone([660], 0.05, "triangle", 0, 0.05);
    case "correct":
      return tone([660, 990], 0.16, "sine", 0.09);
    case "wrong":
      return tone([300, 220], 0.18, "triangle", 0.1, 0.09);
    case "complete":
      return tone([523, 659, 784, 1047], 0.22, "sine", 0.1);
    case "levelup":
      return tone([523, 659, 784, 1047, 1319], 0.26, "triangle", 0.09);
    case "unlock":
      return tone([880, 1320], 0.2, "sine", 0.12);
  }
}
