import { z } from "zod";
import { body, ok, rateLimit, route, HttpError } from "@/lib/http";
import { startGeneration, startLab } from "@/lib/orchestrator";
import { repo } from "@/lib/store";
import { hasCredentials } from "@/lib/ai/client";
import { CATEGORIES } from "@/lib/types";
import { labConceptSchema } from "@/lib/agents/schemas";

const createSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("generate"),
    prompt: z.string().trim().min(8, "Describe the game in a sentence or two").max(2000),
    category: z.enum(CATEGORIES).optional(),
    archetype: z.enum(["auto", "tile-path", "garden", "constellation", "freeform"]).default("auto"),
    fromConcept: labConceptSchema.passthrough().optional(),
  }),
  z.object({ kind: z.literal("lab"), brief: z.string().max(1000).default(""), count: z.number().int().min(3).max(8).default(5) }),
]);

export const GET = route(async (req) => {
  const limit = Number(new URL(req.url).searchParams.get("limit") ?? 30);
  return ok({ jobs: await (await repo()).listJobs(limit) });
});

export const POST = route(async (req) => {
  const input = await body(req, createSchema);
  if (!hasCredentials()) throw new HttpError(503, "ANTHROPIC_API_KEY is not set. Add it to calmgames/.env.local and restart the dev server; the studio never substitutes simulated agents.");
  rateLimit(req, "jobs");
  if (input.kind === "lab") return ok({ job: await startLab(input) }, { status: 201 });
  const { job, game } = await startGeneration(input);
  return ok({ job, game }, { status: 201 });
});
