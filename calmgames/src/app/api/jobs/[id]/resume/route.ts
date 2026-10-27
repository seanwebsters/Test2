import { ok, rateLimit, route, HttpError } from "@/lib/http";
import { resumeJob } from "@/lib/orchestrator";
import { hasCredentials } from "@/lib/ai/client";

export const POST = route(async (req, { params }: { params: Promise<{ id: string }> }) => {
  if (!hasCredentials()) throw new HttpError(503, "ANTHROPIC_API_KEY is not set.");
  rateLimit(req, "jobs");
  return ok({ job: await resumeJob((await params).id) });
});
