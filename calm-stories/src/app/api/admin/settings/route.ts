import { z } from "zod";
import { getViewer } from "@/lib/auth";
import { body, json, route } from "@/lib/api";
import { updateAiSettings } from "@/lib/admin";

export const PATCH = route(async (req) => {
  const patch = await body(
    req,
    z.object({
      writing_provider: z.enum(["auto", "anthropic", "openai", "mock"]).optional(),
      writing_model_anthropic: z.string().max(100).optional(),
      writing_model_openai: z.string().max(100).optional(),
      voice_provider: z.enum(["auto", "elevenlabs", "mock"]).optional(),
      image_provider: z.enum(["auto", "openai", "procedural"]).optional(),
      sound_provider: z.enum(["library", "generative"]).optional(),
      task_models: z.record(z.string(), z.string().max(100)).optional(),
      prompt_templates: z.record(z.string(), z.string().max(8000)).optional(),
      monthly_cost_limit_cents: z.number().int().min(0).max(10_000_000).optional(),
      per_job_cost_limit_cents: z.number().int().min(0).max(1_000_000).optional(),
      retry_limit: z.number().int().min(0).max(5).optional(),
      approval_policy: z.enum(["all_content", "community_and_engine"]).optional(),
      max_concurrent_jobs: z.number().int().min(1).max(10).optional(),
    }),
  );
  return json(await updateAiSettings(await getViewer(), patch));
});
