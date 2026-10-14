import "server-only";
import { getDb } from "@/lib/db";
import { HttpError } from "@/lib/errors";
import { log } from "@/lib/log";
import type { AiConversation, AssistantCard, ConversationMessage } from "@/lib/types";
import { newId, nowIso } from "@/lib/util";
import { resolveWriter } from "@/lib/ai";
import { toJsonSchema } from "@/lib/ai/json-schema";
import { AiRefusalError, type LlmMessage, type LlmTool } from "@/lib/ai/provider";
import { SLEEP_STORY_SYSTEM } from "@/lib/ai/story-engine";
import { contextToPrompt, loadStoryContext } from "@/lib/story/context";
import { allTools, type ToolContext } from "./registry";
import { executeTool, TOOL_LABELS, type ExecuteOutcome } from "./execute";
import { currentScriptText } from "./scripts";

export const WELCOME = "Every great story starts somewhere. What would you like to create?";

export async function getConversation(userId: string, seriesId: string | null): Promise<AiConversation> {
  const db = getDb();
  const existing = (await db.list("ai_conversations", { where: { user_id: userId, series_id: seriesId } })).sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))[0];
  if (existing) return existing;
  const now = nowIso();
  return db.insert("ai_conversations", {
    id: newId("conv"),
    user_id: userId,
    series_id: seriesId,
    messages: [
      {
        id: newId("msg"),
        role: "assistant",
        content: seriesId ? "Welcome back. What shall we work on tonight?" : WELCOME,
        cards: [{ type: "suggestions", items: seriesId ? ["Continue this story", "Write the next episode", "Check continuity"] : ["A romantic fantasy", "A cosy mystery", "A magical adventure", "A peaceful science-fiction journey", "Surprise me"] }],
        created_at: now,
      },
    ],
    created_at: now,
    updated_at: now,
  });
}

function msg(role: ConversationMessage["role"], content: string, cards?: AssistantCard[]): ConversationMessage {
  return { id: newId("msg"), role, content, cards, created_at: nowIso() };
}

function outcomeToMessage(o: ExecuteOutcome): ConversationMessage {
  if (o.status === "pending_confirmation") {
    return msg("assistant", "This one needs your go-ahead first.", [{ type: "confirmation", tool: o.tool, summary: o.summary, tool_call_id: o.tool_call_id, reason: o.reason }]);
  }
  const cards: AssistantCard[] = [{ type: "tool_result", tool: o.tool, summary: TOOL_LABELS[o.tool] ?? o.tool, tool_call_id: o.tool_call_id }, ...(o.result.cards ?? [])];
  const sim = o.result.meta?.simulated ? " _(Simulated – no writing model is configured.)_" : "";
  return msg("assistant", o.result.summary + sim, cards);
}

export interface ChatResult {
  conversation_id: string;
  series_id: string | null;
  messages: ConversationMessage[];
  focus: { section: string; id?: string } | null;
  engine: { provider: string; model: string; simulated: boolean };
}

/** Handle one creator message: decide on actions, execute tools, reply. */
export async function handleMessage(ctxBase: Omit<ToolContext, "conversationId" | "confirmed">, text: string): Promise<ChatResult> {
  const db = getDb();
  const conversation = await getConversation(ctxBase.viewer.user.id, ctxBase.seriesId);
  const userMsg = msg("user", text);
  const out: ConversationMessage[] = [userMsg];
  let seriesId = ctxBase.seriesId;
  let focus: ChatResult["focus"] = null;
  const writer = await resolveWriter("assistant");

  const run = async (tool: string, input: unknown) => {
    const outcome = await executeTool(tool, input, { ...ctxBase, seriesId, conversationId: conversation.id, confirmed: false });
    if (outcome.status === "executed") {
      if (outcome.result.series_id) seriesId = outcome.result.series_id;
      if (outcome.result.focus) focus = outcome.result.focus;
    }
    return outcome;
  };

  try {
    if (writer.provider) {
      out.push(...(await llmLoop(writer, conversation, text, seriesId, run)));
    } else {
      const plan = await planIntent(text, seriesId);
      if (plan.reply) out.push(msg("assistant", plan.reply, plan.cards));
      for (const step of plan.steps) {
        const o = await run(step.tool, step.input);
        out.push(outcomeToMessage(o));
        if (o.status === "pending_confirmation") break;
      }
    }
  } catch (err) {
    const message =
      err instanceof AiRefusalError
        ? "I can't help with that one – Sleep Stories need to stay gentle and safe. Could we take it in a calmer direction?"
        : err instanceof HttpError
          ? err.message
          : "Something went wrong on my side. Your work is saved – please try again.";
    if (!(err instanceof HttpError) && !(err instanceof AiRefusalError)) log.error("storymaker", "chat failed", { error: String(err) });
    out.push(msg("assistant", message, [{ type: "error", message }]));
  }

  const messages = [...conversation.messages, ...out].slice(-200);
  await db.update("ai_conversations", conversation.id, { messages, series_id: seriesId, updated_at: nowIso() });
  return { conversation_id: conversation.id, series_id: seriesId, messages: out, focus, engine: { provider: writer.providerName, model: writer.model, simulated: writer.simulated } };
}

/* ------------------------------------------------------------------ */
/* Model-driven tool calling                                           */
/* ------------------------------------------------------------------ */

async function workspaceBrief(seriesId: string | null): Promise<string> {
  if (!seriesId) return "No series is open yet. Help the creator develop an idea; use generate_synopsis to propose a concept card. Only call create_series once the creator has agreed to a concept.";
  const ctx = await loadStoryContext(seriesId);
  const eps = await Promise.all(
    ctx.episodes.map(async (e) => `- id=${e.id} | S${ctx.seasons.find((s) => s.id === e.season_id)?.number ?? 1}E${e.number} "${e.title}" | status=${e.status} | script=${(await currentScriptText(e.id)) ? "yes" : "no"}`),
  );
  return `${contextToPrompt(ctx)}\n\nCHARACTER IDS: ${ctx.characters.map((c) => `${c.name}=${c.id}`).join(", ") || "none"}\nLOCATION IDS: ${ctx.locations.map((l) => `${l.name}=${l.id}`).join(", ") || "none"}\nEPISODES:\n${eps.join("\n") || "none yet"}`;
}

const ASSISTANT_GUIDE = `You are Calm Storymaker, a warm, expert creative partner – part creative director, part writer, part audio producer – helping someone create a serialized Sleep Story series.
- Act through the tools whenever the creator asks for a change; don't just describe what you would do.
- Ask only essential follow-up questions. Keep replies short and encouraging (2–4 sentences).
- Never overwrite the creator's own words without them asking; propose instead.
- Some tools require the creator's confirmation (paid generation, destructive edits, publishing). If a tool result says it is awaiting confirmation, tell them briefly and stop.
- Respect the Story Bible. If you notice a contradiction, flag it rather than changing established lore.`;

async function llmLoop(
  writer: Awaited<ReturnType<typeof resolveWriter>>,
  conversation: AiConversation,
  text: string,
  seriesIdAtStart: string | null,
  run: (tool: string, input: unknown) => Promise<ExecuteOutcome>,
): Promise<ConversationMessage[]> {
  const provider = writer.provider!;
  const tools: LlmTool[] = allTools().map((t) => ({ name: t.name, description: t.description, input_schema: toJsonSchema(t.input) }));
  const history: LlmMessage[] = conversation.messages.slice(-12).flatMap((m): LlmMessage[] =>
    m.role === "user" ? [{ role: "user", text: m.content }] : m.role === "assistant" ? [{ role: "assistant", text: m.content, tool_calls: [] }] : [],
  );
  // Merge leading assistant greeting into context; the API expects a user turn first.
  while (history[0]?.role === "assistant") history.shift();
  let seriesId = seriesIdAtStart;
  const system = `${SLEEP_STORY_SYSTEM}\n\n${ASSISTANT_GUIDE}\n\nCURRENT WORKSPACE\n${await workspaceBrief(seriesId)}`;
  const messages: LlmMessage[] = [...history, { role: "user", text }];
  const out: ConversationMessage[] = [];
  for (let i = 0; i < 6; i++) {
    const res = await provider.turn({ model: writer.model, system, messages, tools, maxTokens: 8000, effort: "medium" });
    messages.push({ role: "assistant", text: res.text, tool_calls: res.tool_calls, provider: provider.name, raw: res.raw });
    if (!res.tool_calls.length || res.stop !== "tool_use") {
      if (res.text) out.push(msg("assistant", res.text));
      break;
    }
    const results: { tool_call_id: string; content: string; is_error?: boolean }[] = [];
    let paused = false;
    for (const call of res.tool_calls) {
      if (paused) {
        results.push({ tool_call_id: call.id, content: "Not run – waiting for the creator to confirm an earlier action.", is_error: true });
        continue;
      }
      try {
        const o = await run(call.name, call.input);
        out.push(outcomeToMessage(o));
        if (o.status === "pending_confirmation") {
          paused = true;
          results.push({ tool_call_id: call.id, content: `Awaiting the creator's confirmation: ${o.reason}` });
        } else {
          if (o.result.series_id) seriesId = o.result.series_id;
          results.push({ tool_call_id: call.id, content: JSON.stringify({ summary: o.result.summary, data: o.result.data ?? null }).slice(0, 8000) });
        }
      } catch (err) {
        results.push({ tool_call_id: call.id, content: err instanceof Error ? err.message : "Tool failed", is_error: true });
      }
    }
    messages.push({ role: "tool_results", results });
    if (paused) break;
  }
  void seriesId;
  return out;
}

/* ------------------------------------------------------------------ */
/* Deterministic intent routing (no writing model configured)          */
/* ------------------------------------------------------------------ */

interface Plan {
  reply?: string;
  cards?: AssistantCard[];
  steps: { tool: string; input: Record<string, unknown> }[];
}

async function planIntent(text: string, seriesId: string | null): Promise<Plan> {
  const m = text.toLowerCase().trim();
  if (!seriesId) return { steps: [{ tool: "generate_synopsis", input: { idea: text } }] };

  const db = getDb();
  const ctx = await loadStoryContext(seriesId);
  const withScript = await Promise.all(ctx.episodes.map(async (e) => ({ e, has: Boolean(await currentScriptText(e.id)) })));
  const numberMatch = /episode\s*(\d+)/.exec(m);
  const byNumber = numberMatch ? ctx.episodes.find((e) => e.number === Number(numberMatch[1])) : undefined;
  const latestScripted = [...withScript].reverse().find((x) => x.has)?.e;
  const firstUnwritten = withScript.find((x) => !x.has && x.e.status === "planned")?.e;
  const target = byNumber ?? latestScripted;
  const durationMatch = /(\d+)[- ]?min/.exec(m);

  if (/\b(delete|remove|cut)\b/.test(m)) {
    const who = ctx.characters.find((c) => m.includes(c.name.toLowerCase()) || (c.narrative_role && m.includes(c.narrative_role.toLowerCase())));
    if (who) return { steps: [{ tool: "delete_character", input: { character_id: who.id } }] };
    const loc = ctx.locations.find((l) => m.includes(l.name.toLowerCase().replace(/^the /, "")));
    if (loc) return { steps: [{ tool: "delete_location", input: { location_id: loc.id } }] };
    const ep = byNumber;
    if (ep && /episode/.test(m)) return { steps: [{ tool: "delete_episode", input: { episode_id: ep.id } }] };
  }
  if (/continue (this|the) story|what happens next|next chapter/.test(m)) return { steps: [{ tool: "continue_story", input: { brief: text } }] };
  if (/(build|create|generate|develop|make|design).*(world|setting|bible)|worldbuild/.test(m)) return { steps: [{ tool: "create_world", input: { brief: text } }] };
  const named = /(?:named|called)\s+([A-Z][a-zA-Z'-]+)/.exec(text);
  if (/(add|create|new|introduce|invent).*(character|friend|companion|mentor|rival|cast)/.test(m) || named) {
    return { steps: [{ tool: "create_character", input: { brief: text, names: named ? [named[1]] : undefined, count: 1 } }] };
  }
  if (/(develop|deepen|flesh out|build out).*(character|cast)/.test(m)) {
    const thin = ctx.characters.filter((c) => !c.backstory).map((c) => c.name);
    return thin.length
      ? { steps: [{ tool: "create_character", input: { names: thin.slice(0, 4), brief: text } }] }
      : { steps: [{ tool: "create_character", input: { count: 1, brief: text } }] };
  }
  if (/(plan|outline|map out).*(season|series|episodes)|(\d+)[- ]episode/.test(m)) {
    const n = /(\d+)[- ]?episode/.exec(m);
    const season = /season\s*(\d+)/.exec(m);
    return { steps: [{ tool: "generate_season_outline", input: { episode_count: n ? Math.min(30, Number(n[1])) : 10, season_number: season ? Number(season[1]) : 1, brief: text } }] };
  }
  if (/outline (episode|it|this)/.test(m) && (byNumber ?? firstUnwritten)) return { steps: [{ tool: "generate_episode_outline", input: { episode_id: (byNumber ?? firstUnwritten)!.id } }] };
  if (/\bwrite\b|draft (the|an|episode)|script/.test(m) && !/rewrite/.test(m)) {
    const ep = byNumber ?? firstUnwritten ?? ctx.episodes[ctx.episodes.length - 1];
    if (!ep) return { reply: "There are no episodes to write yet. Shall I plan a season first?", cards: [{ type: "suggestions", items: ["Plan a 10-episode season"] }], steps: [] };
    const settings: Record<string, unknown> = {};
    if (durationMatch) settings.duration_minutes = Number(durationMatch[1]);
    if (/first[- ]person/.test(m)) settings.perspective = "first";
    if (/second[- ]person|\byou\b.*perspective/.test(m)) settings.perspective = "second";
    if (/no dialogue/.test(m)) settings.dialogue = "none";
    return { steps: [{ tool: "write_episode", input: { episode_id: ep.id, settings } }] };
  }
  if (/continuity|contradict|consisten/.test(m)) {
    if (!target) return { reply: "Write an episode first, then I'll check it against the Story Bible.", steps: [] };
    return { steps: [{ tool: "check_story_continuity", input: { episode_id: target.id } }] };
  }
  const rewriteKinds: [RegExp, string][] = [
    [/ending/, "ending"],
    [/relax|calmer|softer|sleepier|slower/, "relaxing"],
    [/atmospher|moodier/, "atmospheric"],
    [/sensory|senses|smell|texture/, "sensory"],
    [/dialogue/, "dialogue"],
    [/shorter|shorten|trim/, "shorten"],
    [/longer|expand/, "expand"],
  ];
  for (const [re, instruction] of rewriteKinds) {
    if (re.test(m) && target && /make|more|change|improve|add|rewrite|less/.test(m)) {
      const current = await currentScriptText(target.id);
      if (!current) continue;
      const input: Record<string, unknown> = { episode_id: target.id, instruction };
      if (instruction !== "ending") {
        input.start = 0;
        input.end = current.version.content.length;
      }
      return { steps: [{ tool: "rewrite_script_section", input }] };
    }
  }
  if (/narrat|voice|rain|ambien|soundscape|music|produce (the )?audio|thunder|ocean|fireplace|wind/.test(m)) {
    return {
      reply: `Audio is produced in the Production workspace for each episode${target ? ` – open “${target.title}” there` : ""}. Tell me the narrator and soundscape you'd like and I'll set it up once the episode script is approved.`,
      cards: [{ type: "suggestions", items: ["Approve the script", "Open audio production"] }],
      steps: [],
    };
  }
  if (/cover|artwork|key art|poster|art\b/.test(m)) {
    const scene = /(kingdom|forest|cabin|space|ocean|garden|library|village|coast|desert|aurora|city|lake)/.exec(m)?.[1];
    return { steps: [{ tool: "generate_cover_art", input: { scene, prompt: text } }] };
  }
  if (/approve (the )?script|it'?s final|lock (the )?script/.test(m) && target) return { steps: [{ tool: "approve_script", input: { episode_id: target.id } }] };
  if (/submit|send (it )?for review|publish/.test(m) && target) return { steps: [{ tool: "submit_for_review", input: { episode_id: target.id } }] };
  const rename = /(?:rename|retitle|call it|title to)\s+["“]?([^"”]+)["”]?/i.exec(text);
  if (rename?.[1]) return { steps: [{ tool: "update_series", input: { title: rename[1].trim() } }] };
  if (/rule/.test(m) && /add/.test(m)) return { steps: [{ tool: "update_world_bible", input: { add_rule: text.replace(/^.*?rule[:\s]*/i, "") } }] };

  void db;
  const next: string[] = [];
  if (!ctx.bible.geography) next.push("Build the world");
  if (ctx.characters.length < 2) next.push("Add a character named …");
  if (!ctx.episodes.length) next.push("Plan a 10-episode season");
  else if (firstUnwritten) next.push(`Write episode ${firstUnwritten.number}`);
  next.push("Continue this story", "Check continuity");
  return {
    reply:
      "I can build the world, create characters, plan seasons, write and rewrite episodes, check continuity, make cover art and submit episodes for review. What would you like to do next?",
    cards: [{ type: "suggestions", items: next.slice(0, 4) }],
    steps: [],
  };
}
