import type { CategoryId, EpisodeMeta, Rarity, Series } from "./types";
import type { UserRecord } from "./model";
import { XP, levelFor, levelTitle, seriesCardRarity } from "./gamification";
import { CATEGORIES } from "@/content/categories";

export type GameEvent =
  | { type: "xp"; amount: number; reason: string }
  | { type: "level"; level: number; title: string }
  | { type: "card"; key: string; rarity: Rarity }
  | { type: "streak"; current: number }
  | { type: "stars"; topics: string[] }
  | { type: "series-complete"; slug: string };

export interface Catalog {
  bySlug: Record<string, Series>;
  byEpisode: Record<string, EpisodeMeta>;
}

function award(user: UserRecord, amount: number, reason: string, now: Date, events: GameEvent[]) {
  const before = levelFor(user.xp);
  user.xp += amount;
  user.xpLog.push({ at: now.toISOString(), amount, reason });
  if (user.xpLog.length > 500) user.xpLog = user.xpLog.slice(-500);
  events.push({ type: "xp", amount, reason });
  const after = levelFor(user.xp);
  if (after > before) events.push({ type: "level", level: after, title: levelTitle(after) });
}

function grantCard(user: UserRecord, key: string, rarity: Rarity, now: Date, events: GameEvent[]) {
  if (user.cards.some((c) => c.key === key)) return;
  user.cards.push({ id: `${user.id}:${key}`, key, rarity, unlockedAt: now.toISOString() });
  events.push({ type: "card", key, rarity });
}

function previousDay(today: string): string {
  const d = new Date(`${today}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Counts a day toward the streak (idempotent per day). */
export function touchStreak(user: UserRecord, today: string, now: Date, events: GameEvent[]) {
  const s = user.streak;
  if (s.lastDay === today) return;
  s.current = s.lastDay === previousDay(today) ? s.current + 1 : 1;
  s.longest = Math.max(s.longest, s.current);
  s.lastDay = today;
  events.push({ type: "streak", current: s.current });
  award(user, XP.streakDay * Math.min(s.current, 7), `Day ${s.current} streak`, now, events);
  if (s.current >= 7) grantCard(user, "streak-7", "epic", now, events);
  if (s.current >= 30) grantCard(user, "streak-30", "legendary", now, events);
}

export interface ProgressInput {
  position: number;
  completed?: boolean;
}

/**
 * Records a listening ping. Listening time is bounded by the wall-clock time since the
 * last ping (allowing for 2× playback), so it can't be inflated by the client.
 * Completion requires reaching ~90% of the real duration.
 */
export function recordProgress(user: UserRecord, catalog: Catalog, ep: EpisodeMeta, input: ProgressInput, now: Date, today: string, hour: number): GameEvent[] {
  const events: GameEvent[] = [];
  const series = catalog.bySlug[ep.seriesSlug];
  const duration = ep.duration ?? ep.minutes * 60;
  const position = Math.max(0, Math.min(duration, Number(input.position) || 0));
  const prev = user.progress[ep.id];

  let listened = 0;
  if (prev) {
    const elapsed = (now.getTime() - new Date(prev.updatedAt).getTime()) / 1000;
    const advanced = position - prev.position;
    if (advanced > 0) listened = Math.min(advanced, Math.max(0, elapsed) * 2.05 + 1);
  } else {
    listened = Math.min(position, 20);
  }
  listened = Math.max(0, Math.round(listened));

  const rec = prev ?? { position: 0, duration, completed: false, updatedAt: now.toISOString(), listened: 0 };
  rec.position = position;
  rec.duration = duration;
  rec.updatedAt = now.toISOString();
  rec.listened += listened;
  user.progress[ep.id] = rec;

  if (listened > 0) {
    user.days[today] = (user.days[today] ?? 0) + listened;
    user.hours[hour] = (user.hours[hour] ?? 0) + listened;
  }

  if (user.days[today] >= 60) touchStreak(user, today, now, events);

  const reachedEnd = position >= duration * 0.9;
  if (input.completed && reachedEnd && !rec.completed) {
    rec.completed = true;
    rec.completedAt = now.toISOString();
    touchStreak(user, today, now, events);
    award(user, XP.episode, `Finished “${ep.title}”`, now, events);
    events.push({ type: "stars", topics: ep.topics });

    if (!user.exploredCategories.includes(series.category)) {
      user.exploredCategories.push(series.category);
      award(user, XP.newCategory, `New universe: ${CATEGORIES.find((c) => c.id === series.category)!.label}`, now, events);
      grantCard(user, `category:${series.category}`, "common", now, events);
    }

    const released = series.episodes.filter((e) => e.status === "released");
    const allDone = released.every((e) => user.progress[e.id]?.completed);
    if (allDone && !user.completedSeries.includes(series.slug)) {
      user.completedSeries.push(series.slug);
      award(user, XP.seriesComplete * Math.min(released.length, 4) / 2, `Completed ${series.title}`, now, events);
      grantCard(user, `series:${series.slug}`, seriesCardRarity(released.length), now, events);
      events.push({ type: "series-complete", slug: series.slug });
      const cats = new Set(user.completedSeries.map((s) => catalog.bySlug[s]?.category).filter(Boolean));
      if (cats.size >= 3) grantCard(user, "tri-universe", "epic", now, events);
    }
    if (user.exploredCategories.length >= CATEGORIES.length) grantCard(user, "polymath", "legendary", now, events);
    if (hour >= 0 && hour < 4) grantCard(user, "night-owl", "uncommon", now, events);
  }
  return events;
}

export function answerChallenge(user: UserRecord, episodeId: string, correct: boolean, now: Date): GameEvent[] {
  const events: GameEvent[] = [];
  const prev = user.challenges[episodeId];
  // One scored attempt per episode: a wrong answer reveals the explanation, so retries earn nothing.
  if (prev) return events;
  user.challenges[episodeId] = { correct, firstTry: correct, attempts: 1, answeredAt: now.toISOString() };
  if (correct) {
    award(user, XP.challengeFirstTry, "Recall challenge — nailed it", now, events);
    const firsts = Object.values(user.challenges).filter((c) => c.firstTry).length;
    if (firsts >= 5) grantCard(user, "recall-5", "uncommon", now, events);
  }
  return events;
}

export function saveInsight(user: UserRecord, episodeId: string, text: string, now: Date): { events: GameEvent[]; id: string | null } {
  const events: GameEvent[] = [];
  const clean = text.trim().slice(0, 400);
  if (!clean) return { events, id: null };
  const existing = user.insights.find((i) => i.episodeId === episodeId && i.text === clean);
  if (existing) return { events, id: existing.id };
  const id = `i_${now.getTime().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  user.insights.push({ id, episodeId, text: clean, savedAt: now.toISOString() });
  // Insight XP is capped per day so saving every line isn't a farm.
  const today = now.toISOString().slice(0, 10);
  const savedToday = user.xpLog.filter((x) => x.reason === "Saved an insight" && x.at.startsWith(today)).length;
  if (savedToday < 10) award(user, XP.insight, "Saved an insight", now, events);
  if (user.insights.length >= 10) grantCard(user, "insights-10", "uncommon", now, events);
  return { events, id };
}

export function completeOnboarding(user: UserRecord, interests: CategoryId[], learnStyle: UserRecord["learnStyle"], displayName?: string) {
  const valid = new Set(CATEGORIES.map((c) => c.id));
  user.interests = [...new Set(interests.filter((i) => valid.has(i)))].slice(0, 10);
  user.learnStyle = learnStyle;
  if (displayName?.trim()) user.displayName = displayName.trim().slice(0, 40);
  user.onboarded = true;
}

/** Listening progress for a personal AI series episode (not part of the shared catalog). */
export function recordAiProgress(user: UserRecord, episodeId: string, title: string, duration: number, input: ProgressInput, now: Date, today: string, hour: number): GameEvent[] {
  const events: GameEvent[] = [];
  const position = Math.max(0, Math.min(duration, Number(input.position) || 0));
  const prev = user.progress[episodeId];
  let listened = 0;
  if (prev) {
    const elapsed = (now.getTime() - new Date(prev.updatedAt).getTime()) / 1000;
    const advanced = position - prev.position;
    if (advanced > 0) listened = Math.min(advanced, Math.max(0, elapsed) * 2.05 + 1);
  } else listened = Math.min(position, 20);
  listened = Math.max(0, Math.round(listened));
  const rec = prev ?? { position: 0, duration, completed: false, updatedAt: now.toISOString(), listened: 0 };
  Object.assign(rec, { position, duration, updatedAt: now.toISOString(), listened: rec.listened + listened });
  user.progress[episodeId] = rec;
  if (listened > 0) {
    user.days[today] = (user.days[today] ?? 0) + listened;
    user.hours[hour] = (user.hours[hour] ?? 0) + listened;
  }
  if (user.days[today] >= 60) touchStreak(user, today, now, events);
  if (input.completed && position >= duration * 0.9 && !rec.completed) {
    rec.completed = true;
    rec.completedAt = now.toISOString();
    touchStreak(user, today, now, events);
    award(user, XP.episode, `Finished “${title}”`, now, events);
  }
  return events;
}
