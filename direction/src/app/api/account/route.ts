import { clearSession, requireViewer } from "@/lib/server/auth";
import { assertSameOrigin, handle, json } from "@/lib/server/http";
import { deleteAccount } from "@/lib/server/services";

export const DELETE = handle(async (req: Request) => {
  assertSameOrigin(req);
  const viewer = await requireViewer();
  await deleteAccount(viewer);
  await clearSession();
  return json({ ok: true });
});
