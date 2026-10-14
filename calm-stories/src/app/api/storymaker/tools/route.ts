import { z } from "zod";
import { enforceRateLimit, parseBody, route } from "@/lib/api";
import { requireCreator } from "@/lib/auth/session";
import { executeTool } from "@/lib/storymaker/execute";

const Body = z.object({
  tool: z.string().min(1).max(60),
  input: z.unknown(),
  series_id: z.string().nullable(),
  /** The creator clicked an explicit button (and saw any confirmation in the UI). */
  confirmed: z.boolean().default(false),
});

export const maxDuration = 300;

/** Direct tool execution for UI controls (forms, buttons). Same validation & permissions as chat. */
export const POST = route(async (req) => {
  const viewer = await requireCreator();
  enforceRateLimit(`tools:${viewer.user.id}`, 60, 60);
  const body = await parseBody(req, Body);
  return executeTool(body.tool, body.input, { viewer, seriesId: body.series_id, conversationId: null, confirmed: body.confirmed });
});
