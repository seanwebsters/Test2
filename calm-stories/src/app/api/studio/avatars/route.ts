import { z } from "zod";
import { parseBody, route } from "@/lib/api";
import { requireEditor } from "@/lib/auth/session";
import { badRequest } from "@/lib/errors";
import { AGENT_BY_KEY } from "@/lib/studio/agents";
import { startAvatar } from "@/lib/studio/avatars";
import type { AgentKey } from "@/lib/studio/types";

const Body = z.object({ agent: z.string() });

/** Start generating an animated (photoreal) avatar for one agent. */
export const POST = route(async (req) => {
  await requireEditor();
  const { agent } = await parseBody(req, Body);
  if (!(agent in AGENT_BY_KEY) || AGENT_BY_KEY[agent as AgentKey].human) throw badRequest("Unknown agent.");
  try {
    return await startAvatar(agent as AgentKey);
  } catch (err) {
    throw badRequest(err instanceof Error ? err.message : String(err));
  }
});
