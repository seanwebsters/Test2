import { z } from "zod";
import { getViewer } from "@/lib/auth";
import { requireAdmin } from "@/lib/auth/policy";
import { body, json, route } from "@/lib/api";
import { enqueueProduction } from "@/lib/jobs/engine";

export const POST = route(async (req) => {
  const viewer = await getViewer();
  requireAdmin(viewer);
  const input = await body(req, z.object({ seriesId: z.string(), episodeId: z.string().nullish(), budgetCents: z.number().int().min(0).max(100_000).nullish(), durationMinutes: z.number().int().min(5).max(60).optional() }));
  const { job, created } = await enqueueProduction({
    seriesId: input.seriesId,
    episodeId: input.episodeId ?? null,
    requestedBy: viewer.user.id,
    budgetCents: input.budgetCents ?? undefined,
    payload: input.durationMinutes ? { duration_minutes: input.durationMinutes } : {},
  });
  return json({ job, created }, { status: created ? 201 : 200 });
}, { limit: 20 });
