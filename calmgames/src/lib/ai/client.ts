import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import { costUsd } from "./models";
import { repo } from "../store";
import { newId } from "../ids";
import type { AgentId, Effort } from "../types";

export class MissingCredentialError extends Error {
  constructor() {
    super("ANTHROPIC_API_KEY is not set. Add it to calmgames/.env.local and restart the dev server.");
    this.name = "MissingCredentialError";
  }
}
export class AgentOutputError extends Error {
  constructor(message: string, readonly raw?: string) {
    super(message);
    this.name = "AgentOutputError";
  }
}

export const hasCredentials = () => Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

let client: Anthropic | null = null;
function anthropic(): Anthropic {
  if (!hasCredentials()) throw new MissingCredentialError();
  // Five minutes per request; the SDK retries 429/5xx/connection errors twice.
  client ??= new Anthropic({ timeout: 5 * 60_000, maxRetries: 2 });
  return client;
}

export interface CallOptions<T extends z.ZodType> {
  agent: AgentId | "lab";
  model: string;
  effort: Effort;
  system: string;
  prompt: string;
  schema: T;
  jobId?: string;
  /** Extra semantic validation beyond the schema; return error strings. */
  check?: (value: z.infer<T>) => string[];
  onActivity?: (text: string) => void | Promise<void>;
  maxAttempts?: number;
  maxTokens?: number;
}
export interface CallResult<T> {
  data: T;
  attempts: number;
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
}

/**
 * One agent call with a typed, validated result. The response is constrained
 * with structured outputs, then parsed and checked with Zod and any semantic
 * checks. A response that fails is sent back with the exact problems for a
 * correction, up to `maxAttempts` times.
 */
export async function callAgent<T extends z.ZodType>(o: CallOptions<T>): Promise<CallResult<z.infer<T>>> {
  const api = anthropic();
  const store = await repo();
  const format = zodOutputFormat(o.schema);
  const maxAttempts = o.maxAttempts ?? 3;
  let prompt = o.prompt;
  let total = { cost: 0, input: 0, output: 0 };
  let lastError = "";

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await o.onActivity?.(`Calling ${o.model}${attempt > 1 ? ` · correction ${attempt - 1}` : ""}`);
    const stream = api.beta.messages.stream({
      model: o.model,
      max_tokens: o.maxTokens ?? 32000,
      thinking: { type: "adaptive" },
      output_config: { effort: o.effort, format: { type: "json_schema", schema: format.schema } },
      // Route a safety-classifier refusal to a fallback model server-side.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: o.system,
      messages: [{ role: "user", content: prompt }],
    });
    const message = await stream.finalMessage();
    const usage = message.usage;
    const served = message.model || o.model;
    const cost = costUsd(served, usage.input_tokens + (usage.cache_read_input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0), usage.output_tokens);
    total = { cost: total.cost + cost, input: total.input + usage.input_tokens, output: total.output + usage.output_tokens };
    await store.addUsage({ id: newId("use"), jobId: o.jobId, agent: o.agent, model: served, inputTokens: usage.input_tokens, outputTokens: usage.output_tokens, costUsd: cost, at: new Date().toISOString() });

    if (message.stop_reason === "refusal") throw new AgentOutputError("The model declined this request. Try rephrasing the brief.");
    const text = message.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    if (message.stop_reason === "max_tokens") {
      lastError = "The response was cut off before it finished.";
    } else {
      await o.onActivity?.("Validating response");
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        lastError = "The response was not valid JSON.";
      }
      if (parsed !== undefined) {
        const result = o.schema.safeParse(parsed);
        if (!result.success) {
          lastError = result.error.issues.slice(0, 12).map((i) => `- ${i.path.join(".") || "(root)"}: ${i.message}`).join("\n");
        } else {
          const problems = o.check?.(result.data) ?? [];
          if (!problems.length) return { data: result.data, attempts: attempt, costUsd: total.cost, inputTokens: total.input, outputTokens: total.output };
          lastError = problems.slice(0, 12).map((p) => `- ${p}`).join("\n");
        }
      }
    }
    await o.onActivity?.("Response failed validation; asking for a correction");
    prompt = `${o.prompt}\n\n---\nYour previous answer could not be used:\n${lastError}\n\nPrevious answer:\n${text.slice(0, 20000)}\n\nReturn the complete corrected JSON.`;
  }
  throw new AgentOutputError(`No valid response after ${maxAttempts} attempts. Last problem:\n${lastError}`);
}

export function describeError(e: unknown): string {
  if (e instanceof MissingCredentialError || e instanceof AgentOutputError) return e.message;
  if (e instanceof Anthropic.APIConnectionTimeoutError) return "The request to Anthropic timed out.";
  if (e instanceof Anthropic.AuthenticationError) return "Anthropic rejected the API key (401). Check ANTHROPIC_API_KEY.";
  if (e instanceof Anthropic.PermissionDeniedError) return "This API key cannot use the selected model (403).";
  if (e instanceof Anthropic.NotFoundError) return "The selected model was not found (404). Choose another model in Settings.";
  if (e instanceof Anthropic.RateLimitError) return "Anthropic rate limit reached (429). Wait a minute and resume.";
  if (e instanceof Anthropic.APIConnectionError) return "Could not reach the Anthropic API.";
  if (e instanceof Anthropic.APIError) return `Anthropic API error ${e.status ?? ""}: ${e.message}`;
  return e instanceof Error ? e.message : String(e);
}
