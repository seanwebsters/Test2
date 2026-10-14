import { z } from "zod";
import { parseBody, route } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/session";
import { badRequest } from "@/lib/errors";
import "@/lib/jobs/workflows";
import { cancelJob, pauseJob, rerunJob, resumeJob } from "@/lib/jobs/runner";

const Body = z.object({ action: z.enum(["pause", "resume", "cancel", "rerun", "restart"]) });

export const POST = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  await requireAdmin();
  const { id } = await params;
  const { action } = await parseBody(req, Body);
  try {
    if (action === "pause") await pauseJob(id);
    if (action === "resume") await resumeJob(id);
    if (action === "cancel") await cancelJob(id);
    if (action === "rerun") await rerunJob(id);
    if (action === "restart") await rerunJob(id, { fromStart: true });
  } catch (e) {
    throw badRequest(e instanceof Error ? e.message : "Action failed");
  }
  return { ok: true };
});
