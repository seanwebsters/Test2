import "server-only";
import type { SegmentKind, TranscriptLine } from "@/lib/types";
import { mp3Duration } from "./mp3";
import type { TtsProvider } from "./providers";

async function synthesize(provider: TtsProvider, text: string): Promise<Buffer> {
  if (provider === "elevenlabs") {
    const voice = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_64`, {
      method: "POST",
      headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY!, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({ text, model_id: process.env.ELEVENLABS_MODEL_ID || "eleven_flash_v2_5" }),
    });
    if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return Buffer.from(await res.arrayBuffer());
  }
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts", voice: process.env.OPENAI_TTS_VOICE || "alloy", input: text, response_format: "mp3" }),
  });
  if (!res.ok) throw new Error(`OpenAI TTS ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return Buffer.from(await res.arrayBuffer());
}

const splitSentences = (t: string) => t.split(/(?<=[.!?])\s+(?=[A-Z0-9"'])/).map((s) => s.trim()).filter(Boolean);

/**
 * Step 7: narrate an episode. Each segment is synthesised separately and the MP3s are
 * concatenated; segment boundaries come from the real decoded duration of each clip,
 * and sentence timings within a segment are interpolated by length.
 */
export async function narrate(provider: TtsProvider, segments: { kind: SegmentKind; text: string }[]) {
  const parts: Buffer[] = [];
  const lines: TranscriptLine[] = [];
  let t = 0;
  for (const seg of segments) {
    const audio = await synthesize(provider, seg.text);
    const dur = mp3Duration(audio);
    const sentences = splitSentences(seg.text);
    const total = sentences.reduce((n, s) => n + s.length, 0) || 1;
    let cursor = t;
    for (const s of sentences) {
      const d = (s.length / total) * dur;
      lines.push({ t0: Math.round(cursor * 100) / 100, t1: Math.round((cursor + d) * 100) / 100, text: s, kind: seg.kind });
      cursor += d;
    }
    parts.push(audio);
    t += dur;
  }
  return { mp3: Buffer.concat(parts), duration: Math.round(t * 100) / 100, lines };
}
