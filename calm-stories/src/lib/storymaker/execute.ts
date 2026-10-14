import "server-only";
import { ZodError } from "zod";
import { getDb } from "@/lib/db";
import { badRequest, forbidden, HttpError, notFound } from "@/lib/errors";
import { track } from "@/lib/analytics";
import { log } from "@/lib/log";
import { newId, nowIso } from "@/lib/util";
import { authorizeTool, getTool, type ToolContext, type ToolResult } from "./registry";
import "./tools";

export type ExecuteOutcome =
  | { status: "executed"; tool: string; tool_call_id: string; result: ToolResult }
  | { status: "pending_confirmation"; tool: string; tool_call_id: string; reason: string; summary: string };

export const TOOL_LABELS: Record<string, string> = {
  generate_synopsis: "Develop concept",
  create_series: "Create series",
  update_series: "Update series details",
  create_world: "Build the world",
  update_world_bible: "Edit World Bible",
  add_location: "Add location",
  update_location: "Edit location",
  delete_location: "Delete location",
  create_character: "Create characters",
  update_character: "Edit character",
  delete_character: "Delete character",
  add_relationship: "Add relationship",
  delete_relationship: "Remove relationship",
  generate_season_outline: "Plan season",
  create_episode: "Add episode",
  update_episode: "Edit episode",
  reorder_episodes: "Reorder episodes",
  delete_episode: "Delete episode",
  continue_story: "Continue this story",
  generate_episode_outline: "Outline episode",
  write_episode: "Write episode",
  save_script: "Save script",
  update_script_settings: "Script settings",
  restore_script_version: "Restore version",
  rewrite_script_section: "Rewrite passage",
  check_story_continuity: "Check continuity",
  approve_script: "Approve script",
  update_production_settings: "Update audio settings",
  preview_voice: "Preview voice",
  generate_narration: "Generate narration",
  generate_soundscape: "Generate soundscape",
  mix_episode_audio: "Mix episode audio",
  generate_cover_art: "Generate cover art",
  save_rights_declaration: "Rights declaration",
  schedule_episode: "Schedule release",
  submit_for_review: "Submit for editorial review",
};

function describeCall(tool: string, input: unknown): string {
  const label = TOOL_LABELS[tool] ?? tool;
  const i = (input ?? {}) as Record<string, unknown>;
  const detail = (i.title as string) ?? (i.instruction as string) ?? (i.brief as string) ?? "";
  return detail ? `${label}: ${String(detail).slice(0, 80)}` : label;
}

/**
 * Validate → authorise → (maybe) hold for confirmation → run → audit.
 * Every call is persisted in ai_tool_calls for auditing.
 */
export async function executeTool(name: string, rawInput: unknown, ctx: ToolContext): Promise<ExecuteOutcome> {
  const def = getTool(name);
  if (!def) throw badRequest(`Unknown tool “${name}”.`);
  let input: unknown;
  try {
    input = def.input.parse(rawInput ?? {});
  } catch (err) {
    if (err instanceof ZodError) throw badRequest(`Invalid input for ${name}: ${err.issues.map((i) => `${i.path.join(".") || "input"} ${i.message}`).join("; ")}`);
    throw err;
  }
  const series = await authorizeTool(def, ctx);
  const db = getDb();
  const reason = def.confirm ? await def.confirm(input, ctx) : null;
  if (reason) {
    const id = newId("tc");
    await db.insert("ai_tool_calls", {
      id,
      conversation_id: ctx.conversationId,
      user_id: ctx.viewer.user.id,
      series_id: ctx.seriesId,
      tool: name,
      input,
      output: null,
      status: "pending_confirmation",
      confirmation_reason: reason,
      error: null,
      created_at: nowIso(),
      executed_at: null,
    });
    return { status: "pending_confirmation", tool: name, tool_call_id: id, reason, summary: describeCall(name, input) };
  }
  return runAndRecord(name, input, ctx, series, null);
}

async function runAndRecord(name: string, input: unknown, ctx: ToolContext, series: Awaited<ReturnType<typeof authorizeTool>>, existingId: string | null): Promise<ExecuteOutcome> {
  const def = getTool(name)!;
  const db = getDb();
  const id = existingId ?? newId("tc");
  const base = {
    id,
    conversation_id: ctx.conversationId,
    user_id: ctx.viewer.user.id,
    series_id: ctx.seriesId,
    tool: name,
    input,
    confirmation_reason: null as string | null,
    created_at: nowIso(),
  };
  try {
    const result = await def.run(input, { ...ctx, series });
    const record = { ...base, output: { summary: result.summary, meta: result.meta ?? null }, status: "executed" as const, error: null, executed_at: nowIso() };
    if (existingId) await db.update("ai_tool_calls", id, record);
    else await db.insert("ai_tool_calls", record);
    await track("storymaker_tool_executed", ctx.viewer.user.id, { tool: name, series_id: result.series_id ?? ctx.seriesId, simulated: result.meta?.simulated ?? null });
    return { status: "executed", tool: name, tool_call_id: id, result };
  } catch (err) {
    const message = err instanceof HttpError ? err.message : err instanceof Error ? err.message : "Tool failed";
    if (!(err instanceof HttpError)) log.error("storymaker", `Tool ${name} failed`, { error: String(err) });
    const record = { ...base, output: null, status: "failed" as const, error: message, executed_at: nowIso() };
    if (existingId) await db.update("ai_tool_calls", id, record);
    else await db.insert("ai_tool_calls", record);
    throw err;
  }
}

export async function resolveToolCall(id: string, action: "confirm" | "cancel", ctx: Omit<ToolContext, "seriesId" | "conversationId" | "confirmed">): Promise<ExecuteOutcome | { status: "cancelled"; tool_call_id: string }> {
  const db = getDb();
  const call = await db.get("ai_tool_calls", id);
  if (!call) throw notFound("Action not found.");
  if (call.user_id !== ctx.viewer.user.id) throw forbidden();
  if (call.status !== "pending_confirmation") throw badRequest("This action has already been handled.");
  if (action === "cancel") {
    await db.update("ai_tool_calls", id, { status: "cancelled", executed_at: nowIso() });
    return { status: "cancelled", tool_call_id: id };
  }
  const def = getTool(call.tool);
  if (!def) throw badRequest("Unknown tool.");
  const full: ToolContext = { ...ctx, seriesId: call.series_id, conversationId: call.conversation_id, confirmed: true };
  const series = await authorizeTool(def, full);
  return runAndRecord(call.tool, call.input, full, series, id);
}
