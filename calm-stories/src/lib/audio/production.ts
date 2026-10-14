/**
 * Episode audio production: narration by section, ambience selection,
 * mixing and mastering, and QA. Used by Storymaker (creators) and by the
 * production engine (Calm's editorial team).
 */
import "server-only";
import { assertWithinBudget, currentGenerationScope, getAiSettings } from "@/lib/ai";
import { HttpError } from "@/lib/api";
import type { Viewer } from "@/lib/auth/viewer";
import { getDb } from "@/lib/db";
import { getStore } from "@/lib/storage";
import { editableEpisode, getScriptBundle } from "@/lib/storymaker/service";
import {
  DEFAULT_PRODUCTION_SETTINGS,
  type AudioAsset,
  type AudioQaReport,
  type EpisodeProduction,
  type ProductionSettings,
  type SoundLayer,
  type Soundscape,
  type VoiceProfile,
} from "@/lib/types";
import { hashString, newId, nowIso, wordCount } from "@/lib/util";
import { toMp3 } from "./ffmpeg";
import { mixEpisode } from "./mix";
import { analyseAudio } from "./qa";
import { narrationText, splitScript } from "./sections";
import { estimateTtsCents, voiceProviderFor, type VoiceSettings } from "./voice";
import { decodeWav, DEFAULT_RATE, encodeWav } from "./wav";

export interface SectionState {
  index: number;
  text: string;
  words: number;
  asset: AudioAsset | null;
  stale: boolean;
}

export interface ProductionView {
  production: EpisodeProduction;
  sections: SectionState[];
  voices: VoiceProfile[];
  soundscapes: Soundscape[];
  mix: AudioAsset | null;
  voiceProvider: { name: string; simulated: boolean };
  estimateCents: number;
  pendingCents: number;
}

function assetUrl(id: string) {
  return `/api/audio/asset/${id}`;
}

function sectionKey(text: string, voiceId: string, s: ProductionSettings) {
  return hashString(`${text}|${voiceId}|${s.speed}|${s.stability}|${s.warmth}`).toString(36);
}

async function loadProduction(episodeId: string, seriesId: string, fallbackVoice: string | null, fallbackSound: string | null): Promise<EpisodeProduction> {
  const db = getDb();
  const existing = await db.get("episode_productions", episodeId);
  if (existing) return existing;
  return {
    id: episodeId,
    episode_id: episodeId,
    series_id: seriesId,
    settings: { ...DEFAULT_PRODUCTION_SETTINGS, voice_id: fallbackVoice, soundscape_id: fallbackSound },
    section_asset_ids: [],
    mix_asset_id: null,
    updated_at: nowIso(),
  };
}

async function context(viewer: Viewer, episodeId: string) {
  const { ep, series, viewer: v } = await editableEpisode(viewer, episodeId);
  const db = getDb();
  const voices = (await db.list("voice_profiles")).filter((x) => x.approved);
  const soundscapes = await db.list("soundscapes");
  const production = await loadProduction(ep.id, series.id, series.narrator_voice_id ?? voices[0]?.id ?? null, series.soundscape_id ?? soundscapes[0]?.id ?? null);
  const bundle = await getScriptBundle(viewer, episodeId);
  const script = bundle.current?.content ?? "";
  return { ep, series, viewer: v, voices, soundscapes, production, script };
}

export async function getProduction(viewer: Viewer, episodeId: string): Promise<ProductionView> {
  const { production, voices, soundscapes, script } = await context(viewer, episodeId);
  const db = getDb();
  const settings = await getAiSettings();
  const provider = voiceProviderFor(settings.voice_provider);
  const texts = splitScript(script);
  const sections: SectionState[] = [];
  for (const [index, text] of texts.entries()) {
    const id = production.section_asset_ids[index];
    const asset = id ? await db.get("audio_assets", id) : null;
    const expected = production.settings.voice_id ? sectionKey(narrationText(text), production.settings.voice_id, production.settings) : "";
    sections.push({ index, text, words: wordCount(text), asset, stale: !!asset && asset.meta.key !== expected });
  }
  const mix = production.mix_asset_id ? await db.get("audio_assets", production.mix_asset_id) : null;
  const chars = texts.reduce((a, t) => a + narrationText(t).length, 0);
  const pendingChars = sections.filter((s) => !s.asset || s.stale).reduce((a, s) => a + narrationText(s.text).length, 0);
  return {
    production,
    sections,
    voices,
    soundscapes,
    mix,
    voiceProvider: { name: provider.name, simulated: provider.simulated },
    estimateCents: provider.simulated ? 0 : estimateTtsCents(chars),
    pendingCents: provider.simulated ? 0 : estimateTtsCents(pendingChars),
  };
}

export async function updateProductionSettings(viewer: Viewer, episodeId: string, patch: Partial<ProductionSettings>): Promise<EpisodeProduction> {
  const { production, voices, soundscapes } = await context(viewer, episodeId);
  if (patch.voice_id && !voices.some((v) => v.id === patch.voice_id)) throw new HttpError(400, "Choose an approved narrator voice.");
  if (patch.soundscape_id && !soundscapes.some((s) => s.id === patch.soundscape_id)) throw new HttpError(400, "Unknown soundscape.");
  const clamp = (x: number | undefined, lo: number, hi: number) => (x === undefined ? undefined : Math.min(hi, Math.max(lo, x)));
  const next: ProductionSettings = {
    ...production.settings,
    ...patch,
    speed: clamp(patch.speed, 0.7, 1.1) ?? production.settings.speed,
    warmth: clamp(patch.warmth, 0, 1) ?? production.settings.warmth,
    stability: clamp(patch.stability, 0, 1) ?? production.settings.stability,
    ambience_volume: clamp(patch.ambience_volume, 0, 1) ?? production.settings.ambience_volume,
    music_volume: clamp(patch.music_volume, 0, 1) ?? production.settings.music_volume,
    extra_layers: (patch.extra_layers ?? production.settings.extra_layers).slice(0, 4).map((l) => ({ kind: l.kind, gain: Math.min(1, Math.max(0, l.gain)) })),
  };
  return getDb().upsert("episode_productions", { ...production, settings: next, updated_at: nowIso() });
}

async function storeAudio(key: string, wav: Uint8Array, compress: boolean) {
  const out = compress ? await toMp3(wav) : { bytes: wav, contentType: "audio/wav" };
  await getStore().put(key, out.bytes, out.contentType);
  return out.contentType;
}

/**
 * Generates narration for every missing or out-of-date section, or for one
 * section when `sectionIndex` is given (forcing regeneration).
 */
export async function generateNarration(
  viewer: Viewer,
  episodeId: string,
  opts: { sectionIndex?: number; jobId?: string | null } = {},
): Promise<{ generated: number; simulated: boolean; costCents: number }> {
  const { ep, series, viewer: v, voices, production, script } = await context(viewer, episodeId);
  if (!script.trim()) throw new HttpError(409, "Write the script before generating narration.");
  if (["in_review", "approved", "published"].includes(ep.status)) throw new HttpError(409, `This episode is ${ep.status.replace("_", " ")}; its audio is locked.`);
  const voice = voices.find((x) => x.id === production.settings.voice_id) ?? voices[0];
  if (!voice) throw new HttpError(409, "No approved narrator voices are available.");
  const settings = await getAiSettings();
  const provider = voiceProviderFor(settings.voice_provider);
  if (!provider.simulated) await assertWithinBudget(settings);
  const texts = splitScript(script);
  if (opts.sectionIndex !== undefined && (opts.sectionIndex < 0 || opts.sectionIndex >= texts.length)) throw new HttpError(400, "No such section.");
  const db = getDb();
  const ids = [...production.section_asset_ids].slice(0, texts.length);
  while (ids.length < texts.length) ids.push(null);
  const vs: VoiceSettings = { speed: production.settings.speed, stability: production.settings.stability, warmth: production.settings.warmth };
  let generated = 0;
  let cost = 0;
  for (const [i, raw] of texts.entries()) {
    if (opts.sectionIndex !== undefined && i !== opts.sectionIndex) continue;
    const text = narrationText(raw);
    const key = sectionKey(text, voice.id, production.settings);
    const existing = ids[i] ? await db.get("audio_assets", ids[i] as string) : null;
    if (opts.sectionIndex === undefined && existing && existing.meta.key === key) continue;
    const speech = await provider.synthesize(text, voice, vs);
    const storageKey = `audio/${series.id}/${ep.id}/section-${i}-${key}-${Date.now().toString(36)}.wav`;
    const contentType = await storeAudio(storageKey, encodeWav(speech.samples, speech.sampleRate), false);
    const asset: AudioAsset = {
      id: newId("aud"),
      owner_id: v.user.id,
      series_id: series.id,
      episode_id: ep.id,
      kind: "narration_section",
      section_index: i,
      storage_key: storageKey,
      url: "",
      mime_type: contentType,
      duration_seconds: Number((speech.samples.length / speech.sampleRate).toFixed(2)),
      provider: speech.provider,
      simulated: speech.simulated,
      qa: null,
      meta: { key, voice_id: voice.id, model: speech.model, characters: speech.characters, words: wordCount(text) },
      created_at: nowIso(),
    };
    asset.url = assetUrl(asset.id);
    await db.insert("audio_assets", asset);
    await db.insert("production_costs", {
      id: newId("cost"),
      job_id: opts.jobId ?? currentGenerationScope().jobId ?? null,
      series_id: series.id,
      episode_id: ep.id,
      category: "tts",
      provider: speech.provider,
      model: speech.model,
      units: speech.characters,
      unit_label: "characters",
      cost_cents: speech.costCents,
      simulated: speech.simulated,
      created_at: nowIso(),
    });
    ids[i] = asset.id;
    generated++;
    cost += speech.costCents;
  }
  await db.upsert("episode_productions", { ...production, section_asset_ids: ids, updated_at: nowIso() });
  return { generated, simulated: provider.simulated, costCents: cost };
}

/** A short sample of a narrator voice with the given settings (cached). */
export async function previewVoice(viewer: Viewer, voiceId: string, settings: Partial<VoiceSettings> = {}): Promise<AudioAsset> {
  if (!viewer.isCreator) throw new HttpError(403, "Creator access is required.");
  const db = getDb();
  const voice = await db.get("voice_profiles", voiceId);
  if (!voice || !voice.approved) throw new HttpError(404, "Voice not found");
  const s: VoiceSettings = { speed: settings.speed ?? 0.9, stability: settings.stability ?? 0.75, warmth: settings.warmth ?? 0.7 };
  const text = "Settle in, and let your shoulders soften. Tonight, the evening is just beginning, and there is nowhere at all to be.";
  const ai = await getAiSettings();
  const provider = voiceProviderFor(ai.voice_provider);
  const key = `voice-previews/${voice.id}-${provider.name}-${hashString(JSON.stringify(s)).toString(36)}.wav`;
  const cached = (await db.list("audio_assets", { where: { kind: "voice_preview" } })).find((a) => a.storage_key === key);
  if (cached && (await getStore().exists(key))) return cached;
  const speech = await provider.synthesize(text, voice, s);
  const contentType = await storeAudio(key, encodeWav(speech.samples, speech.sampleRate), true);
  const asset: AudioAsset = {
    id: newId("aud"),
    owner_id: null,
    series_id: null,
    episode_id: null,
    kind: "voice_preview",
    section_index: null,
    storage_key: key,
    url: "",
    mime_type: contentType,
    duration_seconds: Number((speech.samples.length / speech.sampleRate).toFixed(2)),
    provider: speech.provider,
    simulated: speech.simulated,
    qa: null,
    meta: { voice_id: voice.id, settings: s },
    created_at: nowIso(),
  };
  asset.url = assetUrl(asset.id);
  await db.insert("audio_assets", asset);
  if (!speech.simulated) {
    await db.insert("production_costs", { id: newId("cost"), job_id: null, series_id: null, episode_id: null, category: "tts", provider: speech.provider, model: speech.model, units: speech.characters, unit_label: "characters", cost_cents: speech.costCents, simulated: false, created_at: nowIso() });
  }
  return asset;
}

async function loadPcm(asset: AudioAsset): Promise<{ samples: Float32Array; sampleRate: number }> {
  const obj = await getStore().get(asset.storage_key);
  if (!obj) throw new HttpError(409, `Narration section ${(asset.section_index ?? 0) + 1} is missing from storage. Regenerate it.`);
  if (obj.contentType !== "audio/wav") throw new HttpError(500, "Unexpected narration format");
  return decodeWav(obj.bytes);
}

/** Mixes narration with ambience, masters it, runs QA and attaches it to the episode. */
export async function mixAndMaster(viewer: Viewer, episodeId: string, opts: { jobId?: string | null } = {}): Promise<{ asset: AudioAsset; qa: AudioQaReport }> {
  const view = await getProduction(viewer, episodeId);
  const { ep, series, viewer: v, script } = await context(viewer, episodeId);
  const db = getDb();
  if (["in_review", "approved", "published"].includes(ep.status)) throw new HttpError(409, `This episode is ${ep.status.replace("_", " ")}; its audio is locked.`);
  if (!view.sections.length) throw new HttpError(409, "Write the script before mixing.");
  const present = view.sections.filter((s) => s.asset && !s.stale);
  if (!present.length) throw new HttpError(409, "Generate narration before mixing.");
  const settings = view.production.settings;
  const soundscape = view.soundscapes.find((s) => s.id === settings.soundscape_id);
  const layers: SoundLayer[] = [...(soundscape?.layers ?? []), ...settings.extra_layers];
  const pcms = [];
  for (const s of view.sections) {
    if (s.asset && !s.stale) pcms.push(await loadPcm(s.asset));
  }
  const started = Date.now();
  const result = mixEpisode({ sections: pcms, ambience: layers, ambienceVolume: settings.ambience_volume, musicVolume: settings.music_volume, seed: hashString(ep.id) % 100000, rate: DEFAULT_RATE });
  const ctx = await db.list("characters", { where: { series_id: series.id } });
  const locs = await db.list("locations", { where: { series_id: series.id } });
  const bible = await db.findOne("story_bibles", { series_id: series.id });
  const qa = analyseAudio({
    mix: result.mix,
    narration: result.narration,
    bed: result.bed,
    rate: result.rate,
    joins: result.joins,
    expectedSections: view.sections.length,
    presentSections: present.length,
    words: present.reduce((a, s) => a + s.words, 0),
    narrationSeconds: result.narrationSeconds,
    layers,
    script,
    properNouns: [...ctx.map((c) => c.name), ...locs.map((l) => l.name), bible?.world_name ?? ""].filter(Boolean),
  });
  const storageKey = `audio/${series.id}/${ep.id}/mix-${Date.now().toString(36)}`;
  const contentType = await storeAudio(storageKey, encodeWav(result.mix, result.rate), true);
  const simulated = present.some((s) => s.asset?.simulated);
  const asset: AudioAsset = {
    id: newId("aud"),
    owner_id: v.user.id,
    series_id: series.id,
    episode_id: ep.id,
    kind: "mix",
    section_index: null,
    storage_key: storageKey,
    url: "",
    mime_type: contentType,
    duration_seconds: Number((result.mix.length / result.rate).toFixed(2)),
    provider: simulated ? "mock+calm-mixer" : "calm-mixer",
    simulated,
    qa,
    meta: { soundscape_id: soundscape?.id ?? null, layers, settings, sections: present.length, render_ms: Date.now() - started },
    created_at: nowIso(),
  };
  asset.url = assetUrl(asset.id);
  await db.insert("audio_assets", asset);
  await db.insert("production_costs", { id: newId("cost"), job_id: opts.jobId ?? currentGenerationScope().jobId ?? null, series_id: series.id, episode_id: ep.id, category: "audio_processing", provider: "calm-mixer", model: "pure-ts-v1", units: asset.duration_seconds, unit_label: "seconds", cost_cents: 0, simulated: false, created_at: nowIso() });
  await db.upsert("episode_productions", { ...view.production, mix_asset_id: asset.id, updated_at: nowIso() });
  const nextStatus = ep.status === "script_ready" || ep.status === "draft" || ep.status === "planned" ? "audio_ready" : ep.status;
  await db.update("episodes", ep.id, { audio_asset_id: asset.id, duration_seconds: Math.round(asset.duration_seconds), status: nextStatus, updated_at: nowIso() });
  return { asset, qa };
}
