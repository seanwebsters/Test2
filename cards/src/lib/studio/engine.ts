import { z } from "zod/v4";
import { catalog } from "@/lib/catalog";
import { DAY_MS } from "@/lib/clock";
import { hashString } from "@/lib/content/build";
import { RARITIES, type Card, type Episode, type Universe } from "@/lib/content/types";
import type { DbState, GenerationJob, GenerationStepRun } from "@/lib/db/types";
import type { Store } from "@/lib/db/store";
import { audit, iso, newId, notify, requireAdminUser, ServiceError } from "@/lib/services/core";
import type { GenerationProvider } from "./providers";
import {
  analyticsPlanSchema,
  cardsSchema,
  charactersSchema,
  conceptSchema,
  publishingSchema,
  reviewSchema,
  storySchema,
  visualSchema,
  worldSchema,
  type AnalyticsPlan,
  type Cards,
  type Characters,
  type Concept,
  type Publishing,
  type Review,
  type Story,
  type Visual,
  type World,
} from "./schemas";
import * as T from "./template";

/* ------------------------------------------------------------------ */
/* Agents                                                               */
/* ------------------------------------------------------------------ */

export type StepKey = "concept" | "world" | "characters" | "visual" | "story" | "cards" | "review" | "publishing" | "analytics";

export interface StepDef {
  key: StepKey;
  agent: string;
  title: string;
  description: string;
  needs: StepKey[];
  /** Rule-based steps never call a model. */
  ruleBased?: boolean;
  schema: z.ZodType;
}

export const STEPS: StepDef[] = [
  { key: "concept", agent: "Creative Director Agent", title: "Concept", description: "Name, tagline, premise, genre, audience and what makes it different.", needs: [], schema: conceptSchema },
  { key: "world", agent: "Worldbuilding Agent", title: "World", description: "History, geography, rules, culture, factions, conflicts, locations and mythology.", needs: ["concept"], schema: worldSchema },
  { key: "characters", agent: "Character Agent", title: "Characters", description: "Main cast, antagonists, relationships, motivations, looks and arcs.", needs: ["concept", "world"], schema: charactersSchema },
  { key: "visual", agent: "Art Direction Agent", title: "Visual identity", description: "Art style, palette, lighting, character rules, card frame and key art prompts.", needs: ["concept", "world"], schema: visualSchema },
  { key: "story", agent: "Story Agent", title: "Season", description: "Season outline, episode titles, summaries, full chapter scripts and cliffhangers.", needs: ["concept", "world", "characters"], schema: storySchema },
  { key: "cards", agent: "Card Design Agent", title: "Cards", description: "Card catalogue with rarities, lore, factions, numbering and episode links.", needs: ["concept", "world", "characters", "story"], schema: cardsSchema },
  { key: "review", agent: "Continuity Editor + QA Agent", title: "Continuity & QA", description: "Cross-checks the world bible: references, counts, rarity distribution and duplicates.", needs: ["concept", "world", "characters", "visual", "story", "cards"], ruleBased: true, schema: reviewSchema },
  { key: "publishing", agent: "Publishing Agent", title: "Publishing plan", description: "Release schedule, teaser and launch copy, featured cards and campaign.", needs: ["concept", "story", "cards"], schema: publishingSchema },
  { key: "analytics", agent: "Analytics Agent", title: "Measurement plan", description: "KPIs and events to judge whether this universe earns a second season.", needs: ["concept"], ruleBased: true, schema: analyticsPlanSchema },
];

export const stepDef = (k: string) => {
  const s = STEPS.find((x) => x.key === k);
  if (!s) throw new ServiceError("bad_step", "Unknown step", 400);
  return s;
};

const SYSTEM = (agent: string) =>
  `You are the ${agent} in NEXARA Studio, the production team for NEXARA — a platform of original collectible fictional universes told through short episodes and trading cards.
Write original material only: no existing franchises, characters or brands. Keep everything consistent with the canonical world bible you are given (names, ids, factions). Content must be suitable for a general audience aged 13+.
Ids are lowercase-hyphenated slugs. Colours are #rrggbb hex. Return only the structured output.`;

const REQUIREMENTS: Record<StepKey, string> = {
  concept: "Produce one strong concept. 1–3 genres from the allowed list. Tagline under 90 characters. Premise 2–3 sentences. Synopsis 2–3 sentences.",
  world: "Exactly 3 factions (each with a distinct hex colour), 3–5 locations, 3–5 rules, 2–3 conflicts, 2 secrets.",
  characters: "Exactly 6 characters: 2 leads, 2 supporting, 1 antagonist, 1 mystery. factionId must be one of the world's faction ids. Relationships must point at ids in this cast.",
  visual: "Choose the artStyle and displayFont from the allowed enums that best match the brief. Palette: dark bg, slightly lighter surface, two accents, a light ink colour, and exactly 4 art colours.",
  story: "Season 1 with exactly 6 written episodes (plannedEpisodes 10–12). Each episode body is 3–5 paragraphs of finished prose (80–140 words each), ending on a hook. characterIds must be ids from the cast.",
  cards: "Exactly 24 cards numbered in reading order: 9 common, 5 uncommon, 4 rare, 3 epic, 2 legendary, 1 mythic. Include every character once (characterId set), the key locations, factions' artifacts, events and one secret. factionId/characterId must be existing ids or empty string. episodeNumber 1–6 for the episode that introduces the card; the mythic must appear by episode 4.",
  review: "",
  publishing: "Schedule every episode: episodes 1–3 at dayOffset 0, later episodes spaced 2–4 days apart. 3–4 featured card names taken from the card list. 3–5 campaign beats.",
  analytics: "",
};

/* ------------------------------------------------------------------ */
/* Rule-based agents                                                    */
/* ------------------------------------------------------------------ */

export function continuityReview(state: DbState, o: { concept: Concept; world: World; characters: Characters; visual: Visual; story: Story; cards: Cards }, excludeUniverseId?: string): Review {
  const issues: Review["issues"] = [];
  const err = (agent: string, message: string) => issues.push({ severity: "error", agent, message });
  const warn = (agent: string, message: string) => issues.push({ severity: "warning", agent, message });
  const factionIds = new Set(o.world.factions.map((f) => f.id));
  const charIds = new Set(o.characters.characters.map((c) => c.id));
  if (o.world.factions.length < 2) err("QA", "Needs at least 2 factions.");
  if (charIds.size !== o.characters.characters.length) err("Continuity", "Duplicate character ids.");
  for (const c of o.characters.characters) {
    if (!factionIds.has(c.factionId)) err("Continuity", `${c.name} belongs to unknown faction "${c.factionId}".`);
    for (const r of c.relationships) if (!charIds.has(r.to)) err("Continuity", `${c.name} has a relationship with unknown character "${r.to}".`);
  }
  if (!o.characters.characters.some((c) => c.role === "lead")) err("QA", "No lead character.");
  if (o.story.episodes.length < 3) err("QA", "A season needs at least 3 written episodes.");
  o.story.episodes.forEach((e, i) => {
    if (e.body.length < 2) err("QA", `Episode ${i + 1} is too short.`);
    for (const id of e.characterIds) if (!charIds.has(id)) warn("Continuity", `Episode ${i + 1} mentions unknown character id "${id}".`);
  });
  const n = o.cards.cards.length;
  if (n < 20 || n > 60) err("QA", `Card set has ${n} cards; expected 20–60.`);
  for (const r of RARITIES) if (!o.cards.cards.some((c) => c.rarity === r)) err("QA", `No ${r} card in the set.`);
  const names = new Set<string>();
  for (const c of o.cards.cards) {
    if (names.has(c.name.toLowerCase())) warn("QA", `Duplicate card name "${c.name}".`);
    names.add(c.name.toLowerCase());
    if (c.factionId && !factionIds.has(c.factionId)) err("Continuity", `Card "${c.name}" references unknown faction "${c.factionId}".`);
    if (c.characterId && !charIds.has(c.characterId)) err("Continuity", `Card "${c.name}" references unknown character "${c.characterId}".`);
    if (c.episodeNumber < 1 || c.episodeNumber > o.story.episodes.length) err("Continuity", `Card "${c.name}" is tied to episode ${c.episodeNumber}, which doesn't exist.`);
  }
  for (const ch of o.characters.characters) if (!o.cards.cards.some((c) => c.characterId === ch.id)) warn("Continuity", `${ch.name} has no card.`);
  const hex = /^#[0-9a-f]{6}$/i;
  for (const col of [o.visual.palette.bg, o.visual.palette.surface, o.visual.palette.accent, o.visual.palette.accent2, o.visual.palette.ink, ...o.visual.palette.art]) if (!hex.test(col)) err("QA", `Palette colour "${col}" isn't a #rrggbb hex value.`);
  if (o.visual.palette.art.length < 4) err("QA", "Palette needs 4 art colours.");
  const titleTaken = catalog(state).universes.some((u) => u.id !== excludeUniverseId && u.title.toLowerCase() === o.concept.title.toLowerCase());
  if (titleTaken) err("QA", `A universe called "${o.concept.title}" already exists.`);
  const counts = Object.fromEntries(RARITIES.map((r) => [r, o.cards.cards.filter((c) => c.rarity === r).length]));
  if (!issues.length) issues.push({ severity: "info", agent: "QA", message: "All continuity and quality checks passed." });
  return { passed: !issues.some((i) => i.severity === "error"), issues, stats: { cards: n, characters: charIds.size, episodes: o.story.episodes.length, factions: factionIds.size, ...counts } };
}

export function analyticsPlan(concept: Concept): AnalyticsPlan {
  return {
    kpis: [
      { name: "First-pack conversion", target: "≥ 35% of visitors to the universe page open a pack", why: "Shows the premise and art pull people in." },
      { name: "Day-7 return", target: "≥ 25% of first-pack collectors return within 7 days", why: "Separates curiosity from attachment." },
      { name: "Episode completion", target: "≥ 50% of episode starts are finished", why: "The story is doing its job." },
      { name: "Collection depth", target: "Median collector owns ≥ 30% of the set after 14 days", why: "Collectors are invested in the world, not just one card." },
      { name: "Follows per collector", target: "≥ 0.6", why: "Signals demand for future seasons." },
    ],
    events: ["universe_viewed", "pack_opened", "episode_started", "episode_completed", "universe_followed", "card_shared", "card_crafted", "trailer_played"].concat(concept.genres.includes("mystery") ? ["theory_posted (planned)"] : []),
  };
}

/* ------------------------------------------------------------------ */
/* Jobs                                                                 */
/* ------------------------------------------------------------------ */

export function latestRun(job: GenerationJob, key: StepKey): GenerationStepRun | undefined {
  const runs = job.steps[key];
  return runs?.[runs.length - 1];
}

export function approvedOutput<T>(job: GenerationJob, key: StepKey): T | undefined {
  const runs = job.steps[key] ?? [];
  const r = [...runs].reverse().find((x) => x.status === "succeeded" && x.approval === "approved");
  return r?.output as T | undefined;
}

export function createJobTx(draft: DbState, actorId: string, brief: string, at: number): GenerationJob {
  requireAdminUser(draft, actorId);
  const clean = brief.trim();
  if (clean.length < 20) throw new ServiceError("brief_too_short", "Describe the universe in at least a sentence or two.");
  const job: GenerationJob = { id: newId("job"), brief: clean.slice(0, 2000), createdBy: actorId, createdAt: iso(at), updatedAt: iso(at), status: "draft", steps: {}, totalCostUsd: 0 };
  draft.jobs.push(job);
  audit(draft, actorId, "job:create", at, job.id);
  return job;
}

function requireJob(draft: DbState, jobId: string) {
  const job = draft.jobs.find((j) => j.id === jobId);
  if (!job) throw new ServiceError("not_found", "Job not found", 404);
  return job;
}

/** Queues a new version of a step. Returns the version number. */
export function queueStepTx(draft: DbState, actorId: string, jobId: string, key: StepKey, providerLabel: string, at: number): number {
  requireAdminUser(draft, actorId);
  const job = requireJob(draft, jobId);
  const def = stepDef(key);
  for (const n of def.needs) if (!approvedOutput(job, n)) throw new ServiceError("needs_approval", `Approve "${stepDef(n).title}" first.`, 409);
  const last = latestRun(job, key);
  if (last && (last.status === "queued" || last.status === "running")) throw new ServiceError("busy", "This step is already running.", 409);
  const runs = (job.steps[key] ??= []);
  runs.push({ version: runs.length + 1, status: "queued", attempts: 0, provider: def.ruleBased ? "rules" : providerLabel, costUsd: 0, approval: "pending" });
  job.status = "generating";
  job.updatedAt = iso(at);
  return runs.length;
}

function contextFor(job: GenerationJob) {
  const ctx: Record<string, unknown> = {};
  for (const s of STEPS) {
    const o = approvedOutput(job, s.key);
    if (o && s.key !== "review" && s.key !== "analytics") ctx[s.key] = o;
  }
  return ctx;
}

function templateOutput(job: GenerationJob, key: StepKey): unknown {
  const info = T.parseBrief(job.brief);
  const c = approvedOutput<Concept>(job, "concept");
  const w = approvedOutput<World>(job, "world");
  const ch = approvedOutput<Characters>(job, "characters");
  const st = approvedOutput<Story>(job, "story");
  const cards = approvedOutput<Cards>(job, "cards");
  const version = job.steps[key]?.length ?? 1;
  const varied = { ...info, seed: info.seed + (version - 1) * 7919 };
  switch (key) {
    case "concept":
      return T.templateConcept(varied);
    case "world":
      return T.templateWorld(varied, c!);
    case "characters":
      return T.templateCharacters(varied, w!);
    case "visual":
      return T.templateVisual(info, c!);
    case "story":
      return T.templateStory(varied, c!, w!, ch!);
    case "cards":
      return T.templateCards(varied, c!, w!, ch!, st!);
    case "publishing":
      return T.templatePublishing(c!, st!, cards!);
    default:
      throw new Error("No template for this step");
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Executes the queued version of a step with retries. Safe to call without
 * awaiting (the UI polls job state). `provider` undefined = offline template.
 */
export async function executeStep(store: Store, jobId: string, key: StepKey, provider: GenerationProvider | undefined, opts: { retries?: number; backoffMs?: number; now?: () => number } = {}) {
  const retries = opts.retries ?? 3;
  const backoff = opts.backoffMs ?? 1500;
  const clock = opts.now ?? Date.now;
  const def = stepDef(key);
  const setRun = (patch: Partial<GenerationStepRun>) =>
    store.transact((d) => {
      const job = requireJob(d, jobId);
      const run = latestRun(job, key)!;
      Object.assign(run, patch);
      job.updatedAt = iso(clock());
      if (patch.costUsd) job.totalCostUsd = Math.round((job.totalCostUsd + patch.costUsd) * 10000) / 10000;
      if (patch.status === "failed") job.status = "failed";
      if (patch.status === "succeeded") job.status = "review";
    });

  await setRun({ status: "running", startedAt: iso(clock()) });
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const job = store.read().jobs.find((j) => j.id === jobId)!;
      let output: unknown;
      let meta: Partial<GenerationStepRun> = { costUsd: 0 };
      if (key === "review") {
        const all = Object.fromEntries(def.needs.map((n) => [n, approvedOutput(job, n)])) as Parameters<typeof continuityReview>[1];
        output = continuityReview(store.read(), all, job.universeId);
      } else if (key === "analytics") {
        output = analyticsPlan(approvedOutput<Concept>(job, "concept")!);
      } else if (provider) {
        const prompt = `BRIEF:\n${job.brief}\n\nCANONICAL WORLD BIBLE SO FAR (approved):\n${JSON.stringify(contextFor(job), null, 1)}\n\nTASK (${def.title}): ${def.description}\nREQUIREMENTS: ${REQUIREMENTS[key]}`;
        const r = await provider.generate({ agent: def.agent, system: SYSTEM(def.agent), prompt, schema: def.schema });
        output = r.output;
        meta = { provider: r.provider, model: r.model, inputTokens: r.inputTokens, outputTokens: r.outputTokens, costUsd: r.costUsd };
      } else {
        output = templateOutput(job, key);
        meta = { provider: "template", costUsd: 0 };
      }
      const parsed = def.schema.parse(output);
      await setRun({ ...meta, status: "succeeded", output: parsed, attempts: attempt, finishedAt: iso(clock()), error: undefined });
      return;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (attempt >= retries) {
        await setRun({ status: "failed", attempts: attempt, error: message, finishedAt: iso(clock()) });
        return;
      }
      await setRun({ attempts: attempt, error: `Attempt ${attempt} failed: ${message} — retrying` });
      await sleep(backoff * attempt);
    }
  }
}

export function setApprovalTx(draft: DbState, actorId: string, jobId: string, key: StepKey, version: number, approval: "approved" | "rejected", at: number, notes?: string) {
  requireAdminUser(draft, actorId);
  const job = requireJob(draft, jobId);
  const run = job.steps[key]?.find((r) => r.version === version);
  if (!run) throw new ServiceError("not_found", "Version not found", 404);
  if (run.status !== "succeeded") throw new ServiceError("not_ready", "Only finished outputs can be reviewed", 409);
  if (approval === "approved" && key === "review" && !(run.output as Review).passed) throw new ServiceError("qa_failed", "QA found errors. Fix the inputs and re-run the review.", 409);
  // Only one approved version per step.
  for (const r of job.steps[key]!) if (r.approval === "approved") r.approval = "pending";
  run.approval = approval;
  run.notes = notes;
  job.updatedAt = iso(at);
  audit(draft, actorId, `job:${approval}`, at, `${jobId}:${key}:v${version}`, notes);
}

/** Human edits to an output create a new approved version (keeps history). */
export function editOutputTx(draft: DbState, actorId: string, jobId: string, key: StepKey, output: unknown, at: number) {
  requireAdminUser(draft, actorId);
  const job = requireJob(draft, jobId);
  const def = stepDef(key);
  const parsed = def.schema.parse(output);
  const runs = (job.steps[key] ??= []);
  for (const r of runs) if (r.approval === "approved") r.approval = "pending";
  runs.push({ version: runs.length + 1, status: "succeeded", attempts: 0, provider: "human-edit", costUsd: 0, approval: "approved", output: parsed, startedAt: iso(at), finishedAt: iso(at), notes: "Edited in Studio" });
  audit(draft, actorId, "job:edit", at, `${jobId}:${key}`);
}

/* ------------------------------------------------------------------ */
/* Assembly & publishing                                                */
/* ------------------------------------------------------------------ */

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "universe";

/** Builds (or rebuilds) a draft universe from the approved outputs. */
export function assembleUniverseTx(draft: DbState, actorId: string, jobId: string, at: number): Universe {
  requireAdminUser(draft, actorId);
  const job = requireJob(draft, jobId);
  const need: StepKey[] = ["concept", "world", "characters", "visual", "story", "cards", "review", "publishing"];
  for (const k of need) if (!approvedOutput(job, k)) throw new ServiceError("needs_approval", `Approve "${stepDef(k).title}" before assembling.`, 409);
  const concept = approvedOutput<Concept>(job, "concept")!;
  const world = approvedOutput<World>(job, "world")!;
  const characters = approvedOutput<Characters>(job, "characters")!;
  const visual = approvedOutput<Visual>(job, "visual")!;
  const story = approvedOutput<Story>(job, "story")!;
  const cardsOut = approvedOutput<Cards>(job, "cards")!;
  const pub = approvedOutput<Publishing>(job, "publishing")!;

  const idx = catalog(draft);
  const existing = job.universeId ? draft.universes.find((u) => u.id === job.universeId) : undefined;
  let slug = existing?.slug ?? slugify(concept.title);
  if (!existing) while (idx.bySlug.has(slug)) slug = `${slugify(concept.title)}-${Math.floor(Math.random() * 900 + 100)}`;
  const id = existing?.id ?? slug;
  const launch = existing?.launchOffsetDays ?? Math.floor((at - idx.epoch) / DAY_MS);
  const dayFor = (n: number) => launch + (pub.schedule.find((s) => s.episodeNumber === n)?.dayOffset ?? 0);

  const episodes: Episode[] = story.episodes.map((e, i) => ({
    id: `${id}-s1e${i + 1}`,
    universeId: id,
    season: 1,
    number: i + 1,
    title: e.title,
    synopsis: e.synopsis,
    minutes: Math.max(2, Math.round(e.body.join(" ").split(/\s+/).length / 180)),
    body: e.body,
    characterIds: e.characterIds,
    cardIds: [],
    access: i === 2 ? { type: "collect", cards: 5 } : i === 3 ? { type: "shards", cost: 40 } : { type: "free" },
    releaseOffsetDays: dayFor(i + 1),
    cliffhanger: e.cliffhanger || undefined,
  }));
  const setId = `${id}-s1`;
  const cards: Card[] = cardsOut.cards.map((c, i) => {
    const cid = `${id}-s1-${String(i + 1).padStart(3, "0")}`;
    const ep = episodes[Math.min(episodes.length, Math.max(1, Math.round(c.episodeNumber))) - 1]!;
    ep.cardIds.push(cid);
    return {
      id: cid,
      universeId: id,
      setId,
      season: 1,
      number: i + 1,
      name: c.name,
      kind: c.kind,
      rarity: c.rarity,
      factionId: c.factionId || undefined,
      characterId: c.characterId || undefined,
      episodeId: ep.id,
      description: c.description,
      lore: c.lore,
      artPrompt: c.artPrompt,
      artSeed: hashString(cid),
      releaseOffsetDays: ep.releaseOffsetDays,
    };
  });
  const lead = characters.characters.find((c) => c.role === "lead");
  const leadCard = cards.find((c) => c.characterId === lead?.id);
  const universe: Universe = {
    id,
    slug,
    title: concept.title,
    tagline: concept.tagline,
    premise: concept.premise,
    synopsis: concept.synopsis,
    genres: concept.genres as Universe["genres"],
    audience: concept.audience,
    differentiation: concept.differentiation,
    style: visual,
    world: { history: world.history, geography: world.geography, rules: world.rules, culture: world.culture, mythology: world.mythology, conflicts: world.conflicts, locations: world.locations, secrets: world.secrets },
    factions: world.factions,
    characters: characters.characters,
    seasons: [
      { number: 1, title: story.seasonTitle, synopsis: story.seasonSynopsis, releaseOffsetDays: launch, plannedEpisodes: Math.max(story.plannedEpisodes, episodes.length) },
      ...(story.spinoffs.length ? [{ number: 2, title: "Season 2", synopsis: story.spinoffs[0]!, releaseOffsetDays: launch + 45, plannedEpisodes: 10 }] : []),
    ],
    episodes,
    sets: [{ id: setId, universeId: id, season: 1, name: cardsOut.setName, code: cardsOut.setCode.slice(0, 4).toUpperCase(), description: `Season 1 core set — ${cards.length} cards.` }],
    cards,
    extras: [
      ...(leadCard ? [{ id: `${id}-x1`, universeId: id, kind: "diary" as const, title: `${lead!.name}'s Notes`, body: [lead!.bio, lead!.motivation], requirement: { type: "own-card" as const, cardId: leadCard.id } }] : []),
      { id: `${id}-x2`, universeId: id, kind: "secret-lore" as const, title: "What Nobody Says", body: world.secrets, requirement: { type: "own-count" as const, count: 10 } },
    ],
    launchOffsetDays: launch,
    status: existing?.status === "published" ? "published" : "review",
    editorial: existing?.editorial ?? {},
    demoMetrics: { followers: 0, collectors: 0, packsOpened: 0, growth: 0, rating: 0 },
    source: "studio",
    createdAt: existing?.createdAt ?? iso(at),
    updatedAt: iso(at),
  };
  if (existing) Object.assign(existing, universe);
  else draft.universes.push(universe);
  job.universeId = id;
  job.status = "approved";
  job.updatedAt = iso(at);
  audit(draft, actorId, "universe:assemble", at, id, `from ${jobId}`);
  return universe;
}

/** Publishes or unpublishes any universe (seeded ones via overrides). */
export function setUniverseStatusTx(draft: DbState, actorId: string, universeId: string, status: Universe["status"], at: number) {
  requireAdminUser(draft, actorId);
  const idx = catalog(draft);
  const u = idx.byId.get(universeId);
  if (!u) throw new ServiceError("not_found", "Universe not found", 404);
  if (status === "published" && u.cards.length < 5) throw new ServiceError("incomplete", "A universe needs at least 5 cards before publishing.", 409);
  const studio = draft.universes.find((x) => x.id === universeId);
  if (studio) {
    studio.status = status;
    studio.updatedAt = iso(at);
    if (status === "published") {
      // Launch now if the planned launch is in the past or unset.
      const nowOffset = Math.floor((at - idx.epoch) / DAY_MS);
      if (studio.launchOffsetDays > nowOffset) studio.launchOffsetDays = nowOffset;
    }
  } else {
    (draft.overrides[universeId] ??= {}).status = status;
  }
  for (const j of draft.jobs) if (j.universeId === universeId) j.status = status === "published" ? "published" : "approved";
  audit(draft, actorId, `universe:${status}`, at, universeId);
  if (status === "published") {
    for (const user of Object.values(draft.users)) {
      if (user.isDemo || user.role === "admin" || !user.settings.notifications.events) continue;
      if (!u.genres.some((g) => user.genres.includes(g))) continue;
      notify(draft, { userId: user.id, kind: "event", title: `New universe: ${u.title}`, body: u.tagline, href: `/universes/${u.slug}`, key: `launch:${u.id}` }, at);
    }
  }
}
