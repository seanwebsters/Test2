import type { ZodType, ZodTypeDef } from "zod";
import type { JsonSchema } from "./json-schema";

/**
 * Provider-independent LLM interface. Application code (Storymaker,
 * production agents) depends only on this; vendor SDKs live in adapters.
 */
export interface LlmTool {
  name: string;
  description: string;
  input_schema: JsonSchema;
}

export interface LlmToolCall {
  id: string;
  name: string;
  input: unknown;
}

export type LlmMessage =
  | { role: "user"; text: string }
  | { role: "assistant"; text: string; tool_calls: LlmToolCall[]; provider?: string; raw?: unknown }
  | { role: "tool_results"; results: { tool_call_id: string; content: string; is_error?: boolean }[] };

export interface LlmUsage {
  input_tokens: number;
  output_tokens: number;
}

export interface LlmTurnResult {
  text: string;
  tool_calls: LlmToolCall[];
  stop: "end" | "tool_use" | "max_tokens" | "refusal";
  usage: LlmUsage;
  model: string;
  raw: unknown;
}

export interface LlmProvider {
  readonly name: "anthropic" | "openai";
  turn(input: {
    model: string;
    system: string;
    messages: LlmMessage[];
    tools?: LlmTool[];
    maxTokens?: number;
    effort?: "low" | "medium" | "high";
  }): Promise<LlmTurnResult>;
  json<T>(input: JsonRequest<T>): Promise<{ data: T; usage: LlmUsage; model: string }>;
}

export interface JsonRequest<T> {
  model: string;
  system: string;
  prompt: string;
  schema: ZodType<T, ZodTypeDef, unknown>;
  jsonSchema: JsonSchema;
  maxTokens?: number;
  effort?: "low" | "medium" | "high";
}

export class AiRefusalError extends Error {
  constructor(message = "The model declined this request.") {
    super(message);
  }
}

/** USD per million tokens (input, output). Estimates for cost tracking. */
const PRICES: Record<string, [number, number]> = {
  "claude-fable-5-1": [10, 50],
  "claude-opus-5-5": [4, 20],
  "claude-sonnet-5-5": [2, 10],
  "claude-haiku-5-5": [0.1, 0.5],
  "gpt-5": [1.25, 10],
};

export function estimateCostCents(model: string, usage: LlmUsage): number {
  const [inP, outP] = PRICES[model] ?? [5, 25];
  return Math.round(((usage.input_tokens * inP + usage.output_tokens * outP) / 1_000_000) * 100 * 100) / 100;
}
