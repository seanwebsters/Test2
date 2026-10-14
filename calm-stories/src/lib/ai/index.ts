import "server-only";
import { getDb } from "@/lib/db";
import { env } from "@/lib/env";
import { HttpError } from "@/lib/errors";
import type { AiSettings } from "@/lib/types";
import { DEFAULT_AI_SETTINGS } from "@/lib/seed/defaults";
import { nowIso } from "@/lib/util";
import { AnthropicProvider } from "./anthropic";
import { OpenAiProvider } from "./openai";
import type { LlmProvider } from "./provider";

export type AiTask = "concept" | "world" | "characters" | "outline" | "script" | "rewrite" | "continuity" | "assistant" | "direction" | "metadata";

export interface ResolvedWriter {
  provider: LlmProvider | null;
  providerName: "anthropic" | "openai" | "simulated";
  model: string;
  simulated: boolean;
}

export async function getAiSettings(): Promise<AiSettings> {
  const s = await getDb().get("ai_settings", "global");
  return s ?? { ...DEFAULT_AI_SETTINGS, updated_at: nowIso() };
}

export function providerStatus() {
  return {
    anthropic: Boolean(env.anthropicApiKey),
    openai: Boolean(env.openaiApiKey),
    elevenlabs: Boolean(env.elevenLabsApiKey),
    posthog: Boolean(env.posthogKey),
    supabase: env.dataBackend === "supabase",
    r2: env.storageBackend === "r2",
    trigger: env.jobDriver === "trigger" && Boolean(env.triggerSecretKey),
  };
}

/**
 * Pick the writing model for a task. "auto" prefers Anthropic, then OpenAI,
 * then the deterministic simulator (always labelled `simulated`). An
 * explicitly selected provider without credentials is an error rather than a
 * silent fallback.
 */
export async function resolveWriter(task: AiTask, override?: { provider?: string; model?: string }): Promise<ResolvedWriter> {
  const settings = await getAiSettings();
  const choice = override?.provider && override.provider !== "auto" ? override.provider : settings.writing_provider;
  const taskModel = settings.task_models[task];
  if (choice === "mock") return { provider: null, providerName: "simulated", model: "calm-simulator-v1", simulated: true };
  if (choice === "anthropic" || (choice === "auto" && env.anthropicApiKey)) {
    if (!env.anthropicApiKey) throw new HttpError(503, "Anthropic is selected but ANTHROPIC_API_KEY is not configured.", "provider_unconfigured");
    const model = override?.model ?? (taskModel?.startsWith("claude") ? taskModel : settings.writing_model_anthropic);
    return { provider: new AnthropicProvider(env.anthropicApiKey), providerName: "anthropic", model, simulated: false };
  }
  if (choice === "openai" || (choice === "auto" && env.openaiApiKey)) {
    if (!env.openaiApiKey) throw new HttpError(503, "OpenAI is selected but OPENAI_API_KEY is not configured.", "provider_unconfigured");
    const model = override?.model ?? (taskModel && !taskModel.startsWith("claude") ? taskModel : settings.writing_model_openai);
    return { provider: new OpenAiProvider(env.openaiApiKey), providerName: "openai", model, simulated: false };
  }
  return { provider: null, providerName: "simulated", model: "calm-simulator-v1", simulated: true };
}
