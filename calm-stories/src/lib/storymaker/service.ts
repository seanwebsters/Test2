/**
 * Storymaker domain operations. Shared by the AI tool registry, the REST API
 * and the production engine, so every path goes through the same validation
 * and authorisation.
 */
import "server-only";
import { generate, type GenerationScope } from "@/lib/ai";
import {
  analyseContinuity,
  analyseSleepSuitability,
  mockCharacters,
  mockConcept,
  mockDirection,
  mockEpisodeOutline,
  mockRewrite,
  mockScript,
  mockSeasonOutline,
  mockWorld,
} from "@/lib/ai/mock";
import {
  CharactersSchema,
  ConceptSchema,
  ContinuitySchema,
  DirectionSchema,
  EpisodeOutlineSchema,
  RewriteSchema,
  ScriptSchema,
  SeasonOutlineSchema,
  SleepCheckSchema,
  WorldSchema,
} from "@/lib/ai/schemas";
import { HttpError } from "@/lib/api";
import { AuthError, canEditSeries, requireCreator } from "@/lib/auth/policy";
import type { Viewer } from "@/lib/auth/viewer";
import { getDb } from "@/lib/db";
import { PALETTES } from "@/lib/seed/catalog";
import {
  DEFAULT_SCRIPT_SETTINGS,
  type ArtworkSpec,
  type Character,
  type ConceptProposal,
  type ContinuityReport,
  type DirectionProposal,
  type EditorialReview,
  type Episode,
  type GenerationMeta,
  type Genre,
  type ReviewCheck,
  type SceneKind,
  type Script,
  type ScriptSettings,
  type ScriptVersion,
  type Series,
  type StoryBible,
} from "@/lib/types";
import { hashString, newId, nowIso, pick, prng, slugify, wordCount } from "@/lib/util";
import { loadStoryContext, renderContext, type StoryContext } from "./context";

type Editor = Viewer & { user: NonNullable<Viewer["user"]> };

export const AI_DISCLOSURE = "Created with AI assistance in Calm Storymaker and reviewed by the creator.";

/* ------------------------------------------------------------------ access */

export async function editableSeries(viewer: Viewer, seriesId: string): Promise<{ series: Series; viewer: Editor }> {
  requireCreator(viewer);
  const series = await getDb().get("series", seriesId);
  if (!series) throw new HttpError(404, "Series not found");
  if (!canEditSeries(viewer, series)) throw new AuthError("You can only edit your own series.", 404);
  return { series, viewer };
}

export async function editableEpisode(viewer: Viewer, episodeId: string) {
  const ep = await getDb().get("episodes", episodeId);
  if (!ep) throw new HttpError(404, "Episode not found");
  const { series } = await editableSeries(viewer, ep.series_id);
  return { ep, series, viewer: viewer as Editor };
}

function scope(viewer: Editor, seriesId: string | null, extra: Partial<GenerationScope> = {}): GenerationScope {
  return { userId: viewer.user.id, seriesId, ...extra };
}

/* ------------------------------------------------------------------ concept & series */

export async function proposeConcept(viewer: Viewer, idea: string, conversationId?: string | null): Promise<{ proposal: ConceptProposal; meta: GenerationMeta }> {
  requireCreator(viewer);
  const clean = idea.trim().slice(0, 4000);
  if (clean.length < 3) throw new HttpError(400, "Tell me a little more about your idea.");
  const { value, meta } = await generate(
    { task: "concept", prompt: `Creator's idea (keep it intact):\n"""${clean}"""`, schema: ConceptSchema, mock: () => mockConcept(clean) },
    { userId: viewer.user.id, conversationId },
  );
  return { proposal: { ...value, original_idea: clean }, meta };
}

function artworkFor(scene: SceneKind, seedText: string): ArtworkSpec {
  const byScene: Partial<Record<SceneKind, keyof typeof PALETTES>> = {
    kingdom: "moon",
    forest: "forest",
    cabin: "snow",
    space: "space",
    ocean: "sea",
    coast: "sea",
    garden: "rose",
    library: "ember",
    village: "dusk",
    desert: "sand",
    aurora: "aurora",
    city: "dusk",
    lake: "aurora",
  };
  return { scene, palette: PALETTES[byScene[scene] ?? "dusk"], seed: hashString(seedText) };
}

async function uniqueSlug(title: string): Promise<string> {
  const db = getDb();
  const base = slugify(title) || "untitled-story";
  let slug = base;
  for (let i = 2; await db.findOne("series", { slug }); i++) slug = `${base}-${i}`;
  return slug;
}

export interface CreateSeriesInput {
  title: string;
  tagline: string;
  synopsis: string;
  genre: Genre;
  tags: string[];
  scene: SceneKind;
  narrative_arc?: string;
  original_idea?: string;
  characters?: { name: string; role: string; sketch: string }[];
}

/** Creates a private draft series with an initial Story Bible and characters. */
export async function createSeries(viewer: Viewer, input: CreateSeriesInput): Promise<Series> {
  requireCreator(viewer);
  const db = getDb();
  const now = nowIso();
  const id = newId("series");
  const series: Series = {
    id,
    slug: await uniqueSlug(input.title),
    creator_id: viewer.user.id,
    title: input.title.trim().slice(0, 120),
    tagline: input.tagline.trim().slice(0, 200),
    description: input.synopsis.trim().slice(0, 2000),
    genre: input.genre,
    tags: input.tags.slice(0, 8),
    status: "draft",
    is_official: false,
    artwork: artworkFor(input.scene, id),
    narrator_voice_id: null,
    soundscape_id: null,
    content_rating: "all-ages",
    ai_disclosure: AI_DISCLOSURE,
    trending_score: 0,
    popularity: 0,
    created_at: now,
    updated_at: now,
    published_at: null,
  };
  await db.insert("series", series);
  await db.insert("story_bibles", {
    id: `bible-${id}`,
    series_id: id,
    world_name: "",
    geography: "",
    culture: "",
    history: "",
    atmosphere: "",
    rules: [],
    themes: [],
    established_facts: [],
    unresolved_threads: input.narrative_arc ? [input.narrative_arc] : [],
    creator_preferences: input.original_idea ? [`Original idea: ${input.original_idea}`] : [],
    updated_at: now,
  });
  for (const c of input.characters ?? []) {
    await insertCharacter(series, { name: c.name, narrative_role: c.role, personality: c.sketch });
  }
  await db.insert("seasons", { id: newId("season"), series_id: id, number: 1, title: "Season One", synopsis: input.synopsis, arc: input.narrative_arc ?? "", created_at: now });
  return series;
}

export type SeriesPatch = Partial<Pick<Series, "title" | "tagline" | "description" | "genre" | "tags" | "content_rating">>;

export async function updateSeries(viewer: Viewer, seriesId: string, patch: SeriesPatch): Promise<Series> {
  const { series } = await editableSeries(viewer, seriesId);
  if (series.status === "removed") throw new HttpError(409, "This series was removed and can't be edited.");
  const clean: SeriesPatch = { ...patch };
  if (clean.title) clean.title = clean.title.trim().slice(0, 120);
  if (clean.tags) clean.tags = clean.tags.slice(0, 8);
  return getDb().update("series", seriesId, { ...clean, updated_at: nowIso() });
}

export async function generateSynopsis(viewer: Viewer, seriesId: string): Promise<{ series: Series; meta: GenerationMeta }> {
  const { viewer: v } = await editableSeries(viewer, seriesId);
  const ctx = await loadStoryContext(seriesId);
  const { value, meta } = await generate(
    {
      task: "concept",
      prompt: `Rewrite the series title, tagline and synopsis so they reflect the story so far. Keep the creator's idea.\n\n${renderContext(ctx)}`,
      schema: ConceptSchema,
      mock: () => ({ ...mockConcept(`${ctx.series.title}. ${ctx.series.description}`), title: ctx.series.title }),
    },
    scope(v, seriesId),
  );
  const series = await getDb().update("series", seriesId, { tagline: value.tagline, description: value.synopsis, updated_at: nowIso() });
  return { series, meta };
}

/* ------------------------------------------------------------------ world */

function bibleHasContent(b: StoryBible | null): boolean {
  return !!b && !!(b.world_name || b.geography || b.culture || b.history || b.atmosphere || b.rules.length);
}

export async function worldExists(seriesId: string): Promise<boolean> {
  return bibleHasContent(await getDb().findOne("story_bibles", { series_id: seriesId }));
}

/**
 * Generates the World Bible. Existing established facts, threads and
 * preferences are always kept; only descriptive fields are (re)written.
 */
export async function createWorld(viewer: Viewer, seriesId: string, brief?: string): Promise<{ bible: StoryBible; meta: GenerationMeta }> {
  const { viewer: v } = await editableSeries(viewer, seriesId);
  const ctx = await loadStoryContext(seriesId);
  const { value, meta } = await generate(
    { task: "world", prompt: `${brief ? `Creator's direction: ${brief}\n\n` : ""}${renderContext(ctx)}`, schema: WorldSchema, mock: () => mockWorld(ctx) },
    scope(v, seriesId),
  );
  const db = getDb();
  const prev = ctx.bible;
  const bible: StoryBible = {
    id: prev?.id ?? `bible-${seriesId}`,
    series_id: seriesId,
    world_name: value.world_name,
    geography: value.geography,
    culture: value.culture,
    history: value.history,
    atmosphere: value.atmosphere,
    rules: value.rules,
    themes: value.themes,
    established_facts: prev?.established_facts ?? [],
    unresolved_threads: prev?.unresolved_threads ?? [],
    creator_preferences: prev?.creator_preferences ?? [],
    updated_at: nowIso(),
  };
  await db.upsert("story_bibles", bible);
  const known = new Set(ctx.locations.map((l) => l.name.toLowerCase()));
  for (const loc of value.locations) {
    if (known.has(loc.name.toLowerCase())) continue;
    await db.insert("locations", { id: newId("loc"), series_id: seriesId, name: loc.name, description: loc.description, recurring: true, created_at: nowIso() });
  }
  return { bible, meta };
}

export type BiblePatch = Partial<Omit<StoryBible, "id" | "series_id" | "updated_at">>;

/** Lists entries that a patch would remove from the Story Bible. */
export async function bibleRemovals(seriesId: string, patch: BiblePatch): Promise<string[]> {
  const prev = await getDb().findOne("story_bibles", { series_id: seriesId });
  if (!prev) return [];
  const removed: string[] = [];
  for (const key of ["rules", "established_facts", "unresolved_threads", "creator_preferences", "themes"] as const) {
    const next = patch[key];
    if (next) removed.push(...prev[key].filter((x) => !next.includes(x)));
  }
  return removed;
}

export async function updateWorldBible(viewer: Viewer, seriesId: string, patch: BiblePatch): Promise<StoryBible> {
  await editableSeries(viewer, seriesId);
  const db = getDb();
  const prev = await db.findOne("story_bibles", { series_id: seriesId });
  const base: StoryBible = prev ?? {
    id: `bible-${seriesId}`,
    series_id: seriesId,
    world_name: "",
    geography: "",
    culture: "",
    history: "",
    atmosphere: "",
    rules: [],
    themes: [],
    established_facts: [],
    unresolved_threads: [],
    creator_preferences: [],
    updated_at: nowIso(),
  };
  const next: StoryBible = { ...base, ...patch, id: base.id, series_id: seriesId, updated_at: nowIso() };
  return db.upsert("story_bibles", next);
}

export async function addLocation(viewer: Viewer, seriesId: string, name: string, description: string) {
  await editableSeries(viewer, seriesId);
  return getDb().insert("locations", { id: newId("loc"), series_id: seriesId, name: name.trim(), description: description.trim(), recurring: true, created_at: nowIso() });
}

/* ------------------------------------------------------------------ characters */

async function insertCharacter(series: Series, c: Partial<Character> & { name: string }): Promise<Character> {
  const id = newId("char");
  const now = nowIso();
  const row: Character = {
    id,
    series_id: series.id,
    name: c.name.trim().slice(0, 80),
    age_range: c.age_range ?? "",
    personality: c.personality ?? "",
    backstory: c.backstory ?? "",
    motivations: c.motivations ?? "",
    narrative_role: c.narrative_role ?? "",
    voice_profile: c.voice_profile ?? "",
    arc: c.arc ?? "",
    portrait: { scene: "portrait", palette: series.artwork.palette, seed: hashString(id) },
    created_at: now,
    updated_at: now,
  };
  return getDb().insert("characters", row);
}

export async function createCharacters(
  viewer: Viewer,
  seriesId: string,
  opts: { brief?: string; count?: number },
): Promise<{ characters: Character[]; meta: GenerationMeta }> {
  const { series, viewer: v } = await editableSeries(viewer, seriesId);
  const ctx = await loadStoryContext(seriesId);
  const count = Math.min(4, Math.max(1, opts.count ?? 1));
  const named = opts.brief ? /(?:named|called) ([A-Z][\w'-]+)/.exec(opts.brief)?.[1] : undefined;
  if (named && ctx.characters.some((c) => c.name.toLowerCase() === named.toLowerCase())) {
    throw new HttpError(409, `${named} is already a character in this series. Open Characters to edit them.`);
  }
  const { value, meta } = await generate(
    {
      task: "characters",
      prompt: `Create ${count} new character${count === 1 ? "" : "s"}.${opts.brief ? ` Creator's brief: ${opts.brief}` : ""} Don't duplicate existing characters.\n\n${renderContext(ctx)}`,
      schema: CharactersSchema,
      mock: () => mockCharacters(ctx, count, opts.brief),
    },
    scope(v, seriesId),
  );
  const existingNames = new Set(ctx.characters.map((c) => c.name.toLowerCase()));
  const created: Character[] = [];
  for (const c of value.characters.slice(0, count)) {
    if (existingNames.has(c.name.toLowerCase())) continue;
    created.push(await insertCharacter(series, c));
  }
  const all = [...ctx.characters, ...created];
  const byName = (n: string) => all.find((c) => c.name.toLowerCase() === n.toLowerCase());
  for (const r of value.relationships) {
    const a = byName(r.a);
    const b = byName(r.b);
    if (!a || !b || a.id === b.id) continue;
    if (!created.some((c) => c.id === a.id || c.id === b.id)) continue;
    await getDb().insert("character_relationships", { id: newId("rel"), series_id: seriesId, character_a_id: a.id, character_b_id: b.id, kind: r.kind, description: r.description, created_at: nowIso() });
  }
  return { characters: created, meta };
}

export type CharacterPatch = Partial<Pick<Character, "name" | "age_range" | "personality" | "backstory" | "motivations" | "narrative_role" | "voice_profile" | "arc">>;

export async function addCharacter(viewer: Viewer, seriesId: string, fields: CharacterPatch & { name: string }): Promise<Character> {
  const { series } = await editableSeries(viewer, seriesId);
  return insertCharacter(series, fields);
}

async function editableCharacter(viewer: Viewer, characterId: string) {
  const c = await getDb().get("characters", characterId);
  if (!c) throw new HttpError(404, "Character not found");
  await editableSeries(viewer, c.series_id);
  return c;
}

export async function updateCharacter(viewer: Viewer, characterId: string, patch: CharacterPatch): Promise<Character> {
  await editableCharacter(viewer, characterId);
  return getDb().update("characters", characterId, { ...patch, updated_at: nowIso() });
}

export async function deleteCharacter(viewer: Viewer, characterId: string): Promise<Character> {
  const c = await editableCharacter(viewer, characterId);
  const db = getDb();
  for (const r of await db.list("character_relationships", { where: { series_id: c.series_id } })) {
    if (r.character_a_id === c.id || r.character_b_id === c.id) await db.remove("character_relationships", r.id);
  }
  await db.remove("characters", c.id);
  return c;
}

export async function setRelationship(viewer: Viewer, seriesId: string, aId: string, bId: string, kind: string, description: string) {
  await editableSeries(viewer, seriesId);
  const db = getDb();
  const [a, b] = await Promise.all([db.get("characters", aId), db.get("characters", bId)]);
  if (!a || !b || a.series_id !== seriesId || b.series_id !== seriesId || a.id === b.id) throw new HttpError(400, "Pick two different characters from this series.");
  const existing = (await db.list("character_relationships", { where: { series_id: seriesId } })).find(
    (r) => (r.character_a_id === aId && r.character_b_id === bId) || (r.character_a_id === bId && r.character_b_id === aId),
  );
  if (existing) return db.update("character_relationships", existing.id, { kind, description });
  return db.insert("character_relationships", { id: newId("rel"), series_id: seriesId, character_a_id: aId, character_b_id: bId, kind, description, created_at: nowIso() });
}

/* ------------------------------------------------------------------ seasons & episodes */

export async function generateSeasonOutline(
  viewer: Viewer,
  seriesId: string,
  opts: { episodeCount?: number; brief?: string; durationMinutes?: number },
): Promise<{ seasonId: string; episodes: Episode[]; meta: GenerationMeta }> {
  const { viewer: v } = await editableSeries(viewer, seriesId);
  const ctx = await loadStoryContext(seriesId);
  const n = Math.min(12, Math.max(1, opts.episodeCount ?? 6));
  const { value, meta } = await generate(
    {
      task: "outline",
      prompt: `Plan a season of exactly ${n} episodes.${opts.brief ? ` Creator's direction: ${opts.brief}` : ""}\n\n${renderContext(ctx)}`,
      schema: SeasonOutlineSchema,
      mock: () => mockSeasonOutline(ctx, n),
    },
    scope(v, seriesId),
  );
  const db = getDb();
  const now = nowIso();
  // Fill the most recent season if it has no episodes yet; otherwise start a new one.
  const last = ctx.seasons[ctx.seasons.length - 1];
  const lastEmpty = last && !ctx.episodes.some((e) => e.season_id === last.id);
  const seasonId = lastEmpty ? last.id : newId("season");
  if (lastEmpty) await db.update("seasons", last.id, { title: value.title, synopsis: value.synopsis, arc: value.arc });
  else await db.insert("seasons", { id: seasonId, series_id: seriesId, number: (last?.number ?? 0) + 1, title: value.title, synopsis: value.synopsis, arc: value.arc, created_at: now });
  const episodes: Episode[] = [];
  for (const [i, e] of value.episodes.slice(0, n).entries()) {
    episodes.push(
      await db.insert("episodes", {
        id: newId("ep"),
        series_id: seriesId,
        season_id: seasonId,
        number: i + 1,
        title: e.title,
        summary: e.summary,
        duration_seconds: (opts.durationMinutes ?? 30) * 60,
        status: "planned",
        release_at: null,
        published_at: null,
        audio_asset_id: null,
        is_preview: ctx.episodes.length === 0 && i === 0,
        created_at: now,
        updated_at: now,
      }),
    );
  }
  if (value.arc) {
    const bible = await db.findOne("story_bibles", { series_id: seriesId });
    if (bible && !bible.unresolved_threads.includes(value.arc)) await db.update("story_bibles", bible.id, { unresolved_threads: [...bible.unresolved_threads, value.arc], updated_at: nowIso() });
  }
  return { seasonId, episodes, meta };
}

export async function addEpisode(viewer: Viewer, seriesId: string, input: { title: string; summary: string; seasonId?: string | null }): Promise<Episode> {
  await editableSeries(viewer, seriesId);
  const db = getDb();
  const seasons = await db.list("seasons", { where: { series_id: seriesId }, orderBy: { column: "number" } });
  let season = input.seasonId ? seasons.find((s) => s.id === input.seasonId) : seasons[seasons.length - 1];
  if (!season) {
    season = await db.insert("seasons", { id: newId("season"), series_id: seriesId, number: 1, title: "Season One", synopsis: "", arc: "", created_at: nowIso() });
  }
  const eps = await db.list("episodes", { where: { season_id: season.id } });
  const anyEps = await db.count("episodes", { series_id: seriesId });
  const now = nowIso();
  return db.insert("episodes", {
    id: newId("ep"),
    series_id: seriesId,
    season_id: season.id,
    number: eps.reduce((m, e) => Math.max(m, e.number), 0) + 1,
    title: input.title.trim().slice(0, 120),
    summary: input.summary.trim().slice(0, 1000),
    duration_seconds: 30 * 60,
    status: "planned",
    release_at: null,
    published_at: null,
    audio_asset_id: null,
    is_preview: anyEps === 0,
    created_at: now,
    updated_at: now,
  });
}

export async function updateEpisode(viewer: Viewer, episodeId: string, patch: Partial<Pick<Episode, "title" | "summary" | "duration_seconds">>): Promise<Episode> {
  const { ep } = await editableEpisode(viewer, episodeId);
  if (ep.status === "published") throw new HttpError(409, "Published episodes can't be edited here.");
  return getDb().update("episodes", episodeId, { ...patch, updated_at: nowIso() });
}

export async function generateEpisodeOutline(viewer: Viewer, episodeId: string): Promise<{ episode: Episode; beats: string[]; meta: GenerationMeta }> {
  const { ep, viewer: v } = await editableEpisode(viewer, episodeId);
  const ctx = await loadStoryContext(ep.series_id);
  const { value, meta } = await generate(
    {
      task: "outline",
      prompt: `Outline episode ${ep.number}, "${ep.title}": ${ep.summary}\nGive 4–6 beats.\n\n${renderContext(ctx, ep.id)}`,
      schema: EpisodeOutlineSchema,
      mock: () => mockEpisodeOutline(ctx, ep),
    },
    scope(v, ep.series_id, { episodeId }),
  );
  const episode = await getDb().update("episodes", ep.id, { summary: value.summary || ep.summary, updated_at: nowIso() });
  return { episode, beats: value.beats, meta };
}

/* ------------------------------------------------------------------ scripts */

export interface ScriptBundle {
  script: Script | null;
  current: ScriptVersion | null;
  versions: Omit<ScriptVersion, "content">[];
}

export async function getScriptBundle(viewer: Viewer, episodeId: string): Promise<ScriptBundle> {
  await editableEpisode(viewer, episodeId);
  return scriptBundle(episodeId);
}

async function scriptBundle(episodeId: string): Promise<ScriptBundle> {
  const db = getDb();
  const script = await db.findOne("scripts", { episode_id: episodeId });
  if (!script) return { script: null, current: null, versions: [] };
  const versions = await db.list("script_versions", { where: { script_id: script.id }, orderBy: { column: "version", ascending: false } });
  const current = versions.find((v) => v.id === script.current_version_id) ?? versions[0] ?? null;
  return { script, current, versions: versions.map(({ content: _c, ...rest }) => rest) };
}

async function ensureScript(ep: Episode, settings?: ScriptSettings): Promise<Script> {
  const db = getDb();
  const existing = await db.findOne("scripts", { episode_id: ep.id });
  if (existing) {
    if (settings) return db.update("scripts", existing.id, { settings, updated_at: nowIso() });
    return existing;
  }
  const now = nowIso();
  return db.insert("scripts", { id: `script-${ep.id}`, episode_id: ep.id, series_id: ep.series_id, current_version_id: null, settings: settings ?? DEFAULT_SCRIPT_SETTINGS, created_at: now, updated_at: now });
}

async function addVersion(
  ep: Episode,
  script: Script,
  content: string,
  v: Pick<ScriptVersion, "source" | "note" | "created_by"> & { meta?: GenerationMeta | null },
): Promise<ScriptVersion> {
  const db = getDb();
  const versions = await db.list("script_versions", { where: { script_id: script.id } });
  const row: ScriptVersion = {
    id: newId("sv"),
    script_id: script.id,
    version: versions.reduce((m, x) => Math.max(m, x.version), 0) + 1,
    content,
    word_count: wordCount(content),
    source: v.source,
    provider: v.meta?.provider ?? null,
    model: v.meta?.model ?? null,
    simulated: v.meta?.simulated ?? false,
    note: v.note.slice(0, 200),
    created_by: v.created_by,
    created_at: nowIso(),
  };
  await db.insert("script_versions", row);
  await db.update("scripts", script.id, { current_version_id: row.id, updated_at: nowIso() });
  if (ep.status === "planned" || ep.status === "draft" || ep.status === "changes_requested") {
    await db.update("episodes", ep.id, { status: "script_ready", updated_at: nowIso() });
  }
  return row;
}

export async function writeEpisode(
  viewer: Viewer,
  episodeId: string,
  opts: { settings?: Partial<ScriptSettings>; direction?: string } = {},
): Promise<{ version: ScriptVersion; newFacts: string[]; continuity: ContinuityReport; meta: GenerationMeta }> {
  const { ep, viewer: v } = await editableEpisode(viewer, episodeId);
  if (ep.status === "published" || ep.status === "in_review" || ep.status === "approved") {
    throw new HttpError(409, `This episode is ${ep.status.replace("_", " ")}; its script is locked.`);
  }
  const existing = await getDb().findOne("scripts", { episode_id: ep.id });
  const settings: ScriptSettings = { ...(existing?.settings ?? DEFAULT_SCRIPT_SETTINGS), ...opts.settings };
  const ctx = await loadStoryContext(ep.series_id);
  const words = Math.round(settings.duration_minutes * 130 * 0.8);
  const { value, meta } = await generate(
    {
      task: "script",
      prompt: [
        `Write episode ${ep.number}: "${ep.title}". Summary: ${ep.summary}`,
        opts.direction ? `Creator's direction: ${opts.direction}` : "",
        `Settings: about ${settings.duration_minutes} minutes read slowly (~${words} words); mood ${settings.mood}; ${settings.perspective}-person; ${settings.style} style; dialogue ${settings.dialogue}; romance ${settings.romance}; pacing ${settings.pacing}.`,
        "",
        renderContext(ctx, ep.id),
      ].join("\n"),
      schema: ScriptSchema,
      mock: () => mockScript(ctx, ep, settings),
      maxTokens: 64000,
    },
    scope(v, ep.series_id, { episodeId }),
  );
  const script = await ensureScript(ep, settings);
  const version = await addVersion(ep, script, value.script.trim(), { source: "ai", note: opts.direction ? `Written: ${opts.direction}` : "Written by Storymaker", created_by: v.user.id, meta });
  await recordEpisodeMemory(ep, value.new_facts);
  const continuity = await runContinuity(v, ctx, ep, value.script);
  return { version, newFacts: value.new_facts, continuity, meta };
}

/** Stores the facts and events an episode establishes in narrative memory. */
async function recordEpisodeMemory(ep: Episode, facts: string[]) {
  const db = getDb();
  const prior = await db.list("narrative_events", { where: { episode_id: ep.id } });
  for (const p of prior) await db.remove("narrative_events", p.id);
  const now = nowIso();
  await db.insert("narrative_events", { id: newId("ne"), series_id: ep.series_id, episode_id: ep.id, kind: "event", summary: `${ep.title}: ${ep.summary}`, character_ids: [], created_at: now });
  for (const f of facts.slice(0, 8)) {
    await db.insert("narrative_events", { id: newId("ne"), series_id: ep.series_id, episode_id: ep.id, kind: "fact", summary: f, character_ids: [], created_at: now });
  }
}

export async function saveScript(viewer: Viewer, episodeId: string, content: string, note = "Edited by creator", source: ScriptVersion["source"] = "human"): Promise<ScriptVersion> {
  const { ep, viewer: v } = await editableEpisode(viewer, episodeId);
  if (ep.status === "published" || ep.status === "in_review" || ep.status === "approved") throw new HttpError(409, "This script is locked while in review or published.");
  if (content.length > 200_000) throw new HttpError(413, "Script is too long.");
  const script = await ensureScript(ep);
  const bundle = await scriptBundle(ep.id);
  if (bundle.current?.content === content) return bundle.current;
  return addVersion(ep, script, content, { source, note, created_by: v.user.id });
}

export async function updateScriptSettings(viewer: Viewer, episodeId: string, settings: Partial<ScriptSettings>): Promise<Script> {
  const { ep } = await editableEpisode(viewer, episodeId);
  const script = await ensureScript(ep);
  return getDb().update("scripts", script.id, { settings: { ...script.settings, ...settings }, updated_at: nowIso() });
}

/** Rollback: restores an earlier version by copying it into a new version. */
export async function restoreVersion(viewer: Viewer, episodeId: string, versionId: string): Promise<ScriptVersion> {
  const { ep, viewer: v } = await editableEpisode(viewer, episodeId);
  const db = getDb();
  const script = await db.findOne("scripts", { episode_id: ep.id });
  const old = await db.get("script_versions", versionId);
  if (!script || !old || old.script_id !== script.id) throw new HttpError(404, "Version not found");
  return addVersion(ep, script, old.content, { source: "human", note: `Restored version ${old.version}`, created_by: v.user.id });
}

export async function getVersion(viewer: Viewer, episodeId: string, versionId: string): Promise<ScriptVersion> {
  await editableEpisode(viewer, episodeId);
  const db = getDb();
  const script = await db.findOne("scripts", { episode_id: episodeId });
  const ver = await db.get("script_versions", versionId);
  if (!script || !ver || ver.script_id !== script.id) throw new HttpError(404, "Version not found");
  return ver;
}

export const REWRITE_ACTIONS = {
  rewrite: "Rewrite this passage with fresh phrasing, same meaning.",
  expand: "Expand this passage with more detail and slower pacing.",
  shorten: "Shorten this passage while keeping its essence.",
  atmospheric: "Make this passage more atmospheric.",
  dialogue: "Improve the dialogue in this passage: softer, more natural, sparing.",
  sensory: "Add sensory detail: sound, texture, scent, temperature, light.",
  relaxing: "Make this passage more relaxing: lower arousal, slower rhythm, no urgency.",
  ending: "Change the ending of this passage so it settles softly into rest.",
  continuity: "Improve continuity with the Story Bible and earlier episodes, without changing established lore.",
} as const;
export type RewriteAction = keyof typeof REWRITE_ACTIONS;

/** Proposes a replacement for a selected passage. Nothing is saved. */
export async function proposeRewrite(
  viewer: Viewer,
  episodeId: string,
  selection: string,
  instruction: string,
): Promise<{ text: string; meta: GenerationMeta }> {
  const { ep, viewer: v } = await editableEpisode(viewer, episodeId);
  const sel = selection.trim();
  if (!sel) throw new HttpError(400, "Select some text to rewrite.");
  if (sel.length > 12_000) throw new HttpError(413, "Select a shorter passage (up to about two thousand words).");
  const ctx = await loadStoryContext(ep.series_id);
  const { value, meta } = await generate(
    {
      task: "rewrite",
      prompt: `Instruction: ${instruction}\n\nSelected passage:\n"""${sel}"""\n\nStory memory:\n${renderContext(ctx, ep.id)}`,
      schema: RewriteSchema,
      mock: () => ({ text: mockRewrite(sel, instruction).text }),
    },
    scope(v, ep.series_id, { episodeId }),
  );
  return { text: value.text.trim(), meta };
}

/** Rewrites a passage of the current script and saves it as a new version. */
export async function rewriteSection(
  viewer: Viewer,
  episodeId: string,
  selection: string,
  instruction: string,
): Promise<{ version: ScriptVersion; replacement: string; meta: GenerationMeta }> {
  const bundle = await getScriptBundle(viewer, episodeId);
  const content = bundle.current?.content ?? "";
  if (!content.includes(selection)) throw new HttpError(400, "That passage isn't in the current script. Copy it exactly from the script.");
  const { text, meta } = await proposeRewrite(viewer, episodeId, selection, instruction);
  const version = await saveScript(viewer, episodeId, content.replace(selection, text), `AI rewrite: ${instruction.slice(0, 80)}`, "ai_rewrite");
  return { version, replacement: text, meta };
}

/* ------------------------------------------------------------------ memory: continuity & direction */

async function runContinuity(v: Editor, ctx: StoryContext, ep: Episode | null, script: string): Promise<ContinuityReport> {
  // Rule-based checks always run; the model adds judgement when configured.
  const rules = analyseContinuity(ctx, script);
  const { value, meta } = await generate(
    {
      task: "continuity",
      prompt: `Script to check:\n"""${script.slice(0, 60_000)}"""\n\nStory memory:\n${renderContext(ctx, ep?.id)}`,
      schema: ContinuitySchema,
      mock: () => rules,
    },
    scope(v, ctx.series.id, { episodeId: ep?.id ?? null }),
  );
  const issues = meta.simulated ? value.issues : [...value.issues, ...rules.issues.filter((i) => i.severity === "conflict")];
  return { checked_at: nowIso(), issues, summary: value.summary, simulated: meta.simulated };
}

export async function checkContinuity(viewer: Viewer, episodeId: string, text?: string): Promise<ContinuityReport> {
  const { ep, viewer: v } = await editableEpisode(viewer, episodeId);
  const script = text ?? (await scriptBundle(episodeId)).current?.content ?? "";
  if (!script.trim()) throw new HttpError(400, "There's no script to check yet.");
  return runContinuity(v, await loadStoryContext(ep.series_id), ep, script);
}

export async function checkSleepSuitability(viewer: Viewer, episodeId: string, text?: string): Promise<{ score: number; notes: string[]; simulated: boolean }> {
  const { ep, viewer: v } = await editableEpisode(viewer, episodeId);
  const script = text ?? (await scriptBundle(episodeId)).current?.content ?? "";
  if (!script.trim()) throw new HttpError(400, "There's no script to check yet.");
  const rules = analyseSleepSuitability(script);
  const { value, meta } = await generate(
    { task: "sleep_check", prompt: `Script:\n"""${script.slice(0, 60_000)}"""`, schema: SleepCheckSchema, mock: () => rules },
    scope(v, ep.series_id, { episodeId }),
  );
  return { score: Math.round(Math.min(value.score, meta.simulated ? 100 : rules.score + 20)), notes: value.notes, simulated: meta.simulated };
}

/** "Continue This Story": proposes the next episode. Nothing is saved. */
export async function proposeDirection(viewer: Viewer, seriesId: string, hint?: string): Promise<{ proposal: DirectionProposal; meta: GenerationMeta }> {
  const { viewer: v } = await editableSeries(viewer, seriesId);
  const ctx = await loadStoryContext(seriesId);
  const { value, meta } = await generate(
    { task: "direction", prompt: `${hint ? `Creator's hint: ${hint}\n\n` : ""}${renderContext(ctx)}`, schema: DirectionSchema, mock: () => mockDirection(ctx) },
    scope(v, seriesId),
  );
  return { proposal: value, meta };
}

/** Accepts (optionally modified) direction: creates the planned episode. */
export async function acceptDirection(viewer: Viewer, seriesId: string, proposal: DirectionProposal): Promise<Episode> {
  const ep = await addEpisode(viewer, seriesId, { title: proposal.episode_title, summary: proposal.summary });
  const db = getDb();
  await db.insert("narrative_events", {
    id: newId("ne"),
    series_id: seriesId,
    episode_id: ep.id,
    kind: "event",
    summary: `Planned: ${proposal.episode_title}. Beats: ${proposal.beats.join("; ")}`,
    character_ids: [],
    created_at: nowIso(),
  });
  return ep;
}

/* ------------------------------------------------------------------ artwork */

export async function generateCoverArt(viewer: Viewer, seriesId: string, opts: { scene?: SceneKind; palette?: keyof typeof PALETTES; prompt?: string } = {}): Promise<ArtworkSpec> {
  const { series, viewer: v } = await editableSeries(viewer, seriesId);
  const rand = prng(hashString(series.id + nowIso()));
  const scene = opts.scene ?? (series.artwork.scene === "portrait" ? "forest" : series.artwork.scene);
  const palette = opts.palette ? PALETTES[opts.palette] : opts.scene ? artworkFor(scene, series.id).palette : PALETTES[pick(rand, Object.keys(PALETTES) as (keyof typeof PALETTES)[])];
  const spec: ArtworkSpec = { scene, palette, seed: Math.floor(rand() * 1e9) };
  const db = getDb();
  await db.insert("artwork_assets", {
    id: newId("art"),
    owner_id: v.user.id,
    series_id: series.id,
    episode_id: null,
    character_id: null,
    kind: "cover",
    source: "procedural",
    spec,
    prompt: opts.prompt ?? null,
    provider: "procedural",
    simulated: false,
    created_at: nowIso(),
  });
  await db.update("series", series.id, { artwork: spec, updated_at: nowIso() });
  return spec;
}

/* ------------------------------------------------------------------ publishing */

export interface RightsInput {
  original_work: boolean;
  ai_assisted: boolean;
  third_party_material: string;
  voice_consent: boolean;
}

export const TERMS_VERSION = "2026-01";

export async function declareRights(viewer: Viewer, seriesId: string, input: RightsInput) {
  const { viewer: v } = await editableSeries(viewer, seriesId);
  if (!input.original_work) throw new HttpError(400, "Only original work (or work you hold the rights to) can be published.");
  if (!input.voice_consent) throw new HttpError(400, "Please confirm you have consent for every voice used.");
  const db = getDb();
  const prev = await db.findOne("rights_declarations", { series_id: seriesId });
  return db.upsert("rights_declarations", {
    id: prev?.id ?? newId("rights"),
    series_id: seriesId,
    user_id: v.user.id,
    original_work: input.original_work,
    ai_assisted: input.ai_assisted,
    third_party_material: input.third_party_material.slice(0, 2000),
    voice_consent: input.voice_consent,
    accepted_terms_version: TERMS_VERSION,
    created_at: nowIso(),
  });
}

/** Automated pre-review checks. They inform editors; they never approve anything. */
export async function automatedChecks(ep: Episode, series: Series): Promise<ReviewCheck[]> {
  const db = getDb();
  const bundle = await scriptBundle(ep.id);
  const script = bundle.current?.content ?? "";
  const rights = await db.findOne("rights_declarations", { series_id: series.id });
  const checks: ReviewCheck[] = [];
  const sleep = script ? analyseSleepSuitability(script) : null;
  const peril = sleep?.notes.find((n) => n.startsWith("Potentially distressing"));
  checks.push({ name: "content_safety", status: !script ? "not_run" : peril ? "warn" : "pass", detail: !script ? "No script." : (peril ?? "No distressing language detected by automated screening.") });
  checks.push({ name: "rights", status: rights?.original_work && rights.voice_consent ? "pass" : "fail", detail: rights ? `Declared ${rights.accepted_terms_version}: original work, voice consent ${rights.voice_consent ? "given" : "missing"}.` : "No rights declaration on file." });
  checks.push({ name: "sleep_suitability", status: !sleep ? "not_run" : sleep.score >= 75 ? "pass" : sleep.score >= 55 ? "warn" : "fail", detail: sleep ? `Score ${sleep.score}/100. ${sleep.notes.join(" ")}` : "No script." });
  if (script) {
    const ctx = await loadStoryContext(series.id);
    const c = analyseContinuity(ctx, script);
    const conflicts = c.issues.filter((i) => i.severity === "conflict").length;
    checks.push({ name: "continuity", status: conflicts ? "warn" : "pass", detail: c.summary });
  } else checks.push({ name: "continuity", status: "not_run", detail: "No script." });
  const audio = ep.audio_asset_id ? await db.get("audio_assets", ep.audio_asset_id) : null;
  checks.push({
    name: "audio_quality",
    status: !audio ? "not_run" : audio.qa ? (audio.qa.passed ? "pass" : audio.qa.issues.some((i) => i.severity === "fail") ? "fail" : "warn") : "warn",
    detail: !audio ? "No finished audio yet." : audio.qa ? `${audio.qa.issues.filter((i) => i.severity !== "pass").length} QA notes; peak ${audio.qa.peak_dbfs.toFixed(1)} dBFS.` : "Audio has not been through QA.",
  });
  checks.push({ name: "metadata", status: ep.title.trim() && ep.summary.trim().length >= 20 ? "pass" : "warn", detail: ep.summary.trim().length >= 20 ? "Title and description present." : "Description is very short." });
  checks.push({ name: "ai_disclosure", status: series.ai_disclosure ? "pass" : "warn", detail: series.ai_disclosure ?? "No AI disclosure set." });
  return checks;
}

export async function submitForReview(viewer: Viewer, episodeId: string, opts: { requestedReleaseAt?: string | null; notes?: string } = {}): Promise<EditorialReview> {
  const { ep, series, viewer: v } = await editableEpisode(viewer, episodeId);
  if (ep.status === "published") throw new HttpError(409, "This episode is already published.");
  const db = getDb();
  const pending = await db.findOne("editorial_reviews", { episode_id: ep.id, status: "pending" });
  if (pending) return pending;
  const bundle = await scriptBundle(ep.id);
  if (!bundle.current?.content.trim()) throw new HttpError(409, "Write the script before submitting for review.");
  const rights = await db.findOne("rights_declarations", { series_id: series.id });
  if (!rights) throw new HttpError(409, "Complete the rights declaration in Publishing before submitting.");
  if (opts.requestedReleaseAt && Number.isNaN(Date.parse(opts.requestedReleaseAt))) throw new HttpError(400, "Release time isn't a valid date.");
  const review: EditorialReview = {
    id: newId("review"),
    episode_id: ep.id,
    series_id: series.id,
    submitted_by: v.user.id,
    source: series.is_official ? "production_engine" : "creator",
    status: "pending",
    checks: await automatedChecks(ep, series),
    requested_release_at: opts.requestedReleaseAt ?? null,
    reviewer_id: null,
    notes: (opts.notes ?? "").slice(0, 2000),
    created_at: nowIso(),
    decided_at: null,
  };
  await db.insert("editorial_reviews", review);
  await db.update("episodes", ep.id, { status: "in_review", updated_at: nowIso() });
  if (series.status === "draft") await db.update("series", series.id, { status: "in_review", updated_at: nowIso() });
  for (const admin of await db.list("user_roles", { where: { role: "admin" } })) {
    await db.insert("notifications", { id: newId("notif"), user_id: admin.user_id, kind: "review", title: "New episode to review", body: `${series.title}: ${ep.title}`, link: "/admin/review", read: false, created_at: nowIso() });
  }
  return review;
}

/**
 * Requests a release time. The episode is only released at that time once an
 * editor has approved it.
 */
export async function scheduleEpisode(viewer: Viewer, episodeId: string, releaseAt: string) {
  const { ep, series, viewer: v } = await editableEpisode(viewer, episodeId);
  const when = new Date(releaseAt);
  if (Number.isNaN(when.getTime())) throw new HttpError(400, "Release time isn't a valid date.");
  if (when.getTime() < Date.now() - 60_000) throw new HttpError(400, "Pick a release time in the future.");
  const db = getDb();
  const existing = await db.findOne("publishing_schedules", { episode_id: ep.id });
  const row = {
    id: existing?.id ?? newId("sched"),
    episode_id: ep.id,
    series_id: series.id,
    release_at: when.toISOString(),
    status: "scheduled" as const,
    created_by: v.user.id,
    created_at: existing?.created_at ?? nowIso(),
    updated_at: nowIso(),
  };
  await db.upsert("publishing_schedules", row);
  await db.update("episodes", ep.id, { release_at: row.release_at, updated_at: nowIso() });
  const pending = await db.findOne("editorial_reviews", { episode_id: ep.id, status: "pending" });
  if (pending) await db.update("editorial_reviews", pending.id, { requested_release_at: row.release_at });
  return { schedule: row, approved: ep.status === "approved" };
}

/* ------------------------------------------------------------------ workspace snapshot */

export async function listMySeries(viewer: Viewer): Promise<Series[]> {
  requireCreator(viewer);
  const all = await getDb().list("series", { where: viewer.isAdmin ? {} : { creator_id: viewer.user.id }, orderBy: { column: "updated_at", ascending: false } });
  return viewer.isAdmin ? all.filter((s) => s.creator_id === viewer.user.id || !s.is_official).slice(0, 50) : all;
}

export async function workspaceSnapshot(viewer: Viewer, seriesId: string) {
  await editableSeries(viewer, seriesId);
  const ctx = await loadStoryContext(seriesId);
  const db = getDb();
  const scripts = await db.list("scripts", { where: { series_id: seriesId } });
  const rights = await db.findOne("rights_declarations", { series_id: seriesId });
  const reviews = await db.list("editorial_reviews", { where: { series_id: seriesId }, orderBy: { column: "created_at", ascending: false } });
  const schedules = await db.list("publishing_schedules", { where: { series_id: seriesId } });
  return {
    series: ctx.series,
    bible: ctx.bible,
    characters: ctx.characters,
    relationships: ctx.relationships,
    locations: ctx.locations,
    seasons: ctx.seasons,
    episodes: ctx.episodes,
    events: ctx.events.slice(-30),
    scripts: scripts.map((s) => ({ episode_id: s.episode_id, current_version_id: s.current_version_id, settings: s.settings })),
    rights,
    reviews,
    schedules,
  };
}
export type WorkspaceSnapshot = Awaited<ReturnType<typeof workspaceSnapshot>>;

/* ------------------------------------------------------------------ production helpers */

/**
 * Sleep Editor pass: softens the passages that score as stimulating or
 * distressing, saving the result as a new version (the original is kept).
 */
export async function sleepEdit(viewer: Viewer, episodeId: string): Promise<{ before: number; after: number; softened: number }> {
  const bundle = await getScriptBundle(viewer, episodeId);
  const script = bundle.current?.content ?? "";
  if (!script.trim()) throw new HttpError(409, "There's no script to edit.");
  const before = analyseSleepSuitability(script).score;
  if (before >= 80) return { before, after: before, softened: 0 };
  const paras = script.split(/\n\s*\n/);
  let softened = 0;
  for (let i = 0; i < paras.length && softened < 6; i++) {
    const p = paras[i] as string;
    if (analyseSleepSuitability(`${p}\n\nAnd rest.`).score >= 90) continue;
    const { text } = await proposeRewrite(viewer, episodeId, p, REWRITE_ACTIONS.relaxing);
    paras[i] = text;
    softened++;
  }
  const next = paras.join("\n\n");
  if (softened) await saveScript(viewer, episodeId, next, `Sleep Editor: softened ${softened} passage${softened === 1 ? "" : "s"}`, "agent");
  return { before, after: analyseSleepSuitability(next).score, softened };
}

/** Calm Originals own their rights; record that once for the production engine. */
export async function ensureOfficialRights(viewer: Viewer, seriesId: string) {
  const { series, viewer: v } = await editableSeries(viewer, seriesId);
  const db = getDb();
  const existing = await db.findOne("rights_declarations", { series_id: seriesId });
  if (!series.is_official) return existing;
  if (!series.ai_disclosure) await db.update("series", series.id, { ai_disclosure: "Some episodes are produced by Calm's editorial team with AI-assisted writing and narration, and every one is reviewed by an editor." });
  if (existing) return existing;
  return db.insert("rights_declarations", {
    id: newId("rights"),
    series_id: seriesId,
    user_id: v.user.id,
    original_work: true,
    ai_assisted: true,
    third_party_material: "",
    voice_consent: true,
    accepted_terms_version: TERMS_VERSION,
    created_at: nowIso(),
  });
}
