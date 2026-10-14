import { z } from "zod";
import { parseBody, route } from "@/lib/api";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { nowIso } from "@/lib/util";

const Body = z.object({
  autoplay_next: z.boolean(),
  autoplay_limit: z.number().int().min(1).max(5),
  default_speed: z.number().min(0.5).max(2),
  default_sleep_timer_minutes: z.number().int().min(1).max(180).nullable(),
  new_episode_updates: z.boolean(),
  private_listening_history: z.boolean(),
});

export const PUT = route(async (req) => {
  const viewer = await requireUser();
  const body = await parseBody(req, Body);
  await getDb().upsert("user_settings", { id: viewer.user.id, ...body, updated_at: nowIso() });
  return { ok: true };
});
