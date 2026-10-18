import { requireViewer } from "@/lib/server/auth";
import { assertSameOrigin, handle, json, parseBody } from "@/lib/server/http";
import { CompleteSchema } from "@/lib/server/schemas";
import { completeMission } from "@/lib/server/services";

export const POST = handle(async (req: Request) => {
  assertSameOrigin(req);
  const viewer = await requireViewer();
  const body = await parseBody(req, CompleteSchema);
  const result = await completeMission(viewer, body);
  return json(result);
});
