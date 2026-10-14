import "server-only";
import OpenAI from "openai";
import { stripNulls } from "./json-schema";
import type { JsonRequest, LlmMessage, LlmProvider, LlmTurnResult, LlmUsage } from "./provider";

/** OpenAI adapter (Chat Completions with function tools and JSON-schema outputs). */
export class OpenAiProvider implements LlmProvider {
  readonly name = "openai" as const;
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  private toParams(system: string, messages: LlmMessage[]): OpenAI.Chat.ChatCompletionMessageParam[] {
    const out: OpenAI.Chat.ChatCompletionMessageParam[] = [{ role: "system", content: system }];
    for (const m of messages) {
      if (m.role === "user") out.push({ role: "user", content: m.text });
      else if (m.role === "assistant")
        out.push({
          role: "assistant",
          content: m.text || null,
          tool_calls: m.tool_calls.length
            ? m.tool_calls.map((c) => ({ id: c.id, type: "function" as const, function: { name: c.name, arguments: JSON.stringify(c.input) } }))
            : undefined,
        });
      else for (const r of m.results) out.push({ role: "tool", tool_call_id: r.tool_call_id, content: r.content });
    }
    return out;
  }

  async turn(input: Parameters<LlmProvider["turn"]>[0]): Promise<LlmTurnResult> {
    const res = await this.client.chat.completions.create({
      model: input.model,
      max_completion_tokens: input.maxTokens ?? 16000,
      messages: this.toParams(input.system, input.messages),
      tools: input.tools?.map((t) => ({ type: "function" as const, function: { name: t.name, description: t.description, parameters: t.input_schema } })),
    });
    const choice = res.choices[0];
    const msg = choice?.message;
    const tool_calls = (msg?.tool_calls ?? []).flatMap((c) =>
      c.type === "function" ? [{ id: c.id, name: c.function.name, input: JSON.parse(c.function.arguments || "{}") as unknown }] : [],
    );
    return {
      text: msg?.content ?? "",
      tool_calls,
      stop: tool_calls.length ? "tool_use" : choice?.finish_reason === "length" ? "max_tokens" : "end",
      usage: { input_tokens: res.usage?.prompt_tokens ?? 0, output_tokens: res.usage?.completion_tokens ?? 0 },
      model: res.model,
      raw: msg,
    };
  }

  async json<T>(input: JsonRequest<T>): Promise<{ data: T; usage: LlmUsage; model: string }> {
    const res = await this.client.chat.completions.create({
      model: input.model,
      max_completion_tokens: input.maxTokens ?? 16000,
      messages: [
        { role: "system", content: input.system },
        { role: "user", content: input.prompt },
      ],
      response_format: { type: "json_schema", json_schema: { name: "result", schema: input.jsonSchema, strict: true } },
    });
    const text = res.choices[0]?.message.content ?? "{}";
    const data = input.schema.parse(stripNulls(JSON.parse(text)));
    return { data, usage: { input_tokens: res.usage?.prompt_tokens ?? 0, output_tokens: res.usage?.completion_tokens ?? 0 }, model: res.model };
  }
}
