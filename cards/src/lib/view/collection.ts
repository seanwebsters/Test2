import { catalog, isLive, releasedCards } from "@/lib/catalog";
import type { Card, Variant } from "@/lib/content/types";
import type { DbState, OwnedCard } from "@/lib/db/types";

const PREF: Variant[] = ["secret", "animated", "full-art", "holographic", "alt-art", "first-edition", "standard"];

export function bestVariant(o?: OwnedCard): Variant {
  if (!o) return "standard";
  return PREF.find((v) => (o.variants[v] ?? 0) > 0) ?? "standard";
}

export interface CollectionSummary {
  unique: number;
  copies: number;
  duplicates: number;
  universes: { id: string; slug: string; title: string; owned: number; total: number; font: string; palette: { bg: string; accent: string; ink: string; surface: string; accent2: string; art: string[] }; style: string; complete: boolean }[];
  totalAvailable: number;
}

export function collectionSummary(state: DbState, userId: string, at: number): CollectionSummary {
  const idx = catalog(state);
  const inv = state.inventory[userId] ?? {};
  const universes = idx.universes
    .filter((u) => isLive(idx, u, at))
    .map((u) => {
      const rc = releasedCards(idx, u, at);
      const owned = rc.filter((c) => inv[c.id]).length;
      return { id: u.id, slug: u.slug, title: u.title, owned, total: rc.length, font: u.style.displayFont, palette: u.style.palette, style: u.style.artStyle, complete: owned === rc.length && rc.length > 0 };
    })
    .sort((a, b) => b.owned / b.total - a.owned / a.total || a.title.localeCompare(b.title));
  const entries = Object.values(inv);
  return {
    unique: entries.length,
    copies: entries.reduce((s, o) => s + o.count, 0),
    duplicates: entries.reduce((s, o) => s + Math.max(0, o.count - 1), 0),
    universes,
    totalAvailable: universes.reduce((s, u) => s + u.total, 0),
  };
}

export function sortCards(cards: Card[]) {
  return [...cards].sort((a, b) => a.universeId.localeCompare(b.universeId) || a.season - b.season || a.number - b.number);
}
