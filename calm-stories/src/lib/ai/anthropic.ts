import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { stripNulls } from "./json-schema";
import { AiRefusalError, type JsonRequest, type LlmProvider, type LlmResult, type TextRequest } from "./provider";

/**
 * Claude adapter (official SDK). Streams with finalMessage() so long scripts
 * never hit HTTP timeouts, uses adaptive thinking (the model default) with an
 * explicit effort level, and opts into server-side refusal fallbacks.
 */
export class AnthropicProvider implements LlmProvider {
  readonly name = "anthropic";
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  private async send(params: Record<string, unknown>): Promise<Anthropic.Message> {
    const stream = this.client.beta.messages.stream({
      ...(params as unknown as Anthropic.Beta.Messages.MessageCreateParamsStreaming),
      betas: ["server-side-fallback-2026-07-01"],
      ...({ fallbacks: "default" } as Record<string, unknown>),
    });
    const msg = (await stream.finalMessage()) as unknown as Anthropic.Message;
    if (msg.stop_reason === "refusal") throw new AiRefusalError();
    if (msg.stop_reason === "max_tokens") throw new Error("The model ran out of room before finishing.");
    return msg;
  }

  private textOf(msg: Anthropic.Message): string {
    return msg.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("").trim();
  }

  async text(input: TextRequest): Promise<LlmResult<string>> {
    const msg = await this.send({
      model: input.model,
      max_tokens: input.maxTokens ?? 64000,
      system: input.system,
      messages: [{ role: "user", content: input.prompt }],
      output_config: { effort: input.effort ?? "medium" },
    });
    return { data: this.textOf(msg), usage: { input_tokens: msg.usage.input_tokens, output_tokens: msg.usage.output_tokens }, model: msg.model };
  }

  async json<T>(input: JsonRequest<T>): Promise<LlmResult<T>> {
    const msg = await this.send({
      model: input.model,
      max_tokens: input.maxTokens ?? 16000,
      system: input.system,
      messages: [{ role: "user", content: input.prompt }],
      output_config: { effort: input.effort ?? "medium", format: { type: "json_schema", schema: input.jsonSchema } },
    });
    const data = input.schema.parse(stripNulls(JSON.parse(this.textOf(msg))));
    return { data, usage: { input_tokens: msg.usage.input_tokens, output_tokens: msg.usage.output_tokens }, model: msg.model };
  }
}
