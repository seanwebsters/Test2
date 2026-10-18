import { requireViewer } from "@/lib/server/auth";
import { assertSameOrigin, handle, json } from "@/lib/server/http";
import { removeBookmark } from "@/lib/server/services";

export const DELETE = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  assertSameOrigin(req);
  const viewer = await requireViewer();
  const { id } = await ctx.params;
  await removeBookmark(viewer, decodeURIComponent(id));
  return json({ ok: true });
});
