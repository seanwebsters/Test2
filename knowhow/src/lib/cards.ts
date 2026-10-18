import type { Art, Rarity, Series } from "./types";
import { CATEGORY_BY_ID, TOPIC_BY_ID } from "@/content/categories";
import { MILESTONE_CARDS } from "./gamification";

export interface CardView {
  key: string;
  title: string;
  how: string;
  fact: string;
  topic: string;
  rarity: Rarity;
  art: Art;
  href?: string;
}

/** Display data for a knowledge card key. Safe on client and server. */
export function cardView(key: string, rarity: Rarity, seriesBySlug: Record<string, Series>): CardView | null {
  if (key.startsWith("series:")) {
    const s = seriesBySlug[key.slice(7)];
    if (!s) return null;
    const topic = TOPIC_BY_ID[s.topics[0]]?.label ?? CATEGORY_BY_ID[s.category].label;
    return { key, title: topic, how: `Completed every released episode of ${s.title}.`, fact: s.cardFact, topic: CATEGORY_BY_ID[s.category].label, rarity, art: s.art, href: `/series/${s.slug}` };
  }
  if (key.startsWith("category:")) {
    const c = CATEGORY_BY_ID[key.slice(9) as keyof typeof CATEGORY_BY_ID];
    if (!c) return null;
    return { key, title: `${c.label} Explorer`, how: `Finished your first ${c.label.toLowerCase()} episode.`, fact: c.blurb, topic: c.label, rarity, art: { motif: "glyph", glyph: c.glyph, palette: [c.deep, c.color, c.color2, c.color] }, href: `/c/${c.id}` };
  }
  const m = MILESTONE_CARDS[key];
  if (!m) return null;
  return { key, title: m.title, how: m.how, fact: m.fact, topic: "Milestone", rarity, art: { motif: "glyph", glyph: m.glyph, palette: ["#111114", "#DFFF57", "#B6A1FF", "#F7F4E9"] } };
}
