import { z } from "zod";
import { getViewer } from "@/lib/auth";
import { body, json, route } from "@/lib/api";
import { upsertWorkflow } from "@/lib/jobs/engine";

export const PUT = route<{ params: Promise<{ seriesId: string }> }>(async (req, { params }) => {
  const { seriesId } = await params;
  const patch = await body(
    req,
    z.object({
      episodes_per_week: z.number().int().min(1).max(7).optional(),
      target_duration_minutes: z.number().int().min(5).max(60).optional(),
      writing_provider: z.enum(["auto", "anthropic", "openai", "mock"]).optional(),
      writing_model: z.string().max(100).optional(),
      narrator_voice_id: z.string().nullable().optional(),
      soundscape_id: z.string().nullable().optional(),
      release_days: z.array(z.number().int().min(0).max(6)).max(7).optional(),
      release_hour_utc: z.number().int().min(0).max(23).optional(),
      max_budget_cents: z.number().int().min(0).max(100_000).optional(),
      status: z.enum(["active", "paused"]).optional(),
    }),
  );
  return json(await upsertWorkflow(await getViewer(), seriesId, patch));
});
