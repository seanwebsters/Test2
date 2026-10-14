import { route } from "@/lib/api";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";

/** Privacy control: delete the listener's progress and listening events. */
export const DELETE = route(async () => {
  const viewer = await requireUser();
  const db = getDb();
  const [progress, events] = await Promise.all([
    db.list("listening_progress", { where: { user_id: viewer.user.id } }),
    db.list("listening_events", { where: { user_id: viewer.user.id } }),
  ]);
  for (const p of progress) await db.remove("listening_progress", p.id);
  for (const e of events) await db.remove("listening_events", e.id);
  return { ok: true, removed: progress.length + events.length };
});
