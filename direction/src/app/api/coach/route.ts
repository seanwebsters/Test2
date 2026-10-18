import { streamCoachReply } from "@/lib/server/ai/coach";
import { requireViewer } from "@/lib/server/auth";
import { storeFor } from "@/lib/server/context";
import { assertSameOrigin, handle, json, parseBody } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/rate-limit";
import { CoachSchema } from "@/lib/server/schemas";

export const POST = handle(async (req: Request) => {
  assertSameOrigin(req);
  const viewer = await requireViewer();
  rateLimit(`coach:${viewer.userId}`, 12, 60_000);
  const body = await parseBody(req, CoachSchema);
  const { stream, provider } = await streamCoachReply(viewer, { message: body.message, mode: body.mode === "chat" ? undefined : body.mode, missionId: body.missionId });
  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Coach-Provider": provider } });
});

export const DELETE = handle(async (req: Request) => {
  assertSameOrigin(req);
  const viewer = await requireViewer();
  await storeFor(viewer).clearCoachMessages(viewer.userId);
  return json({ ok: true });
});
