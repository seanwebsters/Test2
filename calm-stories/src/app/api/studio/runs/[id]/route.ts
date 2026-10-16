import { z } from "zod";
import { parseBody, route } from "@/lib/api";
import { requireEditor } from "@/lib/auth/session";
import { cancelRun, pauseRun, resumeRun, retryStep } from "@/lib/studio";
import { studioAction } from "@/lib/studio/http";

const Body = z.object({
  action: z.enum(["pause", "resume", "cancel", "retry_step"]),
  step_key: z.string().optional(),
  budget_cents: z.number().int().min(0).max(1_000_000).optional(),
});

export const POST = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  await requireEditor();
  const { id } = await params;
  const b = await parseBody(req, Body);
  await studioAction(async () => {
    if (b.action === "pause") await pauseRun(id);
    if (b.action === "resume") await resumeRun(id, { budget_cents: b.budget_cents });
    if (b.action === "cancel") await cancelRun(id);
    if (b.action === "retry_step") await retryStep(id, b.step_key ?? "");
  });
  return { ok: true };
});
