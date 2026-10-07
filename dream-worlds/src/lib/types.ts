/**
 * Dream Worlds domain model.
 *
 * The model is split in two layers:
 *  1. The PLATFORM / RIGHTS layer (Partner, IPWorld, Character, Voice,
 *     LoreDocument, UsageRules, CrossoverPermissions). This is what a licensed
 *     IP partner configures. Demo content uses fictional partners, but real
 *     licensed IP plugs into exactly the same shapes.
 *  2. The CONSUMER layer (DreamRequest, Dream, ListeningSession, UserProfile),
 *     which is what the Dream Engine and the app produce and persist.
 *
 * All ids are stable strings so the same records can later live in
 * Postgres/Supabase tables without reshaping.
 */

/* ------------------------------------------------------------------ */
/* Shared enums                                                        */
/* ------------------------------------------------------------------ */

export type DreamTone =
  | "cozy"
  | "adventure"
  | "mystery"
  | "funny"
  | "romantic"
  | "epic"
  | "nostalgic"
  | "very-sleepy";

export type DreamLength = 20 | 40 | 60 | "all-night";

export type Sleepiness = "light" | "relaxed" | "sleepy" | "deep";

export type StoryRole = "watch" | "participate";

export type SleepStage = "awake" | "drifting" | "sleepy" | "asleep";

export type SceneKind =
  | "space"
  | "academy"
  | "sea"
  | "kingdom"
  | "blocks"
  | "stadium"
  | "train"
  | "garden";

/* ------------------------------------------------------------------ */
/* Platform / rights layer                                             */
/* ------------------------------------------------------------------ */

export type PartnerTier = "calm-original" | "studio" | "publisher" | "league" | "creator";

export interface Partner {
  id: string;
  name: string;
  tier: PartnerTier;
  /** Short descriptor shown in credits ("Licensed from …"). */
  credit: string;
  /** Contact / contract metadata lives server-side later. */
  contractRef: string;
  /** Visual identity rules partners can enforce. */
  visualGuidelines: VisualGuidelines;
  /** Default rules applied to every world/character the partner owns. */
  defaultUsageRules: UsageRules;
  /** Partner-level crossover policy. World/character rules can only narrow it. */
  crossover: CrossoverPermissions;
  active: boolean;
}

export interface VisualGuidelines {
  palette: string[];
  /** Free-text art direction passed to image generation. */
  artDirection: string;
  /** Things the image model must never render for this partner. */
  forbiddenImagery: string[];
  logoUsage: "none" | "credit-only" | "co-branded";
}

export interface UsageRules {
  /** Tones this IP may be used with. Empty = all tones. */
  allowedTones: DreamTone[];
  /** Theme keywords the Dream Engine must avoid entirely. */
  restrictedThemes: string[];
  /** Hard story restrictions, written as instructions to the model. */
  storyRestrictions: string[];
  /** Minimum age rating, e.g. "all", "12+", "16+". */
  ageRating: "all" | "12+" | "16+";
  /** Whether users may add a free-text prompt that steers this IP. */
  allowUserPrompt: boolean;
  /** Whether the user may insert themselves as a character. */
  allowParticipation: boolean;
  /** Whether generated dreams may be shared/published by creators. */
  allowCreatorPublishing: boolean;
}

export interface CrossoverPermissions {
  /** Master switch. */
  crossoverAllowed: boolean;
  /** Partner ids whose worlds/characters may appear alongside this IP. "*" = any. */
  allowedPartners: string[] | "*";
  /** World ids that explicitly may never appear alongside this IP. */
  blockedWorlds: string[];
  /** Explanation surfaced to users when a crossover is blocked. */
  note?: string;
}

export interface LoreDocument {
  id: string;
  worldId: string;
  title: string;
  /** "canon" docs are partner-approved; "guidance" is tone/voice notes. */
  kind: "canon" | "guidance" | "glossary";
  body: string;
  /** Version stamped so episodes can record which lore they were written against. */
  version: string;
}

export interface Voice {
  id: string;
  name: string;
  description: string;
  /** Placeholder for a TTS vendor voice id (ElevenLabs, etc). */
  providerVoiceId: string;
  partnerId: string;
  /** Approved for narration, character dialogue, or both. */
  approvedFor: ("narration" | "character")[];
  warmth: number; // 0..1, used to pick voices for sleepier stages
  isNew?: boolean;
}

export interface Location {
  id: string;
  name: string;
  description: string;
  /** How restful this place is; the engine prefers calmer locations late in a dream. */
  calm: number; // 0..1
}

export interface Soundscape {
  id: string;
  name: string;
  layers: string[]; // e.g. ["low hull hum", "distant whale song"]
}

export interface IPWorld {
  id: string;
  partnerId: string;
  title: string;
  tagline: string;
  description: string;
  lore: string;
  loreDocuments: string[]; // LoreDocument ids
  allowedThemes: DreamTone[];
  characterIds: string[];
  locations: Location[];
  sounds: Soundscape[];
  visualStyle: {
    scene: SceneKind;
    /** [sky top, sky mid, horizon, accent, glow] */
    palette: [string, string, string, string, string];
    mood: string;
  };
  contentRestrictions: string[];
  usageRules?: Partial<UsageRules>;
  crossover?: Partial<CrossoverPermissions>;
  genre: string;
  isNew?: boolean;
  isOriginal?: boolean;
  popularity: number;
}

export interface Character {
  id: string;
  worldId: string;
  name: string;
  title: string;
  /** Portrait art parameters (procedural for the prototype; asset URL later). */
  portrait: {
    silhouette: "captain" | "admiral" | "scholar" | "witch" | "knight" | "builder" | "player" | "keeper" | "pilot" | "royal" | "conductor" | "gardener" | "creature";
    hue: string;
    accent: string;
    assetUrl?: string;
  };
  personality: string[];
  speakingStyle: string;
  /** Example lines the model uses for few-shot voice matching. */
  sampleLines: string[];
  relationshipTraits: string[];
  loreKnowledge: string[];
  /** Kinds of interaction this character may take part in. */
  allowedInteractions: ("dialogue" | "companionship" | "mentorship" | "teamwork" | "rivalry-friendly" | "romance")[];
  voiceId: string;
  brandSafetyRules: string[];
  /** Character-level crossover narrowing (e.g. a character who must stay in-world). */
  crossoverAllowed: boolean;
  isNew?: boolean;
}

/* ------------------------------------------------------------------ */
/* Dream Engine contract                                               */
/* ------------------------------------------------------------------ */

export interface UserPreferences {
  favouriteWorlds: string[];
  favouriteCharacters: string[];
  preferredVoiceId: string;
  usualSleepTime: string; // "22:30"
  defaultLength: DreamLength;
  defaultSleepiness: Sleepiness;
  displayName: string;
}

/** Continuity snapshot carried between episodes ("Continue Tonight"). */
export interface ContinuityData {
  episode: number;
  events: string[];
  relationships: { a: string; b: string; bond: string }[];
  locationsVisited: string[];
  importantChoices: string[];
  openThreads: string[];
  /** lore document versions this episode was written against */
  loreVersions: Record<string, string>;
}

export interface StoryHistoryEntry {
  dreamId: string;
  episode: number;
  title: string;
  summary: string;
  continuity: ContinuityData;
}

export interface DreamEngineInput {
  user_id: string;
  worlds: string[];
  characters: string[];
  tone: DreamTone;
  length: DreamLength;
  sleepiness: Sleepiness;
  story_role: StoryRole;
  user_prompt: string;
  story_history: StoryHistoryEntry[];
  user_preferences: UserPreferences;
  /** For remix: same inputs, different seed. */
  seed?: number;
}

export interface DialogueLine {
  characterId: string;
  line: string;
}

export interface Chapter {
  index: number;
  title: string;
  stage: SleepStage;
  /** Minute offset (from start) where this chapter begins. */
  startMinute: number;
  durationMinutes: number;
  locationId: string;
  presentCharacterIds: string[];
  /** Narration paragraphs, delivered in order across the chapter. */
  narration: string[];
  character_dialogue: DialogueLine[];
  /** 0..1 narrative intensity; must monotonically fall in the back half. */
  intensity: number;
}

export interface SleepCurvePoint {
  minute: number;
  intensity: number; // narrative intensity 0..1
  musicLevel: number; // 0..1
  ambienceLevel: number; // 0..1
  narrationDensity: number; // words-per-minute relative 0..1
  stage: SleepStage;
}

export interface SoundscapeCue {
  minute: number;
  layer: string;
  level: number;
}

export interface DreamEngineOutput {
  dream_title: string;
  summary: string;
  hook: string;
  chapters: Chapter[];
  narration: string; // full joined narration for TTS
  character_dialogue: DialogueLine[];
  soundscape: { base: string; cues: SoundscapeCue[] };
  visual_prompts: string[];
  sleep_curve: SleepCurvePoint[];
  continuity_data: ContinuityData;
}

/* ------------------------------------------------------------------ */
/* Consumer layer                                                      */
/* ------------------------------------------------------------------ */

export interface Dream {
  id: string;
  createdAt: number;
  request: DreamEngineInput;
  output: DreamEngineOutput;
  /** Persistent series id; episodes of the same dream universe share it. */
  seriesId: string;
  episode: number;
  totalMinutes: number;
  saved: boolean;
  /** Authored by Calm or a creator rather than the user. */
  author?: { kind: "calm" | "creator"; name: string };
}

export interface ListeningSession {
  id: string;
  dreamId: string;
  startedAt: number;
  endedAt: number;
  minutesListened: number;
  stoppedAtChapter: number;
  stoppedAtStage: SleepStage;
  /** Last line the listener likely heard. */
  lastHeard: string;
}

export interface WeeklyDrop {
  week: string;
  headline: string;
  stats: { label: string; value: number }[];
  worldIds: string[];
  characterIds: string[];
  styles: { name: string; description: string }[];
  voiceIds: string[];
}

export interface Creator {
  id: string;
  name: string;
  handle: string;
  bio: string;
  followers: string;
  hue: string;
  dreamIds: string[];
}
