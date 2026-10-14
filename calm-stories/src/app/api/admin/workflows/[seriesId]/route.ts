import { z } from "zod";
import { parseBody, route } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/session";
import { saveWorkflow } from "@/lib/services/editorial";

const Body = z.object({
  episodes_per_week: z.number().int().min(1).max(7).optional(),
  target_duration_minutes: z.number().int().min(10).max(90).optional(),
  writing_provider: z.enum(["auto", "anthropic", "openai", "mock"]).optional(),
  writing_model: z.string().max(80).optional(),
  narrator_voice_id: z.string().nullable().optional(),
  soundscape_id: z.string().nullable().optional(),
  release_days: z.array(z.number().int().min(0).max(6)).min(1).max(7).optional(),
  release_hour_utc: z.number().int().min(0).max(23).optional(),
  max_budget_cents: z.number().int().min(0).max(100000).optional(),
  status: z.enum(["active", "paused"]).optional(),
});

export const PUT = route<{ params: Promise<{ seriesId: string }> }>(async (req, { params }) => {
  await requireAdmin();
  const { seriesId } = await params;
  return saveWorkflow(seriesId, await parseBody(req, Body));
});
