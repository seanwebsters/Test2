import { z } from "zod/v4";
import { ART_STYLES, CARD_KINDS, DISPLAY_FONTS, GENRES, RARITIES } from "@/lib/content/types";

/**
 * Structured outputs for each Studio agent. These schemas are sent to the
 * model provider as JSON Schema and re-validated on return; the QA agent
 * then enforces counts and cross-references.
 */
const genreIds = GENRES.map((g) => g.id) as [string, ...string[]];

export const conceptSchema = z.object({
  title: z.string(),
  tagline: z.string(),
  premise: z.string(),
  synopsis: z.string(),
  genres: z.array(z.enum(genreIds)),
  audience: z.string(),
  differentiation: z.string(),
});

export const worldSchema = z.object({
  history: z.string(),
  geography: z.string(),
  rules: z.array(z.string()),
  culture: z.string(),
  mythology: z.string(),
  conflicts: z.array(z.string()),
  locations: z.array(z.object({ id: z.string(), name: z.string(), description: z.string() })),
  secrets: z.array(z.string()),
  factions: z.array(z.object({ id: z.string(), name: z.string(), motto: z.string(), description: z.string(), color: z.string() })),
});

export const charactersSchema = z.object({
  characters: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      role: z.enum(["lead", "supporting", "antagonist", "mystery"]),
      title: z.string(),
      factionId: z.string(),
      bio: z.string(),
      personality: z.string(),
      motivation: z.string(),
      visual: z.string(),
      arc: z.string(),
      relationships: z.array(z.object({ to: z.string(), type: z.enum(["ally", "rival", "family", "romance", "mentor", "enemy", "mystery"]), note: z.string() })),
    }),
  ),
});

export const visualSchema = z.object({
  artStyle: z.enum(ART_STYLES),
  displayFont: z.enum(DISPLAY_FONTS),
  palette: z.object({ bg: z.string(), surface: z.string(), accent: z.string(), accent2: z.string(), ink: z.string(), art: z.array(z.string()) }),
  lighting: z.string(),
  characterRules: z.string(),
  frameStyle: z.string(),
  logoDirection: z.string(),
  keyArtPrompt: z.string(),
});

export const storySchema = z.object({
  seasonTitle: z.string(),
  seasonSynopsis: z.string(),
  plannedEpisodes: z.number(),
  episodes: z.array(z.object({ title: z.string(), synopsis: z.string(), body: z.array(z.string()), characterIds: z.array(z.string()), cliffhanger: z.string() })),
  spinoffs: z.array(z.string()),
});

export const cardsSchema = z.object({
  setName: z.string(),
  setCode: z.string(),
  cards: z.array(
    z.object({
      name: z.string(),
      kind: z.enum(CARD_KINDS),
      rarity: z.enum(RARITIES),
      factionId: z.string(),
      characterId: z.string(),
      description: z.string(),
      lore: z.string(),
      artPrompt: z.string(),
      episodeNumber: z.number(),
    }),
  ),
});

export const publishingSchema = z.object({
  teaser: z.string(),
  launchCopy: z.string(),
  featuredCardNames: z.array(z.string()),
  schedule: z.array(z.object({ episodeNumber: z.number(), dayOffset: z.number() })),
  campaign: z.array(z.string()),
});

export const reviewSchema = z.object({
  passed: z.boolean(),
  issues: z.array(z.object({ severity: z.enum(["error", "warning", "info"]), agent: z.string(), message: z.string() })),
  stats: z.record(z.string(), z.number()),
});

export const analyticsPlanSchema = z.object({
  kpis: z.array(z.object({ name: z.string(), target: z.string(), why: z.string() })),
  events: z.array(z.string()),
});

export type Concept = z.infer<typeof conceptSchema>;
export type World = z.infer<typeof worldSchema>;
export type Characters = z.infer<typeof charactersSchema>;
export type Visual = z.infer<typeof visualSchema>;
export type Story = z.infer<typeof storySchema>;
export type Cards = z.infer<typeof cardsSchema>;
export type Publishing = z.infer<typeof publishingSchema>;
export type Review = z.infer<typeof reviewSchema>;
export type AnalyticsPlan = z.infer<typeof analyticsPlanSchema>;
