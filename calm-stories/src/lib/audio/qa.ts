/**
 * Automated audio QA. Measures the finished mix and its stems and reports
 * pass / warn / fail per check. Loudness is an RMS-based approximation of
 * LUFS (no K-weighting), labelled as such. Results inform editors; they make
 * no health or clinical claims.
 */
import type { AudioQaIssue, AudioQaReport, SoundLayer } from "@/lib/types";
import { CEILING } from "./mix";

export interface QaInput {
  mix: Float32Array;
  narration: Float32Array;
  bed: Float32Array;
  rate: number;
  joins: number[];
  expectedSections: number;
  presentSections: number;
  words: number;
  narrationSeconds: number;
  layers: SoundLayer[];
  script: string;
  properNouns: string[];
}

function db(x: number) {
  return x > 0 ? 20 * Math.log10(x) : -120;
}

function rms(x: Float32Array, from = 0, to = x.length) {
  let acc = 0;
  for (let i = from; i < to; i++) acc += (x[i] ?? 0) ** 2;
  return Math.sqrt(acc / Math.max(1, to - from));
}

function longestQuiet(x: Float32Array, rate: number, thresholdDb: number, from = 0, to = x.length) {
  const win = Math.floor(rate * 0.05);
  let run = 0;
  let best = 0;
  for (let i = from; i + win <= to; i += win) {
    if (db(rms(x, i, i + win)) < thresholdDb) {
      run += win;
      best = Math.max(best, run);
    } else run = 0;
  }
  return best / rate;
}

const COMMON = new Set("the and with into over under night light moon star rain river lake wood forest garden house tower court kingdom village harbour harbor sea shore cove market lane".split(" "));

/** Names a narrator could plausibly mispronounce. */
export function riskyNames(names: string[]): string[] {
  const out = new Set<string>();
  for (const full of names) {
    for (const w of full.split(/\s+/)) {
      const word = w.replace(/[^A-Za-z'’-]/g, "");
      if (word.length < 4 || COMMON.has(word.toLowerCase())) continue;
      if (/['’]|ae|ae|y[^aeiou]|[^aeiou]{4}|^[A-Z][a-z]*[A-Z]|ii|uu|aa|[qx][^u]|ö|é/.test(word) || word.length >= 9) out.add(word);
    }
  }
  return [...out].slice(0, 8);
}

export function analyseAudio(q: QaInput): AudioQaReport {
  const issues: AudioQaIssue[] = [];
  let peak = 0;
  let clipped = 0;
  for (let i = 0; i < q.mix.length; i++) {
    const a = Math.abs(q.mix[i] ?? 0);
    if (a > peak) peak = a;
    if (a >= 0.999) clipped++;
  }
  const peakDb = db(peak);
  const rmsDb = db(rms(q.mix));
  const lufs = rmsDb - 0.7;
  const duration = q.mix.length / q.rate;
  const wpm = q.narrationSeconds > 0 ? (q.words / q.narrationSeconds) * 60 : null;

  issues.push(clipped ? { check: "clipping", severity: "fail", message: `${clipped} clipped samples.` } : { check: "clipping", severity: "pass", message: "No clipping." });
  issues.push(
    peakDb > db(CEILING) + 0.2
      ? { check: "peaks", severity: "fail", message: `Peak ${peakDb.toFixed(1)} dBFS exceeds the −1 dBFS ceiling.` }
      : { check: "peaks", severity: "pass", message: `Peak ${peakDb.toFixed(1)} dBFS.` },
  );
  issues.push(
    lufs < -28 || lufs > -14
      ? { check: "loudness", severity: "warn", message: `Approx. ${lufs.toFixed(1)} LUFS is outside the −28 to −14 range for sleep content.` }
      : { check: "loudness", severity: "pass", message: `Approx. ${lufs.toFixed(1)} LUFS (RMS-based estimate).` },
  );

  // Narration gaps longer than 6 s (excluding intro and outro).
  const first = q.joins[0] ?? 0;
  const lastEnd = Math.floor(first + q.narrationSeconds * q.rate);
  const gap = q.narration.length ? longestQuiet(q.narration, q.rate, -55, first, Math.min(q.narration.length, lastEnd)) : 0;
  issues.push(gap > 6 ? { check: "silence", severity: "warn", message: `A ${gap.toFixed(1)} s gap in the narration.` } : { check: "silence", severity: "pass", message: `Longest pause in narration ${gap.toFixed(1)} s.` });

  // Transitions: level jumps between adjacent sections.
  let worst = 0;
  for (let k = 1; k < q.joins.length; k++) {
    const a = q.joins[k - 1] ?? 0;
    const b = q.joins[k] ?? 0;
    const end = q.joins[k + 1] ?? lastEnd;
    const la = db(rms(q.narration, a, b));
    const lb = db(rms(q.narration, b, end));
    worst = Math.max(worst, Math.abs(la - lb));
  }
  issues.push(worst > 4 ? { check: "transitions", severity: "warn", message: `Section levels differ by up to ${worst.toFixed(1)} dB.` } : { check: "transitions", severity: "pass", message: "Smooth transitions between sections." });

  issues.push(
    q.presentSections < q.expectedSections
      ? { check: "missing_segments", severity: "fail", message: `${q.expectedSections - q.presentSections} of ${q.expectedSections} narration sections are missing.` }
      : { check: "missing_segments", severity: "pass", message: `All ${q.expectedSections} sections present.` },
  );

  const risky = riskyNames(q.properNouns);
  issues.push(
    risky.length
      ? { check: "pronunciation", severity: "warn", message: `Listen for: ${risky.join(", ")}. Add a pronunciation note if any sound wrong.` }
      : { check: "pronunciation", severity: "pass", message: "No unusual names detected." },
  );

  const thunder = q.layers.find((l) => l.kind === "thunder");
  const markers = q.script.match(/\[[^\]]*\]|\b(?:SFX|sound effect)\b/gi) ?? [];
  issues.push(
    (thunder && thunder.gain > 0.35) || markers.length
      ? { check: "unwanted_sfx", severity: "warn", message: thunder && thunder.gain > 0.35 ? "Thunder is prominent; it may startle some listeners." : `Script contains ${markers.length} stage direction(s) that were not narrated.` }
      : { check: "unwanted_sfx", severity: "pass", message: "No sudden sound effects." },
  );

  const voiceDb = db(rms(q.narration, first, Math.min(q.narration.length, lastEnd)));
  const bedDb = db(rms(q.bed, first, Math.min(q.bed.length, lastEnd)));
  const sep = voiceDb - bedDb;
  issues.push(
    q.layers.length === 0
      ? { check: "background_level", severity: "pass", message: "No ambience bed." }
      : sep < 8
        ? { check: "background_level", severity: "warn", message: `Ambience is only ${sep.toFixed(1)} dB below the voice; it may compete with narration.` }
        : { check: "background_level", severity: "pass", message: `Ambience sits ${sep.toFixed(1)} dB below the voice.` },
  );

  issues.push(
    wpm === null
      ? { check: "pacing", severity: "warn", message: "No narration to measure." }
      : wpm > 150
        ? { check: "pacing", severity: "warn", message: `${Math.round(wpm)} words per minute is brisk for a Sleep Story (aim for 100–140).` }
        : wpm < 80
          ? { check: "pacing", severity: "warn", message: `${Math.round(wpm)} words per minute is very slow.` }
          : { check: "pacing", severity: "pass", message: `${Math.round(wpm)} words per minute.` },
  );

  return {
    peak_dbfs: Number(peakDb.toFixed(2)),
    rms_dbfs: Number(rmsDb.toFixed(2)),
    integrated_loudness_approx_lufs: Number(lufs.toFixed(2)),
    clipped_samples: clipped,
    longest_silence_seconds: Number(gap.toFixed(2)),
    duration_seconds: Number(duration.toFixed(2)),
    words_per_minute: wpm === null ? null : Math.round(wpm),
    issues,
    passed: !issues.some((i) => i.severity === "fail"),
  };
}
