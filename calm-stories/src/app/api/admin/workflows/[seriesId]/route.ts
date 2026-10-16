import { z } from "zod";
import { parseBody, route } from "@/lib/api";
import { requireEditor } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { newId, nowIso } from "@/lib/util";

const Body = z.object({
  status: z.enum(["active", "paused"]),
  episodes_per_week: z.number().int().min(1).max(7),
  release_days: z.array(z.number().int().min(0).max(6)).min(1).max(7),
  release_hour_utc: z.number().int().min(0).max(23),
  target_minutes: z.number().int().min(1).max(60),
  voice_id: z.string().trim().max(100).nullable(),
  art_style: z.string().max(500),
  story_notes: z.string().max(4000),
  budget_cents: z.number().int().min(0).max(100_000),
});

/** Create or update a series' production schedule and creative direction. */
export const PUT = route<{ params: Promise<{ seriesId: string }> }>(async (req, { params }) => {
  await requireEditor();
  const { seriesId } = await params;
  const body = await parseBody(req, Body);
  const db = getDb();
  if (!(await db.get("series", seriesId))) throw notFound("Series not found.");
  const existing = await db.findOne("production_workflows", { series_id: seriesId });
  const row = { ...body, voice_id: body.voice_id || null, updated_at: nowIso() };
  const wf = existing ? await db.update("production_workflows", existing.id, row) : await db.insert("production_workflows", { id: newId("wf"), series_id: seriesId, created_at: nowIso(), ...row });
  return { workflow: wf };
});
