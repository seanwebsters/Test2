import { z } from "zod";
import { enforceRateLimit, parseBody, route } from "@/lib/api";
import { getViewer } from "@/lib/auth/session";
import { unauthorized } from "@/lib/errors";
import { saveProgress } from "@/lib/services/library";

const Body = z.object({
  episode_id: z.string().min(1).max(200),
  position_seconds: z.number().min(0).max(36000),
  duration_seconds: z.number().min(0).max(36000),
});

export const POST = route(async (req) => {
  const viewer = await getViewer();
  if (!viewer.user) throw unauthorized();
  enforceRateLimit(`progress:${viewer.user.id}`, 60, 60);
  const body = await parseBody(req, Body);
  const row = await saveProgress(viewer, body.episode_id, body.position_seconds, body.duration_seconds);
  return { ok: true, completed: row.completed };
});
