import "server-only";
import { decodePcm16 } from "@/lib/audio/wav";

/**
 * ElevenLabs adapters: narration (text-to-speech) and ambience (text-to-sound
 * effects). Both request raw 22.05 kHz PCM so the in-house mixer can work on
 * it without FFmpeg.
 */
const BASE = "https://api.elevenlabs.io/v1";
export const ELEVEN_SAMPLE_RATE = 22050;

async function call(apiKey: string, path: string, body: unknown): Promise<Float32Array> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "xi-api-key": apiKey, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`ElevenLabs error ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return decodePcm16(Buffer.from(await res.arrayBuffer()));
}

/** Prepare narration markup for ElevenLabs (pauses become SSML-style breaks). */
export function toSpeechText(text: string): string {
  return text
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/^---$/gm, "")
    .replace(/\[pause\]/g, '<break time="1.5s" />')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function elevenLabsSpeech(
  apiKey: string,
  input: { text: string; voiceId: string; model: string; previousText?: string; nextText?: string },
): Promise<{ samples: Float32Array; characters: number; cost_cents: number }> {
  const text = toSpeechText(input.text);
  const samples = await call(apiKey, `/text-to-speech/${encodeURIComponent(input.voiceId)}?output_format=pcm_22050`, {
    text,
    model_id: input.model,
    // Slow, steady, intimate delivery for bedtime listening.
    voice_settings: { stability: 0.7, similarity_boost: 0.75, style: 0.15, use_speaker_boost: true, speed: 0.9 },
    previous_text: input.previousText,
    next_text: input.nextText,
  });
  // Approximate list pricing for cost tracking (≈ $0.18 per 1k characters).
  return { samples, characters: text.length, cost_cents: Math.round((text.length / 1000) * 18 * 100) / 100 };
}

export async function elevenLabsSoundEffect(
  apiKey: string,
  input: { prompt: string; model: string; seconds?: number },
): Promise<{ samples: Float32Array; cost_cents: number }> {
  const seconds = Math.min(30, Math.max(5, input.seconds ?? 30));
  const samples = await call(apiKey, `/sound-generation?output_format=pcm_22050`, {
    text: input.prompt,
    model_id: input.model,
    duration_seconds: seconds,
    loop: true,
    prompt_influence: 0.4,
  });
  // Sound effects are billed per second of audio (≈ 40 credits/s); tracked as an estimate.
  return { samples, cost_cents: Math.round(seconds * 0.4 * 100) / 100 };
}
