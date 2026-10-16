/** 16-bit PCM mono WAV encode/decode. */

export const SAMPLE_RATE = 22050;

export function encodeWav(samples: Float32Array, sampleRate = SAMPLE_RATE): Buffer {
  const dataLen = samples.length * 2;
  const buf = Buffer.alloc(44 + dataLen);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataLen, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(dataLen, 40);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i] ?? 0));
    buf.writeInt16LE(Math.round(s < 0 ? s * 0x8000 : s * 0x7fff), 44 + i * 2);
  }
  return buf;
}

export function decodeWav(buf: Buffer): { samples: Float32Array; sampleRate: number } {
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") throw new Error("Not a WAV file");
  let offset = 12;
  let sampleRate = SAMPLE_RATE;
  let channels = 1;
  let bits = 16;
  while (offset + 8 <= buf.length) {
    const id = buf.toString("ascii", offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);
    if (id === "fmt ") {
      channels = buf.readUInt16LE(offset + 10);
      sampleRate = buf.readUInt32LE(offset + 12);
      bits = buf.readUInt16LE(offset + 22);
    } else if (id === "data") {
      if (bits !== 16) throw new Error("Only 16-bit WAV supported");
      const frames = Math.floor(size / 2 / channels);
      const out = new Float32Array(frames);
      for (let i = 0; i < frames; i++) {
        let acc = 0;
        for (let c = 0; c < channels; c++) acc += buf.readInt16LE(offset + 8 + (i * channels + c) * 2) / 0x8000;
        out[i] = acc / channels;
      }
      return { samples: out, sampleRate };
    }
    offset += 8 + size + (size % 2);
  }
  throw new Error("WAV has no data chunk");
}

/** Raw little-endian 16-bit PCM . */
export function decodePcm16(buf: Buffer): Float32Array {
  const out = new Float32Array(Math.floor(buf.length / 2));
  for (let i = 0; i < out.length; i++) out[i] = buf.readInt16LE(i * 2) / 0x8000;
  return out;
}

export function resample(samples: Float32Array, from: number, to: number): Float32Array {
  if (from === to) return samples;
  const ratio = from / to;
  const out = new Float32Array(Math.floor(samples.length / ratio));
  for (let i = 0; i < out.length; i++) {
    const pos = i * ratio;
    const i0 = Math.floor(pos);
    const frac = pos - i0;
    out[i] = (samples[i0] ?? 0) * (1 - frac) + (samples[i0 + 1] ?? 0) * frac;
  }
  return out;
}
