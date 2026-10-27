import { z } from "zod";
import { body, ok, route } from "@/lib/http";
import { repo, storageMode } from "@/lib/store";
import { defaultSettings } from "@/lib/settings";
import { MODELS } from "@/lib/ai/models";
import { estimateJob } from "@/lib/estimate";
import { hasCredentials } from "@/lib/ai/client";
import { providerStatus } from "@/lib/providers";

const modelId = z.enum(MODELS.map((m) => m.id) as [string, ...string[]]);
const schema = z.object({
  models: z.object({ ideation: modelId, design: modelId, art: modelId, development: modelId, qa: modelId, insights: modelId }),
  effort: z.enum(["low", "medium", "high"]),
  maxRepairs: z.number().int().min(0).max(4),
  qaEnabled: z.boolean(),
});

export const GET = route(async () => {
  const settings = (await (await repo()).getSettings()) ?? defaultSettings();
  return ok({
    settings,
    models: MODELS,
    estimate: { generate: estimateJob(settings, "generate"), lab: estimateJob(settings, "lab") },
    providers: providerStatus(),
    status: { anthropic: hasCredentials(), storage: storageMode(), costCapUsd: Number(process.env.JOB_COST_CAP_USD || 3), rateLimitPerMinute: Number(process.env.RATE_LIMIT_PER_MINUTE || 6) },
  });
});

export const PUT = route(async (req) => {
  const settings = await body(req, schema);
  await (await repo()).putSettings(settings);
  return ok({ settings, estimate: { generate: estimateJob(settings, "generate"), lab: estimateJob(settings, "lab") } });
});
