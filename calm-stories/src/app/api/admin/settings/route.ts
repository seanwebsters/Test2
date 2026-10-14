import { z } from "zod";
import { parseBody, route } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { getAiSettings } from "@/lib/ai";
import { nowIso } from "@/lib/util";

const Body = z.object({
  writing_provider: z.enum(["auto", "anthropic", "openai", "mock"]),
  writing_model_anthropic: z.string().min(1).max(80),
  writing_model_openai: z.string().min(1).max(80),
  voice_provider: z.enum(["auto", "elevenlabs", "mock"]),
  image_provider: z.enum(["auto", "openai", "procedural"]),
  sound_provider: z.enum(["library", "generative"]),
  task_models: z.record(z.string().max(40), z.string().max(80)),
  prompt_templates: z.record(z.string().max(40), z.string().max(8000)),
  monthly_cost_limit_cents: z.number().int().min(0).max(10_000_000),
  per_job_cost_limit_cents: z.number().int().min(0).max(1_000_000),
  retry_limit: z.number().int().min(0).max(5),
  approval_policy: z.enum(["all_content", "community_and_engine"]),
  max_concurrent_jobs: z.number().int().min(1).max(20),
});

/** Credentials are never stored or returned here – only provider choices and limits. */
export const PUT = route(async (req) => {
  await requireAdmin();
  const body = await parseBody(req, Body);
  const current = await getAiSettings();
  await getDb().upsert("ai_settings", { ...current, ...body, id: "global", updated_at: nowIso() });
  return { ok: true };
});
