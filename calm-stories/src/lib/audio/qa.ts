import type { AudioQaIssue, AudioQaReport } from "@/lib/types";
import { gainToDb } from "./dsp";

/**
 * Automated audio checks for comfortable bedtime listening. Loudness is an
 * ungated RMS-based approximation (not a certified EBU R128 measurement –
 * FFmpeg loudnorm handles that in the mastering step when available).
 */
export function analyzeAudio(
  samples: Float32Array,
  sampleRate: number,
  ctx: {
    expectedSections?: number;
    actualSections?: number;
    wordCount?: number;
    narrationSeconds?: number;
    ambienceToNarrationDb?: number | null;
    pronunciationNotes?: string[];
  } = {},
): AudioQaReport {
  const frame = Math.round(0.4 * sampleRate);
  const frames: number[] = [];
  let peak = 0;
  let clipped = 0;
  let sumSq = 0;
  for (let i = 0; i < samples.length; i++) {
    const a = Math.abs(samples[i] ?? 0);
    if (a > peak) peak = a;
    if (a >= 0.999) clipped++;
    sumSq += a * a;
  }
  for (let f = 0; f + frame <= samples.length; f += frame) {
    let s = 0;
    for (let i = f; i < f + frame; i++) s += (samples[i] ?? 0) ** 2;
    frames.push(Math.sqrt(s / frame));
  }
  const rmsAll = Math.sqrt(sumSq / Math.max(1, samples.length));
  const gated = frames.filter((r) => gainToDb(r) > -60);
  const loud = gated.length ? gainToDb(Math.sqrt(gated.reduce((n, r) => n + r * r, 0) / gated.length)) - 0.7 : -70;
  let longestSilence = 0;
  let run = 0;
  let jumps = 0;
  let suddenPeaks = 0;
  for (let i = 0; i < frames.length; i++) {
    const db = gainToDb(frames[i]!);
    if (db < -55) run++;
    else {
      longestSilence = Math.max(longestSilence, run);
      run = 0;
    }
  }
  // Abrupt transitions: compare consecutive ~3 s short-term loudness windows
  // (speech onsets after natural pauses average out at this scale).
  const win = 8;
  const st: number[] = [];
  for (let i = 0; i + win <= frames.length; i += 2) {
    const slice = frames.slice(i, i + win);
    st.push(gainToDb(Math.sqrt(slice.reduce((n, r) => n + r * r, 0) / slice.length)));
  }
  for (let i = 1; i < st.length; i++) if (st[i]! - st[i - 1]! > 10 && st[i]! > -35) jumps++;
  longestSilence = Math.max(longestSilence, run) * 0.4;
  for (let f = 0; f + frame <= samples.length; f += frame) {
    let p = 0;
    let s = 0;
    for (let i = f; i < f + frame; i++) {
      const a = Math.abs(samples[i] ?? 0);
      p = Math.max(p, a);
      s += a * a;
    }
    const r = Math.sqrt(s / frame);
    if (gainToDb(p) > -6 && gainToDb(p) - gainToDb(r) > 22) suddenPeaks++;
  }
  const duration = samples.length / sampleRate;
  const wpm = ctx.wordCount && ctx.narrationSeconds ? Math.round(ctx.wordCount / (ctx.narrationSeconds / 60)) : null;
  const issues: AudioQaIssue[] = [];
  const add = (check: AudioQaIssue["check"], severity: AudioQaIssue["severity"], message: string) => issues.push({ check, severity, message });

  add("clipping", clipped > 0 ? "fail" : "pass", clipped > 0 ? `${clipped} clipped samples.` : "No clipping.");
  const peakDb = gainToDb(peak);
  add("peaks", peakDb > -1 ? "fail" : peakDb > -3 ? "warn" : "pass", `True-peak approx. ${peakDb.toFixed(1)} dBFS.`);
  add("loudness", loud > -18 ? "warn" : loud < -32 ? "warn" : "pass", `Integrated loudness ≈ ${loud.toFixed(1)} LUFS (target −24 ± 4 for bedtime listening).`);
  add("silence", longestSilence > 12 ? "warn" : "pass", longestSilence > 12 ? `Long silence of ${longestSilence.toFixed(0)} s.` : `Longest silence ${longestSilence.toFixed(1)} s.`);
  add("transitions", jumps > 2 ? "warn" : "pass", jumps > 2 ? `${jumps} abrupt level jumps detected.` : "Transitions are smooth.");
  add("unwanted_sfx", suddenPeaks > 3 ? "warn" : "pass", suddenPeaks > 3 ? `${suddenPeaks} sudden transients (possible clicks or sharp effects).` : "No sudden transients.");
  if (ctx.expectedSections !== undefined) {
    const missing = ctx.expectedSections - (ctx.actualSections ?? 0);
    add("missing_segments", missing > 0 ? "fail" : "pass", missing > 0 ? `${missing} narration section(s) missing.` : `All ${ctx.expectedSections} sections present.`);
  }
  if (ctx.ambienceToNarrationDb !== undefined && ctx.ambienceToNarrationDb !== null) {
    const r = ctx.ambienceToNarrationDb;
    add("background_level", r > -10 ? "warn" : "pass", r > -10 ? `Background is only ${Math.abs(r).toFixed(0)} dB below narration – may compete with the voice.` : `Background sits ${Math.abs(r).toFixed(0)} dB under the narration.`);
  }
  if (wpm !== null) add("pacing", wpm > 150 ? "warn" : wpm < 75 ? "warn" : "pass", `Narration pace ≈ ${wpm} words per minute (relaxing range 80–140).`);
  if (ctx.pronunciationNotes?.length) add("pronunciation", "warn", `Check pronunciation of: ${ctx.pronunciationNotes.slice(0, 8).join(", ")}.`);
  return {
    peak_dbfs: Number(peakDb.toFixed(1)),
    rms_dbfs: Number(gainToDb(rmsAll).toFixed(1)),
    integrated_loudness_approx_lufs: Number(loud.toFixed(1)),
    clipped_samples: clipped,
    longest_silence_seconds: Number(longestSilence.toFixed(1)),
    duration_seconds: Number(duration.toFixed(1)),
    words_per_minute: wpm,
    issues,
    passed: !issues.some((i) => i.severity === "fail"),
  };
}

/** Invented names (characters, places, world) present in the text that a TTS voice may mispronounce. */
export function pronunciationCandidates(text: string, known: string[]): string[] {
  const out = new Set<string>();
  for (const name of known) {
    for (const part of name.split(/\s+/)) {
      const w = part.replace(/[^A-Za-z'-]/g, "");
      if (w.length < 3 || !/^[A-Z]/.test(w) || /^(the|of|and|by|at|in|on|for)$/i.test(w)) continue;
      if (new RegExp(`\\b${w}\\b`).test(text)) out.add(w);
    }
  }
  return [...out].slice(0, 12);
}
