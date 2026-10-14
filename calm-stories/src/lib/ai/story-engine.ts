import "server-only";
import { z } from "zod";
import type { ConceptProposal, ContinuityReport, DirectionProposal, GenerationMeta, Genre, SceneKind, ScriptSettings } from "@/lib/types";
import { GENRES } from "@/lib/types";
import { contextToPrompt, type StoryContext } from "@/lib/story/context";
import { checkFacts, checkUnknownNames, checkWorldRules } from "@/lib/story/checks";
import { nowIso } from "@/lib/util";
import { resolveWriter, taskGuidance, type AiTask } from "./index";
import { toJsonSchema } from "./json-schema";
import { estimateCostCents } from "./provider";
import * as mock from "./mock-writer";

/**
 * Calm's house guidance for every writing call. Kept stable (no timestamps)
 * so it caches well and so all agents share one creative standard.
 */
export const SLEEP_STORY_SYSTEM = `You are a senior writer and creative director for Calm Sleep Stories – serialized audio stories designed to help adults relax and drift off.

House standards:
- Calm, immersive, sensory, unhurried. Long flowing sentences; gentle rhythm; generous description of light, sound, texture and scent.
- Low stakes. No violence, horror, cruelty, explicit content, or distressing themes. Tension, if any, is soft and resolves within the episode.
- Romance is tender and non-explicit: glances, shared silences, small kindnesses.
- Every episode ends somewhere warm, safe and settled, inviting rest. No cliffhangers.
- Original work only. Never use copyrighted characters, worlds, lyrics or music.
- Respect the series Story Bible. Never contradict established facts or world rules; if something seems to conflict, flag it instead of rewriting lore.
- Write for the ear: avoid tricky abbreviations, lists, stage directions or markdown in narration.`;

const GenreEnum = z.enum(GENRES as [Genre, ...Genre[]]);
const SceneEnum = z.enum(["kingdom", "forest", "cabin", "space", "ocean", "garden", "library", "village", "coast", "desert", "aurora", "city", "lake"]);

function meta(providerName: string, model: string, simulated: boolean, usage?: { input_tokens: number; output_tokens: number }): GenerationMeta {
  return {
    provider: providerName,
    model,
    simulated,
    cost_cents: usage ? estimateCostCents(model, usage) : 0,
    input_tokens: usage?.input_tokens,
    output_tokens: usage?.output_tokens,
  };
}

async function structured<T>(task: AiTask, schema: z.ZodType<T, z.ZodTypeDef, unknown>, prompt: string, simulate: () => T, maxTokens = 8000) {
  const w = await resolveWriter(task);
  if (!w.provider) return { data: simulate(), meta: meta(w.providerName, w.model, true) };
  const res = await w.provider.json({ model: w.model, system: SLEEP_STORY_SYSTEM + (await taskGuidance(task)), prompt, schema, jsonSchema: toJsonSchema(schema, true), maxTokens });
  return { data: res.data, meta: meta(w.providerName, res.model, false, res.usage) };
}

/* ------------------------------------------------------------------ */

const ConceptSchema = z.object({
  title: z.string(),
  tagline: z.string(),
  synopsis: z.string(),
  genre: GenreEnum,
  tags: z.array(z.string()),
  narrative_arc: z.string(),
  characters: z.array(z.object({ name: z.string(), role: z.string(), sketch: z.string() })),
  scene: SceneEnum,
  follow_up_questions: z.array(z.string()).describe("At most two essential questions."),
});

export async function generateConcept(idea: string): Promise<{ proposal: ConceptProposal; meta: GenerationMeta }> {
  const prompt = `A creator wants to make a new serialized Sleep Story series. Their idea, in their own words:\n"""${idea}"""\n\nDevelop it into a series concept that keeps the creator's original idea at its heart (do not replace their premise). Suggest a title, a one-line tagline, a 3–4 sentence synopsis, a genre, tags, an overarching season arc, 2–4 central characters, the key-art scene that best fits, and at most two essential follow-up questions.`;
  const { data, meta: m } = await structured("concept", ConceptSchema, prompt, () => {
    const { original_idea: _o, ...rest } = mock.mockConcept(idea);
    return rest;
  });
  return { proposal: { ...data, scene: data.scene as SceneKind, follow_up_questions: data.follow_up_questions.slice(0, 2), original_idea: idea }, meta: m };
}

const WorldSchema = z.object({
  world_name: z.string(),
  geography: z.string(),
  culture: z.string(),
  history: z.string(),
  atmosphere: z.string(),
  rules: z.array(z.string()),
  themes: z.array(z.string()),
  locations: z.array(z.object({ name: z.string(), description: z.string(), recurring: z.boolean() })),
});

export async function generateWorld(ctx: StoryContext, brief?: string) {
  const prompt = `Create a World Bible for this series.\n\n${contextToPrompt(ctx)}\n\n${brief ? `Creator's notes: ${brief}\n\n` : ""}Keep everything already established. Provide: world name, geography, culture, history, atmosphere, 3–5 world rules (gentle, never frightening), 2–4 narrative themes and 4–6 important recurring locations.`;
  return structured("world", WorldSchema, prompt, () => mock.mockWorld({ title: ctx.series.title, synopsis: ctx.series.description, scene: ctx.series.artwork.scene }));
}

const CharacterSchema = z.object({
  name: z.string(),
  age_range: z.string(),
  personality: z.string(),
  backstory: z.string(),
  motivations: z.string(),
  narrative_role: z.string(),
  voice_profile: z.string(),
  arc: z.string(),
});
const CharactersSchema = z.object({ characters: z.array(CharacterSchema) });
export type GeneratedCharacter = z.infer<typeof CharacterSchema>;

export async function generateCharacters(ctx: StoryContext, input: { count: number; brief?: string; names?: string[] }) {
  const prompt = `Create ${input.count} original character profile(s) for this series.\n\n${contextToPrompt(ctx)}\n\n${input.brief ? `Creator's brief: ${input.brief}\n` : ""}${input.names?.length ? `Use these names: ${input.names.join(", ")}\n` : ""}Do not duplicate existing characters. Each needs: name, age range, personality, backstory, motivations, narrative role, a voice profile for narration, and a gentle development arc.`;
  return structured("characters", CharactersSchema, prompt, () => ({
    characters: Array.from({ length: input.count }, (_, i) =>
      mock.mockCharacter({ seriesTitle: ctx.series.title, scene: ctx.series.artwork.scene, name: input.names?.[i], index: ctx.characters.length + i }),
    ),
  }));
}

const OutlineSchema = z.object({
  synopsis: z.string(),
  arc: z.string(),
  milestones: z.array(z.string()),
  episodes: z.array(z.object({ number: z.number().int(), title: z.string(), summary: z.string() })),
});

export async function generateSeasonOutline(ctx: StoryContext, input: { episodeCount: number; seasonNumber: number; brief?: string }) {
  const existing = ctx.episodes.filter((e) => ctx.seasons.find((s) => s.id === e.season_id)?.number === input.seasonNumber);
  const startNumber = existing.length + 1;
  const prompt = `Plan Season ${input.seasonNumber} (${input.episodeCount} new episodes, numbered from ${startNumber}).\n\n${contextToPrompt(ctx)}\n\n${input.brief ? `Creator's notes: ${input.brief}\n\n` : ""}Give a season synopsis, the overall narrative arc, important milestones, and for each episode a title and a 1–2 sentence summary. Each episode must be self-contained and end restfully, while gently advancing the season arc and the unresolved threads.`;
  return structured(
    "outline",
    OutlineSchema,
    prompt,
    () =>
      mock.mockSeasonOutline({
        seriesTitle: ctx.series.title,
        scene: ctx.series.artwork.scene,
        characterNames: ctx.characters.map((c) => c.name),
        threads: ctx.bible.unresolved_threads,
        episodeCount: input.episodeCount,
        startNumber,
      }),
    12000,
  );
}

export async function writeEpisodeScript(ctx: StoryContext, episodeId: string, settings: ScriptSettings): Promise<{ content: string; meta: GenerationMeta }> {
  const ep = ctx.episodes.find((e) => e.id === episodeId);
  if (!ep) throw new Error("Episode not found in story context.");
  const prev = ctx.episodes[ctx.episodes.findIndex((e) => e.id === episodeId) - 1];
  const w = await resolveWriter("script");
  const words = Math.round(settings.duration_minutes * (settings.pacing === "very-slow" ? 95 : settings.pacing === "slow" ? 110 : 125));
  if (!w.provider) {
    const content = mock.mockScript({
      seriesTitle: ctx.series.title,
      episodeTitle: ep.title,
      summary: ep.summary,
      scene: ctx.series.artwork.scene,
      characters: ctx.characters.map((c) => ({ name: c.name, personality: c.personality })),
      worldName: ctx.bible.world_name,
      settings,
      previously: prev?.summary ?? null,
    });
    return { content, meta: meta(w.providerName, w.model, true) };
  }
  const prompt = `Write the full narration script for Episode ${ep.number}: "${ep.title}".\nEpisode summary: ${ep.summary}\n\nSTORY BIBLE\n${contextToPrompt(ctx, { upToEpisodeId: ep.id })}\n\nSETTINGS\n- Target length: about ${words} words (${settings.duration_minutes} minutes at a sleep-story pace)\n- Mood: ${settings.mood}\n- Perspective: ${settings.perspective}-person\n- Style: ${settings.style}\n- Dialogue: ${settings.dialogue}\n- Romance: ${settings.romance} (always sleep-friendly and non-explicit)\n- Pacing: ${settings.pacing}\n\nBegin with a short, calming welcome that invites the listener to settle. Return only the narration text, in paragraphs separated by blank lines. No headings, no stage directions.`;
  const res = await w.provider.turn({ model: w.model, system: SLEEP_STORY_SYSTEM + (await taskGuidance("script")), messages: [{ role: "user", text: prompt }], maxTokens: Math.min(32000, Math.round(words * 2.2) + 2000) });
  if (res.stop === "max_tokens") throw new Error("The script was cut off before it finished. Try a shorter duration.");
  return { content: res.text.trim(), meta: meta(w.providerName, res.model, false, res.usage) };
}

export const REWRITE_INSTRUCTIONS: Record<mock.RewriteInstruction, string> = {
  rewrite: "Rewrite this passage with fresh wording, keeping the same events and tone.",
  expand: "Expand this passage with more unhurried detail, roughly doubling its length.",
  shorten: "Shorten this passage to about half its length while keeping its essence.",
  atmospheric: "Make this passage more atmospheric – deepen the mood, light and setting.",
  dialogue: "Improve or add gentle dialogue between the characters present, in keeping with their voice profiles.",
  sensory: "Add rich sensory description – sound, scent, texture, temperature and light.",
  relaxing: "Make this passage more relaxing: slow the rhythm, soften anything stimulating, and invite the listener to breathe.",
  ending: "Rewrite this as a new, restful ending for the episode that leaves the listener settled and sleepy.",
  continuity: "Correct anything in this passage that conflicts with the Story Bible, changing as little as possible.",
};

export async function rewritePassage(ctx: StoryContext, input: { passage: string; instruction: mock.RewriteInstruction; custom?: string; before?: string; after?: string }) {
  const w = await resolveWriter("rewrite");
  if (!w.provider) {
    return { text: mock.mockRewrite(input.passage, input.instruction, ctx.series.artwork.scene, input.custom ?? ""), meta: meta(w.providerName, w.model, true) };
  }
  const prompt = `${REWRITE_INSTRUCTIONS[input.instruction]}${input.custom ? `\nCreator's note: ${input.custom}` : ""}\n\nSTORY BIBLE\n${contextToPrompt(ctx, { recent: 3 })}\n\nTEXT BEFORE (for context, do not repeat):\n${(input.before ?? "").slice(-1200)}\n\nPASSAGE TO REWRITE:\n${input.passage}\n\nTEXT AFTER (for context, do not repeat):\n${(input.after ?? "").slice(0, 800)}\n\nReturn only the replacement passage.`;
  const res = await w.provider.turn({ model: w.model, system: SLEEP_STORY_SYSTEM + (await taskGuidance("rewrite")), messages: [{ role: "user", text: prompt }], maxTokens: 6000, effort: "low" });
  return { text: res.text.trim(), meta: meta(w.providerName, res.model, false, res.usage) };
}

const ContinuitySchema = z.object({
  issues: z.array(z.object({ severity: z.enum(["info", "warn", "conflict"]), message: z.string(), evidence: z.string() })),
  summary: z.string(),
});

/** Combine rule-based checks with a model review (when configured). Never edits the script. */
export async function reviewContinuity(ctx: StoryContext, script: string): Promise<{ report: ContinuityReport; meta: GenerationMeta }> {
  const known = [ctx.bible.world_name, ...ctx.characters.map((c) => c.name), ...ctx.locations.map((l) => l.name), ctx.series.title];
  const ruleIssues = [...checkWorldRules(script, ctx.bible.rules), ...checkFacts(script, ctx.bible.established_facts), ...checkUnknownNames(script, known)];
  const w = await resolveWriter("continuity");
  if (!w.provider) {
    return {
      report: {
        checked_at: nowIso(),
        issues: ruleIssues,
        summary: ruleIssues.some((i) => i.severity === "conflict")
          ? "Possible contradictions found – review before saving."
          : ruleIssues.length
            ? "No contradictions found; a few notes to consider."
            : "No continuity problems found by the rule-based checks.",
        simulated: true,
      },
      meta: meta("rules", "continuity-rules-v1", true),
    };
  }
  const prompt = `Check this episode script against the Story Bible. List any contradictions with established facts, world rules, character personalities, relationships or previous events, quoting the evidence. Do not rewrite anything. If there are no problems, return an empty list.\n\nSTORY BIBLE\n${contextToPrompt(ctx)}\n\nSCRIPT\n${script.slice(0, 60000)}`;
  const res = await w.provider.json({ model: w.model, system: SLEEP_STORY_SYSTEM + (await taskGuidance("continuity")), prompt, schema: ContinuitySchema, jsonSchema: toJsonSchema(ContinuitySchema, true), effort: "low" });
  return {
    report: { checked_at: nowIso(), issues: [...ruleIssues, ...res.data.issues], summary: res.data.summary, simulated: false },
    meta: meta(w.providerName, res.model, false, res.usage),
  };
}

const DirectionSchema = z.object({
  episode_title: z.string(),
  summary: z.string(),
  beats: z.array(z.string()),
  threads_advanced: z.array(z.string()),
});

export async function proposeNextDirection(ctx: StoryContext, brief?: string): Promise<{ proposal: DirectionProposal; meta: GenerationMeta }> {
  const last = ctx.episodes[ctx.episodes.length - 1];
  const prompt = `Propose the next episode of this series ("Continue this story").\n\n${contextToPrompt(ctx)}\n\n${brief ? `Creator's direction: ${brief}\n\n` : ""}Suggest a title, a 2–3 sentence summary, 4–5 story beats, and which unresolved threads it gently advances. It must follow naturally from the most recent episode and contradict nothing established.`;
  const { data, meta: m } = await structured("direction", DirectionSchema, prompt, () =>
    mock.mockDirection({
      seriesTitle: ctx.series.title,
      scene: ctx.series.artwork.scene,
      lead: ctx.characters[0]?.name ?? "Our traveller",
      threads: ctx.bible.unresolved_threads,
      lastSummary: last?.summary ?? null,
      nextNumber: ctx.episodes.length + 1,
    }),
  );
  return { proposal: data, meta: m };
}

const DescriptionSchema = z.object({ description: z.string() });

export async function describeEpisode(ctx: StoryContext, title: string, summary: string) {
  const prompt = `Write a two-sentence, spoiler-free listing description for the episode "${title}" of ${ctx.series.title}. Summary: ${summary}`;
  return structured("metadata", DescriptionSchema, prompt, () => ({ description: mock.mockDescription(title, summary) }), 1000);
}
