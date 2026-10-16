import "server-only";
import { getDb } from "@/lib/db";
import { env } from "@/lib/env";
import { getStorage } from "@/lib/storage";
import { track } from "@/lib/analytics";
import type { ReviewCheck, Series } from "@/lib/types";
import { hashString, newId, nowIso, wordCount } from "@/lib/util";
import { toJsonSchema } from "@/lib/ai/json-schema";
import { estimateCostCents } from "@/lib/ai/provider";
import { renderAmbience } from "@/lib/audio/synth";
import { decodeWav, encodeWav, SAMPLE_RATE } from "@/lib/audio/wav";
import { concatSections, mixEpisode } from "@/lib/audio/mixer";
import { analyzeAudio } from "@/lib/audio/qa";
import { ffmpegTranscode } from "@/lib/audio/ffmpeg";
import { elevenLabsSoundEffect, elevenLabsSpeech } from "@/lib/providers/elevenlabs";
import { nanoBananaImage } from "@/lib/providers/nano-banana";
import { computeReviewChecks } from "@/lib/services/review-checks";
import { getAgentSettings, getFfmpeg, getWriter } from "./config";
import { registerSteps, type JobContext, type StepDef } from "./runner";
import { EpisodePlanSchema, SoftenSchema, type EpisodePlan } from "./schemas";
import { simulatedPlan, simulatedScript, simulatedSpeech } from "./simulated";

/**
 * The episode production pipeline. Each step is one agent; outputs are
 * persisted in the job state so a retry or restart never repeats paid work.
 * The last step files the episode in the editorial review queue – agents
 * never publish on their own.
 */

/** Slow bedtime narration, including pauses. */
const WORDS_PER_MINUTE = 120;

const WRITER_SYSTEM = `You write Calm Sleep Stories: serialized bedtime fiction read aloud to help adults fall asleep.

Craft:
- Second- or third-person, present or gentle past tense, unhurried and sensory (sound, texture, warmth, light).
- Low stakes. No danger, violence, cliffhangers, shocks, loud noises or anything that would quicken the pulse. Problems are small and resolve kindly.
- Long, flowing sentences that slow down as the story goes on; the final third is the calmest and drifts toward sleep.
- Keep continuity with earlier episodes: recurring places and characters stay recognisable and warm.
- Write for the ear. No headings, lists, stage directions or sound-effect cues.
- Mark gentle pauses with [pause]. Separate sections of about 300 words with a line containing only ---.`;

interface SeriesContext {
  series: Series;
  storyNotes: string;
  previous: { number: number; title: string; summary: string }[];
}

async function loadContext(ctx: JobContext): Promise<SeriesContext> {
  const db = getDb();
  const series = await db.get("series", ctx.job.series_id);
  if (!series) throw new Error("Series not found.");
  const wf = ctx.job.workflow_id ? await db.get("production_workflows", ctx.job.workflow_id) : await db.findOne("production_workflows", { series_id: series.id });
  const seasons = await db.list("seasons", { where: { series_id: series.id } });
  const eps = (await db.list("episodes", { where: { series_id: series.id } }))
    .filter((e) => e.status !== "rejected" && e.id !== ctx.state.episode_id)
    .sort((a, b) => {
      const sa = seasons.find((s) => s.id === a.season_id)?.number ?? 0;
      const sb = seasons.find((s) => s.id === b.season_id)?.number ?? 0;
      return sa - sb || a.number - b.number;
    });
  return { series, storyNotes: wf?.story_notes ?? "", previous: eps.slice(-8).map((e) => ({ number: e.number, title: e.title, summary: e.summary })) };
}

async function targetMinutes(ctx: JobContext): Promise<number> {
  const db = getDb();
  const wf = ctx.job.workflow_id ? await db.get("production_workflows", ctx.job.workflow_id) : await db.findOne("production_workflows", { series_id: ctx.job.series_id });
  return (ctx.job.payload.target_minutes as number | undefined) ?? wf?.target_minutes ?? 20;
}

async function voiceFor(ctx: JobContext): Promise<string> {
  const db = getDb();
  const wf = ctx.job.workflow_id ? await db.get("production_workflows", ctx.job.workflow_id) : await db.findOne("production_workflows", { series_id: ctx.job.series_id });
  return wf?.voice_id || (await getAgentSettings()).default_voice_id;
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
  if (cur.length) out.push(cur.join("\n\n"));
  return out;
}

const UNSETTLING = /\b(blood|bloody|scream\w*|kill\w*|murder\w*|dead|death|die[sd]?|terror|terrified|panic\w*|gun\w*|war|attack\w*|monster\w*|nightmare\w*|explo\w+|crash\w*|shout\w*|horror|fear(ful)?|danger\w*)\b/gi;

/** Rule-based sleep-suitability checks: length, unsettling words, pacing. */
export function sleepChecks(script: string, targetWords: number): string[] {
  const issues: string[] = [];
  const words = wordCount(script);
  if (words < targetWords * 0.6) issues.push(`Script is short: ${words} words for a ~${targetWords}-word target.`);
  if (words > targetWords * 1.5) issues.push(`Script is long: ${words} words for a ~${targetWords}-word target.`);
  const hits = [...new Set((script.match(UNSETTLING) ?? []).map((w) => w.toLowerCase()))];
  if (hits.length) issues.push(`Possibly unsettling words: ${hits.slice(0, 8).join(", ")}.`);
  const exclaims = (script.match(/!/g) ?? []).length;
  if (exclaims > 3) issues.push(`${exclaims} exclamation marks – keep the voice soft.`);
  return issues;
}

/* ------------------------------------------------------------------ */
/* Steps                                                               */
/* ------------------------------------------------------------------ */

const plan: StepDef = {
  id: "plan",
  label: "Plan the next episode",
  agent: "showrunner",
  async run(ctx) {
    const db = getDb();
    const c = await loadContext(ctx);
    const seasons = (await db.list("seasons", { where: { series_id: c.series.id } })).sort((a, b) => b.number - a.number);
    let season = seasons[0];
    if (!season) season = await db.insert("seasons", { id: newId("sea"), series_id: c.series.id, number: 1, title: "Season 1", synopsis: "", arc: "", created_at: nowIso() });
    const inSeason = await db.list("episodes", { where: { season_id: season.id } });
    const number = inSeason.reduce((m, e) => Math.max(m, e.number), 0) + 1;

    const writer = getWriter();
    let result: EpisodePlan;
    let simulated = false;
    if (writer) {
      const settings = await getAgentSettings();
      ctx.ensureBudget(5);
      const r = await writer.json({
        model: settings.writer_model,
        system: WRITER_SYSTEM,
        prompt: [
          `Series: ${c.series.title} (${c.series.genre})`,
          `About the series: ${c.series.description}`,
          c.storyNotes && `Showrunner notes: ${c.storyNotes}`,
          c.previous.length ? `Story so far (most recent last):\n${c.previous.map((e) => `- Ep ${e.number} “${e.title}”: ${e.summary}`).join("\n")}` : "This is the first episode.",
          `Plan episode ${number} of season ${season.number}. It should continue naturally from the story so far without repeating it.`,
        ]
          .filter(Boolean)
          .join("\n\n"),
        schema: EpisodePlanSchema,
        jsonSchema: toJsonSchema(EpisodePlanSchema, true),
        effort: "medium",
      });
      result = r.data;
      await ctx.addCost(estimateCostCents(r.model, r.usage));
    } else {
      result = simulatedPlan(c.series, number, c.previous.map((e) => e.title));
      simulated = true;
    }
    const minutes = await targetMinutes(ctx);
    const now = nowIso();
    const ep = await db.insert("episodes", {
      id: newId("ep"),
      series_id: c.series.id,
      season_id: season.id,
      number,
      title: result.title.trim(),
      summary: result.summary.trim(),
      duration_seconds: minutes * 60,
      status: "draft",
      release_at: null,
      published_at: null,
      audio_asset_id: null,
      artwork_url: null,
      is_preview: false,
      created_at: now,
      updated_at: now,
    });
    ctx.state.episode_id = ep.id;
    ctx.state.plan = result;
    await ctx.setEpisode(ep.id);
    return { preview: `Episode ${number}: “${result.title}” – ${result.summary}`, simulated };
  },
};

const write: StepDef = {
  id: "write",
  label: "Write the script",
  agent: "writer",
  async run(ctx) {
    const db = getDb();
    const c = await loadContext(ctx);
    const p = ctx.state.plan as EpisodePlan;
    const targetWords = (await targetMinutes(ctx)) * WORDS_PER_MINUTE;
    const writer = getWriter();
    let content: string;
    let provider = "simulated";
    let model = "calm-template-v1";
    if (writer) {
      const settings = await getAgentSettings();
      ctx.ensureBudget(40);
      const r = await writer.text({
        model: settings.writer_model,
        system: WRITER_SYSTEM,
        prompt: [
          `Series: ${c.series.title}. ${c.series.description}`,
          c.storyNotes && `Showrunner notes: ${c.storyNotes}`,
          c.previous.length && `Story so far:\n${c.previous.map((e) => `- “${e.title}”: ${e.summary}`).join("\n")}`,
          `Write the complete script for “${p.title}”: ${p.summary}`,
          `Beats:\n${p.beats.map((b, i) => `${i + 1}. ${b}`).join("\n")}`,
          `Length: about ${targetWords} words (around ${Math.round(targetWords / WORDS_PER_MINUTE)} minutes read slowly). Output only the script.`,
        ]
          .filter(Boolean)
          .join("\n\n"),
        effort: "high",
      });
      content = r.data;
      provider = "anthropic";
      model = r.model;
      await ctx.addCost(estimateCostCents(r.model, r.usage));
    } else {
      content = simulatedScript(p, c.series, targetWords);
    }
    const now = nowIso();
    const existing = await db.findOne("episode_scripts", { episode_id: ctx.state.episode_id as string });
    const row = { content, word_count: wordCount(content), provider, model, simulated: provider === "simulated", notes: [], updated_at: now };
    if (existing) await db.update("episode_scripts", existing.id, row);
    else await db.insert("episode_scripts", { id: newId("scr"), episode_id: ctx.state.episode_id as string, series_id: c.series.id, created_at: now, ...row });
    return { preview: `${wordCount(content)} words. “${content.replace(/\s+/g, " ").slice(0, 140)}…”`, simulated: provider === "simulated" };
  },
};

const sleepEdit: StepDef = {
  id: "sleep_edit",
  label: "Sleep-suitability edit",
  agent: "sleep_editor",
  async run(ctx) {
    const db = getDb();
    const script = await db.findOne("episode_scripts", { episode_id: ctx.state.episode_id as string });
    if (!script) throw new Error("No script to check.");
    const targetWords = (await targetMinutes(ctx)) * WORDS_PER_MINUTE;
    const issues = sleepChecks(script.content, targetWords);
    const writer = getWriter();
    if (!issues.length) {
      await db.update("episode_scripts", script.id, { notes: ["Sleep editor: no issues found."] });
      return { preview: "No issues – pacing and tone are bedtime-safe." };
    }
    if (writer && !script.simulated) {
      const settings = await getAgentSettings();
      ctx.ensureBudget(40);
      const r = await writer.json({
        model: settings.writer_model,
        system: WRITER_SYSTEM,
        prompt: `You are the sleep editor. Revise this Sleep Story so it is fully bedtime-safe, fixing these issues while keeping the story, length and section breaks:\n${issues.map((i) => `- ${i}`).join("\n")}\n\nScript:\n${script.content}`,
        schema: SoftenSchema,
        jsonSchema: toJsonSchema(SoftenSchema, true),
        effort: "medium",
      });
      await ctx.addCost(estimateCostCents(r.model, r.usage));
      await db.update("episode_scripts", script.id, { content: r.data.script, word_count: wordCount(r.data.script), notes: [...issues.map((i) => `Found: ${i}`), ...r.data.changes.map((c) => `Softened: ${c}`)], updated_at: nowIso() });
      return { preview: `Softened ${r.data.changes.length} passage(s).` };
    }
    await db.update("episode_scripts", script.id, { notes: issues.map((i) => `Flag for editor: ${i}`) });
    return { preview: `Flagged for the editor: ${issues.join(" ")}`, simulated: script.simulated };
  },
};

const narrate: StepDef = {
  id: "narrate",
  label: "Narrate",
  agent: "narrator",
  async run(ctx) {
    const db = getDb();
    const script = await db.findOne("episode_scripts", { episode_id: ctx.state.episode_id as string });
    if (!script) throw new Error("No script to narrate.");
    const sections = splitSections(script.content);
    const keys = (ctx.state.section_keys as string[] | undefined) ?? [];
    const settings = await getAgentSettings();
    const voiceId = await voiceFor(ctx);
    const useEleven = Boolean(env.elevenLabsApiKey);
    for (let i = 0; i < sections.length; i++) {
      if (keys[i]) continue; // already narrated (retry / resume)
      const text = sections[i]!;
      let samples: Float32Array;
      if (useEleven) {
        ctx.ensureBudget((text.length / 1000) * 18);
        const r = await elevenLabsSpeech(env.elevenLabsApiKey!, { text, voiceId, model: settings.tts_model, previousText: sections[i - 1]?.slice(-300), nextText: sections[i + 1]?.slice(0, 300) });
        samples = r.samples;
        await ctx.addCost(r.cost_cents);
      } else {
        samples = simulatedSpeech(text);
      }
      const key = `production/${ctx.state.episode_id}/section-${String(i).padStart(3, "0")}.wav`;
      await getStorage().put(key, encodeWav(samples, SAMPLE_RATE), "audio/wav");
      keys[i] = key;
      ctx.state.section_keys = keys;
      await ctx.log(`Narrated section ${i + 1} of ${sections.length}.`);
    }
    ctx.state.section_keys = keys.slice(0, sections.length);
    return {
      preview: `${sections.length} sections voiced ${useEleven ? `by ElevenLabs (voice ${voiceId})` : "with the placeholder voice (no ElevenLabs key)"}.`,
      simulated: !useEleven,
    };
  },
};

const ambience: StepDef = {
  id: "ambience",
  label: "Design the ambience",
  agent: "sound_designer",
  async run(ctx) {
    const db = getDb();
    const p = ctx.state.plan as EpisodePlan;
    const settings = await getAgentSettings();
    let samples: Float32Array;
    let simulated = false;
    if (env.elevenLabsApiKey) {
      ctx.ensureBudget(15);
      const r = await elevenLabsSoundEffect(env.elevenLabsApiKey, { prompt: p.ambience_prompt, model: settings.sfx_model, seconds: 30 });
      samples = r.samples;
      await ctx.addCost(r.cost_cents);
    } else {
      const series = await db.get("series", ctx.job.series_id);
      const scape = series?.soundscape_id ? await db.get("soundscapes", series.soundscape_id) : null;
      samples = renderAmbience(scape?.layers ?? [{ kind: "rain", gain: 0.8 }, { kind: "pad", gain: 0.3 }], 60, { seed: hashString(String(ctx.state.episode_id)) });
      simulated = true;
    }
    const key = `production/${ctx.state.episode_id}/ambience.wav`;
    await getStorage().put(key, encodeWav(samples, SAMPLE_RATE), "audio/wav");
    ctx.state.ambience_key = key;
    return { preview: simulated ? "Used the series' in-house soundscape (no ElevenLabs key)." : `ElevenLabs ambience: “${p.ambience_prompt}”`, simulated };
  },
};

const mix: StepDef = {
  id: "mix",
  label: "Mix, master and QA",
  agent: "mixer",
  async run(ctx) {
    const db = getDb();
    const storage = getStorage();
    const keys = ctx.state.section_keys as string[];
    const sections = [];
    for (const k of keys) {
      const f = await storage.get(k);
      if (!f) throw new Error(`Missing narration section ${k}.`);
      sections.push(decodeWav(f.data));
    }
    const narration = concatSections(sections, 1.4);
    const ambFile = ctx.state.ambience_key ? await storage.get(ctx.state.ambience_key as string) : null;
    const amb = ambFile ? decodeWav(ambFile.data).samples : null;
    const mixed = mixEpisode(narration, { ambience: amb, ambienceVolume: 0.45, musicVolume: 0 });
    const script = await db.findOne("episode_scripts", { episode_id: ctx.state.episode_id as string });
    const qa = analyzeAudio(mixed.samples, mixed.sampleRate, {
      expectedSections: keys.length,
      actualSections: sections.length,
      wordCount: script?.word_count,
      narrationSeconds: mixed.narrationSeconds,
      ambienceToNarrationDb: mixed.ambienceToNarrationDb,
    });
    const wav = encodeWav(mixed.samples, mixed.sampleRate);
    const ffmpeg = getFfmpeg();
    const [data, mime, ext] = ffmpeg ? [await ffmpegTranscode(ffmpeg, wav, { loudnorm: true }), "audio/mpeg", "mp3"] : [wav, "audio/wav", "wav"];
    const episodeId = ctx.state.episode_id as string;
    const key = `audio/${ctx.job.series_id}/${episodeId}.${ext}`;
    await storage.put(key, data, mime);
    const simulatedVoice = !env.elevenLabsApiKey;
    const duration = Math.round(mixed.samples.length / mixed.sampleRate);
    const assetId = newId("aud");
    await db.insert("audio_assets", {
      id: assetId,
      owner_id: null,
      series_id: ctx.job.series_id,
      episode_id: episodeId,
      kind: "produced",
      storage_key: key,
      url: `/api/admin/audio/${assetId}`,
      mime_type: mime,
      duration_seconds: duration,
      provider: simulatedVoice ? "simulated" : "elevenlabs",
      meta: { qa, simulated: simulatedVoice, bytes: data.length, mastered_with_ffmpeg: Boolean(ffmpeg) },
      created_at: nowIso(),
    });
    await db.update("episodes", episodeId, { audio_asset_id: assetId, duration_seconds: duration, updated_at: nowIso() });
    ctx.state.audio_asset_id = assetId;
    return {
      preview: `${Math.floor(duration / 60)}m ${duration % 60}s ${ext.toUpperCase()}. QA ${qa.passed ? "passed" : "has warnings"}: ${qa.issues.filter((i) => i.severity !== "pass").map((i) => i.message).join(" ") || "all checks passed"}.`,
      simulated: simulatedVoice,
    };
  },
};

const art: StepDef = {
  id: "art",
  label: "Create artwork",
  agent: "art_director",
  async run(ctx) {
    if (!env.geminiApiKey) return { skipped: true, preview: "No Gemini key – the series' procedural key art will be used." };
    const db = getDb();
    const settings = await getAgentSettings();
    const series = (await db.get("series", ctx.job.series_id))!;
    const wf = await db.findOne("production_workflows", { series_id: series.id });
    const p = ctx.state.plan as EpisodePlan;
    const style = wf?.art_style || "Soft, painterly, cinematic night scene with gentle glowing light";
    const made: string[] = [];

    const generate = async (kind: "episode" | "cover", prompt: string, aspectRatio: "16:9" | "3:4") => {
      ctx.ensureBudget(4);
      const img = await nanoBananaImage(env.geminiApiKey!, { prompt, model: settings.image_model, aspectRatio });
      await ctx.addCost(img.cost_cents);
      const id = newId("art");
      const ext = img.mimeType.includes("jpeg") ? "jpg" : img.mimeType.includes("webp") ? "webp" : "png";
      const key = `art/${series.id}/${id}.${ext}`;
      await getStorage().put(key, img.data, img.mimeType);
      await db.insert("artwork_assets", {
        id,
        series_id: series.id,
        episode_id: kind === "episode" ? (ctx.state.episode_id as string) : null,
        kind,
        storage_key: key,
        url: `/api/art/${id}`,
        mime_type: img.mimeType,
        provider: "gemini",
        model: settings.image_model,
        prompt,
        created_at: nowIso(),
      });
      return `/api/art/${id}`;
    };

    if (!ctx.state.episode_art_url) {
      ctx.state.episode_art_url = await generate("episode", `${p.art_prompt}. Style: ${style}. Calm, restful mood. No text, no lettering, no logos.`, "16:9");
      await db.update("episodes", ctx.state.episode_id as string, { artwork_url: ctx.state.episode_art_url as string, updated_at: nowIso() });
      made.push("episode artwork");
    }
    if (!series.artwork.image_url && !ctx.state.cover_url) {
      ctx.state.cover_url = await generate("cover", `Series cover art for “${series.title}”: ${series.tagline || series.description}. Style: ${style}. Portrait composition with calm negative space at the top. No text, no lettering.`, "3:4");
      await db.update("series", series.id, { artwork: { ...series.artwork, image_url: ctx.state.cover_url as string }, updated_at: nowIso() });
      made.push("series cover");
    }
    return { preview: made.length ? `Nano Banana painted the ${made.join(" and ")}.` : "Artwork already in place." };
  },
};

const publish: StepDef = {
  id: "publish",
  label: "Send to editorial review",
  agent: "publisher",
  async run(ctx) {
    const db = getDb();
    const episodeId = ctx.state.episode_id as string;
    const releaseAt = (ctx.job.payload.release_at as string | null) ?? null;
    const [script, asset, ep] = await Promise.all([
      db.findOne("episode_scripts", { episode_id: episodeId }),
      ctx.state.audio_asset_id ? db.get("audio_assets", ctx.state.audio_asset_id as string) : Promise.resolve(null),
      db.get("episodes", episodeId),
    ]);
    const checks: ReviewCheck[] = await computeReviewChecks(episodeId, releaseAt);
    checks.push(
      !script
        ? { name: "script", status: "fail", detail: "No script." }
        : script.simulated
          ? { name: "script", status: "warn", detail: "Simulated script (no Anthropic key) – placeholder text." }
          : script.notes.some((n) => n.startsWith("Flag"))
            ? { name: "script", status: "warn", detail: script.notes.filter((n) => n.startsWith("Flag")).join(" ") }
            : { name: "script", status: "pass", detail: `${script.word_count} words by ${script.model}. ${script.notes.join(" ")}`.trim() },
    );
    const qa = asset?.meta.qa as { passed: boolean; issues: { severity: string; message: string }[] } | undefined;
    checks.push(
      !qa
        ? { name: "audio_qa", status: "not_run", detail: "No QA report." }
        : asset?.meta.simulated
          ? { name: "audio_qa", status: "warn", detail: "Placeholder voice (no ElevenLabs key) – not real narration." }
          : qa.passed
            ? { name: "audio_qa", status: "pass", detail: "Levels, silence, pacing and transitions within range." }
            : { name: "audio_qa", status: "warn", detail: qa.issues.filter((i) => i.severity !== "pass").map((i) => i.message).join(" ") },
    );
    checks.push(
      ep?.artwork_url
        ? { name: "artwork", status: "pass", detail: "Episode artwork generated by Nano Banana." }
        : { name: "artwork", status: "warn", detail: "No generated artwork – the series key art will be shown." },
    );
    await db.update("episodes", episodeId, { status: "in_review", updated_at: nowIso() });
    const editors = await db.list("user_roles", { where: { role: ["admin", "editor"] } });
    const submitter = ctx.job.requested_by ?? editors[0]?.user_id;
    if (!submitter) throw new Error("No editor account to file the review under.");
    const review = await db.insert("editorial_reviews", {
      id: newId("rev"),
      episode_id: episodeId,
      series_id: ctx.job.series_id,
      submitted_by: submitter,
      source: "agents",
      status: "pending",
      checks,
      requested_release_at: releaseAt,
      reviewer_id: null,
      notes: "",
      created_at: nowIso(),
      decided_at: null,
    });
    for (const uid of new Set(editors.map((e) => e.user_id))) {
      await db.insert("notifications", {
        id: newId("ntf"),
        user_id: uid,
        kind: "review",
        title: "New episode ready for review",
        body: `${ep?.title ?? "An episode"} was produced by the agents.`,
        link: `/admin/review?id=${review.id}`,
        read: false,
        created_at: nowIso(),
      });
    }
    await track("episode_produced", "system", { episode_id: episodeId, job_id: ctx.job.id });
    return { preview: `In the review queue${releaseAt ? ` for ${new Date(releaseAt).toUTCString()}` : ""}.` };
  },
};

export const PIPELINE: StepDef[] = [plan, write, sleepEdit, narrate, ambience, mix, art, publish];
registerSteps(PIPELINE);
