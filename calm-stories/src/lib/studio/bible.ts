import "server-only";
import { getDb } from "@/lib/db";
import { newId, nowIso } from "@/lib/util";
import { getGuidelines } from "./settings";
import type { AgentKey, Deliverable, SeriesBible } from "./types";

export const EMPTY_BIBLE: SeriesBible = {
  identity: null,
  world: null,
  timeline: [],
  established_facts: [],
  open_threads: [],
  resolved_threads: [],
  visual_identity: null,
};

export async function getBible(seriesId: string): Promise<SeriesBible> {
  const rec = await getDb().get("series_bibles", seriesId);
  return rec?.data ?? structuredClone(EMPTY_BIBLE);
}

/** Apply a change to the bible and keep the previous version in history. */
export async function updateBible(
  seriesId: string,
  change: (b: SeriesBible) => SeriesBible,
  meta: { reason: string; agent: AgentKey | "human"; runId: string | null },
): Promise<SeriesBible> {
  const db = getDb();
  const rec = await db.get("series_bibles", seriesId);
  const next = change(structuredClone(rec?.data ?? EMPTY_BIBLE));
  const version = (rec?.version ?? 0) + 1;
  if (rec) await db.update("series_bibles", seriesId, { data: next, version, updated_at: nowIso() });
  else await db.insert("series_bibles", { id: seriesId, series_id: seriesId, data: next, version, updated_at: nowIso() });
  await db.insert("bible_versions", { id: newId("bv"), series_id: seriesId, version, data: next, reason: meta.reason, agent: meta.agent, run_id: meta.runId, created_at: nowIso() });
  return next;
}

const uniq = (xs: string[]) => [...new Set(xs.map((x) => x.trim()).filter(Boolean))];
export { uniq };

/**
 * The series bible rendered as the shared, cacheable context every agent
 * reads: identity, style, world, characters, relationships, season plan,
 * timeline, facts, threads, previous episodes and house guidelines.
 */
export async function seriesContext(seriesId: string, opts: { includeEpisodes?: number } = {}): Promise<string> {
  const db = getDb();
  const [series, bible, characters, relationships, seasons, episodes, guidelines] = await Promise.all([
    db.get("series", seriesId),
    getBible(seriesId),
    db.list("characters", { where: { series_id: seriesId } }),
    db.list("relationships", { where: { series_id: seriesId } }),
    db.list("season_plans", { where: { series_id: seriesId } }),
    db.list("episodes", { where: { series_id: seriesId } }),
    getGuidelines(seriesId),
  ]);
  const out: string[] = [];
  out.push(`# SERIES BIBLE – ${series?.title ?? bible.identity?.title ?? "Untitled"}`);
  const id = bible.identity;
  if (id) {
    out.push(
      `## Identity\nLogline: ${id.logline}\nPremise: ${id.premise}\nTone: ${id.tone}\nThemes: ${id.themes.join("; ")}\nNarrative voice: ${id.narrative_voice}\nPoint of view: ${id.point_of_view} · Tense: ${id.tense}\nRomance heat: ${id.romance_heat}\nEpisode shape: ${id.episode_shape}\nTarget length: ${id.target_minutes} minutes`,
      `### Style rules\n${id.style_rules.map((r) => `- ${r}`).join("\n")}\n### Sensory palette\n${id.sensory_palette.join("; ")}\n### Content boundaries\n${id.content_boundaries.map((r) => `- ${r}`).join("\n")}`,
    );
  }
  const w = bible.world;
  if (w) {
    out.push(
      `## World: ${w.name}\n${w.overview}\nAtmosphere: ${w.atmosphere}\n### Geography\n${w.geography.map((g) => `- ${g.name}: ${g.description}`).join("\n")}\n### Cultures\n${w.cultures.map((c) => `- ${c.name}: ${c.customs} Values: ${c.values}`).join("\n")}\n### Magic\nPrinciples: ${w.magic.principles}\nCosts: ${w.magic.costs}\nLimits: ${w.magic.limits}\n### History\n${w.history.map((h) => `- ${h}`).join("\n")}\n### Recurring locations\n${w.recurring_locations.map((l) => `- ${l.name}: ${l.description} (${l.sensory_details.join(", ")})`).join("\n")}\n### World rules (never break)\n${w.rules.map((r) => `- ${r}`).join("\n")}`,
    );
  }
  if (characters.length) {
    out.push(
      `## Characters\n${characters
        .map(
          (c) =>
            `### ${c.name} (${c.role}, ${c.age}, ${c.pronouns})\nAppearance: ${c.appearance}\nPersonality: ${c.personality}\nDesires: ${c.desires} · Fears: ${c.fears} · Flaws: ${c.flaws}\nHistory: ${c.history}\nMotivations: ${c.motivations}\nSpeech: ${c.speech_style}\nArc: ${c.arc}`,
        )
        .join("\n")}`,
    );
  }
  if (relationships.length) {
    out.push(
      `## Relationships\n${relationships.map((r) => `- ${r.a_name} & ${r.b_name} (${r.kind}): ${r.dynamic}. Chemistry: ${r.chemistry}. Obstacles: ${r.obstacles.join("; ")}. Pacing: ${r.pacing}. Current state: ${r.current_state}`).join("\n")}`,
    );
  }
  for (const s of seasons.sort((a, b) => a.season_number - b.season_number)) {
    out.push(`## Season ${s.season_number}: ${s.title}\n${s.arc}\n${s.episodes.map((e) => `- Ep ${e.number} “${e.title}”: ${e.premise} Romance beat: ${e.romance_beat}`).join("\n")}`);
  }
  if (bible.timeline.length) out.push(`## Timeline\n${bible.timeline.map((t) => `- ${t.episode ? `[${t.episode}] ` : ""}${t.summary}`).join("\n")}`);
  if (bible.established_facts.length) out.push(`## Established facts (canon)\n${bible.established_facts.map((f) => `- ${f}`).join("\n")}`);
  if (bible.open_threads.length) out.push(`## Open threads\n${bible.open_threads.map((f) => `- ${f}`).join("\n")}`);
  if (bible.resolved_threads.length) out.push(`## Resolved threads\n${bible.resolved_threads.map((f) => `- ${f}`).join("\n")}`);
  const published = episodes.filter((e) => ["published", "approved", "in_review"].includes(e.status)).sort((a, b) => a.number - b.number);
  if (published.length) {
    out.push(`## Episodes so far\n${published.slice(-(opts.includeEpisodes ?? 12)).map((e) => `- Ep ${e.number} “${e.title}”: ${e.summary}`).join("\n")}`);
  }
  out.push(`# HOUSE WRITING GUIDELINES\n${guidelines.global.content}`);
  if (guidelines.global.benchmarks.length) {
    out.push(`## Reference benchmarks (quality, not content, to emulate)\n${guidelines.global.benchmarks.map((b) => `### ${b.title}\n${b.excerpt}\nWhy it works: ${b.why}`).join("\n")}`);
  }
  if (guidelines.series) out.push(`# SERIES-SPECIFIC GUIDELINES\n${guidelines.series.content}`);
  return out.join("\n\n");
}

/* ------------------------------------------------------------------ */
/* Deliverables with version history                                   */
/* ------------------------------------------------------------------ */

export async function saveDeliverable(d: Omit<Deliverable, "id" | "version" | "status" | "created_at" | "edited_by"> & { edited_by?: string | null }): Promise<Deliverable> {
  const db = getDb();
  const where = d.episode_id ? { episode_id: d.episode_id, key: d.key } : { series_id: d.series_id, key: d.key, episode_id: null };
  const prior = await db.list("deliverables", { where: where as never });
  for (const p of prior.filter((x) => x.status === "current")) await db.update("deliverables", p.id, { status: "superseded" });
  return db.insert("deliverables", {
    ...d,
    edited_by: d.edited_by ?? null,
    id: newId("dlv"),
    version: prior.reduce((m, p) => Math.max(m, p.version), 0) + 1,
    status: "current",
    created_at: nowIso(),
  });
}

export async function currentDeliverable<T = unknown>(scope: { series_id?: string; episode_id?: string }, key: string): Promise<(Deliverable & { data: T }) | null> {
  const db = getDb();
  const where = scope.episode_id ? { episode_id: scope.episode_id, key, status: "current" as const } : { series_id: scope.series_id, key, status: "current" as const, episode_id: null };
  const rows = await db.list("deliverables", { where: where as never });
  return (rows.sort((a, b) => b.version - a.version)[0] as (Deliverable & { data: T }) | undefined) ?? null;
}
