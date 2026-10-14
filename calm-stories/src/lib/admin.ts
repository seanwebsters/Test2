/** Administrator operations: agents, AI settings, series status and moderation. */
import "server-only";
import { HttpError } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/policy";
import type { Viewer } from "@/lib/auth/viewer";
import { getDb } from "@/lib/db";
import { DEFAULT_AI_SETTINGS } from "@/lib/seed/agents";
import type { AgentConfiguration, AiSettings, ContentReport, Series } from "@/lib/types";
import { newId, nowIso } from "@/lib/util";

export type AgentPatch = Partial<Pick<AgentConfiguration, "provider" | "model" | "prompt_template" | "temperature" | "max_cost_cents_per_job" | "retry_limit" | "enabled">>;

export async function updateAgent(viewer: Viewer, id: string, patch: AgentPatch): Promise<AgentConfiguration> {
  requireAdmin(viewer);
  const db = getDb();
  const a = await db.get("agent_configurations", id);
  if (!a) throw new HttpError(404, "Agent not found");
  const clean: AgentPatch = { ...patch };
  if (clean.temperature !== undefined) clean.temperature = Math.min(1, Math.max(0, clean.temperature));
  if (clean.retry_limit !== undefined) clean.retry_limit = Math.min(5, Math.max(0, Math.round(clean.retry_limit)));
  if (clean.max_cost_cents_per_job !== undefined) clean.max_cost_cents_per_job = Math.max(0, Math.round(clean.max_cost_cents_per_job));
  if (clean.prompt_template !== undefined) clean.prompt_template = clean.prompt_template.slice(0, 8000);
  await audit(viewer, "update_agent", { id, patch: clean });
  return db.update("agent_configurations", id, { ...clean, updated_at: nowIso() });
}

export type SettingsPatch = Partial<Omit<AiSettings, "id" | "updated_at">>;

export async function updateAiSettings(viewer: Viewer, patch: SettingsPatch): Promise<AiSettings> {
  requireAdmin(viewer);
  const db = getDb();
  const prev = (await db.get("ai_settings", "global")) ?? { ...DEFAULT_AI_SETTINGS, updated_at: nowIso() };
  const next: AiSettings = { ...prev, ...patch, id: "global", updated_at: nowIso() };
  next.monthly_cost_limit_cents = Math.max(0, Math.round(next.monthly_cost_limit_cents));
  next.per_job_cost_limit_cents = Math.max(0, Math.round(next.per_job_cost_limit_cents));
  next.retry_limit = Math.min(5, Math.max(0, Math.round(next.retry_limit)));
  next.max_concurrent_jobs = Math.min(10, Math.max(1, Math.round(next.max_concurrent_jobs)));
  for (const [k, v] of Object.entries(next.prompt_templates)) if (!v.trim()) delete next.prompt_templates[k];
  await audit(viewer, "update_ai_settings", patch);
  return db.upsert("ai_settings", next);
}

async function audit(viewer: Viewer, tool: string, input: unknown) {
  await getDb().insert("ai_tool_calls", {
    id: newId("audit"),
    conversation_id: null,
    user_id: viewer.user!.id,
    series_id: null,
    tool: `admin:${tool}`,
    input,
    output: null,
    status: "executed",
    confirmation_reason: null,
    error: null,
    created_at: nowIso(),
    executed_at: nowIso(),
  });
}

/** Archive, restore or remove a series (removal hides it everywhere). */
export async function setSeriesStatus(viewer: Viewer, seriesId: string, status: Extract<Series["status"], "published" | "archived" | "removed" | "draft">, reason?: string): Promise<Series> {
  requireAdmin(viewer);
  const db = getDb();
  const s = await db.get("series", seriesId);
  if (!s) throw new HttpError(404, "Series not found");
  if (status === "published" && !(await db.list("episodes", { where: { series_id: seriesId, status: "published" } })).length) {
    throw new HttpError(409, "A series needs at least one published episode to be listed.");
  }
  await audit(viewer, "set_series_status", { seriesId, from: s.status, to: status, reason: reason ?? "" });
  if (status === "removed" || status === "archived") {
    await db.insert("notifications", { id: newId("notif"), user_id: s.creator_id, kind: "system", title: `“${s.title}” was ${status}`, body: reason ?? "", link: null, read: false, created_at: nowIso() });
  }
  return db.update("series", seriesId, { status, updated_at: nowIso() });
}

export async function resolveReport(viewer: Viewer, reportId: string, action: "actioned" | "dismissed", resolution: string): Promise<ContentReport> {
  requireAdmin(viewer);
  const db = getDb();
  const r = await db.get("content_reports", reportId);
  if (!r) throw new HttpError(404, "Report not found");
  if (r.status !== "open") throw new HttpError(409, "This report is already resolved.");
  await audit(viewer, "resolve_report", { reportId, action, resolution });
  return db.update("content_reports", reportId, { status: action, resolution: resolution.slice(0, 2000), resolved_at: nowIso() });
}

/** Which provider keys are configured (never the keys themselves). */
export function keyStatus(env: { anthropicApiKey?: string; openaiApiKey?: string; elevenLabsApiKey?: string; triggerSecretKey?: string; posthogKey?: string; r2AccessKeyId?: string; supabaseServiceRoleKey?: string }) {
  return {
    anthropic: !!env.anthropicApiKey,
    openai: !!env.openaiApiKey,
    elevenlabs: !!env.elevenLabsApiKey,
    trigger: !!env.triggerSecretKey,
    posthog: !!env.posthogKey,
    r2: !!env.r2AccessKeyId,
    supabase: !!env.supabaseServiceRoleKey,
  };
}
