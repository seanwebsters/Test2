import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { ZodType, ZodTypeDef } from "zod";
import { env } from "@/lib/env";
import { getDb } from "@/lib/db";
import { newId, nowIso } from "@/lib/util";
import { AGENT_BY_KEY } from "./agents";
import { toJsonSchema } from "./json-schema";
import { BlockedError, RateLimitedError, StepFailure } from "./errors";
import { getStudioSettings } from "./settings";
import type { AgentKey, AgentProfile } from "./types";

/** Where a call happens – used for cost attribution. */
export interface CallMeta {
  runId: string | null;
  stepId: string | null;
  seriesId: string | null;
}

export interface ClaudeCall<T> {
  agent: AgentKey;
  meta: CallMeta;
  /** Stable, cacheable context (series bible, guidelines, catalogue). */
  context?: string;
  prompt: string;
  images?: { mimeType: string; data: Buffer }[];
  schema?: ZodType<T, ZodTypeDef, unknown>;
  /** Let the agent search the web (Program Director research). */
  webSearch?: boolean;
  maxTokens?: number;
}

export interface ClaudeResult<T> {
  data: T;
  text: string;
  model: string;
  usage: { input_tokens: number; output_tokens: number; cache_read_tokens: number; cache_write_tokens: number; web_searches: number };
  cost_cents: number;
}

/** USD per million tokens [input, output]; cache reads 0.1×, writes 1.25× input. */
const PRICES: Record<string, [number, number]> = {
  "claude-fable-5-1": [10, 50],
  "claude-opus-5-5": [4, 20],
  "claude-sonnet-5-5": [2, 10],
  "claude-haiku-5-5": [0.1, 0.5],
};

export function claudeCostCents(model: string, u: ClaudeResult<unknown>["usage"]): number {
  const [inP, outP] = PRICES[model] ?? PRICES[model.replace(/-\d{8}$/, "")] ?? [5, 25];
  const usd = (u.input_tokens * inP + u.output_tokens * outP + u.cache_read_tokens * inP * 0.1 + u.cache_write_tokens * inP * 1.25) / 1_000_000 + u.web_searches * 0.01;
  return Math.round(usd * 100 * 100) / 100;
}

/* ------------------------------------------------------------------ */
/* Transport (swappable in tests)                                      */
/* ------------------------------------------------------------------ */

export interface TransportRequest {
  agent: AgentKey;
  model: string;
  effort: string;
  system: Anthropic.TextBlockParam[];
  content: Anthropic.ContentBlockParam[];
  schemaName: string | null;
  jsonSchema: Record<string, unknown> | null;
  webSearch: boolean;
  maxTokens: number;
}
export interface TransportResponse {
  text: string;
  model: string;
  usage: ClaudeResult<unknown>["usage"];
}
export type ClaudeTransport = (req: TransportRequest) => Promise<TransportResponse>;

let client: Anthropic | null = null;

const anthropicTransport: ClaudeTransport = async (req) => {
  if (!env.anthropicApiKey) throw new BlockedError("ANTHROPIC_API_KEY", "Connect an Anthropic API key so the writing and editorial agents can work.");
  client ??= new Anthropic({ apiKey: env.anthropicApiKey, maxRetries: 2 });
  const messages: Anthropic.Beta.Messages.BetaMessageParam[] = [{ role: "user", content: req.content as Anthropic.Beta.Messages.BetaContentBlockParam[] }];
  const usage = { input_tokens: 0, output_tokens: 0, cache_read_tokens: 0, cache_write_tokens: 0, web_searches: 0 };
  let text = "";
  let model = req.model;
  try {
    // Server tools can pause a long turn; resume until the model finishes.
    for (let turn = 0; turn < 5; turn++) {
      const stream = client.beta.messages.stream({
        model: req.model,
        max_tokens: req.maxTokens,
        system: req.system as Anthropic.Beta.Messages.BetaTextBlockParam[],
        messages,
        output_config: {
          effort: req.effort as "low" | "medium" | "high",
          ...(req.jsonSchema ? { format: { type: "json_schema", schema: req.jsonSchema } } : {}),
        },
        ...(req.webSearch ? { tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 6 }] } : {}),
        betas: ["server-side-fallback-2026-07-01"],
        ...({ fallbacks: "default" } as Record<string, unknown>),
      } as unknown as Anthropic.Beta.Messages.MessageCreateParamsStreaming);
      const msg = await stream.finalMessage();
      model = msg.model;
      const u = msg.usage as unknown as Record<string, number | Record<string, number> | null>;
      usage.input_tokens += Number(u.input_tokens ?? 0);
      usage.output_tokens += Number(u.output_tokens ?? 0);
      usage.cache_read_tokens += Number(u.cache_read_input_tokens ?? 0);
      usage.cache_write_tokens += Number(u.cache_creation_input_tokens ?? 0);
      usage.web_searches += Number((u.server_tool_use as Record<string, number> | null)?.web_search_requests ?? 0);
      if (msg.stop_reason === "refusal") throw new StepFailure("The model declined this request. Adjust the brief or instructions and retry.");
      if (msg.stop_reason === "max_tokens") throw new StepFailure("The model ran out of room before finishing.", true);
      text += msg.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
      if (msg.stop_reason !== "pause_turn") break;
      messages.push({ role: "assistant", content: msg.content as unknown as Anthropic.Beta.Messages.BetaContentBlockParam[] });
    }
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
      throw new BlockedError("ANTHROPIC_API_KEY", `Anthropic rejected the API key (${err.status}). Check ANTHROPIC_API_KEY.`);
    }
    if (err instanceof Anthropic.RateLimitError) {
      const retry = Number(err.headers?.get?.("retry-after") ?? 30);
      throw new RateLimitedError("Anthropic", (Number.isFinite(retry) ? retry : 30) * 1000);
    }
    if (err instanceof Anthropic.APIError && (err.status ?? 0) >= 500) throw new StepFailure(`Anthropic is unavailable (${err.status}).`, true);
    if (err instanceof Anthropic.APIConnectionError) throw new StepFailure("Couldn't reach Anthropic.", true);
    throw err;
  }
  return { text: text.trim(), model, usage };
};

let transport: ClaudeTransport = anthropicTransport;
/** Test hook – replace the HTTP transport with recorded responses. */
export function setClaudeTransport(t: ClaudeTransport | null) {
  transport = t ?? anthropicTransport;
}

/* ------------------------------------------------------------------ */
/* Agent call                                                          */
/* ------------------------------------------------------------------ */

export async function getAgentProfile(agent: AgentKey): Promise<AgentProfile> {
  const db = getDb();
  const saved = await db.get("agent_profiles", agent);
  if (saved) return saved;
  const def = AGENT_BY_KEY[agent];
  const settings = await getStudioSettings();
  return { id: agent, instructions: def.instructions, model: settings.default_model, effort: def.effort, enabled: true, updated_at: nowIso() };
}

export async function callClaude<T = string>(call: ClaudeCall<T>): Promise<ClaudeResult<T>> {
  const profile = await getAgentProfile(call.agent);
  if (!profile.enabled) throw new BlockedError(`agent:${call.agent}`, `${AGENT_BY_KEY[call.agent].name} is switched off in Settings.`);
  const system: Anthropic.TextBlockParam[] = [{ type: "text", text: profile.instructions }];
  if (call.context) system.push({ type: "text", text: call.context, cache_control: { type: "ephemeral" } });
  const content: Anthropic.ContentBlockParam[] = [
    ...(call.images ?? []).map((img) => ({ type: "image" as const, source: { type: "base64" as const, media_type: img.mimeType as "image/png", data: img.data.toString("base64") } })),
    { type: "text", text: call.prompt },
  ];
  const jsonSchema = call.schema ? toJsonSchema(call.schema, true) : null;
  const res = await transport({
    agent: call.agent,
    model: profile.model,
    effort: profile.effort,
    system,
    content,
    schemaName: call.schema ? (call.schema.description ?? "structured") : null,
    jsonSchema,
    webSearch: Boolean(call.webSearch),
    maxTokens: call.maxTokens ?? (call.schema ? 32000 : 64000),
  });
  let data: T;
  if (call.schema) {
    try {
      data = call.schema.parse(JSON.parse(res.text));
    } catch (err) {
      throw new StepFailure(`${AGENT_BY_KEY[call.agent].name} returned output that didn't match its handoff schema: ${String(err).slice(0, 300)}`, true);
    }
  } else data = res.text as T;
  const cost = claudeCostCents(res.model, res.usage);
  await getDb().insert("usage_records", {
    id: newId("use"),
    run_id: call.meta.runId,
    step_id: call.meta.stepId,
    series_id: call.meta.seriesId,
    agent: call.agent,
    provider: "anthropic",
    operation: call.schema ? "structured" : call.webSearch ? "research" : "text",
    model: res.model,
    input_tokens: res.usage.input_tokens,
    output_tokens: res.usage.output_tokens,
    cache_read_tokens: res.usage.cache_read_tokens,
    cache_write_tokens: res.usage.cache_write_tokens,
    characters: 0,
    seconds: 0,
    images: call.images?.length ?? 0,
    cost_cents: cost,
    created_at: nowIso(),
  });
  return { data, text: res.text, model: res.model, usage: res.usage, cost_cents: cost };
}
