/** Duration of an MP3 by walking its frame headers (MPEG-1/2/2.5 Layer III). */
const BITRATES: Record<string, number[]> = {
  v1: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
  v2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
};
const RATES: Record<number, number[]> = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] };

export function mp3Duration(buf: Uint8Array): number {
  let i = 0;
  // Skip an ID3v2 tag if present.
  if (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) {
    i = 10 + ((buf[6] & 0x7f) << 21 | (buf[7] & 0x7f) << 14 | (buf[8] & 0x7f) << 7 | (buf[9] & 0x7f));
  }
  let seconds = 0;
  while (i + 4 <= buf.length) {
    if (buf[i] !== 0xff || (buf[i + 1] & 0xe0) !== 0xe0) { i++; continue; }
    const version = (buf[i + 1] >> 3) & 3; // 3 = MPEG1, 2 = MPEG2, 0 = MPEG2.5
    const layer = (buf[i + 1] >> 1) & 3; // 1 = Layer III
    const bIdx = (buf[i + 2] >> 4) & 15;
    const rIdx = (buf[i + 2] >> 2) & 3;
    const pad = (buf[i + 2] >> 1) & 1;
    if (version === 1 || layer !== 1 || bIdx === 0 || bIdx === 15 || rIdx === 3) { i++; continue; }
    const bitrate = (version === 3 ? BITRATES.v1 : BITRATES.v2)[bIdx] * 1000;
    const rate = RATES[version][rIdx];
    const samples = version === 3 ? 1152 : 576;
    const len = Math.floor((samples / 8) * bitrate / rate) + pad;
    if (len < 4) { i++; continue; }
    seconds += samples / rate;
    i += len;
  }
  return seconds;
}
