import { z } from "zod";
import { requireViewer } from "@/lib/server/auth";
import { assertSameOrigin, handle, json, parseBody } from "@/lib/server/http";
import { pausePath, startPath } from "@/lib/server/services";

export const PATCH = handle(async (req: Request, ctx: { params: Promise<{ slug: string }> }) => {
  assertSameOrigin(req);
  const viewer = await requireViewer();
  const { slug } = await ctx.params;
  const body = await parseBody(req, z.object({ action: z.enum(["pause", "resume"]), switchFrom: z.string().max(80).nullish() }));
  if (body.action === "pause") await pausePath(viewer, slug);
  else await startPath(viewer, slug, { switchFrom: body.switchFrom });
  return json({ ok: true });
});
