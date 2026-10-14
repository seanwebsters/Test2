import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { getDb } from "@/lib/db";
import { identityProvider, mockEntitlements } from "./providers";
import { VISITOR, type Viewer } from "./viewer";

export { toPublicViewer, VISITOR } from "./viewer";
export type { Viewer, PublicViewer } from "./viewer";

export async function loadViewer(userId: string | null): Promise<Viewer> {
  if (!userId) return VISITOR;
  const db = getDb();
  const user = await db.get("users", userId);
  if (!user) return VISITOR;
  const roles = (await db.list("user_roles", { where: { user_id: user.id } })).map((r) => r.role);
  const ent = await mockEntitlements.activeEntitlement(db, user);
  const plan = ent?.plan ?? "free";
  return {
    user,
    roles,
    plan,
    isPremium: plan === "premium",
    isCreator: roles.includes("creator") || roles.includes("admin"),
    isAdmin: roles.includes("admin"),
    entitlementSource: ent?.source ?? null,
  };
}

/** The current request's viewer (memoised per request). */
export const getViewer = cache(async (): Promise<Viewer> => {
  const jar = await cookies();
  const uid = await identityProvider().resolveUserId(jar);
  return loadViewer(uid);
});
