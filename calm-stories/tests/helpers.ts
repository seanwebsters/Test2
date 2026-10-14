import { LocalDatabase } from "@/lib/db/local";
import { setDb } from "@/lib/db";
import { buildSeedSnapshot } from "@/lib/seed/build";
import type { Viewer } from "@/lib/auth/policy";

/** Fresh, isolated in-memory database seeded with the prototype catalogue. */
export function freshDb(now = new Date()) {
  const db = new LocalDatabase(buildSeedSnapshot(now));
  setDb(db);
  return db;
}

export async function viewerFor(db: LocalDatabase, userId: string): Promise<Viewer & { user: NonNullable<Viewer["user"]> }> {
  const user = await db.get("users", userId);
  if (!user) throw new Error(`no user ${userId}`);
  const roles = (await db.list("user_roles", { where: { user_id: userId } })).map((r) => r.role);
  const ent = await db.findOne("subscription_entitlements", { user_id: userId });
  return { user, roles, plan: ent?.plan ?? "free" };
}
