import { z } from "zod";
import { hex, PARTICLES, SCALES } from "../engine/schemas";

/** Typed hand-offs between agents. Every model response is validated against one of these. */

export const ideationSchema = z.object({
  title: z.string().min(2).max(60),
  logline: z.string().max(200),
  concept: z.string().max(1200).describe("The game in three to five sentences"),
  emotionalGoal: z.string().max(300).describe("How the player should feel, and why that is beneficial"),
  playerObjective: z.string().max(300),
  interactionModel: z.string().max(400).describe("What the player physically does, moment to moment"),
  archetype: z.enum(["tile-path", "garden", "constellation", "freeform"]),
  archetypeRationale: z.string().max(400),
  setting: z.string().max(400),
  visualDirection: z.string().max(600),
  variations: z.array(z.string().max(240)).min(2).max(4).describe("Alternative creative directions worth exploring later"),
  adultSuitability: z.string().max(300).describe("Why this suits adults aged 30–55 rather than children"),
});
export type IdeationOutput = z.infer<typeof ideationSchema>;

export const designSchema = z.object({
  coreLoop: z.string().max(500),
  rules: z.array(z.string().max(240)).min(2).max(10),
  controls: z.object({ pointer: z.string().max(200), touch: z.string().max(200), keyboard: z.string().max(200) }),
  progression: z
    .array(z.object({ level: z.string().max(60), focus: z.string().max(240), difficulty: z.number().int().min(1).max(5) }))
    .min(1)
    .max(8),
  winCondition: z.string().max(300),
  feedback: z.array(z.string().max(200)).min(2).max(8),
  rewards: z.array(z.string().max(200)).min(1).max(6),
  stressSafeguards: z.array(z.string().max(200)).min(2).max(6).describe("How the design avoids pressure, punishment and frustration"),
  sessionLengthSeconds: z.number().int().min(30).max(1800),
  levelDesignNotes: z.string().max(1200).describe("Concrete layout guidance for the developer: grid sizes, path lengths, star counts, garden goals"),
});
export type DesignOutput = z.infer<typeof designSchema>;

export const svgAssetSchema = z.object({
  name: z.string().max(40),
  purpose: z.string().max(160),
  svg: z.string().max(6000).describe("A complete, self-contained <svg> element with a viewBox, no scripts, no external references"),
});

export const artSchema = z.object({
  paletteName: z.string().max(40),
  palette: z.object({
    sky: z.array(hex).min(2).max(4),
    ground: hex,
    surface: hex,
    accent: hex,
    accentSoft: hex,
    ink: hex,
    glow: hex,
  }),
  environment: z.string().max(600),
  visualElements: z.array(z.string().max(200)).min(2).max(8),
  particles: z.enum(PARTICLES),
  particleDensity: z.number().min(0).max(1),
  motionTempo: z.number().min(0.5).max(1.5),
  transitions: z.array(z.string().max(200)).min(1).max(5),
  sound: z.object({ scale: z.enum(SCALES), root: z.number().min(110).max(523), mood: z.string().max(200) }),
  typographyNote: z.string().max(200),
  accessibilityNotes: z.array(z.string().max(200)).min(1).max(5),
  assets: z.array(svgAssetSchema).min(1).max(3).describe("Procedural SVG motifs; the first is used as the game's emblem"),
});
export type ArtOutput = z.infer<typeof artSchema>;

export const freeformSchema = z.object({
  title: z.string().max(60),
  engine: z.enum(["canvas", "phaser"]),
  html: z.string().max(60000).describe("A complete HTML document with inline <style> and <script>. Phaser 3 is preloaded as window.Phaser when engine is 'phaser'."),
  controls: z.string().max(300),
});
export type FreeformOutput = z.infer<typeof freeformSchema>;

export const reviewSchema = z.object({
  qualityScore: z.number().int().min(1).max(10),
  summary: z.string().max(600),
  strengths: z.array(z.string().max(240)).min(1).max(6),
  risks: z.array(z.string().max(240)).max(6),
  recommendations: z
    .array(
      z.object({
        title: z.string().max(80),
        detail: z.string().max(400),
        basis: z.enum(["observed", "hypothesis"]).describe("observed only when it rests on the play-session data supplied; otherwise hypothesis"),
      }),
    )
    .min(1)
    .max(6),
  nextConcepts: z.array(z.string().max(240)).max(3),
});
export type ReviewOutput = z.infer<typeof reviewSchema>;

export const labConceptSchema = z.object({
  name: z.string().max(60),
  description: z.string().max(500),
  mechanic: z.string().max(400),
  emotionalGoal: z.string().max(300),
  visualDirection: z.string().max(400),
  archetype: z.enum(["tile-path", "garden", "constellation", "freeform"]),
  category: z.enum(["Puzzle", "Gardening", "Breathing", "Colouring", "Exploration", "Sound", "Memory", "Creativity"]),
});
export const labIdeasSchema = z.object({ concepts: z.array(labConceptSchema).min(3).max(8) });

export const labAssessmentSchema = z.object({
  assessments: z
    .array(
      z.object({
        name: z.string(),
        complexity: z.enum(["Low", "Medium", "High"]),
        feasibility: z.enum(["Ready now", "Needs freeform mode", "Needs new archetype"]),
        feasibilityNote: z.string().max(300),
        hook: z.string().max(200).describe("The single most compelling thing about it"),
      }),
    )
    .min(3)
    .max(8),
});
export type LabConcept = z.infer<typeof labConceptSchema> & Partial<z.infer<typeof labAssessmentSchema>["assessments"][number]>;
