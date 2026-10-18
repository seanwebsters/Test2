import { z } from "zod";
import { requireViewer } from "@/lib/server/auth";
import { assertSameOrigin, handle, json, parseBody } from "@/lib/server/http";
import { finishChallenge, startChallenge, stopChallenge } from "@/lib/server/services";

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start"), careers: z.array(z.string().max(80)).max(3).optional() }),
  z.object({ action: z.literal("finish"), verdict: z.string().max(80) }),
  z.object({ action: z.literal("stop") }),
]);

export const POST = handle(async (req: Request) => {
  assertSameOrigin(req);
  const viewer = await requireViewer();
  const body = await parseBody(req, Body);
  if (body.action === "start") return json({ challenge: await startChallenge(viewer, body.careers) });
  if (body.action === "finish") return json({ challenge: await finishChallenge(viewer, body.verdict) });
  await stopChallenge(viewer);
  return json({ ok: true });
});
