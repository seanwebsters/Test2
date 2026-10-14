import { z } from "zod";
import { getViewer } from "@/lib/auth";
import { body, json, route } from "@/lib/api";
import { runAction } from "@/lib/storymaker/agent";

export const maxDuration = 300;

/**
 * Runs a Storymaker tool from a workspace control. Returns 409 with a pending
 * call when the action needs confirmation; resend with `confirmed: true` or
 * confirm the pending call.
 */
export const POST = route(async (req) => {
  const input = await body(
    req,
    z.object({ tool: z.string().min(1), input: z.unknown(), seriesId: z.string().nullish(), conversationId: z.string().nullish(), confirmed: z.boolean().optional(), log: z.boolean().optional() }),
  );
  const { result, seriesId, conversation } = await runAction(await getViewer(), input);
  if (result.status === "needs_confirmation") {
    return json({ error: "Confirmation required", confirmation: { tool_call_id: result.call.id, reason: result.reason, tool: result.call.tool } }, { status: 409 });
  }
  if (result.status === "failed") return json({ error: result.error }, { status: 400 });
  return json({ summary: result.outcome.summary, data: result.outcome.data ?? null, cards: result.outcome.cards ?? [], seriesId, conversationId: conversation?.id ?? null });
}, { limit: 40, bucket: "storymaker-action" });
