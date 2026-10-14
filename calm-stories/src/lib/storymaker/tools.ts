/**
 * Storymaker tool registry. Each tool has a validated input schema, an
 * optional confirmation rule (destructive changes, paid generation and public
 * release) and a `run` that calls the shared service layer. The same registry
 * serves the AI assistant and the workspace UI's buttons.
 */
import "server-only";
import * as z from "zod/v4";
import { GENRE_VALUES, SCENE_VALUES } from "@/lib/ai/schemas";
import { HttpError } from "@/lib/api";
import type { Viewer } from "@/lib/auth/viewer";
import { getDb } from "@/lib/db";
import { PALETTES } from "@/lib/seed/catalog";
import type { AiToolCall, AssistantCard } from "@/lib/types";
import { newId, nowIso } from "@/lib/util";
import * as svc from "./service";

export interface ToolContext {
  viewer: Viewer;
  seriesId: string | null;
  conversationId: string | null;
}

export interface ToolOutcome {
  summary: string;
  data?: unknown;
  cards?: AssistantCard[];
  /** Set when the tool created or switched the active series. */
  seriesId?: string;
}

interface ToolDef<I> {
  name: string;
  description: string;
  input: z.ZodType<I>;
  /** Returns a reason when the creator must confirm before this runs. */
  confirm?: (input: I, ctx: ToolContext) => Promise<string | null> | string | null;
  run: (input: I, ctx: ToolContext) => Promise<ToolOutcome>;
}

type AnyTool = ToolDef<unknown>;

/** Defines a tool with inputs typed from its schema, erased for the registry. */
function tool<S extends z.ZodType>(def: { name: string; description: string; input: S } & Omit<ToolDef<z.infer<S>>, "name" | "description" | "input">): AnyTool {
  return def as unknown as AnyTool;
}

const seriesId = z.string().optional().describe("Series id. Defaults to the series open in the workspace.");
const episodeId = z.string().describe("Episode id from the workspace context.");

function sid(input: { series_id?: string }, ctx: ToolContext): string {
  const id = input.series_id ?? ctx.seriesId;
  if (!id) throw new HttpError(400, "Create or open a series first.");
  return id;
}

const ScriptSettingsInput = z
  .object({
    duration_minutes: z.number().int().min(5).max(60),
    mood: z.enum(["dreamy", "cosy", "wistful", "wonder", "tender"]),
    perspective: z.enum(["third", "first", "second"]),
    style: z.enum(["lyrical", "storybook", "literary", "minimal"]),
    dialogue: z.enum(["none", "light", "moderate"]),
    romance: z.enum(["none", "gentle", "warm"]),
    pacing: z.enum(["very-slow", "slow", "gentle"]),
  })
  .partial();

const meta = (m: { simulated: boolean; provider: string; model: string }) => (m.simulated ? " (simulated writer)" : ` (${m.model})`);

export const TOOLS: AnyTool[] = [
  tool({
    name: "propose_concept",
    description: "Develop the creator's idea into a series concept (title, tagline, synopsis, genre, characters). Shows a proposal card; nothing is saved until the creator accepts it.",
    input: z.object({ idea: z.string().min(3).max(4000) }),
    run: async (i, ctx) => {
      const { proposal, meta: m } = await svc.proposeConcept(ctx.viewer, i.idea, ctx.conversationId);
      return { summary: `Proposed "${proposal.title}"${meta(m)}.`, data: proposal, cards: [{ type: "concept", proposal }] };
    },
  }),
  tool({
    name: "create_series",
    description: "Create a new private draft series from an agreed concept, with an initial Story Bible, characters and Season One.",
    input: z.object({
      title: z.string().min(1).max(120),
      tagline: z.string().max(200),
      synopsis: z.string().max(2000),
      genre: z.enum(GENRE_VALUES),
      tags: z.array(z.string()).max(8),
      scene: z.enum(SCENE_VALUES),
      narrative_arc: z.string().max(1000).optional(),
      original_idea: z.string().max(4000).optional(),
      characters: z.array(z.object({ name: z.string(), role: z.string(), sketch: z.string() })).max(6).optional(),
    }),
    run: async (i, ctx) => {
      const s = await svc.createSeries(ctx.viewer, i);
      return { summary: `Created the draft series "${s.title}".`, data: { id: s.id, slug: s.slug }, seriesId: s.id };
    },
  }),
  tool({
    name: "update_series",
    description: "Edit the series title, tagline, description, genre or tags.",
    input: z.object({ series_id: seriesId, title: z.string().max(120).optional(), tagline: z.string().max(200).optional(), description: z.string().max(2000).optional(), genre: z.enum(GENRE_VALUES).optional(), tags: z.array(z.string()).max(8).optional() }),
    run: async ({ series_id, ...patch }, ctx) => {
      const s = await svc.updateSeries(ctx.viewer, sid({ series_id }, ctx), patch);
      return { summary: `Updated ${Object.keys(patch).join(", ") || "nothing"} for "${s.title}".` };
    },
  }),
  tool({
    name: "generate_synopsis",
    description: "Refresh the series tagline and synopsis from the story so far.",
    input: z.object({ series_id: seriesId }),
    run: async (i, ctx) => {
      const { series, meta: m } = await svc.generateSynopsis(ctx.viewer, sid(i, ctx));
      return { summary: `New synopsis for "${series.title}"${meta(m)}: ${series.tagline}` };
    },
  }),
  tool({
    name: "create_world",
    description: "Generate the World Bible (geography, culture, history, atmosphere, rules, themes, recurring locations). Keeps established facts and open threads.",
    input: z.object({ series_id: seriesId, brief: z.string().max(2000).optional() }),
    confirm: async (i, ctx) => ((await svc.worldExists(sid(i, ctx))) ? "This rewrites the World Bible's descriptions and rules. Established facts and open threads are kept." : null),
    run: async (i, ctx) => {
      const { bible, meta: m } = await svc.createWorld(ctx.viewer, sid(i, ctx), i.brief);
      return { summary: `Built the World Bible for ${bible.world_name}${meta(m)}.` };
    },
  }),
  tool({
    name: "update_world_bible",
    description: "Edit World Bible fields. List fields replace the existing list, so include existing entries you want to keep. Use add_* fields to append.",
    input: z.object({
      series_id: seriesId,
      world_name: z.string().max(120).optional(),
      geography: z.string().max(4000).optional(),
      culture: z.string().max(4000).optional(),
      history: z.string().max(4000).optional(),
      atmosphere: z.string().max(4000).optional(),
      rules: z.array(z.string()).optional(),
      themes: z.array(z.string()).optional(),
      established_facts: z.array(z.string()).optional(),
      unresolved_threads: z.array(z.string()).optional(),
      creator_preferences: z.array(z.string()).optional(),
      add_rules: z.array(z.string()).optional(),
      add_facts: z.array(z.string()).optional(),
      add_threads: z.array(z.string()).optional(),
      add_preferences: z.array(z.string()).optional(),
      add_locations: z.array(z.object({ name: z.string(), description: z.string() })).optional(),
    }),
    confirm: async ({ series_id, add_rules: _a, add_facts: _b, add_threads: _c, add_preferences: _d, add_locations: _e, ...patch }, ctx) => {
      const removed = await svc.bibleRemovals(sid({ series_id }, ctx), patch);
      return removed.length ? `This removes ${removed.length} Story Bible entr${removed.length === 1 ? "y" : "ies"}: ${removed.slice(0, 3).map((r) => `"${r}"`).join(", ")}${removed.length > 3 ? "…" : ""}` : null;
    },
    run: async ({ series_id, add_rules, add_facts, add_threads, add_preferences, add_locations, ...patch }, ctx) => {
      const id = sid({ series_id }, ctx);
      const prev = await getDb().findOne("story_bibles", { series_id: id });
      const merge = (base: string[] | undefined, extra: string[] | undefined) => (extra?.length ? [...new Set([...(base ?? []), ...extra])] : base);
      const bible = await svc.updateWorldBible(ctx.viewer, id, {
        ...patch,
        rules: merge(patch.rules ?? prev?.rules, add_rules),
        established_facts: merge(patch.established_facts ?? prev?.established_facts, add_facts),
        unresolved_threads: merge(patch.unresolved_threads ?? prev?.unresolved_threads, add_threads),
        creator_preferences: merge(patch.creator_preferences ?? prev?.creator_preferences, add_preferences),
      });
      for (const l of add_locations ?? []) await svc.addLocation(ctx.viewer, id, l.name, l.description);
      return { summary: `Updated the World Bible${bible.world_name ? ` for ${bible.world_name}` : ""}.` };
    },
  }),
  tool({
    name: "create_character",
    description: "Add characters. Give a brief (e.g. 'a retired lighthouse keeper named Bram') and the writer fills in the details, or give the fields directly.",
    input: z.object({
      series_id: seriesId,
      brief: z.string().max(2000).optional(),
      count: z.number().int().min(1).max(4).optional(),
      name: z.string().max(80).optional(),
      age_range: z.string().optional(),
      personality: z.string().optional(),
      backstory: z.string().optional(),
      motivations: z.string().optional(),
      narrative_role: z.string().optional(),
      voice_profile: z.string().optional(),
      arc: z.string().optional(),
    }),
    run: async ({ series_id, brief, count, ...fields }, ctx) => {
      const id = sid({ series_id }, ctx);
      if (fields.name && fields.personality) {
        const c = await svc.addCharacter(ctx.viewer, id, { ...fields, name: fields.name });
        return { summary: `Added ${c.name}.`, data: { id: c.id } };
      }
      const { characters, meta: m } = await svc.createCharacters(ctx.viewer, id, { brief: brief ?? (fields.name ? `named ${fields.name}` : undefined), count });
      return { summary: characters.length ? `Added ${characters.map((c) => c.name).join(", ")}${meta(m)}.` : "No new characters were added (names already exist).", data: characters.map((c) => ({ id: c.id, name: c.name })) };
    },
  }),
  tool({
    name: "update_character",
    description: "Edit a character's profile fields.",
    input: z.object({
      character_id: z.string(),
      name: z.string().max(80).optional(),
      age_range: z.string().optional(),
      personality: z.string().optional(),
      backstory: z.string().optional(),
      motivations: z.string().optional(),
      narrative_role: z.string().optional(),
      voice_profile: z.string().optional(),
      arc: z.string().optional(),
    }),
    confirm: async (i) => {
      if (!i.name) return null;
      const c = await getDb().get("characters", i.character_id);
      return c && c.name !== i.name ? `This renames ${c.name} to ${i.name}. Earlier scripts will still use the old name.` : null;
    },
    run: async ({ character_id, ...patch }, ctx) => {
      const c = await svc.updateCharacter(ctx.viewer, character_id, patch);
      return { summary: `Updated ${c.name}.` };
    },
  }),
  tool({
    name: "delete_character",
    description: "Remove a character and their relationships from the series.",
    input: z.object({ character_id: z.string() }),
    confirm: async (i) => {
      const c = await getDb().get("characters", i.character_id);
      return `This permanently removes ${c?.name ?? "this character"} and their relationships.`;
    },
    run: async (i, ctx) => {
      const c = await svc.deleteCharacter(ctx.viewer, i.character_id);
      return { summary: `Removed ${c.name}.` };
    },
  }),
  tool({
    name: "set_relationship",
    description: "Create or update the relationship between two characters.",
    input: z.object({ series_id: seriesId, character_a_id: z.string(), character_b_id: z.string(), kind: z.string().max(80), description: z.string().max(1000) }),
    run: async (i, ctx) => {
      await svc.setRelationship(ctx.viewer, sid(i, ctx), i.character_a_id, i.character_b_id, i.kind, i.description);
      return { summary: `Relationship saved: ${i.kind}.` };
    },
  }),
  tool({
    name: "generate_season_outline",
    description: "Plan a season: title, arc, milestones and planned episodes with titles and summaries.",
    input: z.object({ series_id: seriesId, episode_count: z.number().int().min(1).max(12).optional(), brief: z.string().max(2000).optional(), duration_minutes: z.number().int().min(5).max(60).optional() }),
    run: async (i, ctx) => {
      const { episodes, meta: m } = await svc.generateSeasonOutline(ctx.viewer, sid(i, ctx), { episodeCount: i.episode_count, brief: i.brief, durationMinutes: i.duration_minutes });
      return { summary: `Planned ${episodes.length} episodes${meta(m)}: ${episodes.map((e) => `"${e.title}"`).slice(0, 4).join(", ")}${episodes.length > 4 ? "…" : ""}`, data: episodes.map((e) => ({ id: e.id, number: e.number, title: e.title })) };
    },
  }),
  tool({
    name: "add_episode",
    description: "Add a planned episode with a title and summary to the latest season.",
    input: z.object({ series_id: seriesId, title: z.string().min(1).max(120), summary: z.string().max(1000) }),
    run: async (i, ctx) => {
      const ep = await svc.addEpisode(ctx.viewer, sid(i, ctx), i);
      return { summary: `Added episode ${ep.number}, "${ep.title}".`, data: { id: ep.id } };
    },
  }),
  tool({
    name: "generate_episode_outline",
    description: "Outline one episode into beats.",
    input: z.object({ episode_id: episodeId }),
    run: async (i, ctx) => {
      const { episode, beats, meta: m } = await svc.generateEpisodeOutline(ctx.viewer, i.episode_id);
      return { summary: `Outlined "${episode.title}"${meta(m)}:\n${beats.map((b, n) => `${n + 1}. ${b}`).join("\n")}` };
    },
  }),
  tool({
    name: "write_episode",
    description: "Write the full narration script for an episode. Saves a new script version (earlier versions are kept) and runs a continuity check.",
    input: z.object({ episode_id: episodeId, direction: z.string().max(2000).optional(), settings: ScriptSettingsInput.optional() }),
    run: async (i, ctx) => {
      const { version, continuity, meta: m } = await svc.writeEpisode(ctx.viewer, i.episode_id, { direction: i.direction, settings: i.settings });
      const ep = await getDb().get("episodes", i.episode_id);
      return {
        summary: `Wrote "${ep?.title}" (version ${version.version}, ${version.word_count.toLocaleString()} words)${meta(m)}.`,
        data: { version_id: version.id, continuity: continuity.summary },
        cards: continuity.issues.some((x) => x.severity !== "info") ? [{ type: "continuity", report: continuity }] : [],
      };
    },
  }),
  tool({
    name: "rewrite_script_section",
    description: "Rewrite an exact passage of an episode's current script according to an instruction, saving a new version.",
    input: z.object({ episode_id: episodeId, passage: z.string().min(1).max(12000).describe("Exact text copied from the current script."), instruction: z.string().min(2).max(500) }),
    run: async (i, ctx) => {
      const { version, meta: m } = await svc.rewriteSection(ctx.viewer, i.episode_id, i.passage, i.instruction);
      return { summary: `Rewrote the passage (now version ${version.version})${meta(m)}.` };
    },
  }),
  tool({
    name: "check_story_continuity",
    description: "Check an episode's script against the Story Bible, characters and earlier episodes. Flags issues; never rewrites.",
    input: z.object({ episode_id: episodeId }),
    run: async (i, ctx) => {
      const report = await svc.checkContinuity(ctx.viewer, i.episode_id);
      return { summary: report.summary, cards: [{ type: "continuity", report }] };
    },
  }),
  tool({
    name: "check_sleep_suitability",
    description: "Score how suitable an episode's script is for bedtime listening, with notes.",
    input: z.object({ episode_id: episodeId }),
    run: async (i, ctx) => {
      const r = await svc.checkSleepSuitability(ctx.viewer, i.episode_id);
      return { summary: `Sleep suitability ${r.score}/100.`, cards: [{ type: "sleep_check", score: r.score, notes: r.notes }] };
    },
  }),
  tool({
    name: "continue_story",
    description: "Propose what happens in the next episode, continuing open threads. The creator accepts, modifies or rejects it.",
    input: z.object({ series_id: seriesId, hint: z.string().max(1000).optional() }),
    run: async (i, ctx) => {
      const { proposal, meta: m } = await svc.proposeDirection(ctx.viewer, sid(i, ctx), i.hint);
      return { summary: `Suggested next episode: "${proposal.episode_title}"${meta(m)}.`, cards: [{ type: "direction", proposal }] };
    },
  }),
  tool({
    name: "accept_direction",
    description: "Accept (optionally edited) next-episode direction and add it as a planned episode.",
    input: z.object({ series_id: seriesId, episode_title: z.string().min(1).max(120), summary: z.string().max(1000), beats: z.array(z.string()).max(10), threads_advanced: z.array(z.string()).max(10) }),
    run: async ({ series_id, ...proposal }, ctx) => {
      const ep = await svc.acceptDirection(ctx.viewer, sid({ series_id }, ctx), proposal);
      return { summary: `Added "${ep.title}" as episode ${ep.number}.`, data: { id: ep.id } };
    },
  }),
  tool({
    name: "generate_cover_art",
    description: "Generate new cover artwork for the series (procedural illustrated scene).",
    input: z.object({ series_id: seriesId, scene: z.enum(SCENE_VALUES).optional(), palette: z.enum(Object.keys(PALETTES) as [keyof typeof PALETTES, ...(keyof typeof PALETTES)[]]).optional(), prompt: z.string().max(500).optional() }),
    run: async (i, ctx) => {
      const spec = await svc.generateCoverArt(ctx.viewer, sid(i, ctx), { scene: i.scene, palette: i.palette, prompt: i.prompt });
      return { summary: `New ${spec.scene} cover artwork is ready.` };
    },
  }),
  tool({
    name: "schedule_episode",
    description: "Request a public release time for an episode. It is only released at that time after editorial approval.",
    input: z.object({ episode_id: episodeId, release_at: z.string().describe("ISO 8601 date-time") }),
    confirm: async (i) => {
      const ep = await getDb().get("episodes", i.episode_id);
      return `Schedule "${ep?.title ?? "this episode"}" for public release on ${new Date(i.release_at).toUTCString()}, subject to editorial approval.`;
    },
    run: async (i, ctx) => {
      const { schedule, approved } = await svc.scheduleEpisode(ctx.viewer, i.episode_id, i.release_at);
      return { summary: `Requested release on ${new Date(schedule.release_at).toUTCString()}. ${approved ? "It's approved, so it will go live then." : "It goes live then only once an editor approves it."}` };
    },
  }),
  tool({
    name: "submit_for_review",
    description: "Submit an episode to Calm's editorial review for public release. Needs a script and a rights declaration.",
    input: z.object({ episode_id: episodeId, requested_release_at: z.string().optional(), notes: z.string().max(2000).optional() }),
    confirm: async (i) => {
      const ep = await getDb().get("episodes", i.episode_id);
      return `Submit "${ep?.title ?? "this episode"}" to Calm's editors for public release. The script is locked while it's in review.`;
    },
    run: async (i, ctx) => {
      const r = await svc.submitForReview(ctx.viewer, i.episode_id, { requestedReleaseAt: i.requested_release_at, notes: i.notes });
      const flagged = r.checks.filter((c) => c.status === "warn" || c.status === "fail").map((c) => c.name.replace("_", " "));
      return { summary: `Submitted for editorial review.${flagged.length ? ` Automated checks flagged: ${flagged.join(", ")}.` : " All automated checks passed."}` };
    },
  }),
];

const registry = new Map<string, AnyTool>();
export function registerTools(defs: readonly AnyTool[]) {
  for (const t of defs) registry.set(t.name, t);
}
registerTools(TOOLS);

export function getTool(name: string): AnyTool {
  const t = registry.get(name);
  if (!t) throw new HttpError(400, `Unknown tool: ${name}`);
  return t;
}

/** JSON-schema tool specs for model providers. */
export function toolSpecs() {
  return [...registry.values()].map((t) => {
    const { $schema: _s, ...schema } = z.toJSONSchema(t.input) as Record<string, unknown>;
    return { name: t.name, description: t.description, input_schema: schema };
  });
}

export function parseToolInput(t: AnyTool, raw: unknown): unknown {
  const r = t.input.safeParse(raw ?? {});
  if (!r.success) throw new HttpError(400, `Invalid input for ${t.name}: ${r.error.issues.map((i) => `${i.path.join(".") || "input"} ${i.message}`).join("; ")}`);
  return r.data;
}

export type DispatchResult =
  | { status: "executed"; call: AiToolCall; outcome: ToolOutcome }
  | { status: "needs_confirmation"; call: AiToolCall; reason: string }
  | { status: "failed"; call: AiToolCall; error: string };

async function audit(ctx: ToolContext, name: string, input: unknown, patch: Partial<AiToolCall>): Promise<AiToolCall> {
  const row: AiToolCall = {
    id: newId("call"),
    conversation_id: ctx.conversationId,
    user_id: ctx.viewer.user?.id ?? "anonymous",
    series_id: ctx.seriesId,
    tool: name,
    input,
    output: null,
    status: "executed",
    confirmation_reason: null,
    error: null,
    created_at: nowIso(),
    executed_at: null,
    ...patch,
  };
  if (ctx.viewer.user) await getDb().insert("ai_tool_calls", row);
  return row;
}

/**
 * Validates and runs a tool. When the tool needs confirmation and the caller
 * hasn't confirmed, nothing runs: a pending call is stored instead.
 */
export async function dispatchTool(name: string, rawInput: unknown, ctx: ToolContext, opts: { confirmed?: boolean } = {}): Promise<DispatchResult> {
  const t = getTool(name);
  const input = parseToolInput(t, rawInput);
  if (!opts.confirmed && t.confirm) {
    const reason = await t.confirm(input, ctx);
    if (reason) {
      const call = await audit(ctx, name, input, { status: "pending_confirmation", confirmation_reason: reason });
      return { status: "needs_confirmation", call, reason };
    }
  }
  return execute(t, input, ctx);
}

async function execute(t: AnyTool, input: unknown, ctx: ToolContext, existing?: AiToolCall): Promise<DispatchResult> {
  try {
    const outcome = await t.run(input, ctx);
    const patch = { status: "executed" as const, output: { summary: outcome.summary, data: outcome.data ?? null }, executed_at: nowIso(), series_id: outcome.seriesId ?? ctx.seriesId };
    const call = existing ? await getDb().update("ai_tool_calls", existing.id, patch) : await audit(ctx, t.name, input, patch);
    return { status: "executed", call, outcome };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Tool failed";
    const patch = { status: "failed" as const, error: message, executed_at: nowIso() };
    const call = existing ? await getDb().update("ai_tool_calls", existing.id, patch) : await audit(ctx, t.name, input, patch);
    if (err instanceof HttpError || (err instanceof Error && "status" in err)) return { status: "failed", call, error: message };
    throw err;
  }
}

async function ownPendingCall(viewer: Viewer, callId: string): Promise<AiToolCall> {
  const call = await getDb().get("ai_tool_calls", callId);
  if (!call || !viewer.user || call.user_id !== viewer.user.id) throw new HttpError(404, "Action not found");
  if (call.status !== "pending_confirmation") throw new HttpError(409, `This action was already ${call.status.replace("_", " ")}.`);
  return call;
}

export async function confirmToolCall(viewer: Viewer, callId: string): Promise<DispatchResult> {
  const call = await ownPendingCall(viewer, callId);
  const t = getTool(call.tool);
  return execute(t, parseToolInput(t, call.input), { viewer, seriesId: call.series_id, conversationId: call.conversation_id }, call);
}

export async function cancelToolCall(viewer: Viewer, callId: string): Promise<AiToolCall> {
  const call = await ownPendingCall(viewer, callId);
  return getDb().update("ai_tool_calls", call.id, { status: "cancelled", executed_at: nowIso() });
}
