import { z } from "zod";
import { parseBody, route } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { nowIso } from "@/lib/util";

const Body = z.object({
  provider: z.enum(["auto", "anthropic", "openai", "mock"]).optional(),
  model: z.string().min(1).max(80).optional(),
  prompt_template: z.string().max(8000).optional(),
  temperature: z.number().min(0).max(1.5).optional(),
  max_cost_cents_per_job: z.number().int().min(0).max(100000).optional(),
  retry_limit: z.number().int().min(0).max(5).optional(),
  enabled: z.boolean().optional(),
});

export const PUT = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  await requireAdmin();
  const { id } = await params;
  const db = getDb();
  if (!(await db.get("agent_configurations", id))) throw notFound();
  const patch = await parseBody(req, Body);
  return db.update("agent_configurations", id, { ...patch, updated_at: nowIso() });
});
