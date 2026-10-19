import { z } from "zod";
import { parseBody, route } from "@/lib/api";
import { requireEditor } from "@/lib/auth/session";
import { badRequest } from "@/lib/errors";
import { startOfficeAnims } from "@/lib/studio/office-render";

const Body = z.object({ direction: z.string().max(1000).optional(), redo: z.boolean().optional() });

/** Animate each 3D team member individually (Kling on fal, server-side key; runs in the background). */
export const POST = route(async (req) => {
  await requireEditor();
  const { direction, redo } = await parseBody(req, Body);
  try {
    return await startOfficeAnims(direction ?? "", Boolean(redo));
  } catch (err) {
    throw badRequest(err instanceof Error ? err.message : String(err));
  }
});
