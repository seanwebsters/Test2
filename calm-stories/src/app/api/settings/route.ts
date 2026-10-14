import { z } from "zod";
import { getViewer } from "@/lib/auth";
import { body, json, route } from "@/lib/api";
import { getSettings, updateSettings } from "@/lib/services/listener";

const schema = z
  .object({
    autoplay_next: z.boolean(),
    autoplay_limit: z.number().int().min(1).max(10),
    default_speed: z.number().min(0.5).max(2),
    default_sleep_timer_minutes: z.number().int().min(5).max(180).nullable(),
    new_episode_updates: z.boolean(),
    private_listening_history: z.boolean(),
  })
  .partial();

export const GET = route(async () => json(await getSettings(await getViewer())));
export const PATCH = route(async (req) => json(await updateSettings(await getViewer(), await body(req, schema))), { limit: 30 });
