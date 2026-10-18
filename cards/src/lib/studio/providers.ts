import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod/v4";

export interface GenerationRequest<S extends z.ZodType> {
  agent: string;
  system: string;
  prompt: string;
  schema: S;
}

export interface GenerationResult<T> {
  output: T;
  provider: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  costUsd: number;
}

/** A model provider for Studio agents. */
export interface GenerationProvider {
  id: string;
  label: string;
  /** True only when the provider makes real model calls. */
  isAI: boolean;
  model?: string;
  generate<S extends z.ZodType>(req: GenerationRequest<S>): Promise<GenerationResult<z.infer<S>>>;
}

/** List prices (USD per million tokens) for cost logging. */
const PRICES: Record<string, [number, number]> = {
  "claude-opus-5-5": [4, 20],
  "claude-sonnet-5-5": [2, 10],
  "claude-haiku-5-5": [0.1, 0.5],
  "claude-fable-5-1": [10, 50],
};

export class AnthropicProvider implements GenerationProvider {
  id = "anthropic";
  label = "Anthropic Claude";
  isAI = true;
  private client: Anthropic;
  constructor(
    apiKey: string,
    public model = "claude-opus-5-5",
  ) {
    this.client = new Anthropic({ apiKey, maxRetries: 2 });
  }

  async generate<S extends z.ZodType>(req: GenerationRequest<S>): Promise<GenerationResult<z.infer<S>>> {
    const res = await this.client.beta.messages.parse({
      model: this.model,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: req.system,
      messages: [{ role: "user", content: req.prompt }],
      output_config: { format: betaZodOutputFormat(req.schema), effort: "medium" },
    });
    if (res.stop_reason === "refusal") throw new Error(`The model declined this step (${res.stop_details?.category ?? "policy"}). Edit the brief and retry.`);
    if (res.stop_reason === "max_tokens") throw new Error("The response was cut off (max_tokens). Retry, or simplify the brief.");
    if (!res.parsed_output) throw new Error("The model returned output that didn't match the schema.");
    const [pin, pout] = PRICES[res.model] ?? PRICES[this.model] ?? [4, 20];
    const inputTokens = res.usage.input_tokens;
    const outputTokens = res.usage.output_tokens;
    return {
      output: res.parsed_output as z.infer<S>,
      provider: this.id,
      model: res.model,
      inputTokens,
      outputTokens,
      costUsd: (inputTokens * pin + outputTokens * pout) / 1_000_000,
    };
  }
}

let override: GenerationProvider | undefined;

/** Test hook. */
export function setProvider(p: GenerationProvider | undefined) {
  override = p;
}

export function aiProvider(): GenerationProvider | undefined {
  if (override) return override;
  const key = process.env.ANTHROPIC_API_KEY;
  return key ? new AnthropicProvider(key, process.env.ANTHROPIC_MODEL || "claude-opus-5-5") : undefined;
}
