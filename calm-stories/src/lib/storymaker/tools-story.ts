import "server-only";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { isAdmin } from "@/lib/auth/policy";
import { badRequest, notFound } from "@/lib/errors";
import { GENRES, type Genre, type ScriptSettings } from "@/lib/types";
import { hashString, newId, nowIso, slugify } from "@/lib/util";
import { loadStoryContext } from "@/lib/story/context";
import * as engine from "@/lib/ai/story-engine";
import { resolveWriter } from "@/lib/ai";
import { defineTool, type ToolContext } from "./registry";
import { addScriptVersion, currentScriptText, getEpisodeInSeries, getOrCreateScript } from "./scripts";

const GenreEnum = z.enum(GENRES as [Genre, ...Genre[]]);
const SceneEnum = z.enum(["kingdom", "forest", "cabin", "space", "ocean", "garden", "library", "village", "coast", "desert", "aurora", "city", "lake"]);

const PALETTES: Record<string, [string, string, string, string]> = {
  kingdom: ["#0b1640", "#2a2f6b", "#c9b8ff", "#f6e7b8"],
  forest: ["#071a1f", "#1b3b3a", "#ffc46b", "#d6ffe7"],
  cabin: ["#0c1b33", "#2c3f5e", "#f2c58a", "#ffe8c2"],
  space: ["#050b24", "#1d1f55", "#8bd3ff", "#ffd6f5"],
  ocean: ["#05122b", "#163a63", "#a9e4ff", "#ffe4f2"],
  garden: ["#0d1f2b", "#244a46", "#f5b8c8", "#e6f7c9"],
  library: ["#120f2e", "#3a2b5e", "#f3c77a", "#ffe9b8"],
  village: ["#0a1631", "#2b3f66", "#ffd28a", "#eaf2ff"],
  coast: ["#0a1a33", "#27446b", "#ffcf9e", "#bfe3ff"],
  desert: ["#0c1033", "#3c2c5c", "#ffcf87", "#ffe9c4"],
  aurora: ["#03101f", "#0e2f45", "#7dffc8", "#c7a6ff"],
  city: ["#071230", "#1b2c5e", "#7fe0ff", "#ffc6e8"],
  lake: ["#0b1a36", "#2d4870", "#ffb48a", "#d2f0ff"],
};

export function paletteFor(scene: string): [string, string, string, string] {
  return PALETTES[scene] ?? PALETTES.kingdom!;
}

async function recordCost(ctx: ToolContext, seriesId: string | null, episodeId: string | null, m: { provider: string; model: string; simulated: boolean; cost_cents: number; input_tokens?: number; output_tokens?: number }) {
  if (m.simulated && m.cost_cents === 0 && m.provider !== "simulated") return;
  await getDb().insert("production_costs", {
    id: newId("cost"),
    job_id: null,
    series_id: seriesId,
    episode_id: episodeId,
    category: "llm",
    provider: m.provider,
    model: m.model,
    units: (m.input_tokens ?? 0) + (m.output_tokens ?? 0),
    unit_label: "tokens",
    cost_cents: m.cost_cents,
    simulated: m.simulated,
    created_at: nowIso(),
  });
  void ctx;
}

/** Confirmation reason when a real (billed) writing model would be used. */
async function paidReason(task: Parameters<typeof resolveWriter>[0], what: string, ctx: ToolContext): Promise<string | null> {
  if (ctx.confirmed) return null;
  const w = await resolveWriter(task);
  return w.simulated ? null : `${what} uses ${w.providerName} (${w.model}), which is a paid generation.`;
}

/* ------------------------------------------------------------------ */
/* Series                                                              */
/* ------------------------------------------------------------------ */

defineTool({
  name: "generate_synopsis",
  description: "Develop a creator's idea into an editable series concept card (title, synopsis, genre, characters). Does not save anything.",
  input: z.object({ idea: z.string().min(1).max(2000).describe("The creator's idea in their own words.") }),
  permission: "creator",
  seriesScoped: false,
  confirm: (i, ctx) => paidReason("concept", "Developing a concept", ctx),
  async run(input, ctx) {
    const { proposal, meta } = await engine.generateConcept(input.idea);
    await recordCost(ctx, null, null, meta);
    return {
      summary: `Here's a first take on your idea – “${proposal.title}”. Edit anything you like, then create the series when you're happy.`,
      cards: [{ type: "concept", proposal }],
      data: proposal,
      meta,
    };
  },
});

defineTool({
  name: "create_series",
  description: "Create a new private draft series (with Season 1, a Story Bible and starter characters) from an approved concept.",
  input: z.object({
    title: z.string().min(2).max(120),
    tagline: z.string().max(200).default(""),
    synopsis: z.string().max(4000).default(""),
    genre: GenreEnum,
    tags: z.array(z.string().max(40)).max(12).default([]),
    scene: SceneEnum.default("forest"),
    narrative_arc: z.string().max(2000).default(""),
    characters: z.array(z.object({ name: z.string().min(1).max(80), role: z.string().max(80), sketch: z.string().max(1000) })).max(8).default([]),
    original_idea: z.string().max(2000).default(""),
  }),
  permission: "creator",
  seriesScoped: false,
  async run(input, ctx) {
    const db = getDb();
    const now = nowIso();
    let slug = slugify(input.title) || "untitled";
    if (await db.findOne("series", { slug })) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
    const id = newId("ser");
    // Administrators create Calm Originals, owned by the official Calm profile.
    const official = isAdmin(ctx.viewer) ? await db.findOne("creator_profiles", { is_official: true }) : null;
    const ownerId = official?.user_id ?? ctx.viewer.user.id;
    const isOfficial = Boolean(official) || ((await db.findOne("creator_profiles", { user_id: ctx.viewer.user.id }))?.is_official ?? false);
    await db.insert("series", {
      id,
      slug,
      creator_id: ownerId,
      title: input.title,
      tagline: input.tagline,
      description: input.synopsis,
      genre: input.genre,
      tags: input.tags,
      status: "draft",
      is_official: isOfficial,
      artwork: { scene: input.scene, palette: paletteFor(input.scene), seed: hashString(`${id}:${input.title}`) },
      narrator_voice_id: "voice_willow",
      soundscape_id: input.scene === "space" ? "snd_space-ambience" : input.scene === "ocean" || input.scene === "coast" ? "snd_ocean-waves" : "snd_forest-night",
      content_rating: "all-ages",
      ai_disclosure: "Written with Calm Storymaker assistance and reviewed by the creator.",
      trending_score: 0,
      popularity: 0,
      created_at: now,
      updated_at: now,
      published_at: null,
    });
    await db.insert("seasons", { id: newId("sea"), series_id: id, number: 1, title: "Season One", synopsis: input.narrative_arc, arc: input.narrative_arc, created_at: now });
    await db.insert("story_bibles", {
      id: newId("bib"),
      series_id: id,
      world_name: input.title.replace(/^The /, ""),
      geography: "",
      culture: "",
      history: "",
      atmosphere: "",
      rules: [],
      themes: [],
      established_facts: [],
      unresolved_threads: [],
      creator_preferences: input.original_idea ? [`Original idea (keep at the heart of the series): ${input.original_idea}`] : [],
      updated_at: now,
    });
    for (const [i, c] of input.characters.entries()) {
      await db.insert("characters", {
        id: newId("chr"),
        series_id: id,
        name: c.name,
        age_range: "",
        personality: c.sketch,
        backstory: "",
        motivations: "",
        narrative_role: c.role,
        voice_profile: "",
        arc: "",
        portrait: { scene: "portrait", palette: [`hsl(${(hashString(c.name) % 360)} 45% 18%)`, `hsl(${(hashString(c.name) + 40) % 360} 40% 30%)`, `hsl(${hashString(c.name) % 360} 70% 78%)`, `hsl(${(hashString(c.name) + 20) % 360} 80% 88%)`], seed: hashString(c.name) + i },
        created_at: now,
        updated_at: now,
      });
    }
    // The idea-development conversation becomes this series' conversation.
    const drafts = await db.list("ai_conversations", { where: { user_id: ctx.viewer.user.id, series_id: null } });
    const conv = ctx.conversationId ? drafts.find((c) => c.id === ctx.conversationId) : drafts.sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))[0];
    if (conv) await db.update("ai_conversations", conv.id, { series_id: id, updated_at: now });
    return {
      summary: `“${input.title}” is saved as a private draft. Next, shall we build the world, deepen the characters or plan Season 1?`,
      series_id: id,
      focus: { section: "overview" },
      cards: [{ type: "suggestions", items: ["Build the world", "Develop the characters", "Plan a 10-episode season"] }],
    };
  },
});

defineTool({
  name: "update_series",
  description: "Update the series title, tagline, synopsis, genre or tags.",
  input: z.object({
    title: z.string().min(2).max(120).optional(),
    tagline: z.string().max(200).optional(),
    description: z.string().max(4000).optional(),
    genre: GenreEnum.optional(),
    tags: z.array(z.string().max(40)).max(12).optional(),
  }),
  permission: "creator",
  seriesScoped: true,
  confirm: (input, ctx) =>
    !ctx.confirmed && (input.title || input.description) ? "This changes your series title or synopsis – your current wording will be replaced." : null,
  async run(input, ctx) {
    const patch = Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined));
    await getDb().update("series", ctx.series!.id, { ...patch, updated_at: nowIso() });
    return { summary: `Updated ${Object.keys(patch).join(", ")}.`, focus: { section: "overview" } };
  },
});

/* ------------------------------------------------------------------ */
/* World Bible                                                         */
/* ------------------------------------------------------------------ */

defineTool({
  name: "create_world",
  description: "Generate a detailed World Bible (geography, culture, history, atmosphere, rules, themes, locations) for the current series.",
  input: z.object({ brief: z.string().max(2000).optional() }),
  permission: "creator",
  seriesScoped: true,
  async confirm(_i, ctx) {
    if (ctx.confirmed) return null;
    const bible = await getDb().findOne("story_bibles", { series_id: ctx.seriesId! });
    if (bible && (bible.geography || bible.culture || bible.rules.length)) return "Your World Bible already has content. New details will be merged in, and empty fields filled.";
    return paidReason("world", "Building the world", ctx);
  },
  async run(input, ctx) {
    const db = getDb();
    const story = await loadStoryContext(ctx.series!.id);
    const { data, meta } = await engine.generateWorld(story, input.brief);
    const b = story.bible;
    const keep = (old: string, next: string) => (old.trim() ? old : next);
    const merged = {
      world_name: b.world_name && b.world_name !== ctx.series!.title.replace(/^The /, "") ? b.world_name : data.world_name,
      geography: keep(b.geography, data.geography),
      culture: keep(b.culture, data.culture),
      history: keep(b.history, data.history),
      atmosphere: keep(b.atmosphere, data.atmosphere),
      rules: [...new Set([...b.rules, ...data.rules])],
      themes: [...new Set([...b.themes, ...data.themes])],
      updated_at: nowIso(),
    };
    const existingBible = await db.findOne("story_bibles", { series_id: ctx.series!.id });
    if (existingBible) await db.update("story_bibles", existingBible.id, merged);
    const known = new Set(story.locations.map((l) => l.name.toLowerCase()));
    for (const l of data.locations) {
      if (known.has(l.name.toLowerCase())) continue;
      await db.insert("locations", { id: newId("loc"), series_id: ctx.series!.id, ...l, created_at: nowIso() });
    }
    await recordCost(ctx, ctx.series!.id, null, meta);
    return { summary: `The world of ${merged.world_name} is taking shape – ${data.locations.length} locations, ${data.rules.length} world rules and its history are in the World Bible. Existing details were kept.`, focus: { section: "world" }, meta };
  },
});

defineTool({
  name: "update_world_bible",
  description: "Edit World Bible fields directly, or add/remove rules, themes, facts, threads and creator preferences.",
  input: z.object({
    world_name: z.string().max(120).optional(),
    geography: z.string().max(4000).optional(),
    culture: z.string().max(4000).optional(),
    history: z.string().max(4000).optional(),
    atmosphere: z.string().max(4000).optional(),
    rules: z.array(z.string().max(400)).max(40).optional(),
    themes: z.array(z.string().max(200)).max(20).optional(),
    established_facts: z.array(z.string().max(400)).max(200).optional(),
    unresolved_threads: z.array(z.string().max(400)).max(60).optional(),
    creator_preferences: z.array(z.string().max(400)).max(40).optional(),
    add_rule: z.string().max(400).optional(),
    add_fact: z.string().max(400).optional(),
    add_thread: z.string().max(400).optional(),
    add_preference: z.string().max(400).optional(),
    resolve_thread: z.string().max(400).optional(),
  }),
  permission: "creator",
  seriesScoped: true,
  async run(input, ctx) {
    const db = getDb();
    const bible = await db.findOne("story_bibles", { series_id: ctx.series!.id });
    if (!bible) throw notFound("Story Bible missing.");
    const { add_rule, add_fact, add_thread, add_preference, resolve_thread, ...fields } = input;
    const patch: Record<string, unknown> = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));
    const append = (key: "rules" | "established_facts" | "unresolved_threads" | "creator_preferences", v?: string) => {
      if (!v) return;
      const base = (patch[key] as string[] | undefined) ?? bible[key];
      patch[key] = [...base, v];
    };
    append("rules", add_rule);
    append("established_facts", add_fact);
    append("unresolved_threads", add_thread);
    append("creator_preferences", add_preference);
    if (resolve_thread) {
      const threads = ((patch.unresolved_threads as string[] | undefined) ?? bible.unresolved_threads).filter((t) => t !== resolve_thread);
      patch.unresolved_threads = threads;
      await db.insert("narrative_events", { id: newId("nev"), series_id: ctx.series!.id, episode_id: null, kind: "thread_resolved", summary: resolve_thread, character_ids: [], created_at: nowIso() });
    }
    await db.update("story_bibles", bible.id, { ...patch, updated_at: nowIso() });
    return { summary: "Story Bible updated.", focus: { section: "world" } };
  },
});

const LocationInput = z.object({ name: z.string().min(1).max(120), description: z.string().max(2000).default(""), recurring: z.boolean().default(true) });

defineTool({
  name: "add_location",
  description: "Add a location to the Story Bible.",
  input: LocationInput,
  permission: "creator",
  seriesScoped: true,
  async run(input, ctx) {
    const loc = await getDb().insert("locations", { id: newId("loc"), series_id: ctx.series!.id, ...input, created_at: nowIso() });
    return { summary: `Added ${loc.name}.`, focus: { section: "world" }, data: loc };
  },
});

defineTool({
  name: "update_location",
  description: "Edit a location.",
  input: z.object({ location_id: z.string(), name: z.string().min(1).max(120).optional(), description: z.string().max(2000).optional(), recurring: z.boolean().optional() }),
  permission: "creator",
  seriesScoped: true,
  async run({ location_id, ...patch }, ctx) {
    const db = getDb();
    const loc = await db.get("locations", location_id);
    if (!loc || loc.series_id !== ctx.series!.id) throw notFound("Location not found.");
    await db.update("locations", loc.id, Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)));
    return { summary: `Updated ${patch.name ?? loc.name}.`, focus: { section: "world" } };
  },
});

defineTool({
  name: "delete_location",
  description: "Delete a location from the Story Bible.",
  input: z.object({ location_id: z.string() }),
  permission: "creator",
  seriesScoped: true,
  confirm: (_i, ctx) => (ctx.confirmed ? null : "This permanently removes the location from your Story Bible."),
  async run({ location_id }, ctx) {
    const db = getDb();
    const loc = await db.get("locations", location_id);
    if (!loc || loc.series_id !== ctx.series!.id) throw notFound("Location not found.");
    await db.remove("locations", loc.id);
    return { summary: `Removed ${loc.name}.`, focus: { section: "world" } };
  },
});

/* ------------------------------------------------------------------ */
/* Characters                                                          */
/* ------------------------------------------------------------------ */

const CharacterFields = z.object({
  name: z.string().min(1).max(80),
  age_range: z.string().max(80).default(""),
  personality: z.string().max(2000).default(""),
  backstory: z.string().max(4000).default(""),
  motivations: z.string().max(2000).default(""),
  narrative_role: z.string().max(120).default(""),
  voice_profile: z.string().max(1000).default(""),
  arc: z.string().max(2000).default(""),
});

defineTool({
  name: "create_character",
  description: "Create characters. Either pass a full `profile` to save exactly what the creator wrote, or a `brief`/`names` to generate new original characters.",
  input: z.object({
    profile: CharacterFields.optional(),
    count: z.number().int().min(1).max(4).default(1),
    brief: z.string().max(2000).optional(),
    names: z.array(z.string().max(80)).max(4).optional(),
  }),
  permission: "creator",
  seriesScoped: true,
  confirm: (input, ctx) => (input.profile ? null : paidReason("characters", "Generating characters", ctx)),
  async run(input, ctx) {
    const db = getDb();
    const now = nowIso();
    let profiles: z.infer<typeof CharacterFields>[];
    let meta;
    if (input.profile) profiles = [input.profile];
    else {
      const story = await loadStoryContext(ctx.series!.id);
      const res = await engine.generateCharacters(story, { count: input.names?.length ?? input.count, brief: input.brief, names: input.names });
      profiles = res.data.characters;
      meta = res.meta;
      await recordCost(ctx, ctx.series!.id, null, res.meta);
    }
    const created = [];
    for (const p of profiles) {
      const h = hashString(`${ctx.series!.id}:${p.name}`);
      const existing = await db.findOne("characters", { series_id: ctx.series!.id, name: p.name });
      if (existing) {
        // Fill only empty fields – never overwrite what the creator already wrote.
        const patch: Record<string, string> = {};
        for (const [k, v] of Object.entries(p)) if (!(existing as unknown as Record<string, string>)[k] && v) patch[k] = v;
        created.push(await db.update("characters", existing.id, { ...patch, updated_at: now }));
        continue;
      }
      created.push(
        await db.insert("characters", {
          id: newId("chr"),
          series_id: ctx.series!.id,
          ...p,
          portrait: { scene: "portrait", palette: [`hsl(${h % 360} 45% 18%)`, `hsl(${(h + 40) % 360} 40% 30%)`, `hsl(${h % 360} 70% 78%)`, `hsl(${(h + 20) % 360} 80% 88%)`], seed: h },
          created_at: now,
          updated_at: now,
        }),
      );
    }
    return { summary: `${created.map((c) => c.name).join(", ")} ${created.length > 1 ? "are" : "is"} now in your cast.`, focus: { section: "characters", id: created[0]?.id }, data: created, meta };
  },
});

defineTool({
  name: "update_character",
  description: "Edit a character's profile fields.",
  input: CharacterFields.partial().extend({ character_id: z.string() }),
  permission: "creator",
  seriesScoped: true,
  async run({ character_id, ...patch }, ctx) {
    const db = getDb();
    const c = await db.get("characters", character_id);
    if (!c || c.series_id !== ctx.series!.id) throw notFound("Character not found.");
    await db.update("characters", c.id, { ...Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)), updated_at: nowIso() });
    return { summary: `Updated ${patch.name ?? c.name}.`, focus: { section: "characters", id: c.id } };
  },
});

defineTool({
  name: "delete_character",
  description: "Remove a character (and their relationships) from the series.",
  input: z.object({ character_id: z.string() }),
  permission: "creator",
  seriesScoped: true,
  confirm: (_i, ctx) => (ctx.confirmed ? null : "Deleting a character can't be undone, and existing scripts may still mention them."),
  async run({ character_id }, ctx) {
    const db = getDb();
    const c = await db.get("characters", character_id);
    if (!c || c.series_id !== ctx.series!.id) throw notFound("Character not found.");
    for (const r of await db.list("character_relationships", { where: { series_id: ctx.series!.id } })) {
      if (r.character_a_id === c.id || r.character_b_id === c.id) await db.remove("character_relationships", r.id);
    }
    await db.remove("characters", c.id);
    return { summary: `${c.name} has been removed.`, focus: { section: "characters" } };
  },
});

defineTool({
  name: "add_relationship",
  description: "Record a relationship between two characters.",
  input: z.object({ character_a_id: z.string(), character_b_id: z.string(), kind: z.string().min(1).max(80), description: z.string().max(1000).default("") }),
  permission: "creator",
  seriesScoped: true,
  async run(input, ctx) {
    const db = getDb();
    const [a, b] = await Promise.all([db.get("characters", input.character_a_id), db.get("characters", input.character_b_id)]);
    if (!a || !b || a.series_id !== ctx.series!.id || b.series_id !== ctx.series!.id) throw notFound("Character not found.");
    if (a.id === b.id) throw badRequest("Choose two different characters.");
    await db.insert("character_relationships", { id: newId("rel"), series_id: ctx.series!.id, ...input, created_at: nowIso() });
    return { summary: `${a.name} & ${b.name}: ${input.kind}.`, focus: { section: "relationships" } };
  },
});

defineTool({
  name: "delete_relationship",
  description: "Remove a relationship between characters.",
  input: z.object({ relationship_id: z.string() }),
  permission: "creator",
  seriesScoped: true,
  async run({ relationship_id }, ctx) {
    const db = getDb();
    const r = await db.get("character_relationships", relationship_id);
    if (!r || r.series_id !== ctx.series!.id) throw notFound("Relationship not found.");
    await db.remove("character_relationships", r.id);
    return { summary: "Relationship removed.", focus: { section: "relationships" } };
  },
});

/* ------------------------------------------------------------------ */
/* Seasons & episodes                                                  */
/* ------------------------------------------------------------------ */

async function seasonByNumber(seriesId: string, number: number) {
  const db = getDb();
  const existing = await db.findOne("seasons", { series_id: seriesId, number });
  if (existing) return existing;
  return db.insert("seasons", { id: newId("sea"), series_id: seriesId, number, title: `Season ${number}`, synopsis: "", arc: "", created_at: nowIso() });
}

defineTool({
  name: "generate_season_outline",
  description: "Plan a season: synopsis, arc, milestones and a titled, summarised list of new planned episodes appended to the season.",
  input: z.object({ season_number: z.number().int().min(1).max(20).default(1), episode_count: z.number().int().min(1).max(30).default(10), brief: z.string().max(2000).optional() }),
  permission: "creator",
  seriesScoped: true,
  confirm: (_i, ctx) => paidReason("outline", "Planning a season", ctx),
  async run(input, ctx) {
    const db = getDb();
    const story = await loadStoryContext(ctx.series!.id);
    const { data, meta } = await engine.generateSeasonOutline(story, { episodeCount: input.episode_count, seasonNumber: input.season_number, brief: input.brief });
    const season = await seasonByNumber(ctx.series!.id, input.season_number);
    await db.update("seasons", season.id, { synopsis: season.synopsis || data.synopsis, arc: data.arc });
    const existing = await db.list("episodes", { where: { season_id: season.id } });
    let n = existing.reduce((m, e) => Math.max(m, e.number), 0);
    const now = nowIso();
    for (const e of data.episodes.slice(0, input.episode_count)) {
      n += 1;
      await db.insert("episodes", {
        id: newId("ep"),
        series_id: ctx.series!.id,
        season_id: season.id,
        number: n,
        title: e.title,
        summary: e.summary,
        duration_seconds: 30 * 60,
        status: "planned",
        release_at: null,
        published_at: null,
        audio_asset_id: null,
        is_preview: n === 1 && input.season_number === 1,
        created_at: now,
        updated_at: now,
      });
    }
    const bible = await db.findOne("story_bibles", { series_id: ctx.series!.id });
    if (bible && data.milestones.length) {
      await db.update("story_bibles", bible.id, { unresolved_threads: [...new Set([...bible.unresolved_threads, ...data.milestones.slice(0, 2)])], updated_at: now });
    }
    await recordCost(ctx, ctx.series!.id, null, meta);
    return { summary: `Season ${input.season_number} is planned: ${data.episodes.length} episodes, from “${data.episodes[0]?.title}” to “${data.episodes[data.episodes.length - 1]?.title}”. You can rename, reorder or rewrite any of them.`, focus: { section: "seasons", id: season.id }, meta };
  },
});

defineTool({
  name: "create_episode",
  description: "Add a single planned episode (for example after accepting a 'Continue this story' direction).",
  input: z.object({ title: z.string().min(1).max(160), summary: z.string().max(2000).default(""), season_number: z.number().int().min(1).max(20).optional() }),
  permission: "creator",
  seriesScoped: true,
  async run(input, ctx) {
    const db = getDb();
    const seasons = await db.list("seasons", { where: { series_id: ctx.series!.id } });
    const number = input.season_number ?? seasons.reduce((m, s) => Math.max(m, s.number), 1);
    const season = await seasonByNumber(ctx.series!.id, number);
    const eps = await db.list("episodes", { where: { season_id: season.id } });
    const now = nowIso();
    const ep = await db.insert("episodes", {
      id: newId("ep"),
      series_id: ctx.series!.id,
      season_id: season.id,
      number: eps.reduce((m, e) => Math.max(m, e.number), 0) + 1,
      title: input.title,
      summary: input.summary,
      duration_seconds: 30 * 60,
      status: "planned",
      release_at: null,
      published_at: null,
      audio_asset_id: null,
      is_preview: eps.length === 0 && number === 1,
      created_at: now,
      updated_at: now,
    });
    return { summary: `Added Episode ${ep.number}: “${ep.title}”. Say “write it” when you're ready for the script.`, focus: { section: "episodes", id: ep.id }, data: ep };
  },
});

defineTool({
  name: "update_episode",
  description: "Edit an episode's title, summary or target duration.",
  input: z.object({ episode_id: z.string(), title: z.string().min(1).max(160).optional(), summary: z.string().max(2000).optional(), duration_minutes: z.number().int().min(5).max(90).optional() }),
  permission: "creator",
  seriesScoped: true,
  async run({ episode_id, duration_minutes, ...patch }, ctx) {
    const ep = await getEpisodeInSeries(episode_id, ctx.series!.id);
    if (["published", "approved", "in_review"].includes(ep.status) && (patch.title || patch.summary)) {
      throw badRequest("This episode is in review or published – request changes through editorial first.");
    }
    await getDb().update("episodes", ep.id, {
      ...Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)),
      ...(duration_minutes ? { duration_seconds: duration_minutes * 60 } : {}),
      updated_at: nowIso(),
    });
    return { summary: `Updated Episode ${ep.number}.`, focus: { section: "episodes", id: ep.id } };
  },
});

defineTool({
  name: "reorder_episodes",
  description: "Set the running order of episodes within a season.",
  input: z.object({ season_id: z.string(), episode_ids: z.array(z.string()).min(1).max(100) }),
  permission: "creator",
  seriesScoped: true,
  async run(input, ctx) {
    const db = getDb();
    const eps = await db.list("episodes", { where: { season_id: input.season_id } });
    if (!eps.length || eps.some((e) => e.series_id !== ctx.series!.id)) throw notFound("Season not found.");
    if (eps.some((e) => ["published", "approved", "in_review"].includes(e.status))) throw badRequest("Released or in-review episodes can't be reordered.");
    const ids = new Set(eps.map((e) => e.id));
    if (input.episode_ids.length !== eps.length || input.episode_ids.some((i) => !ids.has(i))) throw badRequest("Pass every episode in the season exactly once.");
    for (const [i, id] of input.episode_ids.entries()) await db.update("episodes", id, { number: i + 1, is_preview: i === 0, updated_at: nowIso() });
    return { summary: "Episode order updated.", focus: { section: "seasons", id: input.season_id } };
  },
});

defineTool({
  name: "delete_episode",
  description: "Delete an unreleased episode and its scripts.",
  input: z.object({ episode_id: z.string() }),
  permission: "creator",
  seriesScoped: true,
  confirm: (_i, ctx) => (ctx.confirmed ? null : "This deletes the episode and all of its script versions."),
  async run({ episode_id }, ctx) {
    const db = getDb();
    const ep = await getEpisodeInSeries(episode_id, ctx.series!.id);
    if (["published", "approved"].includes(ep.status)) throw badRequest("Published episodes are removed through the editorial takedown process.");
    const script = await db.findOne("scripts", { episode_id: ep.id });
    if (script) {
      for (const v of await db.list("script_versions", { where: { script_id: script.id } })) await db.remove("script_versions", v.id);
      await db.remove("scripts", script.id);
    }
    await db.remove("episodes", ep.id);
    return { summary: `Deleted “${ep.title}”.`, focus: { section: "seasons" } };
  },
});

defineTool({
  name: "continue_story",
  description: "'Continue This Story': propose the next episode from the Story Bible and recent events. Returns a proposal card; nothing is saved until the creator accepts.",
  input: z.object({ brief: z.string().max(2000).optional() }),
  permission: "creator",
  seriesScoped: true,
  confirm: (_i, ctx) => paidReason("direction", "Proposing the next episode", ctx),
  async run(input, ctx) {
    const story = await loadStoryContext(ctx.series!.id);
    const { proposal, meta } = await engine.proposeNextDirection(story, input.brief);
    await recordCost(ctx, ctx.series!.id, null, meta);
    return { summary: `Here's where the story could go next. Accept it, edit it, or ask for another direction.`, cards: [{ type: "direction", proposal }], data: proposal, meta };
  },
});

defineTool({
  name: "generate_episode_outline",
  description: "Draft a beat-by-beat outline for one episode and save it as the episode summary.",
  input: z.object({ episode_id: z.string(), brief: z.string().max(2000).optional() }),
  permission: "creator",
  seriesScoped: true,
  confirm: (_i, ctx) => paidReason("direction", "Outlining the episode", ctx),
  async run(input, ctx) {
    const ep = await getEpisodeInSeries(input.episode_id, ctx.series!.id);
    const story = await loadStoryContext(ctx.series!.id);
    const trimmed = { ...story, episodes: story.episodes.slice(0, story.episodes.findIndex((e) => e.id === ep.id)) };
    const { proposal, meta } = await engine.proposeNextDirection(trimmed, `This is Episode ${ep.number}, "${ep.title}": ${ep.summary}. ${input.brief ?? ""}`);
    const summary = `${ep.summary || proposal.summary}\n\nBeats:\n${proposal.beats.map((b) => `• ${b}`).join("\n")}`;
    await getDb().update("episodes", ep.id, { summary, updated_at: nowIso() });
    await recordCost(ctx, ctx.series!.id, ep.id, meta);
    return { summary: `Outlined Episode ${ep.number} in ${proposal.beats.length} beats.`, focus: { section: "episodes", id: ep.id }, meta };
  },
});

/* ------------------------------------------------------------------ */
/* Scripts                                                             */
/* ------------------------------------------------------------------ */

const ScriptSettingsInput = z.object({
  duration_minutes: z.number().int().min(5).max(90).optional(),
  mood: z.enum(["dreamy", "cosy", "wistful", "wonder", "tender"]).optional(),
  perspective: z.enum(["third", "first", "second"]).optional(),
  style: z.enum(["lyrical", "storybook", "literary", "minimal"]).optional(),
  dialogue: z.enum(["none", "light", "moderate"]).optional(),
  romance: z.enum(["none", "gentle", "warm"]).optional(),
  pacing: z.enum(["very-slow", "slow", "gentle"]).optional(),
});

defineTool({
  name: "write_episode",
  description: "Write (or rewrite) the full narration script for an episode using the Story Bible. Saves a new script version – earlier versions are kept – and runs a continuity check.",
  input: z.object({ episode_id: z.string(), settings: ScriptSettingsInput.optional() }),
  permission: "creator",
  seriesScoped: true,
  confirm: (_i, ctx) => paidReason("script", "Writing a full episode", ctx),
  async run(input, ctx) {
    const ep = await getEpisodeInSeries(input.episode_id, ctx.series!.id);
    if (["published", "approved", "in_review"].includes(ep.status)) throw badRequest("This episode is in review or published.");
    const settingsPatch = Object.fromEntries(Object.entries(input.settings ?? {}).filter(([, v]) => v !== undefined)) as Partial<ScriptSettings>;
    const script = await getOrCreateScript(ep, settingsPatch);
    const story = await loadStoryContext(ctx.series!.id);
    const { content, meta } = await engine.writeEpisodeScript(story, ep.id, script.settings);
    const version = await addScriptVersion(script, {
      content,
      source: "ai",
      note: `Written with ${meta.simulated ? "the simulator" : meta.model}`,
      provider: meta.provider,
      model: meta.model,
      simulated: meta.simulated,
      userId: ctx.viewer.user.id,
    });
    await getDb().update("episodes", ep.id, { duration_seconds: script.settings.duration_minutes * 60, updated_at: nowIso() });
    await recordCost(ctx, ctx.series!.id, ep.id, meta);
    const { report } = await engine.reviewContinuity(story, content);
    return {
      summary: `Episode ${ep.number}, “${ep.title}”, is written – ${version.word_count.toLocaleString()} words (version ${version.version}).${report.issues.some((i) => i.severity === "conflict") ? " I spotted a possible continuity conflict – take a look below." : ""}`,
      focus: { section: "script", id: ep.id },
      cards: [{ type: "continuity", report }],
      meta,
    };
  },
});

defineTool({
  name: "save_script",
  description: "Save the creator's edited script text as a new version.",
  input: z.object({ episode_id: z.string(), content: z.string().min(1).max(200000), note: z.string().max(200).default("Edited by creator") }),
  permission: "creator",
  seriesScoped: true,
  async run(input, ctx) {
    const ep = await getEpisodeInSeries(input.episode_id, ctx.series!.id);
    if (["published", "approved", "in_review"].includes(ep.status)) throw badRequest("This episode is in review or published.");
    const script = await getOrCreateScript(ep);
    const current = await currentScriptText(ep.id);
    if (current?.version.content === input.content) return { summary: "No changes to save.", focus: { section: "script", id: ep.id } };
    const v = await addScriptVersion(script, { content: input.content, source: "human", note: input.note, userId: ctx.viewer.user.id });
    return { summary: `Saved version ${v.version}.`, focus: { section: "script", id: ep.id }, data: v };
  },
});

defineTool({
  name: "update_script_settings",
  description: "Change an episode's script settings (duration, mood, perspective, style, dialogue, romance, pacing) without rewriting.",
  input: z.object({ episode_id: z.string(), settings: ScriptSettingsInput }),
  permission: "creator",
  seriesScoped: true,
  async run(input, ctx) {
    const ep = await getEpisodeInSeries(input.episode_id, ctx.series!.id);
    const patch = Object.fromEntries(Object.entries(input.settings).filter(([, v]) => v !== undefined)) as Partial<ScriptSettings>;
    await getOrCreateScript(ep, patch);
    return { summary: "Script settings updated.", focus: { section: "script", id: ep.id } };
  },
});

defineTool({
  name: "restore_script_version",
  description: "Roll back to an earlier script version (saved as a new version, so nothing is lost).",
  input: z.object({ version_id: z.string() }),
  permission: "creator",
  seriesScoped: true,
  async run({ version_id }, ctx) {
    const db = getDb();
    const v = await db.get("script_versions", version_id);
    if (!v) throw notFound("Version not found.");
    const script = await db.get("scripts", v.script_id);
    if (!script || script.series_id !== ctx.series!.id) throw notFound("Version not found.");
    const nv = await addScriptVersion(script, { content: v.content, source: "human", note: `Restored version ${v.version}`, userId: ctx.viewer.user.id });
    return { summary: `Restored version ${v.version} (saved as version ${nv.version}).`, focus: { section: "script", id: script.episode_id } };
  },
});

defineTool({
  name: "rewrite_script_section",
  description:
    "Rewrite part of the current script. Provide the exact `passage` text (or character offsets) and an instruction: rewrite, expand, shorten, atmospheric, dialogue, sensory, relaxing, ending, continuity. Saves a new version.",
  input: z.object({
    episode_id: z.string(),
    instruction: z.enum(["rewrite", "expand", "shorten", "atmospheric", "dialogue", "sensory", "relaxing", "ending", "continuity"]),
    passage: z.string().max(20000).optional(),
    start: z.number().int().min(0).optional(),
    end: z.number().int().min(0).optional(),
    custom: z.string().max(1000).optional(),
  }),
  permission: "creator",
  seriesScoped: true,
  confirm: (_i, ctx) => paidReason("rewrite", "Rewriting a passage", ctx),
  async run(input, ctx) {
    const ep = await getEpisodeInSeries(input.episode_id, ctx.series!.id);
    const current = await currentScriptText(ep.id);
    if (!current) throw badRequest("Write the episode first.");
    const text = current.version.content;
    let start = input.start ?? -1;
    let end = input.end ?? -1;
    if (input.passage && (start < 0 || end <= start)) {
      start = text.indexOf(input.passage);
      end = start + input.passage.length;
    }
    if (input.instruction === "ending" && start < 0) {
      // Default to the final paragraph for "change the ending".
      const lastBreak = text.lastIndexOf("\n\n");
      start = lastBreak >= 0 ? lastBreak + 2 : 0;
      end = text.length;
    }
    if (start < 0 || end <= start || end > text.length) throw badRequest("Select the passage you'd like me to change.");
    const passage = text.slice(start, end);
    const story = await loadStoryContext(ctx.series!.id);
    const { text: replacement, meta } = await engine.rewritePassage(story, { passage, instruction: input.instruction, custom: input.custom, before: text.slice(0, start), after: text.slice(end) });
    const next = text.slice(0, start) + replacement + text.slice(end);
    const v = await addScriptVersion(current.script, {
      content: next,
      source: "ai_rewrite",
      note: `${input.instruction}${input.custom ? `: ${input.custom}` : ""}`,
      provider: meta.provider,
      model: meta.model,
      simulated: meta.simulated,
      userId: ctx.viewer.user.id,
    });
    await recordCost(ctx, ctx.series!.id, ep.id, meta);
    return { summary: `Done – I applied “${input.instruction}” to the selected passage (version ${v.version}). You can roll back any time.`, focus: { section: "script", id: ep.id }, data: { start, end: start + replacement.length }, meta };
  },
});

defineTool({
  name: "check_story_continuity",
  description: "Check an episode's current script against the Story Bible and flag contradictions. Never changes the script.",
  input: z.object({ episode_id: z.string() }),
  permission: "creator",
  seriesScoped: true,
  async run({ episode_id }, ctx) {
    const ep = await getEpisodeInSeries(episode_id, ctx.series!.id);
    const current = await currentScriptText(ep.id);
    if (!current) throw badRequest("There's no script to check yet.");
    const story = await loadStoryContext(ctx.series!.id);
    const { report, meta } = await engine.reviewContinuity(story, current.version.content);
    await recordCost(ctx, ctx.series!.id, ep.id, meta);
    return { summary: report.summary, cards: [{ type: "continuity", report }], focus: { section: "script", id: ep.id }, data: report };
  },
});

defineTool({
  name: "approve_script",
  description: "Mark the current script as final. Its events are added to the series' story memory for future episodes.",
  input: z.object({ episode_id: z.string(), facts: z.array(z.string().max(400)).max(10).default([]) }),
  permission: "creator",
  seriesScoped: true,
  async run(input, ctx) {
    const db = getDb();
    const ep = await getEpisodeInSeries(input.episode_id, ctx.series!.id);
    if (!(await currentScriptText(ep.id))) throw badRequest("Write the script first.");
    await db.update("episodes", ep.id, { status: ep.audio_asset_id ? "audio_ready" : "script_ready", updated_at: nowIso() });
    const existing = await db.findOne("narrative_events", { episode_id: ep.id, kind: "event" });
    if (existing) await db.update("narrative_events", existing.id, { summary: ep.summary });
    else await db.insert("narrative_events", { id: newId("nev"), series_id: ctx.series!.id, episode_id: ep.id, kind: "event", summary: ep.summary, character_ids: [], created_at: nowIso() });
    if (input.facts.length) {
      const bible = await db.findOne("story_bibles", { series_id: ctx.series!.id });
      if (bible) await db.update("story_bibles", bible.id, { established_facts: [...bible.established_facts, ...input.facts], updated_at: nowIso() });
    }
    return { summary: `Episode ${ep.number}'s script is approved and remembered in the Story Bible. Ready to produce audio.`, focus: { section: "script", id: ep.id } };
  },
});
