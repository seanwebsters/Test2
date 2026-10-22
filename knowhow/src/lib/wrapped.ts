import type { CategoryId, Series } from "./types";
import { CATEGORY_BY_ID, TOPIC_BY_ID } from "@/content/categories";

interface WrappedInput {
  progress: Record<string, { listened: number; completed: boolean }>;
  insights: { text: string }[];
  cards: { key: string; rarity: string }[];
  streak: { longest: number; current: number };
  completedSeries: string[];
  exploredCategories: CategoryId[];
  hours: number[];
}

export interface Wrapped {
  minutes: number;
  episodes: number;
  favourites: { id: CategoryId; label: string; color: string; minutes: number }[];
  topics: { label: string; count: number }[];
  longestStreak: number;
  completedSeries: { slug: string; title: string }[];
  fact: string | null;
  personality: { name: string; line: string };
}

/** Everything in Wrapped is derived from the listener's real activity. */
export function computeWrapped(u: WrappedInput, bySlug: Record<string, Series>): Wrapped {
  const epSeries = new Map<string, Series>();
  for (const s of Object.values(bySlug)) for (const e of s.episodes) epSeries.set(e.id, s);
  const catSecs = new Map<CategoryId, number>();
  const topics = new Map<string, number>();
  let total = 0;
  let episodes = 0;
  for (const [id, p] of Object.entries(u.progress)) {
    total += p.listened;
    const s = epSeries.get(id);
    if (!s) continue;
    catSecs.set(s.category, (catSecs.get(s.category) ?? 0) + p.listened);
    if (p.completed) {
      episodes++;
      for (const t of s.episodes.find((e) => e.id === id)!.topics) topics.set(t, (topics.get(t) ?? 0) + 1);
    }
  }
  for (const [id, p] of Object.entries(u.progress)) if (!epSeries.has(id) && p.completed) episodes++;
  const favourites = [...catSecs.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id, secs]) => ({ id, label: CATEGORY_BY_ID[id].label, color: CATEGORY_BY_ID[id].color, minutes: Math.round(secs / 60) }));
  const topTopics = [...topics.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t, count]) => ({ label: TOPIC_BY_ID[t]?.label ?? t, count }));

  const order = ["legendary", "epic", "rare", "uncommon", "common"];
  const rarest = [...u.cards].sort((a, b) => order.indexOf(a.rarity) - order.indexOf(b.rarity))[0];
  const fact = u.insights.at(-1)?.text ?? (rarest?.key.startsWith("series:") ? bySlug[rarest.key.slice(7)]?.cardFact ?? null : null);

  const catTotal = [...catSecs.values()].reduce((a, b) => a + b, 0) || 1;
  const topShare = favourites[0] ? (catSecs.get(favourites[0].id) ?? 0) / catTotal : 0;
  const hoursTotal = u.hours.reduce((a, b) => a + b, 0) || 1;
  const night = [22, 23, 0, 1, 2, 3, 4].reduce((n, h) => n + (u.hours[h] ?? 0), 0) / hoursTotal;
  let personality = { name: "The Curious Starter", line: "Every universe starts with one star. Yours just lit up." };
  if (u.completedSeries.length >= 2) personality = { name: "The Binger", line: "You don't sample. You finish the whole season." };
  else if (u.exploredCategories.length >= 4) personality = { name: "The Rabbit-Holer", line: "One question always leads to five more." };
  else if (favourites[0] && topShare > 0.6 && episodes >= 3) personality = { name: `The ${favourites[0].label} Specialist`, line: "You go deep, not wide. Respect." };
  else if (night > 0.4 && total > 600) personality = { name: "The Night Owl", line: "Your best ideas arrive after dark." };
  else if (u.insights.length >= 5) personality = { name: "The Collector", line: "You don't just listen. You keep the good bits." };

  return {
    minutes: Math.round(total / 60),
    episodes,
    favourites,
    topics: topTopics,
    longestStreak: u.streak.longest,
    completedSeries: u.completedSeries.map((s) => ({ slug: s, title: bySlug[s]?.title ?? s })),
    fact,
    personality,
  };
}
