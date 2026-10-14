/** In-app notifications: new episodes from followed series, review outcomes and production updates. */
import "server-only";
import { requireUser } from "@/lib/auth/policy";
import type { Viewer } from "@/lib/auth/viewer";
import { getDb } from "@/lib/db";
import type { Notification } from "@/lib/types";

export async function listNotifications(viewer: Viewer, limit = 50): Promise<Notification[]> {
  requireUser(viewer);
  return getDb().list("notifications", { where: { user_id: viewer.user.id }, orderBy: { column: "created_at", ascending: false }, limit });
}

export async function unreadCount(viewer: Viewer): Promise<number> {
  if (!viewer.user) return 0;
  return getDb().count("notifications", { user_id: viewer.user.id, read: false });
}

/** Marks the given notifications (or all of them) as read. Only the owner's rows are touched. */
export async function markRead(viewer: Viewer, ids: string[] | "all"): Promise<number> {
  requireUser(viewer);
  const db = getDb();
  const unread = await db.list("notifications", { where: { user_id: viewer.user.id, read: false } });
  const targets = ids === "all" ? unread : unread.filter((n) => ids.includes(n.id));
  for (const n of targets) await db.update("notifications", n.id, { read: true });
  return targets.length;
}
