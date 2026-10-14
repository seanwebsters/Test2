/** Structured-output schemas for every generation task (zod v4 → JSON Schema for providers). */
import * as z from "zod/v4";

export const GENRE_VALUES = ["Sleep Romantasy", "Cosy Mystery", "Magical Worlds", "Sci-Fi & Space", "Nature & Journeys", "Gentle Adventure", "Coastal Romance"] as const;
export const SCENE_VALUES = ["kingdom", "forest", "cabin", "space", "ocean", "garden", "library", "village", "coast", "desert", "aurora", "city", "lake"] as const;

export const ConceptSchema = z.object({
  title: z.string(),
  tagline: z.string(),
  synopsis: z.string(),
  genre: z.enum(GENRE_VALUES),
  tags: z.array(z.string()),
  narrative_arc: z.string(),
  characters: z.array(z.object({ name: z.string(), role: z.string(), sketch: z.string() })),
  scene: z.enum(SCENE_VALUES),
  follow_up_questions: z.array(z.string()),
});
export type ConceptOut = z.infer<typeof ConceptSchema>;

export const WorldSchema = z.object({
  world_name: z.string(),
  geography: z.string(),
  culture: z.string(),
  history: z.string(),
  atmosphere: z.string(),
  rules: z.array(z.string()),
  themes: z.array(z.string()),
  locations: z.array(z.object({ name: z.string(), description: z.string() })),
});
export type WorldOut = z.infer<typeof WorldSchema>;

export const CharacterSchema = z.object({
  name: z.string(),
  age_range: z.string(),
  personality: z.string(),
  backstory: z.string(),
  motivations: z.string(),
  narrative_role: z.string(),
  voice_profile: z.string(),
  arc: z.string(),
});
export const CharactersSchema = z.object({
  characters: z.array(CharacterSchema),
  relationships: z.array(z.object({ a: z.string(), b: z.string(), kind: z.string(), description: z.string() })),
});
export type CharactersOut = z.infer<typeof CharactersSchema>;

export const SeasonOutlineSchema = z.object({
  title: z.string(),
  synopsis: z.string(),
  arc: z.string(),
  milestones: z.array(z.string()),
  episodes: z.array(z.object({ title: z.string(), summary: z.string() })),
});
export type SeasonOutlineOut = z.infer<typeof SeasonOutlineSchema>;

export const EpisodeOutlineSchema = z.object({ title: z.string(), summary: z.string(), beats: z.array(z.string()) });
export type EpisodeOutlineOut = z.infer<typeof EpisodeOutlineSchema>;

export const ScriptSchema = z.object({ title: z.string(), script: z.string(), new_facts: z.array(z.string()) });
export type ScriptOut = z.infer<typeof ScriptSchema>;

export const RewriteSchema = z.object({ text: z.string() });

export const ContinuitySchema = z.object({
  summary: z.string(),
  issues: z.array(z.object({ severity: z.enum(["info", "warn", "conflict"]), message: z.string(), evidence: z.string() })),
});
export type ContinuityOut = z.infer<typeof ContinuitySchema>;

export const DirectionSchema = z.object({ episode_title: z.string(), summary: z.string(), beats: z.array(z.string()), threads_advanced: z.array(z.string()) });

export const SleepCheckSchema = z.object({ score: z.number(), notes: z.array(z.string()) });
export type SleepCheckOut = z.infer<typeof SleepCheckSchema>;

export const MetadataSchema = z.object({ description: z.string(), tags: z.array(z.string()) });
