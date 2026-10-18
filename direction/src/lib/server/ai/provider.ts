import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { env } from "../env";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  /** Stable, cacheable instructions. */
  system: string;
  /** Per-user context, appended after the stable block. */
  context: string;
  messages: ChatTurn[];
  maxTokens?: number;
}

/** Provider abstraction so the coach can swap models or vendors server-side. */
export interface ChatProvider {
  name: "anthropic" | "offline";
  stream(req: ChatRequest): AsyncIterable<string>;
}

let client: Anthropic | null = null;
function anthropic(): Anthropic {
  client ??= new Anthropic({ apiKey: env.anthropicKey, maxRetries: 2, timeout: 60_000 });
  return client;
}

export const anthropicProvider: ChatProvider = {
  name: "anthropic",
  async *stream(req) {
    const stream = anthropic().beta.messages.stream({
      model: env.aiModel,
      max_tokens: req.maxTokens ?? 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low" },
      system: [
        { type: "text", text: req.system, cache_control: { type: "ephemeral" } },
        { type: "text", text: req.context },
      ],
      messages: req.messages.map((m) => ({ role: m.role, content: m.content })),
    });
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") yield event.delta.text;
    }
    const final = await stream.finalMessage();
    if (final.stop_reason === "refusal") {
      yield "\n\nI can't help with that one — but I'm here for anything career-related. What are you working on?";
    }
  },
};

/** One-shot structured JSON generation (used for career insights). */
export async function generateJson(system: string, prompt: string, schema: Record<string, unknown>): Promise<unknown> {
  const res = await anthropic().beta.messages.create({
    model: env.aiModel,
    max_tokens: 4000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: { type: "json_schema", schema } },
    system,
    messages: [{ role: "user", content: prompt }],
  });
  if (res.stop_reason === "refusal") throw new Error("refused");
  const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  return JSON.parse(text);
}
