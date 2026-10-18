import { requireViewer } from "@/lib/server/auth";
import { assertSameOrigin, handle, json, parseBody } from "@/lib/server/http";
import { PassportItemSchema } from "@/lib/server/schemas";
import { savePassportItem } from "@/lib/server/services";

export const POST = handle(async (req: Request) => {
  assertSameOrigin(req);
  const viewer = await requireViewer();
  const body = await parseBody(req, PassportItemSchema);
  return json({ item: await savePassportItem(viewer, body) });
});
