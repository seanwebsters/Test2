import "server-only";
import { getDb } from "@/lib/db";
import type { Character, CharacterRelationship, Episode, Location, NarrativeEvent, Season, Series, StoryBible } from "@/lib/types";

/** Everything the AI needs to stay consistent with a series. */
export interface StoryContext {
  series: Series;
  bible: StoryBible | null;
  characters: Character[];
  relationships: CharacterRelationship[];
  locations: Location[];
  seasons: Season[];
  episodes: Episode[];
  events: NarrativeEvent[];
}

export async function loadStoryContext(seriesId: string): Promise<StoryContext> {
  const db = getDb();
  const series = await db.get("series", seriesId);
  if (!series) throw new Error("Series not found");
  const [bible, characters, relationships, locations, seasons, episodes, events] = await Promise.all([
    db.findOne("story_bibles", { series_id: seriesId }),
    db.list("characters", { where: { series_id: seriesId }, orderBy: { column: "created_at" } }),
    db.list("character_relationships", { where: { series_id: seriesId } }),
    db.list("locations", { where: { series_id: seriesId }, orderBy: { column: "created_at" } }),
    db.list("seasons", { where: { series_id: seriesId }, orderBy: { column: "number" } }),
    db.list("episodes", { where: { series_id: seriesId } }),
    db.list("narrative_events", { where: { series_id: seriesId }, orderBy: { column: "created_at" } }),
  ]);
  const seasonNo = new Map(seasons.map((s) => [s.id, s.number]));
  episodes.sort((a, b) => (seasonNo.get(a.season_id) ?? 0) - (seasonNo.get(b.season_id) ?? 0) || a.number - b.number);
  return { series, bible, characters, relationships, locations, seasons, episodes, events };
}

/**
 * Renders the retrieved story memory as compact text for prompts. When an
 * episode is in focus, only earlier episodes are treated as "previously".
 */
export function renderContext(ctx: StoryContext, focusEpisodeId?: string | null): string {
  const lines: string[] = [];
  const s = ctx.series;
  lines.push(`SERIES: ${s.title} — ${s.tagline}`, `Genre: ${s.genre}. Tags: ${s.tags.join(", ")}`, `Synopsis: ${s.description}`);
  const b = ctx.bible;
  if (b) {
    lines.push(
      "",
      `WORLD BIBLE: ${b.world_name}`,
      `Geography: ${b.geography}`,
      `Culture: ${b.culture}`,
      `History: ${b.history}`,
      `Atmosphere: ${b.atmosphere}`,
      `Rules: ${b.rules.join(" | ") || "—"}`,
      `Themes: ${b.themes.join(", ") || "—"}`,
      `Established facts: ${b.established_facts.join(" | ") || "—"}`,
      `Unresolved threads: ${b.unresolved_threads.join(" | ") || "—"}`,
      `Creator preferences: ${b.creator_preferences.join(" | ") || "—"}`,
    );
  }
  if (ctx.characters.length) {
    lines.push("", "CHARACTERS:");
    for (const c of ctx.characters) lines.push(`- ${c.name} (${c.age_range}; ${c.narrative_role}): ${c.personality} Backstory: ${c.backstory} Wants: ${c.motivations} Arc: ${c.arc} Voice: ${c.voice_profile}`);
  }
  if (ctx.relationships.length) {
    const name = (id: string) => ctx.characters.find((c) => c.id === id)?.name ?? "?";
    lines.push("", "RELATIONSHIPS:", ...ctx.relationships.map((r) => `- ${name(r.character_a_id)} & ${name(r.character_b_id)}: ${r.kind}. ${r.description}`));
  }
  if (ctx.locations.length) lines.push("", "LOCATIONS:", ...ctx.locations.map((l) => `- ${l.name}: ${l.description}`));
  const focusIdx = focusEpisodeId ? ctx.episodes.findIndex((e) => e.id === focusEpisodeId) : ctx.episodes.length;
  const previous = ctx.episodes.slice(0, focusIdx < 0 ? ctx.episodes.length : focusIdx);
  if (previous.length) {
    lines.push("", "PREVIOUS EPISODES:", ...previous.slice(-12).map((e) => `- Ep ${e.number} "${e.title}": ${e.summary}`));
  }
  const evts = ctx.events.filter((e) => e.kind !== "event").slice(-15);
  if (evts.length) lines.push("", "NARRATIVE MEMORY:", ...evts.map((e) => `- [${e.kind}] ${e.summary}`));
  return lines.join("\n");
}
