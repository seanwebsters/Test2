import { route } from "@/lib/api";
import { requireCreator } from "@/lib/auth/session";
import { canEditSeries } from "@/lib/auth/policy";
import { getDb } from "@/lib/db";
import { forbidden } from "@/lib/errors";
import { getConversation } from "@/lib/storymaker/assistant";

export const GET = route(async (req) => {
  const viewer = await requireCreator();
  const seriesId = req.nextUrl.searchParams.get("series_id") || null;
  if (seriesId) {
    const s = await getDb().get("series", seriesId);
    if (!s || !canEditSeries(viewer, s)) throw forbidden();
  }
  const c = await getConversation(viewer.user.id, seriesId);
  const pending = await getDb().list("ai_tool_calls", { where: { conversation_id: c.id, status: "pending_confirmation" } });
  return { id: c.id, messages: c.messages, pending_tool_call_ids: pending.map((p) => p.id) };
});
