import type { ZodType, ZodTypeDef } from "zod";
import type { JsonSchema } from "./json-schema";

/** Provider-independent writing interface used by the production agents. */
export interface LlmUsage {
  input_tokens: number;
  output_tokens: number;
}

export interface TextRequest {
  model: string;
  system: string;
  prompt: string;
  maxTokens?: number;
  effort?: "low" | "medium" | "high";
}

export interface JsonRequest<T> extends TextRequest {
  schema: ZodType<T, ZodTypeDef, unknown>;
  jsonSchema: JsonSchema;
}

export interface LlmResult<T> {
  data: T;
  usage: LlmUsage;
  model: string;
}

export interface LlmProvider {
  readonly name: string;
  text(input: TextRequest): Promise<LlmResult<string>>;
  json<T>(input: JsonRequest<T>): Promise<LlmResult<T>>;
}

export class AiRefusalError extends Error {
  constructor(message = "The model declined this request.") {
    super(message);
  }
}

/** USD per million tokens (input, output), for cost tracking. */
const PRICES: Record<string, [number, number]> = {
  "claude-fable-5-1": [10, 50],
  "claude-opus-5-5": [4, 20],
  "claude-sonnet-5-5": [2, 10],
  "claude-haiku-5-5": [0.1, 0.5],
};

export function estimateCostCents(model: string, usage: LlmUsage): number {
  const [inP, outP] = PRICES[model] ?? [5, 25];
  return Math.round(((usage.input_tokens * inP + usage.output_tokens * outP) / 1_000_000) * 100 * 100) / 100;
}
