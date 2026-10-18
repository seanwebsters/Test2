import "server-only";
import crypto from "node:crypto";
import type { CoachMessage } from "@/lib/engine/model";
import { storeFor, type Viewer } from "../context";
import { aiConfigured } from "../env";
import { HttpError } from "../http";
import { coachUsage, loadState, nowIso, todayFor } from "../services";
import { COACH_SYSTEM, userContext } from "./context";
import { offlineProvider } from "./offline";
import { anthropicProvider, type ChatProvider } from "./provider";

const PLUS_MODES = new Set(["interview", "portfolio"]);
const HISTORY_TURNS = 24;

export interface CoachRequest {
  message: string;
  mode?: string;
  missionId?: string | null;
}

/**
 * Streams a coach reply as plain text. Persists both turns. Falls back to the
 * offline coach if the AI provider isn't configured or fails before streaming.
 */
export async function streamCoachReply(viewer: Viewer, req: CoachRequest): Promise<{ stream: ReadableStream<Uint8Array>; provider: ChatProvider["name"] }> {
  const store = storeFor(viewer);
  const state = await loadState(viewer, store);
  const today = todayFor(state.profile);
  const usage = await coachUsage(viewer, state.profile);
  if (usage.remaining <= 0) {
    throw new HttpError(
      429,
      state.profile.plan === "free"
        ? `You've used today's ${usage.limit} free coach messages. They reset at midnight — or upgrade to Plus for unlimited coaching.`
        : "You've reached today's fair-use limit. Pip will be back tomorrow!",
      "coach_limit",
    );
  }
  if (req.mode && PLUS_MODES.has(req.mode) && state.profile.plan !== "plus") {
    throw new HttpError(402, "Structured interview practice and portfolio feedback are part of Direction Plus.", "plus_required");
  }

  const history = await store.listCoachMessages(viewer.userId, HISTORY_TURNS);
  const userMsg: CoachMessage = { id: crypto.randomUUID(), role: "user", content: req.message.slice(0, 6000), createdAt: nowIso(), provider: null };
  await store.addCoachMessage(viewer.userId, userMsg);

  const messages = [...history, userMsg].map((m) => ({ role: m.role, content: m.content }));
  // The API needs the first turn to be from the user.
  while (messages.length && messages[0]!.role !== "user") messages.shift();
  const chatReq = { system: COACH_SYSTEM, context: userContext(state, today, { mode: req.mode, missionId: req.missionId }), messages };
  const offline = offlineProvider(state, today, { mode: req.mode, missionId: req.missionId });
  let provider: ChatProvider = aiConfigured() ? anthropicProvider : offline;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let full = "";
      const run = async (p: ChatProvider) => {
        for await (const chunk of p.stream(chatReq)) {
          full += chunk;
          controller.enqueue(encoder.encode(chunk));
        }
      };
      try {
        await run(provider);
      } catch (e) {
        console.error("[direction] coach provider failed", e);
        if (full.length === 0 && provider !== offline) {
          provider = offline;
          await run(offline);
        } else {
          const note = "\n\n(I lost my connection for a moment — try sending that again.)";
          full += note;
          controller.enqueue(encoder.encode(note));
        }
      }
      try {
        await store.addCoachMessage(viewer.userId, { id: crypto.randomUUID(), role: "assistant", content: full, createdAt: nowIso(), provider: provider.name });
      } catch (e) {
        console.error("[direction] failed to save coach reply", e);
      }
      controller.close();
    },
  });
  return { stream, provider: provider.name };
}
