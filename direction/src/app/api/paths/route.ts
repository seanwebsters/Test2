import { z } from "zod";
import { requireViewer } from "@/lib/server/auth";
import { assertSameOrigin, handle, json, parseBody } from "@/lib/server/http";
import { startPath } from "@/lib/server/services";

export const POST = handle(async (req: Request) => {
  assertSameOrigin(req);
  const viewer = await requireViewer();
  const body = await parseBody(req, z.object({ careerSlug: z.string().max(80), switchFrom: z.string().max(80).nullish() }));
  const path = await startPath(viewer, body.careerSlug, { switchFrom: body.switchFrom });
  return json({ path });
});
