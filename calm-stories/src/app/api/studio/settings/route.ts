import { z } from "zod";
import { parseBody, route } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { getStudioSettings } from "@/lib/studio/settings";
import { nowIso } from "@/lib/util";

const Body = z.object({
  default_model: z.string().trim().min(1).max(100),
  image_model: z.string().trim().min(1).max(100),
  image_size: z.enum(["", "1K", "2K", "4K"]),
  fal_image_endpoint: z.string().trim().min(1).max(120),
  tts_model: z.string().trim().min(1).max(100),
  sfx_model: z.string().trim().min(1).max(100),
  music_model: z.string().trim().min(1).max(100),
  max_revision_rounds: z.number().int().min(0).max(5),
  max_episode_minutes: z.number().int().min(3).max(90),
  cover_concepts: z.number().int().min(1).max(3),
  max_parallel_steps: z.number().int().min(1).max(12),
  max_concurrent_runs: z.number().int().min(1).max(10),
  default_episode_budget_cents: z.number().int().min(0).max(1_000_000),
  default_series_budget_cents: z.number().int().min(0).max(1_000_000),
  web_research: z.boolean(),
  episode_music: z.boolean(),
  publish_roles: z.array(z.enum(["admin", "editor"])).min(1),
  autopilot: z.boolean(),
  autopilot_pipeline: z.number().int().min(0).max(50),
  autopilot_series_per_day: z.number().int().min(1).max(48),
  autopilot_episodes_per_week: z.number().int().min(0).max(7),
});

export const PUT = route(async (req) => {
  await requireAdmin();
  const body = await parseBody(req, Body);
  await getStudioSettings();
  return { settings: await getDb().update("studio_settings", "global", { ...body, updated_at: nowIso() }) };
});
