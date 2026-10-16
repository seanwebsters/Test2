import { z } from "zod";
import { parseBody, route } from "@/lib/api";
import { requireAdmin, requireEditor } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { AGENT_BY_KEY } from "@/lib/studio/agents";
import { getAgentProfile } from "@/lib/studio/llm";
import { getAgentDetail } from "@/lib/studio/team";
import type { AgentKey } from "@/lib/studio/types";
import { nowIso } from "@/lib/util";

type Ctx = { params: Promise<{ key: string }> };

export const GET = route<Ctx>(async (_req, { params }) => {
  await requireEditor();
  const { key } = await params;
  if (!AGENT_BY_KEY[key as AgentKey]) throw notFound();
  return getAgentDetail(key as AgentKey);
});

const Body = z.object({
  instructions: z.string().min(20).max(20000),
  model: z.string().trim().min(1).max(100),
  effort: z.enum(["low", "medium", "high", "xhigh"]),
  enabled: z.boolean(),
});

/** Edit an agent's instructions, model and effort (administrators). */
export const PUT = route<Ctx>(async (req, { params }) => {
  await requireAdmin();
  const { key } = await params;
  if (!AGENT_BY_KEY[key as AgentKey] || AGENT_BY_KEY[key as AgentKey].human) throw notFound();
  const body = await parseBody(req, Body);
  const db = getDb();
  await getAgentProfile(key as AgentKey);
  const row = { id: key as AgentKey, ...body, updated_at: nowIso() };
  return { profile: (await db.get("agent_profiles", key)) ? await db.update("agent_profiles", key, row) : await db.insert("agent_profiles", row) };
});
