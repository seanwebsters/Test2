import type { EconomyConfig, OddsTable } from "./config";

export type PackTypeId = "starter" | "daily" | "pass-daily" | "standard" | "premium" | "episode";
export type SlotKind = "standard" | "rarePlus";

export type PackCost =
  | { type: "starter" }
  | { type: "daily" }
  | { type: "pass-daily" }
  | { type: "shards"; amount: number; tokenAlternative?: boolean }
  | { type: "episode" };

export interface PackType {
  id: PackTypeId;
  name: string;
  tagline: string;
  description: string;
  slots: SlotKind[];
  cost: PackCost;
  /** Proposed real-money price for the future commercial model. NOT charged. */
  proposedPrice?: string;
  /** Visible in the shop */
  listed: boolean;
}

export const PACK_TYPES: Record<PackTypeId, PackType> = {
  starter: {
    id: "starter",
    name: "Starter Pack",
    tagline: "Your first five cards. On us.",
    description: "Five cards from the universe of your choice, with a guaranteed Rare or higher in the final slot. One per collector.",
    slots: ["standard", "standard", "standard", "standard", "rarePlus"],
    cost: { type: "starter" },
    listed: true,
  },
  daily: {
    id: "daily",
    name: "Daily Drop",
    tagline: "Free, every day.",
    description: "Five cards from any live universe. Resets at 00:00 UTC.",
    slots: ["standard", "standard", "standard", "standard", "standard"],
    cost: { type: "daily" },
    listed: true,
  },
  "pass-daily": {
    id: "pass-daily",
    name: "Collector Pass Bonus",
    tagline: "A second daily pack for pass holders.",
    description: "Three cards, once per day, while your (demo) Collector Pass is active.",
    slots: ["standard", "standard", "standard"],
    cost: { type: "pass-daily" },
    listed: true,
  },
  standard: {
    id: "standard",
    name: "Standard Pack",
    tagline: "Five random cards.",
    description: "Five cards from one universe at standard odds.",
    slots: ["standard", "standard", "standard", "standard", "standard"],
    cost: { type: "shards", amount: 100 },
    proposedPrice: "£0.99",
    listed: true,
  },
  premium: {
    id: "premium",
    name: "Premium Pack",
    tagline: "Eight cards. Rare or better guaranteed.",
    description: "Eight cards from one universe; the final slot is guaranteed Rare or higher.",
    slots: ["standard", "standard", "standard", "standard", "standard", "standard", "standard", "rarePlus"],
    cost: { type: "shards", amount: 300, tokenAlternative: true },
    proposedPrice: "£2.99",
    listed: true,
  },
  episode: {
    id: "episode",
    name: "Episode Pack",
    tagline: "Cards from the chapter you just read.",
    description: "Five cards drawn only from the cards an episode introduces. Free once for every episode you finish; 60 Shards afterwards.",
    slots: ["standard", "standard", "standard", "standard", "standard"],
    cost: { type: "episode" },
    listed: false,
  },
};

export const EPISODE_PACK_REPEAT_COST = 60;

export function slotTable(slot: SlotKind, config: EconomyConfig): OddsTable {
  return slot === "rarePlus" ? config.rarePlusSlot : config.standardSlot;
}
