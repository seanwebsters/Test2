import { z } from "zod";
import { body, ok, rateLimit, route, HttpError } from "@/lib/http";
import { startRefinement } from "@/lib/orchestrator";
import { hasCredentials } from "@/lib/ai/client";

const schema = z.object({ instruction: z.string().trim().min(3).max(1000), baseVersion: z.number().int().min(1).optional() });

export const POST = route(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const input = await body(req, schema);
  if (!hasCredentials()) throw new HttpError(503, "ANTHROPIC_API_KEY is not set. Add it to calmgames/.env.local and restart the dev server.");
  rateLimit(req, "jobs");
  try {
    return ok({ job: await startRefinement((await params).id, input.instruction, input.baseVersion) }, { status: 201 });
  } catch (e) {
    throw new HttpError(409, (e as Error).message);
  }
});
