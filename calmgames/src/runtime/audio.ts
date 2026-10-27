import type { Theme } from "../lib/engine/schemas";

const SCALE_STEPS: Record<Theme["soundScale"], number[]> = {
  pentatonic: [0, 2, 4, 7, 9, 12, 14, 16],
  lydian: [0, 2, 4, 6, 7, 9, 11, 12],
  dorian: [0, 2, 3, 5, 7, 9, 10, 12],
  mixolydian: [0, 2, 4, 5, 7, 9, 10, 12],
};

/**
 * Procedural interaction sounds: soft sine and triangle tones with a long
 * release and a simple feedback delay for space. No samples, no network.
 */
export function createAudio(theme: Theme) {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let enabled = true;
  const steps = SCALE_STEPS[theme.soundScale];

  function ensure(): AudioContext | null {
    if (!enabled) return null;
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.22;
      const delay = ctx.createDelay(1);
      delay.delayTime.value = 0.32;
      const feedback = ctx.createGain();
      feedback.gain.value = 0.28;
      const wet = ctx.createGain();
      wet.gain.value = 0.35;
      master.connect(ctx.destination);
      master.connect(delay);
      delay.connect(feedback).connect(delay);
      delay.connect(wet).connect(ctx.destination);
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  }

  function tone(semitones: number, at = 0, length = 1.2, type: OscillatorType = "sine", level = 0.6) {
    const c = ensure();
    if (!c || !master) return;
    const t0 = c.currentTime + at;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.value = theme.soundRoot * 2 ** (semitones / 12);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(level, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + length);
    osc.connect(gain).connect(master);
    osc.start(t0);
    osc.stop(t0 + length + 0.05);
  }

  const note = (i: number) => steps[((i % steps.length) + steps.length) % steps.length] + 12 * Math.floor(i / steps.length);

  return {
    setEnabled(on: boolean) {
      enabled = on;
      if (!on && ctx) void ctx.suspend();
      if (on && ctx) void ctx.resume();
    },
    get enabled() {
      return enabled;
    },
    touch(step = 0) {
      tone(note(step), 0, 0.9, "sine", 0.45);
    },
    connect() {
      tone(note(2), 0, 1.4, "triangle", 0.35);
      tone(note(4), 0.09, 1.6, "sine", 0.4);
    },
    miss() {
      tone(note(0) - 12, 0, 0.8, "sine", 0.25);
    },
    complete() {
      [0, 2, 4, 7].forEach((s, i) => tone(note(s), i * 0.22, 2.6, i % 2 ? "triangle" : "sine", 0.4));
    },
  };
}
export type Audio = ReturnType<typeof createAudio>;
