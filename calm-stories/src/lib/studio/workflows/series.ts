import "server-only";
import { getDb } from "@/lib/db";
import { newId, nowIso, slugify } from "@/lib/util";
import type { Series } from "@/lib/types";
import { currentDeliverable, getBible, seriesContext, uniq, updateBible } from "../bible";
import { createRun, registerGateHook, registerHandler, type NewStep, type StepContext } from "../engine";
import { StepFailure } from "../errors";
import {
  BibleFixesSchema,
  CharactersSchema,
  ConceptCritiqueSchema,
  ConceptsSchema,
  GenreResearchSchema,
  RelationshipsSchema,
  SeasonPlanSchema,
  SeriesIdentitySchema,
  WorldSchema,
  type BibleFixes,
  type Characters,
  type ConceptCritique,
  type Concepts,
  type Relationships,
  type SeasonPlanData,
  type SeriesIdentity,
  type World,
} from "../schemas";
import { getStudioSettings } from "../settings";
import { artSteps } from "./art-steps";

/* ------------------------------------------------------------------ */
/* Start                                                               */
/* ------------------------------------------------------------------ */

export async function startSeriesDevelopment(input: { brief: string; userId: string }) {
  const db = getDb();
  const settings = await getStudioSettings();
  const brief = input.brief.trim();
  if (brief.length < 20) throw new StepFailure("Give the team a little more to go on – at least a sentence.");
  const project = await db.insert("series_projects", {
    id: newId("prj"),
    brief,
    status: "developing",
    series_id: null,
    run_id: null,
    created_by: input.userId,
    decision_by: null,
    decision_notes: "",
    decided_at: null,
    created_at: nowIso(),
    updated_at: nowIso(),
  });
  const steps: NewStep[] = [
    { key: "research", type: "series.research", agent: "program_director", label: "Research the genre and catalogue", activity: "thinking", deps: [] },
    { key: "concepts", type: "series.concepts", agent: "creative_director", label: "Develop three original concepts", activity: "typing", deps: ["research"] },
    { key: "critique", type: "series.critique", agent: "story_critic", label: "Critique the concepts", activity: "reading", deps: ["concepts"] },
    { key: "identity", type: "series.identity", agent: "creative_director", label: "Define the series identity", activity: "typing", deps: ["critique"] },
    { key: "world", type: "series.world", agent: "worldbuilder", label: "Build the world", activity: "typing", deps: ["identity"] },
    { key: "characters", type: "series.characters", agent: "character_psychologist", label: "Develop the characters", activity: "typing", deps: ["identity"] },
    { key: "romance", type: "series.romance", agent: "romance_architect", label: "Design the relationships", activity: "thinking", deps: ["world", "characters"] },
    { key: "season", type: "series.season", agent: "series_architect", label: "Plan season one", activity: "thinking", deps: ["romance"] },
    { key: "continuity", type: "series.continuity", agent: "continuity_editor", label: "Check the bible for consistency", activity: "reading", deps: ["season"], params: { round: 1 } },
  ];
  const { run } = await createRun({
    kind: "series_development",
    title: `New series: ${brief.slice(0, 60)}${brief.length > 60 ? "…" : ""}`,
    project_id: project.id,
    params: { brief },
    steps,
    budget_cents: settings.default_series_budget_cents,
    created_by: input.userId,
  });
  await db.update("series_projects", project.id, { run_id: run.id, updated_at: nowIso() });
  return { project, run };
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

async function project(ctx: StepContext) {
  const p = await getDb().get("series_projects", ctx.run.project_id ?? "");
  if (!p) throw new StepFailure("Series project not found.");
  return p;
}

async function catalogueSummary(): Promise<string> {
  const db = getDb();
  const [series, events, follows] = await Promise.all([db.list("series", { where: { status: "published" } }), db.list("listening_events"), db.list("series_follows")]);
  const real = events.filter((e) => !e.is_sample);
  const lines = series
    .map((s) => {
      const ev = real.filter((e) => e.series_id === s.id);
      const hours = ev.reduce((n, e) => n + e.listened_seconds, 0) / 3600;
      const completes = ev.filter((e) => e.kind === "complete").length;
      const followers = follows.filter((f) => f.series_id === s.id && !f.user_id.startsWith("usr_sample_")).length;
      return `- ${s.title} (${s.genre}; tags: ${s.tags.join(", ")}): ${hours.toFixed(1)} listening hours, ${completes} completions, ${followers} followers`;
    })
    .join("\n");
  return `# CURRENT CATALOGUE (real audience data only; sample data excluded)\n${lines || "No published series yet."}`;
}

/** Context for the shared bible once the series exists; the brief and research before that. */
async function devContext(ctx: StepContext): Promise<string> {
  const p = await project(ctx);
  const research = await currentDeliverable({ series_id: p.series_id ?? undefined }, "genre_research");
  const parts = [`# BRIEF FROM THE NETWORK EXECUTIVE\n${p.brief}`];
  const r = research ?? (await findRunDeliverable(ctx, "genre_research"));
  if (r) parts.push(`# GENRE RESEARCH\n${JSON.stringify(r.data, null, 1)}`);
  if (p.series_id) parts.push(await seriesContext(p.series_id));
  return parts.join("\n\n");
}

async function findRunDeliverable<T = unknown>(ctx: StepContext, key: string): Promise<{ data: T } | null> {
  const rows = await getDb().list("deliverables", { where: { run_id: ctx.run.id, key, status: "current" } });
  return (rows.sort((a, b) => b.version - a.version)[0] as { data: T } | undefined) ?? null;
}

async function uniqueSlug(title: string): Promise<string> {
  const db = getDb();
  const base = slugify(title) || "series";
  let slug = base;
  for (let i = 2; await db.findOne("series", { slug }); i++) slug = `${base}-${i}`;
  return slug;
}

/* ------------------------------------------------------------------ */
/* Handlers                                                            */
/* ------------------------------------------------------------------ */

registerHandler("series.research", async (ctx) => {
  const p = await project(ctx);
  const settings = await getStudioSettings();
  const catalogue = await catalogueSummary();
  let notes = "";
  if (settings.web_research) {
    const r = await ctx.claude({
      context: catalogue,
      prompt: `Research the genre for this brief using web search. Look at what readers and listeners of adult romantasy and sleep/relaxation audio value, which tropes feel tired, and what successful recent works have in common – describe them generically, never as templates to copy. Note your sources.\n\nBrief: ${p.brief}`,
      webSearch: true,
      maxTokens: 16000,
    });
    notes = r.data;
  }
  const res = await ctx.claude({
    context: catalogue,
    prompt: `Produce the genre research brief for the creative team.\n\nBrief: ${p.brief}${notes ? `\n\nYour research notes (with sources):\n${notes}` : "\n\nWeb research is switched off: rely on your genre knowledge and leave sources empty."}`,
    schema: GenreResearchSchema,
  });
  await ctx.deliver({ kind: "genre_research", key: "genre_research", title: "Genre research", data: res.data, reasoning: `${res.data.opportunities.slice(0, 2).join(" ")}`, model: res.model });
  return { summary: `${res.data.conventions.length} conventions, ${res.data.tired_tropes_to_avoid.length} tropes to avoid, ${res.data.sources.length} sources.` };
});

registerHandler("series.concepts", async (ctx) => {
  const res = await ctx.claude({
    context: await devContext(ctx),
    prompt: "Create exactly three distinct, original series concepts that answer the brief. Make them genuinely different from each other (setting, central relationship, emotional promise). Each must be easy to fall asleep to and impossible to mistake for an existing franchise.",
    schema: ConceptsSchema,
  });
  if (res.data.concepts.length < 2) throw new StepFailure("The Creative Director returned fewer than two concepts.", true);
  await ctx.deliver({ kind: "concepts", key: "concepts", title: "Series concepts", data: res.data, reasoning: res.data.concepts.map((c) => c.title).join(" · "), model: res.model });
  return { summary: res.data.concepts.map((c, i) => `${i + 1}. ${c.title}`).join("  ") };
});

registerHandler("series.critique", async (ctx) => {
  const concepts = (await findRunDeliverable<Concepts>(ctx, "concepts"))!.data;
  const res = await ctx.claude({
    context: await devContext(ctx),
    prompt: `Critique these concepts independently. For each, give strengths and weaknesses with evidence from the concept text, originality risks and how well it suits bedtime listening. Recommend the strongest and say how to make it better.\n\n${concepts.concepts.map((c, i) => `## Concept ${i + 1}: ${c.title}\n${JSON.stringify(c, null, 1)}`).join("\n\n")}`,
    schema: ConceptCritiqueSchema,
  });
  const idx = res.data.recommended_index;
  if (idx < 1 || idx > concepts.concepts.length) throw new StepFailure("The critic recommended a concept that doesn't exist.", true);
  await ctx.deliver({ kind: "concept_critique", key: "concept_critique", title: "Concept critique", data: res.data, reasoning: res.data.rationale, model: res.model });
  return { summary: `Recommends “${concepts.concepts[idx - 1]!.title}”: ${res.data.rationale.slice(0, 160)}` };
});

registerHandler("series.identity", async (ctx) => {
  const db = getDb();
  const p = await project(ctx);
  const concepts = (await findRunDeliverable<Concepts>(ctx, "concepts"))!.data;
  const critique = (await findRunDeliverable<ConceptCritique>(ctx, "concept_critique"))!.data;
  const chosen = concepts.concepts[critique.recommended_index - 1]!;
  const res = await ctx.claude({
    context: await devContext(ctx),
    prompt: `Define the series identity for the recommended concept, incorporating the critic's improvements.\n\nConcept:\n${JSON.stringify(chosen, null, 1)}\n\nImprovements to make:\n${critique.improvements_for_recommended.map((i) => `- ${i}`).join("\n")}\n\nThe style rules become binding for every writer on the series – make them specific to this series' voice.`,
    schema: SeriesIdentitySchema,
  });
  const id: SeriesIdentity = res.data;
  let seriesId = p.series_id;
  const now = nowIso();
  if (!seriesId) {
    const series: Series = {
      id: newId("ser"),
      slug: await uniqueSlug(id.title),
      creator_id: "usr_calm-originals",
      title: id.title,
      tagline: id.tagline,
      description: id.logline,
      genre: id.genre,
      tags: id.themes.slice(0, 4),
      status: "draft",
      is_official: true,
      artwork: { scene: "kingdom", palette: ["#0b1430", "#2a2f6b", "#f2c9a0", "#cfd8ff"], seed: Math.floor(Math.random() * 1e9) },
      soundscape_id: null,
      content_rating: "all-ages",
      ai_disclosure: "Written and produced with AI assistance under human editorial direction.",
      trending_score: 0,
      popularity: 0,
      created_at: now,
      updated_at: now,
      published_at: null,
    };
    if (!(await db.get("users", series.creator_id))) {
      const editor = (await db.list("user_roles", { where: { role: "admin" } }))[0];
      series.creator_id = editor?.user_id ?? p.created_by;
    }
    await db.insert("series", series);
    seriesId = series.id;
    await db.update("series_projects", p.id, { series_id: seriesId, updated_at: now });
    await db.update("workflow_runs", ctx.run.id, { series_id: seriesId, updated_at: now });
    ctx.run.series_id = seriesId;
    ctx.meta.seriesId = seriesId;
    // Re-home the run's earlier deliverables onto the new series.
    for (const d of await db.list("deliverables", { where: { run_id: ctx.run.id } })) await db.update("deliverables", d.id, { series_id: seriesId });
  } else {
    await db.update("series", seriesId, { title: id.title, tagline: id.tagline, description: id.logline, genre: id.genre, tags: id.themes.slice(0, 4), updated_at: now });
  }
  await updateBible(
    seriesId,
    (b) => ({
      ...b,
      identity: {
        title: id.title,
        tagline: id.tagline,
        logline: id.logline,
        premise: id.premise,
        tone: id.tone,
        themes: id.themes,
        narrative_voice: id.narrative_voice,
        point_of_view: id.point_of_view,
        tense: id.tense,
        style_rules: id.style_rules,
        sensory_palette: id.sensory_palette,
        romance_heat: id.romance_heat,
        content_boundaries: id.content_boundaries,
        episode_shape: id.episode_shape,
        target_minutes: id.target_minutes,
      },
    }),
    { reason: "Series identity defined", agent: "creative_director", runId: ctx.run.id },
  );
  await ctx.deliver({ kind: "series_identity", key: "series_identity", title: `Identity: ${id.title}`, data: id, reasoning: id.tone, model: res.model });
  return { summary: `“${id.title}” – ${id.logline}` };
});

async function saveWorld(seriesId: string, w: World, runId: string, reason: string) {
  await updateBible(seriesId, (b) => ({ ...b, world: w }), { reason, agent: "worldbuilder", runId });
}

async function saveCharacters(seriesId: string, data: Characters) {
  const db = getDb();
  const existing = await db.list("characters", { where: { series_id: seriesId } });
  const now = nowIso();
  for (const c of data.characters) {
    const prior = existing.find((e) => e.name.toLowerCase() === c.name.toLowerCase());
    const row = { ...c, updated_at: now };
    if (prior) await db.update("characters", prior.id, row);
    else await db.insert("characters", { ...row, id: newId("chr"), series_id: seriesId, voice_id: null, voice_name: null, portrait_asset_id: null, created_at: now });
  }
}

async function saveRelationships(seriesId: string, data: Relationships) {
  const db = getDb();
  for (const r of await db.list("relationships", { where: { series_id: seriesId } })) await db.remove("relationships", r.id);
  for (const r of data.relationships) await db.insert("relationships", { ...r, id: newId("rel"), series_id: seriesId, updated_at: nowIso() });
}

async function saveSeason(seriesId: string, data: SeasonPlanData) {
  const db = getDb();
  const existing = await db.findOne("season_plans", { series_id: seriesId, season_number: 1 });
  if (existing) await db.update("season_plans", existing.id, { ...data, updated_at: nowIso() });
  else await db.insert("season_plans", { ...data, id: newId("ssp"), series_id: seriesId, season_number: 1, updated_at: nowIso() });
  const season = await db.findOne("seasons", { series_id: seriesId, number: 1 });
  if (season) await db.update("seasons", season.id, { title: data.title, synopsis: data.arc, arc: data.arc });
  else await db.insert("seasons", { id: newId("sea"), series_id: seriesId, number: 1, title: data.title, synopsis: data.arc, arc: data.arc, created_at: nowIso() });
}

registerHandler("series.world", async (ctx) => {
  const res = await ctx.claude({
    context: await devContext(ctx),
    prompt: "Build the world for this series. Give it textures a listener can feel and recurring locations that can carry many quiet scenes. Every element must be original.",
    schema: WorldSchema,
  });
  await saveWorld(ctx.run.series_id!, res.data, ctx.run.id, "World created");
  await ctx.deliver({ kind: "world", key: "world", title: `World: ${res.data.name}`, data: res.data, reasoning: res.data.atmosphere, model: res.model });
  return { summary: `${res.data.name}: ${res.data.recurring_locations.length} recurring locations, ${res.data.rules.length} world rules.` };
});

registerHandler("series.characters", async (ctx) => {
  const res = await ctx.claude({
    context: await devContext(ctx),
    prompt: "Develop the cast: the two romantic leads and three to five supporting characters. Each needs contradictions, a history that explains them, and a voice you could recognise without a dialogue tag. Visual descriptions must be specific and stable enough to keep artwork consistent for a whole season.",
    schema: CharactersSchema,
  });
  await saveCharacters(ctx.run.series_id!, res.data);
  await ctx.deliver({ kind: "characters", key: "characters", title: "Characters", data: res.data, reasoning: res.data.characters.map((c) => `${c.name} (${c.role})`).join(", "), model: res.model });
  return { summary: res.data.characters.map((c) => c.name).join(", ") };
});

registerHandler("series.romance", async (ctx) => {
  const res = await ctx.claude({
    context: await devContext(ctx),
    prompt: "Design the relationships, above all the central slow burn: where the chemistry comes from, what keeps the leads apart, and season-long milestones that earn each step. Include the most important supporting relationships too.",
    schema: RelationshipsSchema,
  });
  await saveRelationships(ctx.run.series_id!, res.data);
  await ctx.deliver({ kind: "relationships", key: "relationships", title: "Relationships", data: res.data, reasoning: res.data.relationships[0]?.chemistry ?? "", model: res.model });
  return { summary: res.data.relationships.map((r) => `${r.a_name} & ${r.b_name}`).join("; ") };
});

registerHandler("series.season", async (ctx) => {
  const res = await ctx.claude({
    context: await devContext(ctx),
    prompt: "Plan season one: eight episodes. Each must stand alone as a satisfying evening while the season builds. Place every essential development early in its episode and give each a gentle landing.",
    schema: SeasonPlanSchema,
  });
  await saveSeason(ctx.run.series_id!, res.data);
  await ctx.deliver({ kind: "season_plan", key: "season_plan:1", title: `Season 1: ${res.data.title}`, data: res.data, reasoning: res.data.arc, model: res.model });
  return { summary: `${res.data.title}: ${res.data.episodes.length} episodes planned.` };
});

registerHandler("series.continuity", async (ctx) => {
  const settings = await getStudioSettings();
  const round = Number(ctx.step.params.round ?? 1);
  const res = await ctx.claude({
    context: await devContext(ctx),
    prompt: "Check the whole bible for contradictions and gaps: identity vs world vs characters vs relationships vs season plan. Report each problem with evidence and a fix. Then list the canon facts and open threads to record.",
    schema: BibleFixesSchema,
  });
  const fixes: BibleFixes = res.data;
  await ctx.deliver({ kind: "bible_check", key: "bible_check", title: `Bible check (round ${round})`, data: fixes, reasoning: fixes.summary, model: res.model });
  await updateBible(
    ctx.run.series_id!,
    (b) => ({ ...b, established_facts: uniq([...b.established_facts, ...fixes.established_facts]), open_threads: uniq([...b.open_threads, ...fixes.open_threads]) }),
    { reason: "Canon facts and threads recorded", agent: "continuity_editor", runId: ctx.run.id },
  );
  const areas = [...new Set(fixes.issues.map((i) => i.area))];
  if (fixes.verdict === "revise" && areas.length && round <= settings.max_revision_rounds) {
    const owner: Record<string, { agent: NewStep["agent"]; label: string }> = {
      identity: { agent: "creative_director", label: "Revise the series identity" },
      world: { agent: "worldbuilder", label: "Revise the world" },
      characters: { agent: "character_psychologist", label: "Revise the characters" },
      relationships: { agent: "romance_architect", label: "Revise the relationships" },
      season: { agent: "series_architect", label: "Revise the season plan" },
    };
    const fixSteps: NewStep[] = areas.map((a) => ({ key: `fix_${a}_r${round}`, type: "series.fix", agent: owner[a]!.agent, label: owner[a]!.label, activity: "typing" as const, deps: [ctx.step.key], params: { area: a, round } }));
    return {
      summary: `Sent ${fixes.issues.length} issue(s) back for revision: ${areas.join(", ")}.`,
      addSteps: [
        ...fixSteps,
        { key: `continuity_r${round + 1}`, type: "series.continuity", agent: "continuity_editor", label: `Re-check the bible (round ${round + 1})`, activity: "reading", deps: fixSteps.map((s) => s.key), params: { round: round + 1 } },
      ],
    };
  }
  return {
    summary: fixes.verdict === "approve" ? "Bible is consistent." : `Proceeding after ${round} round(s); ${fixes.issues.length} minor note(s) recorded.`,
    addSteps: artSteps(ctx.step.key),
  };
});

registerHandler("series.fix", async (ctx) => {
  const area = String(ctx.step.params.area);
  const round = Number(ctx.step.params.round);
  const check = (await findRunDeliverable<BibleFixes>(ctx, "bible_check"))!.data;
  const issues = check.issues.filter((i) => i.area === area);
  const instruction = `Revise the ${area} section to resolve these continuity issues while keeping everything that works:\n${issues.map((i) => `- ${i.problem} (evidence: ${i.evidence}) → ${i.fix}`).join("\n")}\nReturn the complete revised ${area}.`;
  const sid = ctx.run.series_id!;
  const ctxText = await devContext(ctx);
  if (area === "world") {
    const r = await ctx.claude({ context: ctxText, prompt: instruction, schema: WorldSchema });
    await saveWorld(sid, r.data, ctx.run.id, `World revised (round ${round})`);
    await ctx.deliver({ kind: "world", key: "world", title: `World (revised r${round})`, data: r.data, reasoning: issues.map((i) => i.fix).join(" "), model: r.model });
  } else if (area === "characters") {
    const r = await ctx.claude({ context: ctxText, prompt: instruction, schema: CharactersSchema });
    await saveCharacters(sid, r.data);
    await ctx.deliver({ kind: "characters", key: "characters", title: `Characters (revised r${round})`, data: r.data, reasoning: issues.map((i) => i.fix).join(" "), model: r.model });
  } else if (area === "relationships") {
    const r = await ctx.claude({ context: ctxText, prompt: instruction, schema: RelationshipsSchema });
    await saveRelationships(sid, r.data);
    await ctx.deliver({ kind: "relationships", key: "relationships", title: `Relationships (revised r${round})`, data: r.data, reasoning: issues.map((i) => i.fix).join(" "), model: r.model });
  } else if (area === "season") {
    const r = await ctx.claude({ context: ctxText, prompt: instruction, schema: SeasonPlanSchema });
    await saveSeason(sid, r.data);
    await ctx.deliver({ kind: "season_plan", key: "season_plan:1", title: `Season 1 (revised r${round})`, data: r.data, reasoning: issues.map((i) => i.fix).join(" "), model: r.model });
  } else {
    const r = await ctx.claude({ context: ctxText, prompt: instruction, schema: SeriesIdentitySchema });
    await updateBible(sid, (b) => ({ ...b, identity: { ...r.data } as never }), { reason: `Identity revised (round ${round})`, agent: "creative_director", runId: ctx.run.id });
    await ctx.deliver({ kind: "series_identity", key: "series_identity", title: `Identity (revised r${round})`, data: r.data, reasoning: issues.map((i) => i.fix).join(" "), model: r.model });
  }
  return { summary: `Resolved ${issues.length} ${area} issue(s).` };
});

/* ------------------------------------------------------------------ */
/* Greenlight gate                                                     */
/* ------------------------------------------------------------------ */

registerHandler("series.greenlight", async (ctx) => {
  const db = getDb();
  const p = await project(ctx);
  await db.update("series_projects", p.id, { status: "awaiting_greenlight", updated_at: nowIso() });
  const bible = await getBible(ctx.run.series_id!);
  return { summary: `“${bible.identity?.title ?? "New series"}” is ready for your greenlight.`, awaitApproval: true };
});

registerGateHook("series.greenlight", async (run, _step, decision) => {
  const db = getDb();
  const p = await db.get("series_projects", run.project_id ?? "");
  if (!p) return;
  await db.update("series_projects", p.id, {
    status: decision.approved ? "greenlit" : "rejected",
    decision_by: decision.userId,
    decision_notes: decision.notes,
    decided_at: nowIso(),
    updated_at: nowIso(),
  });
  if (!decision.approved) return;
  // Greenlit: cast voices, build the pronunciation dictionary, then start episode one.
  return [
    { key: "casting", type: "audio.casting", agent: "audio_director", label: "Audition and cast voices", activity: "reading", deps: ["greenlight"] },
    { key: "pronunciation", type: "audio.pronunciation", agent: "audio_director", label: "Build the pronunciation dictionary", activity: "typing", deps: ["greenlight"] },
    { key: "kickoff", type: "series.kickoff", agent: "program_director", label: "Commission episode one", activity: "thinking", deps: ["casting", "pronunciation"] },
  ];
});

registerHandler("series.kickoff", async (ctx) => {
  const { startEpisodeProduction } = await import("./episode");
  const { run } = await startEpisodeProduction({ seriesId: ctx.run.series_id!, episodeNumber: 1, userId: ctx.run.created_by });
  return { summary: `Episode one is in production (${run.id}).` };
});
