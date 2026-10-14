import { spawn, spawnSync } from "node:child_process";

/**
 * Optional FFmpeg integration for transcoding and EBU R128 loudness
 * normalisation. The pure-TypeScript pipeline works without it (WAV output);
 * when FFMPEG_PATH (or `ffmpeg` on PATH) is available, final mixes are
 * loudness-normalised and encoded to MP3 for efficient streaming.
 */
export function findFfmpeg(explicit?: string): string | null {
  const candidates = [explicit, process.env.FFMPEG_PATH, "ffmpeg"].filter(Boolean) as string[];
  for (const c of candidates) {
    try {
      const r = spawnSync(c, ["-version"], { stdio: "ignore", timeout: 5000 });
      if (r.status === 0) return c;
    } catch {
      /* try next */
    }
  }
  return null;
}

export function ffmpegTranscode(
  ffmpeg: string,
  input: Buffer,
  opts: { loudnorm?: boolean; bitrate?: string; format?: "mp3" } = {},
): Promise<Buffer> {
  const args = ["-hide_banner", "-loglevel", "error", "-i", "pipe:0"];
  if (opts.loudnorm) args.push("-af", "loudnorm=I=-24:TP=-2:LRA=7");
  args.push("-ac", "1", "-codec:a", "libmp3lame", "-b:a", opts.bitrate ?? "64k", "-f", opts.format ?? "mp3", "pipe:1");
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpeg, args);
    const chunks: Buffer[] = [];
    const errs: Buffer[] = [];
    proc.stdout.on("data", (c: Buffer) => chunks.push(c));
    proc.stderr.on("data", (c: Buffer) => errs.push(c));
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve(Buffer.concat(chunks));
      else reject(new Error(`ffmpeg exited ${code}: ${Buffer.concat(errs).toString()}`));
    });
    proc.stdin.end(input);
  });
}
