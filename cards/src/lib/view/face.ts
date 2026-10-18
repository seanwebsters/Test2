import type { Card, Universe, Variant } from "@/lib/content/types";

/** Everything needed to render a card, serialisable for client components. */
export interface CardFace {
  id: string;
  name: string;
  number: number;
  setCode: string;
  setSize: number;
  season: number;
  kind: Card["kind"];
  rarity: Card["rarity"];
  description: string;
  artSeed: number;
  imageUrl?: string;
  factionName?: string;
  factionColor?: string;
  universe: {
    id: string;
    slug: string;
    title: string;
    style: Universe["style"]["artStyle"];
    font: Universe["style"]["displayFont"];
    palette: Universe["style"]["palette"];
  };
}

export function faceFor(card: Card, u: Universe): CardFace {
  const set = u.sets.find((s) => s.id === card.setId);
  const faction = u.factions.find((f) => f.id === card.factionId);
  return {
    id: card.id,
    name: card.name,
    number: card.number,
    setCode: set?.code ?? u.slug.slice(0, 3).toUpperCase(),
    setSize: u.cards.filter((c) => c.setId === card.setId).length,
    season: card.season,
    kind: card.kind,
    rarity: card.rarity,
    description: card.description,
    artSeed: card.artSeed,
    imageUrl: card.imageUrl,
    factionName: faction?.name,
    factionColor: faction?.color,
    universe: { id: u.id, slug: u.slug, title: u.title, style: u.style.artStyle, font: u.style.displayFont, palette: u.style.palette },
  };
}

export type { Variant };
