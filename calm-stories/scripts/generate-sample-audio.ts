/**
 * Renders the ambience sample for every seeded soundscape into
 * public/audio/samples/*.mp3 (requires ffmpeg) so playback works out of the box.
 *   npm run audio:samples
 */
import fs from "node:fs";
import path from "node:path";
import { SEED_SOUNDSCAPES } from "../src/lib/seed/content";
import { renderAmbience } from "../src/lib/audio/synth";
import { encodeWav } from "../src/lib/audio/wav";
import { findFfmpeg, ffmpegTranscode } from "../src/lib/audio/ffmpeg";
import { hashString } from "../src/lib/util";

async function main() {
  const ffmpeg = findFfmpeg();
  if (!ffmpeg) throw new Error("ffmpeg is required to encode the MP3 samples.");
  const outDir = path.resolve("public/audio/samples");
  fs.mkdirSync(outDir, { recursive: true });
  for (const sc of SEED_SOUNDSCAPES) {
    const samples = renderAmbience(sc.layers, 180, { seed: hashString(sc.slug), fade: 6 });
    const mp3 = await ffmpegTranscode(ffmpeg, encodeWav(samples), { bitrate: "48k" });
    fs.writeFileSync(path.join(outDir, `${sc.slug}.mp3`), mp3);
    console.log(`✓ ${sc.slug}.mp3 (${(mp3.length / 1024).toFixed(0)} KB)`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
