/**
 * Text-to-speech providers. ElevenLabs is the production narrator; when no key
 * is configured a simulated narrator renders a soft, speech-paced placeholder
 * murmur timed to the script. It is not a voice and is always labelled so.
 */
import "server-only";
import { env } from "@/lib/env";
import type { VoiceProfile } from "@/lib/types";
import { hashString, prng } from "@/lib/util";
import { DEFAULT_RATE } from "./wav";

export interface VoiceSettings {
  speed: number; // 0.7 – 1.1
  stability: number; // 0 – 1
  warmth: number; // 0 – 1 (maps to ElevenLabs style / mock timbre)
}

export interface SpeechResult {
  samples: Float32Array;
  sampleRate: number;
  provider: string;
  model: string;
  simulated: boolean;
  characters: number;
  costCents: number;
}

export interface VoiceProvider {
  readonly name: "elevenlabs" | "mock";
  readonly simulated: boolean;
  synthesize(text: string, voice: VoiceProfile, settings: VoiceSettings): Promise<SpeechResult>;
}

/** Estimated ElevenLabs list price: US cents per 1,000 characters. */
export const TTS_CENTS_PER_1K_CHARS = 24;

export function estimateTtsCents(chars: number): number {
  return Math.ceil((chars / 1000) * TTS_CENTS_PER_1K_CHARS);
}

export class ElevenLabsProvider implements VoiceProvider {
  readonly name = "elevenlabs" as const;
  readonly simulated = false;
  constructor(
    private readonly apiKey: string,
    private readonly model = "eleven_multilingual_v2",
  ) {}

  async synthesize(text: string, voice: VoiceProfile, s: VoiceSettings): Promise<SpeechResult> {
    if (!voice.approved) throw new Error(`${voice.name} is not an approved voice.`);
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice.provider_voice_id)}?output_format=pcm_${DEFAULT_RATE}`;
    let lastErr: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await fetch(url, {
        method: "POST",
        headers: { "xi-api-key": this.apiKey, "content-type": "application/json", accept: "audio/pcm" },
        body: JSON.stringify({
          text,
          model_id: this.model,
          voice_settings: { stability: s.stability, similarity_boost: 0.75, style: Math.max(0, Math.min(1, s.warmth * 0.4)), use_speaker_boost: true, speed: Math.max(0.7, Math.min(1.2, s.speed)) },
        }),
      });
      if (res.ok) {
        const buf = new Uint8Array(await res.arrayBuffer());
        const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
        const out = new Float32Array(Math.floor(buf.byteLength / 2));
        for (let i = 0; i < out.length; i++) out[i] = view.getInt16(i * 2, true) / 0x8000;
        return { samples: out, sampleRate: DEFAULT_RATE, provider: this.name, model: this.model, simulated: false, characters: text.length, costCents: estimateTtsCents(text.length) };
      }
      lastErr = new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 200)}`);
      if (res.status !== 429 && res.status < 500) break;
      await new Promise((r) => setTimeout(r, 800 * 2 ** attempt));
    }
    throw lastErr instanceof Error ? lastErr : new Error("Narration failed");
  }
}

const VOICE_PITCH: Record<string, number> = { Warm: 190, Mellow: 112, Bright: 215, Deep: 92 };

/**
 * Simulated narrator. Renders a quiet, pitched murmur with word, comma,
 * sentence and paragraph timing so pacing, mixing and QA can be exercised
 * end to end without a TTS provider.
 */
export class MockVoiceProvider implements VoiceProvider {
  readonly name = "mock" as const;
  readonly simulated = true;

  async synthesize(text: string, voice: VoiceProfile, s: VoiceSettings): Promise<SpeechResult> {
    return { samples: mockSpeech(text, voice, s), sampleRate: DEFAULT_RATE, provider: this.name, model: "calm-placeholder-murmur", simulated: true, characters: text.length, costCents: 0 };
  }
}

function syllables(word: string): number {
  const m = word.toLowerCase().replace(/[^a-z]/g, "").match(/[aeiouy]+/g);
  return Math.max(1, m?.length ?? 1);
}

export function mockSpeech(text: string, voice: Pick<VoiceProfile, "tone" | "id">, s: VoiceSettings, rate = DEFAULT_RATE): Float32Array {
  const rand = prng(hashString(voice.id + text.slice(0, 200)));
  const f0Base = VOICE_PITCH[voice.tone] ?? 150;
  const speed = Math.max(0.6, Math.min(1.2, s.speed));
  // Sleep narration sits around 110–130 words per minute at speed 1.
  const syllableSec = 0.205 / speed;
  const tokens = text.split(/(\s+)/).filter((t) => t.trim());
  const events: { start: number; dur: number; f0: number }[] = [];
  let t = 0.25;
  for (const tok of tokens) {
    const dur = syllables(tok) * syllableSec;
    events.push({ start: t, dur, f0: f0Base * (0.94 + rand() * 0.12) });
    t += dur + 0.045 / speed;
    if (/[,;:—–]$/.test(tok)) t += 0.32 / speed;
    if (/[.!?…]["”']?$/.test(tok)) t += 0.75 / speed;
  }
  t += 0.6;
  const out = new Float32Array(Math.ceil(t * rate));
  const breathiness = 0.25 + (1 - s.stability) * 0.25;
  const brightness = 0.55 - s.warmth * 0.3;
  for (const e of events) {
    const i0 = Math.floor(e.start * rate);
    const n = Math.floor(e.dur * rate);
    let phase = 0;
    let lp = 0;
    for (let k = 0; k < n && i0 + k < out.length; k++) {
      const x = k / n;
      const env = Math.min(1, x / 0.12) * Math.min(1, (1 - x) / 0.2) * (0.8 + 0.2 * Math.sin(x * Math.PI * 3));
      const f = e.f0 * (1 + 0.04 * Math.sin(x * Math.PI) - 0.03 * x);
      phase += (2 * Math.PI * f) / rate;
      let v = 0;
      for (let h = 1; h <= 6; h++) v += Math.sin(phase * h) * (h === 1 ? 1 : brightness / h);
      v = v * (1 - breathiness) + (rand() * 2 - 1) * breathiness * 0.4;
      lp += 0.18 * (v - lp);
      out[i0 + k] = (out[i0 + k] ?? 0) + lp * env * 0.22;
    }
  }
  return out;
}

export function voiceProviderFor(choice: "auto" | "elevenlabs" | "mock"): VoiceProvider {
  if (choice !== "mock" && env.elevenLabsApiKey) return new ElevenLabsProvider(env.elevenLabsApiKey);
  return new MockVoiceProvider();
}
