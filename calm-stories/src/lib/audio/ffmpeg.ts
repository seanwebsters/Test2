import "server-only";
import { spawn, spawnSync } from "node:child_process";
import { env } from "@/lib/env";

let available: boolean | null = null;

export function ffmpegPath(): string {
  return env.ffmpegPath ?? "ffmpeg";
}

export function hasFfmpeg(): boolean {
  if (available !== null) return available;
  try {
    available = spawnSync(ffmpegPath(), ["-version"], { stdio: "ignore" }).status === 0;
  } catch {
    available = false;
  }
  return available;
}

/** Pipes bytes through ffmpeg with the given args (input is stdin, output stdout). */
export function runFfmpeg(input: Uint8Array, args: string[]): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath(), ["-hide_banner", "-loglevel", "error", "-i", "pipe:0", ...args, "pipe:1"]);
    const chunks: Buffer[] = [];
    const errs: Buffer[] = [];
    proc.stdout.on("data", (c: Buffer) => chunks.push(c));
    proc.stderr.on("data", (c: Buffer) => errs.push(c));
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve(new Uint8Array(Buffer.concat(chunks)));
      else reject(new Error(`ffmpeg exited ${code}: ${Buffer.concat(errs).toString().slice(0, 400)}`));
    });
    proc.stdin.on("error", () => undefined);
    proc.stdin.end(Buffer.from(input));
  });
}

/** WAV → MP3 (mono 96 kbps). Falls back to the WAV when ffmpeg is missing. */
export async function toMp3(wav: Uint8Array): Promise<{ bytes: Uint8Array; contentType: string }> {
  if (!hasFfmpeg()) return { bytes: wav, contentType: "audio/wav" };
  const bytes = await runFfmpeg(wav, ["-ac", "1", "-codec:a", "libmp3lame", "-b:a", "96k", "-f", "mp3"]);
  return { bytes, contentType: "audio/mpeg" };
}
