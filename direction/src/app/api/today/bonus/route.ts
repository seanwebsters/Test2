import { requireViewer } from "@/lib/server/auth";
import { assertSameOrigin, handle, json } from "@/lib/server/http";
import { addBonusMission } from "@/lib/server/services";

export const POST = handle(async (req: Request) => {
  assertSameOrigin(req);
  const viewer = await requireViewer();
  return json(await addBonusMission(viewer));
});
