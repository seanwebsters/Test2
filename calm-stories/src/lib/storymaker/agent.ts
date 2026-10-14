/**
 * The Storymaker assistant. With a configured provider it runs a manual
 * tool-use loop over the tool registry; without one, a deterministic intent
 * router drives the same tools and every reply is labelled as simulated.
 *
 * Tools that need confirmation never run inside the loop: a pending call is
 * stored and shown to the creator as a confirmation card.
 */
import "server-only";
import { estimateCostCents, getAiSettings, getProvider, modelFor, promptFor, recordGeneration, resolveProviderName } from "@/lib/ai";
import type { AiBlock, AiMessage } from "@/lib/ai/types";
import { HttpError } from "@/lib/api";
import { requireCreator } from "@/lib/auth/policy";
import type { Viewer } from "@/lib/auth/viewer";
import { getDb } from "@/lib/db";
import { log } from "@/lib/log";
import type { AiConversation, AssistantCard, ConversationMessage, Episode } from "@/lib/types";
import { newId, nowIso } from "@/lib/util";
import { loadStoryContext, renderContext, type StoryContext } from "./context";
import { editableSeries } from "./service";
import { cancelToolCall, confirmToolCall, dispatchTool, toolSpecs, type DispatchResult, type ToolContext } from "./tools";

export const WELCOME = "Every great story starts somewhere. What would you like to create?";

export const STARTER_SUGGESTIONS = [
  "Create a Sleep Story romantasy set in a moonlit kingdom",
  "Build a cosy mystery series in a seaside village",
  "Write a calming sci-fi story aboard a slow-moving space station",
  "Create a fantasy world inspired by Scandinavian forests",
  "Write an episode about a lighthouse keeper during a winter storm",
  "Create a recurring character who runs a magical bakery",
];

const MAX_ROUNDS = 8;
const HISTORY_LIMIT = 24;

/* ------------------------------------------------------------------ conversations */

export async function getConversation(viewer: Viewer, seriesId: string | null): Promise<AiConversation | null> {
  requireCreator(viewer);
  if (seriesId) await editableSeries(viewer, seriesId);
  const rows = await getDb().list("ai_conversations", { where: { user_id: viewer.user.id, series_id: seriesId }, orderBy: { column: "updated_at", ascending: false }, limit: 1 });
  return rows[0] ?? null;
}

async function loadOrCreate(viewer: Viewer & { user: NonNullable<Viewer["user"]> }, conversationId: string | null | undefined, seriesId: string | null): Promise<AiConversation> {
  const db = getDb();
  if (conversationId) {
    const c = await db.get("ai_conversations", conversationId);
    if (!c || c.user_id !== viewer.user.id) throw new HttpError(404, "Conversation not found");
    return c;
  }
  const existing = await getConversation(viewer, seriesId);
  if (existing) return existing;
  const now = nowIso();
  return db.insert("ai_conversations", { id: newId("conv"), user_id: viewer.user.id, series_id: seriesId, messages: [], created_at: now, updated_at: now });
}

async function appendMessages(conv: AiConversation, msgs: ConversationMessage[], seriesId: string | null): Promise<AiConversation> {
  const db = getDb();
  const fresh = (await db.get("ai_conversations", conv.id)) ?? conv;
  return db.update("ai_conversations", conv.id, {
    messages: [...fresh.messages, ...msgs].slice(-200),
    series_id: fresh.series_id ?? seriesId,
    updated_at: nowIso(),
  });
}

function msg(role: ConversationMessage["role"], content: string, extra: Partial<ConversationMessage> = {}): ConversationMessage {
  return { id: newId("msg"), role, content, created_at: nowIso(), ...extra };
}

/* ------------------------------------------------------------------ dispatch → cards */

interface TurnState {
  ctx: ToolContext;
  cards: AssistantCard[];
  callIds: string[];
}

function cardsFor(r: DispatchResult): AssistantCard[] {
  if (r.status === "executed") {
    const own = r.outcome.cards ?? [];
    const hasRich = own.some((c) => c.type === "concept" || c.type === "direction");
    return hasRich ? own : [{ type: "tool_result", tool: r.call.tool, summary: r.outcome.summary, tool_call_id: r.call.id }, ...own];
  }
  if (r.status === "needs_confirmation") return [{ type: "confirmation", tool: r.call.tool, summary: describeCall(r.call.tool), tool_call_id: r.call.id, reason: r.reason }];
  return [{ type: "error", message: r.error }];
}

function describeCall(tool: string): string {
  return tool.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

async function runTool(state: TurnState, name: string, input: unknown): Promise<{ text: string; isError: boolean }> {
  try {
    const r = await dispatchTool(name, input, state.ctx);
    state.cards.push(...cardsFor(r));
    state.callIds.push(r.call.id);
    if (r.status === "executed") {
      if (r.outcome.seriesId) state.ctx.seriesId = r.outcome.seriesId;
      const data = r.outcome.data === undefined ? "" : `\n${JSON.stringify(r.outcome.data).slice(0, 4000)}`;
      return { text: `${r.outcome.summary}${data}`, isError: false };
    }
    if (r.status === "needs_confirmation") {
      return { text: `Not run yet. The creator has been asked to confirm in the workspace: ${r.reason} Do not call this tool again; briefly tell the creator what you're proposing.`, isError: false };
    }
    return { text: r.error, isError: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Tool failed";
    if (!(err instanceof HttpError)) log.error("storymaker", `tool ${name} crashed`, err);
    state.cards.push({ type: "error", message });
    return { text: message, isError: true };
  }
}

/* ------------------------------------------------------------------ prompt context */

function workspaceBrief(ctx: StoryContext | null): string {
  if (!ctx) return "No series is open yet. When the creator shares an idea, call propose_concept, then wait for them to accept it (they'll press Create, or ask you to create it, in which case call create_series with the proposal).";
  const eps = ctx.episodes.map((e: Episode) => `- ${e.id}: S${ctx.seasons.find((s) => s.id === e.season_id)?.number ?? 1}E${e.number} "${e.title}" [${e.status}]`).join("\n");
  const chars = ctx.characters.map((c) => `- ${c.id}: ${c.name}`).join("\n");
  return [`Open series id: ${ctx.series.id} (status: ${ctx.series.status})`, "", renderContext(ctx), "", "EPISODE IDS:", eps || "(none yet)", "", "CHARACTER IDS:", chars || "(none yet)"].join("\n");
}

function historyToMessages(conv: AiConversation): AiMessage[] {
  const out: AiMessage[] = [];
  for (const m of conv.messages.slice(-HISTORY_LIMIT)) {
    if (m.role === "tool") continue;
    const notes = (m.cards ?? [])
      .map((c) => (c.type === "tool_result" ? `[done: ${c.summary}]` : c.type === "confirmation" ? `[awaiting confirmation: ${c.reason}]` : c.type === "concept" ? `[proposed concept: ${JSON.stringify(c.proposal)}]` : c.type === "direction" ? `[proposed next episode: ${c.proposal.episode_title}]` : ""))
      .filter(Boolean)
      .join("\n");
    const text = [m.content, notes].filter(Boolean).join("\n");
    if (!text) continue;
    const last = out[out.length - 1];
    // Providers require alternating roles.
    if (last && last.role === m.role) last.content.push({ type: "text", text });
    else out.push({ role: m.role === "user" ? "user" : "assistant", content: [{ type: "text", text }] });
  }
  if (out[0]?.role === "assistant") out.shift();
  return out;
}

/* ------------------------------------------------------------------ real provider loop */

async function providerTurn(state: TurnState, conv: AiConversation, providerName: "anthropic" | "openai"): Promise<string> {
  const settings = await getAiSettings();
  const provider = getProvider(providerName);
  const model = modelFor(settings, providerName, "chat");
  const tools = toolSpecs();
  const messages = historyToMessages(conv);
  const texts: string[] = [];
  for (let round = 0; round < MAX_ROUNDS; round++) {
    const ctx = state.ctx.seriesId ? await loadStoryContext(state.ctx.seriesId) : null;
    const system = `${promptFor(settings, "storymaker_system")}\n\nWORKSPACE (current state, refreshed every step):\n${workspaceBrief(ctx)}`;
    const res = await provider.chat({ model, system, messages, tools, maxTokens: 16000 });
    await recordGeneration("chat", { userId: state.ctx.viewer.user?.id, seriesId: state.ctx.seriesId, conversationId: conv.id }, {
      provider: providerName,
      model: res.model,
      simulated: false,
      cost_cents: estimateCostCents(res.model, res.usage),
      input_tokens: res.usage.input_tokens,
      output_tokens: res.usage.output_tokens,
    }, "chat turn");
    for (const b of res.blocks) if (b.type === "text" && b.text.trim()) texts.push(b.text.trim());
    if (res.stop === "refusal") {
      texts.push("I can't help with that one. Let's keep the story gentle and original.");
      break;
    }
    const uses = res.blocks.filter((b): b is Extract<AiBlock, { type: "tool_use" }> => b.type === "tool_use");
    if (res.stop !== "tool_use" || !uses.length) break;
    messages.push({ role: "assistant", content: res.blocks, raw: res.raw });
    const results: AiBlock[] = [];
    for (const u of uses) {
      const r = await runTool(state, u.name, u.input);
      results.push({ type: "tool_result", tool_use_id: u.id, content: r.text, is_error: r.isError || undefined });
    }
    messages.push({ role: "user", content: results });
  }
  return texts.join("\n\n");
}

/* ------------------------------------------------------------------ simulated assistant */

function nextUnwritten(ctx: StoryContext, scripted: Set<string>): Episode | undefined {
  return ctx.episodes.find((e) => !scripted.has(e.id) && e.status !== "published");
}

async function simulatedTurn(state: TurnState, text: string): Promise<string> {
  const t = text.toLowerCase();
  if (!state.ctx.seriesId) {
    if (t.trim().split(/\s+/).length < 3 || /^(hi|hello|hey)\b/.test(t)) return "Tell me about the story you'd like to make: a place, a feeling, a character. A sentence is enough.";
    await runTool(state, "propose_concept", { idea: text });
    return "Here's a first take on your idea. Edit anything you like; nothing is saved until you create the series.";
  }
  const ctx = await loadStoryContext(state.ctx.seriesId);
  const scripts = await getDb().list("scripts", { where: { series_id: ctx.series.id } });
  const scripted = new Set(scripts.filter((s) => s.current_version_id).map((s) => s.episode_id));
  const numbered = /episode\s+(\d+)/i.exec(text);
  const byNumber = numbered ? ctx.episodes.find((e) => e.number === Number(numbered[1])) : undefined;
  const latestScripted = [...ctx.episodes].reverse().find((e) => scripted.has(e.id));

  if (/continuity|consisten|contradict/.test(t)) {
    const ep = byNumber ?? latestScripted;
    if (!ep) return "There's no script to check yet. Ask me to write an episode first.";
    await runTool(state, "check_story_continuity", { episode_id: ep.id });
    return `I checked "${ep.title}" against the Story Bible. I only flag issues; nothing has been changed.`;
  }
  if (/sleep (score|check|suitab)|bedtime|too exciting|relaxing enough/.test(t)) {
    const ep = byNumber ?? latestScripted;
    if (!ep) return "There's no script to check yet.";
    await runTool(state, "check_sleep_suitability", { episode_id: ep.id });
    return `Here's how "${ep.title}" reads for bedtime.`;
  }
  if (/what happens next|continue (the|this) story|next episode|what should happen/.test(t)) {
    await runTool(state, "continue_story", { hint: text });
    return "Here's a direction for the next episode. Accept it, adjust it, or set it aside.";
  }
  if (/\b(world|bible|lore|setting|geography|culture)\b/.test(t)) {
    await runTool(state, "create_world", { brief: text });
    return "I've worked on the World Bible. You'll find it in the World Bible panel.";
  }
  if (/\b(character|companion|mentor|friend)\b|named [A-Z]/i.test(text) && /\b(add|create|new|introduce|make)\b/.test(t)) {
    const count = Number(/\b([2-4])\b/.exec(t)?.[1] ?? 1);
    await runTool(state, "create_character", { brief: text, count });
    return "New characters are in the Characters panel.";
  }
  if (/\b(season|plan|outline)\b/.test(t)) {
    const n = Number(/\b(\d{1,2})\s+episodes?\b/.exec(t)?.[1] ?? 6);
    await runTool(state, "generate_season_outline", { episode_count: Math.min(12, Math.max(1, n)), brief: text });
    return "Here's a season plan. Each episode is in the Episodes panel, ready to write.";
  }
  if (/\b(write|draft|script)\b/.test(t)) {
    const ep = byNumber ?? nextUnwritten(ctx, scripted);
    if (!ep) return ctx.episodes.length ? "Every episode has a script. Ask me to plan more, or to continue the story." : "Let's plan the season first. Try “Plan a season of 6 episodes”.";
    await runTool(state, "write_episode", { episode_id: ep.id, direction: text });
    return `I've written "${ep.title}". Open it in Scripts to read, edit or rewrite any passage.`;
  }
  if (/\b(cover|artwork|art|image|illustration)\b/.test(t)) {
    await runTool(state, "generate_cover_art", { prompt: text });
    return "Fresh cover art is in the Cover Artwork panel. Ask again for another variation.";
  }
  if (/\b(submit|review|publish)\b/.test(t)) {
    const ep = byNumber ?? ctx.episodes.find((e) => scripted.has(e.id) && (e.status === "script_ready" || e.status === "audio_ready" || e.status === "changes_requested"));
    if (!ep) return "There's nothing ready to submit yet. An episode needs a script first.";
    await runTool(state, "submit_for_review", { episode_id: ep.id });
    return `Before I send "${ep.title}" to Calm's editors, please confirm.`;
  }
  if (/\b(synopsis|tagline|description)\b/.test(t)) {
    await runTool(state, "generate_synopsis", {});
    return "I refreshed the tagline and synopsis from the story so far.";
  }
  return "I can build the World Bible, add characters, plan a season, write or rewrite episodes, check continuity, suggest what happens next, or make cover art. What would you like to do?";
}

/* ------------------------------------------------------------------ suggestions */

async function nextStepSuggestions(seriesId: string | null): Promise<string[]> {
  if (!seriesId) return STARTER_SUGGESTIONS.slice(0, 3);
  const ctx = await loadStoryContext(seriesId);
  const scripts = await getDb().list("scripts", { where: { series_id: seriesId } });
  const scripted = new Set(scripts.filter((s) => s.current_version_id).map((s) => s.episode_id));
  const out: string[] = [];
  if (!ctx.bible?.world_name) out.push("Build the World Bible");
  if (ctx.characters.length < 2) out.push("Add a companion character");
  if (!ctx.episodes.length) out.push("Plan a season of 6 episodes");
  const unwritten = nextUnwritten(ctx, scripted);
  if (unwritten) out.push(`Write episode ${unwritten.number}`);
  if (scripted.size) out.push("Check continuity", "What happens next?");
  out.push("Make new cover art");
  return out.slice(0, 4);
}

/* ------------------------------------------------------------------ public API */

export interface ChatOutcome {
  conversation: AiConversation;
  seriesId: string | null;
  simulated: boolean;
}

export async function chat(viewer: Viewer, input: { conversationId?: string | null; seriesId?: string | null; message: string }): Promise<ChatOutcome> {
  requireCreator(viewer);
  const text = input.message.trim().slice(0, 8000);
  if (!text) throw new HttpError(400, "Message is empty.");
  let seriesId = input.seriesId ?? null;
  if (seriesId) await editableSeries(viewer, seriesId);
  let conv = await loadOrCreate(viewer, input.conversationId, seriesId);
  seriesId = seriesId ?? conv.series_id;
  const userMsg = msg("user", text);
  conv = await appendMessages(conv, [userMsg], seriesId);

  const settings = await getAiSettings();
  const providerName = resolveProviderName(settings.writing_provider);
  const state: TurnState = { ctx: { viewer, seriesId, conversationId: conv.id }, cards: [], callIds: [] };
  let reply: string;
  try {
    reply = providerName ? await providerTurn(state, conv, providerName) : await simulatedTurn(state, text);
  } catch (err) {
    log.error("storymaker", "chat turn failed", err);
    reply = "";
    state.cards.push({ type: "error", message: err instanceof Error ? err.message : "Something went wrong. Please try again." });
  }
  const suggestions = await nextStepSuggestions(state.ctx.seriesId);
  const assistant = msg("assistant", reply || (state.cards.length ? "" : "Done."), {
    cards: [...state.cards, { type: "suggestions", items: suggestions }],
    tool_call_ids: state.callIds,
    simulated: !providerName,
  });
  conv = await appendMessages(conv, [assistant], state.ctx.seriesId);
  return { conversation: conv, seriesId: state.ctx.seriesId, simulated: !providerName };
}

/**
 * Runs a tool from a workspace button (not the model). The result is also
 * written into the conversation so the chat reflects every change.
 */
export async function runAction(
  viewer: Viewer,
  input: { tool: string; input?: unknown; seriesId?: string | null; conversationId?: string | null; confirmed?: boolean; log?: boolean },
): Promise<{ result: DispatchResult; seriesId: string | null; conversation: AiConversation | null }> {
  requireCreator(viewer);
  const seriesId = input.seriesId ?? null;
  if (seriesId) await editableSeries(viewer, seriesId);
  const result = await dispatchTool(input.tool, input.input, { viewer, seriesId, conversationId: input.conversationId ?? null }, { confirmed: input.confirmed });
  const nextSeries = result.status === "executed" ? (result.outcome.seriesId ?? seriesId) : seriesId;
  let conversation: AiConversation | null = null;
  if (input.log !== false && (input.conversationId || nextSeries)) {
    const conv = await loadOrCreate(viewer as Viewer & { user: NonNullable<Viewer["user"]> }, input.conversationId, nextSeries);
    conversation = await appendMessages(conv, [msg("assistant", "", { cards: cardsFor(result), tool_call_ids: [result.call.id] })], nextSeries);
  }
  return { result, seriesId: nextSeries, conversation };
}

export async function resolvePendingCall(viewer: Viewer, callId: string, decision: "confirm" | "cancel") {
  requireCreator(viewer);
  const db = getDb();
  if (decision === "cancel") {
    const call = await cancelToolCall(viewer, callId);
    if (call.conversation_id) {
      const conv = await db.get("ai_conversations", call.conversation_id);
      if (conv) await appendMessages(conv, [msg("assistant", "Okay, I've left that as it was.", { tool_call_ids: [call.id] })], call.series_id);
    }
    return { status: "cancelled" as const, call, seriesId: call.series_id };
  }
  const result = await confirmToolCall(viewer, callId);
  const seriesId = result.status === "executed" ? (result.outcome.seriesId ?? result.call.series_id) : result.call.series_id;
  if (result.call.conversation_id) {
    const conv = await db.get("ai_conversations", result.call.conversation_id);
    if (conv) await appendMessages(conv, [msg("assistant", "", { cards: cardsFor(result), tool_call_ids: [result.call.id] })], seriesId);
  }
  return { status: result.status, result, seriesId };
}
