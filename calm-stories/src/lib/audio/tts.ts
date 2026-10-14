/**
 * Text-to-speech providers. ElevenLabs is the production adapter; the
 * simulated provider renders a soft "murmur" placeholder that follows the
 * rhythm of the text (so pacing/QA are meaningful) and is always flagged
 * `simulated` in the UI. Additional providers implement the same interface.
 */
import type { VoiceProfile } from "@/lib/types";
import { hashString, prng } from "@/lib/util";
import { applyFades } from "./dsp";
import { decodePcm16, SAMPLE_RATE } from "./wav";

export interface TtsRequest {
  text: string;
  voice: VoiceProfile;
  speed: number; // 0.7–1.1
  warmth: number; // 0–1
  stability: number; // 0–1
}

export interface TtsResult {
  samples: Float32Array;
  sampleRate: number;
  simulated: boolean;
  provider: string;
  model: string;
  characters: number;
  cost_cents: number;
}

export interface TtsProvider {
  readonly name: string;
  readonly simulated: boolean;
  synthesize(req: TtsRequest): Promise<TtsResult>;
}

/** Prepare narration markup for TTS. */
export function toSpeechText(text: string, provider: "elevenlabs" | "simulated"): string {
  let t = text.replace(/\*([^*]+)\*/g, "$1").replace(/^---$/gm, "");
  t = provider === "elevenlabs" ? t.replace(/\[pause\]/g, '<break time="1.5s" />') : t.replace(/\[pause\]/g, "…");
  return t.replace(/\n{3,}/g, "\n\n").trim();
}

export class ElevenLabsTts implements TtsProvider {
  readonly name = "elevenlabs";
  readonly simulated = false;
  constructor(
    private readonly apiKey: string,
    private readonly model = "eleven_multilingual_v2",
  ) {}
  async synthesize(req: TtsRequest): Promise<TtsResult> {
    if (!req.voice.approved) throw new Error("This voice isn't approved for use.");
    if (req.voice.provider_voice_id.startsWith("REPLACE_")) throw new Error(`Voice “${req.voice.name}” has no licensed ElevenLabs voice ID configured yet.`);
    const text = toSpeechText(req.text, "elevenlabs");
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(req.voice.provider_voice_id)}?output_format=pcm_22050`, {
      method: "POST",
      headers: { "xi-api-key": this.apiKey, "content-type": "application/json", accept: "audio/pcm" },
      body: JSON.stringify({
        text,
        model_id: this.model,
        voice_settings: {
          stability: req.stability,
          similarity_boost: 0.75,
          style: Math.max(0, Math.min(1, req.warmth * 0.4)),
          use_speaker_boost: true,
          speed: Math.max(0.7, Math.min(1.2, req.speed)),
        },
      }),
    });
    if (!res.ok) throw new Error(`ElevenLabs error ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const samples = decodePcm16(Buffer.from(await res.arrayBuffer()));
    // Approximate list pricing for cost tracking (per 1k characters).
    const costCents = Math.round((text.length / 1000) * 18 * 100) / 100; // ≈ $0.18 per 1k characters
    return { samples, sampleRate: 22050, simulated: false, provider: this.name, model: this.model, characters: text.length, cost_cents: costCents };
  }
}

const VOWELS = /[aeiouy]+/gi;
function syllables(word: string): number {
  const m = word.toLowerCase().replace(/e$/, "").match(VOWELS);
  return Math.max(1, m ? m.length : 1);
}

export class SimulatedTts implements TtsProvider {
  readonly name = "simulated";
  readonly simulated = true;
  async synthesize(req: TtsRequest): Promise<TtsResult> {
    const sr = SAMPLE_RATE;
    const text = toSpeechText(req.text, "simulated");
    const rand = prng(hashString(`${req.voice.id}:${text.slice(0, 200)}`));
    const base = { warm: 165, deep: 105, bright: 210, mellow: 120, airy: 190 }[req.voice.tone] ?? 150;
    const pitch = base * (0.92 + req.warmth * 0.08);
    // ~2.6 syllables/sec at speed 1.0 – a slow storytelling cadence.
    const sylDur = 1 / (2.6 * req.speed);
    const tokens = text.split(/(\s+)/).filter((t) => t.trim());
    const chunks: { dur: number; voiced: boolean; f0: number }[] = [];
    let sentencePos = 0;
    for (const tok of tokens) {
      const n = syllables(tok);
      for (let s = 0; s < n; s++) {
        const decline = 1 - Math.min(0.18, sentencePos * 0.012);
        chunks.push({ dur: sylDur * (0.8 + rand() * 0.4), voiced: true, f0: pitch * decline * (0.95 + rand() * 0.1) });
        sentencePos++;
      }
      chunks.push({ dur: 0.05, voiced: false, f0: 0 });
      if (/[,;:]$/.test(tok)) chunks.push({ dur: 0.35 / req.speed, voiced: false, f0: 0 });
      if (/[.!?…]["”']?$/.test(tok)) {
        chunks.push({ dur: 0.8 / req.speed, voiced: false, f0: 0 });
        sentencePos = 0;
      }
    }
    const total = Math.ceil(chunks.reduce((n, c) => n + c.dur, 0) * sr) + sr;
    const out = new Float32Array(total);
    let pos = Math.floor(sr * 0.3);
    let phase = 0;
    for (const c of chunks) {
      const len = Math.floor(c.dur * sr);
      if (c.voiced) {
        for (let i = 0; i < len && pos + i < total; i++) {
          const env = Math.sin((i / len) * Math.PI) ** 1.5;
          const f = c.f0 * (1 + 0.03 * Math.sin((i / sr) * 2 * Math.PI * 5));
          phase += (2 * Math.PI * f) / sr;
          // Soft "hum" with a couple of harmonics – clearly not speech.
          const v = Math.sin(phase) * 0.6 + Math.sin(phase * 2) * 0.25 * req.warmth + Math.sin(phase * 3) * 0.08;
          out[pos + i] = v * env * 0.22;
        }
      }
      pos += len;
    }
    const trimmed = out.subarray(0, Math.min(total, pos + Math.floor(sr * 0.3)));
    applyFades(trimmed, sr, 0.05, 0.2);
    return { samples: trimmed, sampleRate: sr, simulated: true, provider: this.name, model: "calm-murmur-v1", characters: text.length, cost_cents: 0 };
  }
}

/** Split a script into narration sections (explicit `---` breaks, else ~350-word paragraph groups). */
export function splitSections(script: string, targetWords = 350): string[] {
  const explicit = script.split(/\n\s*---\s*\n/).map((s) => s.trim()).filter(Boolean);
  if (explicit.length > 1) return explicit;
  const paras = script.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const out: string[] = [];
  let cur: string[] = [];
  let words = 0;
  for (const p of paras) {
    cur.push(p);
    words += p.split(/\s+/).length;
    if (words >= targetWords) {
      out.push(cur.join("\n\n"));
      cur = [];
      words = 0;
    }
  }
  if (cur.length) {
    if (out.length && words < targetWords / 3) out[out.length - 1] += `\n\n${cur.join("\n\n")}`;
    else out.push(cur.join("\n\n"));
  }
  return out;
}
