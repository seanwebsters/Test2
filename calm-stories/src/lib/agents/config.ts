import "server-only";
import { getDb } from "@/lib/db";
import { env } from "@/lib/env";
import type { AgentSettings } from "@/lib/types";
import { DEFAULT_AGENT_SETTINGS } from "@/lib/seed/defaults";
import { nowIso } from "@/lib/util";
import { AnthropicProvider } from "@/lib/ai/anthropic";
import type { LlmProvider } from "@/lib/ai/provider";
import { findFfmpeg } from "@/lib/audio/ffmpeg";

export async function getAgentSettings(): Promise<AgentSettings> {
  const db = getDb();
  const s = await db.get("agent_settings", "global");
  if (s) return s;
  return db.insert("agent_settings", { ...DEFAULT_AGENT_SETTINGS, updated_at: nowIso() });
}

/** Writing provider, or null when no key is configured (agents then use the offline simulator). */
let writer: LlmProvider | null | undefined;
export function getWriter(): LlmProvider | null {
  if (writer === undefined) writer = env.anthropicApiKey ? new AnthropicProvider(env.anthropicApiKey) : null;
  return writer;
}
/** Test hook. */
export function setWriter(w: LlmProvider | null | undefined) {
  writer = w;
}

let ffmpegPath: string | null | undefined;
export function getFfmpeg(): string | null {
  if (ffmpegPath === undefined) ffmpegPath = findFfmpeg(env.ffmpegPath);
  return ffmpegPath;
}

/** Which real providers are connected (never exposes keys). */
export function providerStatus() {
  return {
    writing: { name: "Claude (Anthropic)", connected: Boolean(getWriter()) },
    voice: { name: "ElevenLabs", connected: Boolean(env.elevenLabsApiKey) },
    images: { name: "Nano Banana (Gemini)", connected: Boolean(env.geminiApiKey) },
    mastering: { name: "FFmpeg", connected: Boolean(getFfmpeg()) },
  };
}
