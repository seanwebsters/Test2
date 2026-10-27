import { z } from "zod";

/**
 * Schemas for everything the game runtime can execute. AI agents write these
 * configurations; nothing outside these shapes reaches the runtime.
 */

export const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "a #rrggbb colour");

export const ARCHETYPES = ["tile-path", "garden", "constellation"] as const;
export const archetypeSchema = z.enum(ARCHETYPES);
export type Archetype = z.infer<typeof archetypeSchema>;

export const PARTICLES = ["fireflies", "petals", "dust", "snow", "stars", "mist", "none"] as const;
export const SCALES = ["pentatonic", "lydian", "dorian", "mixolydian"] as const;

export const themeSchema = z.object({
  sky: z.array(hex).min(2).max(4).describe("Background gradient stops, top to bottom"),
  ground: hex.describe("Main surface colour for the play area"),
  surface: hex.describe("Colour of tiles, plots or panels"),
  accent: hex.describe("Primary highlight: lit paths, blooms, connected lines"),
  accentSoft: hex.describe("Secondary, quieter highlight"),
  ink: hex.describe("Text colour; must read clearly over the sky"),
  glow: hex.describe("Soft light colour used for halos and particles"),
  particles: z.enum(PARTICLES),
  particleDensity: z.number().min(0).max(1),
  motionTempo: z.number().min(0.5).max(1.5).describe("1 = default; below 1 is slower and more languid"),
  soundScale: z.enum(SCALES),
  soundRoot: z.number().min(110).max(523).describe("Root frequency in Hz for interaction tones"),
});
export type Theme = z.infer<typeof themeSchema>;

const copy = {
  title: z.string().min(2).max(60),
  subtitle: z.string().max(120),
  intro: z.string().max(400).describe("One or two calm sentences that explain how to play"),
  completion: z.string().max(400).describe("Closing message shown when every level is finished"),
};

/**
 * Fixed-length pairs. Structured outputs don't accept JSON Schema tuples
 * (prefixItems), so pairs are arrays of exactly two items.
 */
const pair = <T extends z.ZodType>(item: T) => z.array(item).min(2).max(2);

// ── Tile path ────────────────────────────────────────────────────────────
export const cell = pair(z.number().int());

export const tileLevelSchema = z.object({
  name: z.string().max(60),
  cols: z.number().int().min(3).max(8),
  rows: z.number().int().min(3).max(8),
  path: z
    .array(cell)
    .min(4)
    .max(48)
    .describe("Solution path as [col,row] cells from the source (first) to the destination (last); each step moves to an orthogonal neighbour; no cell repeats"),
  decoyDensity: z.number().min(0).max(1).describe("Share of empty cells that receive a rotatable decoy tile"),
  note: z.string().max(160).describe("A short line shown when the level opens"),
});
export type TileLevel = z.infer<typeof tileLevelSchema>;

export const tileConfigSchema = z.object({
  archetype: z.literal("tile-path"),
  ...copy,
  flowLabel: z.string().max(30).describe("What travels along the path, e.g. 'sunlight' or 'water'"),
  sourceLabel: z.string().max(30),
  targetLabel: z.string().max(30),
  breathPacer: z.boolean().describe("Show a slow breathing guide that the flow pulses with"),
  levels: z.array(tileLevelSchema).min(1).max(8),
  theme: themeSchema,
});
export type TileConfig = z.infer<typeof tileConfigSchema>;

// ── Garden ───────────────────────────────────────────────────────────────
export const PLANT_FORMS = ["flower", "shrub", "grass", "tree", "lotus", "succulent"] as const;

export const speciesSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]{0,23}$/),
  name: z.string().max(30),
  form: z.enum(PLANT_FORMS),
  leaf: hex,
  bloom: hex,
});
export type Species = z.infer<typeof speciesSchema>;

export const gardenLevelSchema = z.object({
  name: z.string().max(60),
  layout: z
    .array(z.string())
    .min(3)
    .max(9)
    .describe("Rows of equal length (3-9). '.' soil, '~' spring water, '#' stone"),
  species: z.array(speciesSchema).min(2).max(5),
  companions: z.array(pair(z.string())).max(8).describe("Species id pairs that flourish side by side"),
  goalBlooms: z.number().int().min(2).max(24),
  goalHarmonies: z.number().int().min(0).max(8).describe("Adjacent blooming companion pairs needed"),
  channelBudget: z.number().int().min(0).max(12).describe("How many water channels the player may dig"),
  growthStages: z.number().int().min(3).max(5),
  note: z.string().max(160),
});
export type GardenLevel = z.infer<typeof gardenLevelSchema>;

export const gardenConfigSchema = z.object({
  archetype: z.literal("garden"),
  ...copy,
  levels: z.array(gardenLevelSchema).min(1).max(6),
  theme: themeSchema,
});
export type GardenConfig = z.infer<typeof gardenConfigSchema>;

// ── Constellation ────────────────────────────────────────────────────────
export const starSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,16}$/),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  mag: z.number().int().min(1).max(3).describe("1 brightest, 3 faintest"),
});
export type Star = z.infer<typeof starSchema>;

export const constellationLevelSchema = z.object({
  name: z.string().max(60),
  story: z.string().max(320).describe("Revealed when the constellation is complete"),
  stars: z.array(starSchema).min(4).max(24),
  edges: z.array(pair(z.string())).min(3).max(30),
  hint: z.enum(["degree", "ghost", "both"]).describe("degree: each star shows how many lines it needs; ghost: faint guide lines"),
  note: z.string().max(160),
});
export type ConstellationLevel = z.infer<typeof constellationLevelSchema>;

export const constellationConfigSchema = z.object({
  archetype: z.literal("constellation"),
  ...copy,
  levels: z.array(constellationLevelSchema).min(1).max(8),
  theme: themeSchema,
});
export type ConstellationConfig = z.infer<typeof constellationConfigSchema>;

export const gameConfigSchema = z.discriminatedUnion("archetype", [tileConfigSchema, gardenConfigSchema, constellationConfigSchema]);
export type GameConfig = z.infer<typeof gameConfigSchema>;

export const configSchemaFor = {
  "tile-path": tileConfigSchema,
  garden: gardenConfigSchema,
  constellation: constellationConfigSchema,
} as const;

// ── Builds ───────────────────────────────────────────────────────────────
/** What a version can be played from: a template config, or experimental freeform code. */
export const buildSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("template"), config: gameConfigSchema }),
  z.object({
    mode: z.literal("freeform"),
    title: z.string(),
    engine: z.enum(["canvas", "phaser"]),
    html: z.string().max(200_000),
  }),
]);
export type GameBuild = z.infer<typeof buildSchema>;
