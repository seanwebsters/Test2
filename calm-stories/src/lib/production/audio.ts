import "server-only";
import { getDb } from "@/lib/db";
import { env } from "@/lib/env";
import { badRequest, notFound } from "@/lib/errors";
import { getStorage } from "@/lib/storage";
import { getAiSettings } from "@/lib/ai";
import type { AudioAsset, EpisodeProduction, ProductionSettings, SoundLayer, VoiceProfile } from "@/lib/types";
import { DEFAULT_PRODUCTION_SETTINGS } from "@/lib/types";
import { hashString, newId, nowIso, wordCount } from "@/lib/util";
import { renderAmbience } from "@/lib/audio/synth";
import { decodeWav, encodeWav, SAMPLE_RATE } from "@/lib/audio/wav";
import { concatSections, mixEpisode } from "@/lib/audio/mixer";
import { analyzeAudio, pronunciationCandidates } from "@/lib/audio/qa";
import { ElevenLabsTts, SimulatedTts, splitSections, type TtsProvider } from "@/lib/audio/tts";
import { findFfmpeg, ffmpegDecodeToWav, ffmpegTranscode } from "@/lib/audio/ffmpeg";
import { currentScriptText } from "@/lib/storymaker/scripts";
import { loadStoryContext } from "@/lib/story/context";
import { registerWorkflow, type JobContext } from "@/lib/jobs/runner";

/* ------------------------------------------------------------------ */
/* Providers & settings                                                */
/* ------------------------------------------------------------------ */

export async function getTts(): Promise<TtsProvider> {
  const s = await getAiSettings();
  if (s.voice_provider === "mock") return new SimulatedTts();
  if (env.elevenLabsApiKey) return new ElevenLabsTts(env.elevenLabsApiKey);
  if (s.voice_provider === "elevenlabs") throw badRequest("ElevenLabs is selected but ELEVENLABS_API_KEY is not configured.");
  return new SimulatedTts();
}

export async function ttsIsPaid(): Promise<boolean> {
  return !(await getTts()).simulated;
}

export async function getProduction(episodeId: string): Promise<EpisodeProduction> {
  const db = getDb();
  const existing = await db.get("episode_productions", episodeId);
  if (existing) return existing;
  const ep = await db.get("episodes", episodeId);
  if (!ep) throw notFound("Episode not found.");
  const series = await db.get("series", ep.series_id);
  const prod: EpisodeProduction = {
    id: ep.id,
    episode_id: ep.id,
    series_id: ep.series_id,
    settings: { ...DEFAULT_PRODUCTION_SETTINGS, voice_id: series?.narrator_voice_id ?? "voice_willow", soundscape_id: series?.soundscape_id ?? "snd_forest-night" },
    section_asset_ids: [],
    mix_asset_id: null,
    updated_at: nowIso(),
  };
  return db.insert("episode_productions", prod);
}

export async function updateProductionSettings(episodeId: string, patch: Partial<ProductionSettings>) {
  const prod = await getProduction(episodeId);
  const db = getDb();
  if (patch.voice_id) {
    const v = await db.get("voice_profiles", patch.voice_id);
    if (!v || !v.approved) throw badRequest("Choose an approved voice.");
  }
  if (patch.soundscape_id && !(await db.get("soundscapes", patch.soundscape_id))) throw badRequest("Unknown soundscape.");
  const settings = { ...prod.settings, ...patch };
  // Voice-affecting changes invalidate generated narration sections.
  const voiceChanged = ["voice_id", "speed", "warmth", "stability"].some((k) => k in patch && patch[k as keyof ProductionSettings] !== prod.settings[k as keyof ProductionSettings]);
  return db.update("episode_productions", prod.id, {
    settings,
    section_asset_ids: voiceChanged ? prod.section_asset_ids.map(() => null) : prod.section_asset_ids,
    updated_at: nowIso(),
  });
}

async function storeAudio(key: string, wav: Buffer, asMp3: boolean, opts: { loudnorm?: boolean; bitrate?: string } = {}): Promise<{ key: string; mime: string }> {
  const storage = getStorage();
  const ffmpeg = asMp3 ? findFfmpeg(env.ffmpegPath) : null;
  if (ffmpeg) {
    const mp3 = await ffmpegTranscode(ffmpeg, wav, { bitrate: opts.bitrate ?? "96k", loudnorm: opts.loudnorm ?? false });
    const k = key.replace(/\.wav$/, ".mp3");
    await storage.put(k, mp3, "audio/mpeg");
    return { key: k, mime: "audio/mpeg" };
  }
  await storage.put(key, wav, "audio/wav");
  return { key, mime: "audio/wav" };
}

async function insertAsset(a: Omit<AudioAsset, "id" | "created_at" | "url">): Promise<AudioAsset> {
  const id = newId("aud");
  return getDb().insert("audio_assets", { ...a, id, url: `/api/studio/audio/${id}`, created_at: nowIso() });
}

export async function layersFor(settings: ProductionSettings): Promise<SoundLayer[]> {
  const sc = settings.soundscape_id ? await getDb().get("soundscapes", settings.soundscape_id) : null;
  const base = (sc?.layers ?? []).filter((l) => l.kind !== "pad");
  const extra = settings.extra_layers.filter((l) => !base.some((b) => b.kind === l.kind));
  const music: SoundLayer[] = settings.music_volume > 0 ? [{ kind: "pad", gain: settings.music_volume * 0.8 }] : [];
  return [...base, ...extra, ...music];
}

/* ------------------------------------------------------------------ */
/* Previews (short, synchronous)                                       */
/* ------------------------------------------------------------------ */

export async function previewVoice(voice: VoiceProfile, text: string, settings: Pick<ProductionSettings, "speed" | "warmth" | "stability">, ownerId: string) {
  const tts = await getTts();
  const res = await tts.synthesize({ text: text.slice(0, 400), voice, ...settings });
  const { key, mime } = await storeAudio(`audio/previews/${ownerId}/${newId("vp")}.wav`, encodeWav(res.samples, res.sampleRate), false);
  const asset = await insertAsset({
    owner_id: ownerId,
    series_id: null,
    episode_id: null,
    kind: "voice_preview",
    section_index: null,
    storage_key: key,
    mime_type: mime,
    duration_seconds: res.samples.length / res.sampleRate,
    provider: res.provider,
    simulated: res.simulated,
    qa: null,
    meta: { voice_id: voice.id },
  });
  if (res.cost_cents > 0) {
    await getDb().insert("production_costs", { id: newId("cost"), job_id: null, series_id: null, episode_id: null, category: "tts", provider: res.provider, model: res.model, units: res.characters, unit_label: "characters", cost_cents: res.cost_cents, simulated: false, created_at: nowIso() });
  }
  return asset;
}

export async function previewSoundscape(layers: SoundLayer[], ownerId: string, seconds = 20) {
  const samples = renderAmbience(layers, seconds, { seed: hashString(JSON.stringify(layers)), fade: 2 });
  const { key, mime } = await storeAudio(`audio/previews/${ownerId}/${newId("sp")}.wav`, encodeWav(samples), false);
  return insertAsset({ owner_id: ownerId, series_id: null, episode_id: null, kind: "ambience", section_index: null, storage_key: key, mime_type: mime, duration_seconds: seconds, provider: "calm-synth", simulated: false, qa: null, meta: { layers } });
}

/* ------------------------------------------------------------------ */
/* Narration & mixing (run inside jobs)                                */
/* ------------------------------------------------------------------ */

async function scriptSections(episodeId: string) {
  const cur = await currentScriptText(episodeId);
  if (!cur) throw new Error("This episode has no script yet.");
  return { sections: splitSections(cur.version.content), words: wordCount(cur.version.content), text: cur.version.content };
}

async function narrateSections(ctx: JobContext, episodeId: string, only?: number[]) {
  const db = getDb();
  const prod = await getProduction(episodeId);
  const voice = prod.settings.voice_id ? await db.get("voice_profiles", prod.settings.voice_id) : null;
  if (!voice) throw new Error("Choose a narrator first.");
  const { sections } = await scriptSections(episodeId);
  const tts = await getTts();
  const ids = Array.from({ length: sections.length }, (_, i) => prod.section_asset_ids[i] ?? null);
  const targets = only?.length ? only.filter((i) => i < sections.length) : sections.map((_, i) => i).filter((i) => !ids[i]);
  await ctx.log(`Narrating ${targets.length} of ${sections.length} section(s) with ${voice.name} via ${tts.name}${tts.simulated ? " (simulated placeholder audio)" : ""}.`);
  for (const i of targets) {
    const text = sections[i]!;
    if (!tts.simulated) ctx.ensureBudget((text.length / 1000) * 18);
    const res = await tts.synthesize({ text, voice, speed: prod.settings.speed, warmth: prod.settings.warmth, stability: prod.settings.stability });
    const ep = await db.get("episodes", episodeId);
    // Sections are kept compressed when FFmpeg is available (decoded again for mixing).
    const { key, mime } = await storeAudio(`audio/${ep?.series_id}/${episodeId}/section-${i}-${newId("s")}.wav`, encodeWav(res.samples, res.sampleRate), true, { bitrate: "64k" });
    const asset = await insertAsset({
      owner_id: ctx.job.requested_by,
      series_id: ep?.series_id ?? null,
      episode_id: episodeId,
      kind: "narration_section",
      section_index: i,
      storage_key: key,
      mime_type: mime,
      duration_seconds: res.samples.length / res.sampleRate,
      provider: res.provider,
      simulated: res.simulated,
      qa: null,
      meta: { voice_id: voice.id, settings: prod.settings, words: wordCount(text) },
    });
    // Replace (not accumulate) the previous take for this section.
    const old = ids[i] ? await db.get("audio_assets", ids[i]!) : null;
    if (old) {
      await getStorage().remove(old.storage_key).catch(() => undefined);
      await db.remove("audio_assets", old.id);
    }
    ids[i] = asset.id;
    await db.update("episode_productions", episodeId, { section_asset_ids: [...ids], updated_at: nowIso() });
    await ctx.addCost({ category: "tts", provider: res.provider, model: res.model, units: res.characters, unit_label: "characters", cost_cents: res.cost_cents, simulated: res.simulated });
  }
  return { narrated: targets.length, total: sections.length, simulated: tts.simulated };
}

async function mixInternal(ctx: JobContext, episodeId: string) {
  const db = getDb();
  const prod = await getProduction(episodeId);
  const { sections, words, text } = await scriptSections(episodeId);
  const ids = prod.section_asset_ids.slice(0, sections.length);
  const assets = await Promise.all(ids.map((id) => (id ? db.get("audio_assets", id) : Promise.resolve(null))));
  const present = assets.filter((a): a is AudioAsset => Boolean(a));
  if (present.length === 0) throw new Error("Generate the narration before mixing.");
  const storage = getStorage();
  const decoded = [];
  for (const a of present) {
    const obj = await storage.get(a.storage_key);
    if (!obj) throw new Error(`Narration section ${a.section_index} is missing from storage.`);
    if (a.mime_type === "audio/wav") decoded.push(decodeWav(obj.data));
    else {
      const ffmpeg = findFfmpeg(env.ffmpegPath);
      if (!ffmpeg) throw new Error("FFmpeg is required to decode compressed narration sections.");
      decoded.push(decodeWav(await ffmpegDecodeToWav(ffmpeg, obj.data, SAMPLE_RATE)));
    }
  }
  const narration = concatSections(decoded, 1.4);
  const layers = await layersFor(prod.settings);
  const ambience = layers.length ? renderAmbience(layers, 90, { seed: hashString(`${episodeId}:${JSON.stringify(layers)}`), fade: 0.5 }) : null;
  await ctx.log(`Mixing ${present.length} section(s) with ${layers.map((l) => l.kind).join(", ") || "no"} ambience.`);
  const mix = mixEpisode(narration, { ambience, ambienceVolume: prod.settings.ambience_volume, musicVolume: prod.settings.music_volume });
  const ctxStory = await loadStoryContext(prod.series_id);
  const qa = analyzeAudio(mix.samples, mix.sampleRate, {
    expectedSections: sections.length,
    actualSections: present.length,
    wordCount: words,
    narrationSeconds: mix.narrationSeconds,
    ambienceToNarrationDb: mix.ambienceToNarrationDb,
    pronunciationNotes: pronunciationCandidates(text, [...ctxStory.characters.map((c) => c.name), ctxStory.bible.world_name]),
  });
  const ep = await db.get("episodes", episodeId);
  const { key, mime } = await storeAudio(`audio/${ep?.series_id}/${episodeId}/mix-${newId("m")}.wav`, encodeWav(mix.samples, SAMPLE_RATE), true, { loudnorm: true });
  const simulated = present.some((a) => a.simulated);
  const asset = await insertAsset({
    owner_id: ctx.job.requested_by,
    series_id: ep?.series_id ?? null,
    episode_id: episodeId,
    kind: "mix",
    section_index: null,
    storage_key: key,
    mime_type: mime,
    duration_seconds: Math.round(mix.samples.length / mix.sampleRate),
    provider: "calm-mixer",
    simulated,
    qa,
    meta: { layers, settings: prod.settings, sections: present.length, peaks: waveformPeaks(mix.samples, 160) },
  });
  await db.update("episode_productions", episodeId, { mix_asset_id: asset.id, updated_at: nowIso() });
  if (ep && !["in_review", "approved", "published"].includes(ep.status)) {
    await db.update("episodes", episodeId, { audio_asset_id: asset.id, status: ep.status === "script_ready" ? "audio_ready" : ep.status, updated_at: nowIso() });
  }
  await ctx.addCost({ category: "audio_processing", provider: "calm-mixer", model: mime === "audio/mpeg" ? "ffmpeg-loudnorm" : "ts-mixer", units: Math.round(mix.samples.length / mix.sampleRate), unit_label: "seconds", cost_cents: 0, simulated: false });
  return { asset, qa };
}

export function waveformPeaks(samples: Float32Array, n: number): number[] {
  const size = Math.max(1, Math.floor(samples.length / n));
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    let m = 0;
    for (let j = i * size; j < Math.min(samples.length, (i + 1) * size); j += 16) m = Math.max(m, Math.abs(samples[j] ?? 0));
    out.push(Math.round(m * 1000) / 1000);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Workflows                                                           */
/* ------------------------------------------------------------------ */

registerWorkflow({
  kind: "narration",
  steps: (payload) => [
    {
      id: "voice_direction",
      label: "Prepare voice direction",
      agent: "voice_director",
      async run(ctx) {
        const { sections, text } = await scriptSections(payload.episode_id as string);
        const prod = await getProduction(payload.episode_id as string);
        const story = await loadStoryContext(prod.series_id);
        const names = pronunciationCandidates(text, [...story.characters.map((c) => c.name), ...story.locations.map((l) => l.name), story.bible.world_name]);
        ctx.state.pronunciation = names;
        return { preview: `${sections.length} sections · speed ${prod.settings.speed} · warmth ${prod.settings.warmth}${names.length ? ` · check: ${names.join(", ")}` : ""}` };
      },
    },
    {
      id: "narrate",
      label: "Generate narration",
      agent: "audio_producer",
      async run(ctx) {
        const r = await narrateSections(ctx, payload.episode_id as string, payload.sections as number[] | undefined);
        return { preview: `${r.narrated} section(s) narrated of ${r.total}${r.simulated ? " (simulated)" : ""}` };
      },
    },
    {
      id: "mix",
      label: "Mix & master audio",
      agent: "audio_producer",
      async run(ctx) {
        const { asset, qa } = await mixInternal(ctx, payload.episode_id as string);
        return { preview: `${Math.round(asset.duration_seconds / 60)} min mix · ${qa.passed ? "QA passed" : "QA issues"} · ≈${qa.integrated_loudness_approx_lufs} LUFS` };
      },
    },
  ],
});

registerWorkflow({
  kind: "mix",
  steps: (payload) => [
    {
      id: "mix",
      label: "Mix & master audio",
      agent: "audio_producer",
      async run(ctx) {
        const { asset, qa } = await mixInternal(ctx, payload.episode_id as string);
        return { preview: `${Math.round(asset.duration_seconds / 60)} min mix · ${qa.passed ? "QA passed" : "QA issues"}` };
      },
    },
  ],
});

export { narrateSections, mixInternal, scriptSections };
