import "server-only";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { env } from "@/lib/env";
import { getDb } from "@/lib/db";
import { getStorage } from "@/lib/storage";
import { newId, nowIso } from "@/lib/util";
import { decodeWav } from "@/lib/audio/wav";
import { analyzeAudio } from "@/lib/audio/qa";
import { composeMusic, createPronunciationDictionary, ElevenLabsError, ELEVEN_PRICES, listVoices, soundEffect, synthesizeSpeech, type ElevenVoice } from "@/lib/providers/elevenlabs";
import { currentDeliverable, getBible, seriesContext } from "../bible";
import { registerHandler, type NewStep, type StepContext } from "../engine";
import { BlockedError, RateLimitedError, StepFailure } from "../errors";
import { joinSegments, masterEpisode, measureLoudness, mixScene, probeSeconds, requireFfmpeg, runFfmpeg, withTmp } from "../mixing";
import { AudioDirectionSchema, CastingSchema, PronunciationSchema, QcReportSchema, type AudioDirection, type QcReport } from "../schemas";
import { getStudioSettings } from "../settings";
import { coverSteps } from "./art-steps";
import { scriptText, type ScriptData } from "./episode";

/* ------------------------------------------------------------------ */
/* ElevenLabs call wrapper                                             */
/* ------------------------------------------------------------------ */

function elevenKey(): string {
  if (!env.elevenLabsApiKey) throw new BlockedError("ELEVENLABS_API_KEY", "Connect an ElevenLabs API key so the Audio Director and Audio Producer can cast voices, narrate and score.");
  return env.elevenLabsApiKey;
}

async function eleven<T>(ctx: StepContext, op: string, estimateCents: number, fn: (key: string) => Promise<T>, usage: { characters?: number; seconds?: number }): Promise<T> {
  const key = elevenKey();
  // Audio isn't capped by the run budget: it runs until the ElevenLabs credits run out
  // (ElevenLabs then refuses and the step waits). Spend is still recorded for Analytics.
  try {
    const out = await fn(key);
    const settings = await getStudioSettings();
    await getDb().insert("usage_records", {
      id: newId("use"),
      run_id: ctx.run.id,
      step_id: ctx.step.key,
      series_id: ctx.run.series_id,
      agent: ctx.step.agent,
      provider: "elevenlabs",
      operation: op,
      model: op === "tts" ? settings.tts_model : op === "sfx" ? settings.sfx_model : op === "music" ? settings.music_model : "-",
      input_tokens: 0,
      output_tokens: 0,
      cache_read_tokens: 0,
      cache_write_tokens: 0,
      characters: usage.characters ?? 0,
      seconds: usage.seconds ?? 0,
      images: 0,
      cost_cents: estimateCents,
      created_at: nowIso(),
    });
    return out;
  } catch (err) {
    if (err instanceof ElevenLabsError) {
      if (err.status === 401 || err.status === 403) throw new BlockedError("ELEVENLABS_API_KEY", `ElevenLabs rejected the request (${err.status}). Check ELEVENLABS_API_KEY and plan permissions. ${err.message.slice(0, 160)}`);
      if (err.status === 429) throw new RateLimitedError("ElevenLabs", err.retryAfterMs ?? 20_000);
      if (err.status >= 500) throw new StepFailure(err.message, true);
      throw new StepFailure(err.message);
    }
    throw err;
  }
}

/** Flash/Turbo TTS costs about half of Multilingual/v3 per character. */
const ttsRate = (model: string) => (/flash|turbo/.test(model) ? ELEVEN_PRICES.tts_flash_per_1k_chars_cents : ELEVEN_PRICES.tts_per_1k_chars_cents);
/** Stored intermediates are MP3 (a tenth of the size of WAV) to keep the volume small. */
async function toMp3(dir: string, wavPath: string, name: string): Promise<Buffer> {
  const out = path.join(dir, `${name}-store.mp3`);
  await runFfmpeg(["-i", wavPath, "-c:a", "libmp3lame", "-b:a", "192k", out]);
  return fs.readFileSync(out);
}

/** Write a stored file back as WAV for mixing (older renders were stored as WAV already). */
async function restoreAudio(dir: string, data: Buffer, key: string, wavPath: string) {
  if (key.endsWith(".wav")) return fs.writeFileSync(wavPath, data);
  const tmp = path.join(dir, `restore-${path.basename(key)}`);
  fs.writeFileSync(tmp, data);
  await runFfmpeg(["-i", tmp, "-c:a", "pcm_s16le", "-ar", "44100", wavPath]);
}

const ttsCost = (chars: number, model: string) => Math.round((chars / 1000) * ttsRate(model) * 100) / 100;

/** At most this many ambience beds per scene (each is a paid generation the first time). */
const MAX_AMBIENCE_LAYERS = 2;
/** Library music length; the mixer loops it under the scene. */
const LIBRARY_MUSIC_SECONDS = 60;

/** Per-series sound library: identical prompts reuse the stored file instead of paying again. */
const libraryKey = (seriesId: string, kind: "sfx" | "music", prompt: string) =>
  `audio/${seriesId}/library/${kind}-${crypto.createHash("sha256").update(prompt.trim().toLowerCase().replace(/\s+/g, " ")).digest("hex").slice(0, 16)}.mp3`;

async function seriesSoundPalette(seriesId: string, excludeEpisodeId: string): Promise<{ ambience: string[]; music: string[] }> {
  const rows = await getDb().list("deliverables", { where: { series_id: seriesId, key: "audio_direction" } as never });
  const ambience = new Set<string>();
  const music = new Set<string>();
  for (const r of rows) {
    if (r.episode_id === excludeEpisodeId) continue;
    const d = r.data as AudioDirection | undefined;
    for (const sc of d?.scenes ?? []) {
      for (const l of sc.ambience_layers ?? []) ambience.add(l.prompt);
      if (sc.music_cue) music.add(sc.music_cue.prompt);
    }
  }
  return { ambience: [...ambience].slice(0, 12), music: [...music].slice(0, 3) };
}

/* ------------------------------------------------------------------ */
/* Casting & pronunciation (after greenlight)                          */
/* ------------------------------------------------------------------ */

function voiceCard(v: ElevenVoice) {
  const l = v.labels;
  return `${v.voice_id} | ${v.name} | ${v.category} | ${[l.gender, l.age, l.accent, l.description, l.use_case].filter(Boolean).join(", ")} | ${v.description ?? ""}`.slice(0, 260);
}

const CALM = /\b(calm|calming|soothing|soft|gentle|warm|relax|relaxing|meditat\w*|sleep|asmr|narrat\w*|audiobook|storytell\w*|mellow|smooth|quiet|whisper\w*|velvety|low)\b/i;
const NOT_CALM = /\b(energetic|excited|upbeat|loud|intense|aggressive|news|announcer|commercial|advert\w*|hyped|shouty|video ?games?|cartoon|animat\w*|childish)\b/i;

/** Rank voices for a calm sleep-story narrator from their ElevenLabs labels. Used when Claude's picks aren't in the account. */
export function calmNarratorCandidates(voices: ElevenVoice[], n = 3): ElevenVoice[] {
  const score = (v: ElevenVoice) => {
    const text = [v.name, v.description ?? "", ...Object.values(v.labels)].join(" ");
    const calm = text.match(new RegExp(CALM.source, "gi"))?.length ?? 0;
    return calm * 2 - (NOT_CALM.test(text) ? 5 : 0) + (/narrat|audiobook|meditat/i.test(v.labels.use_case ?? "") ? 3 : 0);
  };
  return [...voices].sort((a, b) => score(b) - score(a)).slice(0, n);
}

/**
 * Find a voice by the name the studio knows it by (e.g. "Theo Silk Slow" matches
 * "Theo – Silky & Slow"): every word of the wanted name must start a word of the
 * voice's name. Falls back to the first word alone (e.g. just "Theo").
 */
export function findVoiceByName(voices: ElevenVoice[], wanted: string): ElevenVoice | null {
  const words = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const want = words(wanted);
  if (!want.length) return null;
  const matches = (v: ElevenVoice, ws: string[]) => ws.every((w) => words(v.name).some((n) => n.startsWith(w)));
  return voices.find((v) => matches(v, want)) ?? voices.find((v) => matches(v, want.slice(0, 1))) ?? null;
}

/** Narrator delivery: steadier and less theatrical than character voices, so it soothes. */
export const NARRATOR_VOICE_SETTINGS = { stability: 0.78, similarity_boost: 0.75, style: 0.05 };

registerHandler("audio.casting", async (ctx) => {
  const db = getDb();
  const sid = ctx.run.series_id!;
  const key = elevenKey();
  let voices: ElevenVoice[];
  try {
    voices = await listVoices(key);
  } catch (err) {
    if (err instanceof ElevenLabsError && (err.status === 401 || err.status === 403)) throw new BlockedError("ELEVENLABS_API_KEY", `ElevenLabs refused to list voices (${err.status}) – the key needs the Voices (read) permission. ${err.message.slice(0, 200)}`);
    throw err;
  }
  if (!voices.length) throw new BlockedError("elevenlabs:voices", "Your ElevenLabs account has no voices. Add licensed voices to your ElevenLabs library, then resume.");
  const settings = await getStudioSettings();
  // One-narrator house style: nobody else needs a voice.
  const chars = settings.single_narrator ? [] : (await db.list("characters", { where: { series_id: sid } })).filter((c) => c.role !== "narrator");
  const preferred = settings.narrator_voice.trim() ? findVoiceByName(voices, settings.narrator_voice) : null;
  if (settings.narrator_voice.trim() && !preferred) ctx.log(`The narrator voice “${settings.narrator_voice}” isn't in your ElevenLabs account (add it to My Voices). Casting the calmest available voice instead.`, "warn");
  const direction = "Slow, silky and calming: warm, soft and unhurried, intimate rather than performed, reading every part – characters included – in one gentle voice that softens further as the episode goes on.";
  const res = preferred && !chars.length
    ? { data: { narrator: { direction, candidates: [{ voice_id: preferred.voice_id, rationale: "The studio's house narrator (Settings → Narrator voice)." }] }, characters: [] as { name: string; direction: string; candidates: { voice_id: string; rationale: string }[] }[] }, model: "settings" }
    : await ctx.claude({
    context: await seriesContext(sid),
    prompt: `Cast this series from the voices available in our ElevenLabs account (only these – they are the voices we hold rights to use). Every series MUST have a narrator – they read all the prose and most of the episode, so they matter most. The narrator must be calming: warm, low, soft and unhurried, intimate rather than performed, the kind of voice that helps a listener fall asleep (prefer voices described as calm, soothing, gentle, warm, meditation, audiobook or narration; never energetic, upbeat, announcer, news, commercial or cartoon voices). Then choose a voice for each speaking character (${chars.map((c) => c.name).join(", ")}). Give two or three candidates per role, best first, with reasons.\n\nVoices (id | name | category | labels | description):\n${voices.map(voiceCard).join("\n")}`,
    schema: CastingSchema,
  });
  const valid = new Set(voices.map((v) => v.voice_id));
  const name = (id: string) => voices.find((v) => v.voice_id === id)?.name ?? id;
  // A narrator is mandatory: if none of Claude's picks exist in the account, fall back to the calmest voices we hold.
  let narratorCandidates = res.data.narrator.candidates.filter((c) => valid.has(c.voice_id));
  if (preferred) narratorCandidates = [{ voice_id: preferred.voice_id, rationale: "The studio's house narrator (Settings → Narrator voice)." }, ...narratorCandidates.filter((c) => c.voice_id !== preferred.voice_id)];
  if (!narratorCandidates.length) {
    narratorCandidates = calmNarratorCandidates(voices).map((v) => ({ voice_id: v.voice_id, rationale: "Calmest voice in the account by its ElevenLabs labels (fallback – the suggested voices weren't available)." }));
    ctx.log("None of the suggested narrator voices are in the ElevenLabs account; auditioning the calmest available voices instead.", "warn");
  }
  const roles = [{ characterId: null as string | null, label: "Narrator", line: "Settle in. The night is long, and there is nowhere you need to be.", candidates: narratorCandidates }];
  for (const c of res.data.characters) {
    const ch = chars.find((x) => x.name.toLowerCase() === c.name.toLowerCase());
    if (ch) roles.push({ characterId: ch.id, label: ch.name, line: "", candidates: c.candidates });
  }
  let auditions = 0;
  for (const role of roles) {
    const picks = role.candidates.filter((c) => valid.has(c.voice_id)).slice(0, role.characterId ? 2 : 3);
    if (!picks.length) continue;
    const ch = role.characterId ? chars.find((c) => c.id === role.characterId) : null;
    const line = role.line || `${ch?.speech_style.includes("?") ? "" : ""}I wasn't expecting you tonight. Sit, if you like – the fire's still warm.`;
    for (const [i, p] of picks.entries()) {
      const exists = await db.findOne("voice_auditions", { series_id: sid, character_id: role.characterId, voice_id: p.voice_id });
      let sampleKey = exists?.sample_key ?? null;
      if (!sampleKey) {
        const out = await eleven(ctx, "tts", ttsCost(line.length, settings.tts_model), (k) => synthesizeSpeech(k, { text: line, voiceId: p.voice_id, model: settings.tts_model }), { characters: line.length });
        sampleKey = `audio/${sid}/auditions/${role.characterId ?? "narrator"}-${p.voice_id}.mp3`;
        await getStorage().put(sampleKey, out.audio, "audio/mpeg");
      }
      if (!exists) {
        await db.insert("voice_auditions", { id: newId("aud"), series_id: sid, character_id: role.characterId, voice_id: p.voice_id, voice_name: name(p.voice_id), rationale: p.rationale, sample_key: sampleKey, selected: i === 0, created_at: nowIso() });
        auditions++;
      }
    }
    if (ch) await db.update("characters", ch.id, { voice_id: picks[0]!.voice_id, voice_name: name(picks[0]!.voice_id), updated_at: nowIso() });
  }
  // Make sure exactly one narrator is selected (e.g. after re-casting, earlier auditions may exist unselected).
  const narratorAuditions = await db.list("voice_auditions", { where: { series_id: sid, character_id: null } });
  if (!narratorAuditions.length) throw new StepFailure("No narrator voice could be auditioned. Add a calm narration voice to your ElevenLabs library, then retry.");
  if (!narratorAuditions.some((a) => a.selected)) {
    const best = narratorAuditions.find((a) => a.voice_id === narratorCandidates[0]?.voice_id) ?? narratorAuditions[0]!;
    await db.update("voice_auditions", best.id, { selected: true });
  }
  await ctx.deliver({ kind: "casting", key: "casting", title: "Voice casting", data: res.data, reasoning: res.data.narrator.direction, model: res.model });
  const narrator = (await db.list("voice_auditions", { where: { series_id: sid, character_id: null, selected: true } }))[0]!;
  return { summary: `Narrator: ${narrator.voice_name}. ${auditions} audition(s) recorded – change any choice in the Audio Studio.` };
});

registerHandler("audio.pronunciation", async (ctx) => {
  const db = getDb();
  const sid = ctx.run.series_id!;
  const res = await ctx.claude({
    context: await seriesContext(sid),
    prompt: "List every invented or unusual name and word in this bible (characters, places, cultures, magic terms) that a narrator might mispronounce, with a plain-English respelling the voice will read naturally.",
    schema: PronunciationSchema,
  });
  for (const p of await db.list("pronunciations", { where: { series_id: sid } })) await db.remove("pronunciations", p.id);
  for (const e of res.data.entries) await db.insert("pronunciations", { id: newId("pr"), series_id: sid, term: e.term, alias: e.alias, notes: e.notes, created_at: nowIso() });
  const series = await db.get("series", sid);
  let dict: { id: string; versionId: string } | null = null;
  if (res.data.entries.length) {
    try {
      dict = await eleven(ctx, "dictionary", 0, (k) => createPronunciationDictionary(k, `${series?.title ?? sid} – names`.slice(0, 90), res.data.entries), {});
    } catch (err) {
      // Nice to have, not essential: carry on without it if the key lacks the permission.
      if (!(err instanceof BlockedError)) throw err;
      ctx.log(`Skipped the ElevenLabs pronunciation dictionary: ${err.message.slice(0, 240)}`, "warn");
    }
  }
  await ctx.deliver({ kind: "pronunciation_dictionary", key: "pronunciation_dictionary", title: "Pronunciation dictionary", data: { entries: res.data.entries, dictionary: dict }, reasoning: `${res.data.entries.length} entries`, model: res.model });
  return { summary: `${res.data.entries.length} pronunciation entries${dict ? " uploaded to ElevenLabs" : ""}.` };
});

async function dictionaryFor(seriesId: string): Promise<{ id: string; versionId: string } | null> {
  const d = await currentDeliverable<{ dictionary: { id: string; versionId: string } | null }>({ series_id: seriesId }, "pronunciation_dictionary");
  return d?.data.dictionary ?? null;
}

/* ------------------------------------------------------------------ */
/* Episode audio                                                       */
/* ------------------------------------------------------------------ */

const QUOTE = /“[^”]+”|"[^"\n]+"/g;

export function splitPerformance(text: string): { kind: "narration" | "quote"; text: string; quoteNumber: number | null }[] {
  const out: { kind: "narration" | "quote"; text: string; quoteNumber: number | null }[] = [];
  let last = 0;
  let q = 0;
  for (const m of text.matchAll(QUOTE)) {
    const before = text.slice(last, m.index).trim();
    if (before) out.push({ kind: "narration", text: before, quoteNumber: null });
    out.push({ kind: "quote", text: m[0], quoteNumber: ++q });
    last = (m.index ?? 0) + m[0].length;
  }
  const rest = text.slice(last).trim();
  if (rest) out.push({ kind: "narration", text: rest, quoteNumber: null });
  return out;
}

registerHandler("audio.direction", async (ctx) => {
  const db = getDb();
  const ep = (await db.get("episodes", ctx.run.episode_id!))!;
  const sfx = String(ctx.step.params.sfx ?? "");
  const script = (await currentDeliverable<ScriptData>({ episode_id: ep.id }, "script"))!.data;
  const quotesPerScene = script.scenes.map((s) => ({ index: s.index, quotes: splitPerformance(s.text).filter((p) => p.kind === "quote").map((p) => `${p.quoteNumber}. ${p.text.slice(0, 120)}`) }));
  const settings = await getStudioSettings();
  const palette = await seriesSoundPalette(ep.series_id, ep.id);
  const reuse = palette.ambience.length || palette.music.length
    ? `\n\nThe series already has these sounds in its library – reuse a prompt word for word whenever it fits (reused sounds are free; new ones cost money):\nAmbience: ${palette.ambience.map((a) => `"${a}"`).join("; ") || "none"}\nMusic: ${palette.music.map((m) => `"${m}"`).join("; ") || "none"}`
    : "";
  const res = await ctx.claude({
    context: await seriesContext(ep.series_id),
    prompt: `Plan the audio for episode ${ep.number}, “${ep.title}”.\n1. Narrator direction: the narrator reads all the prose and must sound calming throughout – warm, soft, unhurried and intimate, never dramatic; describe the pace, warmth and how delivery softens further through the episode.\n2. For each scene: who speaks each numbered quote (character name, or "narrator" for quoted text that isn't speech), one or two natural ambience layers with levels relative to the voice (typically −20 to −30 dB), and the scene intensity. Reuse the same ambience prompt across scenes in the same place.\n${settings.episode_music ? "3. At most ONE delicate instrumental music cue for the whole episode: give the identical cue to the scenes that should carry it and null elsewhere." : "3. No music: set every music_cue to null."} Everything gets quieter and sparser as the episode progresses.${reuse}\n\n${scriptText(script, { numbered: true })}\n\nQuotes by scene:\n${quotesPerScene.map((q) => `Scene ${q.index}:\n${q.quotes.join("\n") || "(none)"}`).join("\n")}`,
    schema: AudioDirectionSchema,
  });
  await ctx.deliver({ kind: "audio_direction", key: "audio_direction", title: "Audio direction", data: res.data, reasoning: res.data.narrator_direction, model: res.model });
  const sceneSteps: NewStep[] = script.scenes.map((s) => ({
    key: `audio_scene_${s.index}${sfx}`,
    type: "audio.scene",
    agent: "audio_producer",
    label: `Narrate and mix scene ${s.index}`,
    activity: "typing",
    deps: [ctx.step.key],
    params: { scene_index: s.index },
  }));
  const coverKey = `cover_review${sfx}`;
  const hasCover = Boolean(await ctx.stepByKey(coverKey));
  return {
    summary: `${script.scenes.length} scene plans; ${res.data.scenes.reduce((n, s) => n + s.ambience_layers.length, 0)} ambience layers, ${res.data.scenes.filter((s) => s.music_cue).length} music cues.`,
    addSteps: [
      ...sceneSteps,
      { key: `audio_master${sfx}`, type: "audio.master", agent: "audio_producer", label: "Master the episode", activity: "typing", deps: sceneSteps.map((s) => s.key) },
      { key: `qc${sfx}`, type: "qc.review", agent: "quality_controller", label: "Quality control", activity: "reading", deps: [`audio_master${sfx}`, ...(hasCover ? [coverKey] : [])], params: { round: 1, sfx } },
    ],
  };
});

registerHandler("audio.scene", async (ctx) => {
  const db = getDb();
  const storage = getStorage();
  requireFfmpeg();
  const ep = (await db.get("episodes", ctx.run.episode_id!))!;
  const idx = Number(ctx.step.params.scene_index);
  const revoice = Boolean(ctx.step.params.revoice);
  const remix = Boolean(ctx.step.params.remix);
  const script = (await currentDeliverable<ScriptData>({ episode_id: ep.id }, "script"))!.data;
  const direction = (await currentDeliverable<AudioDirection>({ episode_id: ep.id }, "audio_direction"))!.data;
  const scene = script.scenes.find((s) => s.index === idx);
  const plan = direction.scenes.find((s) => s.index === idx);
  if (!scene || !plan) throw new StepFailure(`Scene ${idx} is missing from the script or audio plan.`);
  const settings = await getStudioSettings();
  const chars = await db.list("characters", { where: { series_id: ep.series_id } });
  const narrator = (await db.list("voice_auditions", { where: { series_id: ep.series_id, character_id: null, selected: true } }))[0];
  if (!narrator) throw new BlockedError("casting", "No narrator voice is cast for this series. Cast one in the Audio Studio, then resume.");
  const dictionary = await dictionaryFor(ep.series_id);
  const prev = (await db.list("scene_renders", { where: { episode_id: ep.id, scene_index: idx, status: "current" } }))[0];

  return withTmp(async (dir) => {
    /* ---- Narration (reused unless re-voicing) ---- */
    const narrPath = path.join(dir, "narration.wav");
    let narrationKey = !revoice && prev?.narration_key ? prev.narration_key : null;
    if (narrationKey) {
      await restoreAudio(dir, (await storage.get(narrationKey))!.data, narrationKey, narrPath);
    } else {
      const parts = splitPerformance(scene.text);
      // Merge narration runs; attribute quotes to cast voices.
      const segments: { text: string; voiceId: string }[] = [];
      for (const p of parts) {
        let voiceId = narrator.voice_id;
        if (p.kind === "quote" && !settings.single_narrator) {
          const who = plan.quote_speakers.find((q) => q.quote_number === p.quoteNumber)?.speaker ?? "narrator";
          const ch = chars.find((c) => who.toLowerCase().includes(c.name.toLowerCase().split(" ")[0]!.toLowerCase()));
          if (ch?.voice_id) voiceId = ch.voice_id;
        }
        const lastSeg = segments[segments.length - 1];
        if (lastSeg && lastSeg.voiceId === voiceId) lastSeg.text += ` ${p.text}`;
        else segments.push({ text: p.text, voiceId });
      }
      const files: { file: string; pauseAfter: number }[] = [];
      const reqIds: string[] = [];
      for (const [i, seg] of segments.entries()) {
        const out = await eleven(
          ctx,
          "tts",
          ttsCost(seg.text.length, settings.tts_model),
          (k) =>
            synthesizeSpeech(k, {
              text: seg.text,
              voiceId: seg.voiceId,
              model: settings.tts_model,
              previousText: segments[i - 1]?.text.slice(-400),
              nextText: segments[i + 1]?.text.slice(0, 400),
              previousRequestIds: reqIds.slice(-3),
              dictionary,
              settings: { ...(seg.voiceId === narrator.voice_id ? NARRATOR_VOICE_SETTINGS : {}), speed: 0.9 - (1 - plan.intensity) * 0.04 },
            }),
          { characters: seg.text.length },
        );
        if (out.requestId) reqIds.push(out.requestId);
        const f = path.join(dir, `seg_${i}.mp3`);
        fs.writeFileSync(f, out.audio);
        const endsParagraph = /\n\s*\n\s*$/.test(seg.text) || i === segments.length - 1;
        files.push({ file: f, pauseAfter: endsParagraph ? 1.1 : 0.35 });
      }
      await joinSegments(dir, files, narrPath);
      narrationKey = `audio/${ep.series_id}/${ep.id}/scene-${idx}/narration-${Date.now()}.mp3`;
      await storage.put(narrationKey, await toMp3(dir, narrPath, "narr"), "audio/mpeg");
    }
    const narrSec = await probeSeconds(narrPath);

    /* ---- Ambience and music (reused unless remixing with a new plan) ---- */
    const layerFiles: { file: string; gainDb: number }[] = [];
    const ambienceKeys: string[] = [];
    for (const [i, layer] of plan.ambience_layers.slice(0, MAX_AMBIENCE_LAYERS).entries()) {
      let k = !remix ? (prev?.ambience_keys[i] ?? null) : null;
      if (!k) {
        k = libraryKey(ep.series_id, "sfx", layer.prompt);
        if (!(await storage.get(k, { start: 0, end: 0 }))) {
          const audio = await eleven(ctx, "sfx", 30 * ELEVEN_PRICES.sfx_per_second_cents, (key) => soundEffect(key, { prompt: `${layer.prompt}. Seamless loop, gentle, no voices, no sudden sounds.`, model: settings.sfx_model, seconds: 30, loop: true }), { seconds: 30 });
          await storage.put(k, audio, "audio/mpeg");
        }
      }
      const f = path.join(dir, `amb_${i}.mp3`);
      fs.writeFileSync(f, (await storage.get(k))!.data);
      layerFiles.push({ file: f, gainDb: layer.level_db });
      ambienceKeys.push(k);
    }
    let musicKey: string | null = null;
    let music: { file: string; gainDb: number } | null = null;
    if (plan.music_cue && settings.episode_music) {
      musicKey = !remix ? (prev?.music_key ?? null) : null;
      const seconds = LIBRARY_MUSIC_SECONDS;
      if (!musicKey) {
        musicKey = libraryKey(ep.series_id, "music", plan.music_cue.prompt);
        if (!(await storage.get(musicKey, { start: 0, end: 0 }))) {
          const audio = await eleven(ctx, "music", (seconds / 60) * ELEVEN_PRICES.music_per_minute_cents, (key) => composeMusic(key, { prompt: `${plan.music_cue!.prompt}. Delicate, slow, soothing instrumental for a bedtime story; no percussion hits, no vocals.`, model: settings.music_model, seconds }), { seconds });
          await storage.put(musicKey, audio, "audio/mpeg");
        }
      }
      const f = path.join(dir, "music.mp3");
      fs.writeFileSync(f, (await storage.get(musicKey))!.data);
      music = { file: f, gainDb: plan.music_cue.level_db - 2 };
    }

    /* ---- Scene stem ---- */
    const stemPath = path.join(dir, "stem.wav");
    const total = await mixScene({ narration: narrPath, layers: layerFiles, music, intensity: plan.intensity, out: stemPath });
    const stemKey = `audio/${ep.series_id}/${ep.id}/scene-${idx}/stem-${Date.now()}.mp3`;
    await storage.put(stemKey, await toMp3(dir, stemPath, "stem"), "audio/mpeg");
    const monoQa = path.join(dir, "qa.wav");
    await runFfmpeg(["-i", stemPath, "-ac", "1", "-ar", "22050", "-c:a", "pcm_s16le", monoQa]);
    const decoded = decodeWav(fs.readFileSync(monoQa));
    const qa = analyzeAudio(decoded.samples, decoded.sampleRate, { wordCount: scene.text.split(/\s+/).length, narrationSeconds: narrSec });
    const version = (await db.list("scene_renders", { where: { episode_id: ep.id, scene_index: idx } })).reduce((m, r) => Math.max(m, r.version), 0) + 1;
    if (prev) await db.update("scene_renders", prev.id, { status: "superseded" });
    await db.insert("scene_renders", {
      id: newId("scr"),
      episode_id: ep.id,
      series_id: ep.series_id,
      scene_index: idx,
      version,
      status: "current",
      narration_key: narrationKey,
      ambience_keys: ambienceKeys,
      music_key: musicKey,
      stem_key: stemKey,
      duration_seconds: Math.round(total),
      plan,
      qa,
      created_at: nowIso(),
    });
    return { summary: `Scene ${idx}: ${Math.round(total)}s, ${ambienceKeys.length} ambience layer(s)${musicKey ? " + music" : ""}. QA ${qa.passed ? "passed" : "has notes"}.` };
  });
});

registerHandler("audio.master", async (ctx) => {
  const db = getDb();
  const storage = getStorage();
  const ep = (await db.get("episodes", ctx.run.episode_id!))!;
  const renders = (await db.list("scene_renders", { where: { episode_id: ep.id, status: "current" } })).sort((a, b) => a.scene_index - b.scene_index);
  if (!renders.length) throw new StepFailure("No scene stems to master.");
  return withTmp(async (dir) => {
    const stems: string[] = [];
    for (const r of renders) {
      const f = path.join(dir, `stem_${r.scene_index}${path.extname(r.stem_key!) || ".wav"}`);
      fs.writeFileSync(f, (await storage.get(r.stem_key!))!.data);
      stems.push(f);
    }
    const out = path.join(dir, "master.mp3");
    await masterEpisode(dir, stems, out);
    const loud = await measureLoudness(out);
    const seconds = Math.round(await probeSeconds(out));
    const data = fs.readFileSync(out);
    const key = `audio/${ep.series_id}/${ep.id}/master-${Date.now()}.mp3`;
    await storage.put(key, data, "audio/mpeg");
    const assetId = newId("aud");
    await db.insert("audio_assets", {
      id: assetId,
      owner_id: null,
      series_id: ep.series_id,
      episode_id: ep.id,
      kind: "produced",
      storage_key: key,
      url: `/api/admin/audio/${assetId}`,
      mime_type: "audio/mpeg",
      duration_seconds: seconds,
      provider: "elevenlabs",
      meta: { loudness: loud, scenes: renders.map((r) => ({ index: r.scene_index, version: r.version, stem_key: r.stem_key, qa: r.qa })), bytes: data.length },
      created_at: nowIso(),
    });
    await db.update("episodes", ep.id, { audio_asset_id: assetId, duration_seconds: seconds, updated_at: nowIso() });
    return { summary: `Mastered ${Math.floor(seconds / 60)}m ${seconds % 60}s at ${loud.integrated_lufs.toFixed(1)} LUFS, true peak ${loud.true_peak_dbtp.toFixed(1)} dBTP.` };
  });
});

/* ------------------------------------------------------------------ */
/* Quality control                                                     */
/* ------------------------------------------------------------------ */

registerHandler("qc.review", async (ctx) => {
  const db = getDb();
  const settings = await getStudioSettings();
  const ep = (await db.get("episodes", ctx.run.episode_id!))!;
  const round = Number(ctx.step.params.round ?? 1);
  const sfx = String(ctx.step.params.sfx ?? "");
  const asset = ep.audio_asset_id ? await db.get("audio_assets", ep.audio_asset_id) : null;
  const script = await db.findOne("episode_scripts", { episode_id: ep.id });
  const reviews = await db.list("deliverables", { where: { episode_id: ep.id, status: "current" } });
  const coverReview = reviews.find((r) => r.key === "cover_review");
  const pron = await db.list("pronunciations", { where: { series_id: ep.series_id } });
  const res = await ctx.claude({
    context: await seriesContext(ep.series_id),
    prompt: `Final quality control for episode ${ep.number}, “${ep.title}” (round ${round}).\nCheck the finished production against the studio standard and the bible. Every episode must be carried by one calm, soothing narrator voice; request "revoice_scene" if narration sounds rushed, dramatic or harsh. Request specific actions only for real problems: "revoice_scene" (narration issue in a scene), "remix_scene" (sound/music balance in a scene), "regenerate_cover" (artwork problem); otherwise approve for human review.\n\nMaster: ${JSON.stringify(asset?.meta.loudness ?? {})} (target −24 LUFS, ≤ −2 dBTP), duration ${asset?.duration_seconds ?? 0}s.\nPer-scene QA:\n${JSON.stringify((asset?.meta.scenes as unknown[]) ?? [], null, 1).slice(0, 6000)}\n\nPronunciation dictionary: ${pron.map((p) => `${p.term} → ${p.alias}`).join("; ") || "none"}\nCover review: ${coverReview ? JSON.stringify(coverReview.data).slice(0, 2000) : "none"}\n\nFinal script (v${script?.version}):\n${script?.content.slice(0, 60000) ?? ""}`,
    schema: QcReportSchema,
  });
  const qc: QcReport = res.data;
  await ctx.deliver({ kind: "qc_report", key: "qc_report", title: `QC report – round ${round}`, data: qc, reasoning: qc.summary, model: res.model });
  const actions = qc.issues.filter((i) => i.action !== "none");
  if (qc.verdict === "revise" && actions.length && round <= settings.max_revision_rounds) {
    const r = round + 1;
    const steps: NewStep[] = [];
    const scenes = new Map<number, { revoice: boolean; remix: boolean }>();
    for (const a of actions) {
      if ((a.action === "revoice_scene" || a.action === "remix_scene") && a.scene_index) {
        const cur = scenes.get(a.scene_index) ?? { revoice: false, remix: false };
        scenes.set(a.scene_index, { revoice: cur.revoice || a.action === "revoice_scene", remix: cur.remix || a.action === "remix_scene" });
      }
    }
    for (const [i, f] of scenes) steps.push({ key: `audio_scene_${i}${sfx}_qc${r}`, type: "audio.scene", agent: "audio_producer", label: `${f.revoice ? "Re-voice" : "Remix"} scene ${i}`, activity: "typing", deps: [ctx.step.key], params: { scene_index: i, ...f } });
    const masterDeps = steps.map((s) => s.key);
    if (masterDeps.length) steps.push({ key: `audio_master${sfx}_qc${r}`, type: "audio.master", agent: "audio_producer", label: "Re-master the episode", activity: "typing", deps: masterDeps });
    if (actions.some((a) => a.action === "regenerate_cover")) {
      steps.push(...coverSteps(ctx.step.key).map((s) => ({ ...s, key: `${s.key}${sfx}_qc${r}`, deps: s.deps.map((d) => (d === ctx.step.key ? d : `${d}${sfx}_qc${r}`)) })));
    }
    const qcDeps = steps.filter((s) => s.type === "audio.master" || s.type === "art.cover_review").map((s) => s.key);
    steps.push({ key: `qc${sfx}_r${r}`, type: "qc.review", agent: "quality_controller", label: `Quality control (round ${r})`, activity: "reading", deps: qcDeps.length ? qcDeps : [ctx.step.key], params: { round: r, sfx } });
    return { summary: `Requested ${actions.length} revision(s): ${actions.map((a) => `${a.action.replace("_", " ")}${a.scene_index ? ` ${a.scene_index}` : ""}`).join(", ")}.`, addSteps: steps };
  }
  return {
    summary: qc.verdict === "approve" ? `Approved for human review. ${qc.summary}` : `Revision limit reached – open notes passed to the human reviewer. ${qc.summary}`,
    addSteps: [{ key: `approval${sfx}`, type: "ep.approval", agent: "network_executive", label: "Approve for publishing", activity: "reading", deps: [ctx.step.key] }],
  };
});

/** Bible helper re-export for the studio UI. */
export { getBible };
