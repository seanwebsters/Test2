/** Minimal PCM WAV encode/decode (16-bit mono/stereo), no dependencies. */

export const DEFAULT_RATE = 22050;

export function encodeWav(samples: Float32Array, sampleRate = DEFAULT_RATE): Uint8Array {
  const bytes = new Uint8Array(44 + samples.length * 2);
  const view = new DataView(bytes.buffer);
  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i] ?? 0));
    view.setInt16(44 + i * 2, v < 0 ? v * 0x8000 : v * 0x7fff, true);
  }
  return bytes;
}

/** Decodes a 16-bit PCM WAV into mono float samples (stereo is averaged). */
export function decodeWav(bytes: Uint8Array): { samples: Float32Array; sampleRate: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag = (off: number) => String.fromCharCode(...bytes.subarray(off, off + 4));
  if (tag(0) !== "RIFF" || tag(8) !== "WAVE") throw new Error("Not a WAV file");
  let off = 12;
  let channels = 1;
  let sampleRate = DEFAULT_RATE;
  let bits = 16;
  while (off + 8 <= bytes.length) {
    const id = tag(off);
    const size = view.getUint32(off + 4, true);
    const body = off + 8;
    if (id === "fmt ") {
      channels = view.getUint16(body + 2, true);
      sampleRate = view.getUint32(body + 4, true);
      bits = view.getUint16(body + 14, true);
    } else if (id === "data") {
      if (bits !== 16) throw new Error(`Unsupported WAV bit depth ${bits}`);
      const frames = Math.floor(Math.min(size, bytes.length - body) / (2 * channels));
      const out = new Float32Array(frames);
      for (let i = 0; i < frames; i++) {
        let acc = 0;
        for (let c = 0; c < channels; c++) acc += view.getInt16(body + (i * channels + c) * 2, true) / 0x8000;
        out[i] = acc / channels;
      }
      return { samples: out, sampleRate };
    }
    off = body + size + (size % 2);
  }
  throw new Error("WAV has no data chunk");
}

export function resample(samples: Float32Array, from: number, to: number): Float32Array {
  if (from === to) return samples;
  const ratio = from / to;
  const out = new Float32Array(Math.floor(samples.length / ratio));
  for (let i = 0; i < out.length; i++) {
    const pos = i * ratio;
    const i0 = Math.floor(pos);
    const frac = pos - i0;
    out[i] = (samples[i0] ?? 0) * (1 - frac) + (samples[i0 + 1] ?? samples[i0] ?? 0) * frac;
  }
  return out;
}
