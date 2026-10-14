import { route } from "@/lib/api";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";

export const POST = route(async () => {
  const viewer = await requireUser();
  const db = getDb();
  const unread = await db.list("notifications", { where: { user_id: viewer.user.id, read: false } });
  for (const n of unread) await db.update("notifications", n.id, { read: true });
  return { ok: true, updated: unread.length };
});
