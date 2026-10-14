import { z } from "zod";
import { getViewer } from "@/lib/auth";
import { body, json, route } from "@/lib/api";
import { proposeRewrite, REWRITE_ACTIONS, type RewriteAction } from "@/lib/storymaker/service";

export const maxDuration = 120;

/** Proposes a replacement for the selected passage. Nothing is saved. */
export const POST = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const { id } = await params;
  const input = await body(req, z.object({ selection: z.string().min(1).max(12_000), action: z.string().optional(), instruction: z.string().max(500).optional() }));
  const preset = input.action && input.action in REWRITE_ACTIONS ? REWRITE_ACTIONS[input.action as RewriteAction] : null;
  const instruction = input.instruction?.trim() || preset || REWRITE_ACTIONS.rewrite;
  const { text, meta } = await proposeRewrite(await getViewer(), id, input.selection, instruction);
  return json({ text, instruction, simulated: meta.simulated, model: meta.model });
}, { limit: 30, bucket: "storymaker-rewrite" });
