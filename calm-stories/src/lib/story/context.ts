import "server-only";
import { getDb } from "@/lib/db";
import { notFound } from "@/lib/errors";
import type { Character, CharacterRelationship, Episode, Location, NarrativeEvent, Season, Series, StoryBible } from "@/lib/types";

export interface StoryContext {
  series: Series;
  bible: StoryBible;
  characters: Character[];
  relationships: CharacterRelationship[];
  locations: Location[];
  seasons: Season[];
  episodes: Episode[];
  events: NarrativeEvent[];
}

/** Persistent story memory for one series, ordered for prompting. */
export async function loadStoryContext(seriesId: string): Promise<StoryContext> {
  const db = getDb();
  const series = await db.get("series", seriesId);
  if (!series) throw notFound("Series not found.");
  const [bible, characters, relationships, locations, seasons, episodes, events] = await Promise.all([
    db.findOne("story_bibles", { series_id: seriesId }),
    db.list("characters", { where: { series_id: seriesId }, orderBy: { column: "created_at" } }),
    db.list("character_relationships", { where: { series_id: seriesId } }),
    db.list("locations", { where: { series_id: seriesId } }),
    db.list("seasons", { where: { series_id: seriesId }, orderBy: { column: "number" } }),
    db.list("episodes", { where: { series_id: seriesId } }),
    db.list("narrative_events", { where: { series_id: seriesId }, orderBy: { column: "created_at" } }),
  ]);
  const seasonNo = new Map(seasons.map((s) => [s.id, s.number]));
  episodes.sort((a, b) => (seasonNo.get(a.season_id) ?? 0) - (seasonNo.get(b.season_id) ?? 0) || a.number - b.number);
  return {
    series,
    bible: bible ?? {
      id: `bib_${seriesId}`,
      series_id: seriesId,
      world_name: series.title,
      geography: "",
      culture: "",
      history: "",
      atmosphere: "",
      rules: [],
      themes: [],
      established_facts: [],
      unresolved_threads: [],
      creator_preferences: [],
      updated_at: series.created_at,
    },
    characters,
    relationships,
    locations,
    seasons,
    episodes,
    events,
  };
}

/**
 * Condensed Story Bible for prompts. Retrieval is scoped: recent episode
 * summaries in full, earlier ones as one-liners, so long series stay within
 * a sensible context budget.
 */
export function contextToPrompt(ctx: StoryContext, opts: { upToEpisodeId?: string; recent?: number } = {}): string {
  const b = ctx.bible;
  const names = new Map(ctx.characters.map((c) => [c.id, c.name]));
  let eps = ctx.episodes;
  if (opts.upToEpisodeId) {
    const idx = eps.findIndex((e) => e.id === opts.upToEpisodeId);
    if (idx >= 0) eps = eps.slice(0, idx);
  }
  const recent = opts.recent ?? 6;
  const older = eps.slice(0, Math.max(0, eps.length - recent));
  const latest = eps.slice(-recent);
  const lines = [
    `SERIES: ${ctx.series.title} (${ctx.series.genre}) – ${ctx.series.tagline}`,
    `SYNOPSIS: ${ctx.series.description}`,
    `WORLD: ${b.world_name}. ${b.geography}`,
    b.culture && `CULTURE: ${b.culture}`,
    b.history && `HISTORY: ${b.history}`,
    b.atmosphere && `ATMOSPHERE: ${b.atmosphere}`,
    b.rules.length && `WORLD RULES (never contradict):\n${b.rules.map((r) => `- ${r}`).join("\n")}`,
    b.themes.length && `THEMES: ${b.themes.join("; ")}`,
    ctx.characters.length &&
      `CHARACTERS:\n${ctx.characters
        .map((c) => `- ${c.name} (${c.narrative_role}, ${c.age_range}): ${c.personality} Backstory: ${c.backstory} Wants: ${c.motivations} Voice: ${c.voice_profile} Arc: ${c.arc}`)
        .join("\n")}`,
    ctx.relationships.length &&
      `RELATIONSHIPS:\n${ctx.relationships.map((r) => `- ${names.get(r.character_a_id)} & ${names.get(r.character_b_id)}: ${r.kind} – ${r.description}`).join("\n")}`,
    ctx.locations.length && `LOCATIONS:\n${ctx.locations.map((l) => `- ${l.name}: ${l.description}`).join("\n")}`,
    b.established_facts.length && `ESTABLISHED FACTS:\n${b.established_facts.map((f) => `- ${f}`).join("\n")}`,
    b.unresolved_threads.length && `UNRESOLVED THREADS:\n${b.unresolved_threads.map((f) => `- ${f}`).join("\n")}`,
    older.length && `EARLIER EPISODES: ${older.map((e) => `${e.number}. ${e.title}`).join("; ")}`,
    latest.length && `RECENT EPISODES:\n${latest.map((e) => `- Ep ${e.number} "${e.title}": ${e.summary}`).join("\n")}`,
    b.creator_preferences.length && `CREATOR PREFERENCES:\n${b.creator_preferences.map((f) => `- ${f}`).join("\n")}`,
  ];
  return lines.filter(Boolean).join("\n\n");
}
