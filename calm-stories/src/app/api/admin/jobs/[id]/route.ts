import { z } from "zod";
import { getViewer } from "@/lib/auth";
import { requireAdmin } from "@/lib/auth/policy";
import { body, HttpError, json, route } from "@/lib/api";
import { getDb } from "@/lib/db";
import { cancelJob, pauseJob, rerunJob, resumeJob, retryJob } from "@/lib/jobs/engine";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (_req, { params }) => {
  const { id } = await params;
  requireAdmin(await getViewer());
  const job = await getDb().get("ai_production_jobs", id);
  if (!job) throw new HttpError(404, "Job not found");
  return json(job);
});

export const POST = route<Ctx>(async (req, { params }) => {
  const { id } = await params;
  const viewer = await getViewer();
  const { action } = await body(req, z.object({ action: z.enum(["pause", "resume", "cancel", "retry", "rerun"]) }));
  if (action === "rerun") return json((await rerunJob(viewer, id)).job);
  const fn = { pause: pauseJob, resume: resumeJob, cancel: cancelJob, retry: retryJob }[action];
  return json(await fn(viewer, id));
}, { limit: 60 });
