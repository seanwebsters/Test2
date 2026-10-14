import "server-only";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { badRequest, notFound } from "@/lib/errors";
import { enqueueJob } from "@/lib/jobs/runner";
import { getProduction, previewSoundscape, previewVoice, ttsIsPaid, updateProductionSettings, scriptSections, getTts } from "@/lib/production/audio";
import { defineTool } from "./registry";
import { getEpisodeInSeries } from "./scripts";

const LayerKind = z.enum(["rain", "forest", "ocean", "fire", "thunder", "space", "wind", "village", "stream", "pad"]);

defineTool({
  name: "update_production_settings",
  description:
    "Change audio production settings for an episode: narrator voice, narration speed, warmth (emotional delivery), stability, base soundscape, extra environmental layers, ambience and music volume.",
  input: z.object({
    episode_id: z.string(),
    voice_id: z.string().optional(),
    speed: z.number().min(0.7).max(1.1).optional(),
    warmth: z.number().min(0).max(1).optional(),
    stability: z.number().min(0).max(1).optional(),
    soundscape_id: z.string().optional(),
    add_layers: z.array(z.object({ kind: LayerKind, gain: z.number().min(0).max(1).default(0.5) })).max(6).optional(),
    remove_layers: z.array(LayerKind).max(10).optional(),
    ambience_volume: z.number().min(0).max(1).optional(),
    music_volume: z.number().min(0).max(1).optional(),
  }),
  permission: "creator",
  seriesScoped: true,
  async run(input, ctx) {
    const ep = await getEpisodeInSeries(input.episode_id, ctx.series!.id);
    const prod = await getProduction(ep.id);
    let extra = prod.settings.extra_layers;
    if (input.remove_layers?.length) extra = extra.filter((l) => !input.remove_layers!.includes(l.kind));
    for (const l of input.add_layers ?? []) extra = [...extra.filter((x) => x.kind !== l.kind), l];
    const { episode_id: _e, add_layers: _a, remove_layers: _r, ...rest } = input;
    const patch = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined));
    const updated = await updateProductionSettings(ep.id, { ...patch, extra_layers: extra });
    const needsNarration = updated.section_asset_ids.some((x) => !x) || updated.section_asset_ids.length === 0;
    return {
      summary: `Audio settings updated${needsNarration && prod.section_asset_ids.some(Boolean) ? " – the narration needs regenerating with the new voice settings" : ""}.`,
      focus: { section: "audio", id: ep.id },
      data: { settings: updated.settings, needs_narration: needsNarration },
    };
  },
});

defineTool({
  name: "preview_voice",
  description: "Generate a short preview clip of a narrator voice with the given delivery settings.",
  input: z.object({
    voice_id: z.string(),
    text: z.string().max(400).default("Take a slow breath in, and let it go. Tonight, the lanterns are lit, and there is nowhere else you need to be."),
    speed: z.number().min(0.7).max(1.1).default(0.9),
    warmth: z.number().min(0).max(1).default(0.7),
    stability: z.number().min(0).max(1).default(0.75),
  }),
  permission: "creator",
  seriesScoped: false,
  async confirm(_i, ctx) {
    return !ctx.confirmed && (await ttsIsPaid()) ? "Voice previews use the paid text-to-speech provider." : null;
  },
  async run(input, ctx) {
    const voice = await getDb().get("voice_profiles", input.voice_id);
    if (!voice || !voice.approved) throw notFound("Voice not found.");
    const asset = await previewVoice(voice, input.text, input, ctx.viewer.user.id);
    return { summary: `Preview of ${voice.name} ready${asset.simulated ? " (simulated placeholder – no voice provider configured)" : ""}.`, data: { url: asset.url, simulated: asset.simulated } };
  },
});

defineTool({
  name: "generate_soundscape",
  description: "Render a short preview of a soundscape (a library soundscape plus optional extra layers).",
  input: z.object({ soundscape_id: z.string().optional(), layers: z.array(z.object({ kind: LayerKind, gain: z.number().min(0).max(1) })).max(8).optional() }),
  permission: "creator",
  seriesScoped: false,
  async run(input, ctx) {
    const sc = input.soundscape_id ? await getDb().get("soundscapes", input.soundscape_id) : null;
    const layers = [...(sc?.layers ?? []), ...(input.layers ?? [])];
    if (!layers.length) throw badRequest("Choose a soundscape or at least one layer.");
    const asset = await previewSoundscape(layers, ctx.viewer.user.id);
    return { summary: "Soundscape preview ready.", data: { url: asset.url } };
  },
});

defineTool({
  name: "generate_narration",
  description: "Generate AI narration for an episode (all missing sections, or specific section indexes to regenerate) and produce a new mix. Runs as a background job.",
  input: z.object({ episode_id: z.string(), sections: z.array(z.number().int().min(0)).max(100).optional() }),
  permission: "creator",
  seriesScoped: true,
  async confirm(input, ctx) {
    if (ctx.confirmed || !(await ttsIsPaid())) return null;
    const { sections } = await scriptSections(input.episode_id);
    const n = input.sections?.length ?? sections.length;
    return `Narrating ${n} section(s) uses ${(await getTts()).name}, a paid text-to-speech provider.`;
  },
  async run(input, ctx) {
    const ep = await getEpisodeInSeries(input.episode_id, ctx.series!.id);
    if (["in_review", "approved", "published"].includes(ep.status)) throw badRequest("This episode is in review or released.");
    await scriptSections(ep.id);
    const tts = await getTts();
    const { job, created } = await enqueueJob({
      kind: "narration",
      payload: { episode_id: ep.id, sections: input.sections },
      series_id: ep.series_id,
      episode_id: ep.id,
      requested_by: ctx.viewer.user.id,
      simulated: tts.simulated,
    });
    return {
      summary: created
        ? `Producing narration${input.sections?.length ? ` for section(s) ${input.sections.map((s) => s + 1).join(", ")}` : ""} with ${tts.simulated ? "simulated placeholder audio" : tts.name}. I'll mix it with the ambience when it's done.`
        : "That narration job is already running.",
      focus: { section: "audio", id: ep.id },
      data: { job_id: job.id },
    };
  },
});

defineTool({
  name: "mix_episode_audio",
  description: "Re-mix existing narration with the current ambience and music settings (no new narration). Runs as a background job.",
  input: z.object({ episode_id: z.string() }),
  permission: "creator",
  seriesScoped: true,
  async run(input, ctx) {
    const ep = await getEpisodeInSeries(input.episode_id, ctx.series!.id);
    const prod = await getProduction(ep.id);
    if (!prod.section_asset_ids.some(Boolean)) throw badRequest("Generate the narration first.");
    const { job } = await enqueueJob({ kind: "mix", payload: { episode_id: ep.id }, series_id: ep.series_id, episode_id: ep.id, requested_by: ctx.viewer.user.id });
    return { summary: "Re-mixing with your new ambience settings.", focus: { section: "audio", id: ep.id }, data: { job_id: job.id } };
  },
});
