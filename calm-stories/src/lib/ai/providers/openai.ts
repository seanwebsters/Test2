import "server-only";
import OpenAI from "openai";
import * as z from "zod/v4";
import { AiRefusalError, type AiMessage, type AiToolSpec, type ChatResult, type StructuredRequest, type TextProvider, type Usage } from "../types";

/** OpenAI adapter (Chat Completions with function calling and JSON-schema output). */
export class OpenAIProvider implements TextProvider {
  readonly name = "openai" as const;
  readonly simulated = false;
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  private toMessages(system: string, messages: AiMessage[]): OpenAI.Chat.ChatCompletionMessageParam[] {
    const out: OpenAI.Chat.ChatCompletionMessageParam[] = [{ role: "system", content: system }];
    for (const m of messages) {
      if (m.role === "assistant") {
        const text = m.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("\n");
        const calls = m.content.filter((b) => b.type === "tool_use") as { id: string; name: string; input: unknown }[];
        out.push({ role: "assistant", content: text || null, ...(calls.length ? { tool_calls: calls.map((c) => ({ id: c.id, type: "function" as const, function: { name: c.name, arguments: JSON.stringify(c.input) } })) } : {}) });
      } else {
        for (const b of m.content) {
          if (b.type === "tool_result") out.push({ role: "tool", tool_call_id: b.tool_use_id, content: b.content });
          else if (b.type === "text") out.push({ role: "user", content: b.text });
        }
      }
    }
    return out;
  }

  async chat(input: { model: string; system: string; messages: AiMessage[]; tools: AiToolSpec[]; maxTokens?: number }): Promise<ChatResult> {
    const res = await this.client.chat.completions.create({
      model: input.model,
      max_completion_tokens: input.maxTokens ?? 16000,
      messages: this.toMessages(input.system, input.messages),
      tools: input.tools.map((t) => ({ type: "function" as const, function: { name: t.name, description: t.description, parameters: t.input_schema } })),
    });
    const choice = res.choices[0];
    const msg = choice?.message;
    const blocks: ChatResult["blocks"] = [];
    if (msg?.content) blocks.push({ type: "text", text: msg.content });
    for (const call of msg?.tool_calls ?? []) {
      if (call.type !== "function") continue;
      let parsed: unknown = {};
      try {
        parsed = JSON.parse(call.function.arguments);
      } catch {
        parsed = {};
      }
      blocks.push({ type: "tool_use", id: call.id, name: call.function.name, input: parsed });
    }
    const fr = choice?.finish_reason;
    return {
      blocks,
      raw: null,
      stop: fr === "tool_calls" ? "tool_use" : fr === "length" ? "max_tokens" : fr === "content_filter" ? "refusal" : "end",
      usage: { input_tokens: res.usage?.prompt_tokens ?? 0, output_tokens: res.usage?.completion_tokens ?? 0 },
      model: res.model,
      provider: this.name,
    };
  }

  async structured<T>(model: string, req: StructuredRequest<T>): Promise<{ value: T; usage: Usage; model: string }> {
    const res = await this.client.chat.completions.create({
      model,
      max_completion_tokens: req.maxTokens ?? 32000,
      messages: [
        { role: "system", content: req.system },
        { role: "user", content: req.prompt },
      ],
      response_format: { type: "json_schema", json_schema: { name: req.task, schema: z.toJSONSchema(req.schema) as Record<string, unknown> } },
    });
    const choice = res.choices[0];
    if (choice?.finish_reason === "content_filter" || choice?.message.refusal) throw new AiRefusalError();
    const value = req.schema.parse(JSON.parse(choice?.message.content ?? "{}"));
    return { value, usage: { input_tokens: res.usage?.prompt_tokens ?? 0, output_tokens: res.usage?.completion_tokens ?? 0 }, model: res.model };
  }
}
