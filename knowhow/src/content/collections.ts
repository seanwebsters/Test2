import type { CollectionRecord } from "@/lib/model";

const ed = (id: string, title: string, description: string, seriesSlugs: string[], palette: [string, string], followers: number): CollectionRecord => ({
  id, ownerId: "editorial", ownerHandle: "knowhow", ownerName: "KNOWHOW Editors", title, description, seriesSlugs,
  isPublic: true, editorial: true, followers, createdAt: "2026-09-01T09:00:00.000Z", updatedAt: "2026-10-01T09:00:00.000Z", palette,
});

/** Editorial collections curated by the KNOWHOW team. Follower counts start at zero-ish seeds and grow with real follows. */
export const EDITORIAL_COLLECTIONS: CollectionRecord[] = [
  ed("wish-i-knew-at-18", "Things I wish I knew at 18", "Money, minds and the stuff school skipped.", ["the-money-game", "why-humans-do-that", "art-of-negotiation", "investing-without-jargon", "stoic-mode"], ["#DFFF57", "#111114"], 0),
  ed("financially-literate", "Become financially literate", "From 'what is money' to index funds, in order.", ["the-money-game", "investing-without-jargon", "how-the-rich-got-rich", "economics-of-everything", "too-good-to-be-true"], ["#7CF2A6", "#0B2E1F"], 0),
  ed("understand-the-universe", "Understand the universe", "Black holes, the Sun, and how small we really are.", ["universe-explained", "what-nobody-tells-you-about-space", "invisible-machines", "rabbit-holes"], ["#8EA4FF", "#0A0E2E"], 0),
  ed("dinner-parties", "Interesting things for dinner parties", "Guaranteed 'wait, really?' moments.", ["rabbit-holes", "the-making-of", "history-of-everything", "human-body-is-weird", "greatest-heists"], ["#FF92C7", "#3B0D27"], 0),
  ed("business-school", "Business school without business school", "Cult brands, wild founders and famous failures.", ["startup-stories", "how-brands-become-cults", "why-businesses-fail", "art-of-negotiation", "science-of-influence"], ["#587BFF", "#0E1640"], 0),
];
