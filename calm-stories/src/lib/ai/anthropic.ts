import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { stripNulls } from "./json-schema";
import { AiRefusalError, type JsonRequest, type LlmMessage, type LlmProvider, type LlmTurnResult, type LlmUsage } from "./provider";

/**
 * Anthropic Claude adapter (official SDK). Uses streaming + finalMessage()
 * so long scripts never hit HTTP timeouts, adaptive thinking (the model
 * default), and server-side refusal fallbacks.
 */
export class AnthropicProvider implements LlmProvider {
  readonly name = "anthropic" as const;
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  private toParams(messages: LlmMessage[]): Anthropic.MessageParam[] {
    const out: Anthropic.MessageParam[] = [];
    for (const m of messages) {
      if (m.role === "user") out.push({ role: "user", content: m.text });
      else if (m.role === "assistant") {
        // Replay the provider's own content blocks unchanged (keeps thinking blocks valid).
        if (m.provider === "anthropic" && Array.isArray(m.raw)) {
          out.push({ role: "assistant", content: m.raw as Anthropic.ContentBlockParam[] });
        } else {
          const content: Anthropic.ContentBlockParam[] = [];
          if (m.text) content.push({ type: "text", text: m.text });
          for (const c of m.tool_calls) content.push({ type: "tool_use", id: c.id, name: c.name, input: c.input as Record<string, unknown> });
          out.push({ role: "assistant", content });
        }
      } else {
        out.push({
          role: "user",
          content: m.results.map((r) => ({ type: "tool_result" as const, tool_use_id: r.tool_call_id, content: r.content, is_error: r.is_error })),
        });
      }
    }
    return out;
  }

  private async send(params: Record<string, unknown>): Promise<Anthropic.Message> {
    // `fallbacks: "default"` lets the API retry a refused request on a suitable model.
    const stream = this.client.beta.messages.stream({
      ...(params as unknown as Anthropic.Beta.Messages.MessageCreateParamsStreaming),
      betas: ["server-side-fallback-2026-07-01"],
      ...({ fallbacks: "default" } as Record<string, unknown>),
    });
    return (await stream.finalMessage()) as unknown as Anthropic.Message;
  }

  async turn(input: Parameters<LlmProvider["turn"]>[0]): Promise<LlmTurnResult> {
    const msg = await this.send({
      model: input.model,
      max_tokens: input.maxTokens ?? 16000,
      system: input.system,
      messages: this.toParams(input.messages),
      tools: input.tools?.map((t) => ({ name: t.name, description: t.description, input_schema: t.input_schema })),
      output_config: { effort: input.effort ?? "medium" },
    });
    if (msg.stop_reason === "refusal") throw new AiRefusalError();
    const text = msg.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n").trim();
    const tool_calls = msg.content.flatMap((b) => (b.type === "tool_use" ? [{ id: b.id, name: b.name, input: b.input }] : []));
    return {
      text,
      tool_calls,
      stop: msg.stop_reason === "tool_use" ? "tool_use" : msg.stop_reason === "max_tokens" ? "max_tokens" : "end",
      usage: { input_tokens: msg.usage.input_tokens, output_tokens: msg.usage.output_tokens },
      model: msg.model,
      raw: msg.content,
    };
  }

  async json<T>(input: JsonRequest<T>): Promise<{ data: T; usage: LlmUsage; model: string }> {
    const msg = await this.send({
      model: input.model,
      max_tokens: input.maxTokens ?? 16000,
      system: input.system,
      messages: [{ role: "user", content: input.prompt }],
      output_config: { effort: input.effort ?? "medium", format: { type: "json_schema", schema: input.jsonSchema } },
    });
    if (msg.stop_reason === "refusal") throw new AiRefusalError();
    if (msg.stop_reason === "max_tokens") throw new Error("The model ran out of room before finishing. Try a shorter request.");
    const text = msg.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    const data = input.schema.parse(stripNulls(JSON.parse(text)));
    return { data, usage: { input_tokens: msg.usage.input_tokens, output_tokens: msg.usage.output_tokens }, model: msg.model };
  }
}
