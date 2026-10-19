import "server-only";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { env } from "@/lib/env";
import { findFfmpeg } from "@/lib/audio/ffmpeg";
import { BlockedError, StepFailure } from "./errors";

/**
 * FFmpeg assembly: scene mixes (narration + ambience layers + music with
 * side-chain ducking and fades), crossfaded masters with EBU R128 loudness
 * normalisation and true-peak limiting, and loudness measurement for QC.
 */

let ffmpegPath: string | null | undefined;
export function requireFfmpeg(): string {
  if (ffmpegPath === undefined) ffmpegPath = findFfmpeg(env.ffmpegPath);
  if (!ffmpegPath) throw new BlockedError("FFMPEG", "Install FFmpeg on the worker (or set FFMPEG_PATH) so the Audio Producer can mix and master.");
  return ffmpegPath;
}

export function runFfmpeg(args: string[]): Promise<string> {
  const bin = requireFfmpeg();
  return new Promise((resolve, reject) => {
    const proc = spawn(bin, ["-hide_banner", "-nostdin", "-y", ...args]);
    const err: Buffer[] = [];
    proc.stderr.on("data", (c: Buffer) => err.push(c));
    proc.on("error", reject);
    proc.on("close", (code) => {
      const log = Buffer.concat(err).toString();
      if (code === 0) resolve(log);
      else reject(new StepFailure(`FFmpeg failed: ${log.slice(-600)}`));
    });
  });
}

export async function withTmp<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "studio-"));
  try {
    return await fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

export async function probeSeconds(file: string): Promise<number> {
  const log = await runFfmpeg(["-i", file, "-f", "null", "-"]);
  const m = [...log.matchAll(/time=(\d+):(\d+):(\d+(?:\.\d+)?)/g)].pop();
  return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : 0;
}

/** Join narration segments with natural pauses into one 44.1 kHz mono WAV. */
export async function joinSegments(dir: string, segments: { file: string; pauseAfter: number }[], out: string) {
  const list: string[] = [];
  let i = 0;
  for (const s of segments) {
    list.push(`file '${s.file.replace(/'/g, "'\\''")}'`);
    if (s.pauseAfter > 0) {
      const sil = path.join(dir, `sil_${i++}.wav`);
      await runFfmpeg(["-f", "lavfi", "-i", `anullsrc=r=44100:cl=mono`, "-t", s.pauseAfter.toFixed(2), sil]);
      list.push(`file '${sil}'`);
    }
  }
  const listFile = path.join(dir, `concat_${Date.now()}.txt`);
  fs.writeFileSync(listFile, list.join("\n"));
  // Re-encode everything to a common format while concatenating.
  await runFfmpeg(["-f", "concat", "-safe", "0", "-i", listFile, "-ar", "44100", "-ac", "1", "-c:a", "pcm_s16le", out]);
}

export interface SceneMixInput {
  narration: string;
  /** gainDb: the Audio Director's level relative to the voice (typically −20 to −30); used to balance beds against each other. */
  layers: { file: string; gainDb: number }[];
  music: { file: string; gainDb: number } | null;
  /** 0–1: later, calmer scenes sit the bed lower and fade longer. */
  intensity: number;
  out: string;
}

/** Narration loudness inside a scene mix (the master is normalised afterwards). */
const VOICE_LUFS = -18;

/**
 * How far under the voice a bed sits, in LU: about 11 below for the main ambience,
 * a little lower for extra layers and calmer scenes. The Audio Director's level
 * nudges it by up to ±3.
 */
export function bedOffsetDb(levelDb: number, calm: number, layerIndex: number): number {
  const nudge = Math.max(-3, Math.min(3, levelDb + 24));
  return -11 + nudge - layerIndex * 2 - calm * 2;
}

/** Mix one scene: ambience and music loop under the voice and duck while it speaks. */
export async function mixScene(input: SceneMixInput): Promise<number> {
  const narrSec = await probeSeconds(input.narration);
  const pre = 2.5;
  const post = 3.5;
  const total = narrSec + pre + post;
  const args: string[] = ["-i", input.narration];
  const beds = [...input.layers, ...(input.music ? [input.music] : [])];
  for (const b of beds) args.push("-stream_loop", "-1", "-i", b.file);
  const calm = Math.max(0, Math.min(1, 1 - input.intensity));
  const parts: string[] = [];
  // Loudness-match everything first (provider files arrive at arbitrary levels), so beds sit a
  // known distance under the voice: audible and atmospheric, never competing.
  parts.push(`[0:a]aformat=sample_rates=44100:channel_layouts=mono,loudnorm=I=${VOICE_LUFS}:TP=-2:LRA=11,aresample=44100,aformat=sample_rates=44100:channel_layouts=mono,adelay=${Math.round(pre * 1000)}:all=1,apad=pad_dur=${post},asplit=2[voice][key]`);
  if (beds.length) {
    beds.forEach((b, i) => {
      const target = VOICE_LUFS + bedOffsetDb(b.gainDb, calm, i);
      parts.push(`[${i + 1}:a]aformat=sample_rates=44100:channel_layouts=stereo,atrim=0:${total.toFixed(2)},loudnorm=I=${target.toFixed(1)}:TP=-6:LRA=11,aresample=44100,aformat=sample_rates=44100:channel_layouts=stereo,afade=t=in:d=${(2 + calm * 2).toFixed(1)},afade=t=out:st=${Math.max(0, total - 3).toFixed(2)}:d=3[b${i}]`);
    });
    parts.push(`${beds.map((_, i) => `[b${i}]`).join("")}amix=inputs=${beds.length}:normalize=0:duration=longest[bed]`);
    // Gentle ducking (a few dB) while the voice speaks; narration is near-continuous, so heavy ducking would bury the bed.
    parts.push(`[bed][key]sidechaincompress=threshold=0.1:ratio=2:attack=60:release=1200:makeup=1[ducked]`);
    parts.push(`[voice]pan=stereo|c0=c0|c1=c0[vs]`);
    parts.push(`[vs][ducked]amix=inputs=2:normalize=0:duration=first[out]`);
  } else {
    parts.push(`[key]anullsink`);
    parts.push(`[voice]pan=stereo|c0=c0|c1=c0[out]`);
  }
  await runFfmpeg([...args, "-filter_complex", parts.join(";"), "-map", "[out]", "-t", total.toFixed(2), "-ar", "44100", "-c:a", "pcm_s16le", input.out]);
  return total;
}

/** Crossfade scene stems, normalise to −24 LUFS with a −2 dBTP ceiling, fade out, encode MP3. */
export async function masterEpisode(dir: string, stems: string[], out: string): Promise<void> {
  if (!stems.length) throw new StepFailure("No scene stems to master.");
  const args: string[] = [];
  for (const s of stems) args.push("-i", s);
  const parts: string[] = [];
  let last = "[0:a]";
  for (let i = 1; i < stems.length; i++) {
    const label = `[x${i}]`;
    parts.push(`${last}[${i}:a]acrossfade=d=2.5:c1=tri:c2=tri${label}`);
    last = label;
  }
  const joined = path.join(dir, "joined.wav");
  if (stems.length > 1) await runFfmpeg([...args, "-filter_complex", parts.join(";"), "-map", last, "-c:a", "pcm_s16le", joined]);
  else fs.copyFileSync(stems[0]!, joined);
  const dur = await probeSeconds(joined);
  await runFfmpeg([
    "-i",
    joined,
    "-af",
    `loudnorm=I=-24:TP=-2:LRA=11,alimiter=limit=0.79:level=disabled,afade=t=out:st=${Math.max(0, dur - 12).toFixed(2)}:d=12`,
    "-ar",
    "44100",
    "-ac",
    "2",
    "-c:a",
    "libmp3lame",
    "-b:a",
    "128k",
    out,
  ]);
}

/** EBU R128 measurement via FFmpeg's loudnorm analysis pass. */
export async function measureLoudness(file: string): Promise<{ integrated_lufs: number; true_peak_dbtp: number; lra: number }> {
  const log = await runFfmpeg(["-i", file, "-af", "loudnorm=print_format=json", "-f", "null", "-"]);
  const json = log.slice(log.lastIndexOf("{"), log.lastIndexOf("}") + 1);
  try {
    const j = JSON.parse(json) as Record<string, string>;
    return { integrated_lufs: Number(j.input_i), true_peak_dbtp: Number(j.input_tp), lra: Number(j.input_lra) };
  } catch {
    return { integrated_lufs: NaN, true_peak_dbtp: NaN, lra: NaN };
  }
}
