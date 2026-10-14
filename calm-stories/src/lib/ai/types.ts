/**
 * Provider-independent AI types. Application code depends only on these;
 * Anthropic/OpenAI/mock adapters translate to their own wire formats.
 */
import type * as z from "zod/v4";

export type AiTask = "concept" | "world" | "characters" | "outline" | "script" | "rewrite" | "continuity" | "metadata" | "chat" | "sleep_check" | "direction";

export type AiBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: unknown }
  | { type: "tool_result"; tool_use_id: string; content: string; is_error?: boolean };

export interface AiMessage {
  role: "user" | "assistant";
  content: AiBlock[];
  /**
   * Provider-native assistant content (e.g. Anthropic thinking blocks) that must
   * be replayed unchanged within one tool loop. Opaque to application code.
   */
  raw?: unknown;
}

export interface AiToolSpec {
  name: string;
  description: string;
  /** JSON Schema for the tool input. */
  input_schema: Record<string, unknown>;
}

export interface Usage {
  input_tokens: number;
  output_tokens: number;
}

export interface ChatResult {
  blocks: AiBlock[];
  raw: unknown;
  stop: "end" | "tool_use" | "max_tokens" | "refusal" | "other";
  usage: Usage;
  model: string;
  provider: string;
}

export interface StructuredRequest<T> {
  task: AiTask;
  system: string;
  prompt: string;
  schema: z.ZodType<T>;
  maxTokens?: number;
}

export interface TextProvider {
  readonly name: "anthropic" | "openai" | "mock";
  readonly simulated: boolean;
  chat(input: { model: string; system: string; messages: AiMessage[]; tools: AiToolSpec[]; maxTokens?: number }): Promise<ChatResult>;
  structured<T>(model: string, req: StructuredRequest<T>): Promise<{ value: T; usage: Usage; model: string }>;
}

export class AiRefusalError extends Error {
  constructor(message = "The model declined this request. Try rephrasing it.") {
    super(message);
  }
}
