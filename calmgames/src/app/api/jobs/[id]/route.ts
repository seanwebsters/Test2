import { ok, route, HttpError } from "@/lib/http";
import { reconcile } from "@/lib/orchestrator";
import { repo } from "@/lib/store";

export const GET = route(async (_req, { params }: { params: Promise<{ id: string }> }) => {
  const job = await (await repo()).getJob((await params).id);
  if (!job) throw new HttpError(404, "Job not found");
  return ok({ job: await reconcile(job) });
});
