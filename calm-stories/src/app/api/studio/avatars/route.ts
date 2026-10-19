import { z } from "zod";
import { parseBody, route } from "@/lib/api";
import { requireEditor } from "@/lib/auth/session";
import { badRequest } from "@/lib/errors";
import { AGENT_BY_KEY } from "@/lib/studio/agents";
import { startAllAvatars, startAvatar } from "@/lib/studio/avatars";
import type { AgentKey } from "@/lib/studio/types";

const Body = z.object({ agent: z.string().optional(), all: z.boolean().optional(), scene: z.enum(["bedroom", "office"]).default("bedroom"), redo: z.boolean().optional() });

/** Start generating an animated (photoreal) avatar for one agent. */
export const POST = route(async (req) => {
  await requireEditor();
  const { agent, all, scene, redo } = await parseBody(req, Body);
  try {
    if (all) return await startAllAvatars(scene, Boolean(redo));
    if (!agent || !(agent in AGENT_BY_KEY) || AGENT_BY_KEY[agent as AgentKey].human) throw badRequest("Unknown agent.");
    return await startAvatar(agent as AgentKey, scene);
  } catch (err) {
    throw badRequest(err instanceof Error ? err.message : String(err));
  }
});
