import { catalog, isLive, releasedCards } from "@/lib/catalog";
import type { DbState } from "@/lib/db/types";
import { credit, inventoryOf, iso, notify } from "./core";

export interface AchievementDef {
  key: string;
  title: string;
  description: string;
  reward: number;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { key: "first-pack", title: "First Light", description: "Open your first pack.", reward: 25 },
  { key: "first-rare", title: "Something Shiny", description: "Pull a Rare or better.", reward: 25 },
  { key: "first-epic", title: "Epic Taste", description: "Pull an Epic card.", reward: 50 },
  { key: "first-legendary", title: "Living Legend", description: "Pull a Legendary card.", reward: 100 },
  { key: "first-mythic", title: "Unforgettable", description: "Pull a Mythic card.", reward: 250 },
  { key: "packs-10", title: "Pack Rat", description: "Open 10 packs.", reward: 75 },
  { key: "unique-50", title: "Curator", description: "Own 50 different cards.", reward: 150 },
  { key: "universes-5", title: "Multiverse Tourist", description: "Own cards from 5 universes.", reward: 100 },
  { key: "story-5", title: "Binge Reader", description: "Finish 5 episodes.", reward: 75 },
  { key: "follow-3", title: "Superfan", description: "Follow 3 universes.", reward: 25 },
];

export const SET_COMPLETION_REWARD = 500;

function grant(draft: DbState, userId: string, key: string, title: string, body: string, reward: number, at: number, href?: string) {
  if (draft.achievements.some((a) => a.userId === userId && a.key === key)) return false;
  draft.achievements.push({ userId, key, at: iso(at) });
  if (reward) credit(draft, userId, "shards", reward, `achievement:${key}`, at);
  notify(draft, { userId, kind: key.startsWith("complete:") ? "completion" : "achievement", title, body: `${body}${reward ? ` +${reward} Shards.` : ""}`, href, key: `ach:${key}` }, at);
  return true;
}

/** Idempotent: grants any achievements the collector now qualifies for. */
export function evaluateAchievements(draft: DbState, userId: string, at: number) {
  const inv = inventoryOf(draft, userId);
  const idx = catalog(draft);
  const owned = Object.keys(inv);
  const openings = draft.openings.filter((o) => o.userId === userId);
  const rarities = new Set(openings.flatMap((o) => o.items.map((i) => i.rarity)));
  const def = (k: string) => ACHIEVEMENTS.find((a) => a.key === k)!;
  const check = (k: string, cond: boolean) => cond && grant(draft, userId, k, def(k).title, def(k).description, def(k).reward, at, "/profile");

  check("first-pack", openings.length >= 1);
  check("first-rare", ["rare", "epic", "legendary", "mythic"].some((r) => rarities.has(r as never)));
  check("first-epic", rarities.has("epic"));
  check("first-legendary", rarities.has("legendary"));
  check("first-mythic", rarities.has("mythic"));
  check("packs-10", openings.length >= 10);
  check("unique-50", owned.length >= 50);
  check("universes-5", new Set(owned.map((c) => idx.cards.get(c)?.universeId).filter(Boolean)).size >= 5);
  check("story-5", draft.storyProgress.filter((p) => p.userId === userId && p.completedAt).length >= 5);
  check("follow-3", draft.follows.filter((f) => f.userId === userId).length >= 3);

  // Set completion: every released Season 1 card of a live universe.
  const touched = new Set(owned.map((c) => idx.cards.get(c)?.universeId).filter(Boolean) as string[]);
  for (const uid of touched) {
    const u = idx.byId.get(uid);
    if (!u || !isLive(idx, u, at)) continue;
    const set = releasedCards(idx, u, at).filter((c) => c.season === 1);
    if (set.length && set.every((c) => inv[c.id])) {
      grant(draft, userId, `complete:${u.id}:s1`, `${u.title} complete`, `You collected every card in ${u.sets[0]?.name ?? "Season 1"}.`, SET_COMPLETION_REWARD, at, `/collection/${u.slug}`);
    }
  }
}
