import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import * as z from "zod/v4";
import { AiRefusalError, type AiBlock, type AiMessage, type AiToolSpec, type ChatResult, type StructuredRequest, type TextProvider, type Usage } from "../types";

/**
 * Anthropic adapter. Uses adaptive thinking (Claude Opus 5.5's default) with
 * server-side refusal fallbacks, a manual tool loop driven by the caller, and
 * structured outputs for typed generation.
 */
export class AnthropicProvider implements TextProvider {
  readonly name = "anthropic" as const;
  readonly simulated = false;
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  private toParams(messages: AiMessage[]): Anthropic.Beta.BetaMessageParam[] {
    return messages.map((m) => {
      // Assistant turns produced in this loop are replayed exactly as returned.
      if (m.role === "assistant" && m.raw) return { role: "assistant", content: m.raw as Anthropic.Beta.BetaContentBlockParam[] };
      return {
        role: m.role,
        content: m.content.map((b): Anthropic.Beta.BetaContentBlockParam => {
          if (b.type === "text") return { type: "text", text: b.text };
          if (b.type === "tool_use") return { type: "tool_use", id: b.id, name: b.name, input: b.input as Record<string, unknown> };
          return { type: "tool_result", tool_use_id: b.tool_use_id, content: b.content, is_error: b.is_error };
        }),
      };
    });
  }

  async chat(input: { model: string; system: string; messages: AiMessage[]; tools: AiToolSpec[]; maxTokens?: number }): Promise<ChatResult> {
    const stream = this.client.beta.messages.stream({
      model: input.model,
      max_tokens: input.maxTokens ?? 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      thinking: { type: "adaptive" },
      output_config: { effort: "medium" },
      system: [{ type: "text", text: input.system, cache_control: { type: "ephemeral" } }],
      tools: input.tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.input_schema as Anthropic.Beta.BetaTool.InputSchema })),
      messages: this.toParams(input.messages),
    });
    const msg = await stream.finalMessage();
    const blocks: AiBlock[] = [];
    for (const b of msg.content) {
      if (b.type === "text") blocks.push({ type: "text", text: b.text });
      else if (b.type === "tool_use") blocks.push({ type: "tool_use", id: b.id, name: b.name, input: b.input });
    }
    const stop = msg.stop_reason === "end_turn" ? "end" : msg.stop_reason === "tool_use" ? "tool_use" : msg.stop_reason === "max_tokens" ? "max_tokens" : msg.stop_reason === "refusal" ? "refusal" : "other";
    return {
      blocks,
      raw: msg.content,
      stop,
      usage: { input_tokens: msg.usage.input_tokens, output_tokens: msg.usage.output_tokens },
      model: msg.model,
      provider: this.name,
    };
  }

  async structured<T>(model: string, req: StructuredRequest<T>): Promise<{ value: T; usage: Usage; model: string }> {
    const stream = this.client.beta.messages.stream({
      model,
      max_tokens: req.maxTokens ?? 32000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      thinking: { type: "adaptive" },
      output_config: {
        effort: req.task === "script" ? "high" : "medium",
        format: { type: "json_schema", schema: z.toJSONSchema(req.schema) as Record<string, unknown> },
      },
      system: req.system,
      messages: [{ role: "user", content: req.prompt }],
    });
    const msg = await stream.finalMessage();
    if (msg.stop_reason === "refusal") throw new AiRefusalError();
    if (msg.stop_reason === "max_tokens") throw new Error("The generation was cut off before it finished. Try a shorter duration.");
    const text = msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    const value = req.schema.parse(JSON.parse(text));
    return { value, usage: { input_tokens: msg.usage.input_tokens, output_tokens: msg.usage.output_tokens }, model: msg.model };
  }
}
