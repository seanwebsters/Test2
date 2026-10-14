import { route } from "@/lib/api";
import { requireCreator } from "@/lib/auth/session";
import { canEditSeries } from "@/lib/auth/policy";
import { getDb } from "@/lib/db";
import { forbidden, notFound } from "@/lib/errors";

export const GET = route<{ params: Promise<{ id: string; versionId: string }> }>(async (_req, { params }) => {
  const { id, versionId } = await params;
  const viewer = await requireCreator();
  const db = getDb();
  const v = await db.get("script_versions", versionId);
  const script = v ? await db.get("scripts", v.script_id) : null;
  if (!v || !script || script.episode_id !== id) throw notFound();
  const series = await db.get("series", script.series_id);
  if (!series || !canEditSeries(viewer, series)) throw forbidden();
  return v;
});
