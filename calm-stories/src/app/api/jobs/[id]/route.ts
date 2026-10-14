import { route } from "@/lib/api";
import { requireUser } from "@/lib/auth/session";
import { canEditSeries, isAdmin } from "@/lib/auth/policy";
import { getDb } from "@/lib/db";
import { forbidden, notFound } from "@/lib/errors";
import { jobProgress } from "@/lib/jobs/runner";

export const GET = route<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const { id } = await params;
  const viewer = await requireUser();
  const db = getDb();
  const job = await db.get("ai_production_jobs", id);
  if (!job) throw notFound();
  if (!isAdmin(viewer)) {
    const series = job.series_id ? await db.get("series", job.series_id) : null;
    if (!series || !canEditSeries(viewer, series)) throw forbidden();
  }
  return { ...job, progress: jobProgress(job) };
});
