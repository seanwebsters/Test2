/**
 * Canonical content model for NEXARA universes. Seeded universes are authored
 * as `UniverseSource` (compact, hand-written) and expanded into `Universe`
 * by `build.ts`. Studio-created universes are stored as full `Universe`
 * records in the database.
 */

export const RARITIES = ["common", "uncommon", "rare", "epic", "legendary", "mythic"] as const;
export type Rarity = (typeof RARITIES)[number];

export const VARIANTS = ["standard", "holographic", "full-art", "alt-art", "first-edition", "animated", "secret"] as const;
export type Variant = (typeof VARIANTS)[number];

export const CARD_KINDS = ["character", "creature", "location", "object", "event", "artifact", "moment", "secret"] as const;
export type CardKind = (typeof CARD_KINDS)[number];

export const GENRES = [
  { id: "fantasy", label: "Fantasy" },
  { id: "sci-fi", label: "Science Fiction" },
  { id: "horror", label: "Horror" },
  { id: "romance", label: "Romance" },
  { id: "mystery", label: "Mystery" },
  { id: "cosy", label: "Cute & Cosy" },
  { id: "adventure", label: "Adventure" },
  { id: "comedy", label: "Comedy" },
  { id: "surreal", label: "Surreal" },
  { id: "anime", label: "Anime-Inspired" },
  { id: "creatures", label: "Creatures" },
  { id: "drama", label: "Contemporary Drama" },
] as const;
export type GenreId = (typeof GENRES)[number]["id"];

/** Procedural art styles. Each universe has its own visual language. */
export const ART_STYLES = [
  "dusk",
  "macro",
  "grid",
  "deco",
  "pop",
  "abyss",
  "road",
  "static",
  "botanical",
  "lantern",
  "orbit",
  "portrait",
] as const;
export type ArtStyle = (typeof ART_STYLES)[number];

/** Display typefaces loaded by the app; each universe picks one. */
export const DISPLAY_FONTS = [
  "fraunces",
  "fredoka",
  "chakra",
  "limelight",
  "bungee",
  "syne",
  "abril",
  "vt323",
  "cormorant",
  "yeseva",
  "righteous",
  "playfair",
] as const;
export type DisplayFont = (typeof DISPLAY_FONTS)[number];

export interface Palette {
  /** Deepest background */
  bg: string;
  /** Raised surfaces */
  surface: string;
  /** Primary accent */
  accent: string;
  /** Secondary accent */
  accent2: string;
  /** Text on the universe background */
  ink: string;
  /** Up to four extra art colours */
  art: string[];
}

export interface Faction {
  id: string;
  name: string;
  motto: string;
  description: string;
  color: string;
}

export interface Relationship {
  to: string;
  type: "ally" | "rival" | "family" | "romance" | "mentor" | "enemy" | "mystery";
  note: string;
}

export interface Character {
  id: string;
  name: string;
  role: "lead" | "supporting" | "antagonist" | "mystery";
  title: string;
  factionId: string;
  bio: string;
  personality: string;
  motivation: string;
  visual: string;
  arc: string;
  relationships: Relationship[];
}

export interface Location {
  id: string;
  name: string;
  description: string;
}

export interface WorldBible {
  history: string;
  geography: string;
  rules: string[];
  culture: string;
  mythology: string;
  conflicts: string[];
  locations: Location[];
  secrets: string[];
}

export interface StyleGuide {
  artStyle: ArtStyle;
  displayFont: DisplayFont;
  palette: Palette;
  lighting: string;
  characterRules: string;
  frameStyle: string;
  logoDirection: string;
  keyArtPrompt: string;
}

export type EpisodeAccess =
  | { type: "free" }
  | { type: "collect"; cards: number }
  | { type: "shards"; cost: number }
  | { type: "pass" };

export interface Episode {
  id: string;
  universeId: string;
  season: number;
  number: number;
  title: string;
  synopsis: string;
  minutes: number;
  /** Paragraphs. Empty for scheduled-but-unwritten episodes. */
  body: string[];
  characterIds: string[];
  /** Cards this episode introduces into the collectible pool. */
  cardIds: string[];
  access: EpisodeAccess;
  /** Days after the platform seed when this episode releases (negative = past). */
  releaseOffsetDays: number;
  cliffhanger?: string;
}

export interface Season {
  number: number;
  title: string;
  synopsis: string;
  releaseOffsetDays: number;
  plannedEpisodes: number;
}

export interface Card {
  id: string;
  universeId: string;
  setId: string;
  season: number;
  number: number;
  name: string;
  kind: CardKind;
  rarity: Rarity;
  factionId?: string;
  characterId?: string;
  episodeId?: string;
  description: string;
  lore: string;
  artPrompt: string;
  /** Deterministic seed for the procedural artwork. */
  artSeed: number;
  releaseOffsetDays: number;
  /** Optional uploaded artwork URL (Studio). */
  imageUrl?: string;
}

export interface CardSet {
  id: string;
  universeId: string;
  season: number;
  name: string;
  code: string;
  description: string;
}

export type ExtraRequirement =
  | { type: "own-card"; cardId: string }
  | { type: "own-count"; count: number }
  | { type: "faction-complete"; factionId: string };

export interface Extra {
  id: string;
  universeId: string;
  kind: "diary" | "perspective" | "secret-lore" | "behind-the-scenes" | "side-story" | "history";
  title: string;
  body: string[];
  requirement: ExtraRequirement;
}

export interface DemoMetrics {
  followers: number;
  collectors: number;
  packsOpened: number;
  /** Week-over-week growth, e.g. 0.18 = +18% */
  growth: number;
  rating: number;
}

export interface Universe {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  premise: string;
  synopsis: string;
  genres: GenreId[];
  audience: string;
  differentiation: string;
  style: StyleGuide;
  world: WorldBible;
  factions: Faction[];
  characters: Character[];
  seasons: Season[];
  episodes: Episode[];
  sets: CardSet[];
  cards: Card[];
  extras: Extra[];
  /** Days after seed when the universe launched (negative = already live). */
  launchOffsetDays: number;
  status: "draft" | "review" | "published" | "unpublished";
  editorial: { featured?: boolean; hiddenGem?: boolean; staffPick?: boolean };
  demoMetrics: DemoMetrics;
  source: "seed" | "studio";
  createdAt?: string;
  updatedAt?: string;
}

/* ------------------------------------------------------------------ */
/* Compact authoring format used by the seed files                     */
/* ------------------------------------------------------------------ */

/** [name, kind, rarity, factionId | "", description, lore, characterId?] */
export type CardRow = [string, CardKind, Rarity, string, string, string, string?];

export interface EpisodeSource {
  title: string;
  synopsis: string;
  minutes?: number;
  body: string[];
  characterIds: string[];
  /** Card numbers (1-based within season set) introduced by this episode */
  cards: number[];
  access?: EpisodeAccess;
  releaseOffsetDays: number;
  cliffhanger?: string;
}

export interface UniverseSource {
  slug: string;
  title: string;
  tagline: string;
  premise: string;
  synopsis: string;
  genres: GenreId[];
  audience: string;
  differentiation: string;
  style: StyleGuide;
  world: WorldBible;
  factions: Faction[];
  characters: Character[];
  seasons: Season[];
  setName: string;
  setCode: string;
  cards: CardRow[];
  episodes: EpisodeSource[];
  extras: Omit<Extra, "universeId" | "id">[];
  launchOffsetDays: number;
  editorial?: Universe["editorial"];
  demoMetrics: DemoMetrics;
  /** Season-two teaser cards announced but not yet released. */
  upcoming?: { name: string; kind: CardKind; rarity: Rarity; description: string; releaseOffsetDays: number }[];
}
