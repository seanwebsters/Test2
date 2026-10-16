import "server-only";

/**
 * ElevenLabs API adapter: voice library, text-to-speech with request
 * stitching and pronunciation dictionaries, sound effects and music.
 */
const BASE = "https://api.elevenlabs.io";

export class ElevenLabsError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryAfterMs: number | null = null,
  ) {
    super(message);
  }
}

async function request(apiKey: string, path: string, init: { method?: string; body?: unknown; accept?: string } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method: init.method ?? (init.body ? "POST" : "GET"),
    headers: { "xi-api-key": apiKey, ...(init.body ? { "content-type": "application/json" } : {}), ...(init.accept ? { accept: init.accept } : {}) },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  if (!res.ok) {
    const retry = Number(res.headers.get("retry-after"));
    throw new ElevenLabsError(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 300)}`, res.status, Number.isFinite(retry) && retry > 0 ? retry * 1000 : null);
  }
  return res;
}

export interface ElevenVoice {
  voice_id: string;
  name: string;
  category: string;
  description: string | null;
  labels: Record<string, string>;
  preview_url: string | null;
}

/** Voices available to this account (premade, library voices you added, your own clones/professional voices). */
export async function listVoices(apiKey: string): Promise<ElevenVoice[]> {
  const res = await request(apiKey, "/v1/voices");
  const json = (await res.json()) as { voices: ElevenVoice[] };
  return json.voices.map((v) => ({ voice_id: v.voice_id, name: v.name, category: v.category, description: v.description ?? null, labels: v.labels ?? {}, preview_url: v.preview_url ?? null }));
}

export interface SpeechInput {
  text: string;
  voiceId: string;
  model: string;
  previousText?: string;
  nextText?: string;
  previousRequestIds?: string[];
  dictionary?: { id: string; versionId: string } | null;
  settings?: { stability?: number; similarity_boost?: number; style?: number; speed?: number };
}

/** Text-to-speech as 44.1 kHz MP3. Returns the request id for stitching consecutive segments. */
export async function synthesizeSpeech(apiKey: string, input: SpeechInput): Promise<{ audio: Buffer; requestId: string | null; characters: number }> {
  const res = await request(apiKey, `/v1/text-to-speech/${encodeURIComponent(input.voiceId)}?output_format=mp3_44100_128`, {
    accept: "audio/mpeg",
    body: {
      text: input.text,
      model_id: input.model,
      voice_settings: { stability: 0.62, similarity_boost: 0.78, style: 0.18, use_speaker_boost: true, speed: 0.92, ...input.settings },
      previous_text: input.previousText || undefined,
      next_text: input.nextText || undefined,
      previous_request_ids: input.previousRequestIds?.length ? input.previousRequestIds.slice(-3) : undefined,
      pronunciation_dictionary_locators: input.dictionary ? [{ pronunciation_dictionary_id: input.dictionary.id, version_id: input.dictionary.versionId }] : undefined,
    },
  });
  return { audio: Buffer.from(await res.arrayBuffer()), requestId: res.headers.get("request-id"), characters: input.text.length };
}

/** Create a pronunciation dictionary from alias rules. */
export async function createPronunciationDictionary(apiKey: string, name: string, rules: { term: string; alias: string }[]): Promise<{ id: string; versionId: string }> {
  const res = await request(apiKey, "/v1/pronunciation-dictionaries/add-from-rules", {
    body: { name, rules: rules.map((r) => ({ type: "alias", string_to_replace: r.term, alias: r.alias })) },
  });
  const json = (await res.json()) as { id: string; version_id: string };
  return { id: json.id, versionId: json.version_id };
}

/** A sound effect / ambience bed (MP3), seamlessly loopable when `loop` is set. */
export async function soundEffect(apiKey: string, input: { prompt: string; model: string; seconds: number; loop: boolean }): Promise<Buffer> {
  const res = await request(apiKey, "/v1/sound-generation?output_format=mp3_44100_128", {
    accept: "audio/mpeg",
    body: { text: input.prompt, model_id: input.model, duration_seconds: Math.min(30, Math.max(1, input.seconds)), loop: input.loop, prompt_influence: 0.45 },
  });
  return Buffer.from(await res.arrayBuffer());
}

/** A music cue (MP3) from a text prompt. */
export async function composeMusic(apiKey: string, input: { prompt: string; model: string; seconds: number }): Promise<Buffer> {
  const res = await request(apiKey, "/v1/music?output_format=mp3_44100_128", {
    accept: "audio/mpeg",
    body: { prompt: input.prompt, model_id: input.model, music_length_ms: Math.round(Math.min(300, Math.max(10, input.seconds)) * 1000), force_instrumental: true },
  });
  return Buffer.from(await res.arrayBuffer());
}

/** Approximate list prices, for cost tracking only. */
export const ELEVEN_PRICES = { tts_per_1k_chars_cents: 18, tts_flash_per_1k_chars_cents: 9, sfx_per_second_cents: 0.4, music_per_minute_cents: 50 };
