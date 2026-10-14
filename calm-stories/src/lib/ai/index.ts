/**
 * AI dispatcher. Resolves the writing provider from AI Settings and the
 * server's API keys, runs structured generation, and records the model,
 * prompt and cost of every call (production_costs + ai_tool_calls audit).
 *
 * When no provider key is configured the caller's deterministic mock is used
 * and every artefact is flagged `simulated: true`.
 */
import "server-only";
import type * as z from "zod/v4";
import { getDb } from "@/lib/db";
import { env } from "@/lib/env";
import { log } from "@/lib/log";
import { DEFAULT_AI_SETTINGS } from "@/lib/seed/agents";
import type { AiSettings, GenerationMeta } from "@/lib/types";
import { newId, nowIso } from "@/lib/util";
import { DEFAULT_PROMPTS } from "./prompts";
import { AnthropicProvider } from "./providers/anthropic";
import { OpenAIProvider } from "./providers/openai";
import type { AiTask, TextProvider, Usage } from "./types";

export { AiRefusalError } from "./types";

type ProviderChoice = AiSettings["writing_provider"];

export class AiBudgetError extends Error {
  readonly status = 402;
}

/** Estimated list prices in US cents per million tokens: [input, output]. */
const PRICE_PER_MTOK: [RegExp, number, number][] = [
  [/opus/, 500, 2500],
  [/sonnet/, 300, 1500],
  [/haiku/, 100, 500],
  [/gpt-5-mini/, 25, 200],
  [/gpt-5/, 125, 1000],
];

export function estimateCostCents(model: string, usage: Usage): number {
  const row = PRICE_PER_MTOK.find(([re]) => re.test(model));
  if (!row) return 0;
  const cents = (usage.input_tokens * row[1] + usage.output_tokens * row[2]) / 1_000_000;
  return Math.max(usage.input_tokens + usage.output_tokens > 0 ? 1 : 0, Math.ceil(cents));
}

export async function getAiSettings(): Promise<AiSettings> {
  const row = await getDb().get("ai_settings", "global");
  return row ?? { ...DEFAULT_AI_SETTINGS, updated_at: nowIso() };
}

export function promptFor(settings: AiSettings, key: string): string {
  return settings.prompt_templates[key]?.trim() || DEFAULT_PROMPTS[key] || "";
}

const cache = new Map<string, TextProvider>();

/** Which provider will actually serve writing requests (null = simulated). */
export function resolveProviderName(choice: ProviderChoice): "anthropic" | "openai" | null {
  if (choice === "mock") return null;
  if (choice === "anthropic") return env.anthropicApiKey ? "anthropic" : null;
  if (choice === "openai") return env.openaiApiKey ? "openai" : null;
  if (env.anthropicApiKey) return "anthropic";
  if (env.openaiApiKey) return "openai";
  return null;
}

export function getProvider(name: "anthropic" | "openai"): TextProvider {
  const hit = cache.get(name);
  if (hit) return hit;
  const p = name === "anthropic" ? new AnthropicProvider(env.anthropicApiKey as string) : new OpenAIProvider(env.openaiApiKey as string);
  cache.set(name, p);
  return p;
}

export function modelFor(settings: AiSettings, provider: "anthropic" | "openai", task: AiTask | "chat", override?: string | null): string {
  if (override && (provider === "anthropic" ? override.startsWith("claude") : !override.startsWith("claude"))) return override;
  if (provider === "anthropic") {
    const m = settings.task_models[task];
    return m?.startsWith("claude") ? m : settings.writing_model_anthropic;
  }
  return settings.task_models[`openai:${task}`] ?? settings.writing_model_openai;
}

export interface WriterInfo {
  provider: "anthropic" | "openai" | "mock";
  simulated: boolean;
  model: string;
}

export async function describeWriter(task: AiTask | "chat" = "script", choice?: ProviderChoice): Promise<WriterInfo> {
  const settings = await getAiSettings();
  const name = resolveProviderName(choice ?? settings.writing_provider);
  if (!name) return { provider: "mock", simulated: true, model: "calm-mock-writer" };
  return { provider: name, simulated: false, model: modelFor(settings, name, task) };
}

async function monthToDateCents(): Promise<number> {
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  const rows = await getDb().list("production_costs");
  return rows.filter((r) => !r.simulated && new Date(r.created_at) >= start).reduce((a, r) => a + r.cost_cents, 0);
}

export async function assertWithinBudget(settings: AiSettings): Promise<void> {
  const spent = await monthToDateCents();
  if (spent >= settings.monthly_cost_limit_cents) {
    throw new AiBudgetError(`The monthly AI budget ($${(settings.monthly_cost_limit_cents / 100).toFixed(2)}) has been reached. An administrator can raise it in AI Settings.`);
  }
}

export interface GenerationScope {
  userId?: string | null;
  seriesId?: string | null;
  episodeId?: string | null;
  jobId?: string | null;
  conversationId?: string | null;
  provider?: ProviderChoice;
  model?: string | null;
}

/** Records cost and an audit row for one model call. */
export async function recordGeneration(
  task: string,
  scope: GenerationScope,
  meta: GenerationMeta,
  promptPreview: string,
): Promise<void> {
  const db = getDb();
  try {
    await db.insert("production_costs", {
      id: newId("cost"),
      job_id: scope.jobId ?? null,
      series_id: scope.seriesId ?? null,
      episode_id: scope.episodeId ?? null,
      category: "llm",
      provider: meta.provider,
      model: meta.model,
      units: (meta.input_tokens ?? 0) + (meta.output_tokens ?? 0),
      unit_label: "tokens",
      cost_cents: meta.cost_cents,
      simulated: meta.simulated,
      created_at: nowIso(),
    });
    if (scope.userId) {
      await db.insert("ai_tool_calls", {
        id: newId("gen"),
        conversation_id: scope.conversationId ?? null,
        user_id: scope.userId,
        series_id: scope.seriesId ?? null,
        tool: `generate:${task}`,
        input: { prompt_preview: promptPreview.slice(0, 2000), episode_id: scope.episodeId ?? null },
        output: meta,
        status: "executed",
        confirmation_reason: null,
        error: null,
        created_at: nowIso(),
        executed_at: nowIso(),
      });
    }
  } catch (err) {
    log.warn("ai", "failed to record generation", err);
  }
}

export interface GenerateRequest<T> {
  task: AiTask;
  /** Key into prompt templates for the task instruction (defaults to task). */
  promptKey?: string;
  /** Story context and task-specific material. */
  prompt: string;
  schema: z.ZodType<T>;
  /** Deterministic offline result, used only when no provider is configured. */
  mock: () => T;
  maxTokens?: number;
}

/**
 * Runs one structured generation. Real providers are always preferred; the
 * mock is used only when none is configured, and the result says so.
 */
export async function generate<T>(req: GenerateRequest<T>, scope: GenerationScope = {}): Promise<{ value: T; meta: GenerationMeta }> {
  const settings = await getAiSettings();
  const name = resolveProviderName(scope.provider ?? settings.writing_provider);
  const instruction = promptFor(settings, req.promptKey ?? req.task);
  const userPrompt = `${instruction}\n\n${req.prompt}`;
  if (!name) {
    const meta: GenerationMeta = { provider: "mock", model: "calm-mock-writer", simulated: true, cost_cents: 0 };
    const value = req.mock();
    await recordGeneration(req.task, scope, meta, userPrompt);
    return { value, meta };
  }
  await assertWithinBudget(settings);
  const provider = getProvider(name);
  const model = modelFor(settings, name, req.task, scope.model);
  const system = promptFor(settings, "storymaker_system");
  const started = Date.now();
  const out = await provider.structured(model, { task: req.task, system, prompt: userPrompt, schema: req.schema, maxTokens: req.maxTokens });
  const meta: GenerationMeta = {
    provider: name,
    model: out.model,
    simulated: false,
    cost_cents: estimateCostCents(out.model, out.usage),
    input_tokens: out.usage.input_tokens,
    output_tokens: out.usage.output_tokens,
  };
  log.info("ai", `${req.task} via ${name}/${out.model} in ${Date.now() - started}ms (${meta.cost_cents}¢)`);
  await recordGeneration(req.task, scope, meta, userPrompt);
  return { value: out.value, meta };
}
