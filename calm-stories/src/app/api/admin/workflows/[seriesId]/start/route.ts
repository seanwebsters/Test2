import { route } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { notFound } from "@/lib/errors";
import "@/lib/jobs/workflows";
import { startProductionNow } from "@/lib/production/engine";

export const POST = route<{ params: Promise<{ seriesId: string }> }>(async (_req, { params }) => {
  const admin = await requireAdmin();
  const { seriesId } = await params;
  const wf = await getDb().findOne("production_workflows", { series_id: seriesId });
  if (!wf) throw notFound("Configure a production workflow first.");
  const { job } = await startProductionNow(wf.id, admin.user.id);
  return { job_id: job.id };
});
