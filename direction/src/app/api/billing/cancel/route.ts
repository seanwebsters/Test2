import { requireViewer } from "@/lib/server/auth";
import { cancelPlan } from "@/lib/server/billing";
import { assertSameOrigin, handle, json } from "@/lib/server/http";

export const POST = handle(async (req: Request) => {
  assertSameOrigin(req);
  const viewer = await requireViewer();
  await cancelPlan(viewer);
  return json({ ok: true });
});
