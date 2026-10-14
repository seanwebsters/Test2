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

/** Decode any audio FFmpeg understands into 16-bit mono WAV at the given rate. */
export function ffmpegDecodeToWav(ffmpeg: string, input: Buffer, sampleRate = 22050): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpeg, ["-hide_banner", "-loglevel", "error", "-i", "pipe:0", "-ac", "1", "-ar", String(sampleRate), "-f", "wav", "-acodec", "pcm_s16le", "pipe:1"]);
    const chunks: Buffer[] = [];
    const errs: Buffer[] = [];
    proc.stdout.on("data", (c: Buffer) => chunks.push(c));
    proc.stderr.on("data", (c: Buffer) => errs.push(c));
    proc.on("error", reject);
    proc.on("close", (code) => (code === 0 ? resolve(fixWavSizes(Buffer.concat(chunks))) : reject(new Error(`ffmpeg decode failed: ${Buffer.concat(errs).toString()}`))));
    proc.stdin.end(input);
  });
}

/** WAV written to a pipe has placeholder chunk sizes; patch them so decoders read the whole file. */
function fixWavSizes(buf: Buffer): Buffer {
  if (buf.length < 44 || buf.toString("ascii", 0, 4) !== "RIFF") return buf;
  buf.writeUInt32LE(buf.length - 8, 4);
  let off = 12;
  while (off + 8 <= buf.length) {
    const id = buf.toString("ascii", off, off + 4);
    if (id === "data") {
      buf.writeUInt32LE(buf.length - off - 8, off + 4);
      break;
    }
    off += 8 + buf.readUInt32LE(off + 4);
  }
  return buf;
}
