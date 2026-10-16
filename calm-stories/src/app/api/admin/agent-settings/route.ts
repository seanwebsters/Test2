import { z } from "zod";
import { parseBody, route } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { getAgentSettings } from "@/lib/agents";
import { nowIso } from "@/lib/util";

const Body = z.object({
  writer_model: z.string().trim().min(1).max(100),
  tts_model: z.string().trim().min(1).max(100),
  default_voice_id: z.string().trim().min(1).max(100),
  sfx_model: z.string().trim().min(1).max(100),
  image_model: z.string().trim().min(1).max(100),
  per_job_budget_cents: z.number().int().min(0).max(100_000),
  max_concurrent_jobs: z.number().int().min(1).max(10),
});

export const PUT = route(async (req) => {
  await requireAdmin();
  const body = await parseBody(req, Body);
  await getAgentSettings();
  return { settings: await getDb().update("agent_settings", "global", { ...body, updated_at: nowIso() }) };
});
