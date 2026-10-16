/**
 * Test doubles for provider HTTP. They return schema-valid, deterministic
 * responses so the real engine, workflows, storage and FFmpeg can be
 * exercised end to end without network access. Never used by the app.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import ffmpegStatic from "ffmpeg-static";

const ffmpegBin = (ffmpegStatic as unknown as string) || "ffmpeg";
import type { TransportRequest, TransportResponse } from "@/lib/studio/llm";

type Json = Record<string, unknown>;

export interface FakeScript {
  /** Decide verdicts by agent + round, etc. */
  calls: TransportRequest[];
  synthesisRounds: number;
}

const PROSE = (n: number) =>
  Array.from({ length: n }, (_, i) =>
    i % 3 === 1
      ? `“The lamps are lit by hand here,” Wren said quietly. “Every one of them.”\n\nOutside, the fields went by in the dark, softer than the last.`
      : `The carriage rocked gently through the dark, and the brass rail was warm beneath her palm. Somewhere ahead the engine breathed its long, patient breath, and the rails answered it.`,
  ).join("\n\n");

function fromSchema(schema: Json, pathKey: string, req: TransportRequest, state: { synthesis: number; qc: number; posterReview: number }): unknown {
  if (schema.anyOf) {
    const nonNull = (schema.anyOf as Json[]).find((s) => s.type !== "null");
    return nonNull ? fromSchema(nonNull, pathKey, req, state) : null;
  }
  if (schema.enum) return (schema.enum as string[])[0];
  switch (schema.type) {
    case "string":
      if (pathKey.endsWith("hex")) return ["#0b1430", "#2a2f6b", "#f2c9a0", "#cfd8ff", "#8a6fb3"][pathKey.length % 5];
      if (pathKey.endsWith("voice_id")) return ["voice_a", "voice_b", "voice_c"][pathKey.length % 3];
      if (pathKey.endsWith(".name") && pathKey.includes("characters")) return ["Wren Alder", "Ilan Mere", "Odile Vass"][pathKey.length % 3];
      if (pathKey.endsWith("speaker")) return "Wren Alder";
      if (pathKey.endsWith("title")) return "The Night Train to Ossery";
      if (pathKey.endsWith("url")) return "https://example.org/source";
      return `${pathKey.split(".").pop()} detail`;
    case "number":
    case "integer":
      return 1;
    case "boolean":
      return true;
    case "array": {
      const items = schema.items as Json;
      return [0, 1, 2].map((i) => fromSchema(items, `${pathKey}[${i}]`, req, state));
    }
    case "object": {
      const out: Json = {};
      for (const [k, v] of Object.entries((schema.properties as Record<string, Json>) ?? {})) out[k] = fromSchema(v, `${pathKey}.${k}`, req, state);
      return out;
    }
    default:
      return null;
  }
}

export function fakeClaude(script: FakeScript) {
  const state = { synthesis: 0, qc: 0, posterReview: 0 };
  return async (req: TransportRequest): Promise<TransportResponse> => {
    script.calls.push(req);
    const usage = { input_tokens: 1200, output_tokens: 800, cache_read_tokens: 4000, cache_write_tokens: 0, web_searches: req.webSearch ? 2 : 0 };
    const model = req.model;
    if (!req.jsonSchema) {
      const prompt = (req.content.find((c) => c.type === "text") as { text: string }).text;
      if (req.webSearch) return { text: "Research notes: listeners value slow pacing and warm settings. Source: https://example.org/genre", model, usage };
      return { text: PROSE(/final scene|Revise scene/.test(prompt) ? 4 : 6), model, usage };
    }
    const props = (req.jsonSchema.properties ?? {}) as Record<string, Json>;
    const data = fromSchema(req.jsonSchema, "root", req, state) as Json;
    // Semantics the workflows rely on.
    if (props.concepts) data.concepts = (data.concepts as Json[]).map((c, i) => ({ ...c, title: ["The Night Train to Ossery", "Lanterns of Vael", "The Glasshouse Court"][i] }));
    if (props.recommended_index) data.recommended_index = 1;
    if (props.genre && props.target_minutes) Object.assign(data, { title: "The Night Train to Ossery", genre: "Sleep Romantasy", target_minutes: 3 });
    if (props.characters && !props.narrator) {
      data.characters = [
        { ...(data.characters as Json[])[0], name: "Wren Alder", role: "lead" },
        { ...(data.characters as Json[])[1], name: "Ilan Mere", role: "love_interest" },
      ];
    }
    if (props.relationships) data.relationships = [{ ...(data.relationships as Json[])[0], a_name: "Wren Alder", b_name: "Ilan Mere" }];
    if (props.issues && props.established_facts) Object.assign(data, { verdict: "approve", issues: [] });
    if (props.poster_prompts) data.character_visuals = [{ name: "Wren Alder", visual_description: "auburn braid, grey wool coat" }];
    if (props.scenes && (props.scenes as Json).items && JSON.stringify(props.scenes).includes("target_words")) {
      data.scenes = [0.8, 0.7, 0.5, 0.35, 0.2].map((intensity, i) => ({ index: i + 1, title: `Scene ${i + 1}`, location: "carriage nine", characters: ["Wren Alder", "Ilan Mere"], purpose: "p", emotional_beat: "b", intensity, sensory_anchors: ["rain"], target_words: 78, dialogue_notes: "d" }));
    }
    if (props.verdict && props.strengths) {
      // Reviews: the critic asks for one revision in round 1, then everyone approves.
      const firstRound = (req.content.find((c) => c.type === "text") as { text: string }).text.includes("draft round 1");
      const revise = req.agent === "story_critic" && firstRound;
      Object.assign(data, { verdict: revise ? "revise" : "approve", issues: revise ? [{ severity: "major", scene_index: 2, quote: "The carriage rocked", problem: "Repetitive opening", suggestion: "Vary the rhythm" }] : [] });
    }
    if (props.decision && props.scene_instructions) {
      state.synthesis++;
      Object.assign(data, state.synthesis === 1 ? { decision: "revise", scene_instructions: [{ scene_index: 2, instructions: ["Vary the rhythm of the opening line"] }] } : { decision: "approve", scene_instructions: [] });
      script.synthesisRounds = state.synthesis;
    }
    if (props.selected_index) {
      const n = req.content.filter((c) => c.type === "image").length;
      data.evaluations = Array.from({ length: n }, (_, i) => ({ image_index: i + 1, strengths: ["light"], issues: [], consistency: "faithful", usable: true }));
      data.selected_index = 1;
    }
    if (props.prompts && props.characters_featured) data.characters_featured = ["Wren Alder"];
    if (props.narrator && props.characters) {
      data.narrator = { direction: "warm, slow", candidates: [{ voice_id: "voice_a", rationale: "warm" }, { voice_id: "voice_b", rationale: "soft" }] };
      data.characters = [{ name: "Wren Alder", direction: "dry wit", candidates: [{ voice_id: "voice_c", rationale: "clear" }] }];
    }
    if (props.entries) data.entries = [{ term: "Ossery", alias: "OSS-er-ee", notes: "town" }];
    if (props.narrator_direction) {
      data.scenes = [1, 2, 3, 4, 5].map((i) => ({ index: i, quote_speakers: [{ quote_number: 1, speaker: "Wren Alder" }], ambience_layers: [{ prompt: "soft rain on a train window", level_db: -24 }], music_cue: i === 1 ? { prompt: "solo piano, slow", level_db: -26 } : null, intensity: 1 - i * 0.15 }));
    }
    if (props.verdict && props.issues && !props.strengths && !props.established_facts) {
      state.qc++;
      Object.assign(data, { verdict: "approve", issues: [] });
    }
    return { text: JSON.stringify(data), model, usage };
  };
}

/* ---------------- HTTP fakes for Gemini and ElevenLabs ---------------- */

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "studio-fakes-"));
function tone(seconds: number, freq: number, file: string): Buffer {
  const out = path.join(tmp, file);
  if (!fs.existsSync(out)) execFileSync(ffmpegBin, ["-loglevel", "error", "-y", "-f", "lavfi", "-i", `sine=frequency=${freq}:duration=${seconds}`, "-ar", "44100", "-ac", "1", "-b:a", "64k", out]);
  return fs.readFileSync(out);
}

export async function fakeProviderFetch() {
  const png = await sharp({ create: { width: 832, height: 1248, channels: 3, background: { r: 20, g: 24, b: 60 } } }).png().toBuffer();
  const counts = { tts: 0, sfx: 0, music: 0, images: 0, voices: 0, dictionaries: 0, imagesWithRefs: 0 };
  const fn = async (url: string | URL, init?: RequestInit): Promise<Response> => {
    const u = String(url);
    const headers = (init?.headers ?? {}) as Record<string, string>;
    if (u.includes("generativelanguage.googleapis.com")) {
      if (headers["x-goog-api-key"] !== "test-gemini") return new Response("bad key", { status: 403 });
      counts.images++;
      const body = JSON.parse(String(init?.body));
      if (body.contents[0].parts.some((p: Json) => p.inlineData)) counts.imagesWithRefs++;
      return Response.json({ candidates: [{ content: { parts: [{ inlineData: { mimeType: "image/png", data: png.toString("base64") } }] } }] });
    }
    if (u.includes("api.elevenlabs.io")) {
      if (headers["xi-api-key"] !== "test-eleven") return new Response("bad key", { status: 401 });
      if (u.endsWith("/v1/voices")) {
        counts.voices++;
        return Response.json({ voices: ["a", "b", "c"].map((x) => ({ voice_id: `voice_${x}`, name: `Voice ${x.toUpperCase()}`, category: "premade", labels: { gender: "female", accent: "british" }, description: "calm" })) });
      }
      if (u.includes("/pronunciation-dictionaries/")) {
        counts.dictionaries++;
        return Response.json({ id: "dict_1", version_id: "ver_1" });
      }
      if (u.includes("/text-to-speech/")) {
        counts.tts++;
        return new Response(new Uint8Array(tone(1.5, 220, "tts.mp3")), { headers: { "request-id": `req_${counts.tts}` } });
      }
      if (u.includes("/sound-generation")) {
        counts.sfx++;
        return new Response(new Uint8Array(tone(4, 90, "sfx.mp3")));
      }
      if (u.includes("/v1/music")) {
        counts.music++;
        return new Response(new Uint8Array(tone(6, 330, "music.mp3")));
      }
    }
    throw new Error(`Unexpected fetch ${u}`);
  };
  return { fn, counts };
}
