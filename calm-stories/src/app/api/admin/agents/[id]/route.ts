import { z } from "zod";
import { getViewer } from "@/lib/auth";
import { body, json, route } from "@/lib/api";
import { updateAgent } from "@/lib/admin";

export const PATCH = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const { id } = await params;
  const patch = await body(
    req,
    z.object({
      provider: z.enum(["auto", "anthropic", "openai", "mock"]).optional(),
      model: z.string().max(100).optional(),
      prompt_template: z.string().max(8000).optional(),
      temperature: z.number().min(0).max(1).optional(),
      max_cost_cents_per_job: z.number().int().min(0).max(100_000).optional(),
      retry_limit: z.number().int().min(0).max(5).optional(),
      enabled: z.boolean().optional(),
    }),
  );
  return json(await updateAgent(await getViewer(), id, patch));
});
