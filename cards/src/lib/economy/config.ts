import { z } from "zod";
import { RARITIES, VARIANTS, type Rarity, type Variant } from "@/lib/content/types";

/**
 * Odds are integer weights in basis points (1/100 of a percent) so they can
 * be audited exactly: a table must sum to 10,000.
 */
export type OddsTable = Record<Rarity, number>;
export type VariantTable = Record<Variant, number>;

export const DEFAULT_STANDARD_SLOT: OddsTable = {
  common: 5500,
  uncommon: 2500,
  rare: 1200,
  epic: 600,
  legendary: 180,
  mythic: 20,
};

/** Guaranteed "Rare or higher" slot: the standard table with Common/Uncommon removed, renormalised. */
export const DEFAULT_RARE_PLUS_SLOT: OddsTable = {
  common: 0,
  uncommon: 0,
  rare: 6000,
  epic: 3000,
  legendary: 900,
  mythic: 100,
};

/** Cosmetic variants are rolled independently of rarity. */
export const DEFAULT_VARIANTS: VariantTable = {
  standard: 8450,
  holographic: 800,
  "full-art": 300,
  "alt-art": 200,
  "first-edition": 200,
  animated: 40,
  secret: 10,
};

export const rarityTableSchema = z
  .object(Object.fromEntries(RARITIES.map((r) => [r, z.number().int().min(0).max(10000)])) as Record<Rarity, z.ZodNumber>)
  .refine((t) => Object.values(t).reduce((a, b) => a + b, 0) === 10000, "Rarity weights must sum to 10,000 basis points");

export const variantTableSchema = z
  .object(Object.fromEntries(VARIANTS.map((v) => [v, z.number().int().min(0).max(10000)])) as Record<Variant, z.ZodNumber>)
  .refine((t) => Object.values(t).reduce((a, b) => a + b, 0) === 10000, "Variant weights must sum to 10,000 basis points");

export interface EconomyConfig {
  standardSlot: OddsTable;
  rarePlusSlot: OddsTable;
  variants: VariantTable;
  /** Stardust awarded for each duplicate, by rarity. */
  duplicateDust: Record<Rarity, number>;
  /** Stardust cost to craft a specific missing card, by rarity. */
  craftCost: Record<Rarity, number>;
  /** Seven-day activity track: shards per claim index (0–6). Index 6 also grants a Premium pack. */
  dailyTrack: number[];
  episodeCompletionShards: number;
  starterShards: number;
  updatedAt: string;
  updatedBy: string;
}

export function defaultEconomyConfig(): EconomyConfig {
  return {
    standardSlot: { ...DEFAULT_STANDARD_SLOT },
    rarePlusSlot: { ...DEFAULT_RARE_PLUS_SLOT },
    variants: { ...DEFAULT_VARIANTS },
    duplicateDust: { common: 5, uncommon: 10, rare: 25, epic: 60, legendary: 150, mythic: 400 },
    craftCost: { common: 40, uncommon: 80, rare: 200, epic: 500, legendary: 1200, mythic: 3200 },
    dailyTrack: [50, 50, 75, 75, 100, 100, 150],
    episodeCompletionShards: 20,
    starterShards: 150,
    updatedAt: new Date(0).toISOString(),
    updatedBy: "system",
  };
}

export const RARITY_META: Record<Rarity, { label: string; color: string; glow: string; order: number }> = {
  common: { label: "Common", color: "#b8bcc8", glow: "rgba(184,188,200,0.35)", order: 0 },
  uncommon: { label: "Uncommon", color: "#5fd39a", glow: "rgba(95,211,154,0.45)", order: 1 },
  rare: { label: "Rare", color: "#4fa3ff", glow: "rgba(79,163,255,0.55)", order: 2 },
  epic: { label: "Epic", color: "#b06bff", glow: "rgba(176,107,255,0.6)", order: 3 },
  legendary: { label: "Legendary", color: "#ffc247", glow: "rgba(255,194,71,0.7)", order: 4 },
  mythic: { label: "Mythic", color: "#ff5fd2", glow: "rgba(255,95,210,0.8)", order: 5 },
};

export const VARIANT_META: Record<Variant, { label: string; blurb: string }> = {
  standard: { label: "Standard", blurb: "The core printing." },
  holographic: { label: "Holographic", blurb: "Prismatic foil that follows the light." },
  "full-art": { label: "Full Art", blurb: "Artwork extends to the edge of the card." },
  "alt-art": { label: "Alternate Art", blurb: "A different take on the same moment." },
  "first-edition": { label: "First Edition", blurb: "Stamped for the set's first printing." },
  animated: { label: "Animated", blurb: "The artwork moves." },
  secret: { label: "Secret Edition", blurb: "An inverted, gilded printing almost no one has seen." },
};

export const rarityRank = (r: Rarity) => RARITY_META[r].order;

export const bpToPercent = (bp: number) => `${(bp / 100).toFixed(bp % 100 === 0 ? 0 : bp % 10 === 0 ? 1 : 2)}%`;
