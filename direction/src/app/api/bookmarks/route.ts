import { requireViewer } from "@/lib/server/auth";
import { assertSameOrigin, handle, json, parseBody } from "@/lib/server/http";
import { BookmarkSchema } from "@/lib/server/schemas";
import { saveBookmark } from "@/lib/server/services";

export const POST = handle(async (req: Request) => {
  assertSameOrigin(req);
  const viewer = await requireViewer();
  const body = await parseBody(req, BookmarkSchema);
  return json(await saveBookmark(viewer, body.opportunityId, body.status, body.notes ?? "", body.snapshot ?? null));
});
