import { z } from "zod";
import { parseBody, route } from "@/lib/api";
import { requireCreator } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { resolveToolCall, TOOL_LABELS } from "@/lib/storymaker/execute";
import { newId, nowIso } from "@/lib/util";

const Body = z.object({ action: z.enum(["confirm", "cancel"]) });

export const maxDuration = 300;

export const POST = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const { id } = await params;
  const viewer = await requireCreator();
  const { action } = await parseBody(req, Body);
  const outcome = await resolveToolCall(id, action, { viewer });
  // Record the outcome in the conversation so the chat history stays truthful.
  const db = getDb();
  const call = await db.get("ai_tool_calls", id);
  if (call?.conversation_id) {
    const conv = await db.get("ai_conversations", call.conversation_id);
    if (conv) {
      const content =
        outcome.status === "cancelled"
          ? `Cancelled: ${TOOL_LABELS[call.tool] ?? call.tool}.`
          : outcome.status === "executed"
            ? outcome.result.summary + (outcome.result.meta?.simulated ? " _(Simulated – no writing model is configured.)_" : "")
            : "Still waiting for confirmation.";
      const cards = outcome.status === "executed" ? outcome.result.cards : undefined;
      await db.update("ai_conversations", conv.id, {
        messages: [...conv.messages, { id: newId("msg"), role: "assistant", content, cards, created_at: nowIso() }],
        series_id: outcome.status === "executed" && outcome.result.series_id ? outcome.result.series_id : conv.series_id,
        updated_at: nowIso(),
      });
    }
  }
  return outcome;
});
