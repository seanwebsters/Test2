import { z } from "zod";
import { enforceRateLimit, parseBody, route } from "@/lib/api";
import { requireCreator } from "@/lib/auth/session";
import { handleMessage } from "@/lib/storymaker/assistant";

const Body = z.object({ series_id: z.string().nullable(), message: z.string().trim().min(1).max(4000) });

export const maxDuration = 300;

export const POST = route(async (req) => {
  const viewer = await requireCreator();
  enforceRateLimit(`chat:${viewer.user.id}`, 20, 10);
  const body = await parseBody(req, Body);
  return handleMessage({ viewer, seriesId: body.series_id }, body.message);
});
