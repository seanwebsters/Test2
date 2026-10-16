import { z } from "zod";
import { parseBody, route } from "@/lib/api";
import { requireEditor } from "@/lib/auth/session";
import { badRequest } from "@/lib/errors";
import { cancelJob, pauseJob, resumeJob, retryJob } from "@/lib/agents";

const Body = z.object({ action: z.enum(["pause", "resume", "cancel", "retry"]) });

export const POST = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  await requireEditor();
  const { id } = await params;
  const { action } = await parseBody(req, Body);
  try {
    if (action === "pause") await pauseJob(id);
    if (action === "resume") await resumeJob(id);
    if (action === "cancel") await cancelJob(id);
    if (action === "retry") await retryJob(id);
  } catch (err) {
    throw badRequest(err instanceof Error ? err.message : String(err));
  }
  return { ok: true };
});
