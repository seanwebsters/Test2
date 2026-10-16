import { z } from "zod";
import { parseBody, route } from "@/lib/api";
import { requireEditor } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { enqueueProduction } from "@/lib/agents";

const Body = z.object({
  series_id: z.string().min(1),
  target_minutes: z.number().int().min(1).max(60).optional(),
  release_at: z.string().datetime().nullable().optional(),
});

/** Ask the agents to produce the next episode of a series now. */
export const POST = route(async (req) => {
  const viewer = await requireEditor();
  const body = await parseBody(req, Body);
  const db = getDb();
  if (!(await db.get("series", body.series_id))) throw notFound("Series not found.");
  const wf = await db.findOne("production_workflows", { series_id: body.series_id });
  const { job } = await enqueueProduction({
    series_id: body.series_id,
    workflow_id: wf?.id ?? null,
    target_minutes: body.target_minutes ?? null,
    release_at: body.release_at ?? null,
    requested_by: viewer.user.id,
    budget_cents: wf?.budget_cents ?? null,
  });
  return { job_id: job.id };
});
