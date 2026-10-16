import { z } from "zod";

/**
 * Typed handoffs between agents. Every agent call that returns structured
 * data is validated against one of these (and the JSON Schema sent to the
 * model is generated from the same definition). Fields are required; use
 * null for "not applicable" – structured outputs require every key.
 */

const Issue = z.object({
  severity: z.enum(["major", "minor"]),
  scene_index: z.number().int().nullable().describe("Scene number the issue is in, or null if it is about the whole piece"),
  quote: z.string().describe("Exact quoted evidence from the text under review (empty string only if the issue is an absence)"),
  problem: z.string().describe("What is wrong and why a listener would notice"),
  suggestion: z.string().describe("A concrete fix – ideally replacement wording or a precise instruction"),
});
export type Issue = z.infer<typeof Issue>;

export const ReviewSchema = z.object({
  verdict: z.enum(["approve", "revise"]),
  summary: z.string().describe("Two or three sentences: the overall editorial judgement"),
  strengths: z.array(z.string()).describe("What genuinely works, specifically"),
  issues: z.array(Issue),
});
export type Review = z.infer<typeof ReviewSchema>;

/* ---------------- Series development ---------------- */

export const GenreResearchSchema = z.object({
  conventions: z.array(z.string()),
  audience_expectations: z.array(z.string()),
  tired_tropes_to_avoid: z.array(z.string()),
  opportunities: z.array(z.string()).describe("Ways this series could feel fresh and premium"),
  catalogue_gaps: z.array(z.string()).describe("What the studio's existing catalogue lacks, from the catalogue data provided"),
  originality_guardrails: z.array(z.string()).describe("Existing works or elements to stay clearly distinct from, described generically"),
  sources: z.array(z.object({ title: z.string(), url: z.string() })),
});

const Concept = z.object({
  title: z.string(),
  logline: z.string(),
  premise: z.string(),
  setting_hook: z.string(),
  leads: z.string().describe("The two romantic leads in a sentence each"),
  central_tension: z.string(),
  romance_shape: z.string().describe("How the slow burn progresses across a season"),
  emotional_promise: z.string(),
  sleep_suitability: z.string().describe("Why it is soothing to fall asleep to"),
  originality: z.string().describe("What makes it distinct from familiar works in the genre"),
});
export const ConceptsSchema = z.object({ concepts: z.array(Concept).describe("Exactly three distinct concepts") });
export type Concepts = z.infer<typeof ConceptsSchema>;

export const ConceptCritiqueSchema = z.object({
  evaluations: z.array(
    z.object({
      concept_index: z.number().int().describe("1-based"),
      strengths: z.array(z.string()),
      weaknesses: z.array(z.object({ problem: z.string(), evidence: z.string(), suggestion: z.string() })),
      originality_risks: z.array(z.string()),
      sleep_fit: z.string(),
    }),
  ),
  recommended_index: z.number().int().describe("1-based index of the strongest concept"),
  rationale: z.string(),
  improvements_for_recommended: z.array(z.string()),
});
export type ConceptCritique = z.infer<typeof ConceptCritiqueSchema>;

export const SeriesIdentitySchema = z.object({
  title: z.string(),
  tagline: z.string(),
  logline: z.string(),
  premise: z.string(),
  genre: z.enum(["Sleep Romantasy", "Magical Worlds", "Coastal Romance", "Cosy Mystery", "Gentle Adventure", "Nature & Journeys", "Sci-Fi & Space"]),
  tone: z.string(),
  themes: z.array(z.string()),
  narrative_voice: z.string(),
  point_of_view: z.string(),
  tense: z.string(),
  style_rules: z.array(z.string()),
  sensory_palette: z.array(z.string()),
  romance_heat: z.string(),
  content_boundaries: z.array(z.string()),
  episode_shape: z.string(),
  target_minutes: z.number().int(),
});
export type SeriesIdentity = z.infer<typeof SeriesIdentitySchema>;

export const WorldSchema = z.object({
  name: z.string(),
  overview: z.string(),
  geography: z.array(z.object({ name: z.string(), description: z.string() })),
  cultures: z.array(z.object({ name: z.string(), customs: z.string(), values: z.string() })),
  magic: z.object({ principles: z.string(), costs: z.string(), limits: z.string() }),
  history: z.array(z.string()),
  atmosphere: z.string(),
  recurring_locations: z.array(z.object({ name: z.string(), description: z.string(), sensory_details: z.array(z.string()) })),
  rules: z.array(z.string()).describe("Hard world rules the writers must never break"),
});
export type World = z.infer<typeof WorldSchema>;

export const CharactersSchema = z.object({
  characters: z.array(
    z.object({
      name: z.string(),
      role: z.enum(["lead", "love_interest", "supporting"]),
      age: z.string(),
      pronouns: z.string(),
      appearance: z.string(),
      visual_description: z.string().describe("Art-ready, specific and stable: face, build, hair, skin, eyes, signature clothing, distinguishing marks"),
      personality: z.string(),
      desires: z.string(),
      fears: z.string(),
      flaws: z.string(),
      history: z.string(),
      motivations: z.string(),
      speech_style: z.string().describe("Rhythm, vocabulary, what they avoid saying"),
      arc: z.string(),
    }),
  ),
});
export type Characters = z.infer<typeof CharactersSchema>;

export const RelationshipsSchema = z.object({
  relationships: z.array(
    z.object({
      a_name: z.string(),
      b_name: z.string(),
      kind: z.string(),
      dynamic: z.string(),
      chemistry: z.string().describe("Specific, character-rooted source of attraction"),
      obstacles: z.array(z.string()),
      milestones: z.array(z.object({ when: z.string(), beat: z.string() })),
      pacing: z.string(),
      current_state: z.string(),
    }),
  ),
});
export type Relationships = z.infer<typeof RelationshipsSchema>;

export const SeasonPlanSchema = z.object({
  title: z.string(),
  arc: z.string(),
  episodes: z.array(
    z.object({
      number: z.number().int(),
      title: z.string(),
      premise: z.string(),
      romance_beat: z.string(),
      character_focus: z.string(),
      threads: z.array(z.string()),
      sleep_landing: z.string().describe("Where and how the episode comes to rest"),
    }),
  ),
});
export type SeasonPlanData = z.infer<typeof SeasonPlanSchema>;

export const BibleFixesSchema = z.object({
  verdict: z.enum(["approve", "revise"]),
  summary: z.string(),
  issues: z.array(z.object({ area: z.enum(["identity", "world", "characters", "relationships", "season"]), problem: z.string(), evidence: z.string(), fix: z.string() })),
  established_facts: z.array(z.string()).describe("Canon facts to record in the bible"),
  open_threads: z.array(z.string()),
});
export type BibleFixes = z.infer<typeof BibleFixesSchema>;

/* ---------------- Episode writing ---------------- */

export const OutlineSchema = z.object({
  title: z.string(),
  summary: z.string().describe("Listener-facing, one or two sentences"),
  opening_hook: z.string(),
  emotional_core: z.string(),
  romance_progression: z.string(),
  key_developments: z.array(z.string()).describe("Everything essential – all must land in the first half"),
  threads_advanced: z.array(z.string()),
  facts_to_respect: z.array(z.string()),
  soft_landing: z.string(),
});
export type Outline = z.infer<typeof OutlineSchema>;

export const ScenePlanSchema = z.object({
  scenes: z.array(
    z.object({
      index: z.number().int().describe("1-based"),
      title: z.string(),
      location: z.string(),
      characters: z.array(z.string()),
      purpose: z.string(),
      emotional_beat: z.string(),
      intensity: z.number().describe("0 (asleep) to 1 (most engaged); must not rise after the midpoint"),
      sensory_anchors: z.array(z.string()),
      target_words: z.number().int(),
      dialogue_notes: z.string(),
    }),
  ),
});
export type ScenePlan = z.infer<typeof ScenePlanSchema>;

export const RevisionBriefSchema = z.object({
  decision: z.enum(["approve", "revise"]),
  summary: z.string(),
  scene_instructions: z.array(z.object({ scene_index: z.number().int(), instructions: z.array(z.string()) })),
  dismissed_notes: z.array(z.string()).describe("Notes deliberately not actioned, with a reason"),
});
export type RevisionBrief = z.infer<typeof RevisionBriefSchema>;

export const BibleUpdateSchema = z.object({
  new_facts: z.array(z.string()),
  events: z.array(z.string()),
  relationship_updates: z.array(z.object({ a_name: z.string(), b_name: z.string(), current_state: z.string() })),
  threads_opened: z.array(z.string()),
  threads_resolved: z.array(z.string()),
  timeline_entry: z.string(),
});
export type BibleUpdate = z.infer<typeof BibleUpdateSchema>;

/* ---------------- Art ---------------- */

export const VisualIdentitySchema = z.object({
  palette: z.array(z.object({ name: z.string(), hex: z.string(), usage: z.string() })),
  lighting: z.string(),
  mood: z.string(),
  composition_rules: z.array(z.string()),
  typography: z.object({ title_direction: z.string(), pairing: z.string(), treatment: z.string() }),
  poster_brief: z.string(),
  poster_prompts: z.array(z.string()).describe("Three distinct poster concept prompts, no text in image"),
  character_visuals: z.array(z.object({ name: z.string(), visual_description: z.string() })),
});
export type VisualIdentity = z.infer<typeof VisualIdentitySchema>;

export const ImageReviewSchema = z.object({
  evaluations: z.array(
    z.object({
      image_index: z.number().int().describe("1-based"),
      strengths: z.array(z.string()),
      issues: z.array(z.object({ issue: z.string(), suggestion: z.string() })),
      consistency: z.string().describe("Fidelity to the visual identity and character descriptions"),
      usable: z.boolean(),
    }),
  ),
  selected_index: z.number().int().describe("1-based; 0 if none are usable"),
  rationale: z.string(),
});
export type ImageReview = z.infer<typeof ImageReviewSchema>;

export const CoverPromptsSchema = z.object({
  prompts: z.array(z.string()).describe("Two or three distinct cover concepts for this episode"),
  characters_featured: z.array(z.string()),
});

/* ---------------- Audio ---------------- */

const Candidate = z.object({ voice_id: z.string(), rationale: z.string() });
export const CastingSchema = z.object({
  narrator: z.object({ direction: z.string(), candidates: z.array(Candidate).describe("Best first; two or three voices to audition") }),
  characters: z.array(z.object({ name: z.string(), direction: z.string(), candidates: z.array(Candidate).describe("Best first; one or two voices") })),
});
export type Casting = z.infer<typeof CastingSchema>;

export const PronunciationSchema = z.object({
  entries: z.array(z.object({ term: z.string(), alias: z.string().describe("Plain-English respelling the voice will read, e.g. VAY-lith → 'Vay-lith'"), notes: z.string() })),
});

export const AudioDirectionSchema = z.object({
  narrator_direction: z.string(),
  scenes: z.array(
    z.object({
      index: z.number().int(),
      quote_speakers: z.array(z.object({ quote_number: z.number().int().describe("1-based order of the quote within the scene"), speaker: z.string().describe("Character name, or 'narrator'") })),
      ambience_layers: z.array(z.object({ prompt: z.string(), level_db: z.number().describe("Relative to narration, e.g. -24") })),
      music_cue: z.object({ prompt: z.string(), level_db: z.number() }).nullable(),
      intensity: z.number(),
    }),
  ),
});
export type AudioDirection = z.infer<typeof AudioDirectionSchema>;

export const QcReportSchema = z.object({
  verdict: z.enum(["approve", "revise"]),
  summary: z.string(),
  issues: z.array(
    z.object({
      area: z.enum(["script", "narration", "sound", "art"]),
      scene_index: z.number().int().nullable(),
      problem: z.string(),
      evidence: z.string(),
      action: z.enum(["revoice_scene", "remix_scene", "regenerate_cover", "none"]),
    }),
  ),
});
export type QcReport = z.infer<typeof QcReportSchema>;
